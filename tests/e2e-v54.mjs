/**
 * E2E v54 — les trois forfaits sont proposés au choix sur l'accueil.
 */
import { chromium } from 'playwright';

const BASE='http://localhost:5173';
let pass=0,fail=0;
const ok=(c,n)=>{c?(pass++,console.log('  ✅ '+n)):(fail++,console.log('  ❌ '+n));};

const browser=await chromium.launch();
const ctx=await browser.newContext({viewport:{width:412,height:915}});
const page=await ctx.newPage();
const errs=[]; page.on('pageerror',e=>errs.push(String(e).slice(0,110)));

// On capture l'ouverture de WhatsApp sans quitter la page.
let waUrl='';
await ctx.exposeFunction('__cap',(u)=>{waUrl=u;});
await page.addInitScript(()=>{ window.open=(u)=>{ window.__cap(u); return null; }; });

console.log('\n1. Les trois forfaits sont présentés dès l’accueil');
await page.goto(BASE+'/',{waitUntil:'networkidle'});
await page.waitForTimeout(1300);
ok(await page.getByTestId('forfaits-accueil').count()>0,'le bloc des forfaits est présent');
for (const id of ['essentiel','complet','pro'])
  ok(await page.getByTestId('forfait-'+id).count()>0,`forfait « ${id} » affiché`);
const txt=await page.locator('body').innerText();
for (const prix of ['999','1500','2500'])
  ok(txt.includes(prix),`le tarif ${prix} FCFA est annoncé`);
ok((await page.getByTestId('bandeau-tarifs').innerText()).includes('2500'),
   'le bandeau récapitulatif inclut les 3 tarifs');

console.log('\n2. L’utilisateur peut choisir son forfait');
for (const id of ['essentiel','pro','complet']) {
  await page.getByTestId('forfait-'+id).click();
  await page.waitForTimeout(350);
  const marque=await page.getByTestId('forfait-choisi-'+id).count();
  const total=await page.locator('[data-testid^="forfait-choisi-"]').count();
  ok(marque===1 && total===1,`« ${id} » devient le seul forfait sélectionné`);
}
await page.getByTestId('forfait-pro').click();
await page.waitForTimeout(350);
ok((await page.getByTestId('recap-forfait').innerText()).includes('2500'),
   'le récapitulatif reprend le forfait choisi');

console.log('\n3. Le choix est transmis à l’administrateur');
const contact=page.locator('button').filter({hasText:/Obtenir|WhatsApp|Demander/i}).first();
await contact.click();
await page.waitForTimeout(700);
const msg=decodeURIComponent(waUrl||'');
ok(msg.includes('Pro'),'la demande WhatsApp mentionne le forfait Pro');
ok(msg.includes('2500'),'la demande WhatsApp annonce le bon tarif');
ok(!msg.includes('Essentiel (999'),'la demande ne liste plus toutes les formules en vrac');

console.log('\n4. La formule est reconnue à la saisie du code');
const CODES=[['931568','ESSENTIEL'],['132852','COMPLET'],['285791','PRO']];
for (const [code,attendu] of CODES) {
  const champ=page.locator('input[inputmode="numeric"]').first();
  await champ.fill('');
  await champ.type(code,{delay:30});
  await page.waitForTimeout(500);
  const t=await page.getByTestId('formule-detectee').innerText().catch(()=>'');
  ok(t.includes(attendu),`code ${code} → formule ${attendu} détectée`);
}

console.log('\n5. Intégrité');
ok(errs.length===0,`aucune erreur JavaScript (${errs.length}) ${errs[0]||''}`);
// La source unique : aucune liste de forfaits recopiee dans l'accueil.
const fs=await import('fs');
const src=fs.readFileSync('src/components/AccessGate.tsx','utf8');
ok(src.includes('PLAN_CATALOG'),'l’accueil lit le catalogue officiel des forfaits');
ok(!/price: '999 FCFA/.test(src),'aucun tarif n’est recopié en dur dans l’accueil');

console.log(`\n════════════════════════════════════\nE2E v54 : ${pass} réussis, ${fail} échoués`);
await browser.close();
process.exit(fail?1:0);
