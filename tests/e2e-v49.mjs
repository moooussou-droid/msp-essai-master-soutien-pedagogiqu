/** E2E v49 — Word dans l'administration, renommages, registres officiels. */
import { chromium } from 'playwright';
import { readFileSync, mkdtempSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import JSZip from 'jszip';

const BASE='http://localhost:5173';
let pass=0,fail=0;
const ok=(c,n)=>{c?(pass++,console.log('  ✅ '+n)):(fail++,console.log('  ❌ '+n));};

const browser=await chromium.launch();
const dlDir=mkdtempSync(join(tmpdir(),'msp49-'));
const ctx=await browser.newContext({viewport:{width:412,height:915},acceptDownloads:true});
await ctx.addInitScript(()=>{
  localStorage.setItem('msp_activation',JSON.stringify({activated:true,code:'MSP-Catalyste@@007-2026',name:'MOISE OUSSOU',activatedAt:Date.now(),expiresAt:Date.now()+3e10,plan:'pro'}));
  localStorage.setItem('msp_profile',JSON.stringify({teacherName:'MOISE OUSSOU',schoolName:'EPP NIMBO'}));
  const g=localStorage.getItem;
  localStorage.getItem=function(k){return /msp_guide_hidden_/.test(k)?'true':g.call(this,k);};
});
const page=await ctx.newPage();
page.on('dialog',d=>d.accept());

console.log('\n1. Renommages demandés');
await page.goto(BASE+'/#/',{waitUntil:'networkidle'});
await page.waitForTimeout(900);
const home=await page.locator('body').innerText();
ok(home.includes('Encyclopédie MSP'),'l’accueil affiche « Encyclopédie MSP »');
ok(home.includes('Dictionnaire MSP'),'l’accueil affiche « Dictionnaire MSP »');
await page.goto(BASE+'/#/encyclopedie',{waitUntil:'networkidle'});
await page.waitForTimeout(800);
const enc=await page.locator('body').innerText();
ok(enc.includes('Encyclopédie MSP'),'l’écran Encyclopédie est renommé');
ok(enc.includes('Dictionnaire MSP'),'la carte Dictionnaire est renommée');

console.log('\n2. Traitement de texte dans l’Administration scolaire');
await page.goto(BASE+'/#/administration-scolaire',{waitUntil:'networkidle'});
await page.waitForTimeout(1000);
await page.getByTestId('onglet-documents').click();
await page.waitForTimeout(900);
ok(await page.getByTestId('editeur-word').count()>0,'l’éditeur enrichi remplace la zone de texte simple');
for (const c of ['bold','italic','underline','justifyCenter','insertUnorderedList','undo'])
  ok(await page.getByTestId('fmt-'+c).count()>0, `bouton de mise en forme « ${c} » présent`);
ok(await page.getByTestId('fmt-titre').count()>0,'sélecteur de styles de titre');
ok(await page.getByTestId('fmt-taille').count()>0,'sélecteur de taille');

// Le modèle officiel est bien chargé et éditable
const inner=await page.getByTestId('editeur-word').innerHTML();
ok(inner.length>50,'un modèle est chargé dans l’éditeur');

// Saisie + mise en forme réelle
// On vide l'editeur puis on saisit, avant de selectionner la ligne par
// un triple-clic. « Control+A » selectionnerait toute la PAGE, pas le
// contenu de la zone d'edition : la commande porterait alors a faux.
await page.evaluate(() => {
  const el = document.querySelector('[data-testid="editeur-word"]');
  el.innerHTML = '<div>a</div>';
  el.dispatchEvent(new Event('input', { bubbles: true }));
});
await page.getByTestId('editeur-word').click({ clickCount: 3 });
await page.keyboard.type('Compte rendu du conseil des maitres');
await page.getByTestId('editeur-word').click({ clickCount: 3 });
await page.waitForTimeout(200);
await page.getByTestId('fmt-bold').click();
await page.waitForTimeout(300);
const html=await page.getByTestId('editeur-word').innerHTML();
ok(/<b>|font-weight|<strong>/i.test(html), 'le gras est réellement appliqué au texte');

console.log('\n3. Génération d’un vrai fichier Word');
const [dl]=await Promise.all([
  page.waitForEvent('download',{timeout:25000}),
  page.getByTestId('btn-word-document-admin').click(),
]);
const p1=join(dlDir,dl.suggestedFilename());
await dl.saveAs(p1);
ok(dl.suggestedFilename().endsWith('.docx'),`fichier .docx téléchargé (${dl.suggestedFilename()})`);
const buf=readFileSync(p1);
ok(buf[0]===0x50&&buf[1]===0x4b,'le fichier est une archive ZIP (format Word)');
const zip=await JSZip.loadAsync(buf);
ok(!!zip.file('word/document.xml'),'le document Word contient word/document.xml');
ok(!!zip.file('[Content_Types].xml'),'les types de contenu sont déclarés');
const docXml=await zip.file('word/document.xml').async('string');
ok(docXml.includes('Compte rendu du conseil des maitres'),'le texte saisi se retrouve dans le fichier Word');
// On verifie le gras SUR LE TEXTE DE L'UTILISATEUR, et non sur l'en-tete
// (qui est gras par construction) : sinon le controle est un faux positif.
const runUser = docXml.split('Compte rendu du conseil des maitres')[0].slice(-260);
ok(/<w:b\/>/.test(runUser),'le gras saisi par l’utilisateur est transmis à Word');
ok(!/<div|<span/i.test(docXml),'aucune balise HTML ne fuit dans le document Word');

console.log('\n4. Le PDF et l’impression restent disponibles');
ok(await page.getByTestId('btn-pdf-document-admin').count()>0,'bouton PDF conservé');
const [dl2]=await Promise.all([
  page.waitForEvent('download',{timeout:25000}),
  page.getByTestId('btn-pdf-document-admin').click(),
]);
const p2=join(dlDir,dl2.suggestedFilename());
await dl2.saveAs(p2);
const pdfBuf=readFileSync(p2);
ok(pdfBuf.slice(0,4).toString()==='%PDF','le PDF reste un vrai PDF');
ok(!pdfBuf.toString('latin1').includes('<div'),'aucune balise HTML brute dans le PDF');

console.log('\n5. Cahier journal');
await page.goto(BASE+'/#/cahier-journal',{waitUntil:'networkidle'});
await page.waitForTimeout(800);
await page.getByTestId('champ-classe-journal').fill('CM2 A');
await page.getByTestId('matiere-0').fill('Calcul');
await page.getByTestId('titre-0').fill('Les fractions');
await page.getByTestId('duree-0').fill('45');
await page.getByTestId('bascule-fait-0').click();
await page.getByTestId('btn-ajouter-seance').click();
await page.waitForTimeout(300);
await page.getByTestId('matiere-1').fill('Français');
await page.getByTestId('titre-1').fill('Lecture');
ok(await page.getByTestId('taux-jour').innerText()==='50 %','taux de réalisation du jour = 50 % (1 sur 2)');
await page.getByTestId('btn-enregistrer-journal').click();
await page.waitForTimeout(600);
ok(await page.getByTestId('statut-journal').count()>0,'la journée est enregistrée');
const [dl3]=await Promise.all([
  page.waitForEvent('download',{timeout:25000}),
  page.getByTestId('btn-word-journal').click(),
]);
ok(dl3.suggestedFilename().endsWith('.docx'),'le cahier journal s’exporte en Word');

console.log('\n6. Registre matricule');
await page.goto(BASE+'/#/registre-matricule',{waitUntil:'networkidle'});
await page.waitForTimeout(800);
await page.getByTestId('btn-nouvel-eleve').click();
await page.waitForTimeout(400);
await page.getByTestId('champ-nom').fill('AHOUANSOU');
await page.getByTestId('champ-prenoms').fill('Jean');
await page.getByTestId('champ-matricule').fill('001');
await page.getByTestId('champ-sexe').selectOption('M');
await page.getByTestId('champ-classeAdmission').fill('CM2');
await page.getByTestId('btn-enregistrer-matricule').click();
await page.waitForTimeout(600);
ok(await page.getByTestId('stat-total').innerText()==='1','1 élève inscrit au registre');
ok(await page.getByTestId('stat-presents').innerText()==='1','1 élève présent');
ok((await page.getByTestId('liste-matricules').innerText()).includes('AHOUANSOU'),'l’élève figure au registre');
await page.getByTestId('champ-recherche').fill('zzzz');
await page.waitForTimeout(400);
ok(!(await page.getByTestId('liste-matricules').innerText()).includes('AHOUANSOU'),'la recherche filtre la liste');
await page.getByTestId('champ-recherche').fill('ahou');
await page.waitForTimeout(400);
ok((await page.getByTestId('liste-matricules').innerText()).includes('AHOUANSOU'),'la recherche retrouve l’élève');
const [dl4]=await Promise.all([
  page.waitForEvent('download',{timeout:25000}),
  page.getByTestId('btn-word-matricule').click(),
]);
ok(dl4.suggestedFilename().endsWith('.docx'),'le registre s’exporte en Word');
const zip4=await JSZip.loadAsync(readFileSync(await (async()=>{const p=join(dlDir,dl4.suggestedFilename());await dl4.saveAs(p);return p;})()));
const x4=await zip4.file('word/document.xml').async('string');
ok(x4.includes('AHOUANSOU'),'le registre Word contient bien l’élève');
ok(x4.includes('w:orient="landscape"'),'le registre est en paysage (tableau large)');

console.log(`\n════════════════════════════════════\nE2E v49 : ${pass} réussis, ${fail} échoués`);
await browser.close();
process.exit(fail?1:0);
