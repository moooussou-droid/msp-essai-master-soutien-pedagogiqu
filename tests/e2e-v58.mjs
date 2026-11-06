/**
 * E2E v58 — Guide de l'utilisateur, correctif des effectifs, mise à jour sans perte.
 */
import { chromium } from 'playwright';
const BASE='http://localhost:5173', CID='classe-v58';
let pass=0,fail=0;
const ok=(c,n)=>{c?(pass++,console.log('  ✅ '+n)):(fail++,console.log('  ❌ '+n));};
const browser=await chromium.launch();

async function ctxPro(extra){
  const c=await browser.newContext({viewport:{width:412,height:915},acceptDownloads:true});
  await c.addInitScript((ex)=>{
    localStorage.setItem('msp_activation',JSON.stringify({activated:true,code:'285791',
      name:'MOISE OUSSOU',activatedAt:Date.now(),expiresAt:Date.now()+3e10,plan:'pro'}));
    localStorage.setItem('msp_profile',JSON.stringify({teacherName:'MOISE OUSSOU',schoolName:'EPP NIMBO'}));
    if(ex) localStorage.setItem('msp_admin_dashboard_session','owner');
    const g=localStorage.getItem;
    localStorage.getItem=function(k){return /msp_guide_hidden_/.test(k)?'true':g.call(this,k);};
  },extra);
  return c;
}
const txt=async p=>(await p.locator('body').innerText());

console.log('\n1. CORRECTIF — le relevé d’effectifs ne s’écrase plus');
{
  const c=await ctxPro(); const p=await c.newPage();
  p.on('dialog',d=>d.accept());
  await p.goto(BASE+'/#/cantine/effectifs',{waitUntil:'networkidle'}); await p.waitForTimeout(1500);
  // Relevé 1 : 14 septembre
  await p.getByTestId('champ-date-effectif').fill('2026-09-14');
  await p.waitForTimeout(600);
  const champs=p.locator('input[type="number"]');
  await champs.nth(0).fill('10'); await champs.nth(1).fill('12');
  await p.locator('button').filter({hasText:/Enregistrer/i}).first().click();
  await p.waitForTimeout(900);
  // Relevé 2 : 21 septembre
  await p.getByTestId('champ-date-effectif').fill('2026-09-21');
  await p.waitForTimeout(800);
  await champs.nth(0).fill('15'); await champs.nth(1).fill('18');
  await p.locator('button').filter({hasText:/Enregistrer/i}).first().click();
  await p.waitForTimeout(900);
  const base=await p.evaluate(()=>JSON.parse(localStorage.getItem('msp_canteen_enrollment')||'[]')
    .map(s=>({date:s.date,g:s.counts[0].boys,f:s.counts[0].girls})));
  console.log('     en base :',JSON.stringify(base));
  ok(base.length===2,`les DEUX relevés coexistent (${base.length})`);
  ok(base.some(b=>b.date==='2026-09-14'&&b.g===10),'le relevé du 14 est intact (10 garçons)');
  ok(base.some(b=>b.date==='2026-09-21'&&b.g===15),'le relevé du 21 est enregistré (15 garçons)');
  await c.close();
}

console.log('\n2. Le module « Guide de l’utilisateur »');
{
  const c=await ctxPro(); const p=await c.newPage();
  await p.goto(BASE+'/#/guide',{waitUntil:'networkidle'}); await p.waitForTimeout(1200);
  const t=await txt(p);
  ok(t.includes('guide de l’utilisateur')||t.includes('Le guide'),'le module s’ouvre');
  ok(t.includes('manuel de l’abonné'),'sous-module « Le manuel de l’abonné » listé');
  ok(t.includes('Tutoriels Master Soutien'),'sous-module « Tutoriels » listé');
  // atteignable depuis l'accueil
  await p.goto(BASE+'/#/',{waitUntil:'networkidle'}); await p.waitForTimeout(1300);
  const hrefs=await p.evaluate(()=>[...document.querySelectorAll('a[href]')].map(a=>a.getAttribute('href')));
  ok(hrefs.includes('#/guide'),'« Guide » est présent sur l’accueil');
  await c.close();
}

console.log('\n3. Le manuel de l’abonné');
{
  const c=await ctxPro(); const p=await c.newPage();
  await p.goto(BASE+'/#/guide/manuel',{waitUntil:'networkidle'}); await p.waitForTimeout(1200);
  ok(await p.getByTestId('chapitres-manuel').count()>0,'les chapitres sont listés');
  await p.getByTestId('chapitre-ch2').click(); await p.waitForTimeout(500);
  const t=await txt(p);
  ok(t.includes('Saisir les notes'),'le chapitre déplié montre ses fiches');
  ok(t.includes('Absent n’est pas zéro'),'les avertissements du manuel sont présents');
  await p.getByTestId('recherche-manuel').fill('educmaster'); await p.waitForTimeout(600);
  ok((await txt(p)).includes('Export EducMaster'),'la recherche trouve la fonction');
  // v60 : le manuel ne doit PLUS etre telechargeable (demande de l'editeur).
  ok(await p.getByTestId('btn-pdf-manuel').count()===0,'aucun bouton de téléchargement PDF');
  ok((await txt(p)).includes('se consulte dans l’application'),
     'la mention de consultation sur place est affichée');
  await c.close();
}

