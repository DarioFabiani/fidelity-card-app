import { openDB } from 'idb';
import { deriveKey, encryptJSON, decryptJSON, generateSalt, bufferToBase64, base64ToBuffer } from '../utils/crypto';
import { DEFAULT_CARD_COLOR } from '../utils/color';

const DB_NAME = 'fidelity-cards-db';
const DB_VERSION = 1;
const STORE_NAME = 'cards';

const ENC_ENABLED_KEY = 'fidelity-encryption-enabled';
const ENC_SALT_KEY = 'fidelity-encryption-salt';
// A known constant sealed with the master key at setup time. Decrypting it is
// what proves a password is right, so verification no longer depends on there
// being at least one card in the vault.
const ENC_VERIFIER_KEY = 'fidelity-encryption-verifier';
const VERIFIER_PLAINTEXT = { v: 1 };

// The AES-GCM key derived from the master password. Lives only in memory for
// the lifetime of the tab/app instance — it is NEVER written to IndexedDB,
// localStorage, or anywhere else persistent. Losing it (reload, close app)
// means the app must be unlocked again with the password.
let encryptionKey = null;

export function setEncryptionKey(key) {
  encryptionKey = key;
}

export function clearEncryptionKey() {
  encryptionKey = null;
}

export function hasEncryptionKey() {
  return encryptionKey !== null;
}

/** Whether encryption-at-rest has been turned on for this device. */
export function isEncryptionEnabled() {
  return localStorage.getItem(ENC_ENABLED_KEY) === 'true';
}

function getStoredSalt() {
  const saltB64 = localStorage.getItem(ENC_SALT_KEY);
  return saltB64 ? base64ToBuffer(saltB64) : null;
}

// Fields that contain sensitive card data and get sealed into a single `_enc`
// blob when encryption is active. Everything else (id, barcodeFormat, color,
// logoUrl, createdAt, updatedAt) stays in the clear so lists can be rendered
// and sorted without decrypting every card.
async function encryptCard(card) {
  if (!encryptionKey) throw new Error('Chiave di cifratura non impostata');
  // Guard against sealing an already-sealed record: its plaintext fields are
  // gone, so re-encrypting would overwrite `_enc` with a blob of undefineds
  // and destroy the only copy of the data.
  if (card._enc) throw new Error('Carta già cifrata: rifiuto di ri-cifrarla');
  const { providerName, cardNumber, notes, ...rest } = card;
  const sealed = await encryptJSON(
    { providerName, cardNumber, notes: notes || '' },
    encryptionKey
  );
  return { ...rest, _enc: sealed };
}

async function decryptCard(card) {
  if (!card || !card._enc) return card;
  if (!encryptionKey) throw new Error('Carta cifrata ma chiave non disponibile');
  const { _enc, ...rest } = card;
  const sensitive = await decryptJSON(_enc, encryptionKey);
  return { ...rest, ...sensitive };
}

function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('providerName', 'providerName');
        store.createIndex('createdAt', 'createdAt');
      }
    }
  });
}

/**
 * Detects the inconsistent state where sealed records exist but the enabled
 * flag is off (an interrupted setup, or a vault written by an older build) and
 * turns the flag back on so the app asks to unlock instead of treating
 * ciphertext as plaintext. Returns true when encryption should be considered
 * active. Call before deciding whether to show the unlock screen.
 */
export async function repairEncryptionState() {
  if (isEncryptionEnabled()) return true;

  const db = await getDB();
  const cards = await db.getAll(STORE_NAME);
  if (!cards.some(c => c._enc)) return false;

  // Sealed data with the flag down. If the salt survived we can recover by
  // re-enabling; without it the key is underivable and we must not let the
  // caller carry on as if the vault were readable.
  if (!localStorage.getItem(ENC_SALT_KEY)) {
    throw new Error('Dati cifrati ma parametri di cifratura mancanti: impossibile sbloccare su questo dispositivo.');
  }
  localStorage.setItem(ENC_ENABLED_KEY, 'true');
  return true;
}

/**
 * Stand-in for a record that cannot be decrypted (corrupted blob, or sealed
 * under a key we no longer hold). Carries only the fields that were in the
 * clear anyway — never a fake providerName/cardNumber, and never `_enc`, so
 * it can't be mistaken for real data or re-sealed on top of the original.
 */
function unreadableCard(raw) {
  return {
    id: raw.id,
    color: raw.color,
    favorite: false,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    _unreadable: true
  };
}

export async function getAllCards() {
  const db = await getDB();
  const cards = await db.getAll(STORE_NAME);
  const sorted = cards.sort((a, b) => b.createdAt - a.createdAt);

  // Locked (encryption on, key not in memory): never hand ciphertext to the
  // UI — it would render as a card with undefined fields.
  if (!hasEncryptionKey()) {
    return sorted.some(c => c._enc) ? [] : sorted;
  }

  // allSettled, not all: one corrupted blob must not take the whole list down
  // with it and make the app claim the vault is empty.
  const results = await Promise.allSettled(sorted.map(decryptCard));
  return results.map((r, i) =>
    r.status === 'fulfilled' ? r.value : unreadableCard(sorted[i])
  );
}

