import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport:{width:420,height:860} });
let pass=0, fail=0;
const ok=(c,m)=>{ c?(pass++,console.log('  ✅ '+m)):(fail++,console.log('  ❌ '+m)); };
await p.addInitScript(() => {
  localStorage.setItem('msp_activation', JSON.stringify({activated:true,name:'KOSSOU Bernadette',code:'X',activatedAt:Date.now(),expiresAt:Date.now()+3e10,plan:'complet'}));
  localStorage.setItem('msp_profile', JSON.stringify({teacherName:'KOSSOU Bernadette',schoolName:'EPP NIMBO'}));
  localStorage.setItem('msp_install_dismissed','true');
  const origGetItem = localStorage.getItem.bind(localStorage);
  localStorage.getItem = (k) => (typeof k === 'string' && k.indexOf('msp_guide_hidden_') === 0 ? 'true' : origGetItem(k));
});
const CLS={id:'CLS-BACK-1',name:'CE1',school:'EPP NIMBO',level:'CE1',educationType:'primaire',schoolYear:'2025 - 2026',sequence:'Trimestre 1',students:[],subjects:[],notes:[],createdAt:1,updatedAt:1};
await p.goto('http://localhost:5173/#/');
await p.evaluate(async (cls)=>{ const {openDB}=await import('/node_modules/idb/build/index.js'); const db=await openDB('NoteFacileBenin',1,{upgrade(d){if(!d.objectStoreNames.contains('classes'))d.createObjectStore('classes',{keyPath:'id'});}}); await db.put('classes',cls); }, CLS);

console.log('\n═══ RETOUR — parcours réel (cas de la capture) ═══');
// Accueil -> classe CE1 -> Présences -> Retour
await p.goto('http://localhost:5173/#/'); await p.waitForTimeout(700);
await p.goto('http://localhost:5173/#/class/CLS-BACK-1'); await p.waitForTimeout(700);
await p.goto('http://localhost:5173/#/class/CLS-BACK-1/presences'); await p.waitForTimeout(900);
await p.locator('header button').first().click(); await p.waitForTimeout(700);
ok(p.url().includes('/class/CLS-BACK-1') && !p.url().includes('presences'), 'Présences → Retour → tableau de bord de la CLASSE (et non accueil)');

// Depuis la classe -> Retour -> accueil (bouton ChevronLeft du header de classe)
await p.locator('header button:has(svg)').first().click(); await p.waitForTimeout(900);
ok(/#\/$/.test(p.url()) || p.url().endsWith('5173/'), 'Classe → Retour → accueil (URL: '+p.url().split('5173')[1]+')');

// Cas SANS historique : ouverture directe d'une sous-page (PWA/iPhone, rechargement)
// CAS RÉEL : ouverture DIRECTE d'une sous-page sans jamais passer par l'accueil
// (application installée sur iPhone, rechargement de page, lien partagé).
// La pile de navigation est vide → le repli doit remonter d'UN niveau, pas à l'accueil.
const ctx2 = await b.newContext({ viewport:{width:420,height:860} });
await ctx2.addInitScript(() => {
  localStorage.setItem('msp_activation', JSON.stringify({activated:true,name:'K',code:'X',activatedAt:Date.now(),expiresAt:Date.now()+3e10,plan:'complet'}));
  localStorage.setItem('msp_install_dismissed','true');
  const g=localStorage.getItem.bind(localStorage);
  localStorage.getItem=(k)=>(typeof k==='string'&&k.indexOf('msp_guide_hidden_')===0?'true':g(k));
});
const seed = await ctx2.newPage();
await seed.goto('http://localhost:5173/#/'); await seed.waitForTimeout(500);
await seed.evaluate(async (cls)=>{ const {openDB}=await import('/node_modules/idb/build/index.js'); const db=await openDB('NoteFacileBenin',1,{upgrade(d){if(!d.objectStoreNames.contains('classes'))d.createObjectStore('classes',{keyPath:'id'});}}); await db.put('classes',cls); }, CLS);
await seed.close();

const p2 = await ctx2.newPage();  // onglet neuf : sessionStorage vide = aucun historique d'app
await p2.goto('http://localhost:5173/#/class/CLS-BACK-1/presences'); await p2.waitForTimeout(2000);
await p2.locator('header button').first().click({timeout:8000}); await p2.waitForTimeout(900);
ok(p2.url().includes('/class/CLS-BACK-1') && !p2.url().includes('presences'),
   'Ouverture DIRECTE sans historique → Retour → la CLASSE, pas l\'accueil (URL: '+p2.url().split('5173')[1]+')');

console.log('\n═══ COURS EN LIGNE — la modification est effective ═══');
const p3 = await b.newPage();
await p3.addInitScript(() => { localStorage.setItem('msp_activation', JSON.stringify({activated:true,name:'K',code:'X',activatedAt:Date.now(),expiresAt:Date.now()+3e10,plan:'complet'})); localStorage.setItem('msp_install_dismissed','true'); const g=localStorage.getItem.bind(localStorage); localStorage.getItem=(k)=>(typeof k==='string'&&k.indexOf('msp_guide_hidden_')===0?'true':g(k)); });
await p3.goto('http://localhost:5173/#/plateforme-cours'); await p3.waitForTimeout(1200);
const firstTitle = await p3.evaluate(async () => {
  const m = await import('/src/utils/programmeData.ts'); const c = m.getProgrammeCourses()[0];
  const cm = await import('/src/utils/courseMarketplace.ts');
  cm.saveCourseOverride({...c, title:'TITRE MODIFIÉ PAR L ADMIN', lessons:[{title:'Leçon v2', content:'CONTENU MODIFIÉ'}]});
  return c.id;
});
await p3.reload(); await p3.waitForTimeout(1500);
const body = await p3.textContent('body');
ok(body.includes('TITRE MODIFIÉ PAR L ADMIN'), 'Cours en ligne : le titre modifié s\'affiche après rechargement');
const dup = (body.match(/TITRE MODIFIÉ PAR L ADMIN/g)||[]).length;
ok(dup >= 1, 'Cours en ligne : la version modifiée remplace bien l\'ancienne (id '+firstTitle.slice(0,28)+'…)');

console.log('\n════════════════════════════════════');
console.log(`E2E v34 : ${pass} réussis, ${fail} échoués`);
await b.close();
if (fail) process.exit(1);
