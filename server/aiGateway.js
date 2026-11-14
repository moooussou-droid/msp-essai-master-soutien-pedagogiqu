import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

const COOKIE_NAME = 'msp_ai_session';
const SESSION_TTL_SECONDS = 6 * 60 * 60;
const MAX_BODY_BYTES = 3_500_000;
const MAX_TEXT_CHARS = 55_000;
const MAX_IMAGE_BASE64_CHARS = 2_200_000;
const MAX_MESSAGES = 32;
const DEFAULT_OUTPUT_TOKENS = 3000;

const PROVIDER_DEFINITIONS = {
  openai: {
    label: 'OpenAI / ChatGPT', key: 'OPENAI_API_KEY', model: 'OPENAI_MODEL', models: 'OPENAI_MODELS', defaultModel: '',
    vision: true, webSearch: false,
  },
  anthropic: {
    label: 'Anthropic / Claude', key: 'ANTHROPIC_API_KEY', model: 'ANTHROPIC_MODEL', models: 'ANTHROPIC_MODELS', defaultModel: '',
    vision: true, webSearch: false,
  },
  mistral: {
    label: 'Mistral AI', key: 'MISTRAL_API_KEY', model: 'MISTRAL_MODEL', models: 'MISTRAL_MODELS', defaultModel: '',
    vision: false, webSearch: false,
  },
  perplexity: {
    label: 'Perplexity', key: 'PERPLEXITY_API_KEY', model: 'PERPLEXITY_MODEL', models: 'PERPLEXITY_MODELS', defaultModel: '',
    vision: false, webSearch: true,
  },
  gemini: {
    label: 'Google Gemini', key: 'GEMINI_API_KEY', model: 'GEMINI_MODEL', models: 'GEMINI_MODELS', defaultModel: '',
    vision: true, webSearch: false,
  },
  deepseek: {
    label: 'DeepSeek', key: 'DEEPSEEK_API_KEY', model: 'DEEPSEEK_MODEL', models: 'DEEPSEEK_MODELS', defaultModel: '',
    vision: false, webSearch: false,
  },
  copilot: {
    label: 'Azure OpenAI', key: 'AZURE_OPENAI_API_KEY', model: 'AZURE_OPENAI_DEPLOYMENT', models: 'AZURE_OPENAI_DEPLOYMENTS', defaultModel: '',
    vision: false, webSearch: false,
  },
};

function providerConfig(provider) {
  const definition = PROVIDER_DEFINITIONS[provider];
  if (!definition) return null;
  const apiKey = process.env[definition.key] || '';
  const modelValues = (process.env[definition.models] || process.env[definition.model] || definition.defaultModel)
    .split(',').map((model) => model.trim()).filter(Boolean).slice(0, 12);
  if (provider === 'copilot') {
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT || '';
    return { ...definition, apiKey, models: modelValues, configured: Boolean(apiKey && endpoint && modelValues.length), endpoint };
  }
  return { ...definition, apiKey, models: modelValues, configured: Boolean(apiKey && modelValues.length) };
}

export function getAIProviderCatalogue() {
  return Object.entries(PROVIDER_DEFINITIONS).map(([id, definition]) => {
    const config = providerConfig(id);
    return {
      id,
      label: definition.label,
      configured: Boolean(config?.configured),
      models: config?.models || [],
      vision: definition.vision,
      webSearch: definition.webSearch,
    };
  });
}

export function sendJson(res, status, data, extraHeaders = {}) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  for (const [key, value] of Object.entries(extraHeaders)) res.setHeader(key, value);
  res.end(JSON.stringify(data));
}

export function httpError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

export async function readJsonBody(req, maxBytes = MAX_BODY_BYTES) {
  if (req.body !== undefined && req.body !== null) {
    const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    if (Buffer.byteLength(body, 'utf8') > maxBytes) throw httpError(413, 'BODY_TOO_LARGE', 'La demande est trop volumineuse.');
    try { return typeof req.body === 'string' ? JSON.parse(req.body) : req.body; }
    catch { throw httpError(400, 'INVALID_JSON', 'La demande n’est pas un JSON valide.'); }
  }
  let text = '';
  for await (const chunk of req) {
    text += chunk.toString('utf8');
    if (Buffer.byteLength(text, 'utf8') > maxBytes) throw httpError(413, 'BODY_TOO_LARGE', 'La demande est trop volumineuse.');
  }
  try { return JSON.parse(text || '{}'); }
  catch { throw httpError(400, 'INVALID_JSON', 'La demande n’est pas un JSON valide.'); }
}

