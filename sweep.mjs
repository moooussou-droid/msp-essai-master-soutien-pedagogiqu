/* Balayage de TOUTES les routes : detection des ecrans vides. */
import { chromium } from 'playwright';
import { readFileSync } from 'fs';

const BASE='http://localhost:5173';
const src=readFileSync('src/App.tsx','utf8');
// routes statiques (sans parametre :id)
const routes=[...new Set([...src.matchAll(/path="(\/[a-z0-9-]*)"/g)].map(m=>m[1]))].filter(r=>!r.includes(':'));
// + routes declarees comme modules
const mods=readFileSync('src/utils/appModules.ts','utf8');
const modRoutes=[...new Set([...mods.matchAll(/path: '(\/[a-z0-9-]+)'/g)].map(m=>m[1]))];
const all=[...new Set([...routes,...modRoutes])].sort();

const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:412,height:915}});
await ctx.addInitScript(()=>{
  localStorage.setItem('msp_activation',JSON.stringify({activated:true,code:'MSP-Catalyste@@007-2026',name:'MOISE OUSSOU',activatedAt:Date.now(),plan:'complet'}));
  localStorage.setItem('msp_profile',JSON.stringify({teacherName:'MOISE OUSSOU',schoolName:'EPP NIMBO'}));
  localStorage.setItem('msp_admin_dashboard_session','owner');
  const g=localStorage.getItem;
  localStorage.getItem=function(k){return /msp_guide_hidden_/.test(k)?'true':g.call(this,k);};
});
const p=await ctx.newPage();
const vides=[], erreurs=[];
for(const r of all){
  const errs=[];
  const h=e=>errs.push(String(e)); p.on('pageerror',h);
  try{
    await p.goto(BASE+'/#'+r,{waitUntil:'domcontentloaded'});
    await p.waitForTimeout(700);
    const txt=(await p.locator('body').innerText()).trim();
    // on retire le bandeau de licence, toujours present
    const utile=txt.replace(/LICENCE[^\n]*/g,'').trim();
    if(utile.length<40) vides.push({r,len:utile.length,txt:utile.slice(0,60)});
    if(errs.length) erreurs.push({r,err:errs[0].slice(0,110)});
  }catch(e){ erreurs.push({r,err:String(e).slice(0,110)}); }
  p.off('pageerror',h);
}
console.log(`ROUTES TESTEES : ${all.length}\n`);
console.log('=== ECRANS VIDES ===');
vides.length?vides.forEach(v=>console.log(`  ❌ ${v.r}  (${v.len} car.) "${v.txt}"`)):console.log('  aucun');
console.log('\n=== ERREURS JS ===');
erreurs.length?erreurs.forEach(e=>console.log(`  ⚠️  ${e.r} → ${e.err}`)):console.log('  aucune');
await b.close();
