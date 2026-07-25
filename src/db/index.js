import { openDB } from 'idb';
import { deriveKey, encryptJSON, decryptJSON, generateSalt, bufferToBase64, base64ToBuffer } from '../utils/crypto';

const DB_NAME = 'fidelity-cards-db';
const DB_VERSION = 1;
const STORE_NAME = 'cards';

const ENC_ENABLED_KEY = 'fidelity-encryption-enabled';
const ENC_SALT_KEY = 'fidelity-encryption-salt';

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

export async function getAllCards() {
  const db = await getDB();
  const cards = await db.getAll(STORE_NAME);
  const sorted = cards.sort((a, b) => b.createdAt - a.createdAt);
  if (isEncryptionEnabled()) {
    // Locked (encryption on, key not in memory yet): never leak ciphertext
    // to the UI, just report no cards until unlock() succeeds.
    if (!hasEncryptionKey()) return [];
    return Promise.all(sorted.map(decryptCard));
  }
  return sorted;
}

export async function getCard(id) {
  const db = await getDB();
  const card = await db.get(STORE_NAME, id);
  if (!card) return card;
  if (isEncryptionEnabled()) {
    if (!hasEncryptionKey()) return null;
    return decryptCard(card);
  }
  return card;
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
    color: card.color || '#1565C0',
    logoUrl: card.logoUrl || '',
    createdAt: now,
    updatedAt: now
  };
  const toStore = isEncryptionEnabled() ? await encryptCard(newCard) : newCard;
  await db.add(STORE_NAME, toStore);
  return newCard;
}

export async function updateCard(card) {
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

export async function deleteCard(id) {
  const db = await getDB();
  await db.delete(STORE_NAME, id);
}

export async function importCards(cards) {
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

export async function exportCards() {
  return getAllCards();
}

/**
 * Turns on encryption-at-rest: derives a new key from `password` (random
 * salt, PBKDF2-SHA256, 100000 iterations), stores the salt + enabled flag in
 * localStorage (the salt is not secret), keeps the key only in memory, and
 * re-saves every existing card encrypted.
 */
export async function enableEncryption(password, existingCards) {
  const db = await getDB();
  const salt = generateSalt();
  const key = await deriveKey(password, salt);

  setEncryptionKey(key);
  localStorage.setItem(ENC_SALT_KEY, bufferToBase64(salt));

  const encryptedCards = await Promise.all(existingCards.map(encryptCard));

  const tx = db.transaction(STORE_NAME, 'readwrite');
  for (const card of encryptedCards) {
    await tx.store.put(card);
  }
  await tx.done;

  localStorage.setItem(ENC_ENABLED_KEY, 'true');
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
  clearEncryptionKey();
}

/**
 * Derives the key from `password` using the stored salt and verifies it by
 * attempting to decrypt an existing card. Returns true and keeps the key in
 * memory on success, false (key discarded) if the password is wrong.
 */
export async function unlock(password) {
  const salt = getStoredSalt();
  if (!salt) return false;

  const key = await deriveKey(password, salt);
  const db = await getDB();
  const raw = await db.getAll(STORE_NAME);
  const sample = raw.find(c => c._enc);

  if (!sample) {
    // No encrypted card to verify against yet (e.g. encryption was just
    // enabled with an empty vault) — accept the derived key as-is.
    setEncryptionKey(key);
    return true;
  }

  try {
    await decryptJSON(sample._enc, key);
    setEncryptionKey(key);
    return true;
  } catch {
    return false;
  }
}
