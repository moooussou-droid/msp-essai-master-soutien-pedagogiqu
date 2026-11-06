/**
 * Synchronisation cloud chiffrée de bout en bout.
 *
 * Modèle de confidentialité :
 * - L'utilisateur choisit un "Code de synchronisation" (identifiant public unique)
 *   et un "Mot de passe secret" (jamais envoyé au serveur).
 * - Toutes les données sont chiffrées localement avec le mot de passe secret,
 *   puis envoyées au serveur qui ne voit qu'un blob illisible.
 * - Pour restaurer sur un autre appareil : même code + même mot de passe secret.
 */

import { SUPABASE_URL, SUPABASE_ANON_KEY, isCloudConfigured } from './cloudConfig';
import { encryptData, decryptData } from './crypto';
import { exportAllData, importAllData } from './database';

export interface CloudSettings {
  enabled: boolean;
  syncCode: string;
  // Le mot de passe secret n'est JAMAIS stocké en clair de façon permanente.
  // Il est gardé en mémoire pendant la session, et optionnellement en local
  // (choix de l'utilisateur) pour éviter de le retaper.
  rememberPassphrase: boolean;
}

const SETTINGS_KEY = 'msp_cloud_settings';
const PASS_KEY = 'msp_cloud_pass';
const LAST_SYNC_KEY = 'msp_cloud_last_sync';
const LAST_SYNC_INFO_KEY = 'msp_cloud_last_sync_info';

export interface LastSyncInfo {
  date: string;
  classes: number;
  students: number;
  sizeKo: number;
}

export function getCloudSettings(): CloudSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { enabled: false, syncCode: '', rememberPassphrase: false };
}

export function saveCloudSettings(settings: CloudSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function getStoredPassphrase(): string {
  try {
    return localStorage.getItem(PASS_KEY) || '';
  } catch {
    return '';
  }
}

export function setStoredPassphrase(pass: string, remember: boolean): void {
  if (remember) {
    localStorage.setItem(PASS_KEY, pass);
  } else {
    localStorage.removeItem(PASS_KEY);
  }
}

export function clearCloudSession(): void {
  localStorage.removeItem(PASS_KEY);
}

export function getLastSync(): string {
  try {
    return localStorage.getItem(LAST_SYNC_KEY) || '';
  } catch {
    return '';
  }
}

function setLastSync(iso: string): void {
  localStorage.setItem(LAST_SYNC_KEY, iso);
}

/** Détail de la dernière synchronisation (classes, élèves, taille). */
export function getLastSyncInfo(): LastSyncInfo | null {
  try {
    const raw = localStorage.getItem(LAST_SYNC_INFO_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.date === 'string') return parsed as LastSyncInfo;
  } catch { /* ignore */ }
  return null;
}

function setLastSyncInfo(info: LastSyncInfo): void {
  try { localStorage.setItem(LAST_SYNC_INFO_KEY, JSON.stringify(info)); } catch { /* quota */ }
}

/** Compte les classes/élèves et la taille d'une sauvegarde (JSON). */
export function computeBackupStats(json: string): { classes: number; students: number; sizeKo: number } {
  let classes = 0;
  let students = 0;
  try {
    const parsed = JSON.parse(json);
    if (parsed && Array.isArray(parsed.classes)) {
      classes = parsed.classes.length;
      students = parsed.classes.reduce((acc: number, c: any) => acc + (Array.isArray(c?.students) ? c.students.length : 0), 0);
    }
  } catch { /* données non parsables : stats nulles */ }
  return { classes, students, sizeKo: Math.round((json.length / 1024) * 10) / 10 };
}

function recordSync(iso: string, json: string | null): void {
  setLastSync(iso);
  if (json !== null) setLastSyncInfo({ date: iso, ...computeBackupStats(json) });
}

/** Erreurs réseau / config expliquées simplement. */
export function friendlyCloudError(e: unknown): string {
  const msg = (e as Error)?.message || String(e || '');
  if (msg.includes('CLOUD_NON_CONFIGURE')) return 'Le cloud n’est pas encore configuré par l’administrateur.';
  if (msg.includes('MOT_DE_PASSE_INCORRECT')) return 'Mot de passe secret incorrect : impossible de déchiffrer les données.';
  if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('load failed')) {
    return 'Vérifiez votre connexion internet, puis réessayez. (Le cloud est momentanément injoignable.)';
  }
  return msg || 'Une erreur est survenue.';
}

