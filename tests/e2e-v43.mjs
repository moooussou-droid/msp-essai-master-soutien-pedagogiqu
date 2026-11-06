/**
 * E2E v43 — rattachement de l'utilisateur à son école et transfert autorisé.
 *
 * Ce que seul un vrai navigateur prouve :
 *  - que l'école se verrouille au premier enregistrement ;
 *  - qu'un changement d'école est réellement REFUSÉ sans autorisation ;
 *  - que l'autorisation ouvre le transfert, une seule fois ;
 *  - que l'administration dispose des paramètres de modification ;
 *  - que les données déjà saisies ne sont pas détruites par un transfert.
 */
import { chromium } from 'playwright';

const BASE = 'http://localhost:5173';
let pass = 0, fail = 0;
const failures = [];

function ok(cond, label) {
  if (cond) { pass++; console.log('  ✅ ' + label); }
  else { fail++; failures.push(label); console.log('  ❌ ' + label); }
}

const ACTIVATION = {
  activated: true, name: 'KOFFI Jean', code: '111111',
  expiresAt: Date.now() + 31536000000, plan: 'complet',
};

function seed(act) {
  localStorage.setItem('msp_activation', JSON.stringify(act));
  localStorage.setItem('msp_install_dismissed', 'true');
  /*
   * Les guides de premiere utilisation s'affichent en plein ecran et
   * interceptent les clics. Ce ne sont pas des bugs : on les masque pour
   * pouvoir tester les ecrans eux-memes.
   */
  for (const g of ['settings-profile-cloud', 'home-dashboard']) {
    localStorage.setItem(`msp_guide_hidden_${g}`, 'true');
  }
}

async function newPage(browser) {
  const ctx = await browser.newContext({ viewport: { width: 412, height: 900 } });
  await ctx.addInitScript(seed, ACTIVATION);
  const page = await ctx.newPage();
  page.on('dialog', (d) => d.accept());
  return { ctx, page };
}

/** Enregistre le profil avec l'école donnée. */
async function saveSchool(page, name) {
  await page.locator('[data-testid="champ-ecole"]').fill(name);
  await page.locator('button:has-text("Enregistrer")').first().click();
  await page.waitForTimeout(800);
}

/** Code de transfert attendu pour cet appareil. */
async function transferCode(page) {
  return page.evaluate(() => {
    const dev = localStorage.getItem('msp_device_id');
    function hash(str) {
      let h = 2166136261;
      for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
      return h >>> 0;
    }
    const raw = `transfert-etablissement::${dev}::msp-transfer-v1`;
    const a = hash(raw).toString(36).toUpperCase().padStart(6, '0').slice(0, 4);
    const b = hash(raw.split('').reverse().join('')).toString(36).toUpperCase().padStart(6, '0').slice(0, 4);
    return `${a}-${b}`;
  });
}

