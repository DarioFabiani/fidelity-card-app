export const BARCODE_FORMATS = [
  { value: 'CODE128', label: 'Code 128', description: 'Generico (alfanumerico)' },
  { value: 'EAN13', label: 'EAN-13', description: '13 cifre (supermercati EU)' },
  { value: 'EAN8', label: 'EAN-8', description: '8 cifre' },
  { value: 'UPC', label: 'UPC-A', description: '12 cifre (retail USA)' },
  { value: 'ITF14', label: 'ITF-14', description: '14 cifre' },
  { value: 'CODE39', label: 'Code 39', description: 'Alfanumerico (tessere)' }
];

export function suggestFormat(cardNumber) {
  const digits = cardNumber.replace(/\D/g, '');
  if (digits.length === 13) return 'EAN13';
  if (digits.length === 8) return 'EAN8';
  if (digits.length === 12) return 'UPC';
  if (digits.length === 14) return 'ITF14';
  return 'CODE128';
}
