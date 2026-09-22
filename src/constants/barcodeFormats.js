export const BARCODE_FORMATS = [
  { value: 'CODE128', label: 'Code 128', description: 'Generico (alfanumerico)' },
  { value: 'EAN13', label: 'EAN-13', description: '13 cifre (supermercati EU)' },
  { value: 'EAN8', label: 'EAN-8', description: '8 cifre' },
  { value: 'UPC', label: 'UPC-A', description: '12 cifre (retail USA)' },
  { value: 'ITF14', label: 'ITF-14', description: '14 cifre' },
  { value: 'CODE39', label: 'Code 39', description: 'Alfanumerico (tessere)' },
  { value: 'QR_CODE', label: 'QR Code', description: 'Codice QR (carte digitali moderne)' },
  { value: 'CODABAR', label: 'Codabar', description: 'Alfanumerico (alcune tessere sanitarie/fedeltà)' }
];

const KNOWN_FORMATS = new Set(BARCODE_FORMATS.map(f => f.value));

/** Falls back to Code 128 for anything the app cannot render. */
export function normalizeFormat(format) {
  return KNOWN_FORMATS.has(format) ? format : 'CODE128';
}

export function formatLabel(format) {
  return BARCODE_FORMATS.find(f => f.value === format)?.label || format;
}

/**
 * GS1 check digit (EAN-8, UPC-A, EAN-13, ITF-14 share it): weights 3,1,3,...
 * from the rightmost data digit.
 */
export function hasValidGtinCheckDigit(digits) {
  if (!/^[0-9]{8,14}$/.test(digits)) return false;
  let sum = 0;
  for (let i = digits.length - 2, weight = 3; i >= 0; i--, weight = 4 - weight) {
    sum += Number(digits[i]) * weight;
  }
  return (10 - (sum % 10)) % 10 === Number(digits[digits.length - 1]);
}

const GTIN_BY_LENGTH = { 8: 'EAN8', 12: 'UPC', 13: 'EAN13', 14: 'ITF14' };

/**
 * Guesses the format from the number. Only a digit-only value whose check
 * digit is right is taken for an EAN/UPC: guessing on length alone picked
 * EAN-13 for any 13-digit store code, which then could not be drawn as one
 * and silently came out as a different barcode.
 */
export function suggestFormat(cardNumber) {
  const compact = (cardNumber || '').replace(/\s/g, '');
  if (!/^[0-9]+$/.test(compact)) return 'CODE128';
  const gtin = GTIN_BY_LENGTH[compact.length];
  return gtin && hasValidGtinCheckDigit(compact) ? gtin : 'CODE128';
}

/** Formats that commonly carry letters: offer the full keyboard for them. */
export function isAlphanumericFormat(format) {
  return format === 'CODE128' || format === 'CODE39' || format === 'QR_CODE' || format === 'CODABAR';
}
