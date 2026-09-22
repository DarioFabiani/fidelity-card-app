import { exportCards, importCards, listCardVersions, RAW_DUMP_FORMAT } from '../db';
import { normalizeColor } from './color';
import { normalizeFormat } from '../constants/barcodeFormats';
import {
  deriveKey, encryptJSON, decryptJSON, generateSalt, bufferToBase64, base64ToBuffer,
  PBKDF2_ITERATIONS, LEGACY_PBKDF2_ITERATIONS
} from './crypto';

const EXPORT_FORMAT = 'fidelity-card-app';
const EXPORT_VERSION = 3;

// Bounds for the iteration count read from a backup. The file is outside
// input: an absurd count would freeze the import on key derivation.
const MIN_IMPORT_ITERATIONS = 10000;
const MAX_IMPORT_ITERATIONS = 5000000;

/**
 * Rebuilds each card from known fields only, rather than trusting the file's
 * shape. A backup is external input: passing extra fields straight through
 * would let a hand-edited file smuggle in an `_enc` blob, which the app would
 * then read as an encrypted record it has no key for — and that state locks
 * the whole vault. Types are coerced too, so a missing createdAt can't turn
 * date ordering into NaN comparisons.
 */
export function validateCards(cards) {
  if (!Array.isArray(cards)) throw new Error('Formato non valido');
  const now = Date.now();
  return cards.map(card => {
    const scalar = v => typeof v === 'string' || typeof v === 'number';
    if (!card || !scalar(card.id) || !scalar(card.providerName) || !scalar(card.cardNumber) ||
        card.id === '' || card.providerName === '' || card.cardNumber === '') {
      // Also refuses objects, which would otherwise become "[object Object]".
      throw new Error('Dati carta incompleti');
    }
    return {
      id: String(card.id),
      providerName: String(card.providerName),
      cardNumber: String(card.cardNumber),
      barcodeFormat: normalizeFormat(card.barcodeFormat),
      notes: card.notes ? String(card.notes) : '',
      color: normalizeColor(card.color),
      logoUrl: card.logoUrl ? String(card.logoUrl) : '',
      favorite: card.favorite === true,
      createdAt: Number.isFinite(card.createdAt) ? card.createdAt : now,
      updatedAt: Number.isFinite(card.updatedAt) ? card.updatedAt : now,
      ...(Number.isFinite(card.lastUsedAt) ? { lastUsedAt: card.lastUsedAt } : {})
    };
  });
}

/**
 * Hands a JSON file to the browser. The object URL is revoked a moment later,
 * not straight after click(): Safari and Firefox start the download
 * asynchronously, and revoking synchronously could leave an empty or failed
 * download behind.
 */
export function saveJsonFile(text, filename) {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

function saveFile(text) {
  saveJsonFile(text, `carte-fedelta-${new Date().toISOString().slice(0, 10)}.json`);
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
    const key = await deriveKey(password, salt, PBKDF2_ITERATIONS);
    const data = await encryptJSON(cards, key);
    saveFile(JSON.stringify({
      format: EXPORT_FORMAT,
      version: EXPORT_VERSION,
      encrypted: true,
      salt: bufferToBase64(salt),
      // Stored so a backup stays readable if the default is raised again.
      iterations: PBKDF2_ITERATIONS,
      data
    }, null, 2));
  } else {
    saveFile(JSON.stringify(cards, null, 2));
  }

  return { count: cards.length, skipped };
}

/**
 * Reads a parsed backup file of any kind this app writes: plain array,
 * password-protected backup, or the raw copy saved from the recovery screen.
 * Encrypted ones come back still sealed, with what decryptImport needs.
 */
export function parseBackup(parsed) {
  if (parsed && parsed.format === RAW_DUMP_FORMAT) {
    return parseRawDump(parsed);
  }
  if (parsed && parsed.encrypted) {
    if (!parsed.salt || !parsed.data) throw new Error('File di backup corrotto');
    return {
      encrypted: true,
      salt: parsed.salt,
      data: parsed.data,
      iterations: backupIterations(parsed.iterations)
    };
  }
  if (Array.isArray(parsed) && parsed.some(r => r && r._enc)) {
    // A raw copy from an older build: records only, no salt.
    throw new Error('Questa copia non contiene i parametri di cifratura: non può essere decifrata');
  }
  return { encrypted: false, cards: validateCards(parsed) };
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

    // Guard so the two paths below can never both settle the promise.
    let settled = false;
    const finish = (fn) => (value) => {
      if (settled) return;
      settled = true;
      window.removeEventListener('focus', onFocus);
      fn(value);
    };
    const done = finish(resolve);
    const fail = finish(reject);

    // Dismissing the picker fires `cancel`, never `change`. Without this the
    // promise would hang forever and leave the import button disabled.
    input.addEventListener('cancel', () => done(null));

    // `cancel` only exists in Chrome 113+ / Safari 16.4+. Elsewhere, falling
    // back on focus alone is unsafe — focus often returns before `change` is
    // delivered, and a large file widens that gap. Checking files.length after
    // a delay is the reliable signal: empty really does mean dismissed.
    function onFocus() {
      setTimeout(() => {
        if (!settled && input.files.length === 0) done(null);
      }, 800);
    }
    window.addEventListener('focus', onFocus);

    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return done(null);
      try {
        done(parseBackup(JSON.parse(await file.text())));
      } catch (err) {
        fail(err instanceof SyntaxError ? new Error('Formato non valido') : err);
      }
    };
    input.click();
  });
}

