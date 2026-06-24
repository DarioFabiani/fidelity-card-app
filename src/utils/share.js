export function encodeCardForShare(card) {
  const payload = {
    p: card.providerName,
    n: card.cardNumber,
    f: card.barcodeFormat,
    c: card.color,
    t: card.notes || ''
  };
  const json = JSON.stringify(payload);
  const encoded = btoa(unescape(encodeURIComponent(json)));
  const base = window.location.origin + '/fidelity-card-app/';
  return `${base}shared?data=${encoded}`;
}

export function decodeSharedCard(dataParam) {
  try {
    const json = decodeURIComponent(escape(atob(dataParam)));
    const payload = JSON.parse(json);
    return {
      providerName: payload.p,
      cardNumber: payload.n,
      barcodeFormat: payload.f || 'CODE128',
      color: payload.c || '#1565C0',
      notes: payload.t || ''
    };
  } catch {
    return null;
  }
}

export async function shareCard(card) {
  const url = encodeCardForShare(card);

  if (navigator.share) {
    try {
      await navigator.share({
        title: `Carta ${card.providerName}`,
        text: `Ecco la mia carta fedeltà ${card.providerName}`,
        url
      });
      return { success: true, method: 'share' };
    } catch (err) {
      if (err.name === 'AbortError') return { success: false, method: 'cancelled' };
    }
  }

  return { success: false, method: 'fallback', url };
}

export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  }
}