function originIsAllowed(req) {
  const origin = String(req.headers.origin || '').trim();
  if (!origin) return false;
  let parsed;
  try { parsed = new URL(origin); } catch { return false; }
  const configured = (process.env.MSP_AI_ALLOWED_ORIGINS || '').split(',').map((item) => item.trim()).filter(Boolean);
  if (configured.includes(parsed.origin)) return true;
  const forwardedHost = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim().toLowerCase();
  return parsed.host.toLowerCase() === forwardedHost && ['https:', 'http:'].includes(parsed.protocol);
}

export function requireSameOrigin(req) {
  if (!originIsAllowed(req)) throw httpError(403, 'ORIGIN_NOT_ALLOWED', 'Origine de la demande refusée.');
}

export function getSupabaseConfig() {
  const url = String(process.env.SUPABASE_URL || '').replace(/\/+$/, '');
  const key = String(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '');
  if (!url || !key) throw httpError(503, 'AI_SERVER_NOT_CONFIGURED', 'Le serveur IA n’est pas encore configuré.');
  return { url, key };
}

export function supabaseKeyHeaders(key) {
  // Les nouvelles clés opaques sb_secret_ ne sont pas des JWT : apikey seulement.
  // Les clés legacy service_role sont des JWT et restent compatibles avec Bearer.
  return key.startsWith('sb_secret_')
    ? { apikey: key }
    : { apikey: key, Authorization: `Bearer ${key}` };
}

export async function supabaseRequest(path, init = {}) {
  const { url, key } = getSupabaseConfig();
  let response;
  try {
    response = await fetch(`${url}/rest/v1/${path}`, {
      ...init,
      headers: {
        ...supabaseKeyHeaders(key),
        'Content-Type': 'application/json',
        ...(init.headers || {}),
      },
      signal: AbortSignal.timeout(12_000),
    });
  } catch {
    throw httpError(503, 'AI_AUTH_DB_UNAVAILABLE', 'Le service d’accès IA est momentanément indisponible.');
  }
  if (!response.ok) {
    // Ne pas recopier dans les logs ou réponses les détails du service/secret.
    throw httpError(503, 'AI_AUTH_DB_ERROR', 'Le service d’accès IA ne répond pas correctement.');
  }
  return response.status === 204 ? null : response.json();
}

function tokenHash(token) {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

function sessionSecret() {
  const secret = String(process.env.MSP_AI_SESSION_SECRET || '');
  if (Buffer.byteLength(secret, 'utf8') < 32) {
    throw httpError(503, 'AI_SERVER_NOT_CONFIGURED', 'La signature des sessions IA n’est pas configurée.');
  }
  return secret;
}

function b64url(value) {
  return Buffer.from(value).toString('base64url');
}

function signSession(payload) {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64url(JSON.stringify(payload));
  const unsigned = `${header}.${body}`;
  const signature = createHmac('sha256', sessionSecret()).update(unsigned).digest('base64url');
  return `${unsigned}.${signature}`;
}

function constantTimeEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && timingSafeEqual(a, b);
}

function verifySessionToken(token) {
  if (!token || token.length > 4096) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, signature] = parts;
  const expected = createHmac('sha256', sessionSecret()).update(`${header}.${body}`).digest('base64url');
  if (!constantTimeEqual(signature, expected)) return null;
  let payload;
  try { payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')); }
  catch { return null; }
  if (!payload || typeof payload.sub !== 'string' || !Number.isFinite(payload.exp) || payload.exp <= Math.floor(Date.now() / 1000)) return null;
  return payload;
}