export async function getCard(id) {
  const db = await getDB();
  const card = await db.get(STORE_NAME, id);
  if (!card) return card;
  if (!hasEncryptionKey()) {
    return card._enc ? null : card;
  }
  try {
    return await decryptCard(card);
  } catch {
    return unreadableCard(card);
  }
}

export async function addCard(card) {
  const db = await getDB();
  const now = Date.now();
  const newCard = {
    id: crypto.randomUUID(),
    providerName: card.providerName,
    cardNumber: card.cardNumber,
    barcodeFormat: card.barcodeFormat || 'CODE128',
    notes: card.notes || '',
    color: card.color || DEFAULT_CARD_COLOR,
    logoUrl: card.logoUrl || '',
    // Kept in the clear alongside colour/dates so favourites can be grouped
    // without decrypting every card first.
    favorite: card.favorite === true,
    createdAt: now,
    updatedAt: now
  };
  const toStore = isEncryptionEnabled() ? await encryptCard(newCard) : newCard;
  await db.add(STORE_NAME, toStore);
  return newCard;
}

export async function updateCard(card) {
  if (card._unreadable) throw new Error('Carta non leggibile: modifica rifiutata');
  const db = await getDB();
  const existingRaw = await db.get(STORE_NAME, card.id);
  if (!existingRaw) throw new Error('Carta non trovata');
  const existing = isEncryptionEnabled() ? await decryptCard(existingRaw) : existingRaw;
  const updated = {
    ...existing,
    ...card,
    updatedAt: Date.now()
  };
  const toStore = isEncryptionEnabled() ? await encryptCard(updated) : updated;
  await db.put(STORE_NAME, toStore);
  return updated;
}

/**
 * Flips the favourite flag. Goes through updateCard so the encrypt/decrypt
 * round-trip stays in one place.
 */
export async function toggleFavorite(id) {
  const card = await getCard(id);
  if (!card) throw new Error('Carta non trovata');
  // Writing to a record we cannot read would seal a placeholder over the
  // original ciphertext.
  if (card._unreadable) throw new Error('Carta non leggibile');
  return updateCard({ id, favorite: !card.favorite });
}

/**
 * Every stored record exactly as it sits on disk, ciphertext included. The
 * escape hatch for a vault that cannot be opened: it needs no key and cannot
 * fail, so the user always has something to save before resetting.
 */
export async function dumpRawRecords() {
  const db = await getDB();
  return db.getAll(STORE_NAME);
}

/**
 * Wipes every card and all encryption settings. Last resort for a vault stuck
 * in an unopenable state — destructive, so only ever behind a confirmation.
 */
export async function resetEverything() {
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  await tx.store.clear();
  await tx.done;
  localStorage.removeItem(ENC_ENABLED_KEY);
  localStorage.removeItem(ENC_SALT_KEY);
  localStorage.removeItem(ENC_VERIFIER_KEY);
  clearEncryptionKey();
}

export async function deleteCard(id) {
  const db = await getDB();
  await db.delete(STORE_NAME, id);
}

export async function importCards(cards) {
  // Last line of defence: a record carrying `_enc` from outside would look
  // like ciphertext this device has no key for, and lock the whole vault.
  if (cards.some(c => c && c._enc)) {
    throw new Error('Il file contiene dati cifrati non validi');
  }
  const db = await getDB();
  // Encrypt (if needed) before opening the transaction: crypto.subtle calls
  // are async and can span multiple ticks, which would otherwise let the
  // IndexedDB transaction auto-commit/close while we're still awaiting.
  const toStore = isEncryptionEnabled()
    ? await Promise.all(cards.map(encryptCard))
    : cards;
  const tx = db.transaction(STORE_NAME, 'readwrite');
  for (const card of toStore) {
    await tx.store.put(card);
  }
  await tx.done;
}

/**
 * Cards for a backup file, plus how many were left out. Unreadable records are
 * excluded on purpose: writing a placeholder into a backup would produce a
 * file that re-imports as a broken card, and the caller should tell the user
 * the export is not complete.
 */
export async function exportCards() {
  const all = await getAllCards();
  const cards = all.filter(c => !c._unreadable);
  return { cards, skipped: all.length - cards.length };
}

/**
 * Turns on encryption-at-rest: derives a new key from `password` (random
 * salt, PBKDF2-SHA256, 100000 iterations), stores the salt + enabled flag in
 * localStorage (the salt is not secret), keeps the key only in memory, and
 * re-saves every existing card encrypted.
 */
