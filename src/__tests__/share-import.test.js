import { describe, it, expect, beforeAll } from 'vitest';

beforeAll(() => {
  globalThis.window = { location: { origin: 'https://example.test' } };
});

describe('shared links', async () => {
  const { encodeCardForShare, decodeSharedCard, isValidShareData } = await import('../utils/share');
  const card = { providerName: 'Conad', cardNumber: '4006381333931', barcodeFormat: 'EAN13', color: '#A34F47', notes: 'ciao' };

  it('round-trips with the code, in any typed shape', async () => {
    const { url, code } = await encodeCardForShare(card);
    const data = new URL(url).searchParams.get('data');
    expect(isValidShareData(data)).toBe(true);

    const typed = `${code.slice(0, 4).toLowerCase()} - ${code.slice(4)}`;
    expect(await decodeSharedCard(data, typed)).toEqual(card);
  });

  it('rejects a wrong code and a truncated link', async () => {
    const { url } = await encodeCardForShare(card);
    const data = new URL(url).searchParams.get('data');
    expect(await decodeSharedCard(data, 'AAAAAAAA')).toBeNull();
    expect(isValidShareData(data.slice(0, 30))).toBe(false);
  });
});

describe('backup validation', async () => {
  const { validateCards } = await import('../utils/export-import');

  it('rebuilds cards from known fields only', () => {
    const [card] = validateCards([{
      id: 1, providerName: 'Coop', cardNumber: 123, _enc: 'x', color: 'javascript:alert(1)',
      barcodeFormat: 'WHATEVER', createdAt: 5, lastUsedAt: 9, extra: true
    }]);
    expect(card).toMatchObject({ id: '1', cardNumber: '123', barcodeFormat: 'CODE128', createdAt: 5, lastUsedAt: 9 });
    expect(card.color).toMatch(/^#[0-9A-F]{6}$/i);
    expect(card).not.toHaveProperty('_enc');
    expect(card).not.toHaveProperty('extra');
  });

  it('refuses incomplete records and non-arrays', () => {
    expect(() => validateCards([{ id: 'x' }])).toThrow();
    expect(() => validateCards({})).toThrow();
  });
});

describe('backup iterations', async () => {
  const { backupIterations } = await import('../utils/export-import');
  const { LEGACY_PBKDF2_ITERATIONS } = await import('../utils/crypto');

  it('reads old files as legacy and rejects absurd counts', () => {
    expect(backupIterations(undefined)).toBe(LEGACY_PBKDF2_ITERATIONS);
    expect(backupIterations(600000)).toBe(600000);
    expect(() => backupIterations(1e12)).toThrow();
    expect(() => backupIterations('600000')).toThrow();
  });
});

describe('legacy shared links', async () => {
  const { decodeSharedCard, isValidShareData } = await import('../utils/share');
  const c = await import('../utils/crypto');

  it('still opens a link made before the iteration count was included', async () => {
    const salt = c.generateSalt();
    const key = await c.deriveKey('K7M2P9XR', salt, c.LEGACY_PBKDF2_ITERATIONS);
    const sealed = await c.encryptJSON({ p: 'Conad', n: '123', f: 'CODE128', c: '#A34F47', t: '' }, key);
    const data = `${c.bufferToBase64(salt)}.${sealed}`.replace(/\+/g, '-').replace(/\//g, '_');
    expect(isValidShareData(data)).toBe(true);
    expect((await decodeSharedCard(data, 'k7m2-p9xr')).providerName).toBe('Conad');
  });

  it('rejects an absurd or truncated iteration count', () => {
    expect(isValidShareData('A'.repeat(24) + '.' + 'B'.repeat(60) + '.60')).toBe(false);
    expect(isValidShareData('A'.repeat(24) + '.' + 'B'.repeat(60) + '.999999999')).toBe(false);
  });
});

describe('planImport', async () => {
  const { planImport } = await import('../utils/export-import');
  it('adds new cards, updates only with newer copies, keeps the rest', () => {
    const existing = new Map([['a', 100], ['b', 100]]);
    const plan = planImport([
      { id: 'a', updatedAt: 50 },   // older backup copy: keep local
      { id: 'b', updatedAt: 100 },  // same: nothing to do
      { id: 'c', updatedAt: 10 }    // new
    ], existing);
    expect(plan.toWrite.map(c => c.id)).toEqual(['c']);
    expect(plan).toMatchObject({ added: 1, updated: 0, kept: 2 });
    expect(planImport([{ id: 'a', updatedAt: 200 }], existing)).toMatchObject({ updated: 1 });
  });
});

describe('shared link notes', async () => {
  const { encodeCardForShare, decodeSharedCard } = await import('../utils/share');
  it('leaves the notes out unless asked', async () => {
    const card = { providerName: 'Coop', cardNumber: '1', barcodeFormat: 'CODE128', color: '#A34F47', notes: 'PIN 1234' };
    const { url, code } = await encodeCardForShare(card, { includeNotes: false });
    const decoded = await decodeSharedCard(new URL(url).searchParams.get('data'), code);
    expect(decoded.notes).toBe('');
  });
});

describe('share link details', async () => {
  const { getShareLink, isValidShareData, decodeSharedCard } = await import('../utils/share');

  it('keeps the same code with and without notes', async () => {
    const card = { id: 'z', updatedAt: 1, providerName: 'Coop', cardNumber: '1', barcodeFormat: 'CODE128', color: '#A34F47', notes: 'n' };
    const a = await getShareLink(card, { includeNotes: false });
    const b = await getShareLink(card, { includeNotes: true });
    expect(a.url).not.toBe(b.url);
    expect(a.code).toBe(b.code);
    const data = new URL(a.url).searchParams.get('data');
    expect(await decodeSharedCard(data, b.code)).not.toBeNull();
  });

  it('rejects a count cut short by one digit', async () => {
    const card = { id: 'y', updatedAt: 1, providerName: 'Coop', cardNumber: '1', barcodeFormat: 'CODE128', color: '#A34F47' };
    const data = new URL((await getShareLink(card)).url).searchParams.get('data');
    expect(isValidShareData(data)).toBe(true);
    expect(isValidShareData(data.slice(0, -1))).toBe(false);
  });
});

describe('import against unreadable and undated cards', async () => {
  const { planImport, validateCards } = await import('../utils/export-import');
  it('lets any backup copy replace an unreadable record', () => {
    const plan = planImport([{ id: 'a', updatedAt: 0 }], new Map([['a', -Infinity]]));
    expect(plan).toMatchObject({ updated: 1, kept: 0 });
  });
  it('does not let a card without dates overwrite a local one', () => {
    const [card] = validateCards([{ id: 'a', providerName: 'X', cardNumber: '1' }]);
    expect(card.updatedAt).toBe(0);
    expect(planImport([card], new Map([['a', 5]]))).toMatchObject({ kept: 1 });
  });
});
