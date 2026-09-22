import { useRef, useEffect, useState } from 'preact/hooks';
import { getShareLink, shareCard, copyToClipboard, formatShareCode } from '../utils/share';
import { ShareIcon } from './icons';
import { useBackToClose } from '../hooks/useBackToClose';

export function ShareModal({ card, onClose, showToast }) {
  const canvasRef = useRef(null);
  const [shareUrl, setShareUrl] = useState('');
  const [code, setCode] = useState('');
  const [ready, setReady] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [includeNotes, setIncludeNotes] = useState(false);
  // Inline "copiato" feedback: the toast sat right over the code's hint.
  const [copied, setCopied] = useState('');
  useBackToClose(true, onClose);

  const flashCopied = (what) => {
    setCopied(what);
    setTimeout(() => setCopied(c => (c === what ? '' : c)), 2000);
  };

  useEffect(() => {
    let cancelled = false;
    setReady(false);

    getShareLink(card, { includeNotes }).then(({ url, code }) => {
      if (cancelled) return;
      setShareUrl(url);
      setCode(code);
      setReady(true);
      if (canvasRef.current) {
        // Loaded on demand: qrcode (~24 kB) is only needed once this modal
        // actually opens, not on every app load.
        import('qrcode').then(({ default: QRCode }) => {
          if (cancelled || !canvasRef.current) return;
          QRCode.toCanvas(canvasRef.current, url, {
            width: 180,
            margin: 2,
            color: { dark: '#000000', light: '#FFFFFF' }
          });
        });
      }
    });

    return () => { cancelled = true; };
  }, [card, includeNotes]);

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
    if (!ready) return;
    const ok = await copyToClipboard(formatShareCode(code));
    if (ok) flashCopied('code');
    else showToast('Errore nella copia', 'error');
  };

  const handleCopy = async () => {
    if (!ready) return;
    const ok = await copyToClipboard(shareUrl);
    if (ok) flashCopied('link');
    else showToast('Errore nella copia', 'error');
  };

  return (
    <div class="modal-overlay" onClick={onClose}>
      <div class="modal-content" role="dialog" aria-modal="true" aria-labelledby="share-title" onClick={e => e.stopPropagation()}>
        <h3 class="share-title" id="share-title">
          {sent ? 'Link inviato' : `Condividi ${card.providerName}`}
        </h3>

        {/* Once sent, the QR and link step aside: the one thing still missing
            on the recipient's end is the code. */}
        <div class="share-qr" hidden={sent}>
          <canvas ref={canvasRef} />
          <p class="share-qr-hint">Scansiona il QR code con un altro telefono</p>
        </div>

        {card.notes && !sent && (
          <label class="share-notes">
            <input type="checkbox" checked={includeNotes} onChange={e => setIncludeNotes(e.target.checked)} />
            <span>Includi le note nel link</span>
          </label>
        )}

        <div class={`share-code ${sent ? 'is-highlighted' : ''}`}>
          <span class="label-caps share-code-label">Codice di sblocco</span>
          <span class="share-code-value">{ready ? formatShareCode(code) : '···· ····'}</span>
          {!sent && (
            <button type="button" class="share-code-copy" onClick={handleCopyCode} disabled={!ready}>
              {copied === 'code' ? 'Codice copiato ✓' : 'Copia codice'}
            </button>
          )}
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
                {copied === 'code' ? 'Codice copiato ✓' : 'Copia codice'}
              </button>
              <button class="btn btn-outline btn-block" onClick={onClose}>
                Fatto
              </button>
            </>
          ) : (
            <>
              {navigator.share && (
                <button class="btn btn-primary btn-block" onClick={handleShare} disabled={!ready}>
                  <ShareIcon size={18} />
                  Condividi
                </button>
              )}
              <button class="btn btn-outline btn-block" onClick={handleCopy} disabled={!ready}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                {copied === 'link' ? 'Link copiato ✓ — ora comunica il codice' : 'Copia link'}
              </button>
              <button class="btn btn-block share-close" onClick={onClose}>
                Chiudi
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
          }
          .share-code-value {
            font-size: var(--text-2xl);
            font-weight: 700;
            letter-spacing: 4px;
            color: var(--color-primary);
            margin-top: 4px;
            font-family: var(--font-mono);
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
          .share-notes {
            display: flex;
            align-items: center;
            gap: var(--space-2);
            margin-bottom: var(--space-4);
            font-size: var(--text-sm);
            cursor: pointer;
          }
          .share-notes input {
            width: 20px;
            height: 20px;
            flex-shrink: 0;
          }
          .share-code-copy {
            margin-top: var(--space-2);
            min-height: 44px;
            padding: 0 var(--space-4);
            font-size: var(--text-sm);
            font-weight: 600;
            color: var(--color-primary);
          }
          .share-close {
            color: var(--color-text-secondary);
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
