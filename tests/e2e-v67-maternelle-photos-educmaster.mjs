/**
 * E2E v67 — Bulletin officiel de Maternelle + photos EducMaster.
 *
 * Vérifie :
 *  - les 10 domaines TS/S/PS, les observations, l’appréciation générale,
 *    les visas et l’absence de moyenne/rang ;
 *  - les exports PDF, Word, Excel et synthèse sans classement ;
 *  - le cadrage 800×1000, le fond blanc connecté aux bords, l’enregistrement
 *    de la photo, l’import groupé par matricule et le ZIP EducMaster.
 *
 * Serveur de dev requis sur 5173.
 */
import { chromium } from 'playwright';
import JSZip from 'jszip';
import fs from 'node:fs/promises';

const BASE = 'http://localhost:5173';
let pass = 0;
let fail = 0;
const failures = [];
const ok = (condition, label) => {
  if (condition) { pass++; console.log('  ✅ ' + label); }
  else { fail++; failures.push(label); console.log('  ❌ ' + label); }
};
const bodyText = async (page) => (await page.locator('body').innerText()).replace(/\s+/g, ' ');

const domains = [
  ['frequentations', 'Fréquentations', 'TS', 'Très assidu'],
  ['proprete', 'Propreté corporelle et vestimentaire', 'S', 'En progrès'],
  ['socialisation', 'Socialisation', 'TS', 'Joue bien avec les autres'],
  ['langage', 'Langage', 'S', 'S’exprime de mieux en mieux'],
  ['pre-ecriture', 'Pré-écriture', 'PS', 'À accompagner'],
  ['education-mouvement', 'Éducation du mouvement', 'TS', 'Très à l’aise'],
  ['pre-lecture', 'Pré-lecture', 'S', 'Reconnaît plusieurs lettres'],
  ['pre-mathematique', 'Pré-mathématique', 'TS', 'Compte jusqu’à dix'],
  ['poesie-chant', 'Poésie et Chant', 'TS', 'Participe avec joie'],
  ['autres', 'Autres', 'S', 'Bon travail'],
];

const subjects = domains.map(([id, name], i) => ({
  id: `subject-${id}`, name, noteObtenueMax: 10, notePerfectionnementMax: 0, order: i,
}));

const classes = [
  {
    id: 'maternelle-v67',
    name: 'Maternelle 1 — Les Lauriers',
    school: 'École Maternelle Les Lauriers',
    circonscription: 'Circonscription pédagogique de Kandi',
    level: 'Maternelle 1',
    educationType: 'prescolaire',
    schoolYear: '2026-2027',
    sequence: '1er trimestre',
    students: [
      { id: 'enfant-assogba', matricule: '104120183578', nom: 'ASSOGBA', prenoms: 'Jean Paul', sexe: 'M', dateNaissance: '2021-05-14', createdAt: Date.now() },
      { id: 'enfant-zinsou', matricule: '', nom: 'Zinsou', prenoms: 'Amina', sexe: 'F', dateNaissance: '2021-11-03', createdAt: Date.now() },
    ],
    subjects,
    notes: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'cp-v67',
    name: 'CP — Les Lauriers',
    school: 'École Maternelle Les Lauriers',
    circonscription: 'Circonscription pédagogique de Kandi',
    level: 'CP',
    educationType: 'primaire',
    schoolYear: '2026-2027',
    sequence: '1er trimestre',
    students: [
      { id: 'eleve-cp', matricule: '001234', nom: 'Boni', prenoms: 'Sara', sexe: 'F', createdAt: Date.now() },
    ],
    subjects: [{ id: 'math-cp', name: 'Math', noteObtenueMax: 18, notePerfectionnementMax: 2, order: 0 }],
    notes: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];

const browser = await chromium.launch({ args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true, permissions: ['camera'] });
await ctx.addInitScript(() => {
  localStorage.setItem('msp_activation', JSON.stringify({
    activated: true, code: '112342', name: 'Hounsou Marie',
    activatedAt: Date.now(), expiresAt: Date.now() + 3e10, plan: 'complet',
  }));
  localStorage.setItem('msp_profile', JSON.stringify({
    teacherName: 'Hounsou Marie',
    schoolName: 'École Maternelle Les Lauriers',
    circonscription: 'Circonscription pédagogique de Kandi',
  }));
  localStorage.setItem('msp_install_dismissed', 'true');
  localStorage.setItem('msp_prescolaire_evaluations_v1', '[]');
  localStorage.setItem('msp_content_unlocks', JSON.stringify({
    'bulletin:maternelle-v67:enfant-assogba:1er trimestre': { contentId: 'x', kind: 'bulletin', title: 'Test', unlockedAt: Date.now(), via: 'admin' },
    'bulletins:maternelle-v67:1er trimestre': { contentId: 'x', kind: 'bulletin', title: 'Test', unlockedAt: Date.now(), via: 'admin' },
  }));
  const get = localStorage.getItem.bind(localStorage);
  localStorage.getItem = (k) => (
    typeof k === 'string' && k.startsWith('msp_guide_hidden_') ? 'true' : get(k)
  );
});
const page = await ctx.newPage();
page.on('dialog', (dialog) => dialog.accept());
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(String(e)));
page.on('console', (msg) => { if (msg.type() === 'error') pageErrors.push(msg.text()); });

