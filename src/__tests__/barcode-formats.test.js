import { describe, it, expect } from 'vitest';
import { suggestFormat, hasValidGtinCheckDigit, normalizeFormat, isAlphanumericFormat } from '../constants/barcodeFormats';

describe('hasValidGtinCheckDigit', () => {
  it('accepts valid EAN-13, EAN-8, UPC-A and ITF-14 numbers', () => {
    expect(hasValidGtinCheckDigit('4006381333931')).toBe(true); // EAN-13
    expect(hasValidGtinCheckDigit('96385074')).toBe(true);      // EAN-8
    expect(hasValidGtinCheckDigit('036000291452')).toBe(true);  // UPC-A
    expect(hasValidGtinCheckDigit('10012345678902')).toBe(true); // ITF-14
  });

  it('rejects a wrong check digit and non-digits', () => {
    expect(hasValidGtinCheckDigit('4006381333932')).toBe(false);
    expect(hasValidGtinCheckDigit('40063813339AB')).toBe(false);
    expect(hasValidGtinCheckDigit('123')).toBe(false);
  });
});

describe('suggestFormat', () => {
  it('picks the GTIN format only when the check digit is right', () => {
    expect(suggestFormat('4006381333931')).toBe('EAN13');
    expect(suggestFormat('4006381333932')).toBe('CODE128');
    expect(suggestFormat('96385074')).toBe('EAN8');
    expect(suggestFormat('036000291452')).toBe('UPC');
  });

  it('ignores spaces but not letters', () => {
    expect(suggestFormat('4006 3813 3393 1')).toBe('EAN13');
    expect(suggestFormat('AB06381333931')).toBe('CODE128');
  });

  it('falls back to Code 128 for other lengths', () => {
    expect(suggestFormat('123456')).toBe('CODE128');
    expect(suggestFormat('')).toBe('CODE128');
  });
});

describe('normalizeFormat', () => {
  it('keeps known formats and replaces unknown ones', () => {
    expect(normalizeFormat('EAN13')).toBe('EAN13');
    expect(normalizeFormat('QR_CODE')).toBe('QR_CODE');
    expect(normalizeFormat('PDF417')).toBe('CODE128');
    expect(normalizeFormat(undefined)).toBe('CODE128');
  });
});

describe('isAlphanumericFormat', () => {
  it('flags formats that can carry letters', () => {
    expect(isAlphanumericFormat('CODE39')).toBe(true);
    expect(isAlphanumericFormat('EAN13')).toBe(false);
  });
});
