import { openDB } from 'idb';
import {
  deriveKey, encryptJSON, decryptJSON, generateSalt, bufferToBase64, base64ToBuffer,
  PBKDF2_ITERATIONS, LEGACY_PBKDF2_ITERATIONS
} from '../utils/crypto';
import { DEFAULT_CARD_COLOR } from '../utils/color';

const DB_NAME = 'fidelity-cards-db';
const DB_VERSION = 1;
const STORE_NAME = 'cards';

// Exported so other tabs can watch it via the `storage` event.
export const ENC_ENABLED_KEY = 'fidelity-encryption-enabled';
// Exported so other tabs can tell when the key has been replaced.
export const ENC_SALT_KEY = 'fidelity-encryption-salt';
// PBKDF2 iteration count the current salt is used with. Absent on vaults set
// up before it was stored, which used LEGACY_PBKDF2_ITERATIONS.
const ENC_ITERATIONS_KEY = 'fidelity-encryption-iterations';
// Parameters of a key change in progress (see rekeyVault). Present only
// between writing the re-sealed cards and promoting the new parameters.
// Exported: other tabs lock as soon as a key change starts.
export const ENC_PENDING_KEY = 'fidelity-encryption-pending';
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
// Bumped whenever the in-memory key is set or dropped. A long operation
// (rekeyVault) compares it before writing, to notice that the vault was
// locked — or unlocked with another key — while it was working.
let keyGeneration = 0;

function setEncryptionKey(key) {
  encryptionKey = key;
  keyGeneration++;
}

function clearEncryptionKey() {
  encryptionKey = null;
  keyGeneration++;
}

/**
 * Runs `fn` holding a lock shared by every tab of the app. Unlocking and
 * re-keying read the key parameters, rewrite every record and then the
 * parameters: two tabs doing that at once (both upgrading a legacy vault on
 * unlock, say) could each promote their own salt over cards sealed by the
 * other. Where the Web Locks API is missing, runs unguarded.
 */
