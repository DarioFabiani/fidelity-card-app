/** Groups a card number into 4-character blocks for display, e.g. "1234 5678 9012". */
export function formatCardNumber(num) {
  if (!num) return '';
  if (num.length <= 8) return num;
  return num.replace(/(.{4})/g, '$1 ').trim();
}
