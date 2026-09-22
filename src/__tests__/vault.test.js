import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';

// Minimal localStorage, with a hook to make one key's write fail.
function makeStorage() {
  const data = new Map();
  return {
    failOn: null,
    getItem: k => (data.has(k) ? data.get(k) : null),
    setItem(k, v) {
      if (this.failOn === k) throw new Error('quota');
      data.set(k, String(v));
    },
    removeItem: k => data.delete(k),
    clear: () => data.clear(),
    keys: () => [...data.keys()]
  };
}

let db;
let crypto;

beforeEach(async () => {
  globalThis.indexedDB = new IDBFactory();
  globalThis.localStorage = makeStorage();
  vi.resetModules();
  db = await import('../db');
  crypto = await import('../utils/crypto');
});

async function seed() {
  await db.addCard({ providerName: 'Conad', cardNumber: '4006381333931' });
  await db.addCard({ providerName: 'Coop', cardNumber: '123', notes: 'mamma' });
}

async function names() {
  return (await db.getAllCards()).map(c => c.providerName).sort();
}

describe('vault', () => {
  it('stores the current iteration count when encryption is enabled', async () => {
    await seed();
    await db.enableEncryption('vecchia1');
    expect(localStorage.getItem('fidelity-encryption-iterations')).toBe(String(crypto.PBKDF2_ITERATIONS));
    db.lock();
    expect(await db.unlock('vecchia1')).toBe(true);
    expect(await names()).toEqual(['Conad', 'Coop']);
  });

  it('changes the password: new one opens, old one does not', async () => {
    await seed();
    await db.enableEncryption('vecchia1');
    expect(await db.changePassword('sbagliata', 'nuova123')).toBe(false);
    expect(await db.changePassword('vecchia1', 'nuova123')).toBe(true);
    expect(await names()).toEqual(['Conad', 'Coop']);

    db.lock();
    expect(await db.unlock('vecchia1')).toBe(false);
    expect(await db.unlock('nuova123')).toBe(true);
    expect(await names()).toEqual(['Conad', 'Coop']);
    expect(localStorage.getItem('fidelity-encryption-pending')).toBeNull();
  });

  it('recovers when cut off after the cards were re-sealed', async () => {
    await seed();
    await db.enableEncryption('vecchia1');
    // The promotion of the new parameters fails, as if the app died there.
    localStorage.failOn = 'fidelity-encryption-salt';
    expect(await db.changePassword('vecchia1', 'nuova123')).toBe(true);
    localStorage.failOn = null;
    expect(localStorage.getItem('fidelity-encryption-pending')).not.toBeNull();

    db.lock();
    // The old password matches the old verifier but no longer opens the cards.
    expect(await db.unlock('vecchia1')).toBe(false);
    expect(await db.unlock('nuova123')).toBe(true);
    expect(await names()).toEqual(['Conad', 'Coop']);
    expect(localStorage.getItem('fidelity-encryption-pending')).toBeNull();

    db.lock();
    expect(await db.unlock('nuova123')).toBe(true);
  });

  it('recovers when cut off before the cards were written', async () => {
    await seed();
    await db.enableEncryption('vecchia1');
    // New parameters parked, cards never rewritten.
    const salt = crypto.generateSalt();
    const key = await crypto.deriveKey('nuova123', salt);
    localStorage.setItem('fidelity-encryption-pending', JSON.stringify({
      salt: crypto.bufferToBase64(salt),
      verifier: await crypto.encryptJSON({ v: 1 }, key),
      iterations: crypto.PBKDF2_ITERATIONS
    }));

    db.lock();
    expect(await db.unlock('nuova123')).toBe(false);
    expect(await db.unlock('vecchia1')).toBe(true);
    expect(await names()).toEqual(['Conad', 'Coop']);
    expect(localStorage.getItem('fidelity-encryption-pending')).toBeNull();
  });

  it('moves a legacy vault to the current iteration count on unlock', async () => {
    await seed();
    await db.enableEncryption('vecchia1');
    // Rebuild it as an old build would have left it: 100k, count not stored.
    const salt = crypto.generateSalt();
    const legacyKey = await crypto.deriveKey('vecchia1', salt, crypto.LEGACY_PBKDF2_ITERATIONS);
    await db.disableEncryption();
    localStorage.setItem('fidelity-encryption-salt', crypto.bufferToBase64(salt));
    localStorage.setItem('fidelity-encryption-verifier', await crypto.encryptJSON({ v: 1 }, legacyKey));
    localStorage.setItem('fidelity-encryption-enabled', 'true');
    const raw = await db.dumpRawRecords();
    const { openDB } = await import('idb');
    const idb = await openDB('fidelity-cards-db', 1);
    for (const r of raw) {
      const { providerName, cardNumber, notes, ...rest } = r;
      await idb.put('cards', { ...rest, _enc: await crypto.encryptJSON({ providerName, cardNumber, notes }, legacyKey) });
    }
    idb.close();

    expect(await db.unlock('vecchia1')).toBe(true);
    expect(localStorage.getItem('fidelity-encryption-iterations')).toBe(String(crypto.PBKDF2_ITERATIONS));
    db.lock();
    expect(await db.unlock('vecchia1')).toBe(true);
    expect(await names()).toEqual(['Conad', 'Coop']);
  });

  it('keeps lastUsedAt without touching updatedAt', async () => {
    const card = await db.addCard({ providerName: 'Ikea', cardNumber: '1' });
    await new Promise(r => setTimeout(r, 5));
    await db.touchCard(card.id);
    const [after] = await db.getAllCards();
    expect(after.updatedAt).toBe(card.updatedAt);
    expect(after.lastUsedAt).toBeGreaterThan(card.lastUsedAt);
  });
});