export async function enableEncryption(password) {
  const db = await getDB();
  const salt = generateSalt();
  const key = await deriveKey(password, salt);
  const verifier = await encryptJSON(VERIFIER_PLAINTEXT, key);

  try {
    setEncryptionKey(key);

    // Order matters. The flag goes up BEFORE any card is sealed, so an
    // interruption can only ever leave "flag on, some cards still plaintext" —
    // which reads fine, because decryptCard passes untouched records through.
    // The reverse order would leave sealed cards with the flag off: the app
    // would think it is unencrypted, hand ciphertext to the UI, and a second
    // setup attempt would overwrite it.
    //
    // These three writes sit inside the try as well: localStorage can throw
    // (quota, disabled storage), and if the third one failed from outside it
    // the rollback below would never run — leaving a stale salt and verifier
    // for a password nobody holds, plus the key still in memory.
    localStorage.setItem(ENC_SALT_KEY, bufferToBase64(salt));
    localStorage.setItem(ENC_VERIFIER_KEY, verifier);
    localStorage.setItem(ENC_ENABLED_KEY, 'true');

    // Read the raw rows here rather than taking them from the caller: what the
    // UI holds are decrypted views (or placeholders for unreadable records),
    // and sealing one of those would overwrite real ciphertext with a fake.
    const raw = await db.getAll(STORE_NAME);
    const encryptedCards = await Promise.all(
      raw.filter(c => !c._enc).map(encryptCard)
    );

    const tx = db.transaction(STORE_NAME, 'readwrite');
    for (const card of encryptedCards) {
      await tx.store.put(card);
    }
    await tx.done;
  } catch (err) {
    // Nothing was sealed under a key we are about to forget: roll the flags
    // back so the vault stays plainly readable rather than half-locked.
    localStorage.removeItem(ENC_ENABLED_KEY);
    localStorage.removeItem(ENC_SALT_KEY);
    localStorage.removeItem(ENC_VERIFIER_KEY);
    clearEncryptionKey();
    throw err;
  }
}

/**
 * Turns off encryption-at-rest: decrypts every card with the in-memory key
 * and re-saves them in the clear, then removes the salt/flag and drops the
 * key from memory.
 */
export async function disableEncryption() {
  const db = await getDB();
  const raw = await db.getAll(STORE_NAME);
  const decrypted = await Promise.all(raw.map(decryptCard));

  const tx = db.transaction(STORE_NAME, 'readwrite');
  for (const card of decrypted) {
    await tx.store.put(card);
  }
  await tx.done;

  localStorage.removeItem(ENC_ENABLED_KEY);
  localStorage.removeItem(ENC_SALT_KEY);
  localStorage.removeItem(ENC_VERIFIER_KEY);
  clearEncryptionKey();
}

/**
 * Derives the key from `password` using the stored salt and verifies it against
 * the stored verifier. Returns true and keeps the key in memory on success,
 * false (key discarded) if the password is wrong.
 */
/**
 * Seals any record still sitting in the clear while encryption is on — the
 * residue of an enableEncryption that was interrupted partway through, which
 * would otherwise stay unencrypted at rest forever while the vault claims to
 * be protected.
 *
 * MUST only be called once the password has actually been verified. Running it
 * after an unverified unlock would seal plaintext cards under an arbitrary
 * password and make them unrecoverable.
 *
 * Silent and non-fatal: the user has nothing to decide here, and a failure
 * just means the next unlock tries again.
 */
async function sealPlaintextResidue() {
  if (!encryptionKey) return;
  try {
    const db = await getDB();
    const raw = await db.getAll(STORE_NAME);
    const pending = raw.filter(c => !c._enc);
    if (!pending.length) return;

    // Encrypt outside the transaction: crypto.subtle spans ticks and would let
    // an open IndexedDB transaction auto-commit underneath us.
    const sealed = await Promise.all(pending.map(encryptCard));
    const tx = db.transaction(STORE_NAME, 'readwrite');
    for (const card of sealed) {
      await tx.store.put(card);
    }
    await tx.done;
  } catch {
    // Leave it for next time rather than blocking the unlock.
  }
}

export async function unlock(password) {
  const salt = getStoredSalt();
  if (!salt) return false;

  const key = await deriveKey(password, salt);
  const verifier = localStorage.getItem(ENC_VERIFIER_KEY);

  if (verifier) {
    try {
      await decryptJSON(verifier, key);
    } catch {
      return false;
    }
    setEncryptionKey(key);
    await sealPlaintextResidue();
    return true;
  }

  // Vault set up before verifiers existed: check against a sealed card.
  const db = await getDB();
  const raw = await db.getAll(STORE_NAME);
  const sample = raw.find(c => c._enc);

  if (!sample) {
    // Empty legacy vault — nothing to validate against. Accept so the user
    // isn't locked out of their own (empty) vault, but deliberately do NOT
    // write a verifier: doing so would pin whatever password was typed and
    // permanently reject the real one. No residue sealing here either: the
    // password was never verified, and sealing plaintext under it would
    // destroy those cards.
    setEncryptionKey(key);
    return true;
  }

  try {
    await decryptJSON(sample._enc, key);
  } catch {
    return false;
  }

  setEncryptionKey(key);
  localStorage.setItem(ENC_VERIFIER_KEY, await encryptJSON(VERIFIER_PLAINTEXT, key));
  await sealPlaintextResidue();
  return true;
}
