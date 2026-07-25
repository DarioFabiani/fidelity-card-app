export function getContrastColor(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

export function shadeColor(hex, amount) {
  const clamp = v => Math.max(0, Math.min(255, Math.round(v)));
  const r = clamp(parseInt(hex.slice(1, 3), 16) + amount);
  const g = clamp(parseInt(hex.slice(3, 5), 16) + amount);
  const b = clamp(parseInt(hex.slice(5, 7), 16) + amount);
  return `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`;
}

export function cardGradient(hex) {
  return `linear-gradient(135deg, ${shadeColor(hex, 18)} 0%, ${hex} 55%, ${shadeColor(hex, -22)} 100%)`;
}
