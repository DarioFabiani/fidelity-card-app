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
