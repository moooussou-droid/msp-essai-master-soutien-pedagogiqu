/**
 * Lecture vocale (Web Speech API) — voix du téléphone, aucune connexion requise.
 * Gère le chargement différé des voix (Chrome notamment) et l'arrêt propre.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/** Précharge les voix (certains navigateurs les chargent en différé). */
export function warmVoices(): void {
  if (!isSpeechSupported()) return;
  try {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => { /* déclenche le rafraîchissement */ };
  } catch { /* silencieux */ }
}

export function pickFrenchVoice(): SpeechSynthesisVoice | null {
  if (!isSpeechSupported()) return null;
  try {
    const voices = window.speechSynthesis.getVoices();
    return (
      voices.find(v => v.lang?.toLowerCase().startsWith('fr-fr')) ||
      voices.find(v => v.lang?.toLowerCase().startsWith('fr')) ||
      null
    );
  } catch { return null; }
}

/** v64 : voix d'une langue donnée (ex. 'en' pour « Anglais au Primaire »). */
export function pickVoiceForLang(langPrefix: string): SpeechSynthesisVoice | null {
  if (!isSpeechSupported()) return null;
  try {
    const voices = window.speechSynthesis.getVoices();
    const p = langPrefix.toLowerCase();
    return (
      voices.find(v => v.lang?.toLowerCase() === p || v.lang?.toLowerCase().startsWith(`${p}-`)) ||
      voices.find(v => v.lang?.toLowerCase().startsWith(p.slice(0, 2))) ||
      null
    );
  } catch { return null; }
}

/**
 * v64 : lit un texte dans la langue demandée ('fr-FR' par défaut,
 * 'en-US'/'en-GB' pour l'anglais). Si l'appareil n'a pas de voix pour
 * cette langue, la voix par défaut lit quand même le texte — la
 * prononciation guidée écrite, elle, reste toujours affichée.
 */
export function speakTextLang(text: string, lang = 'fr-FR', rate = 0.9): boolean {
  if (!isSpeechSupported() || !text.trim()) return false;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.rate = rate;
    const voice = pickVoiceForLang(lang);
    if (voice) u.voice = voice;
    window.speechSynthesis.speak(u);
    return true;
  } catch { return false; }
}

/** Lit un texte à voix haute. Retourne false si la synthèse est indisponible. */
export function speakText(text: string): boolean {
  if (!isSpeechSupported() || !text.trim()) return false;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'fr-FR';
    u.rate = 0.95;
    const fr = pickFrenchVoice();
    if (fr) u.voice = fr;
    window.speechSynthesis.speak(u);
    return true;
  } catch { return false; }
}

export function stopSpeaking(): void {
  if (!isSpeechSupported()) return;
  try { window.speechSynthesis.cancel(); } catch { /* silencieux */ }
}

/** Hook pratique : lecture / pause avec état réactif. */
export function useTextToSpeech() {
  const [speaking, setSpeaking] = useState(false);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  const stop = useCallback(() => {
    stopSpeaking();
    setSpeaking(false);
  }, []);

  const speak = useCallback((text: string) => {
    if (!isSpeechSupported() || !text.trim()) return;
    stopSpeaking();
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'fr-FR';
      u.rate = 0.95;
      const fr = pickFrenchVoice();
      if (fr) u.voice = fr;
      utterRef.current = u;
      u.onend = () => { if (utterRef.current === u) setSpeaking(false); };
      u.onerror = () => { if (utterRef.current === u) setSpeaking(false); };
      setSpeaking(true);
      window.speechSynthesis.speak(u);
    } catch { setSpeaking(false); }
  }, []);

  useEffect(() => () => { stopSpeaking(); }, []);

  return { speaking, speak, stop, supported: isSpeechSupported() };
}
