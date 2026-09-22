export function getContrastColor(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

function shadeColor(hex, amount) {
  const clamp = v => Math.max(0, Math.min(255, Math.round(v)));
  const r = clamp(parseInt(hex.slice(1, 3), 16) + amount);
  const g = clamp(parseInt(hex.slice(3, 5), 16) + amount);
  const b = clamp(parseInt(hex.slice(5, 7), 16) + amount);
  return `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`;
}

// Gentle top-left to bottom-right falloff. Kept narrow on purpose: a wider
// spread reads as a harsh two-tone block rather than a soft surface.
export function cardGradient(hex) {
  return `linear-gradient(135deg, ${shadeColor(hex, 12)} 0%, ${hex} 58%, ${shadeColor(hex, -14)} 100%)`;
}

export const DEFAULT_CARD_COLOR = '#4A6E92';

/**
 * Colours arrive from backups and shared links, i.e. from outside. Anything
 * but #RRGGBB would turn the gradient maths into "#NaNNaN..." and leave the
 * card with no background at all.
 */
export function normalizeColor(value) {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : DEFAULT_CARD_COLOR;
}

// Curated muted palette offered in the card form. Ordered by hue so the swatch
// grid reads as a spectrum; all are dark enough for white text.
export const CARD_COLORS = [
  '#A34F47', // rosso mattone
  '#A2663F', // terracotta
  '#877033', // ocra
  '#55805F', // salvia
  '#467C7D', // verde acqua
  '#4A6E92', // blu polvere
  '#56618F', // indaco
  '#6F5583', // prugna
  '#97536B', // rosa antico
  '#4A4F57'  // ardesia
];
