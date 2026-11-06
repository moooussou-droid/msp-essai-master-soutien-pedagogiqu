/**
 * E2E v55 — version d'essai gratuite de 10 heures (duree ramenee en v56).
 */
import { chromium } from 'playwright';

const BASE='http://localhost:5173';
const H=3600000;
let pass=0,fail=0;
const ok=(c,n)=>{c?(pass++,console.log('  ✅ '+n)):(fail++,console.log('  ❌ '+n));};
const browser=await chromium.launch();

/** Contexte neuf, avec possibilite de semer un essai deja commence. */
async function fresh(seed){
  const c=await browser.newContext({viewport:{width:412,height:915}});
  if(seed) await c.addInitScript((s)=>{
    localStorage.setItem('msp_trial',JSON.stringify(s));
    localStorage.setItem('msp_trial_used','1');
  },seed);
  return c;
}
const txt=async(p)=>(await p.locator('body').innerText());

console.log('\n1. Un prospect sans code voit l’offre d’essai');
{
  const c=await fresh(); const p=await c.newPage();
  await p.goto(BASE+'/',{waitUntil:'networkidle'}); await p.waitForTimeout(1200);
  ok(await p.getByTestId('bloc-essai').count()>0,'le bloc d’essai est proposé');
  const t=await txt(p);
  ok(t.includes('10 heures')||t.includes('10 h'),'la durée de 10 h est annoncée');
  ok(t.includes('Sans code'),'l’absence de code est annoncée');
  ok(await p.getByTestId('btn-demarrer-essai').count()>0,'le bouton de démarrage est présent');
  ok(t.includes('999')&&t.includes('2500'),'les forfaits payants restent visibles');
  await c.close();
}

console.log('\n2. L’essai ouvre l’application sans aucun code');
{
  const c=await fresh(); const p=await c.newPage();
  await p.goto(BASE+'/',{waitUntil:'networkidle'}); await p.waitForTimeout(1200);
  await p.getByTestId('btn-demarrer-essai').click();
  await p.waitForTimeout(1600);
  const t=await txt(p);
  ok(!t.includes('Choisissez votre formule'),'l’écran d’abonnement a disparu');
  ok(t.includes('Bienvenue')||t.includes('TABLEAU DE BORD'),'le tableau de bord s’affiche');
  ok(await p.getByTestId('bandeau-essai').count()>0,'le bandeau d’essai est visible');
  // Quelques secondes se sont ecoulees : on accepte 9 h 5x comme 10 h 00.
  const restant=await p.getByTestId('temps-restant-essai').innerText();
  ok(/^(10 h 00|9 h 5\d)$/.test(restant.trim()),`il reste bien ~10 h (${restant.trim()})`);
  // l'essai survit au rechargement
  await p.reload({waitUntil:'networkidle'}); await p.waitForTimeout(1300);
  ok(await p.getByTestId('bandeau-essai').count()>0,'l’essai survit au rechargement');
  await c.close();
}

console.log('\n3. Le périmètre de l’essai = formule Complet');
{
  const c=await fresh({startedAt:Date.now(),expiresAt:Date.now()+9*H,lastSeenAt:Date.now()});
  const p=await c.newPage();
  // Fonctions pedagogiques : ouvertes
  for(const r of ['/cantine','/comptabilite','/encyclopedie','/fiches-pedagogiques']){
    await p.goto(BASE+'/#'+r,{waitUntil:'domcontentloaded'}); await p.waitForTimeout(600);
    const t=(await txt(p)).replace(/VERSION D’ESSAI[^\n]*/g,'').replace(/LICENCE[^\n]*/g,'').trim();
    ok(!t.includes('Choisissez votre formule')&&t.length>40,`${r} est accessible pendant l’essai`);
  }
  // Modules Pro : fermes (l'essai doit donner envie, pas tout offrir)
  for(const r of ['/vie-scolaire','/paiements','/registres']){
    await p.goto(BASE+'/#'+r,{waitUntil:'domcontentloaded'}); await p.waitForTimeout(600);
    ok((await txt(p)).includes('Fonction non incluse'),`${r} (plan Pro) reste fermé pendant l’essai`);
  }
  await c.close();
}

console.log('\n4. À l’échéance, l’accès se coupe');
{
  // Essai demarre il y a 10 h 01 : expire.
  const now=Date.now();
  const c=await fresh({startedAt:now-10*H-60000,expiresAt:now-60000,lastSeenAt:now-2*H});
  const p=await c.newPage();
  await p.goto(BASE+'/#/',{waitUntil:'networkidle'}); await p.waitForTimeout(1300);
  const t=await txt(p);
  ok(t.includes('Choisissez votre formule'),'l’écran d’abonnement reprend la main');
  ok(await p.getByTestId('essai-termine').count()>0,'le message de fin d’essai s’affiche');
  ok(t.includes('données restent enregistrées')||t.includes('restent'),'les données sont annoncées conservées');
  ok(await p.getByTestId('btn-demarrer-essai').count()===0,'impossible de relancer l’essai');
  // Et les fonctions sont bien refermees
  await p.goto(BASE+'/#/cantine',{waitUntil:'domcontentloaded'}); await p.waitForTimeout(700);
  ok((await txt(p)).includes('Choisissez votre formule'),'les fonctions sont refermées');
  await c.close();
}

console.log('\n5. Reculer l’horloge ne prolonge pas l’essai');
{
  const now=Date.now();
  // lastSeenAt tres en avance : l'utilisateur a recule sa date
  const c=await fresh({startedAt:now-2*H,expiresAt:now+8*H,lastSeenAt:now+5*H});
  const p=await c.newPage();
  await p.goto(BASE+'/#/',{waitUntil:'networkidle'}); await p.waitForTimeout(1300);
  ok((await txt(p)).includes('Choisissez votre formule'),'le recul d’horloge termine l’essai');
  await c.close();
}

console.log('\n6. Un abonné n’est pas gêné par l’essai');
{
  const c=await browser.newContext({viewport:{width:412,height:915}});
  await c.addInitScript(()=>{
    localStorage.setItem('msp_activation',JSON.stringify({activated:true,code:'285791',
      name:'MOISE OUSSOU',activatedAt:Date.now(),expiresAt:Date.now()+3e10,plan:'pro'}));
    const g=localStorage.getItem;
    localStorage.getItem=function(k){return /msp_guide_hidden_/.test(k)?'true':g.call(this,k);};
  });
  const p=await c.newPage();
  await p.goto(BASE+'/#/',{waitUntil:'networkidle'}); await p.waitForTimeout(1300);
  ok(await p.getByTestId('bandeau-essai').count()===0,'aucun bandeau d’essai pour un abonné');
  await p.goto(BASE+'/#/vie-scolaire',{waitUntil:'domcontentloaded'}); await p.waitForTimeout(700);
  ok(!(await txt(p)).includes('Fonction non incluse'),'l’abonné Pro garde tous ses accès');
  await c.close();
}

console.log('\n7. Les données saisies pendant l’essai sont conservées');
{
  const fs=await import('fs');
  const db=fs.readFileSync('src/utils/database.ts','utf8');
  ok(db.includes("'msp_trial'"),'l’état de l’essai est inclus dans la sauvegarde');
  const vault=fs.readFileSync('src/utils/credentialsVault.ts','utf8');
  ok(vault.includes("'msp_trial_used'"),
     'le marqueur d’essai résiste à « Réinitialiser les données »');
}

console.log(`\n════════════════════════════════════\nE2E v55 : ${pass} réussis, ${fail} échoués`);
await browser.close();
process.exit(fail?1:0);
