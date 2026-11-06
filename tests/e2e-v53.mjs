/**
 * E2E v53 — abonnement Pro (2500 F) et impression universelle.
 */
import { chromium } from 'playwright';

const BASE='http://localhost:5173';
let pass=0,fail=0;
const ok=(c,n)=>{c?(pass++,console.log('  ✅ '+n)):(fail++,console.log('  ❌ '+n));};

const PRO='285791', COMPLET='132852', ESSENTIEL='931568';
const browser=await chromium.launch();

async function ctxWith(code, plan){
  const c=await browser.newContext({viewport:{width:412,height:915},acceptDownloads:true});
  await c.addInitScript(([code,plan])=>{
    localStorage.setItem('msp_activation',JSON.stringify({activated:true,code,name:'MOISE OUSSOU',
      activatedAt:Date.now(),expiresAt:Date.now()+3e10,plan}));
    localStorage.setItem('msp_profile',JSON.stringify({teacherName:'MOISE OUSSOU',schoolName:'EPP NIMBO'}));
    const g=localStorage.getItem;
    localStorage.getItem=function(k){return /msp_guide_hidden_/.test(k)?'true':g.call(this,k);};
  },[code,plan]);
  return c;
}
const PRO_ROUTES=['/registres','/cahier-journal','/registre-matricule','/vie-scolaire',
  '/registre-appel','/paiements','/livret-scolaire','/manuels-materiel','/emploi-du-temps',
  '/remediation','/sauvegarde','/conseil-classe','/outils','/chronometre','/calculatrice','/numeriser'];

console.log('\n1. Plan COMPLET (1500 F) : les 4 modules sont verrouillés');
{
  const c=await ctxWith(COMPLET,'complet'); const p=await c.newPage();
  let bloques=0;
  for(const r of PRO_ROUTES){
    await p.goto(BASE+'/#'+r,{waitUntil:'domcontentloaded'}); await p.waitForTimeout(500);
    if((await p.locator('body').innerText()).includes('Fonction non incluse')) bloques++;
  }
  ok(bloques===PRO_ROUTES.length,`les ${PRO_ROUTES.length} routes Pro sont bloquées (${bloques})`);
  await p.goto(BASE+'/#/paiements',{waitUntil:'domcontentloaded'}); await p.waitForTimeout(700);
  ok(await p.getByTestId('ecran-upgrade').count()>0,'l’écran de mise à niveau s’affiche');
  ok((await p.locator('body').innerText()).includes('2500'),'le prix 2500 FCFA est annoncé');
  ok((await p.getByTestId('module-bloque').innerText()).includes('Paiements'),'le module demandé est nommé');
  await c.close();
}

console.log('\n2. Plan COMPLET : AUCUN droit acquis n’est retiré');
{
  const c=await ctxWith(COMPLET,'complet'); const p=await c.newPage();
  const ANCIEN=['/','/cantine','/comptabilite','/bibliotheque','/encyclopedie','/dictionnaire',
    '/fiches-pedagogiques','/calendrier-scolaire','/mes-images','/espace-partenariat',
    '/enrolement','/orientation','/education-vie','/preparation-classe','/boite-outils',
    '/outils-enseignant','/horloge','/conditions','/class-statistics'];
  const perdus=[];
  for(const r of ANCIEN){
    await p.goto(BASE+'/#'+r,{waitUntil:'domcontentloaded'}); await p.waitForTimeout(450);
    if((await p.locator('body').innerText()).includes('Fonction non incluse')) perdus.push(r);
  }
  ok(perdus.length===0,`les ${ANCIEN.length} fonctions d’avant restent accessibles (perdues : ${perdus.join(', ')||'aucune'})`);
  await c.close();
}

console.log('\n3. Plan PRO (2500 F) : tout est ouvert');
{
  const c=await ctxWith(PRO,'pro'); const p=await c.newPage();
  const bloques=[];
  for(const r of PRO_ROUTES){
    await p.goto(BASE+'/#'+r,{waitUntil:'domcontentloaded'}); await p.waitForTimeout(500);
    const t=(await p.locator('body').innerText()).replace(/LICENCE[^\n]*/g,'').trim();
    if(t.includes('Fonction non incluse')||t.length<40) bloques.push(r);
  }
  ok(bloques.length===0,`les ${PRO_ROUTES.length} modules s’ouvrent (bloqués : ${bloques.join(', ')||'aucun'})`);
  await c.close();
}