/**
 * Iteration count of an encrypted backup. Files written before the count was
 * stored (version 2) used the legacy value.
 */
export function backupIterations(value) {
  if (value === undefined) return LEGACY_PBKDF2_ITERATIONS;
  if (!Number.isInteger(value) || value < MIN_IMPORT_ITERATIONS || value > MAX_IMPORT_ITERATIONS) {
    throw new Error('File di backup corrotto');
  }
  return value;
}

/** Plain fields of a raw record, as validateCards expects them. */
function stripRaw(record) {
  const { _enc, ...rest } = record;
  return rest;
}

/**
 * Reads the copy saved from the recovery screen. Records still in the clear
 * import as they are; sealed ones need the password, like an encrypted backup.
 */
function parseRawDump(dump) {
  if (!Array.isArray(dump.records)) throw new Error('File di backup corrotto');
  const sealed = dump.records.filter(r => r && r._enc);
  if (!sealed.length) {
    return { encrypted: false, cards: validateCards(dump.records.map(stripRaw)) };
  }
  const enc = dump.encryption;
  if (!enc || !enc.salt) {
    throw new Error('Questa copia non contiene i parametri di cifratura: non può essere decifrata');
  }
  const paramSets = [enc, enc.pending].filter(p => p && p.salt).map(p => ({
    salt: p.salt,
    verifier: p.verifier || null,
    iterations: backupIterations(p.iterations)
  }));
  return { encrypted: true, raw: true, paramSets, records: dump.records };
}

/**
 * Decrypts a raw dump with `password`. Tries each set of key parameters it
 * carries (current, and a key change that was in progress) and keeps the one
 * that opens the records. Records that still cannot be read are left out.
 */
async function decryptRawDump(payload, password) {
  for (const params of payload.paramSets) {
    const key = await deriveKey(password, base64ToBuffer(params.salt), params.iterations);
    if (params.verifier) {
      try {
        await decryptJSON(params.verifier, key);
      } catch {
        continue;
      }
    }
    const cards = [];
    let opened = 0;
    for (const record of payload.records) {
      if (!record || !record._enc) {
        cards.push(stripRaw(record || {}));
        continue;
      }
      try {
        cards.push({ ...stripRaw(record), ...(await decryptJSON(record._enc, key)) });
        opened++;
      } catch {
        // Unreadable under this key: left out.
      }
    }
    if (opened > 0) return validateCards(cards);
  }
  return null;
}

/** Unseals an encrypted backup. Returns null when the password is wrong. */
export async function decryptImport(payload, password) {
  if (payload.raw) {
    try {
      return await decryptRawDump(payload, password);
    } catch {
      return null;
    }
  }
  try {
    const key = await deriveKey(password, base64ToBuffer(payload.salt), payload.iterations ?? LEGACY_PBKDF2_ITERATIONS);
    return validateCards(await decryptJSON(payload.data, key));
  } catch {
    return null;
  }
}

/**
 * Decides what an import writes. Cards match on id; an existing card is only
 * replaced by a copy edited more recently. Restoring an old backup used to
 * overwrite, silently, every change made since it was taken — and re-importing
 * the same file reported every card as "aggiornata".
 */
export function planImport(cards, existingVersions) {
  const toWrite = [];
  let added = 0;
  let updated = 0;
  let kept = 0;
  for (const card of cards) {
    if (!existingVersions.has(card.id)) {
      added++;
      toWrite.push(card);
    } else if (card.updatedAt > existingVersions.get(card.id)) {
      updated++;
      toWrite.push(card);
    } else {
      kept++;
    }
  }
  return { toWrite, added, updated, kept };
}

export async function commitImport(cards) {
  const { toWrite, added, updated, kept } = planImport(cards, await listCardVersions());
  if (toWrite.length) await importCards(toWrite);
  return { added, updated, kept };
}
