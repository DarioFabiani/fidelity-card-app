import { useEffect, useRef, useState } from 'preact/hooks';
import Quagga from '@ericblade/quagga2';

const FORMAT_MAP = {
  code_128: 'CODE128',
  ean_13: 'EAN13',
  ean_8: 'EAN8',
  upc_a: 'UPC',
  i2of5: 'ITF14',
  code_39: 'CODE39',
};

export function BarcodeScanner({ onScan, onClose }) {
  const viewportRef = useRef(null);
  const [error, setError] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let running = false;

    Quagga.init(
      {
        inputStream: {
          type: 'LiveStream',
          target: viewportRef.current,
          constraints: { facingMode: 'environment' },
        },
        locator: { patchSize: 'medium', halfSample: true },
        numOfWorkers: 1,
        decoder: {
          readers: [
            'ean_reader',
            'ean_8_reader',
            'code_128_reader',
            'code_39_reader',
            'upc_reader',
            'i2of5_reader',
          ],
        },
        locate: true,
      },
      (err) => {
        if (err) {
          setError(err?.message?.includes('permission') || err?.name === 'NotAllowedError'
            ? 'Permesso fotocamera negato. Controlla le impostazioni del browser.'
            : 'Fotocamera non disponibile su questo dispositivo.');
          return;
        }
        running = true;
        Quagga.start();
        setReady(true);
      }
    );

    Quagga.onDetected((result) => {
      const code = result?.codeResult?.code;
      const fmt = result?.codeResult?.format;
      if (!code) return;
      const appFormat = FORMAT_MAP[fmt] || 'CODE128';
      Quagga.stop();
      running = false;
      onScan(code, appFormat);
    });

    return () => {
      if (running) Quagga.stop();
      Quagga.offDetected();
    };
  }, []);

  return (
    <div class="scanner-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div class="scanner-modal">
        <div class="scanner-header">
          <span class="scanner-title">Scansiona barcode</span>
          <button class="scanner-close" onClick={onClose} aria-label="Chiudi">✕</button>
        </div>

        <div class="scanner-viewport" ref={viewportRef}>
          {!ready && !error && (
            <div class="scanner-loading">
              <div class="scanner-spinner" />
              <span>Avvio fotocamera...</span>
            </div>
          )}
          {error && (
            <div class="scanner-error">
              <span class="scanner-error-icon">⚠️</span>
              <p>{error}</p>
              <button class="btn btn-primary" onClick={onClose}>Chiudi</button>
            </div>
          )}
          {ready && <div class="scanner-crosshair" />}
        </div>

        <p class="scanner-hint">Inquadra il barcode al centro</p>
      </div>

      <style>{`
        .scanner-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.85);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
        }
        .scanner-modal {
          background: var(--color-surface);
          border-radius: var(--radius);
          width: 100%;
          max-width: 440px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .scanner-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px;
          border-bottom: 1px solid var(--color-border);
        }
        .scanner-title {
          font-weight: 600;
          font-size: 16px;
        }
        .scanner-close {
          background: none;
          border: none;
          font-size: 18px;
          cursor: pointer;
          color: var(--color-text-secondary);
          padding: 4px 8px;
          border-radius: var(--radius-sm);
        }
        .scanner-close:hover {
          background: var(--color-bg);
        }
        .scanner-viewport {
          position: relative;
          width: 100%;
          aspect-ratio: 4/3;
          background: #000;
          overflow: hidden;
        }
        .scanner-viewport video {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .scanner-viewport canvas {
          display: none;
        }
        .scanner-loading, .scanner-error {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          color: #fff;
          font-size: 14px;
          text-align: center;
          padding: 20px;
        }
        .scanner-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid rgba(255,255,255,0.2);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .scanner-error-icon { font-size: 32px; }
        .scanner-error p { max-width: 240px; line-height: 1.5; }
        .scanner-crosshair {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 70%;
          height: 33%;
          border: 2px solid rgba(255,255,255,0.6);
          border-radius: 4px;
          box-shadow: 0 0 0 9999px rgba(0,0,0,0.35);
          pointer-events: none;
        }
        .scanner-hint {
          text-align: center;
          font-size: 13px;
          color: var(--color-text-secondary);
          padding: 12px 16px;
        }
      `}</style>
    </div>
  );
}