console.log('\n4. L’espace parent reste PUBLIC (un parent n’est pas abonné)');
{
  const c=await browser.newContext({viewport:{width:412,height:915}});
  const p=await c.newPage();
  await p.goto(BASE+'/#/suivi-enfant',{waitUntil:'networkidle'}); await p.waitForTimeout(900);
  const t=await p.locator('body').innerText();
  ok(!t.includes('Fonction non incluse')&&!t.includes('Choisissez votre formule'),
     'l’espace parent s’ouvre sans abonnement ni code');
  await p.goto(BASE+'/#/suivi-enfant/codes',{waitUntil:'domcontentloaded'}); await p.waitForTimeout(700);
  ok(/ACCÈS MASTER|Choisissez votre formule|Fonction non incluse/.test(await p.locator('body').innerText()),
     'la génération des codes (enseignant) reste protégée');
  await c.close();
}

console.log('\n5. Plan ESSENTIEL : inchangé');
{
  const c=await ctxWith(ESSENTIEL,'essentiel'); const p=await c.newPage();
  await p.goto(BASE+'/#/enrolement-eleves',{waitUntil:'domcontentloaded'}); await p.waitForTimeout(700);
  ok(!(await p.locator('body').innerText()).includes('Fonction non incluse'),'l’enrôlement reste inclus');
  await p.goto(BASE+'/#/paiements',{waitUntil:'domcontentloaded'}); await p.waitForTimeout(700);
  ok((await p.locator('body').innerText()).includes('Fonction non incluse'),'les modules Pro restent bloqués');
  await c.close();
}

console.log('\n6. IMPRESSION — l’en-tête survit au passage sur papier');
{
  const c=await ctxWith(PRO,'pro'); const p=await c.newPage();
  const sansTitre=[];
  const ECRANS=['/registres','/cahier-journal','/registre-matricule','/registre-appel','/paiements',
    '/livret-scolaire','/manuels-materiel','/emploi-du-temps','/remediation','/conseil-classe',
    '/chronometre','/numeriser','/vie-scolaire'];
  for(const r of ECRANS){
    await p.goto(BASE+'/#'+r,{waitUntil:'domcontentloaded'}); await p.waitForTimeout(600);
    await p.emulateMedia({media:'print'}); await p.waitForTimeout(200);
    const i=await p.evaluate(()=>{
      const h=document.querySelector('header'); if(!h) return {v:false,t:''};
      const t=h.querySelector('h1');
      return {v:h.offsetHeight>0, t:t?t.textContent.trim():'',
              noir:t?getComputedStyle(t).color==='rgb(0, 0, 0)':false};
    });
    if(!i.v||!i.t||!i.noir) sansTitre.push(r);
    await p.emulateMedia({media:'screen'});
  }
  ok(sansTitre.length===0,`les ${ECRANS.length} en-têtes s’impriment avec leur titre en noir (manquants : ${sansTitre.join(', ')||'aucun'})`);
  await c.close();
}

console.log('\n7. IMPRESSION — le bouton apparait reellement avec le contenu');
{
  const c=await ctxWith(PRO,'pro'); const p=await c.newPage();
  p.on('dialog',d=>d.accept());

  // CHRONOMETRE : les boutons n'apparaissent qu'apres un tour enregistre.
  await p.goto(BASE+'/#/chronometre',{waitUntil:'networkidle'}); await p.waitForTimeout(900);
  await p.getByTestId('btn-demarrer-chrono').click();
  await p.waitForTimeout(800);
  await p.getByTestId('btn-top-arrivee').click();
  await p.waitForTimeout(600);
  const chronoOk=await p.getByTestId('btn-imprimer-chrono').count()>0;
  ok(chronoOk,'Chronomètre : le bouton Imprimer s’affiche à côté du PDF');
  if(chronoOk){
    ok(await p.getByTestId('btn-pdf-chrono').count()>0,'Chronomètre : le PDF reste disponible');
  }

  // Le dossier parent : bouton Imprimer cable dans le composant.
  const fs=await import('fs');
  const parent=fs.readFileSync('src/components/ParentSpaceScreen.tsx','utf8');
  ok(parent.includes('btn-imprimer-parent')&&parent.includes('window.print()'),
     'Espace parent : impression du dossier câblée');
  const scan=fs.readFileSync('src/components/ScannerScreen.tsx','utf8');
  ok(scan.includes('btn-imprimer-scan')&&scan.includes('window.print()'),
     'Numérisation : impression câblée');
  await c.close();
}

console.log(`\n════════════════════════════════════\nE2E v53 : ${pass} réussis, ${fail} échoués`);
await browser.close();
process.exit(fail?1:0);
