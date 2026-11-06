/**
 * E2E v52 — les 8 modules de vie scolaire, en conditions reelles.
 */
import { chromium } from 'playwright';

const BASE='http://localhost:5173';
const CLASS_ID='classe-v52';
let pass=0,fail=0;
const ok=(c,n)=>{c?(pass++,console.log('  ✅ '+n)):(fail++,console.log('  ❌ '+n));};

const browser=await chromium.launch();
const ctx=await browser.newContext({viewport:{width:412,height:915},acceptDownloads:true});
await ctx.addInitScript(()=>{
  localStorage.setItem('msp_activation',JSON.stringify({activated:true,code:'MSP-Catalyste@@007-2026',name:'MOISE OUSSOU',activatedAt:Date.now(),expiresAt:Date.now()+3e10,plan:'pro'}));
  localStorage.setItem('msp_profile',JSON.stringify({teacherName:'MOISE OUSSOU',schoolName:'EPP NIMBO'}));
  const g=localStorage.getItem;
  localStorage.getItem=function(k){return /msp_guide_hidden_/.test(k)?'true':g.call(this,k);};
});
const page=await ctx.newPage();
const errs=[]; page.on('pageerror',e=>errs.push(String(e).slice(0,120)));
page.on('dialog',d=>d.accept('5000'));

// ---- Semis : classe, notes, presences ----
await page.goto(BASE+'/#/',{waitUntil:'networkidle'});
await page.evaluate(async (id)=>{
  const { openDB } = await import('/node_modules/.vite/deps/idb.js').catch(()=>import('idb'));
  const db=await openDB('NoteFacileBenin',undefined);
  const students=[
    {id:'s1',nom:'AHOUANSOU',prenoms:'Jean',matricule:'001',sexe:'M',createdAt:1},
    {id:'s2',nom:'KOFFI',prenoms:'Mariam',matricule:'002',sexe:'F',createdAt:2},
    {id:'s3',nom:'DOSSOU',prenoms:'Paul',matricule:'003',sexe:'M',createdAt:3},
  ];
  const subjects=[{id:'sub1',name:'Calcul',noteObtenueMax:18,notePerfectionnementMax:2,order:1,coefficient:1}];
  // s3 sous la moyenne -> doit etre propose en remediation
  const notes=[
    {id:'n1',studentId:'s1',subjectId:'sub1',evaluation:'sommative1',noteObtenue:16,notePerfectionnement:2,absent:false,updatedAt:1},
    {id:'n2',studentId:'s2',subjectId:'sub1',evaluation:'sommative1',noteObtenue:12,notePerfectionnement:1,absent:false,updatedAt:1},
    {id:'n3',studentId:'s3',subjectId:'sub1',evaluation:'sommative1',noteObtenue:5,notePerfectionnement:0,absent:false,updatedAt:1},
  ];
  await db.put('classes',{id,name:'CM2 A',level:'CM2',educationType:'primaire',school:'EPP NIMBO',
    students,subjects,notes,createdAt:Date.now()});
  // 2026-09-14 lundi (2 demi-j), 2026-09-16 mercredi (1 demi-j)
  localStorage.setItem('msp_attendance_records',JSON.stringify([
    {id:'a1',classId:id,date:'2026-09-14',entries:[{studentId:'s1',status:'absent_injustifiee',half:'matin'}]},
    {id:'a2',classId:id,date:'2026-09-16',entries:[{studentId:'s2',status:'absent_justifiee',half:'matin',motif:'Maladie'}]},
  ]));
},CLASS_ID);

console.log('\n① Registre d’appel officiel');
await page.goto(BASE+'/#/registre-appel',{waitUntil:'networkidle'}); await page.waitForTimeout(1200);
await page.getByTestId('select-classe-registre').selectOption(CLASS_ID);
await page.waitForTimeout(800);
const taux=await page.getByTestId('taux-global').innerText();
// du = lundi 2x3 + mercredi 1x3 = 9 ; absences 2 ; suivies 7 -> 77,8%
ok(taux.includes('77,8'),`taux de fréquentation calculé (${taux})`);
ok((await page.getByTestId('taux-garcons').innerText()).length>0,'ventilation garçons affichée');
ok((await page.getByTestId('taux-filles').innerText()).length>0,'ventilation filles affichée');
ok(await page.getByTestId('tableau-eleves').count()>0,'détail par élève présent');
const [d1]=await Promise.all([page.waitForEvent('download',{timeout:25000}),page.getByTestId('btn-pdf-registre').click()]);
ok(d1.suggestedFilename().endsWith('.pdf'),'PDF du registre téléchargé');

