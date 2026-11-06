/** E2E v35 — cloisonnement réel des rôles dans l'Espace Administrateur. */
import { chromium } from 'playwright';
const BASE='http://localhost:5173';
const b = await chromium.launch();
let pass=0, fail=0;
const ok=(c,m)=>{ c?(pass++,console.log('  ✅ '+m)):(fail++,console.log('  ❌ '+m)); };

const TEAM = [
  { id:'owner', name:'Administrateur principal', role:'Super Administrateur', phone:'+229', email:'', permissions:[], active:true, createdAt:1 },
  { id:'m-tech', name:'AGBO Technique', role:'Gestionnaire Technique', phone:'', email:'', permissions:[], active:true, createdAt:1, accessCode:'111111' },
  { id:'m-res',  name:'DOSSOU Ressources', role:'Responsable Ressources', phone:'', email:'', permissions:[], active:true, createdAt:1, accessCode:'222222' },
  { id:'m-sup',  name:'KOTO Support', role:'Support', phone:'', email:'', permissions:[], active:true, createdAt:1, accessCode:'333333' },
];

async function openAs(sessionValue) {
  const ctx = await b.newContext({ viewport:{width:1100,height:900} });
  await ctx.addInitScript(([team, sess]) => {
    localStorage.setItem('msp_admin_team', JSON.stringify(team));
    localStorage.setItem('msp_admin_dashboard_session', sess);
    localStorage.setItem('msp_install_dismissed','true');
    const g=localStorage.getItem.bind(localStorage);
    localStorage.getItem=(k)=>(typeof k==='string'&&k.indexOf('msp_guide_hidden_')===0?'true':g(k));
  }, [TEAM, sessionValue]);
  const p = await ctx.newPage();
  await p.goto(BASE+'/#/admin-dashboard'); await p.waitForTimeout(1800);
  const tabs = (await p.textContent('body')) || '';
  return { p, ctx, tabs };
}

console.log('\n═══ E2E v35 — Cloisonnement des rôles (après RECHARGEMENT de session) ═══');

// Gestionnaire Technique
let r = await openAs('member:m-tech');
ok(!r.tabs.includes('Équipe'), 'Gestionnaire Technique : onglet « Équipe » MASQUÉ (nomination réservée)');
ok(!r.tabs.includes('Accès'),  'Gestionnaire Technique : onglet « Accès » MASQUÉ (codes réservés)');
ok(r.tabs.includes('Technique'), 'Gestionnaire Technique : onglet « Technique » disponible');
ok(r.tabs.includes('Gestionnaire Technique'), 'Gestionnaire Technique : rôle correctement reconnu (faille corrigée)');
await r.ctx.close();

// Responsable Ressources
r = await openAs('member:m-res');
ok(!r.tabs.includes('Équipe') && !r.tabs.includes('Accès'), 'Responsable Ressources : Équipe et Accès MASQUÉS');
ok(r.tabs.includes('Ressources'), 'Responsable Ressources : onglet « Ressources » disponible');
ok(!r.tabs.includes('Technique'), 'Responsable Ressources : onglet « Technique » masqué');
await r.ctx.close();

// Support
r = await openAs('member:m-sup');
ok(!r.tabs.includes('Équipe') && !r.tabs.includes('Accès'), 'Support : Équipe et Accès MASQUÉS');
ok(!r.tabs.includes('Technique'), 'Support : onglet « Technique » masqué');
ok(r.tabs.includes('Gouvernance'), 'Support : accès à la Gouvernance (lecture des règles)');
await r.ctx.close();

// Super Administrateur
r = await openAs('owner');
ok(r.tabs.includes('Équipe') && r.tabs.includes('Accès'), 'Super Administrateur : Équipe ET Accès disponibles');
ok(r.tabs.includes('Technique'), 'Super Administrateur : accès à la maintenance technique');
await r.ctx.close();

console.log('\n════════════════════════════════════');
console.log(`E2E v35 : ${pass} réussis, ${fail} échoués`);
await b.close();
if (fail) process.exit(1);
