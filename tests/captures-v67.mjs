/**
 * Captures v67 — bulletin de Maternelle et studio photo EducMaster.
 * Serveur de dev requis (5173) : node tests/captures-v67.mjs
 */
import { chromium } from 'playwright';

const BASE = 'http://localhost:5173';
const browser = await chromium.launch();

const domainIds = [
  'frequentations', 'proprete', 'socialisation', 'langage', 'pre-ecriture',
  'education-mouvement', 'pre-lecture', 'pre-mathematique', 'poesie-chant', 'autres',
];
const labels = [
  'Fréquentations', 'Propreté corporelle et vestimentaire', 'Socialisation', 'Langage',
  'Pré-écriture', 'Éducation du mouvement', 'Pré-lecture', 'Pré-mathématique',
  'Poésie et Chant', 'Autres',
];
const ratings = ['TS', 'S', 'TS', 'S', 'PS', 'TS', 'S', 'TS', 'TS', 'S'];
const observations = [
  'Très assidu', 'En progrès', 'Joue bien avec les autres', 'S’exprime de mieux en mieux',
  'À accompagner', 'Très à l’aise', 'Reconnaît plusieurs lettres', 'Compte jusqu’à dix',
  'Participe avec joie', 'Bon travail',
];

const cls = {
  id: 'maternelle-v67',
  name: 'Maternelle 1 — Les Lauriers',
  school: 'École Maternelle Les Lauriers',
  circonscription: 'Circonscription pédagogique de Kandi',
  level: 'Maternelle 1',
  educationType: 'prescolaire',
  schoolYear: '2026-2027',
  sequence: '1er trimestre',
  students: [{
    id: 'enfant-assogba', matricule: '104120183578', nom: 'ASSOGBA',
    prenoms: 'Jean Paul', sexe: 'M', dateNaissance: '2021-05-14', createdAt: Date.now(),
  }],
  subjects: labels.map((name, i) => ({
    id: `subject-${domainIds[i]}`, name, noteObtenueMax: 10, notePerfectionnementMax: 0, order: i,
  })),
  notes: [], createdAt: Date.now(), updatedAt: Date.now(),
};

async function newPage(viewport) {
  const ctx = await browser.newContext({ viewport, acceptDownloads: true });
  await ctx.addInitScript(() => {
    localStorage.setItem('msp_activation', JSON.stringify({
      activated: true, code: '112342', name: 'Hounsou Marie',
      activatedAt: Date.now(), expiresAt: Date.now() + 3e10, plan: 'complet',
    }));
    localStorage.setItem('msp_profile', JSON.stringify({
      teacherName: 'Hounsou Marie', schoolName: 'École Maternelle Les Lauriers',
      circonscription: 'Circonscription pédagogique de Kandi',
    }));
    localStorage.setItem('msp_install_dismissed', 'true');
    localStorage.setItem('msp_content_unlocks', JSON.stringify({
      'bulletin:maternelle-v67:enfant-assogba:1er trimestre': { contentId: 'x', kind: 'bulletin', title: 'Capture', unlockedAt: Date.now(), via: 'admin' },
    }));
    const get = localStorage.getItem.bind(localStorage);
    localStorage.getItem = (k) => (
      typeof k === 'string' && k.startsWith('msp_guide_hidden_') ? 'true' : get(k)
    );
  });
  const page = await ctx.newPage();
  page.on('dialog', (d) => d.accept());
  await page.goto(BASE + '/#/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(650);
  await page.evaluate(async ({ seedClass, ids, vals, obs }) => {
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
      store.clear(); store.put(seedClass);
      tx.oncomplete = resolve; tx.onerror = () => reject(tx.error);
    });
    const results = {};
    ids.forEach((id, i) => { results[id] = { rating: vals[i], observation: obs[i] }; });
    localStorage.setItem('msp_prescolaire_evaluations_v1', JSON.stringify([{
      id: 'capture-v67', classId: seedClass.id, studentId: 'enfant-assogba',
      trimester: '1er trimestre', results,
      generalAppreciation: 'Jean Paul a réalisé un très bon trimestre. Il participe volontiers aux activités, progresse en langage et doit continuer à être accompagné en pré-écriture.',
      updatedAt: Date.now(),
    }]));
  }, { seedClass: cls, ids: domainIds, vals: ratings, obs: observations });
  return { ctx, page };
}

