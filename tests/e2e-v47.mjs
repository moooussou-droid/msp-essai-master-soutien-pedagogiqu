/**
 * E2E v47 — parcours navigateur reel des nouveautes.
 * Verifie ce que l'audit statique ne peut pas voir : le rendu, la
 * navigation, les calculs affiches et la generation de fichiers.
 */
import { chromium } from 'playwright';
const BASE = 'http://localhost:5173';
const CODE = 'MSP-Catalyste@@007-2026';
let pass = 0, fail = 0;
const ok = (c, n) => { c ? (pass++, console.log('  ✅ ' + n)) : (fail++, console.log('  ❌ ' + n)); };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, acceptDownloads: true });
const page = await ctx.newPage();

// Activation + neutralisation des guides qui interceptent les clics.
await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.evaluate((code) => {
  localStorage.setItem('msp_activation', JSON.stringify({
    activated: true, code, name: 'MOISE OUSSOU', activatedAt: Date.now(),
    // v53 : chronometre, calculatrice et numerisation relevent du plan Pro.
    expiresAt: Date.now() + 3e10, plan: 'pro',
  }));
  localStorage.setItem('msp_profile', JSON.stringify({
    teacherName: 'MOISE OUSSOU', schoolName: 'EPP NIMBO',
  }));
  const g = localStorage.getItem;
  localStorage.getItem = function (k) { return /msp_guide_hidden_/.test(k) ? 'true' : g.call(this, k); };
}, CODE);
await page.reload({ waitUntil: 'networkidle' });

console.log('\n1. Bandeau de licence');
const banner = page.getByTestId('bandeau-licence');
ok(await banner.count() > 0, 'le bandeau de licence est present');
const txt = (await banner.first().innerText()).replace(/\s+/g, ' ');
ok(/LICENCE\s*:/.test(txt), 'il affiche « LICENCE : »');
ok(/MOISE OUSSOU/.test(txt), `il nomme le titulaire du code (${txt.trim()})`);

console.log('\n2. Releve des effectifs de la cantine');
await page.goto(BASE + '/#/cantine/effectifs', { waitUntil: 'networkidle' });
ok(await page.getByTestId('grille-effectifs').count() > 0, 'la grille de saisie s affiche');
for (const c of ['maternelle1', 'maternelle2', 'ci', 'cp', 'ce1', 'ce2', 'cm1', 'cm2']) {
  ok(await page.getByTestId(`ligne-${c}`).count() > 0, `ligne ${c} presente`);
}
await page.getByTestId('garcons-ci').fill('12');
await page.getByTestId('filles-ci').fill('8');
await page.getByTestId('garcons-cm2').fill('5');
await page.getByTestId('filles-cm2').fill('15');
ok(await page.getByTestId('total-ci').innerText() === '20', 'total de la ligne CI calcule (20)');
ok(await page.getByTestId('total-garcons').innerText() === '17', 'total garcons = 17');
ok(await page.getByTestId('total-filles').innerText() === '23', 'total filles = 23');
ok(await page.getByTestId('total-general').innerText() === '40', 'total general = 40');
ok((await page.getByTestId('part-filles').innerText()).includes('57.5')
   || (await page.getByTestId('part-filles').innerText()).includes('57,5'), 'part des filles = 57,5 %');
// Le bandeau de licence est aussi present ici (donc « sur chaque page »).
ok(await page.getByTestId('bandeau-licence').count() > 0, 'bandeau de licence aussi sur cette page');

await page.getByTestId('btn-enregistrer-effectif').click();
await page.waitForTimeout(400);
ok(await page.getByTestId('message-effectifs').count() > 0, 'le relevé s enregistre');

// PDF reel
const dl = page.waitForEvent('download', { timeout: 15000 }).catch(() => null);
await page.getByTestId('btn-pdf-effectifs').click();
const file = await dl;
ok(!!file && /\.pdf$/.test(file.suggestedFilename()), `PDF des effectifs genere (${file?.suggestedFilename()})`);

console.log('\n3. Report vers le simulateur');
await page.getByTestId('btn-vers-simulateur').click();
await page.waitForTimeout(900);
ok(page.url().includes('/cantine/simulateur'), 'navigation vers le simulateur');
const prop = await page.getByTestId('effectif-propose').count();
ok(prop > 0, 'le simulateur signale l effectif repris du releve');
const champ = page.getByTestId('champ-effectif');
if (await champ.count() > 0) ok(await champ.inputValue() === '40', 'le champ effectif est pre-rempli a 40');

console.log('\n4. Chronometre');
await page.goto(BASE + '/#/chronometre', { waitUntil: 'networkidle' });
ok(await page.getByTestId('affichage-chrono').innerText() === '00:00,00', 'affichage initial a zero');
await page.getByTestId('btn-demarrer-chrono').click();
await page.waitForTimeout(1200);
await page.getByTestId('btn-top-arrivee').click();
await page.waitForTimeout(600);
await page.getByTestId('btn-top-arrivee').click();
const perfs = await page.getByTestId('liste-performances').locator('input').count();
ok(perfs === 2, `deux arrivees enregistrees (${perfs})`);
const aff = await page.getByTestId('affichage-chrono').innerText();
ok(aff !== '00:00,00', `le chronometre tourne (${aff})`);
await page.getByTestId('epreuve-endurance').click();
ok(await page.getByTestId('champ-distance').inputValue() === '600', 'endurance : distance 600 m par defaut');

