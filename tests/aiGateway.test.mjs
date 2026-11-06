import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import {
  getAIProviderCatalogue,
  handleAIChat,
  handleProviders,
  handleSession,
} from '../server/aiGateway.js';

function responseMock() {
  return {
    statusCode: 0,
    headers: {},
    body: '',
    setHeader(name, value) { this.headers[name] = value; },
    end(value = '') { this.body = String(value); },
    json() { return JSON.parse(this.body); },
  };
}

function saveEnv(names) {
  const before = Object.fromEntries(names.map(name => [name, process.env[name]]));
  return () => {
    for (const name of names) {
      if (before[name] === undefined) delete process.env[name];
      else process.env[name] = before[name];
    }
  };
}

test('fournisseurs présents dans le catalogue sans divulguer de clés', () => {
  const env = ['OPENAI_API_KEY', 'OPENAI_MODEL', 'OPENAI_MODELS', 'ANTHROPIC_API_KEY', 'ANTHROPIC_MODEL', 'ANTHROPIC_MODELS', 'MISTRAL_API_KEY', 'MISTRAL_MODEL', 'MISTRAL_MODELS', 'PERPLEXITY_API_KEY', 'PERPLEXITY_MODEL', 'PERPLEXITY_MODELS', 'GEMINI_API_KEY', 'GEMINI_MODEL', 'GEMINI_MODELS', 'DEEPSEEK_API_KEY', 'DEEPSEEK_MODEL', 'DEEPSEEK_MODELS'];
  const restore = saveEnv(env);
  try {
    for (const name of env) delete process.env[name];
    const catalogue = getAIProviderCatalogue();
    const ids = catalogue.map(provider => provider.id);
    for (const id of ['openai', 'anthropic', 'mistral', 'perplexity', 'gemini', 'deepseek']) assert.ok(ids.includes(id), `provider ${id}`);
    assert.ok(catalogue.filter(provider => ['openai', 'anthropic', 'mistral', 'perplexity', 'gemini', 'deepseek'].includes(provider.id)).every(provider => !provider.configured && provider.models.length === 0), 'aucun secret ou modèle par défaut sans configuration administrateur');
    process.env.OPENAI_API_KEY = 'server-secret-test';
    process.env.OPENAI_MODELS = 'allowed-model-1,allowed-model-2';
    const res = responseMock();
    handleProviders({ method: 'GET' }, res);
    const body = res.json();
    const openai = body.providers.find(provider => provider.id === 'openai');
    assert.equal(openai.configured, true);
    assert.deepEqual(openai.models, ['allowed-model-1', 'allowed-model-2']);
    assert.equal(res.body.includes('server-secret-test'), false);
  } finally { restore(); }
});

test('refuse les appels API cross-origin', async () => {
  const res = responseMock();
  await handleAIChat({
    method: 'POST',
    headers: { origin: 'https://evil.example', host: 'msp.example' },
    body: { provider: 'openai', messages: [{ role: 'user', content: 'test' }], consent: true },
  }, res);
  assert.equal(res.statusCode, 403);
  assert.equal(res.json().error, 'ORIGIN_NOT_ALLOWED');
});

test('exige une confirmation explicite sur la route IA', async () => {
  const res = responseMock();
  await handleAIChat({
    method: 'POST',
    headers: { origin: 'https://msp.example', host: 'msp.example' },
    body: { provider: 'openai', messages: [{ role: 'user', content: 'test' }], consent: false },
  }, res);
  assert.equal(res.statusCode, 428);
  assert.equal(res.json().error, 'AI_CONSENT_REQUIRED');
});

test('un code IA de mauvais format est refusé avant toute requête à Supabase', async () => {
  const res = responseMock();
  await handleSession({
    method: 'POST',
    headers: { origin: 'https://msp.example', host: 'msp.example' },
    body: { code: '123456' },
  }, res);
  assert.equal(res.statusCode, 401);
  assert.equal(res.json().error, 'AI_CODE_INVALID');
});

test('session absente répond de façon non authentifiée sans exposer de données', async () => {
  const res = responseMock();
  await handleSession({ method: 'GET', headers: {} }, res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.json(), { authenticated: false, session: null });
});