console.log('\n4. Les tutoriels — publication par l’administration');
{
  const c=await ctxPro(true); const p=await c.newPage();
  p.on('dialog',d=>d.accept());
  await p.goto(BASE+'/#/guide/tutoriels',{waitUntil:'networkidle'}); await p.waitForTimeout(1200);
  ok(await p.getByTestId('espace-admin-tutoriels').count()>0,'l’espace d’administration est visible');
  ok(await p.getByTestId('aucun-tutoriel').count()>0,'message clair quand le catalogue est vide');
  await p.getByTestId('btn-ajouter-tutoriel').click(); await p.waitForTimeout(500);
  await p.getByTestId('champ-lien-youtube').fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10s');
  await p.getByTestId('champ-titre-tutoriel').fill('Saisir les notes');
  await p.getByTestId('champ-rubrique').selectOption('La classe au quotidien');
  await p.getByTestId('btn-enregistrer-tutoriel').click(); await p.waitForTimeout(900);
  ok((await txt(p)).includes('Saisir les notes'),'le tutoriel apparaît dans le catalogue');
  const vid=await p.evaluate(()=>JSON.parse(localStorage.getItem('msp_tutorials')||'[]')[0]?.videoId);
  ok(vid==='dQw4w9WgXcQ',`l’identifiant est extrait du lien (${vid})`);
  // lecture integree
  await p.locator('[data-testid^="tutoriel-"]').first().click(); await p.waitForTimeout(900);
  ok(await p.getByTestId('lecteur-video').count()>0,'le lecteur s’ouvre dans l’application');
  const src=await p.getByTestId('iframe-tutoriel').getAttribute('src');
  ok(src.includes('youtube-nocookie.com'),'lecture en mode confidentialité renforcée');
  ok(src.includes('rel=0'),'aucune suggestion vers d’autres chaînes');
  ok(!(await txt(p)).toLowerCase().includes('regarder sur youtube'),'aucun renvoi vers YouTube');
  await c.close();
}

console.log('\n5. Un enseignant ne peut pas modifier le catalogue');
{
  const c=await ctxPro(); const p=await c.newPage();
  await p.addInitScript(()=>{
    localStorage.setItem('msp_tutorials',JSON.stringify([
      {id:'t1',title:'Publié',videoId:'dQw4w9WgXcQ',category:'Premiers pas',published:true,createdAt:1,updatedAt:1},
      {id:'t2',title:'Brouillon interne',videoId:'aaaaaaaaaaa',category:'Premiers pas',published:false,createdAt:1,updatedAt:1}]));
  });
  await p.goto(BASE+'/#/guide/tutoriels',{waitUntil:'networkidle'}); await p.waitForTimeout(1200);
  ok(await p.getByTestId('espace-admin-tutoriels').count()===0,'pas d’espace d’administration pour l’enseignant');
  const t=await txt(p);
  ok(t.includes('Publié'),'les tutoriels publiés sont visibles');
  ok(!t.includes('Brouillon interne'),'les brouillons restent invisibles');
  await c.close();
}

console.log('\n6. MISE À JOUR — l’abonnement et les données sont conservés');
{
  const c=await ctxPro(); const p=await c.newPage();
  // Un abonné de l'ancienne version, avec ses donnees
  await p.addInitScript(()=>{
    localStorage.setItem('msp_attendance_records',JSON.stringify([{id:'a1',classId:'x',date:'2026-09-14',entries:[]}]));
    localStorage.setItem('msp_cahier_journal',JSON.stringify([{id:'j1',date:'2026-09-14',className:'CM2',sessions:[],updatedAt:1}]));
  });
  await p.goto(BASE+'/#/',{waitUntil:'networkidle'}); await p.waitForTimeout(1400);
  const etat=await p.evaluate(()=>({
    plan:JSON.parse(localStorage.getItem('msp_activation')||'{}').plan,
    nom:JSON.parse(localStorage.getItem('msp_activation')||'{}').name,
    presences:JSON.parse(localStorage.getItem('msp_attendance_records')||'[]').length,
    journal:JSON.parse(localStorage.getItem('msp_cahier_journal')||'[]').length,
  }));
  ok(etat.plan==='pro','l’abonnement Pro est conservé après mise à jour');
  ok(etat.nom==='MOISE OUSSOU','le titulaire du code est conservé');
  ok(etat.presences===1,'les présences sont conservées');
  ok(etat.journal===1,'le cahier journal est conservé');
  // Les modules Pro restent ouverts
  await p.goto(BASE+'/#/vie-scolaire',{waitUntil:'domcontentloaded'}); await p.waitForTimeout(800);
  ok(!(await txt(p)).includes('Fonction non incluse'),'les modules Pro restent accessibles');
  await c.close();
}

console.log(`\n════════════════════════════════════\nE2E v58 : ${pass} réussis, ${fail} échoués`);
await browser.close();
process.exit(fail?1:0);
