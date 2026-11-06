/**
 * PHOTOS D’IDENTITÉ POUR EDUCMASTER (v67).
 *
 * EducMaster n’expose pas d’API publique permettant à cette application
 * hors-ligne d’envoyer directement les fichiers dans la session d’un
 * directeur. Le module produit donc exactement ce que la fenêtre EducMaster
 * « Importer les photos » demande : un fichier image par élève, nommé
 * `matricule_NOM_Prenom_Prenom`. L’utilisateur sélectionne ensuite ces
 * fichiers dans EducMaster et touche « Enregistrer ».
 */
import JSZip from 'jszip';
import { ClassData, Student } from './database';

export interface PhotoReadiness {
  ready: boolean;
  filename: string;
  issues: string[];
}

export interface EducMasterZipResult {
  included: number;
  skipped: { student: Student; reasons: string[] }[];
  filename: string;
}

function stripAccents(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Transforme un nom en fragment de fichier EducMaster.
 * Les espaces, apostrophes, traits d’union et signes divers deviennent `_`.
 */
export function educMasterNamePart(value: string, mode: 'upper' | 'title'): string {
  const clean = stripAccents(value || '')
    .replace(/[’']/g, ' ')
    .replace(/[^A-Za-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (mode === 'upper') return clean.join('_').toUpperCase();
  return clean
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('_');
}

/** Nom officiel : matricule_NOM_Prenom_Prenom.jpg (extension incluse). */
export function educMasterPhotoFilename(student: Student, extension = 'jpg'): string {
  const matricule = (student.matricule || '').trim().replace(/\s+/g, '');
  const nom = educMasterNamePart(student.nom || '', 'upper') || 'NOM';
  const prenoms = educMasterNamePart(student.prenoms || '', 'title') || 'Prénom';
  const ext = extension.replace(/^\./, '').toLowerCase() || 'jpg';
  return `${matricule || 'MATRICULE'}_${nom}_${prenoms}.${ext}`;
}

export function photoReadiness(student: Student, duplicateMatricules = new Set<string>()): PhotoReadiness {
  const issues: string[] = [];
  const matricule = (student.matricule || '').trim();
  if (!matricule) issues.push('Matricule EducMaster manquant');
  if (matricule && duplicateMatricules.has(matricule)) issues.push('Matricule en double');
  if (!(student.nom || '').trim()) issues.push('Nom manquant');
  if (!(student.prenoms || '').trim()) issues.push('Prénoms manquants');
  if (!student.photoUrl) issues.push('Photo manquante');
  return {
    ready: issues.length === 0,
    filename: educMasterPhotoFilename(student),
    issues,
  };
}

export function duplicateMatriculesInClasses(classes: ClassData[]): Set<string> {
  const counts = new Map<string, number>();
  for (const c of classes) {
    for (const s of c.students) {
      const m = (s.matricule || '').trim();
      if (m) counts.set(m, (counts.get(m) || 0) + 1);
    }
  }
  return new Set([...counts.entries()].filter(([, n]) => n > 1).map(([m]) => m));
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64 = ''] = dataUrl.split(',');
  const mime = /data:([^;]+)/.exec(header || '')?.[1] || 'image/jpeg';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  window.setTimeout(() => {
    try { document.body.removeChild(a); } catch { /* déjà retiré */ }
    URL.revokeObjectURL(url);
  }, 4000);
}

export function downloadEducMasterPhoto(student: Student): void {
  if (!student.photoUrl) throw new Error('Cet élève n’a pas encore de photo.');
  downloadBlob(dataUrlToBlob(student.photoUrl), educMasterPhotoFilename(student));
}

function safeZipBase(value: string): string {
  return stripAccents(value || 'classe')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase() || 'CLASSE';
}

function csvCell(value: string | number): string {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

/**
 * Exporte toutes les photos PRÊTES de la classe dans un ZIP, avec un bordereau
 * CSV et les consignes EducMaster. Aucun élève incomplet n’est renommé
 * silencieusement : il apparaît dans `skipped` et dans le bordereau.
 */
export async function exportEducMasterPhotosZip(
  classData: ClassData,
  allClasses: ClassData[] = [classData],
): Promise<EducMasterZipResult> {
  const duplicates = duplicateMatriculesInClasses(allClasses);
  const zip = new JSZip();
  const folder = zip.folder('PHOTOS_EDUCMASTER') || zip;
  const skipped: EducMasterZipResult['skipped'] = [];
  const lines = [
    ['N°', 'Matricule EducMaster', 'Nom', 'Prénoms', 'Fichier', 'État'].map(csvCell).join(';'),
  ];
  let included = 0;

  const sorted = [...classData.students].sort((a, b) =>
    `${a.nom} ${a.prenoms}`.localeCompare(`${b.nom} ${b.prenoms}`, 'fr', { sensitivity: 'base' }));

  sorted.forEach((student, index) => {
    const state = photoReadiness(student, duplicates);
    if (state.ready && student.photoUrl) {
      folder.file(state.filename, dataUrlToBlob(student.photoUrl));
      included++;
      lines.push([index + 1, student.matricule, student.nom, student.prenoms, state.filename, 'Prêt'].map(csvCell).join(';'));
    } else {
      skipped.push({ student, reasons: state.issues });
      lines.push([index + 1, student.matricule || '', student.nom, student.prenoms, '', state.issues.join(' · ')].map(csvCell).join(';'));
    }
  });

  zip.file('BORDEREAU_PHOTOS_EDUCMASTER.csv', `\ufeff${lines.join('\r\n')}`);
  zip.file('LISEZ-MOI_IMPORT_EDUCMASTER.txt', [
    'IMPORTATION DES PHOTOS DANS EDUCMASTER',
    '=====================================',
    '',
    `École : ${classData.school || '—'}`,
    `Classe : ${classData.name || '—'}`,
    `Année scolaire : ${classData.schoolYear || '—'}`,
    `Photos prêtes : ${included}`,
    '',
    '1. Décompressez ce fichier ZIP.',
    '2. Connectez-vous à EducMaster, ouvrez la classe et sélectionnez les élèves.',
    '3. Ouvrez Actions → Importer les photos.',
    '4. Sélectionnez les fichiers du dossier PHOTOS_EDUCMASTER.',
    '5. Touchez Enregistrer.',
    '',
    'Nom imposé : matricule_NOM_Prenom_Prenom',
    'Exemple EducMaster : 104120183578_ASSOGBA_Jean_Paul',
  ].join('\n'));

  const filename = `PHOTOS_EDUCMASTER_${safeZipBase(classData.school)}_${safeZipBase(classData.name)}.zip`;
  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  downloadBlob(blob, filename);
  return { included, skipped, filename };
}

/** Extrait le matricule d’un nom de fichier `matricule_NOM_...`. */
export function matriculeFromPhotoFilename(filename: string): string {
  const base = (filename || '').replace(/\.[^.]+$/, '');
  return (base.split('_')[0] || '').trim();
}