console.log('\n② Paiements des élèves');
await page.goto(BASE+'/#/paiements',{waitUntil:'networkidle'}); await page.waitForTimeout(1000);
await page.getByTestId('select-classe-frais').selectOption(CLASS_ID);
await page.waitForTimeout(500);
await page.getByTestId('btn-appel-scolarite').click(); // prompt -> 5000
await page.waitForTimeout(900);
ok((await page.getByTestId('liste-frais').innerText()).includes('AHOUANSOU'),'lignes créées pour la classe');
await page.getByTestId('btn-verser-s1').click();
await page.waitForTimeout(500);
await page.getByTestId('champ-montant-verse').fill('2000');
const [d2]=await Promise.all([page.waitForEvent('download',{timeout:25000}),page.getByTestId('btn-valider-versement').click()]);
ok(/recu-\d{4}-\d{4}\.pdf/.test(d2.suggestedFilename()),`reçu numéroté généré (${d2.suggestedFilename()})`);
await page.waitForTimeout(700);
const encaisse=await page.getByTestId('total-encaisse').innerText();
ok(encaisse.includes('2 000'),`encaissé mis à jour (${encaisse})`);
const reste=await page.getByTestId('reste-du').innerText();
ok(reste.includes('13 000'),`reste dû = 15000-2000 = 13 000 (${reste})`);

console.log('\n③ Livret scolaire');
await page.goto(BASE+'/#/livret-scolaire',{waitUntil:'networkidle'}); await page.waitForTimeout(900);
await page.getByTestId('btn-importer-eleves').click();
await page.waitForTimeout(800);
ok((await page.getByTestId('liste-livrets').innerText()).includes('AHOUANSOU'),'livrets créés depuis les classes');
await page.locator('[data-testid="liste-livrets"] button').first().click();
await page.waitForTimeout(700);
ok(await page.getByTestId('synthese-livret').count()>0,'le livret d’un élève s’ouvre');

console.log('\n④ Manuels et matériel');
await page.goto(BASE+'/#/manuels-materiel',{waitUntil:'networkidle'}); await page.waitForTimeout(900);
await page.getByTestId('btn-nouvel-article').click(); await page.waitForTimeout(500);
await page.getByTestId('champ-article').fill('Manuel de lecture CM2');
await page.getByTestId('champ-quantite').fill('10');
await page.getByTestId('btn-enregistrer-article').click();
await page.waitForTimeout(800);
ok((await page.getByTestId('nb-articles').innerText())==='1','article enregistré');
const btnPreter=page.locator('[data-testid^="btn-preter-"]').first();
await btnPreter.click(); await page.waitForTimeout(500);
await page.getByTestId('select-eleve-pret').selectOption({index:1});
await page.getByTestId('btn-valider-pret').click();
await page.waitForTimeout(800);
ok((await page.getByTestId('nb-prets').innerText())==='1','prêt enregistré');
ok((await page.getByTestId('liste-articles').innerText()).includes('9 dispo'),'stock disponible déduit du prêt (10-1=9)');

console.log('\n⑤ Emploi du temps');
await page.goto(BASE+'/#/emploi-du-temps',{waitUntil:'networkidle'}); await page.waitForTimeout(1000);
await page.getByTestId('select-classe-edt').selectOption(CLASS_ID);
await page.waitForTimeout(500);
await page.getByTestId('btn-ajouter-Lundi').click(); await page.waitForTimeout(400);
const m1=page.locator('[data-testid^="matiere-"]').first();
await m1.fill('Calcul');
await page.waitForTimeout(400);
ok((await page.getByTestId('volume-horaire').innerText()).includes('1 h'),'volume horaire calculé');
// creer un chevauchement
await page.getByTestId('btn-ajouter-Lundi').click(); await page.waitForTimeout(500);
ok(await page.getByTestId('alerte-chevauchement').count()>0,'chevauchement d’horaires détecté');
await page.getByTestId('btn-enregistrer-edt').click(); await page.waitForTimeout(600);
ok(await page.getByTestId('statut-edt').count()>0,'emploi du temps enregistré');

console.log('\n⑥ Élèves en difficulté');
await page.goto(BASE+'/#/remediation',{waitUntil:'networkidle'}); await page.waitForTimeout(1000);
await page.getByTestId('select-classe-remediation').selectOption(CLASS_ID);
await page.waitForTimeout(800);
ok(await page.getByTestId('suggestions').count()>0,'les élèves sous 10/20 sont proposés');
ok((await page.getByTestId('suggestions').innerText()).includes('DOSSOU'),'l’élève en difficulté est identifié');
await page.getByTestId('btn-ouvrir-dossier-s3').click();
await page.waitForTimeout(700);
await page.getByTestId('champ-matiere-remediation').fill('Calcul');
await page.getByTestId('champ-difficulte').fill('Confond unités et dizaines');
await page.getByTestId('btn-ajouter-action').click(); await page.waitForTimeout(400);
await page.getByTestId('action-desc-0').fill('Séance de soutien le mercredi');
await page.getByTestId('champ-note-actuelle').fill('11');
await page.getByTestId('champ-statut-remediation').selectOption('resolue');
await page.getByTestId('btn-enregistrer-remediation').click();
await page.waitForTimeout(800);
ok((await page.getByTestId('nb-dossiers').innerText())==='1','dossier de remédiation créé');
ok((await page.getByTestId('taux-resolution').innerText()).includes('100'),'taux de résolution calculé');

