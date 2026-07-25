import { useRef, useEffect, useState } from 'preact/hooks';
import QRCode from 'qrcode';
import { encodeCardForShare, shareCard, copyToClipboard } from '../utils/share';

export function ShareModal({ card, onClose, showToast }) {
  const canvasRef = useRef(null);
  const [shareUrl, setShareUrl] = useState('');
  const [pin, setPin] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setReady(false);

    encodeCardForShare(card).then(({ url, pin }) => {
      if (cancelled) return;
      setShareUrl(url);
      setPin(pin);
      setReady(true);
      if (canvasRef.current) {
        QRCode.toCanvas(canvasRef.current, url, {
          width: 220,
          margin: 2,
          color: { dark: '#000000', light: '#FFFFFF' }
        });
      }
    });

    return () => { cancelled = true; };
  }, [card]);

  const handleShare = async () => {
    if (!ready) return;
    const result = await shareCard(card, { url: shareUrl, pin });
    if (result.success) {
      onClose();
    }
  };

  const handleCopy = async () => {
    if (!ready) return;
    const ok = await copyToClipboard(shareUrl);
    if (ok) {
      showToast('Link copiato! Ricorda di comunicare anche il PIN');
    } else {
      showToast('Errore nella copia', 'error');
    }
  };

  return (
    <div class="modal-overlay" onClick={onClose}>
      <div class="modal-content" onClick={e => e.stopPropagation()}>
        <h3 class="share-title">Condividi {card.providerName}</h3>

        <div class="share-qr">
          <canvas ref={canvasRef} />
          <p class="share-qr-hint">Scansiona il QR code con un altro telefono</p>
        </div>

        <div class="share-pin">
          <span class="share-pin-label">PIN di sblocco</span>
          <span class="share-pin-code">{ready ? pin : '· · · · · ·'}</span>
          <p class="share-pin-hint">
            Comunica questo PIN al destinatario (a voce o con un altro messaggio): senza non può aprire il link.
          </p>
        </div>

        <div class="share-actions">
          {navigator.share && (
            <button class="btn btn-primary btn-block" onClick={handleShare} disabled={!ready}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
              Condividi
            </button>
          )}
          <button class="btn btn-outline btn-block" onClick={handleCopy} disabled={!ready}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            Copia link
          </button>
        </div>

        <style>{`
          .share-title {
            font-size: 18px;
            font-weight: 700;
            margin-bottom: 20px;
            text-align: center;
          }
          .share-qr {
            display: flex;
            flex-direction: column;
            align-items: center;
            margin-bottom: 20px;
          }
          .share-qr canvas {
            border-radius: var(--radius-sm);
          }
          .share-qr-hint {
            font-size: 13px;
            color: var(--color-text-secondary);
            margin-top: 8px;
          }
          .share-pin {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            background: var(--color-bg);
            border: 1.5px dashed var(--color-primary);
            border-radius: var(--radius-sm);
            padding: 14px;
            margin-bottom: 20px;
          }
          .share-pin-label {
            font-size: 12px;
            font-weight: 600;
            color: var(--color-text-secondary);
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .share-pin-code {
            font-size: 26px;
            font-weight: 700;
            letter-spacing: 4px;
            color: var(--color-primary);
            margin-top: 4px;
            font-family: 'SF Mono', 'Menlo', monospace;
          }
          .share-pin-hint {
            font-size: 12px;
            color: var(--color-text-secondary);
            margin-top: 6px;
          }
          .share-actions {
            display: flex;
            flex-direction: column;
            gap: 10px;
          }
        `}</style>
      </div>
    </div>
  );
}
