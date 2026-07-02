import { useRef, useEffect, useState } from 'preact/hooks';
import QRCode from 'qrcode';
import { encodeCardForShare, shareCard, copyToClipboard } from '../utils/share';

export function ShareModal({ card, onClose, showToast }) {
  const canvasRef = useRef(null);
  const [shareUrl, setShareUrl] = useState('');

  useEffect(() => {
    const url = encodeCardForShare(card);
    setShareUrl(url);
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, url, {
        width: 220,
        margin: 2,
        color: { dark: '#000000', light: '#FFFFFF' }
      });
    }
  }, [card]);

  const handleShare = async () => {
    const result = await shareCard(card);
    if (result.success) {
      onClose();
    }
  };

  const handleCopy = async () => {
    const ok = await copyToClipboard(shareUrl);
    if (ok) {
      showToast('Link copiato!');
      onClose();
    } else {
      showToast('Errore nella copia', 'error');
    }
  };

  return (
    <div class="modal-overlay" onClick={onClose}>
      <div class="modal-content" onClick={e => e.stopPropagation()}>
        <h3 class="share-title">Condividi {card.providerName}</h3>

        <div class="share-qr">
          <div class="share-qr-frame">
            <canvas ref={canvasRef} />
          </div>
          <p class="share-qr-hint">Scansiona il QR code con un altro telefono</p>
        </div>

        <div class="share-actions">
          {navigator.share && (
            <button class="btn btn-primary btn-block" onClick={handleShare}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
              Condividi
            </button>
          )}
          <button class="btn btn-outline btn-block" onClick={handleCopy}>
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
          .share-qr-frame {
            padding: 16px;
            background: var(--color-primary-container);
            border-radius: var(--radius);
          }
          .share-qr canvas {
            display: block;
            border-radius: var(--radius-xs);
          }
          .share-qr-hint {
            font-size: 13px;
            color: var(--color-text-secondary);
            margin-top: 8px;
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