console.log('\n5. Calculatrice');
await page.goto(BASE + '/#/calculatrice', { waitUntil: 'networkidle' });
await page.getByTestId('champ-expression').fill('2+3*4');
await page.getByTestId('touche-=').click();
ok(await page.getByTestId('resultat-calc').innerText() === '14', 'priorite des operations : 2+3*4 = 14');
await page.getByTestId('btn-clear').click();
await page.getByTestId('champ-expression').fill('4/0');
await page.getByTestId('touche-=').click();
ok(await page.getByTestId('erreur-calc').count() > 0, 'division par zero signalee, pas de resultat faux');
await page.getByTestId('onglet-notes').click();
await page.getByTestId('note-0').fill('12');
await page.getByTestId('coef-0').fill('2');
await page.getByTestId('btn-ajouter-note').click();
await page.getByTestId('note-1').fill('8');
await page.getByTestId('coef-1').fill('1');
const moy = await page.getByTestId('resultat-moyenne').innerText();
ok(moy.includes('10,67'), `moyenne ponderee = 10,67 (${moy})`);

console.log('\n6. Numerisation');
await page.goto(BASE + '/#/numeriser', { waitUntil: 'networkidle' });
ok(await page.getByTestId('btn-camera').count() > 0, 'bouton Camera present');
ok(await page.getByTestId('btn-importer').count() > 0, 'bouton Importer present');
ok(await page.getByTestId('mode-nb').count() > 0, 'mode noir et blanc propose');
await page.getByTestId('onglet-signature').click();
ok(await page.getByTestId('btn-charger-signature').count() > 0, 'numerisation de la signature');
ok(await page.getByTestId('btn-charger-cachet').count() > 0, 'numerisation du cachet');

console.log('\n7. Conditions d utilisation');
await page.goto(BASE + '/#/conditions', { waitUntil: 'networkidle' });
const cgu = await page.getByTestId('texte-conditions').innerText();
ok(cgu.includes('ARTICLE 1'), 'les articles s affichent');
ok(cgu.includes('999'), 'l abonnement annuel est mentionne');
ok(await page.getByTestId('btn-modifier-conditions').count() === 0,
   'un utilisateur ordinaire ne peut PAS modifier les conditions');
await page.evaluate(() => localStorage.setItem('msp_admin_dashboard_session', 'owner'));
await page.reload({ waitUntil: 'networkidle' });
ok(await page.getByTestId('btn-modifier-conditions').count() > 0,
   'le Super Administrateur peut modifier les conditions');
await page.getByTestId('btn-modifier-conditions').click();
await page.getByTestId('editeur-conditions').fill('ARTICLE 1 — ESSAI\nTexte modifie par le SA.');
page.once('dialog', d => d.accept());
await page.getByTestId('btn-enregistrer-conditions').click();
await page.waitForTimeout(500);
ok((await page.getByTestId('texte-conditions').innerText()).includes('Texte modifie par le SA'),
   'la modification du SA est bien enregistree');
await page.getByTestId('btn-reinitialiser-conditions').click().catch(() => {});
await page.waitForTimeout(300);

console.log('\n8. Verrou : un code = une ecole');
await page.goto(BASE, { waitUntil: 'networkidle' });
const verrou = await page.evaluate(async () => {
  localStorage.removeItem('msp_school_binding');
  localStorage.setItem('msp_activation', JSON.stringify({ activated: true, code: 'CODE-A', name: 'A' }));
  const m = await import('/src/utils/schoolBinding.ts');
  m.bindSchool('EPP NIMBO');
  const memeEcole = m.checkSchoolChange('EPP NIMBO').allowed;
  const deuxieme = m.checkSchoolChange('EPP SINENDE').allowed;
  localStorage.setItem('msp_activation', JSON.stringify({ activated: true, code: 'CODE-B', name: 'B' }));
  const autreCode = m.checkSchoolChange('EPP AUTRE');
  return { memeEcole, deuxieme, autreCode: autreCode.allowed, msg: autreCode.message };
});
ok(verrou.memeEcole, 'le titulaire peut re-enregistrer SON ecole');
ok(!verrou.deuxieme, 'le meme code ne peut pas enregistrer une 2e ecole');
ok(!verrou.autreCode, 'un autre code ne peut pas reprendre l appareil');
ok(/autre code/i.test(verrou.msg), 'le message explique le refus');

console.log('\n9. Documents administratifs officiels');
await page.goto(BASE + '/#/administration-scolaire', { waitUntil: 'networkidle' }).catch(() => {});
await page.waitForTimeout(500);

console.log(`\n════════════════════════════════════\nE2E v47 : ${pass} réussis, ${fail} échoués`);
await browser.close();
process.exit(fail ? 1 : 0);