await page.goto(BASE + '/#/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(800);
await page.evaluate(async (seed) => {
  const db = await new Promise((resolve, reject) => {
    const req = indexedDB.open('NoteFacileBenin', 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains('classes')) req.result.createObjectStore('classes', { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  await new Promise((resolve, reject) => {
    const tx = db.transaction('classes', 'readwrite');
    const store = tx.objectStore('classes');
    store.clear();
    for (const c of seed) store.put(c);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}, classes);

async function syntheticPhoto(background = '#2456c8', shirt = '#f2b705') {
  const dataUrl = await page.evaluate(({ bg, sh }) => {
    const c = document.createElement('canvas');
    c.width = 1200; c.height = 1000;
    const x = c.getContext('2d');
    x.fillStyle = bg; x.fillRect(0, 0, c.width, c.height);
    x.fillStyle = sh;
    x.beginPath(); x.moveTo(330, 1000); x.lineTo(420, 680); x.lineTo(780, 680); x.lineTo(880, 1000); x.closePath(); x.fill();
    x.fillStyle = '#8b5a2b';
    x.beginPath(); x.arc(600, 390, 185, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#111827';
    x.beginPath(); x.arc(600, 335, 190, Math.PI * 1.02, Math.PI * 1.98); x.lineTo(780, 390); x.lineTo(420, 390); x.closePath(); x.fill();
    x.fillStyle = '#ffffff';
    x.beginPath(); x.arc(535, 390, 22, 0, Math.PI * 2); x.arc(665, 390, 22, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#111827';
    x.beginPath(); x.arc(535, 390, 9, 0, Math.PI * 2); x.arc(665, 390, 9, 0, Math.PI * 2); x.fill();
    x.strokeStyle = '#5b3413'; x.lineWidth = 10;
    x.beginPath(); x.arc(600, 455, 62, 0.15 * Math.PI, 0.85 * Math.PI); x.stroke();
    return c.toDataURL('image/png');
  }, { bg: background, sh: shirt });
  return Buffer.from(dataUrl.split(',')[1], 'base64');
}

async function syntheticFlatPhoto(color = '#8f7c65') {
  const dataUrl = await page.evaluate((fill) => {
    const c = document.createElement('canvas');
    c.width = 1200; c.height = 1000;
    const x = c.getContext('2d');
    x.fillStyle = fill; x.fillRect(0, 0, c.width, c.height);
    return c.toDataURL('image/png');
  }, color);
  return Buffer.from(dataUrl.split(',')[1], 'base64');
}

async function readClass(classId) {
  return page.evaluate(async (id) => {
    const db = await new Promise((resolve, reject) => {
      const req = indexedDB.open('NoteFacileBenin', 1);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return new Promise((resolve, reject) => {
      const req = db.transaction('classes', 'readonly').objectStore('classes').get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }, classId);
}

console.log('\n1. Bulletin officiel de maternelle — saisie TS/S/PS');
await page.goto(BASE + '/#/class/maternelle-v67/bulletins', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1100);
let text = await bodyText(page);
ok(text.includes('Bulletins officiels de la Maternelle'), 'la classe préscolaire ouvre l’écran maternelle dédié');
ok(text.includes('GRILLE D’ÉVALUATION TRIMESTRIELLE'), 'le titre officiel de la grille est annoncé');
ok(!text.includes('Moy. classe') && !text.includes('Admis') && !text.includes('/20'), 'aucune moyenne, admission ni note /20 pour la maternelle');

await page.getByTestId('preschool-student-enfant-assogba').click();
await page.waitForTimeout(500);
ok(await page.getByTestId('preschool-editor').count() > 0, 'l’éditeur des dix domaines s’ouvre');
for (const [domainId, , rating, observation] of domains) {
  await page.getByTestId(`rating-${domainId}-${rating}`).scrollIntoViewIfNeeded();
  await page.getByTestId(`rating-${domainId}-${rating}`).click();
  await page.getByTestId(`observation-${domainId}`).fill(observation);
}
const appreciation = 'Jean Paul a réalisé un très bon trimestre. Il participe volontiers aux activités, progresse en langage et doit continuer à être accompagné en pré-écriture.';
await page.getByTestId('preschool-general-appreciation').fill(appreciation);
await page.getByTestId('preschool-save').click();
await page.waitForTimeout(900);

const records = await page.evaluate(() => JSON.parse(localStorage.getItem('msp_prescolaire_evaluations_v1') || '[]'));
ok(records.length === 1 && records[0].trimester === '1er trimestre', 'la grille est enregistrée pour le 1er trimestre');
ok(domains.every(([id, , rating]) => records[0]?.results?.[id]?.rating === rating), 'les 10 appréciations TS/S/PS sont persistées');
ok(records[0]?.results?.langage?.observation === 'S’exprime de mieux en mieux', 'les observations par domaine sont persistées');
ok(records[0]?.generalAppreciation === appreciation, 'l’appréciation générale est persistée');

await page.getByTestId('preschool-tab-preview').click();
await page.waitForTimeout(500);
text = await bodyText(page);
for (const expected of [
  'GRILLE D’ÉVALUATION TRIMESTRIELLE', '1er Trimestre', 'Domaine d’Évaluation',
  'Echelle des valeurs', 'Observation', 'Fréquentations',
  'Propreté corporelle et vestimentaire', 'Socialisation', 'Langage', 'Pré-écriture',
  'Éducation du mouvement', 'Pré-lecture', 'Pré-mathématique', 'Poésie et Chant', 'Autres',
  'sur la base de l’observation permanente', 'par rapport à lui-même', 'non par rapport à ses camarades',
  'APPRÉCIATION GÉNÉRALE DE L’ENSEIGNANT(E)', 'VISA DE L’ENSEIGNANT(E)',
  'VISA DU DIRECTEUR(TRICE)', 'VISA DES PARENTS OU TUTEURS DE L’ENFANT',
  'Signature et nom', 'LEGENDES', 'TS : Très Satisfaisant', 'S : Satisfaisant', 'PS : Peu Satisfaisant',
]) {
  ok(text.includes(expected), `bulletin officiel : « ${expected} » présent`);
}
ok(await page.getByTestId('preschool-page-grid').count() === 1, 'page 1 officielle rendue séparément');
ok(await page.getByTestId('preschool-page-visas').count() === 1, 'page 2 officielle rendue séparément');
ok(!text.includes('Rang de l’élève') && !text.includes('Moyenne Générale'), 'le bulletin officiel ne contient ni rang ni moyenne');

let downloadPromise = page.waitForEvent('download', { timeout: 20000 }).catch(() => null);
await page.getByTestId('preschool-pdf').click();
let download = await downloadPromise;
ok(!!download && /bulletin-maternelle-assogba-jean-paul-1er-trimestre\.pdf$/.test(download.suggestedFilename()), `PDF individuel officiel généré (${download?.suggestedFilename()})`);
if (download) {
  const bytes = await fs.readFile(await download.path());
  ok(bytes.subarray(0, 4).toString() === '%PDF' && bytes.length > 3000, `le PDF individuel est un vrai fichier PDF non vide (${bytes.length} octets)`);
}

console.log('\n2. Exports de classe sans classement');
await page.getByRole('button', { name: 'Retour à la liste' }).click();
await page.waitForTimeout(500);

downloadPromise = page.waitForEvent('download', { timeout: 25000 }).catch(() => null);
await page.getByTestId('preschool-export-excel').click();
download = await downloadPromise;
ok(!!download && /grille-maternelle-.*\.xlsx$/.test(download.suggestedFilename()), `Excel TS/S/PS généré (${download?.suggestedFilename()})`);

downloadPromise = page.waitForEvent('download', { timeout: 25000 }).catch(() => null);
await page.getByTestId('preschool-export-word').click();
download = await downloadPromise;
ok(!!download && /\.docx$/.test(download.suggestedFilename()), `Word officiel généré (${download?.suggestedFilename()})`);
if (download) {
  const zip = await JSZip.loadAsync(await fs.readFile(await download.path()));
  const xml = await zip.file('word/document.xml').async('string');
  ok(xml.includes('GRILLE D’ÉVALUATION TRIMESTRIELLE') && xml.includes('VISA DES PARENTS'), 'le Word contient les deux pages officielles');
  ok(xml.includes('✓') && xml.includes('Pré-mathématique'), 'le Word contient les coches et les domaines exacts');
}

downloadPromise = page.waitForEvent('download', { timeout: 25000 }).catch(() => null);
await page.getByTestId('preschool-export-summary').click();
download = await downloadPromise;
ok(!!download && /synthese-maternelle-.*\.pdf$/.test(download.suggestedFilename()), `synthèse PDF sans classement générée (${download?.suggestedFilename()})`);

downloadPromise = page.waitForEvent('download', { timeout: 25000 }).catch(() => null);
await page.getByTestId('preschool-export-pdf').click();
download = await downloadPromise;
ok(!!download && /bulletins-maternelle-.*\.pdf$/.test(download.suggestedFilename()), `PDF officiel de toute la classe généré (${download?.suggestedFilename()})`);
if (download) {
  const bytes = await fs.readFile(await download.path());
  ok(bytes.subarray(0, 4).toString() === '%PDF' && bytes.length > 5000, 'le PDF de classe est un vrai fichier PDF non vide');
}

// Un autre trimestre est indépendant, puis le premier se recharge.
await page.getByTestId('preschool-student-enfant-assogba').click();
await page.waitForTimeout(300);
await page.getByRole('button', { name: '2e Trimestre' }).first().click();
await page.waitForTimeout(250);
ok((await page.getByTestId('preschool-general-appreciation').inputValue()) === '', 'le 2e trimestre démarre indépendamment du 1er');
await page.getByRole('button', { name: '1er Trimestre' }).first().click();
await page.waitForTimeout(250);
ok((await page.getByTestId('preschool-general-appreciation').inputValue()) === appreciation, 'le 1er trimestre se recharge après changement de période');

console.log('\n3. Studio photo EducMaster — fond blanc et nom officiel');
await page.goto(BASE + '/#/class/maternelle-v67/photos-educmaster', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1100);
text = await bodyText(page);
ok(text.includes('Photos d’identité EducMaster'), 'le studio photo de la classe s’ouvre');
ok(text.includes('104120183578_ASSOGBA_Jean_Paul'), 'l’exemple et le nom de fichier EducMaster sont affichés');
ok((await page.getByTestId('educmaster-filename').innerText()) === '104120183578_ASSOGBA_Jean_Paul.jpg', 'nom de fichier exact matricule_NOM_Prenom_Prenom.jpg');

// Caméra intégrée : Chromium fournit un flux vidéo de test. On vérifie le
// démarrage, le guide de cadrage, la capture native puis l’arrêt du flux.
await page.getByTestId('educmaster-camera-start').click();
await page.getByTestId('educmaster-camera-capture').waitFor({ timeout: 15000 });
await page.waitForFunction(() => {
  const video = document.querySelector('video');
  return !!video && video.videoWidth > 0 && video.videoHeight > 0;
}, { timeout: 15000 });
ok(true, 'la caméra intégrée démarre et fournit un flux vidéo');
await page.getByTestId('educmaster-camera-capture').click();
await page.getByTestId('identity-processed-preview').waitFor({ timeout: 15000 });
ok(true, 'la capture de la caméra intégrée alimente le cadrage d’identité');
ok(await page.getByTestId('educmaster-camera-start').count() > 0, 'le flux caméra est arrêté après la capture');

const onePhoto = await syntheticPhoto();
await page.getByTestId('photo-file-input').setInputFiles({ name: 'photo-originale.png', mimeType: 'image/png', buffer: onePhoto });
await page.getByTestId('identity-processed-preview').waitFor({ timeout: 15000 });
await page.waitForTimeout(700);
const pixels = await page.evaluate(async () => {
  const img = document.querySelector('[data-testid="identity-processed-preview"]');
  await img.decode();
  const c = document.createElement('canvas');
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  const x = c.getContext('2d');
  x.drawImage(img, 0, 0);
  const corner = [...x.getImageData(4, 4, 1, 1).data];
  const face = [...x.getImageData(400, 450, 1, 1).data];
  const shirt = [...x.getImageData(400, 950, 1, 1).data];
  return { w: img.naturalWidth, h: img.naturalHeight, corner, face, shirt };
});
ok(pixels.w === 800 && pixels.h === 1000, 'la photo finale fait exactement 800 × 1000 px');
ok(pixels.corner[0] > 245 && pixels.corner[1] > 245 && pixels.corner[2] > 245, 'le fond bleu relié aux bords devient blanc');
ok(pixels.face[0] > 100 && pixels.face[0] < 190 && pixels.face[2] < 100, 'le visage au centre n’est pas blanchi');
ok(pixels.shirt[0] > 200 && pixels.shirt[1] > 130 && pixels.shirt[2] < 80, 'le vêtement jaune au centre est conservé');

await page.getByTestId('identity-save-photo').click();
await page.waitForTimeout(1000);
let savedClass = await readClass('maternelle-v67');
let savedStudent = savedClass.students.find((s) => s.id === 'enfant-assogba');
ok(savedStudent.photoUrl?.startsWith('data:image/jpeg'), 'la photo traitée est enregistrée dans la classe');
ok(savedStudent.educMasterPhotoWhiteBackground === true, 'la préparation fond blanc est tracée');
text = await bodyText(page);
ok(text.includes('Prêt EducMaster'), 'l’élève photographié devient prêt pour EducMaster');

await page.getByTestId('educmaster-student-enfant-zinsou').locator('button').first().click();
await page.waitForTimeout(350);
await page.getByTestId('educmaster-matricule').fill('104120183579');
await page.getByRole('button', { name: 'Enregistrer l’identité' }).click();
await page.waitForTimeout(700);
ok((await page.getByTestId('educmaster-filename').innerText()) === '104120183579_ZINSOU_Amina.jpg', 'le nom de fichier se recalcule avec le nouveau matricule');

const batchPhoto = await syntheticPhoto('#12805c', '#d64045');
await page.getByTestId('batch-photo-input').setInputFiles([
  { name: '104120183579_ZINSOU_Amina.png', mimeType: 'image/png', buffer: batchPhoto },
  { name: '999999_INCONNU_Test.png', mimeType: 'image/png', buffer: batchPhoto },
]);
await page.waitForTimeout(1800);
text = await bodyText(page);
ok(text.includes('1 photo(s) rattachée(s) automatiquement par matricule'), 'import groupé : rattachement automatique par matricule');
ok(text.includes('999999_INCONNU_Test.png'), 'import groupé : le fichier sans correspondance est signalé');
savedClass = await readClass('maternelle-v67');
savedStudent = savedClass.students.find((s) => s.id === 'enfant-zinsou');
ok(savedStudent.matricule === '104120183579' && !!savedStudent.photoUrl, 'matricule et photo importée sont enregistrés');

downloadPromise = page.waitForEvent('download', { timeout: 30000 }).catch(() => null);
await page.getByTestId('educmaster-export-zip').click();
download = await downloadPromise;
ok(!!download && /^PHOTOS_EDUCMASTER_.*\.zip$/.test(download.suggestedFilename()), `ZIP EducMaster généré (${download?.suggestedFilename()})`);
if (download) {
  const zip = await JSZip.loadAsync(await fs.readFile(await download.path()));
  const names = Object.keys(zip.files);
  ok(names.includes('PHOTOS_EDUCMASTER/104120183578_ASSOGBA_Jean_Paul.jpg'), 'ZIP : photo Jean Paul au nom EducMaster exact');
  ok(names.includes('PHOTOS_EDUCMASTER/104120183579_ZINSOU_Amina.jpg'), 'ZIP : photo Amina au nom EducMaster exact');
  ok(names.includes('BORDEREAU_PHOTOS_EDUCMASTER.csv'), 'ZIP : bordereau de contrôle inclus');
  const readme = await zip.file('LISEZ-MOI_IMPORT_EDUCMASTER.txt').async('string');
  ok(readme.includes('Actions → Importer les photos') && readme.includes('Enregistrer'), 'ZIP : consignes EducMaster incluses');
}

// Garde-fou : une image trop uniforme rend le détourage ambigu. Le moteur
// doit conserver l’original et prévenir l’utilisateur, jamais blanchir toute
// la photo.
const flatImage = await syntheticFlatPhoto();
await page.getByTestId('photo-file-input').setInputFiles({ name: 'fond-ambigu.png', mimeType: 'image/png', buffer: flatImage });
await page.getByTestId('identity-background-warning').waitFor({ timeout: 15000 });
const flatCheck = await page.evaluate(async () => {
  const img = document.querySelector('[data-testid="identity-processed-preview"]');
  await img.decode();
  const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
  const x = c.getContext('2d'); x.drawImage(img, 0, 0);
  return [...x.getImageData(400, 450, 1, 1).data];
});
ok(flatCheck[0] < 245 && flatCheck[1] < 235 && flatCheck[2] < 220, 'détourage ambigu : la photo originale n’est pas recouverte de blanc');
ok((await page.getByTestId('identity-background-warning').innerText()).includes('photo originale est conservée'), 'détourage ambigu : avertissement clair et conservation de la photo');

await page.getByTestId('educmaster-class-select').selectOption('cp-v67');
await page.waitForTimeout(900);
ok(page.url().includes('/class/cp-v67/photos-educmaster'), 'le sélecteur permet d’utiliser le studio dans chaque classe');
const cpFilename = await page.getByTestId('educmaster-filename').innerText();
ok(cpFilename === '001234_BONI_Sara.jpg', `les zéros initiaux du matricule sont conservés (${cpFilename})`);

// Le même studio doit aussi être atteint depuis le module Enrôlement.
await page.evaluate(() => { location.hash = '/enrolement'; });
const modulePhotoLink = page.getByRole('link', { name: /Photos d’identité EducMaster/i });
await modulePhotoLink.waitFor({ timeout: 15000 });
await modulePhotoLink.click();
await page.getByTestId('educmaster-photos-screen').waitFor({ timeout: 15000 });
ok(page.url().includes('/photos-educmaster'), 'le module Enrôlement ouvre le studio photo EducMaster');

ok(pageErrors.length === 0, `aucune erreur JavaScript (${pageErrors.slice(0, 3).join(' | ') || 'aucune'})`);

await ctx.close();
await browser.close();

console.log(`\n=== E2E v67 Maternelle + EducMaster : ${pass} réussites, ${fail} échecs ===`);
if (fail) {
  console.log('Échecs :');
  failures.forEach((f) => console.log('  - ' + f));
}
process.exit(fail > 0 ? 1 : 0);
