// Numéro WhatsApp unique de contact/support de l'application
export const WHATSAPP_NUMBER = '22963261382';
export const WHATSAPP_DISPLAY = '+229 63 26 13 82';

/** Ouvre WhatsApp avec un message pré-rempli. */
export function openWhatsApp(message: string): void {
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}