console.log('\n⑦ Sauvegarde');
await page.goto(BASE+'/#/sauvegarde',{waitUntil:'networkidle'}); await page.waitForTimeout(900);
ok((await page.getByTestId('etat-sauvegarde').innerText()).includes('Aucune sauvegarde'),'alerte : aucune sauvegarde effectuée');
const [d3]=await Promise.all([page.waitForEvent('download',{timeout:25000}),page.getByTestId('btn-sauvegarder').click()]);
ok(/sauvegarde-msp-\d{4}-\d{2}-\d{2}\.json/.test(d3.suggestedFilename()),`fichier de sauvegarde produit (${d3.suggestedFilename()})`);
await page.waitForTimeout(900);
ok((await page.getByTestId('etat-sauvegarde').innerText()).includes('à jour'),'l’état passe à « sauvegarde à jour »');
ok(await page.getByTestId('historique-sauvegardes').count()>0,'historique des sauvegardes enregistré');
// La sauvegarde contient-elle les nouvelles donnees ?
const fs=await import('fs'); const os=await import('os'); const path=await import('path');
const tmp=path.join(os.tmpdir(),'sv52.json'); await d3.saveAs(tmp);
const contenu=fs.readFileSync(tmp,'utf8');
ok(contenu.includes('msp_school_fees'),'les paiements sont inclus dans la sauvegarde');
ok(contenu.includes('msp_remediation'),'la remédiation est incluse dans la sauvegarde');
ok(contenu.includes('AHOUANSOU'),'les élèves sont inclus dans la sauvegarde');

console.log('\n⑧ Conseil de classe');
await page.goto(BASE+'/#/conseil-classe',{waitUntil:'networkidle'}); await page.waitForTimeout(1000);
await page.getByTestId('select-classe-conseil').selectOption(CLASS_ID);
await page.waitForTimeout(500);
await page.getByTestId('btn-preparer-conseil').click();
await page.waitForTimeout(900);
ok(await page.getByTestId('synthese-conseil').count()>0,'la délibération est préparée');
const admis=await page.getByTestId('nb-admis').innerText();
ok(admis==='2',`2 élèves admis sur 3 proposés automatiquement (${admis})`);
ok((await page.getByTestId('taux-passage').innerText()).includes('66,7'),'taux de passage calculé');
// Le conseil reste souverain : on modifie une decision
await page.getByTestId('decision-s3').selectOption('admis');
await page.waitForTimeout(500);
ok((await page.getByTestId('nb-admis').innerText())==='3','le conseil peut modifier la décision proposée');
await page.getByTestId('btn-enregistrer-conseil').click(); await page.waitForTimeout(700);
ok(await page.getByTestId('statut-conseil').count()>0,'délibération enregistrée');
const [d4]=await Promise.all([page.waitForEvent('download',{timeout:25000}),page.getByTestId('btn-pdf-conseil').click()]);
ok(d4.suggestedFilename().includes('pv-conseil'),`procès-verbal PDF généré (${d4.suggestedFilename()})`);

console.log('\n⑨ Accessibilité et intégrité');
await page.goto(BASE+'/#/',{waitUntil:'networkidle'}); await page.waitForTimeout(1200);
const hrefs=await page.evaluate(()=>[...document.querySelectorAll('a[href]')].map(a=>a.getAttribute('href')));
ok(hrefs.includes('#/vie-scolaire'),'« Vie scolaire » est atteignable depuis l’accueil');
await page.goto(BASE+'/#/vie-scolaire',{waitUntil:'networkidle'}); await page.waitForTimeout(900);
const vs=await page.locator('body').innerText();
ok(vs.includes('Registre d’appel')&&vs.includes('Conseil de classe'),'le module liste ses 8 sous-modules');
ok(errs.length===0,`aucune erreur JavaScript (${errs.length}) ${errs[0]||''}`);

console.log(`\n════════════════════════════════════\nE2E v52 : ${pass} réussis, ${fail} échoués`);
await browser.close();
process.exit(fail?1:0);
