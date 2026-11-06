export const ONLINE_AI_PROVIDERS = ['openai', 'anthropic', 'mistral', 'perplexity', 'gemini', 'deepseek', 'copilot'] as const;
export type OnlineAIProvider = typeof ONLINE_AI_PROVIDERS[number];

export interface AIProviderAvailability {
  id: OnlineAIProvider;
  label: string;
  configured: boolean;
  models: string[];
  vision: boolean;
  webSearch: boolean;
}

export interface AIGatewaySession {
  displayName: string;
  role: 'principal' | 'team';
  expiresAt: number;
}

export interface AIGatewayReply {
  text: string;
  citations: string[];
  provider: OnlineAIProvider;
  model: string;
  usage?: { inputTokens: number; outputTokens: number };
}

export interface GatewayMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GatewayImage {
  mimeType: string;
  base64: string;
}

async function gatewayFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/ai/${path}`, {
      credentials: 'same-origin',
      cache: 'no-store',
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    });
  } catch {
    throw new Error('Passerelle IA inaccessible. Le site doit être publié avec les fonctions serveur Vercel; une prévisualisation statique ne suffit pas.');
  }
  let data: any = {};
  try { data = await response.json(); }
  catch { /* réponse non JSON */ }
  if (!response.ok) {
    const error = new Error(data?.message || `La passerelle IA a répondu ${response.status}.`);
    (error as any).code = data?.error || 'AI_GATEWAY_ERROR';
    (error as any).status = response.status;
    throw error;
  }
  return data as T;
}

export async function loadAIProviderAvailability(): Promise<AIProviderAvailability[]> {
  const result = await gatewayFetch<{ providers: AIProviderAvailability[] }>('providers', { method: 'GET' });
  return Array.isArray(result.providers) ? result.providers : [];
}

export async function getAIGatewaySession(): Promise<AIGatewaySession | null> {
  const result = await gatewayFetch<{ authenticated: boolean; session?: AIGatewaySession | null }>('session', { method: 'GET' });
  return result.authenticated ? result.session || null : null;
}

export async function openAIGatewaySession(code: string): Promise<AIGatewaySession> {
  const result = await gatewayFetch<{ authenticated: boolean; session: AIGatewaySession }>('session', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
  if (!result.authenticated || !result.session) throw new Error('Impossible d’ouvrir votre session IA.');
  return result.session;
}

export async function closeAIGatewaySession(): Promise<void> {
  await gatewayFetch<{ authenticated: boolean }>('session', { method: 'DELETE' });
}

export async function sendAIRequest(
  provider: OnlineAIProvider,
  model: string,
  messages: GatewayMessage[],
  options: { consent: boolean; image?: GatewayImage },
): Promise<AIGatewayReply> {
  if (options.consent !== true) throw new Error('Confirmez l’envoi de cette demande avant de continuer.');
  return gatewayFetch<AIGatewayReply>('chat', {
    method: 'POST',
    body: JSON.stringify({ provider, model, messages, image: options.image, consent: true }),
  });
}