const run = async () => {
  const browser = await chromium.launch();

  /* ====== Bloc 1 : verrouillage au premier enregistrement ====== */
  console.log('\n— Bloc 1 : l’école se verrouille au premier enregistrement');
  {
    const { ctx, page } = await newPage(browser);
    await page.goto(BASE + '/#/profile', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    const avant = await page.locator('[data-testid="statut-rattachement"]').textContent();
    ok(/Aucun établissement/i.test(avant),
       `Aucun rattachement au départ (${avant.trim().slice(0, 50)})`);

    await saveSchool(page, 'EPP Cotonou Centre');

    const apres = await page.locator('[data-testid="statut-rattachement"]').textContent();
    ok(apres.includes('EPP Cotonou Centre'),
       `L’école est enregistrée comme rattachement (${apres.trim().slice(0, 60)})`);

    const bind = await page.evaluate(() => JSON.parse(localStorage.getItem('msp_school_binding')));
    ok(bind && bind.schoolName === 'EPP Cotonou Centre', 'Le rattachement est persisté');
    ok(bind.transferAllowed === false, 'Aucune autorisation de transfert par défaut');
    ok(bind.history.length === 1, 'L’historique contient la première école');

    await ctx.close();
  }

  /* ====== Bloc 2 : la même école, écrite autrement, reste acceptée ====== */
  console.log('\n— Bloc 2 : tolérance sur l’écriture du nom');
  {
    const { ctx, page } = await newPage(browser);
    await page.goto(BASE + '/#/profile', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    await saveSchool(page, 'EPP Cotonou Centre');

    // Majuscules, accents et espaces multiples ne doivent pas bloquer.
    await saveSchool(page, '  epp   COTONOU  centre ');
    ok(await page.locator('[data-testid="erreur-ecole"]').count() === 0,
       'Une différence de casse ou d’espaces ne bloque pas l’enseignant');

    const bind = await page.evaluate(() => JSON.parse(localStorage.getItem('msp_school_binding')));
    ok(bind.transferCount === 0, 'Aucun transfert n’est comptabilisé à tort');

    await ctx.close();
  }

  /* ====== Bloc 3 : changement refusé sans autorisation ====== */
  console.log('\n— Bloc 3 : changement d’école refusé sans autorisation');
  {
    const { ctx, page } = await newPage(browser);
    await page.goto(BASE + '/#/profile', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    await saveSchool(page, 'EPP Cotonou Centre');

    await saveSchool(page, 'EPP Porto-Novo');

    ok(await page.locator('[data-testid="erreur-ecole"]').count() === 1,
       'Le changement d’école est refusé et expliqué');
    const msg = await page.locator('[data-testid="erreur-ecole"]').textContent();
    ok(msg.includes('EPP Cotonou Centre'), 'Le message rappelle l’école de rattachement');
    ok(/Super Administrateur/.test(msg), 'Le message indique la marche à suivre');

    // Le profil enregistré ne doit PAS avoir changé d'école
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('msp_profile') || '{}'));
    ok(saved.schoolName === 'EPP Cotonou Centre',
       `L’école enregistrée reste l’école de rattachement (${saved.schoolName})`);
    const bind = await page.evaluate(() => JSON.parse(localStorage.getItem('msp_school_binding')));
    ok(bind.schoolName === 'EPP Cotonou Centre', 'Le rattachement n’a pas bougé');

    ok(await page.locator('[data-testid="identifiant-transfert"]').count() === 1,
       'L’identifiant de l’appareil est affiché pour obtenir une autorisation');

    // Un code erroné ne débloque rien
    await page.locator('[data-testid="champ-code-transfert"]').fill('AAAA-BBBB');
    await page.locator('[data-testid="btn-valider-transfert"]').click();
    await page.waitForTimeout(700);
    const bind2 = await page.evaluate(() => JSON.parse(localStorage.getItem('msp_school_binding')));
    ok(bind2.transferAllowed === false, 'Un code erroné n’accorde aucune autorisation');

    await ctx.close();
  }

  /* ====== Bloc 4 : transfert autorisé par code ====== */
  console.log('\n— Bloc 4 : transfert autorisé par code');
  {
    const { ctx, page } = await newPage(browser);
    await page.goto(BASE + '/#/profile', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    await saveSchool(page, 'EPP Cotonou Centre');

    // On saisit des données pour vérifier qu'elles survivent au transfert
    await page.evaluate(() => {
      localStorage.setItem('msp_acc_revenues', JSON.stringify([{
        id: 'r1', date: '2026-09-15', source: 'classe', className: 'CM2',
        category: 'scolarite', object: 'Scolarité', amount: 50000,
        method: 'especes', createdAt: 1,
      }]));
    });

    await saveSchool(page, 'EPP Porto-Novo');
    ok(await page.locator('[data-testid="erreur-ecole"]').count() === 1,
       'Le changement est d’abord refusé');

    const code = await transferCode(page);
    await page.locator('[data-testid="champ-code-transfert"]').fill(code);
    await page.locator('[data-testid="btn-valider-transfert"]').click();
    await page.waitForTimeout(900);

    const bindA = await page.evaluate(() => JSON.parse(localStorage.getItem('msp_school_binding')));
    ok(bindA.transferAllowed === true, 'Le bon code accorde l’autorisation');
    ok(bindA.schoolName === 'EPP Cotonou Centre',
       'L’autorisation seule ne change pas encore l’école');

    // Maintenant l'enregistrement doit passer
    await saveSchool(page, 'EPP Porto-Novo');
    const bindB = await page.evaluate(() => JSON.parse(localStorage.getItem('msp_school_binding')));
    ok(bindB.schoolName === 'EPP Porto-Novo',
       `L’école est bien transférée (${bindB.schoolName})`);
    ok(bindB.transferCount === 1, 'Le transfert est comptabilisé');
    ok(bindB.history.length === 2, 'L’historique conserve les deux écoles');
    ok(!!bindB.history[0].until, 'La période précédente est clôturée dans l’historique');

    // L'autorisation est à usage unique
    ok(bindB.transferAllowed === false, 'L’autorisation est consommée après usage');
    await saveSchool(page, 'EPP Parakou');
    ok(await page.locator('[data-testid="erreur-ecole"]').count() === 1,
       'Un second transfert exige une nouvelle autorisation');

    // Les données saisies ne sont pas détruites
    const rev = await page.evaluate(() => JSON.parse(localStorage.getItem('msp_acc_revenues') || '[]'));
    ok(rev.length === 1, 'Les données déjà saisies sont conservées après un transfert');

    await ctx.close();
  }

  /* ====== Bloc 5 : paramètres côté administration ====== */
  console.log('\n— Bloc 5 : paramètres de modification de l’administration');
  {
    const { ctx, page } = await newPage(browser);
    await page.goto(BASE + '/#/profile', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    await saveSchool(page, 'EPP Cotonou Centre');

    /*
     * La session d'administration est une chaine brute dans localStorage
     * ('owner' = Super Administrateur). On l'ouvre comme le font les suites
     * v38/v39, puis on recharge la page.
     */
    await page.evaluate(() => {
      localStorage.setItem('msp_admin_dashboard_session', 'owner');
    });
    await page.goto(BASE + '/#/admin-dashboard', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);

    await page.locator('button:has-text("Établissement")').first().click();
    await page.waitForTimeout(900);

    ok(await page.locator('[data-testid="panneau-transfert"]').count() === 1,
       'L’administration dispose d’un panneau « Établissement »');
    const ecole = await page.locator('[data-testid="admin-ecole"]').textContent();
    ok(ecole.includes('EPP Cotonou Centre'), 'Le panneau affiche l’école de rattachement');

    ok(await page.locator('[data-testid="code-transfert"]').count() === 1,
       'Un code d’autorisation est calculé pour l’appareil');
    const codeAffiche = await page.locator('[data-testid="code-transfert"]').textContent();
    ok(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(codeAffiche.trim()),
       `Le code a le bon format (${codeAffiche.trim()})`);

    // Le code affiché pour cet appareil doit correspondre au code attendu
    const attendu = await transferCode(page);
    ok(codeAffiche.trim() === attendu,
       'Le code produit par l’administration est celui qu’attend l’appareil');

    // Accorder puis retirer l'autorisation
    await page.locator('[data-testid="btn-accorder-transfert"]').click();
    await page.waitForTimeout(800);
    let aut = await page.locator('[data-testid="admin-autorisation"]').textContent();
    ok(/ACCORDÉE/.test(aut), 'L’administration peut accorder le transfert directement');

    await page.locator('[data-testid="btn-retirer-transfert"]').click();
    await page.waitForTimeout(800);
    aut = await page.locator('[data-testid="admin-autorisation"]').textContent();
    ok(/aucune/.test(aut), 'L’administration peut retirer une autorisation');

    // Réécriture directe de l'établissement
    await page.locator('[data-testid="champ-nouvelle-ecole-admin"]').fill('EPP Parakou');
    await page.locator('[data-testid="btn-modifier-ecole-admin"]').click();
    await page.waitForTimeout(900);
    const ecole2 = await page.locator('[data-testid="admin-ecole"]').textContent();
    ok(ecole2.includes('EPP Parakou'),
       `Le Super Administrateur peut réécrire l’établissement (${ecole2.trim()})`);

    const hist = await page.locator('[data-testid="historique-rattachement"]').textContent();
    ok(hist.includes('EPP Cotonou Centre') && hist.includes('EPP Parakou'),
       'L’historique des rattachements est visible et complet');

    await ctx.close();
  }

  /* ====== Bloc 6 : bandeau d'avertissement dans les modules ====== */
  console.log('\n— Bloc 6 : avertissement en cas d’école divergente');
  {
    const { ctx, page } = await newPage(browser);
    // Profil sur une école, rattachement sur une autre (incohérence forcée)
    await page.addInitScript(() => {
      localStorage.setItem('msp_profile', JSON.stringify({
        teacherName: 'KOFFI Jean', schoolName: 'EPP Porto-Novo',
      }));
      localStorage.setItem('msp_school_binding', JSON.stringify({
        schoolName: 'EPP Cotonou Centre', boundAt: Date.now(),
        transferAllowed: false, transferCount: 0,
        history: [{ schoolName: 'EPP Cotonou Centre', since: Date.now() }],
      }));
    });

    await page.goto(BASE + '/#/cantine', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    ok(await page.locator('[data-testid="bandeau-ecole"]').count() === 1,
       'Un bandeau signale l’écart entre le profil et le rattachement');
    const b = await page.locator('[data-testid="bandeau-ecole"]').textContent();
    ok(b.includes('EPP Cotonou Centre') && b.includes('EPP Porto-Novo'),
       'Le bandeau nomme les deux écoles');

    // Et il disparaît quand tout est cohérent
    await page.evaluate(() => {
      localStorage.setItem('msp_profile', JSON.stringify({
        teacherName: 'KOFFI Jean', schoolName: 'EPP Cotonou Centre',
      }));
    });
    await page.goto(BASE + '/#/comptabilite', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);
    ok(await page.locator('[data-testid="bandeau-ecole"]').count() === 0,
       'Aucun bandeau lorsque l’école est conforme');

    await ctx.close();
  }

  await browser.close();

  console.log('\n════════════════════════════════════');
  console.log(`RÉSULTATS v43 : ${pass} réussis, ${fail} échoués`);
  if (fail) { console.log('\nÉchecs :'); failures.forEach((f) => console.log('  - ' + f)); }
  process.exit(fail ? 1 : 0);
};

run().catch((e) => { console.error(e); process.exit(1); });
