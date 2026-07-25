import { deriveKey, encryptJSON, decryptJSON, generateSalt, bufferToBase64, base64ToBuffer } from './crypto';
import { DEFAULT_CARD_COLOR } from './color';

function generatePin() {
  // 6-digit numeric PIN, easy to read aloud or type on any keyboard.
  return String(Math.floor(100000 + Math.random() * 900000));
}

/**
 * Builds a shareable link for a card. The card payload is encrypted with
 * AES-256-GCM under a key derived (PBKDF2) from a freshly generated random
 * PIN, so anyone who only intercepts the link cannot read the card data —
 * the PIN must be communicated separately (voice, another message, ...).
 * Returns both the URL (salt + ciphertext, base64) and the PIN to show/share
 * out of band.
 */
export async function encodeCardForShare(card) {
  const payload = {
    p: card.providerName,
    n: card.cardNumber,
    f: card.barcodeFormat,
    c: card.color,
    t: card.notes || ''
  };

  const pin = generatePin();
  const salt = generateSalt();
  const key = await deriveKey(pin, salt);
  const sealed = await encryptJSON(payload, key);

  const combined = `${bufferToBase64(salt)}.${sealed}`;
  const base = window.location.origin + '/fidelity-card-app/';
  return { url: `${base}shared?data=${combined}`, pin };
}

/**
 * Reverses encodeCardForShare(). Needs the PIN the sender communicated
 * separately. Returns null if the data param is malformed, or if the PIN is
 * wrong (AES-GCM authentication failure surfaces as a decrypt rejection).
 */
export async function decodeSharedCard(dataParam, pin) {
  if (!dataParam || !pin) return null;
  const separatorIndex = dataParam.indexOf('.');
  if (separatorIndex <= 0 || separatorIndex === dataParam.length - 1) return null;

  const saltB64 = dataParam.slice(0, separatorIndex);
  const sealed = dataParam.slice(separatorIndex + 1);

  try {
    const salt = base64ToBuffer(saltB64);
    const key = await deriveKey(pin, salt);
    const payload = await decryptJSON(sealed, key);
    return {
      providerName: payload.p,
      cardNumber: payload.n,
      barcodeFormat: payload.f || 'CODE128',
      color: payload.c || DEFAULT_CARD_COLOR,
      notes: payload.t || ''
    };
  } catch {
    return null;
  }
}

/**
 * Checks whether a data param has the minimal shape produced by
 * encodeCardForShare (salt + '.' + ciphertext), without needing the PIN.
 * Used to distinguish a structurally broken/missing link ("Link non
 * valido") from a valid link whose PIN just hasn't been entered yet.
 */
export function isValidShareData(dataParam) {
  if (typeof dataParam !== 'string' || !dataParam) return false;
  const separatorIndex = dataParam.indexOf('.');
  return separatorIndex > 0 && separatorIndex < dataParam.length - 1;
}

export async function shareCard(card, shareData) {
  const { url, pin } = shareData || (await encodeCardForShare(card));

  if (navigator.share) {
    try {
      await navigator.share({
        title: `Carta ${card.providerName}`,
        text: `Ecco la mia carta fedeltà ${card.providerName}. PIN: ${pin}`,
        url
      });
      return { success: true, method: 'share', pin };
    } catch (err) {
      if (err.name === 'AbortError') return { success: false, method: 'cancelled' };
    }
  }

  return { success: false, method: 'fallback', url, pin };
}

export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  }
}