//
// Card writes take it too: a card saved or imported in one tab while another
// re-keys would be sealed with the old key after the re-sealed set was read,
// and end up unreadable. Nothing that holds the lock calls these writers, so
// the lock is never requested twice by the same chain.
function withVaultLock(fn) {
  const locks = globalThis.navigator?.locks;
  return locks ? locks.request('fidelity-vault', fn) : fn();
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

function getStoredIterations() {
  const stored = Number(localStorage.getItem(ENC_ITERATIONS_KEY));
  return Number.isInteger(stored) && stored > 0 ? stored : LEGACY_PBKDF2_ITERATIONS;
}

function clearKeyParams() {
  localStorage.removeItem(ENC_ENABLED_KEY);
  localStorage.removeItem(ENC_SALT_KEY);
  localStorage.removeItem(ENC_VERIFIER_KEY);
  localStorage.removeItem(ENC_ITERATIONS_KEY);
  localStorage.removeItem(ENC_PENDING_KEY);
}

function readPendingParams() {
  try {
    const pending = JSON.parse(localStorage.getItem(ENC_PENDING_KEY) || 'null');
    return pending && pending.salt && pending.verifier && Number.isInteger(pending.iterations)
      ? pending
      : null;
  } catch {
    return null;
  }
}

/** Makes `params` ({salt, verifier, iterations}) the vault's current key. */
function writeKeyParams({ salt, verifier, iterations }) {
  localStorage.setItem(ENC_SALT_KEY, salt);
  localStorage.setItem(ENC_VERIFIER_KEY, verifier);
  localStorage.setItem(ENC_ITERATIONS_KEY, String(iterations));
}

// Fields that contain sensitive card data and get sealed into a single `_enc`
// blob when encryption is active. Everything else (id, barcodeFormat, color,
// logoUrl, createdAt, updatedAt) stays in the clear so lists can be rendered
// and sorted without decrypting every card.
// Takes the key explicitly for rekeyVault. Kept apart from encryptCard,
// rather than an optional second parameter, because encryptCard is handed to
// Array#map — which would pass the index as the key.
async function encryptCardWith(card, key) {
  if (!key) throw new Error('Chiave di cifratura non impostata');
  // Guard against sealing an already-sealed record: its plaintext fields are
  // gone, so re-encrypting would overwrite `_enc` with a blob of undefineds
  // and destroy the only copy of the data.
  if (card._enc) throw new Error('Carta già cifrata: rifiuto di ri-cifrarla');
  const { providerName, cardNumber, notes, ...rest } = card;
  const sealed = await encryptJSON(
    { providerName, cardNumber, notes: notes || '' },
    key
  );
  return { ...rest, _enc: sealed };
}

async function decryptCardWith(card, key) {
  if (!card || !card._enc) return card;
  if (!key) throw new Error('Carta cifrata ma chiave non disponibile');
  const { _enc, ...rest } = card;
  const sensitive = await decryptJSON(_enc, key);
  return { ...rest, ...sensitive };
}

function encryptCard(card) {
  return encryptCardWith(card, encryptionKey);
}

function decryptCard(card) {
  return decryptCardWith(card, encryptionKey);
}

// One connection for the lifetime of the tab. Opening a fresh one on every
// call left a trail of unclosed connections behind each read, and any of them
// would block a future schema upgrade until the tab was closed.
let dbPromise = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('providerName', 'providerName');
          store.createIndex('createdAt', 'createdAt');
        }
      },
      // A newer build open in another tab wants to upgrade: step aside so it
      // is not stuck, and reconnect on the next call.
      blocking() {
        dbPromise?.then(db => db.close());
        dbPromise = null;
      },
      terminated() {
        dbPromise = null;
      }
    }).catch(err => {
      // Don't cache a failure: the next call gets a fresh attempt.
      dbPromise = null;
      throw err;
    });
  }
  return dbPromise;
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
    lastUsedAt: raw.lastUsedAt,
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

export function addCard(card) {
  return withVaultLock(() => addCardHoldingLock(card));
}

async function addCardHoldingLock(card) {
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
    updatedAt: now,
    lastUsedAt: now
  };
  const toStore = isEncryptionEnabled() ? await encryptCard(newCard) : newCard;
  await db.add(STORE_NAME, toStore);
  return newCard;
}

export function updateCard(card) {
  return withVaultLock(() => updateCardHoldingLock(card));
}

async function updateCardHoldingLock(card) {
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
 * Records that the card was just shown, so "Recenti" can put the cards
 * actually used at the till on top.
 *
 * lastUsedAt sits in the clear (like favourite and the dates), so this writes
 * the raw record back untouched apart from that one field: no decryption, no
 * key needed, and updatedAt stays put — it keys the share-link cache, and
 * merely looking at a card must not retire a link already sent. Best effort:
 * a failure only costs the ordering.
 */
export async function touchCard(id) {
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const raw = await tx.store.get(id);
    if (raw) await tx.store.put({ ...raw, lastUsedAt: Date.now() });
    await tx.done;
  } catch {
    // Ordering only.
  }
}

/**
 * Drops the key from memory. The data stays sealed on disk; the next read
 * needs the password again.
 */
