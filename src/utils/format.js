/** Groups a card number into 4-digit blocks for display, e.g. "1234 5678 9012". */
export function formatCardNumber(num) {
  if (!num) return '';
  // Only digit runs are grouped: an alphanumeric code like "IK-556677" would
  // come out as "IK-5 5667 7", which reads worse than leaving it alone.
  if (!/^[0-9]+$/.test(num)) return num;
  if (num.length <= 8) return num;
  return num.replace(/([0-9]{4})/g, '$1 ').trim();
}

/** Same card number, ignoring the spaces and dashes people type in. */
export function sameCardNumber(a, b) {
  const clean = v => (v || '').replace(/[\s-]/g, '').toUpperCase();
  return clean(a) !== '' && clean(a) === clean(b);
}
