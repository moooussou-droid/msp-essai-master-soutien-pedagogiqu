/** E2E v60 — verrou d'école, affichage de l'école, manuel non téléchargeable. */
import { chromium } from 'playwright';
const BASE='http://localhost:5173';
let pass=0,fail=0;
const ok=(c,n)=>{c?(pass++,console.log('  ✅ '+n)):(fail++,console.log('  ❌ '+n));};
const browser=await chromium.launch();
const txt=async p=>(await p.locator('body').innerText());

async function ctx(bind){
  const c=await browser.newContext({viewport:{width:412,height:915},acceptDownloads:true});
  await c.addInitScript((b)=>{
    localStorage.setItem('msp_activation',JSON.stringify({activated:true,code:'285791',
      name:'MOISE OUSSOU',activatedAt:Date.now(),expiresAt:Date.now()+3e10,plan:'pro'}));
    localStorage.setItem('msp_profile',JSON.stringify({teacherName:'MOISE OUSSOU',schoolName:b||''}));
    if(b) localStorage.setItem('msp_school_binding',JSON.stringify({
      schoolName:b,boundCode:'285791',boundAt:Date.now(),transferAllowed:false,
      transferCount:0,history:[{schoolName:b,since:Date.now()}]}));
    const g=localStorage.getItem;
    localStorage.getItem=function(k){return /msp_guide_hidden_/.test(k)?'true':g.call(this,k);};
  },bind);
  return c;
}

console.log('\n1. L’école s’affiche en permanence à l’écran');
{
  const c=await ctx('EPP NIMBO'); const p=await c.newPage();
  await p.goto(BASE+'/#/',{waitUntil:'networkidle'}); await p.waitForTimeout(1500);
  ok(await p.getByTestId('licence-ecole').count()>0,'le bandeau affiche l’école');
  ok((await p.getByTestId('licence-ecole').innerText()).includes('EPP NIMBO'),
     'l’école de rattachement est la bonne');
  ok((await p.getByTestId('bandeau-licence').innerText()).includes('MOISE OUSSOU'),
     'le titulaire reste affiché à côté');
  // visible aussi sur les autres ecrans
  await p.goto(BASE+'/#/vie-scolaire',{waitUntil:'domcontentloaded'}); await p.waitForTimeout(800);
  ok((await p.getByTestId('licence-ecole').innerText()).includes('EPP NIMBO'),
     'l’école reste affichée sur les autres écrans');
  await c.close();
}

console.log('\n2. Le champ École est VERROUILLÉ à la création de classe');
{
  const c=await ctx('EPP NIMBO'); const p=await c.newPage();
  await p.goto(BASE+'/#/class/new',{waitUntil:'networkidle'}); await p.waitForTimeout(1400);
  const champ=p.getByTestId('champ-ecole-classe');
  ok(await champ.count()>0,'le champ École est présent');
  ok(await champ.inputValue()==='EPP NIMBO','il est pré-rempli avec l’école de rattachement');
  ok(await champ.getAttribute('readonly')!==null,'il est en lecture seule');
  // Tentative de contournement par la saisie
  await champ.fill('AUTRE ECOLE').catch(()=>{});
  await p.waitForTimeout(400);
  ok(await champ.inputValue()==='EPP NIMBO','impossible de saisir une autre école');
  ok((await txt(p)).includes('rattaché'),'un message explique le verrouillage');
  await c.close();
}

console.log('\n3. La classe est enregistrée sous la BONNE école');
{
  const c=await ctx('EPP NIMBO'); const p=await c.newPage();
  p.on('dialog',d=>d.accept());
  await p.goto(BASE+'/#/class/new',{waitUntil:'networkidle'}); await p.waitForTimeout(1400);
  await p.locator('input[type="text"]').first().fill('CM2 A');
  // Forcer une autre ecole par le DOM : le contournement doit echouer
  await p.evaluate(()=>{
    const el=document.querySelector('[data-testid="champ-ecole-classe"]');
    if(el){ const set=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;
      set.call(el,'ECOLE PIRATE'); el.dispatchEvent(new Event('input',{bubbles:true})); }
  });
  await p.waitForTimeout(400);
  const btn=p.locator('button').filter({hasText:/Créer|Enregistrer/i}).last();
  if(await btn.count()){ await btn.click(); await p.waitForTimeout(1600); }
  const ecoles=await p.evaluate(async()=>{
    const {openDB}=await import('/node_modules/.vite/deps/idb.js').catch(()=>import('idb'));
    const db=await openDB('NoteFacileBenin',undefined);
    return (await db.getAll('classes')).map(c=>c.school);
  });
  console.log('     écoles en base :',JSON.stringify(ecoles));
  ok(ecoles.length>0 && ecoles.every(e=>e==='EPP NIMBO'),
     'même en forçant le DOM, la classe reste sous EPP NIMBO');
  await c.close();
}

console.log('\n4. Premier usage : la saisie fixe l’établissement');
{
  const c=await ctx(null); const p=await c.newPage();
  await p.goto(BASE+'/#/class/new',{waitUntil:'networkidle'}); await p.waitForTimeout(1400);
  const champ=p.getByTestId('champ-ecole-classe');
  ok(await champ.getAttribute('readonly')===null,'sans rattachement, le champ est libre');
  ok((await txt(p)).includes('fixera l’établissement'),'un avertissement annonce la conséquence');
  await c.close();
}

console.log('\n5. Le manuel n’est PAS téléchargeable');
{
  const c=await ctx('EPP NIMBO'); const p=await c.newPage();
  await p.goto(BASE+'/#/guide/manuel',{waitUntil:'networkidle'}); await p.waitForTimeout(1300);
  ok(await p.getByTestId('btn-pdf-manuel').count()===0,'aucun bouton PDF');
  const t=await txt(p);
  /*
   * On cherche un BOUTON, pas le mot : le contenu du manuel décrit
   * légitimement l'impression d'AUTRES écrans (« Exportez en PDF ou
   * imprimez »). Chercher le mot dans toute la page serait un faux positif.
   */
  const boutons=await p.evaluate(()=>[...document.querySelectorAll('button')].map(b=>b.innerText.trim()));
  ok(!boutons.some(b=>/imprimer|pdf|télécharger/i.test(b)),
     `aucun bouton d’export ni d’impression (${boutons.length} boutons vérifiés)`);
  ok(t.includes('se consulte dans l’application'),'la mention de consultation est affichée');
  ok(t.includes('sans connexion'),'la consultation hors ligne reste annoncée');
  // le contenu reste complet
  await p.getByTestId('chapitre-ch13').click().catch(()=>{});
  await p.waitForTimeout(600);
  ok((await txt(p)).includes('Tutoriels'),'le contenu du manuel reste accessible');
  await c.close();
}

console.log(`\n════════════════════════════════════\nE2E v60 : ${pass} réussis, ${fail} échoués`);
await browser.close();
process.exit(fail?1:0);