function cookieValue(req, name) {
  const raw = String(req.headers.cookie || '');
  for (const part of raw.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return '';
}

function sessionCookie(value, maxAge) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${COOKIE_NAME}=${encodeURIComponent(value)}; Path=/api/ai; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure}`;
}

async function getActiveTokenByHash(hash) {
  const query = new URLSearchParams({
    select: 'id,token_hash,display_name,role,is_active,expires_at,daily_limit',
    token_hash: `eq.${hash}`,
    limit: '1',
  });
  const rows = await supabaseRequest(`msp_ai_access_tokens?${query.toString()}`);
  const row = Array.isArray(rows) ? rows[0] : null;
  if (!row || row.is_active !== true || !row.expires_at || Date.parse(row.expires_at) <= Date.now()) return null;
  return row;
}

async function getActiveTokenById(id) {
  const query = new URLSearchParams({
    select: 'id,display_name,role,is_active,expires_at,daily_limit',
    id: `eq.${id}`,
    limit: '1',
  });
  const rows = await supabaseRequest(`msp_ai_access_tokens?${query.toString()}`);
  const row = Array.isArray(rows) ? rows[0] : null;
  if (!row || row.is_active !== true || !row.expires_at || Date.parse(row.expires_at) <= Date.now()) return null;
  return row;
}

export async function sessionForRequest(req) {
  const token = verifySessionToken(cookieValue(req, COOKIE_NAME));
  if (!token) return null;
  const access = await getActiveTokenById(token.sub);
  if (!access) return null;
  return { id: access.id, displayName: access.display_name, role: access.role, expiresAt: token.exp * 1000 };
}

export async function handleSession(req, res) {
  try {
    if (req.method === 'GET') {
      const session = await sessionForRequest(req);
      return sendJson(res, 200, { authenticated: Boolean(session), session });
    }
    if (req.method === 'DELETE') {
      requireSameOrigin(req);
      return sendJson(res, 200, { authenticated: false }, { 'Set-Cookie': sessionCookie('', 0) });
    }
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'GET, POST, DELETE');
      return sendJson(res, 405, { error: 'METHOD_NOT_ALLOWED', message: 'Méthode non autorisée.' });
    }
    requireSameOrigin(req);
    const body = await readJsonBody(req, 2048);
    const code = typeof body?.code === 'string' ? body.code.trim() : '';
    if (!/^[A-Za-z0-9_-]{40,60}$/.test(code)) {
      return sendJson(res, 401, { error: 'AI_CODE_INVALID', message: 'Code IA invalide.' });
    }
    const access = await getActiveTokenByHash(tokenHash(code));
    if (!access) return sendJson(res, 401, { error: 'AI_CODE_INVALID', message: 'Code IA invalide ou révoqué.' });
    const now = Math.floor(Date.now() / 1000);
    const expiry = now + SESSION_TTL_SECONDS;
    const signed = signSession({ sub: access.id, role: access.role, name: access.display_name, iat: now, exp: expiry });
    // last_seen_at ne contient aucune donnée de la conversation.
    try {
      const query = new URLSearchParams({ id: `eq.${access.id}` });
      await supabaseRequest(`msp_ai_access_tokens?${query.toString()}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ last_seen_at: new Date().toISOString() }),
      });
    } catch { /* la session peut fonctionner malgré un défaut de télémétrie */ }
    return sendJson(res, 200, {
      authenticated: true,
      session: { displayName: access.display_name, role: access.role, expiresAt: expiry * 1000 },
    }, { 'Set-Cookie': sessionCookie(signed, SESSION_TTL_SECONDS) });
  } catch (error) {
    const status = Number(error?.status) || 500;
    return sendJson(res, status, { error: error?.code || 'AI_SESSION_ERROR', message: error?.message || 'Impossible d’ouvrir la session IA.' });
  }
}

export function handleProviders(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return sendJson(res, 405, { error: 'METHOD_NOT_ALLOWED', message: 'Méthode non autorisée.' });
  }
  return sendJson(res, 200, { providers: getAIProviderCatalogue() });
}

function validateMessages(messages) {
  if (!Array.isArray(messages) || messages.length < 1 || messages.length > MAX_MESSAGES) {
    throw httpError(400, 'INVALID_MESSAGES', `Envoyez entre 1 et ${MAX_MESSAGES} messages.`);
  }
  let total = 0;
  const clean = messages.map((message) => {
    const role = message?.role;
    if (!['system', 'user', 'assistant'].includes(role) || typeof message?.content !== 'string') {
      throw httpError(400, 'INVALID_MESSAGES', 'Format de conversation non pris en charge.');
    }
    const content = message.content.trim();
    if (!content) throw httpError(400, 'INVALID_MESSAGES', 'Un message est vide.');
    total += content.length;
    return { role, content };
  });
  if (total > MAX_TEXT_CHARS) throw httpError(413, 'PROMPT_TOO_LARGE', 'Le texte dépasse la limite autorisée pour une demande IA.');
  return { messages: clean, totalChars: total };
}

function validateImage(image, provider) {
  if (!image) return null;
  const config = providerConfig(provider);
  if (!config?.vision) return null;
  const mimeType = String(image.mimeType || '');
  const base64 = String(image.base64 || '');
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimeType) || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) {
    throw httpError(400, 'INVALID_IMAGE', 'Format d’image non pris en charge.');
  }
  if (!base64 || base64.length > MAX_IMAGE_BASE64_CHARS) {
    throw httpError(413, 'IMAGE_TOO_LARGE', 'L’image est trop volumineuse; réduisez-la ou utilisez le texte OCR extrait.');
  }
  return { mimeType, base64 };
}

