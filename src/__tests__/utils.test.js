import { describe, it, expect } from 'vitest';
import { normalizeColor, getContrastColor, DEFAULT_CARD_COLOR } from '../utils/color';
import { formatCardNumber } from '../utils/format';
import { matchesQuery, foldText } from '../hooks/useSearch';
import { shouldAutoLock } from '../utils/autolock';
import { buildSections, SORT_ALPHA, SORT_RECENT } from '../hooks/useSortedCards';

describe('normalizeColor', () => {
  it('keeps #RRGGBB and replaces anything else', () => {
    expect(normalizeColor('#A34F47')).toBe('#A34F47');
    expect(normalizeColor('red')).toBe(DEFAULT_CARD_COLOR);
    expect(normalizeColor('#FFF')).toBe(DEFAULT_CARD_COLOR);
    expect(normalizeColor('#123456; background:url(x)')).toBe(DEFAULT_CARD_COLOR);
    expect(normalizeColor(undefined)).toBe(DEFAULT_CARD_COLOR);
  });

  it('gives readable text on the default colour', () => {
    expect(getContrastColor(DEFAULT_CARD_COLOR)).toBe('#FFFFFF');
  });
});

describe('formatCardNumber', () => {
  it('groups long digit runs and leaves codes with letters alone', () => {
    expect(formatCardNumber('4006381333931')).toBe('4006 3813 3393 1');
    expect(formatCardNumber('12345678')).toBe('12345678');
    expect(formatCardNumber('IK-556677')).toBe('IK-556677');
  });
});

describe('search', () => {
  const card = { providerName: 'Tigotà', cardNumber: '4006381333931', notes: 'Carta di mamma' };

  it('folds accents and case', () => {
    expect(foldText('Tigotà')).toBe('tigota');
    expect(matchesQuery(card, 'TIGOTA')).toBe(true);
  });

  it('matches the number as displayed, with spaces', () => {
    expect(matchesQuery(card, '4006 3813')).toBe(true);
    expect(matchesQuery(card, '3813 3393')).toBe(true);
  });

  it('searches notes and rejects non-matches', () => {
    expect(matchesQuery(card, 'mamma')).toBe(true);
    expect(matchesQuery(card, 'conad')).toBe(false);
  });
});

describe('shouldAutoLock', () => {
  it('locks only after the chosen delay, never with "Mai"', () => {
    expect(shouldAutoLock(4 * 60 * 1000, 5)).toBe(false);
    expect(shouldAutoLock(5 * 60 * 1000, 5)).toBe(true);
    expect(shouldAutoLock(24 * 60 * 60 * 1000, -1)).toBe(false);
  });
});

describe('buildSections', () => {
  const cards = [
    { id: 'a', providerName: 'Conad', createdAt: 1, lastUsedAt: 10 },
    { id: 'b', providerName: 'esselunga', createdAt: 2 },
    { id: 'c', providerName: 'Coop', createdAt: 3, lastUsedAt: 30, favorite: true },
    { id: 'd', providerName: 'Ikea', createdAt: 4, lastUsedAt: 20 }
  ];

  it('orders "recent" by last use, favourites first', () => {
    const sections = buildSections(cards, SORT_RECENT);
    expect(sections.map(s => s.key)).toEqual(['fav', 'all']);
    expect(sections[0].cards.map(c => c.id)).toEqual(['c']);
    expect(sections[1].cards.map(c => c.id)).toEqual(['d', 'a', 'b']);
  });

  it('groups alphabetically, case-insensitively', () => {
    const sections = buildSections(cards, SORT_ALPHA);
    expect(sections.map(s => s.key)).toEqual(['fav', 'C', 'E', 'I']);
  });
});

describe('sameCardNumber', async () => {
  const { sameCardNumber } = await import('../utils/format');
  it('ignores spaces, dashes and case', () => {
    expect(sameCardNumber('4006 3813-3393 1', '4006381333931')).toBe(true);
    expect(sameCardNumber('ab-123', 'AB123')).toBe(true);
    expect(sameCardNumber('', '')).toBe(false);
    expect(sameCardNumber('123', '124')).toBe(false);
  });
});

describe('normalizeCardNumber', async () => {
  const { normalizeCardNumber } = await import('../utils/format');
  it('drops grouping spaces from digit-only numbers, trims the rest', () => {
    expect(normalizeCardNumber(' 4006 3813 3393 1 ')).toBe('4006381333931');
    expect(normalizeCardNumber('IK 55 66')).toBe('IK 55 66');
    expect(normalizeCardNumber('  AB-1 ')).toBe('AB-1');
  });
});

describe('colorForName', async () => {
  const { colorForName, CARD_COLORS, DEFAULT_CARD_COLOR } = await import('../utils/color');
  it('is stable, from the palette, and case-insensitive', () => {
    expect(CARD_COLORS).toContain(colorForName('Bar Mario'));
    expect(colorForName('Bar Mario')).toBe(colorForName('bar mario '));
    expect(colorForName('')).toBe(DEFAULT_CARD_COLOR);
  });
});