describe('vault key changes under pressure', () => {
  it('a lock during the password change aborts it and loses nothing', async () => {
    await seed();
    await db.enableEncryption('vecchia1');
    const change = db.changePassword('vecchia1', 'nuova123');
    db.lock(); // auto-lock / padlock while the change is running
    await expect(change).rejects.toThrow();
    expect(db.hasEncryptionKey()).toBe(false);
    expect(await db.unlock('nuova123')).toBe(false);
    expect(await db.unlock('vecchia1')).toBe(true);
    expect(await names()).toEqual(['Conad', 'Coop']);
  });

  it('refuses to re-key when the held key opens none of the cards', async () => {
    await seed();
    await db.enableEncryption('vecchia1');
    // Another tab re-sealed every card under a key this one does not hold.
    const { openDB } = await import('idb');
    const idb = await openDB('fidelity-cards-db', 1);
    const foreign = await crypto.deriveKey('altra', crypto.generateSalt());
    for (const r of await idb.getAll('cards')) {
      await idb.put('cards', { ...r, _enc: await crypto.encryptJSON({ providerName: 'x', cardNumber: '1' }, foreign) });
    }
    idb.close();
    const saltBefore = localStorage.getItem('fidelity-encryption-salt');
    await expect(db.changePassword('vecchia1', 'nuova123')).rejects.toThrow();
    expect(localStorage.getItem('fidelity-encryption-salt')).toBe(saltBefore);
    expect(localStorage.getItem('fidelity-encryption-pending')).toBeNull();
  });

  it('leaves a single corrupted record alone and re-keys the rest', async () => {
    await seed();
    await db.enableEncryption('vecchia1');
    const { openDB } = await import('idb');
    const idb = await openDB('fidelity-cards-db', 1);
    const [first] = await idb.getAll('cards');
    await idb.put('cards', { ...first, _enc: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' });
    idb.close();
    expect(await db.changePassword('vecchia1', 'nuova123')).toBe(true);
    db.lock();
    expect(await db.unlock('nuova123')).toBe(true);
    const cards = await db.getAllCards();
    expect(cards.filter(c => c._unreadable)).toHaveLength(1);
    expect(cards.filter(c => !c._unreadable)).toHaveLength(1);
  });
});

describe('recovery copy', () => {
  it('can be imported back with the password after a reset', async () => {
    await seed();
    await db.enableEncryption('vecchia1');
    const dump = JSON.parse(JSON.stringify(await db.dumpVault()));
    await db.resetEverything();

    const { parseBackup, decryptImport, commitImport } = await import('../utils/export-import');
    const parsed = parseBackup(dump);
    expect(parsed.encrypted).toBe(true);
    expect(await decryptImport(parsed, 'sbagliata')).toBeNull();
    const cards = await decryptImport(parsed, 'vecchia1');
    expect(cards.map(c => c.providerName).sort()).toEqual(['Conad', 'Coop']);
    expect(await commitImport(cards)).toMatchObject({ added: 2 });
    expect(await names()).toEqual(['Conad', 'Coop']);
  });

  it('refuses an old raw copy with no key parameters, with a clear message', async () => {
    const { parseBackup } = await import('../utils/export-import');
    expect(() => parseBackup([{ id: 'x', _enc: 'abc' }])).toThrow(/parametri di cifratura/);
  });
});
