export type LocalLLMState = 'idle' | 'loading' | 'ready' | 'generating' | 'error';
export type LocalLLMDevice = 'webgpu' | 'wasm' | null;

export interface LocalLLMStatus {
  state: LocalLLMState;
  progress: number;
  detail: string;
  device: LocalLLMDevice;
  error?: string;
  fallbackAvailable?: boolean;
}

export interface LocalLLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export { LOCAL_LLM_MODEL_ID, LOCAL_LLM_MODEL_REVISION, LOCAL_LLM_MODEL_LABEL, LOCAL_LLM_DOWNLOAD_NOTE } from './localLLMConfig';

const listeners = new Set<(status: LocalLLMStatus) => void>();
const pending = new Map<number, {
  resolve: (value: string) => void;
  reject: (error: Error) => void;
  onChunk?: (chunk: string) => void;
}>();
let status: LocalLLMStatus = { state: 'idle', progress: 0, detail: 'Le modèle n’est pas encore chargé.', device: null };
let worker: Worker | null = null;
let sequence = 0;
let loadPromise: Promise<void> | null = null;

function publish(next: LocalLLMStatus) {
  status = { ...next };
  for (const listener of listeners) listener({ ...status });
}

function rejectPending(error: Error) {
  for (const item of pending.values()) item.reject(error);
  pending.clear();
}

function workerUrl() {
  if (import.meta.env.DEV) return new URL('/src/workers/localLLMWorker.ts', window.location.origin);
  return new URL('assets/localLLMWorker.js', new URL('./', window.location.href));
}

function ensureWorker(): Worker {
  if (worker) return worker;
  if (typeof Worker === 'undefined') throw new Error('Ce navigateur ne prend pas en charge les Web Workers nécessaires au modèle local.');
  worker = new Worker(workerUrl(), { type: 'module', name: 'MSP local IA' });
  worker.onmessage = (event: MessageEvent<any>) => {
    const message = event.data || {};
    if (message.type === 'STATUS') {
      publish({
        state: message.state || status.state,
        progress: Number.isFinite(message.progress) ? Math.max(0, Math.min(100, message.progress)) : status.progress,
        detail: String(message.detail || status.detail),
        device: message.device || status.device,
        error: message.error,
      });
      return;
    }
    if (message.type === 'PROGRESS') {
      const progress = Number(message.progress);
      publish({
        ...status,
        state: 'loading',
        progress: Number.isFinite(progress) ? Math.max(0, Math.min(100, progress)) : status.progress,
        detail: String(message.detail || 'Téléchargement et préparation du modèle local…'),
      });
      return;
    }
    const item = pending.get(Number(message.id));
    if (!item) return;
    if (message.type === 'CHUNK') {
      const chunk = String(message.text || '');
      item.onChunk?.(chunk);
      return;
    }
    pending.delete(Number(message.id));
    if (message.type === 'READY') {
      publish({ state: 'ready', progress: 100, detail: 'Modèle chargé sur cet appareil.', device: message.device || 'wasm' });
      item.resolve('');
    } else if (message.type === 'DONE') {
      publish({ state: 'ready', progress: 100, detail: 'Réponse générée sur cet appareil.', device: status.device });
      item.resolve(String(message.text || ''));
    } else if (message.type === 'ERROR') {
      const error = new Error(String(message.message || 'Le modèle local a rencontré une erreur.'));
      publish({ state: 'error', progress: status.progress, detail: error.message, device: status.device, error: error.message, fallbackAvailable: Boolean(message.fallbackAvailable) });
      item.reject(error);
    }
  };
  worker.onerror = (event) => {
    const error = new Error(event.message || 'Le moteur local ne peut pas démarrer dans ce navigateur.');
    publish({ state: 'error', progress: status.progress, detail: error.message, device: status.device, error: error.message });
    rejectPending(error);
    worker?.terminate();
    worker = null;
    loadPromise = null;
  };
  return worker;
}

export function getLocalLLMStatus(): LocalLLMStatus {
  return { ...status };
}

export function subscribeLocalLLMStatus(listener: (status: LocalLLMStatus) => void): () => void {
  listeners.add(listener);
  listener({ ...status });
  return () => listeners.delete(listener);
}

export async function loadLocalLLM(forceDevice?: 'wasm'): Promise<void> {
  if (status.state === 'ready') return;
  if (loadPromise) return loadPromise;
  if (forceDevice === 'wasm' && status.state === 'error') {
    worker?.terminate();
    worker = null;
  }
  const id = ++sequence;
  publish({ state: 'loading', progress: 0, detail: 'Préparation du modèle local…', device: null });
  loadPromise = (async () => {
    try {
      try { await navigator.storage?.persist?.(); } catch { /* navigateur peut refuser la persistance */ }
      await new Promise<void>((resolve, reject) => {
        pending.set(id, { resolve: () => resolve(), reject });
        try { ensureWorker().postMessage({ type: 'LOAD', id, forceDevice }); }
        catch (error) { pending.delete(id); reject(error instanceof Error ? error : new Error('Chargement du modèle local impossible.')); }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Chargement du modèle local impossible.';
      if (status.state !== 'error') publish({ state: 'error', progress: status.progress, detail: message, device: status.device, error: message });
      throw error instanceof Error ? error : new Error(message);
    } finally { loadPromise = null; }
  })();
  return loadPromise;
}

function trimConversation(messages: LocalLLMMessage[]): LocalLLMMessage[] {
  const system = messages.find((message) => message.role === 'system');
  const recent = messages.filter((message) => message.role !== 'system').slice(-10);
  let budget = 12_000 - Math.min(system?.content.length || 0, 1500);
  const kept: LocalLLMMessage[] = [];
  for (const message of recent.reverse()) {
    if (budget <= 0) break;
    const content = message.content.slice(-budget);
    kept.unshift({ role: message.role, content });
    budget -= content.length;
  }
  return [
    ...(system ? [{ role: 'system' as const, content: system.content.slice(0, 1500) }] : []),
    ...kept,
  ];
}

export async function generateLocalLLM(
  messages: LocalLLMMessage[],
  onChunk?: (chunk: string) => void,
): Promise<string> {
  if (status.state !== 'ready' || !worker) throw new Error('Chargez d’abord le modèle IA local sur cet appareil.');
  const id = ++sequence;
  publish({ ...status, state: 'generating', detail: 'Le modèle local prépare une réponse…' });
  const transcript = trimConversation(messages);
  return new Promise<string>((resolve, reject) => {
    pending.set(id, { resolve, reject, onChunk });
    try { worker!.postMessage({ type: 'CHAT', id, messages: transcript }); }
    catch (error) {
      pending.delete(id);
      publish({ ...status, state: 'ready', detail: 'Le modèle local est prêt.' });
      reject(error instanceof Error ? error : new Error('Envoi au worker local impossible.'));
    }
  });
}

export function unloadLocalLLM() {
  worker?.terminate();
  worker = null;
  rejectPending(new Error('Le modèle a été déchargé de la mémoire.'));
  loadPromise = null;
  publish({ state: 'idle', progress: 0, detail: 'Modèle déchargé de la mémoire; les fichiers en cache sont conservés.', device: null });
}
