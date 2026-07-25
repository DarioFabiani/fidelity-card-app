import { exportCards, importCards } from '../db';
import { DEFAULT_CARD_COLOR } from './color';
import { deriveKey, encryptJSON, decryptJSON, generateSalt, bufferToBase64, base64ToBuffer } from './crypto';

const EXPORT_FORMAT = 'fidelity-card-app';
const EXPORT_VERSION = 2;

/**
 * Rebuilds each card from known fields only, rather than trusting the file's
 * shape. A backup is external input: passing extra fields straight through
 * would let a hand-edited file smuggle in an `_enc` blob, which the app would
 * then read as an encrypted record it has no key for — and that state locks
 * the whole vault. Types are coerced too, so a missing createdAt can't turn
 * date ordering into NaN comparisons.
 */
function validateCards(cards) {
  if (!Array.isArray(cards)) throw new Error('Formato non valido');
  const now = Date.now();
  return cards.map(card => {
    if (!card || !card.id || !card.providerName || !card.cardNumber) {
      throw new Error('Dati carta incompleti');
    }
    return {
      id: String(card.id),
      providerName: String(card.providerName),
      cardNumber: String(card.cardNumber),
      barcodeFormat: card.barcodeFormat ? String(card.barcodeFormat) : 'CODE128',
      notes: card.notes ? String(card.notes) : '',
      color: card.color ? String(card.color) : DEFAULT_CARD_COLOR,
      logoUrl: card.logoUrl ? String(card.logoUrl) : '',
      favorite: card.favorite === true,
      createdAt: Number.isFinite(card.createdAt) ? card.createdAt : now,
      updatedAt: Number.isFinite(card.updatedAt) ? card.updatedAt : now
    };
  });
}

function saveFile(text) {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `carte-fedelta-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Writes a backup file. With a password the card data is sealed with
 * AES-256-GCM under a key derived from that password and a salt generated for
 * this file alone — so the backup stays protected even though it leaves the
 * device. Without one the legacy plain array is written.
 */
export async function downloadExport(password) {
  const { cards, skipped } = await exportCards();

  if (password) {
    const salt = generateSalt();
    const key = await deriveKey(password, salt);
    const data = await encryptJSON(cards, key);
    saveFile(JSON.stringify({
      format: EXPORT_FORMAT,
      version: EXPORT_VERSION,
      encrypted: true,
      salt: bufferToBase64(salt),
      data
    }, null, 2));
  } else {
    saveFile(JSON.stringify(cards, null, 2));
  }

  return { count: cards.length, skipped };
}

/**
 * Opens the file picker and parses the chosen backup. Encrypted backups are
 * returned undecrypted — the caller collects the password and calls
 * `decryptImport` — so the UI only asks for one when the file needs it.
 * Resolves to null if the user dismisses the picker.
 */
export function pickImportFile() {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    // Dismissing the picker fires `cancel`, never `change`. Without this the
    // promise would hang forever and leave the import button disabled.
    input.addEventListener('cancel', () => resolve(null));
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return resolve(null);
      try {
        const parsed = JSON.parse(await file.text());
        if (parsed && parsed.encrypted) {
          if (!parsed.salt || !parsed.data) throw new Error('File di backup corrotto');
          resolve({ encrypted: true, salt: parsed.salt, data: parsed.data });
        } else {
          resolve({ encrypted: false, cards: validateCards(parsed) });
        }
      } catch (err) {
        reject(err instanceof SyntaxError ? new Error('Formato non valido') : err);
      }
    };
    input.click();
  });
}

/** Unseals an encrypted backup. Returns null when the password is wrong. */
export async function decryptImport(payload, password) {
  try {
    const key = await deriveKey(password, base64ToBuffer(payload.salt));
    return validateCards(await decryptJSON(payload.data, key));
  } catch {
    return null;
  }
}

export async function commitImport(cards) {
  await importCards(cards);
  return cards.length;
}