async function syntheticPhoto(page) {
  const dataUrl = await page.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = 1200; c.height = 1000;
    const x = c.getContext('2d');
    x.fillStyle = '#2456c8'; x.fillRect(0, 0, 1200, 1000);
    x.fillStyle = '#f2b705';
    x.beginPath(); x.moveTo(330, 1000); x.lineTo(420, 680); x.lineTo(780, 680); x.lineTo(880, 1000); x.closePath(); x.fill();
    x.fillStyle = '#8b5a2b'; x.beginPath(); x.arc(600, 390, 185, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#111827'; x.beginPath(); x.arc(600, 335, 190, Math.PI * 1.02, Math.PI * 1.98); x.lineTo(780, 390); x.lineTo(420, 390); x.closePath(); x.fill();
    x.fillStyle = '#fff'; x.beginPath(); x.arc(535, 390, 22, 0, Math.PI * 2); x.arc(665, 390, 22, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#111827'; x.beginPath(); x.arc(535, 390, 9, 0, Math.PI * 2); x.arc(665, 390, 9, 0, Math.PI * 2); x.fill();
    x.strokeStyle = '#5b3413'; x.lineWidth = 10; x.beginPath(); x.arc(600, 455, 62, 0.15 * Math.PI, 0.85 * Math.PI); x.stroke();
    return c.toDataURL('image/png');
  });
  return Buffer.from(dataUrl.split(',')[1], 'base64');
}

{
  const { ctx, page } = await newPage({ width: 1280, height: 950 });
  await page.goto(BASE + '/#/class/maternelle-v67/bulletins', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(900);
  await page.getByTestId('preschool-student-enfant-assogba').click();
  await page.waitForTimeout(350);
  await page.getByTestId('preschool-domain-1').scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'apercu-v67-saisie-maternelle.png' });

  await page.getByTestId('preschool-tab-preview').click();
  await page.waitForTimeout(450);
  const pdfDownload = page.waitForEvent('download', { timeout: 20000 });
  await page.getByTestId('preschool-pdf').click();
  await (await pdfDownload).saveAs('apercu-v67-bulletin-maternelle.pdf');
  // Contrôle du chemin Imprimer : Chromium applique le CSS @media print.
  await page.emulateMedia({ media: 'print' });
  await page.pdf({ path: 'apercu-v67-impression-maternelle.pdf', format: 'A4', printBackground: true, preferCSSPageSize: true });
  await page.emulateMedia({ media: 'screen' });
  // Pour les captures des pages, masquer les barres fixes de l’application.
  await page.addStyleTag({ content: 'header{display:none!important}.fixed{display:none!important}' });
  await page.getByTestId('preschool-page-grid').screenshot({ path: 'apercu-v67-bulletin-maternelle-page1.png' });
  await page.getByTestId('preschool-page-visas').scrollIntoViewIfNeeded();
  await page.waitForTimeout(250);
  await page.getByTestId('preschool-page-visas').screenshot({ path: 'apercu-v67-bulletin-maternelle-page2.png' });

  await page.goto(BASE + '/#/class/maternelle-v67/photos-educmaster', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(900);
  const photo = await syntheticPhoto(page);
  await page.getByTestId('photo-file-input').setInputFiles({ name: 'photo-classe.png', mimeType: 'image/png', buffer: photo });
  await page.getByTestId('identity-processed-preview').waitFor({ timeout: 15000 });
  await page.waitForTimeout(700);
  await page.getByTestId('identity-processed-preview').scrollIntoViewIfNeeded();
  await page.waitForTimeout(250);
  await page.screenshot({ path: 'apercu-v67-studio-photo-educmaster.png' });
  await page.getByTestId('identity-processed-preview').screenshot({ path: 'apercu-v67-photo-fond-blanc.png' });
  await ctx.close();
}

{
  const { ctx, page } = await newPage({ width: 412, height: 915 });
  await page.goto(BASE + '/#/class/maternelle-v67', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(900);
  await page.getByText('Photos EducMaster').scrollIntoViewIfNeeded();
  await page.waitForTimeout(250);
  await page.screenshot({ path: 'apercu-v67-classe-maternelle.png' });

  await page.goto(BASE + '/#/enrolement', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(900);
  await page.getByText('Photos d’identité EducMaster').scrollIntoViewIfNeeded();
  await page.waitForTimeout(250);
  await page.screenshot({ path: 'apercu-v67-module-enrolement-photos.png' });

  await page.goto(BASE + '/#/guide/manuel', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(900);
  await page.getByTestId('recherche-manuel').fill('photos EducMaster');
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'apercu-v67-guide-educmaster.png' });
  await ctx.close();
}

await browser.close();
console.log('Captures v67 enregistrées.');
