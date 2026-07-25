import { useRef, useEffect, useState } from 'preact/hooks';
import { renderBarcode, renderQrCode } from '../utils/barcode';

export function BarcodeDisplay({ value, format = 'CODE128', fullscreenable = true }) {
  const svgRef = useRef(null);
  const canvasRef = useRef(null);
  const isQrCode = format === 'QR_CODE';
  const [error, setError] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (isQrCode) {
      if (canvasRef.current && value) {
        renderQrCode(canvasRef.current, value).then(ok => {
          if (!cancelled) setError(!ok);
        });
      }
    } else if (svgRef.current && value) {
      const ok = renderBarcode(svgRef.current, value, format);
      setError(!ok);
    }

    return () => {
      cancelled = true;
    };
  }, [value, format, isQrCode]);

  if (error) {
    return (
      <div class="barcode-error">
        Impossibile generare il codice a barre
      </div>
    );
  }

  return (
    <>
      <div
        class={`barcode-container ${fullscreen ? 'barcode-fullscreen' : ''}`}
        onClick={fullscreenable ? () => setFullscreen(!fullscreen) : undefined}
      >
        {isQrCode ? (
          <canvas ref={canvasRef} class="barcode-svg barcode-qr" />
        ) : (
          <svg ref={svgRef} class="barcode-svg" />
        )}
        {fullscreenable && !fullscreen && (
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
        .barcode-error {
          background: var(--color-surface);
          border: 1px dashed var(--color-border);
          border-radius: var(--radius);
          padding: 24px;
          text-align: center;
          color: var(--color-text-secondary);
          font-size: 14px;
        }
      `}</style>
    </>
  );
}
