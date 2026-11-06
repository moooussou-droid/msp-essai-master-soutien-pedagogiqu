/// <reference lib="webworker" />
import { env, LogLevel, pipeline, TextStreamer } from '@huggingface/transformers';
import { LOCAL_LLM_MODEL_ID, LOCAL_LLM_MODEL_REVISION } from '../utils/localLLMConfig';
import type { LocalLLMMessage } from '../utils/localLLM';

const scope = self as DedicatedWorkerGlobalScope;
env.useBrowserCache = true;
env.useWasmCache = true;
env.cacheKey = 'msp-local-llm-cache-v1';
env.allowLocalModels = false;
env.logLevel = LogLevel.ERROR;
// Force les runtimes ONNX WASM locaux (aucun chargement du runtime depuis un CDN au premier usage).
const wasmBase = new URL('./', scope.location.href);
if (!env.backends.onnx.wasm) throw new Error('Le runtime WASM local n’est pas disponible; aucun runtime CDN ne sera utilisé.');
env.backends.onnx.wasm.wasmPaths = {
  mjs: new URL('ort-wasm-simd-threaded.asyncify.mjs', wasmBase).href,
  // La version gzip reste <25 Mo pour le téléversement web GitHub.
  // Vercel renvoie Content-Encoding:gzip; fetch/ONNX reçoit les octets WASM décompressés.
  wasm: new URL('ort-wasm-simd-threaded.asyncify.wasm.gz', wasmBase).href,
};

type Device = 'webgpu' | 'wasm';
let generator: any = null;
let activeDevice: Device = 'wasm';
let loadTask: Promise<void> | null = null;

function postStatus(state: string, detail: string, progress = 0, device?: Device) {
  scope.postMessage({ type: 'STATUS', state, detail, progress, device });
}

function safeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error || 'Erreur inconnue');
  return message.length > 500 ? `${message.slice(0, 500)}…` : message;
}

function partialTagSuffixLength(value: string, tag: string): number {
  const limit = Math.min(value.length, tag.length - 1);
  for (let size = limit; size > 0; size--) {
    if (value.endsWith(tag.slice(0, size))) return size;
  }
  return 0;
}

function makeThinkFilter(onText: (text: string) => void) {
  let buffer = '';
  let insideThink = false;
  const open = '<think>';
  const close = '</think>';
  return {
    push(chunk: string) {
      buffer += chunk;
      while (buffer.length) {
        if (!insideThink) {
          const start = buffer.indexOf(open);
          if (start >= 0) {
            if (start) onText(buffer.slice(0, start));
            buffer = buffer.slice(start + open.length);
            insideThink = true;
            continue;
          }
          const keep = partialTagSuffixLength(buffer, open);
          const safeLength = buffer.length - keep;
          if (safeLength > 0) onText(buffer.slice(0, safeLength));
          buffer = buffer.slice(safeLength);
          break;
        }
        const end = buffer.indexOf(close);
        if (end >= 0) {
          buffer = buffer.slice(end + close.length);
          insideThink = false;
          continue;
        }
        const keep = partialTagSuffixLength(buffer, close);
        buffer = keep ? buffer.slice(-keep) : '';
        break;
      }
    },
    finish() {
      if (!insideThink && buffer) onText(buffer.replace(/<\/?think>/gi, ''));
      buffer = '';
    },
  };
}

async function createGenerator(device: Device) {
  const isGpu = device === 'webgpu';
  return pipeline('text-generation', LOCAL_LLM_MODEL_ID, {
    revision: LOCAL_LLM_MODEL_REVISION,
    device,
    dtype: isGpu ? 'q4f16' : 'q4',
    progress_callback: (info: any) => {
      if (info.status === 'progress_total') {
        scope.postMessage({
          type: 'PROGRESS',
          progress: Number(info.progress) || 0,
          detail: `Téléchargement du modèle · ${Math.round(Number(info.progress) || 0)} %`,
        });
      } else if (info.status === 'progress') {
        scope.postMessage({
          type: 'PROGRESS',
          progress: Number(info.progress) || 0,
          detail: `Téléchargement de ${String(info.file || 'un fichier')} · ${Math.round(Number(info.progress) || 0)} %`,
        });
      } else if (info.status === 'ready') {
        postStatus('loading', 'Modèle téléchargé; initialisation du moteur sur cet appareil…', 99, device);
      }
    },
  });
}