export function lock() {
  clearEncryptionKey();
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

export const RAW_DUMP_FORMAT = 'fidelity-card-app-raw';

/**
 * The raw records plus the key parameters (salt, verifier, iteration count —
 * none of them secret). Without the salt the dump could never be decrypted,
 * not even by someone who remembers the password later: with it, the dump can
 * be imported back once the password comes to mind.
 */
export async function dumpVault() {
  const salt = localStorage.getItem(ENC_SALT_KEY);
  return {
    format: RAW_DUMP_FORMAT,
    version: 1,
    encryption: salt
      ? {
          salt,
          verifier: localStorage.getItem(ENC_VERIFIER_KEY),
          iterations: getStoredIterations(),
          pending: readPendingParams()
        }
      : null,
    records: await dumpRawRecords()
  };
}

/**
 * Wipes every card and all encryption settings. Last resort for a vault stuck
 * in an unopenable state — destructive, so only ever behind a confirmation.
 */
export function resetEverything() {
  return withVaultLock(() => resetEverythingHoldingLock());
}

async function resetEverythingHoldingLock() {
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  await tx.store.clear();
  await tx.done;
  clearKeyParams();
  clearEncryptionKey();
}

export function deleteCard(id) {
  return withVaultLock(() => deleteCardHoldingLock(id));
}

async function deleteCardHoldingLock(id) {
  const db = await getDB();
  await db.delete(STORE_NAME, id);
}

/**
 * id -> updatedAt of every stored card (both in the clear), so an import can
 * tell new cards from newer and older copies of existing ones. A record that
 * cannot be decrypted maps to -Infinity: any copy from a backup beats it —
 * repairing such a card is exactly what a backup is for, and comparing its
 * clear-text date kept the broken record over a good copy.
 */
export async function listCardVersions() {
  const db = await getDB();
  const raw = await db.getAll(STORE_NAME);
  const versions = new Map();
  for (const r of raw) {
    let readable = true;
    // Without the key nothing can be judged: treat the card as readable
    // rather than let an import overwrite every sealed record.
    if (r._enc && encryptionKey) {
      try {
        await decryptCardWith(r, encryptionKey);
      } catch {
        readable = false;
      }
    }
    versions.set(r.id, readable ? (Number.isFinite(r.updatedAt) ? r.updatedAt : 0) : -Infinity);
  }
  return versions;
}

export function importCards(cards) {
  return withVaultLock(() => importCardsHoldingLock(cards));
}

async function importCardsHoldingLock(cards) {
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
 * salt, PBKDF2-SHA256, PBKDF2_ITERATIONS), stores the salt + enabled flag in
 * localStorage (the salt is not secret), keeps the key only in memory, and
 * re-saves every existing card encrypted.
 */
export function enableEncryption(password) {
  return withVaultLock(() => enableEncryptionHoldingLock(password));
}

async function enableEncryptionHoldingLock(password) {
  const db = await getDB();
  const salt = generateSalt();
  const iterations = PBKDF2_ITERATIONS;
  const key = await deriveKey(password, salt, iterations);
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
    writeKeyParams({ salt: bufferToBase64(salt), verifier, iterations });
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
    clearKeyParams();
    clearEncryptionKey();
    throw err;
  }
}

/**
 * Turns off encryption-at-rest: decrypts every card with the in-memory key
 * and re-saves them in the clear, then removes the salt/flag and drops the
 * key from memory.
 */
export function disableEncryption() {
  return withVaultLock(() => disableEncryptionHoldingLock());
}

async function disableEncryptionHoldingLock() {
  const db = await getDB();
  const raw = await db.getAll(STORE_NAME);
  const decrypted = await Promise.all(raw.map(decryptCard));

  const tx = db.transaction(STORE_NAME, 'readwrite');
  for (const card of decrypted) {
    await tx.store.put(card);
  }
  await tx.done;

  clearKeyParams();
  clearEncryptionKey();
}

/**
 * Re-seals every card under a key derived from `newPassword` with a fresh salt
 * and the current iteration count. Used to change the password and to move a
 * vault off an older, weaker iteration count.
 *
 * This is the one operation that rewrites every sealed record, so it is built
 * to survive being cut off at any point (app killed, battery, crash):
 *
 *   1. everything is decrypted and re-encrypted in memory — nothing written;
 *   2. the NEW parameters are parked under ENC_PENDING_KEY, next to the
 *      current ones, which stay untouched;
 *   3. all re-sealed cards are written in ONE IndexedDB transaction, so the
 *      store holds either every old record or every new one, never a mix;
 *   4. the pending parameters are promoted to current.
 *
 * Cut off before 3 commits: the old key still opens everything, and unlock
 * throws the parked parameters away. Cut off between 3 and 4: the cards are
 * under the new key, whose parameters are still parked — unlock tries both
 * and keeps whichever actually opens the cards. At no point are the cards
 * sealed under a key whose salt has been lost.
 *
 * Records that cannot be decrypted now are left exactly as they are: they are
 * already unreadable, and re-sealing a placeholder would destroy the original.
 */