async function reserveUsage(session, provider, model, inputChars) {
  const perMinute = Math.max(1, Math.min(20, Number(process.env.MSP_AI_PER_MINUTE_LIMIT) || 3));
  const globalDaily = Math.max(1, Math.min(100_000, Number(process.env.MSP_AI_GLOBAL_DAILY_LIMIT) || 500));
  const result = await supabaseRequest('rpc/msp_ai_reserve_request', {
    method: 'POST',
    body: JSON.stringify({
      p_token_id: session.id,
      p_provider: provider,
      p_model: model,
      p_input_chars: inputChars,
      p_per_minute_limit: perMinute,
      p_global_daily_limit: globalDaily,
    }),
  });
  const reservation = Array.isArray(result) ? result[0] : result;
  if (!reservation?.ok) {
    const reason = reservation?.reason || 'limit';
    if (reason === 'inactive') throw httpError(401, 'AI_ACCESS_REVOKED', 'Votre accès IA n’est plus actif.');
    throw httpError(429, 'AI_RATE_LIMIT', reason === 'minute' ? 'Limite de demandes par minute atteinte; réessayez plus tard.' : 'Quota journalier atteint pour cet accès IA.');
  }
  return reservation.request_id;
}

async function finishUsage(requestId, status, outputChars = 0, errorCode = '') {
  try {
    await supabaseRequest('rpc/msp_ai_finish_request', {
      method: 'POST',
      body: JSON.stringify({
        p_request_id: requestId,
        p_status: status,
        p_output_chars: Math.max(0, Number(outputChars) || 0),
        p_error_code: String(errorCode || '').slice(0, 80),
      }),
    });
  } catch { /* best-effort: never mask the AI response */ }
}

function providerSystem(messages) {
  const userSystem = messages.filter((message) => message.role === 'system').map((message) => message.content);
  return [
    'Tu es l’assistant IA de Master Soutien Pédagogique. Réponds dans la langue de la demande, avec une priorité au français clair et exact.',
    'Pour les demandes scolaires, adapte le niveau et le contexte; distingue les faits, suggestions et incertitudes. N’affirme pas une conformité à un programme officiel sans référence fournie et vérifiée.',
    'Ne demande ni ne révèle de données personnelles d’élèves. Ne prétends pas avoir effectué une action, une recherche web ou une vérification que tu n’as pas réellement faite.',
    ...userSystem,
  ].join('\n\n');
}

function userMessages(messages) {
  return messages.filter((message) => message.role !== 'system').map((message) => ({ role: message.role, content: message.content }));
}

function openAIContent(messages, image) {
  const mapped = userMessages(messages).map(({ role, content }) => ({ role, content }));
  if (image) {
    const index = mapped.map((item) => item.role).lastIndexOf('user');
    if (index < 0) throw httpError(400, 'IMAGE_WITHOUT_USER', 'L’image doit accompagner un message utilisateur.');
    const item = mapped[index];
    mapped[index] = {
      role: 'user',
      content: [
        { type: 'text', text: item.content },
        { type: 'image_url', image_url: { url: `data:${image.mimeType};base64,${image.base64}` } },
      ],
    };
  }
  return mapped;
}

function anthropicContent(messages, image) {
  const mapped = userMessages(messages).map(({ role, content }) => ({ role, content: [{ type: 'text', text: content }] }));
  if (image) {
    const index = mapped.map((item) => item.role).lastIndexOf('user');
    if (index < 0) throw httpError(400, 'IMAGE_WITHOUT_USER', 'L’image doit accompagner un message utilisateur.');
    mapped[index].content.push({ type: 'image', source: { type: 'base64', media_type: image.mimeType, data: image.base64 } });
  }
  return mapped;
}

function geminiContents(messages, image) {
  const mapped = userMessages(messages).map(({ role, content }) => ({
    role: role === 'assistant' ? 'model' : 'user',
    parts: [{ text: content }],
  }));
  if (image) {
    const index = mapped.map((item) => item.role).lastIndexOf('user');
    if (index < 0) throw httpError(400, 'IMAGE_WITHOUT_USER', 'L’image doit accompagner un message utilisateur.');
    mapped[index].parts.push({ inline_data: { mime_type: image.mimeType, data: image.base64 } });
  }
  return mapped;
}

async function upstreamFetch(url, init) {
  try {
    return await fetch(url, { ...init, signal: AbortSignal.timeout(90_000) });
  } catch (error) {
    if (error?.name === 'TimeoutError' || error?.name === 'AbortError') throw httpError(504, 'AI_TIMEOUT', 'Le fournisseur met trop de temps à répondre. Réessayez.');
    throw httpError(502, 'AI_UPSTREAM_UNAVAILABLE', 'Le fournisseur IA est momentanément injoignable.');
  }
}