async function ensureGenerator(forceDevice?: Device): Promise<void> {
  if (generator) return;
  if (loadTask) return loadTask;
  loadTask = (async () => {
    if (forceDevice === 'wasm') {
      postStatus('loading', 'Chargement explicite de la variante WASM/CPU…', 0, 'wasm');
      generator = await createGenerator('wasm');
      activeDevice = 'wasm';
      return;
    }
    const gpu = (navigator as Navigator & { gpu?: { requestAdapter: () => Promise<unknown> } }).gpu;
    let adapter: unknown = null;
    if (gpu) {
      try { adapter = await gpu.requestAdapter(); }
      catch (error) { postStatus('loading', `WebGPU indisponible; repli vers le processeur. ${safeError(error)}`, 0, 'wasm'); }
    }
    if (adapter) {
      postStatus('loading', 'WebGPU détecté; préparation de la version accélérée…', 0, 'webgpu');
      try {
        generator = await createGenerator('webgpu');
        activeDevice = 'webgpu';
        return;
      } catch (error) {
        // N’enchaîne pas silencieusement le téléchargement de la variante CPU (919 Mo) après une tentative GPU.
        const fallbackError = error instanceof Error ? error : new Error(safeError(error));
        (fallbackError as Error & { fallbackAvailable?: boolean }).fallbackAvailable = true;
        throw fallbackError;
      }
    }
    postStatus('loading', 'Utilisation du moteur WASM/CPU; cette option est plus lente, mais fonctionne sur davantage d’appareils.', 0, 'wasm');
    generator = await createGenerator('wasm');
    activeDevice = 'wasm';
  })().finally(() => { loadTask = null; });
  return loadTask;
}

scope.onmessage = async (event: MessageEvent<any>) => {
  const message = event.data || {};
  const id = Number(message.id);
  if (message.type === 'LOAD') {
    try {
      await ensureGenerator(message.forceDevice === 'wasm' ? 'wasm' : undefined);
      postStatus('ready', activeDevice === 'webgpu' ? 'Modèle chargé; accélération WebGPU active.' : 'Modèle chargé; moteur WASM/CPU actif.', 100, activeDevice);
      scope.postMessage({ type: 'READY', id, device: activeDevice });
    } catch (error) {
      const text = safeError(error);
      const fallbackAvailable = Boolean((error as { fallbackAvailable?: boolean })?.fallbackAvailable);
      postStatus('error', `Impossible de charger le modèle local. Vérifiez la connexion, l’espace de stockage et la mémoire disponible. ${text}`, 0, activeDevice);
      scope.postMessage({ type: 'ERROR', id, message: text, fallbackAvailable });
    }
    return;
  }

  if (message.type !== 'CHAT') return;
  try {
    await ensureGenerator();
    const chat = Array.isArray(message.messages) ? message.messages as LocalLLMMessage[] : [];
    let streamed = '';
    const filter = makeThinkFilter((text) => {
      streamed += text;
      scope.postMessage({ type: 'CHUNK', id, text });
    });
    const streamer = new TextStreamer(generator.tokenizer, {
      skip_prompt: true,
      skip_special_tokens: true,
      callback_function: (text: string) => filter.push(text),
    });
    const result = await generator(chat, {
      max_new_tokens: 384,
      do_sample: true,
      temperature: 0.55,
      top_k: 35,
      repetition_penalty: 1.08,
      streamer,
      tokenizer_encode_kwargs: { truncation: true, max_length: 4096 },
    });
    filter.finish();
    let finalText = streamed;
    const generated = result?.[0]?.generated_text;
    const raw = Array.isArray(generated)
      ? String(generated.at(-1)?.content || '')
      : typeof generated === 'string' ? generated : '';
    if (!finalText.trim() && raw) finalText = raw.replace(/<think>[\s\S]*?<\/think>\s*/gi, '').replace(/<think>[\s\S]*$/i, '').trim();
    scope.postMessage({ type: 'DONE', id, text: finalText.trim() });
  } catch (error) {
    scope.postMessage({ type: 'ERROR', id, message: safeError(error) });
  }
};