async function rekeyVault(oldKey, newPassword, generation) {
  // The key is passed in once, not read from the global on every record: a
  // lock (auto-lock, the padlock, another tab) partway through used to make
  // every record fail to decrypt, get skipped, and the new parameters were
  // promoted anyway — leaving every card under a key nobody could derive.
  // `generation` is the caller's snapshot of keyGeneration, taken before its
  // own first await, so a lock at any point of the operation is noticed.

  const salt = generateSalt();
  const iterations = PBKDF2_ITERATIONS;
  const newKey = await deriveKey(newPassword, salt, iterations);
  const params = {
    salt: bufferToBase64(salt),
    verifier: await encryptJSON(VERIFIER_PLAINTEXT, newKey),
    iterations
  };

  const db = await getDB();
  const raw = await db.getAll(STORE_NAME);
  const resealed = [];
  let sealedCount = 0;
  let unreadable = 0;
  for (const record of raw) {
    if (record._enc) sealedCount++;
    let plain;
    try {
      plain = await decryptCardWith(record, oldKey);
    } catch {
      unreadable++;
      continue;
    }
    resealed.push(await encryptCardWith(plain, newKey));
  }

  // Not one sealed record opens with the key we hold: it is not the key the
  // cards are under (another tab re-keyed them). Writing now would promote
  // parameters that open nothing.
  if (sealedCount > 0 && unreadable === sealedCount) {
    throw new Error('Le carte non si aprono con la chiave attuale: sblocca di nuovo e riprova');
  }
  if (keyGeneration !== generation) {
    throw new Error('Il vault è stato bloccato durante l\'operazione: nessuna modifica fatta');
  }

  localStorage.setItem(ENC_PENDING_KEY, JSON.stringify(params));

  try {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    for (const card of resealed) {
      await tx.store.put(card);
    }
    await tx.done;
  } catch (err) {
    // Nothing committed: the old key still opens everything.
    localStorage.removeItem(ENC_PENDING_KEY);
    throw err;
  }

  // From here the cards are under the new key: its parameters must be
  // promoted whatever happened meanwhile. The key goes back in memory only if
  // nobody locked the vault while we worked.
  if (keyGeneration === generation) setEncryptionKey(newKey);
  try {
    writeKeyParams(params);
    localStorage.removeItem(ENC_PENDING_KEY);
  } catch {
    // The cards are already under the new key and its parameters are still
    // parked: the next unlock finishes the promotion.
  }
}

/**
 * Checks `password` against a set of key parameters. Resolves to the derived
 * key when it matches, null otherwise.
 */
async function keyForParams(password, { salt, verifier, iterations }) {
  const key = await deriveKey(password, base64ToBuffer(salt), iterations);
  try {
    await decryptJSON(verifier, key);
    return key;
  } catch {
    return null;
  }
}

/**
 * Changes the master password. The current one is asked again even though
 * the vault is open: an unlocked phone left on a table must not be enough to
 * take the vault over. Resolves to false when `currentPassword` is wrong.
 */
