import { useRef, useEffect, useState } from 'preact/hooks';
import { formatLabel } from '../constants/barcodeFormats';

export function BarcodeDisplay({ value, format = 'CODE128', fullscreenable = true, compact = false }) {
  const svgRef = useRef(null);
  const canvasRef = useRef(null);
  const isQrCode = format === 'QR_CODE';
  const [error, setError] = useState(false);
  // The number is not valid for the chosen format and was drawn as Code 128.
  const [fellBack, setFellBack] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  // Escape closes the enlarged code on a desktop/keyboard.
  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e) => { if (e.key === 'Escape') setFullscreen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fullscreen]);

  useEffect(() => {
    let cancelled = false;

    // jsbarcode/qrcode (~92 kB combined) are only needed once a card with a
    // barcode is actually viewed, so they're fetched on demand rather than
    // sitting in the entry chunk for everyone who just opens the list.
    import('../utils/barcode').then(({ renderBarcode, renderQrCode }) => {
      if (cancelled) return;

      if (isQrCode) {
        if (canvasRef.current && value) {
          renderQrCode(canvasRef.current, value).then(ok => {
            if (cancelled) return;
            setError(!ok);
            setFellBack(false);
          });
        }
      } else if (svgRef.current && value) {
        const result = renderBarcode(svgRef.current, value, format);
        if (cancelled) return;
        setError(!result);
        setFellBack(result === 'fallback');
      }
    }).catch(() => {
      // The chunk is precached, so this should not happen — but an unhandled
      // rejection here would leave a blank white box with no explanation.
      if (!cancelled) setError(true);
    });

    return () => {
      cancelled = true;
    };
  }, [value, format, isQrCode]);

  // The svg/canvas stays mounted even on error (hidden): an early return
  // unmounted it, so the ref was gone and a later, valid value — the form's
  // live preview changes on every keystroke — could never be drawn again.
  return (
    <>
      <div
        class={`barcode-container ${fullscreen ? 'barcode-fullscreen' : ''} ${compact ? 'barcode-compact' : ''}`}
        onClick={fullscreenable && !error ? () => setFullscreen(!fullscreen) : undefined}
      >
        {isQrCode ? (
          <canvas ref={canvasRef} class="barcode-svg barcode-qr" hidden={error} />
        ) : (
          <svg ref={svgRef} class="barcode-svg" style={error ? { display: 'none' } : undefined} />
        )}
        {error && (
          <p class="barcode-error">Impossibile generare il codice a barre</p>
        )}
        {fellBack && !error && !fullscreen && (
          <p class="barcode-warning">
            Il numero non è un {formatLabel(format)} valido: mostrato come Code 128.
          </p>
        )}
        {fullscreenable && !error && !fullscreen && (
          <p class="barcode-hint">Tocca per ingrandire</p>
        )}
        {fullscreen && (
          <button class="barcode-close" onClick={(e) => { e.stopPropagation(); setFullscreen(false); }}>
            Chiudi
          </button>
        )}
      </div>
      <style>{`
        .barcode-container {
          background: #FFFFFF;
          border-radius: var(--radius);
          padding: 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
        }
        .barcode-svg {
          width: 100%;
          height: auto;
        }
        .barcode-qr {
          max-width: 240px;
        }
        .barcode-fullscreen .barcode-qr {
          width: 100%;
          max-width: 60vh;
        }
        .barcode-error {
          padding: 16px;
          text-align: center;
          font-size: var(--text-sm);
          color: #8A3A33;
        }
        .barcode-qr[hidden] {
          display: none;
        }
        .barcode-compact {
          padding: 8px;
        }
        .barcode-compact .barcode-svg {
          max-height: 110px;
        }
        .barcode-compact .barcode-qr {
          max-width: 140px;
        }
        .barcode-warning {
          font-size: 12px;
          color: #8A4A1F;
          margin-top: 6px;
          text-align: center;
        }
        .barcode-hint {
          font-size: 12px;
          color: #757575;
          margin-top: 8px;
        }
        .barcode-fullscreen {
          position: fixed;
          inset: 0;
          z-index: 500;
          border-radius: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 32px;
          cursor: default;
        }
        .barcode-fullscreen .barcode-svg {
          max-width: 100%;
          max-height: 60vh;
        }
        .barcode-close {
          margin-top: 24px;
          padding: 12px 32px;
          background: #212121;
          color: #FFFFFF;
          border-radius: var(--radius-sm);
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
        }
      `}</style>
    </>
  );
}