async function responseJson(response, provider) {
  if (!response.ok) {
    // Le texte d’erreur brut peut contenir des informations de compte ou de requête.
    throw httpError(502, 'AI_PROVIDER_ERROR', `${PROVIDER_DEFINITIONS[provider].label} a refusé la demande (${response.status}). Vérifiez le modèle et le compte API.`);
  }
  try { return await response.json(); }
  catch { throw httpError(502, 'AI_PROVIDER_BAD_RESPONSE', 'Le fournisseur a renvoyé une réponse illisible.'); }
}

async function callProvider(provider, config, model, messages, image) {
  const system = providerSystem(messages);
  const outputLimit = Math.max(256, Math.min(8192, Number(process.env.MSP_AI_MAX_OUTPUT_TOKENS) || DEFAULT_OUTPUT_TOKENS));
  let response;
  let data;

  if (provider === 'openai' || provider === 'mistral' || provider === 'deepseek' || provider === 'perplexity') {
    const base = provider === 'openai' ? 'https://api.openai.com/v1/chat/completions'
      : provider === 'mistral' ? 'https://api.mistral.ai/v1/chat/completions'
        : provider === 'deepseek' ? 'https://api.deepseek.com/chat/completions'
          : 'https://api.perplexity.ai/chat/completions';
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey}` };
    response = await upstreamFetch(base, {
      method: 'POST', headers,
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: system }, ...openAIContent(messages, image)],
        ...(provider === 'openai' ? { max_completion_tokens: outputLimit } : { max_tokens: outputLimit }),
        ...(provider === 'openai' ? {} : { temperature: 0.35 }),
      }),
    });
    data = await responseJson(response, provider);
    return {
      text: data?.choices?.[0]?.message?.content || '',
      citations: Array.isArray(data?.citations) ? data.citations.filter((url) => typeof url === 'string').slice(0, 12) : [],
      inputTokens: Number(data?.usage?.prompt_tokens) || 0,
      outputTokens: Number(data?.usage?.completion_tokens) || 0,
    };
  }

  if (provider === 'anthropic') {
    const content = anthropicContent(messages, image);
    response = await upstreamFetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': config.apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model, system, max_tokens: outputLimit, messages: content }),
    });
    data = await responseJson(response, provider);
    return {
      text: Array.isArray(data?.content) ? data.content.map((part) => part.text || '').join('\n') : '',
      citations: [],
      inputTokens: Number(data?.usage?.input_tokens) || 0,
      outputTokens: Number(data?.usage?.output_tokens) || 0,
    };
  }

  if (provider === 'gemini') {
    response = await upstreamFetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': config.apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: geminiContents(messages, image),
        generationConfig: { maxOutputTokens: outputLimit, temperature: 0.35 },
      }),
    });
    data = await responseJson(response, provider);
    return {
      text: data?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('\n') || '',
      citations: [],
      inputTokens: Number(data?.usageMetadata?.promptTokenCount) || 0,
      outputTokens: Number(data?.usageMetadata?.candidatesTokenCount) || 0,
    };
  }

  if (provider === 'copilot') {
    const endpoint = String(config.endpoint || '').replace(/\/+$/, '');
    const apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-10-21';
    const url = `${endpoint}/openai/deployments/${encodeURIComponent(model)}/chat/completions?api-version=${encodeURIComponent(apiVersion)}`;
    response = await upstreamFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': config.apiKey },
      body: JSON.stringify({
        messages: [{ role: 'system', content: system }, ...openAIContent(messages, image)],
        max_tokens: outputLimit,
        temperature: 0.35,
      }),
    });
    data = await responseJson(response, provider);
    return {
      text: data?.choices?.[0]?.message?.content || '',
      citations: [],
      inputTokens: Number(data?.usage?.prompt_tokens) || 0,
      outputTokens: Number(data?.usage?.completion_tokens) || 0,
    };
  }

  throw httpError(400, 'AI_PROVIDER_UNSUPPORTED', 'Fournisseur IA non pris en charge.');
}

export async function handleAIChat(req, res) {
  let requestId = null;
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return sendJson(res, 405, { error: 'METHOD_NOT_ALLOWED', message: 'Méthode non autorisée.' });
    }
    requireSameOrigin(req);
    const body = await readJsonBody(req);
    if (body?.consent !== true) throw httpError(428, 'AI_CONSENT_REQUIRED', 'Confirmation explicite requise avant chaque envoi IA.');
    const session = await sessionForRequest(req);
    if (!session) throw httpError(401, 'AI_LOGIN_REQUIRED', 'Connectez-vous avec votre code IA sécurisé.');

    const provider = String(body.provider || '');
    const config = providerConfig(provider);
    if (!config) throw httpError(400, 'AI_PROVIDER_UNSUPPORTED', 'Fournisseur IA non pris en charge.');
    if (!config.configured) throw httpError(503, 'AI_PROVIDER_NOT_CONFIGURED', `Le fournisseur ${config.label} n’est pas encore configuré côté serveur.`);
    const requestedModel = String(body.model || config.models[0]);
    if (!config.models.includes(requestedModel)) throw httpError(400, 'AI_MODEL_NOT_ALLOWED', 'Ce modèle n’est pas autorisé par la configuration du serveur.');

    const validated = validateMessages(body.messages);
    const image = validateImage(body.image, provider);
    const inputChars = validated.totalChars + (image ? Math.ceil(image.base64.length * 0.75) : 0);
    requestId = await reserveUsage(session, provider, requestedModel, inputChars);

    const result = await callProvider(provider, config, requestedModel, validated.messages, image);
    const text = String(result.text || '').trim();
    if (!text) throw httpError(502, 'AI_EMPTY_RESPONSE', 'Le fournisseur n’a pas renvoyé de texte exploitable.');
    await finishUsage(requestId, 'success', text.length);
    return sendJson(res, 200, {
      text,
      citations: result.citations || [],
      provider,
      model: requestedModel,
      usage: { inputTokens: result.inputTokens || 0, outputTokens: result.outputTokens || 0 },
    });
  } catch (error) {
    const status = Number(error?.status) || 500;
    if (requestId) await finishUsage(requestId, 'error', 0, error?.code || 'AI_ERROR');
    return sendJson(res, status, { error: error?.code || 'AI_GATEWAY_ERROR', message: error?.message || 'Impossible de traiter la demande IA.' });
  }
}

const PREP_FICHE_STORAGE_BUCKET = 'msp-prep-fiches';
const PREP_FICHE_PAGE_MAX_BYTES = 45_000_000;
const PREP_FICHE_TOTAL_MAX_BYTES = 200 * 1024 * 1024;
const PREP_FICHE_MAX_PAGES = 10_000;
const PREP_FICHE_ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp', 'image/avif']);

function validPrepFicheSnapshotId(value) {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{8,80}$/.test(value);
}

function validPrepFicheObjectPath(path, snapshotId) {
  return typeof path === 'string'
    && path.length <= 300
    && path.startsWith(`${snapshotId}/`)
    && !path.includes('..')
    && !path.includes('\\')
    && /^[A-Za-z0-9_-]{8,80}\/[A-Za-z0-9_-]{1,180}\/page-\d{4,6}\.(?:jpg|png|webp|gif|bmp|avif)$/i.test(path);
}

function validatePrepFicheCloudManifest(value) {
  const manifest = value && typeof value === 'object' ? value : null;
  if (!manifest || manifest.format !== 'msp-prep-fiches-cloud' || manifest.schemaVersion !== 1
    || manifest.publisherId !== 'master-soutien-pedagogique' || !validPrepFicheSnapshotId(manifest.snapshotId)
    || !Array.isArray(manifest.fiches) || manifest.fiches.length > 5000) {
    throw httpError(400, 'PREP_FICHES_MANIFEST_INVALID', 'Le catalogue de fiches n’est pas valide.');
  }
  const ids = new Set();
  const paths = new Set();
  let totalPages = 0;
  let totalBytes = 0;
  for (const fiche of manifest.fiches) {
    if (!fiche || typeof fiche.id !== 'string' || !/^[A-Za-z0-9_-]{1,180}$/.test(fiche.id)
      || ids.has(fiche.id) || typeof fiche.classe !== 'string' || fiche.classe.trim().length < 1 || fiche.classe.length > 120
      || typeof fiche.matiere !== 'string' || fiche.matiere.trim().length < 1 || fiche.matiere.length > 160
      || typeof fiche.titre !== 'string' || fiche.titre.trim().length < 1 || fiche.titre.length > 300
      || (fiche.description !== undefined && (typeof fiche.description !== 'string' || fiche.description.length > 4000))
      || fiche.published !== true || !Number.isFinite(fiche.createdAt) || fiche.createdAt < 0
      || (fiche.updatedAt !== undefined && (!Number.isFinite(fiche.updatedAt) || fiche.updatedAt < 0))
      || !Array.isArray(fiche.pages) || fiche.pages.length < 1 || fiche.pages.length > PREP_FICHE_MAX_PAGES
      || fiche.pageCount !== fiche.pages.length) {
      throw httpError(400, 'PREP_FICHES_MANIFEST_INVALID', 'Une fiche du catalogue est incomplète ou invalide.');
    }
    ids.add(fiche.id);
    for (const page of fiche.pages) {
      if (!page || !validPrepFicheObjectPath(page.path, manifest.snapshotId)
        || paths.has(page.path) || !PREP_FICHE_ALLOWED_TYPES.has(page.mimeType)
        || !Number.isSafeInteger(page.size) || page.size < 1 || page.size > PREP_FICHE_PAGE_MAX_BYTES
        || !Number.isFinite(page.w) || page.w <= 0 || page.w > 50_000
        || !Number.isFinite(page.h) || page.h <= 0 || page.h > 50_000) {
        throw httpError(400, 'PREP_FICHES_MANIFEST_INVALID', 'Une page du catalogue est invalide.');
      }
      paths.add(page.path);
      totalPages++;
      totalBytes += page.size;
      if (totalPages > PREP_FICHE_MAX_PAGES || totalBytes > PREP_FICHE_TOTAL_MAX_BYTES) {
        throw httpError(413, 'PREP_FICHES_TOO_LARGE', 'Le catalogue dépasse la limite de 200 Mo ou contient trop de pages.');
      }
    }
  }
  if (manifest.totalPages !== totalPages || manifest.totalBytes !== totalBytes
    || typeof manifest.publishedAt !== 'string' || !Number.isFinite(Date.parse(manifest.publishedAt))) {
    throw httpError(400, 'PREP_FICHES_MANIFEST_INVALID', 'Les totaux du catalogue ne correspondent pas à ses pages.');
  }
  return manifest;
}

async function prepFicheStorageRequest(path, init = {}) {
  const { url, key } = getSupabaseConfig();
  let response;
  try {
    response = await fetch(`${url}/storage/v1/${path}`, {
      ...init,
      headers: {
        ...supabaseKeyHeaders(key),
        'Content-Type': 'application/json',
        ...(init.headers || {}),
      },
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    throw httpError(503, 'PREP_FICHES_STORAGE_UNAVAILABLE', 'Le stockage cloud des fiches est momentanément injoignable.');
  }
  if (!response.ok) {
    let storageCode = '';
    try {
      const payload = await response.clone().json();
      const candidate = payload?.code || payload?.statusCode || payload?.error;
      if (typeof candidate === 'string') storageCode = candidate.replace(/[^A-Za-z0-9_.-]/g, '').slice(0, 64);
    } catch { /* la réponse Storage n’est pas du JSON */ }
    await response.body?.cancel().catch(() => {});
    // Garder la réponse détaillée dans les logs/affichage sans journaliser l’URL,
    // le nom d’objet, la clé Supabase ou le corps fourni par Storage.
    console.warn('[prep-fiches] Supabase Storage a refusé la requête', {
      status: response.status,
      code: storageCode || undefined,
    });
    const diagnostic = storageCode ? ` (HTTP ${response.status}, ${storageCode})` : ` (HTTP ${response.status})`;
    throw httpError(503, 'PREP_FICHES_STORAGE_ERROR', `Le stockage cloud des fiches n’a pas accepté la demande${diagnostic}. Vérifiez l’URL et la clé serveur Supabase.`);
  }
  if (response.status === 204) return null;
  try { return await response.json(); }
  catch { return {}; }
}

function safeStoragePath(path) {
  return path.split('/').map((part) => encodeURIComponent(part)).join('/');
}

function manifestObjectPaths(manifest) {
  if (!manifest || !Array.isArray(manifest.fiches)) return [];
  return manifest.fiches.flatMap((fiche) => Array.isArray(fiche?.pages)
    ? fiche.pages.map((page) => page?.path).filter((path) => typeof path === 'string' && validPrepFicheObjectPath(path, manifest.snapshotId))
    : []);
}

async function deletePrepFicheObjects(paths) {
  const batches = [];
  for (let i = 0; i < paths.length; i += 500) batches.push(paths.slice(i, i + 500));
  for (let i = 0; i < batches.length; i += 4) {
    const results = await Promise.allSettled(batches.slice(i, i + 4).map((prefixes) => prepFicheStorageRequest(`object/${PREP_FICHE_STORAGE_BUCKET}`, {
      method: 'DELETE',
      body: JSON.stringify({ prefixes }),
    })));
    const failure = results.find((result) => result.status === 'rejected');
    if (failure?.status === 'rejected') throw failure.reason;
  }
}

export async function handlePrepFicheSync(req, res) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return sendJson(res, 405, { error: 'METHOD_NOT_ALLOWED', message: 'Méthode non autorisée.' });
    }
    requireSameOrigin(req);
    const session = await sessionForRequest(req);
    if (!session) throw httpError(401, 'AI_LOGIN_REQUIRED', 'Connectez-vous avec un code IA principal pour publier les fiches.');
    if (session.role !== 'principal') throw httpError(403, 'AI_PRINCIPAL_REQUIRED', 'La publication cloud des fiches est réservée au code IA principal.');

    const body = await readJsonBody(req, 3_800_000);
    const action = String(body?.action || '');
    if (action === 'sign-upload') {
      const snapshotId = String(body.snapshotId || '');
      const path = String(body.path || '');
      const mimeType = String(body.mimeType || '').toLowerCase();
      const size = Number(body.size);
      if (!validPrepFicheSnapshotId(snapshotId) || !validPrepFicheObjectPath(path, snapshotId)
        || !PREP_FICHE_ALLOWED_TYPES.has(mimeType) || !Number.isSafeInteger(size)
        || size < 1 || size > PREP_FICHE_PAGE_MAX_BYTES) {
        throw httpError(400, 'PREP_FICHE_UPLOAD_INVALID', 'La page à synchroniser ne respecte pas les limites autorisées.');
      }
      const encodedPath = safeStoragePath(path);
      // Le client Storage Supabase envoie un objet JSON vide lors de la création
      // d’une URL signée; le corps explicite évite les refus de certains déploiements.
      const signed = await prepFicheStorageRequest(`object/upload/sign/${PREP_FICHE_STORAGE_BUCKET}/${encodedPath}`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      let token = typeof signed?.token === 'string' ? signed.token : '';
      if (!token && typeof signed?.url === 'string') {
        try { token = new URL(signed.url, 'https://storage.invalid').searchParams.get('token') || ''; }
        catch { /* token absent */ }
      }
      if (!token) throw httpError(503, 'PREP_FICHE_SIGN_FAILED', 'Supabase n’a pas créé de lien de dépôt temporaire.');
      const { url } = getSupabaseConfig();
      const uploadUrl = `${url}/storage/v1/object/upload/sign/${PREP_FICHE_STORAGE_BUCKET}/${encodedPath}?token=${encodeURIComponent(token)}`;
      return sendJson(res, 200, { uploadUrl, token, expiresInSeconds: 7200 });
    }

    if (action === 'discard') {
      const snapshotId = String(body.snapshotId || '');
      if (!validPrepFicheSnapshotId(snapshotId) || !Array.isArray(body.paths) || body.paths.length > PREP_FICHE_MAX_PAGES) {
        throw httpError(400, 'PREP_FICHE_DISCARD_INVALID', 'La demande de nettoyage temporaire est invalide.');
      }
      const paths = [...new Set(body.paths)];
      if (paths.some((path) => !validPrepFicheObjectPath(path, snapshotId))) {
        throw httpError(400, 'PREP_FICHE_DISCARD_INVALID', 'Une page à nettoyer n’appartient pas au dépôt temporaire.');
      }
      const currentRows = await supabaseRequest('msp_prep_fiches_catalog?select=version&catalog_id=eq.current');
      if (Array.isArray(currentRows) && currentRows[0]?.version === snapshotId) {
        return sendJson(res, 200, { discarded: 0, published: true });
      }
      await deletePrepFicheObjects(paths);
      return sendJson(res, 200, { discarded: paths.length });
    }

    if (action === 'publish') {
      const manifest = validatePrepFicheCloudManifest(body.manifest);
      const previousRows = await supabaseRequest('msp_prep_fiches_catalog?select=manifest&catalog_id=eq.current');
      const oldPaths = Array.isArray(previousRows) ? manifestObjectPaths(previousRows[0]?.manifest) : [];
      await supabaseRequest('msp_prep_fiches_catalog?on_conflict=catalog_id', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify([{ catalog_id: 'current', version: manifest.snapshotId, manifest }]),
      });
      const newPathSet = new Set(manifestObjectPaths(manifest));
      const obsoletePaths = oldPaths.filter((path) => !newPathSet.has(path));
      try { await deletePrepFicheObjects(obsoletePaths); }
      catch { /* le nouveau catalogue est publié; un nettoyage futur pourra retirer ces anciens objets */ }
      return sendJson(res, 200, { published: true, version: manifest.snapshotId, fiches: manifest.fiches.length, pages: manifest.totalPages, totalBytes: manifest.totalBytes });
    }

    throw httpError(400, 'PREP_FICHE_ACTION_INVALID', 'Action de synchronisation inconnue.');
  } catch (error) {
    const status = Number(error?.status) || 500;
    return sendJson(res, status, { error: error?.code || 'PREP_FICHE_SYNC_ERROR', message: error?.message || 'Impossible de synchroniser les fiches publiées.' });
  }
}

export const AI_GATEWAY_LIMITS = Object.freeze({
  sessionHours: SESSION_TTL_SECONDS / 3600,
  maxMessages: MAX_MESSAGES,
  maxTextChars: MAX_TEXT_CHARS,
  maxBodyBytes: MAX_BODY_BYTES,
  maxImageBase64Chars: MAX_IMAGE_BASE64_CHARS,
});