function headers() {
  return {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Envoie (sauvegarde) toutes les données chiffrées vers le cloud.
 */
export async function pushToCloud(syncCode: string, passphrase: string): Promise<void> {
  if (!isCloudConfigured()) {
    throw new Error('CLOUD_NON_CONFIGURE');
  }
  const json = await exportAllData();
  const encrypted = await encryptData(json, passphrase);

  const body = [{
    sync_code: syncCode,
    data: encrypted,
    updated_at: new Date().toISOString(),
  }];

  const res = await fetch(`${SUPABASE_URL}/rest/v1/backups`, {
    method: 'POST',
    headers: {
      ...headers(),
      'Prefer': 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Erreur d'envoi (${res.status}) : ${txt}`);
  }

  recordSync(new Date().toISOString(), json);
}

/**
 * Récupère et déchiffre les données depuis le cloud, puis les importe localement.
 * Retourne false si aucune sauvegarde n'existe pour ce code.
 */
export async function pullFromCloud(syncCode: string, passphrase: string): Promise<boolean> {
  if (!isCloudConfigured()) {
    throw new Error('CLOUD_NON_CONFIGURE');
  }

  const url = `${SUPABASE_URL}/rest/v1/backups?sync_code=eq.${encodeURIComponent(syncCode)}&select=data,updated_at`;
  const res = await fetch(url, { headers: headers() });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Erreur de récupération (${res.status}) : ${txt}`);
  }

  const rows = await res.json();
  if (!Array.isArray(rows) || rows.length === 0) {
    return false; // aucune sauvegarde pour ce code
  }

  const encrypted = rows[0].data as string;

  let json: string;
  try {
    json = await decryptData(encrypted, passphrase);
  } catch {
    throw new Error('MOT_DE_PASSE_INCORRECT');
  }

  await importAllData(json);
  recordSync(new Date().toISOString(), json);
  return true;
}

/** Génère un code de synchronisation lisible et unique (aléatoire cryptographique si possible). */
export function generateSyncCode(): string {
  const part = () => {
    try {
      if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        const values = new Uint32Array(4);
        crypto.getRandomValues(values);
        const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        return Array.from(values, v => alphabet[v % alphabet.length]).join('');
      }
    } catch { /* repli ci-dessous */ }
    return Math.random().toString(36).substring(2, 6).toUpperCase();
  };
  return `MSP-${part()}-${part()}`;
}

/**
 * Vérifie le format d'un code de synchronisation : MSP-XXXX-XXXX.
 * Tolère les minuscules et les espaces (normalisés avant contrôle) — un code
 * mal recopié est signalé immédiatement plutôt que d'échouer à la synchro.
 */
export function isValidSyncCode(code: string): boolean {
  const c = (code || '').toUpperCase().replace(/\s+/g, '');
  return /^MSP-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(c);
}

/** Date relative lisible (« à l'instant », « il y a 5 min », « hier »…). */
export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso || '';
  const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (diffMin < 1) return 'à l’instant';
  if (diffMin < 60) return `il y a ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `il y a ${diffH} h`;
  const diffDays = Math.floor(diffH / 24);
  if (diffDays === 1) return 'hier';
  if (diffDays < 30) return `il y a ${diffDays} jours`;
  return d.toLocaleDateString('fr-FR');
}

export interface CloudConnectionResult {
  ok: boolean;
  latency?: number;
  message: string;
}

/**
 * Teste la connexion au serveur cloud (sans envoyer de données) :
 * vérifie le réseau puis la joignabilité du serveur avec un délai maximal.
 * Utile avant une sauvegarde pour distinguer « pas de réseau » d'un serveur
 * momentanément indisponible.
 */
export async function testCloudConnection(timeoutMs = 8000): Promise<CloudConnectionResult> {
  if (!isCloudConfigured()) {
    return { ok: false, message: friendlyCloudError(new Error('CLOUD_NON_CONFIGURE')) };
  }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { ok: false, message: friendlyCloudError(new Error('Failed to fetch')) };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const start = Date.now();
    const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      method: 'HEAD',
      headers: headers(),
      signal: controller.signal,
    });
    const latency = Date.now() - start;
    if (res.ok || res.status === 404 || res.status === 400) {
      return { ok: true, latency, message: `Connexion au cloud réussie (${latency} ms). Vous pouvez sauvegarder.` };
    }
    return {
      ok: false,
      message: `Le serveur a répondu (code ${res.status}). La synchronisation peut fonctionner malgré tout — tentez une sauvegarde.`,
    };
  } catch (e: any) {
    if (e?.name === 'AbortError') {
      return { ok: false, message: 'Le serveur ne répond pas (délai dépassé). Vérifiez votre connexion puis réessayez.' };
    }
    return { ok: false, message: friendlyCloudError(e) };
  } finally {
    clearTimeout(timer);
  }
}
