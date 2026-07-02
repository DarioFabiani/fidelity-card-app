import { useEffect, useRef, useState } from 'preact/hooks';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType, NotFoundException } from '@zxing/library';

const ZXING_TO_APP_FORMAT = {
  [BarcodeFormat.EAN_13]: 'EAN13',
  [BarcodeFormat.EAN_8]: 'EAN8',
  [BarcodeFormat.UPC_A]: 'UPC',
  [BarcodeFormat.ITF]: 'ITF14',
  [BarcodeFormat.CODE_39]: 'CODE39',
  [BarcodeFormat.CODE_128]: 'CODE128'
};

export function CameraScanner({ onDetect, onClose }) {
  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.QR_CODE,
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.ITF
    ]);
    const reader = new BrowserMultiFormatReader(hints);

    reader.decodeFromConstraints(
      { video: { facingMode: 'environment' } },
      videoRef.current,
      (result, err, controls) => {
        controlsRef.current = controls;
        if (cancelled) return;
        if (result) {
          cancelled = true;
          const format = ZXING_TO_APP_FORMAT[result.getBarcodeFormat()] || 'CODE128';
          controls.stop();
          onDetect(result.getText(), format);
        } else if (err && !(err instanceof NotFoundException)) {
          setError('Errore durante la scansione');
        }
      }
    ).catch(() => {
      if (!cancelled) setError('Impossibile accedere alla fotocamera');
    });

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
    };
  }, [onDetect]);

  return (
    <div class="scanner-overlay">
      <div class="scanner-topbar">
        <button class="scanner-close" onClick={onClose} aria-label="Chiudi scansione">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        <span class="scanner-title">Inquadra il codice</span>
        <span class="scanner-topbar-spacer" />
      </div>

      <video ref={videoRef} class="scanner-video" muted playsInline autoPlay />

      <div class="scanner-frame">
        <span class="scanner-corner scanner-corner-tl" />
        <span class="scanner-corner scanner-corner-tr" />
        <span class="scanner-corner scanner-corner-bl" />
        <span class="scanner-corner scanner-corner-br" />
        {!error && <span class="scanner-line" />}
      </div>

      {error ? (
        <p class="scanner-hint scanner-error">{error}</p>
      ) : (
        <p class="scanner-hint">Allinea il codice a barre o il QR code nel riquadro</p>
      )}

      <style>{`
        .scanner-overlay {
          position: fixed;
          inset: 0;
          background: #000000;
          z-index: 400;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .scanner-topbar {
          position: relative;
          z-index: 2;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px;
          padding-top: max(16px, env(safe-area-inset-top));
        }
        .scanner-topbar-spacer {
          width: 44px;
        }
        .scanner-title {
          color: #FFFFFF;
          font-size: 15px;
          font-weight: 600;
        }
        .scanner-close {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #FFFFFF;
          background: rgba(255,255,255,0.16);
        }
        .scanner-video {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .scanner-frame {
          position: relative;
          z-index: 1;
          width: min(72vw, 280px);
          height: min(72vw, 280px);
          margin-top: 10vh;
          overflow: hidden;
        }
        .scanner-corner {
          position: absolute;
          width: 36px;
          height: 36px;
          border: 4px solid var(--color-primary-container, #FFFFFF);
        }
        .scanner-corner-tl { top: 0; left: 0; border-right: none; border-bottom: none; border-radius: 20px 0 0 0; }
        .scanner-corner-tr { top: 0; right: 0; border-left: none; border-bottom: none; border-radius: 0 20px 0 0; }
        .scanner-corner-bl { bottom: 0; left: 0; border-right: none; border-top: none; border-radius: 0 0 0 20px; }
        .scanner-corner-br { bottom: 0; right: 0; border-left: none; border-top: none; border-radius: 0 0 20px 0; }
        .scanner-line {
          position: absolute;
          left: 4px;
          right: 4px;
          height: 3px;
          border-radius: 999px;
          background: var(--color-primary-container, #FFFFFF);
          box-shadow: 0 0 12px var(--color-primary-container, #FFFFFF);
          animation: scanLine 2.2s ease-in-out infinite;
        }
        @keyframes scanLine {
          0% { top: 4px; }
          50% { top: calc(100% - 8px); }
          100% { top: 4px; }
        }
        .scanner-hint {
          position: relative;
          z-index: 2;
          margin-top: 24px;
          padding: 0 32px;
          color: rgba(255,255,255,0.85);
          font-size: 14px;
          text-align: center;
        }
        .scanner-error {
          color: #FFB4AB;
        }
      `}</style>
    </div>
  );
}
