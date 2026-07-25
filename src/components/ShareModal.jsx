import { useRef, useEffect, useState } from 'preact/hooks';
import QRCode from 'qrcode';
import { getShareLink, shareCard, copyToClipboard, formatShareCode } from '../utils/share';

export function ShareModal({ card, onClose, showToast }) {
  const canvasRef = useRef(null);
  const [shareUrl, setShareUrl] = useState('');
  const [code, setCode] = useState('');
  const [ready, setReady] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setReady(false);

    getShareLink(card).then(({ url, code }) => {
      if (cancelled) return;
      setShareUrl(url);
      setCode(code);
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
    setError('');
    const result = await shareCard(card, { url: shareUrl, code });
    if (result.success) {
      // Deliberately not closing: the code is only on screen here, and the
      // recipient cannot open the link without it.
      setSent(true);
    } else if (result.method === 'error') {
      setError('Condivisione non riuscita. Usa "Copia link" e invialo a mano.');
    }
  };

  const handleCopyCode = async () => {
    const ok = await copyToClipboard(formatShareCode(code));
    showToast(ok ? 'Codice copiato' : 'Errore nella copia', ok ? 'success' : 'error');
  };

  const handleCopy = async () => {
    if (!ready) return;
    const ok = await copyToClipboard(shareUrl);
    if (ok) {
      showToast('Link copiato! Ricorda di comunicare anche il codice');
    } else {
      showToast('Errore nella copia', 'error');
    }
  };

  return (
    <div class="modal-overlay" onClick={onClose}>
      <div class="modal-content" onClick={e => e.stopPropagation()}>
        <h3 class="share-title">
          {sent ? 'Link inviato' : `Condividi ${card.providerName}`}
        </h3>

        {/* Once sent, the QR and link step aside: the one thing still missing
            on the recipient's end is the code. */}
        <div class="share-qr" hidden={sent}>
          <canvas ref={canvasRef} />
          <p class="share-qr-hint">Scansiona il QR code con un altro telefono</p>
        </div>

        <div class={`share-code ${sent ? 'is-highlighted' : ''}`}>
          <span class="share-code-label">Codice di sblocco</span>
          <span class="share-code-value">{ready ? formatShareCode(code) : '···· ····'}</span>
          <p class="share-code-hint">
            {sent
              ? 'Ora comunica questo codice al destinatario, a voce o su un altro canale: senza, non può aprire il link che gli hai appena inviato.'
              : 'Comunica questo codice al destinatario a voce o con un altro messaggio: senza, il link non si apre. Non viene incluso nella condivisione, proprio per tenerlo su un canale diverso.'}
          </p>
        </div>

        {error && <p class="share-error">{error}</p>}

        <div class="share-actions">
          {sent ? (
            <>
              <button class="btn btn-primary btn-block" onClick={handleCopyCode}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                Copia codice
              </button>
              <button class="btn btn-outline btn-block" onClick={onClose}>
                Fatto
              </button>
            </>
          ) : (
            <>
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
            </>
          )}
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
          /* display:flex would otherwise win over the hidden attribute. */
          .share-qr[hidden] {
            display: none;
          }
          .share-qr canvas {
            border-radius: var(--radius-sm);
          }
          .share-qr-hint {
            font-size: 13px;
            color: var(--color-text-secondary);
            margin-top: 8px;
          }
          .share-code {
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
          .share-code-label {
            font-size: 12px;
            font-weight: 600;
            color: var(--color-text-secondary);
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .share-code-value {
            font-size: 26px;
            font-weight: 700;
            letter-spacing: 4px;
            color: var(--color-primary);
            margin-top: 4px;
            font-family: 'SF Mono', 'Menlo', monospace;
          }
          .share-code.is-highlighted {
            border-style: solid;
            border-width: 2px;
            padding: var(--space-5) var(--space-4);
          }
          .share-code-hint {
            font-size: 12px;
            color: var(--color-text-secondary);
            margin-top: 6px;
          }
          .share-error {
            font-size: var(--text-sm);
            color: var(--color-danger);
            text-align: center;
            margin-bottom: var(--space-3);
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
