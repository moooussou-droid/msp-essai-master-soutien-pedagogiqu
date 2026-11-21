import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { transform } from 'esbuild';

const source = await readFile(new URL('../src/utils/routeAccess.ts', import.meta.url), 'utf8');
const { code } = await transform(source, { loader: 'ts', format: 'esm', target: 'node20' });
const routeAccessUrl = `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
const { resolveRouteAccess, getHomeReturnPath } = await import(routeAccessUrl);

const guest = {
  subscriptionActive: false,
  trialActive: false,
  hasAdminSession: false,
};

test('une route d’accueil protégée reste fermée pour un visiteur sans abonnement ni essai', () => {
  assert.equal(resolveRouteAccess('/', guest).canOpen, false);
  assert.equal(resolveRouteAccess('/class/new', guest).canOpen, false);
  assert.equal(resolveRouteAccess('/admin-fiches-preparation', guest).canOpen, false);
  assert.equal(resolveRouteAccess('/suivi-enfant/codes', guest).canOpen, false);
});

test('les pages de connexion admin sont accessibles sans ouvrir le reste de l’application', () => {
  for (const path of ['/admin-dashboard', '/equipe']) {
    const access = resolveRouteAccess(path, guest);
    assert.equal(access.canOpen, true, `${path} doit afficher son formulaire de connexion`);
    assert.equal(access.isAdminLoginRoute, true);
    assert.equal(access.isPublicRoute, false, 'le formulaire de connexion ne devient pas une route publique générale');
  }
  assert.equal(resolveRouteAccess('/admin-dashboard/gestion', guest).canOpen, false);
});

test('les routes publiques restent disponibles, mais les codes parents restent protégés', () => {
  for (const path of ['/activation', '/verify', '/suivi-enfant']) {
    assert.equal(resolveRouteAccess(path, guest).canOpen, true, `${path} reste accessible sans abonnement`);
  }
  assert.equal(resolveRouteAccess('/suivi-enfant/codes', guest).isPublicRoute, false);
  assert.equal(resolveRouteAccess('/suivi-enfant/codes', guest).canOpen, false);
});

test('un essai actif garde le périmètre gratuit intentionnel et indépendant du bouton admin', () => {
  assert.equal(resolveRouteAccess('/', { ...guest, trialActive: true }).canOpen, true);
  assert.equal(resolveRouteAccess('/class/new', { ...guest, trialActive: true }).canOpen, true);
  assert.equal(resolveRouteAccess('/admin-cours', { ...guest, trialActive: true }).canOpen, true);
});

test('une activation valide et une session admin valide conservent leurs accès légitimes', () => {
  assert.equal(resolveRouteAccess('/', { ...guest, subscriptionActive: true }).canOpen, true);
  assert.equal(resolveRouteAccess('/admin-cours', { ...guest, hasAdminSession: true }).canOpen, true);
  assert.equal(resolveRouteAccess('/admin-fiches-preparation', { ...guest, hasAdminSession: true }).adminWorkspaceAllowed, true);
});

test('les boutons de retour sans code actif mènent à l’activation, pas au menu', async () => {
  assert.equal(getHomeReturnPath(false), '/activation');
  assert.equal(getHomeReturnPath(true), '/', 'un abonnement actif conserve le retour à l’accueil');

  const [admin, upgrade] = await Promise.all([
    readFile(new URL('../src/components/AdminDashboardScreen.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/UpgradeScreen.tsx', import.meta.url), 'utf8'),
  ]);
  assert.match(admin, /getHomeReturnPath\(isActivated\(\)\)/);
  assert.match(admin, /data-testid="btn-retour-activation"[\s\S]*?navigate\(returnHomePath\)/);
  assert.match(admin, /Retour à l’écran d’activation/);
  assert.match(upgrade, /getHomeReturnPath\(chrono\.active && !chrono\.expired\)/);
  assert.match(upgrade, /navigate\(returnHomePath\)[\s\S]*?data-testid="btn-retour-accueil-upgrade"/);
  assert.match(upgrade, /Retour à l’écran d’activation/);
});

test('le portail global utilise la décision de route et ne confond pas essai, connexion admin et abonnement', async () => {
  const [app, accessGate] = await Promise.all([
    readFile(new URL('../src/App.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/AccessGate.tsx', import.meta.url), 'utf8'),
  ]);
  assert.match(app, /resolveRouteAccess\(location\.pathname/);
  assert.match(app, /subscriptionActive,\s*trialActive: onTrial,\s*hasAdminSession: isAnyAdminSession\(\)/);
  assert.match(app, /if \(!canOpen\)\s*\{\s*return \(\s*<AccessGate/);
  assert.match(app, /if \(!subscriptionActive && onTrial && !bypassesPlanGates && isProPath\(route\)\)/,
    'l’essai garde les restrictions PRO existantes');
  assert.match(accessGate, /data-testid="btn-demarrer-essai"/);
  assert.match(app, /trialMode=\{!subscriptionActive && onTrial\}/);
});
