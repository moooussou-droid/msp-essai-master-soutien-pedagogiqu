import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { transform } from 'esbuild';

const source = await readFile(new URL('../src/utils/trial.ts', import.meta.url), 'utf8');
const { code } = await transform(source, { loader: 'ts', format: 'esm', target: 'node20' });
const trialUrl = `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
const trial = await import(trialUrl);

function memoryStorage() {
  const data = new Map();
  return {
    getItem(key) { return data.has(key) ? data.get(key) : null; },
    setItem(key, value) { data.set(key, String(value)); },
    removeItem(key) { data.delete(key); },
  };
}

function installStorage() {
  const original = { localStorage: globalThis.localStorage, sessionStorage: globalThis.sessionStorage };
  globalThis.localStorage = memoryStorage();
  globalThis.sessionStorage = memoryStorage();
  return () => {
    if (original.localStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = original.localStorage;
    if (original.sessionStorage === undefined) delete globalThis.sessionStorage;
    else globalThis.sessionStorage = original.sessionStorage;
  };
}

const HOUR = 3_600_000;
const START = 1_800_000_000_000;

test('un nouvel essai dure exactement deux heures', () => {
  const restore = installStorage();
  try {
    assert.equal(trial.TRIAL_HOURS, 2);
    assert.equal(trial.TRIAL_DURATION_MS, 2 * HOUR);
    const state = trial.startTrial('Test', START);
    assert.equal(state.expiresAt, START + 2 * HOUR);
    assert.equal(trial.trialStatus(START + HOUR).active, true);
    assert.equal(trial.trialStatus(START + 2 * HOUR).expired, true);
  } finally {
    restore();
  }
});

test('un essai de six heures déjà enregistré est ramené à deux heures', () => {
  const restore = installStorage();
  try {
    globalThis.localStorage.setItem(trial.TRIAL_KEY, JSON.stringify({
      startedAt: START,
      expiresAt: START + 6 * HOUR,
      lastSeenAt: START + HOUR,
      name: 'Ancien essai',
    }));
    globalThis.localStorage.setItem(trial.TRIAL_USED_KEY, '1');

    const status = trial.trialStatus(START + HOUR);
    assert.equal(status.active, true);
    assert.equal(status.remainingMs, HOUR);
    assert.equal(trial.getTrial().expiresAt, START + 2 * HOUR);
    assert.equal(trial.trialStatus(START + 2 * HOUR).expired, true);
  } finally {
    restore();
  }
});

test('les boutons du catalogue gratuit sont bloqués pour le mode essai', async () => {
  const [app, screen] = await Promise.all([
    readFile(new URL('../src/App.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/PrepFichesScreen.tsx', import.meta.url), 'utf8'),
  ]);
  assert.ok(app.includes('trialMode={!subscriptionActive && onTrial}'));
  assert.ok(app.includes('<PrepFichesScreen trialMode={trialMode} />'));
  assert.ok(screen.includes('if (trialMode) return;'));
  assert.ok(screen.includes('disabled={trialMode}'));
  assert.ok(screen.includes('if (trialMode) {'));
  assert.ok(screen.includes('trialMode ? \'Import ZIP réservé aux abonnés\''));
});

test('le portail délègue le contrôle des routes à la politique d’accès explicite', async () => {
  const app = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8');
  const admin = await readFile(new URL('../src/components/AdminDashboardScreen.tsx', import.meta.url), 'utf8');
  assert.ok(app.includes('const location = useLocation();'), 'la porte suit la route du HashRouter');
  assert.ok(app.includes('resolveRouteAccess(location.pathname'), 'chaque navigation repasse par le garde global');
  assert.ok(app.includes('trialActive: onTrial'), 'l’essai reste une autorisation intentionnelle distincte');
  assert.ok(app.includes('hasAdminSession: isAnyAdminSession()'), 'une session admin/équipe valide reste prise en compte');
  assert.ok(app.includes('const bypassesPlanGates = isPublicRoute || isAdminLoginRoute;'));
  assert.ok(app.includes('onTrialStarted={() => setTrialTick((tick) => tick + 1)}'));
  assert.ok(admin.includes('data-testid="btn-retour-activation"')
    && admin.includes("navigate('/activation')"),
    'le bouton admin revient systématiquement à l’écran d’activation plutôt qu’au menu');
});