test('les six adaptateurs envoient au fournisseur uniquement après consentement et session valides', async () => {
  const providers = ['openai', 'anthropic', 'mistral', 'perplexity', 'gemini', 'deepseek'];
  const env = [
    'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'MSP_AI_SESSION_SECRET', 'NODE_ENV',
    ...providers.flatMap(id => [`${id.toUpperCase()}_API_KEY`, `${id.toUpperCase()}_MODEL`, `${id.toUpperCase()}_MODELS`]),
  ];
  // Les noms d’environnement Gemini et Anthropic suivent le mapping de la passerelle.
  env.push('GEMINI_API_KEY', 'GEMINI_MODEL', 'GEMINI_MODELS', 'ANTHROPIC_API_KEY', 'ANTHROPIC_MODEL', 'ANTHROPIC_MODELS');
  const restoreEnv = saveEnv([...new Set(env)]);
  const originalFetch = globalThis.fetch;
  try {
    process.env.SUPABASE_URL = 'https://supabase.test';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'supabase-service-role-test-secret';
    process.env.MSP_AI_SESSION_SECRET = 'test-session-secret-with-at-least-32-bytes';
    process.env.NODE_ENV = 'test';
    const modelFor = Object.fromEntries(providers.map(id => [id, `${id}-test-model`]));
    for (const id of providers) {
      const prefix = id.toUpperCase();
      process.env[`${prefix}_API_KEY`] = `server-secret-${id}`;
      process.env[`${prefix}_MODEL`] = modelFor[id];
      process.env[`${prefix}_MODELS`] = '';
    }

    const code = randomBytes(32).toString('base64url');
    const access = {
      id: '8f49d32b-0e40-4e2e-9d83-99b3ce36c01a',
      token_hash: createHash('sha256').update(code).digest('hex'),
      display_name: 'Test principal', role: 'principal', is_active: true,
      expires_at: new Date(Date.now() + 86_400_000).toISOString(), daily_limit: 25,
    };
    globalThis.fetch = async (input, init = {}) => {
      const url = String(input);
      if (url.includes('/rest/v1/msp_ai_access_tokens?') && init.method === 'PATCH') return new Response(null, { status: 204 });
      if (url.includes('/rest/v1/msp_ai_access_tokens?')) return Response.json([access]);
      throw new Error(`Unexpected mocked login request: ${url}`);
    };
    const login = responseMock();
    await handleSession({ method: 'POST', headers: { origin: 'https://msp.example', host: 'msp.example' }, body: { code } }, login);
    assert.equal(login.statusCode, 200, 'le code long valide ouvre une session');
    const cookie = login.headers['Set-Cookie']?.split(';')[0];
    assert.ok(cookie?.startsWith('msp_ai_session='), 'session renvoyée dans un cookie HttpOnly');

    globalThis.fetch = async (input) => {
      const url = String(input);
      if (url.includes('/rest/v1/msp_ai_access_tokens?')) return Response.json([access]);
      throw new Error(`Aucun quota ni fournisseur ne doit être appelé pour un modèle interdit: ${url}`);
    };
    const forbiddenModel = responseMock();
    await handleAIChat({
      method: 'POST',
      headers: { origin: 'https://msp.example', host: 'msp.example', cookie },
      body: { provider: 'openai', model: 'not-authorized', messages: [{ role: 'user', content: 'test' }], consent: true },
    }, forbiddenModel);
    assert.equal(forbiddenModel.statusCode, 400);
    assert.equal(forbiddenModel.json().error, 'AI_MODEL_NOT_ALLOWED');

    const expectedUrl = {
      openai: 'https://api.openai.com/v1/chat/completions',
      anthropic: 'https://api.anthropic.com/v1/messages',
      mistral: 'https://api.mistral.ai/v1/chat/completions',
      perplexity: 'https://api.perplexity.ai/chat/completions',
      gemini: `https://generativelanguage.googleapis.com/v1beta/models/${modelFor.gemini}:generateContent`,
      deepseek: 'https://api.deepseek.com/chat/completions',
    };
    for (const provider of providers) {
      let upstreamCall = null;
      globalThis.fetch = async (input, init = {}) => {
        const url = String(input);
        if (url.includes('/rest/v1/msp_ai_access_tokens?')) return Response.json([access]);
        if (url.includes('/rest/v1/rpc/msp_ai_reserve_request')) return Response.json({ ok: true, request_id: '1eeb1776-1ac1-47e7-9406-234fe34b5a09' });
        if (url.includes('/rest/v1/rpc/msp_ai_finish_request')) return Response.json(true);
        if (url === expectedUrl[provider]) {
          upstreamCall = { url, init };
          const data = provider === 'anthropic'
            ? { content: [{ type: 'text', text: `Réponse ${provider}` }], usage: { input_tokens: 5, output_tokens: 7 } }
            : provider === 'gemini'
              ? { candidates: [{ content: { parts: [{ text: `Réponse ${provider}` }] } }], usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 7 } }
              : { choices: [{ message: { content: `Réponse ${provider}` } }], usage: { prompt_tokens: 5, completion_tokens: 7 }, citations: provider === 'perplexity' ? ['https://source.example/test'] : [] };
          return Response.json(data);
        }
        throw new Error(`Unexpected mocked chat request: ${url}`);
      };

      const response = responseMock();
      await handleAIChat({
        method: 'POST',
        headers: { origin: 'https://msp.example', host: 'msp.example', cookie },
        body: { provider, model: modelFor[provider], messages: [{ role: 'user', content: 'Bonjour, explique ce sujet.' }], consent: true },
      }, response);
      assert.equal(response.statusCode, 200, `${provider} répond via son adaptateur`);
      assert.equal(response.json().text, `Réponse ${provider}`);
      assert.ok(upstreamCall, `${provider} a appelé l’endpoint attendu`);
      const upstreamBody = JSON.parse(upstreamCall.init.body);
      if (provider === 'openai') {
        assert.equal(upstreamBody.max_completion_tokens, 3000);
        assert.equal(upstreamBody.max_tokens, undefined);
      } else if (provider === 'gemini') {
        assert.equal(upstreamBody.generationConfig.maxOutputTokens, 3000);
      } else {
        assert.equal(upstreamBody.max_tokens, 3000);
      }
      const headers = upstreamCall.init.headers;
      const sentKey = headers.Authorization || headers['x-api-key'] || headers['x-goog-api-key'];
      assert.ok(String(sentKey).includes(`server-secret-${provider}`), `${provider} reçoit la clé depuis le serveur`);
      assert.equal(response.body.includes(`server-secret-${provider}`), false, `${provider} API key never appears in client response`);
    }
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});