export function changePassword(currentPassword, newPassword) {
  return withVaultLock(async () => {
    if (!hasEncryptionKey()) throw new Error('Sblocca prima il vault');
    const generation = keyGeneration;
    const saltB64 = localStorage.getItem(ENC_SALT_KEY);
    if (!saltB64) throw new Error('Parametri di cifratura mancanti');
    const verifier = localStorage.getItem(ENC_VERIFIER_KEY);
    const iterations = getStoredIterations();

    let current;
    if (verifier) {
      current = await keyForParams(currentPassword, { salt: saltB64, verifier, iterations });
    } else {
      // Vault from before verifiers existed: check against the cards instead.
      const db = await getDB();
      if (!(await db.getAll(STORE_NAME)).some(c => c._enc)) {
        throw new Error('Impossibile verificare la password attuale: aggiungi una carta e riprova');
      }
      const key = await deriveKey(currentPassword, base64ToBuffer(saltB64), iterations);
      current = (await keyOpensRecords(key)) ? key : null;
    }
    if (!current) return false;

    // Re-seal with the key just verified, not whatever sits in memory.
    await rekeyVault(current, newPassword, generation);
    return true;
  });
}

/** Whether any sealed record opens with `key` (true when there are none). */
async function keyOpensRecords(key) {
  const db = await getDB();
  const sealed = (await db.getAll(STORE_NAME)).filter(c => c._enc);
  if (!sealed.length) return true;
  for (const record of sealed) {
    try {
      await decryptCardWith(record, key);
      return true;
    } catch {
      // Could be a single corrupted record; keep looking.
    }
  }
  return false;
}

/**
 * Unlock while a key change was interrupted (see rekeyVault): the cards are
 * under either the old or the new key, and the password typed may be either.
 * Keeps the parameters that both match the password and open the cards.
 */
async function unlockAfterInterruptedRekey(password, pending) {
  const current = {
    salt: localStorage.getItem(ENC_SALT_KEY),
    verifier: localStorage.getItem(ENC_VERIFIER_KEY),
    iterations: getStoredIterations()
  };
  const candidates = [
    { params: pending, isPending: true },
    ...(current.salt && current.verifier ? [{ params: current, isPending: false }] : [])
  ];

  // Matching a verifier is not enough: the old password still matches the
  // old verifier after the cards have moved to the new key. Only a key that
  // actually opens the cards is kept — adopting the other one would throw
  // away the only parameters that can read them. (A vault whose records are
  // all corrupted stays locked here; the recovery screen covers that.)
  let matched = null;
  for (const candidate of candidates) {
    const key = await keyForParams(password, candidate.params);
    if (key && await keyOpensRecords(key)) {
      matched = { ...candidate, key };
      break;
    }
  }
  if (!matched) return false;

  if (matched.isPending) writeKeyParams(pending);
  localStorage.removeItem(ENC_PENDING_KEY);
  setEncryptionKey(matched.key);
  await sealPlaintextResidue();
  return true;
}

/**
 * Moves a vault still on an older iteration count to the current one, with
 * the password just verified. Silent and non-fatal: on failure the vault
 * simply stays on the old count and the next unlock tries again.
 */
async function upgradeKeyIfNeeded(password, key) {
  if (getStoredIterations() >= PBKDF2_ITERATIONS) return;
  try {
    await rekeyVault(key, password, keyGeneration);
  } catch {
    // Next unlock.
  }
}

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

/**
 * Derives the key from `password` using the stored salt and verifies it against
 * the stored verifier. Returns true and keeps the key in memory on success,
 * false (key discarded) if the password is wrong.
 */
export function unlock(password) {
  return withVaultLock(() => unlockHoldingLock(password));
}

async function unlockHoldingLock(password) {
  const pending = readPendingParams();
  if (pending) return unlockAfterInterruptedRekey(password, pending);

  const salt = getStoredSalt();
  if (!salt) return false;

  const key = await deriveKey(password, salt, getStoredIterations());
  const verifier = localStorage.getItem(ENC_VERIFIER_KEY);

  if (verifier) {
    try {
      await decryptJSON(verifier, key);
    } catch {
      return false;
    }
    setEncryptionKey(key);
    await sealPlaintextResidue();
    await upgradeKeyIfNeeded(password, key);
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
  await upgradeKeyIfNeeded(password, key);
  return true;
}
