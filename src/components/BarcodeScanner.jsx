import { useEffect, useRef, useState } from 'preact/hooks';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';

const ZXING_TO_APP_FORMAT = {
  [BarcodeFormat.CODE_128]: 'CODE128',
  [BarcodeFormat.CODE_39]: 'CODE39',
  [BarcodeFormat.EAN_13]: 'EAN13',
  [BarcodeFormat.EAN_8]: 'EAN8',
  [BarcodeFormat.UPC_A]: 'UPC',
  [BarcodeFormat.ITF]: 'ITF14',
  [BarcodeFormat.QR_CODE]: 'QR_CODE',
  [BarcodeFormat.CODABAR]: 'CODABAR'
};

function createReader() {
  const hints = new Map();
  hints.set(DecodeHintType.POSSIBLE_FORMATS, Object.keys(ZXING_TO_APP_FORMAT).map(Number));
  // Tries harder on still images (rotated or small codes in a screenshot).
  hints.set(DecodeHintType.TRY_HARDER, true);
  return new BrowserMultiFormatReader(hints);
}

export function BarcodeScanner({ onDetected, onClose }) {
  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const fileRef = useRef(null);
  const [error, setError] = useState('');
  const [imageError, setImageError] = useState('');
  const [decodingImage, setDecodingImage] = useState(false);
  // Only offered when the camera actually exposes a torch.
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  // Escape closes the scanner on desktop.
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const toggleTorch = async () => {
    const next = !torchOn;
    try {
      await controlsRef.current?.switchTorch?.(next);
      setTorchOn(next);
    } catch {
      setTorchAvailable(false);
    }
  };

  /**
   * Digital cards often arrive as a screenshot or a photo in a chat: reading
   * the code from the image saves pointing a second phone at the first.
   */
  const handleImage = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImageError('');
    setDecodingImage(true);
    const url = URL.createObjectURL(file);
    try {
      const result = await createReader().decodeFromImageUrl(url);
      const format = ZXING_TO_APP_FORMAT[result.getBarcodeFormat()] || 'CODE128';
      controlsRef.current?.stop();
      onDetected(result.getText(), format);
    } catch {
      setImageError('Nessun codice trovato nell\'immagine. Prova con una foto più nitida o ritagliata sul codice.');
    } finally {
      URL.revokeObjectURL(url);
      setDecodingImage(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const reader = createReader();

    reader
      .decodeFromConstraints(
        { video: { facingMode: 'environment' } },
        videoRef.current,
        (result) => {
          if (cancelled || !result) return;
          const format = ZXING_TO_APP_FORMAT[result.getBarcodeFormat()] || 'CODE128';
          controlsRef.current?.stop();
          onDetected(result.getText(), format);
        }
      )
      .then(controls => {
        if (cancelled) {
          controls.stop();
        } else {
          controlsRef.current = controls;
          setTorchAvailable(typeof controls.switchTorch === 'function');
        }
      })
      .catch(err => {
        if (cancelled) return;
        if (err?.name === 'NotAllowedError') {
          setError('Permesso fotocamera negato. Abilitalo nelle impostazioni del browser e riprova.');
        } else if (err?.name === 'NotFoundError') {
          setError('Nessuna fotocamera trovata su questo dispositivo.');
        } else {
          setError('Impossibile avviare la fotocamera.');
        }
      });

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
    };
  }, []);

  return (
    <div class="modal-overlay" onClick={onClose}>
      <div class="modal-content scanner-content" onClick={e => e.stopPropagation()}>
        <div class="scanner-header">
          <h3 class="scanner-title">Scansiona codice a barre</h3>
          <button type="button" class="scanner-close" onClick={onClose} aria-label="Chiudi">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {error ? (
          <div class="scanner-error">{error}</div>
        ) : (
          <div class="scanner-video-wrap">
            <video ref={videoRef} class="scanner-video" muted playsInline />
            <div class="scanner-frame" />
            {torchAvailable && (
              <button
                type="button"
                class={`scanner-torch ${torchOn ? 'is-on' : ''}`}
                onClick={toggleTorch}
                aria-pressed={torchOn}
                aria-label={torchOn ? 'Spegni la torcia' : 'Accendi la torcia'}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M6 2h12v4l-3 4v11a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1V10L6 6z" /><line x1="12" y1="13" x2="12" y2="16" />
                </svg>
              </button>
            )}
          </div>
        )}

        {!error && <p class="scanner-hint">Inquadra il codice a barre della carta</p>}

        <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleImage} />
        <button
          type="button"
          class="btn btn-outline btn-block scanner-image-btn"
          onClick={() => fileRef.current?.click()}
          disabled={decodingImage}
        >
          {decodingImage ? 'Lettura in corso...' : 'Leggi da una foto o screenshot'}
        </button>
        {imageError && <p class="scanner-image-error">{imageError}</p>}

        <style>{`
          .scanner-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 16px;
          }
          .scanner-title {
            font-size: 16px;
            font-weight: 700;
          }
          .scanner-close {
            display: flex;
            padding: 4px;
            color: var(--color-text-secondary);
          }
          .scanner-video-wrap {
            position: relative;
            width: 100%;
            aspect-ratio: 4 / 3;
            background: #000;
            border-radius: var(--radius-sm);
            overflow: hidden;
          }
          .scanner-video {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
          .scanner-frame {
            position: absolute;
            inset: 20% 8%;
            border: 2px solid #fff;
            border-radius: 8px;
            box-shadow: 0 0 0 999px rgba(0, 0, 0, 0.35);
            pointer-events: none;
          }
          .scanner-error {
            padding: 24px 16px;
            text-align: center;
            color: var(--color-text-secondary);
            font-size: 14px;
          }
          .scanner-torch {
            position: absolute;
            right: 10px;
            bottom: 10px;
            width: 44px;
            height: 44px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(0, 0, 0, 0.5);
            color: #fff;
          }
          .scanner-torch.is-on {
            background: #fff;
            color: #000;
          }
          .scanner-image-btn {
            margin-top: 12px;
          }
          .scanner-image-error {
            margin-top: 8px;
            font-size: 13px;
            color: var(--color-danger);
            text-align: center;
          }
          .scanner-hint {
            margin-top: 12px;
            text-align: center;
            font-size: 13px;
            color: var(--color-text-secondary);
          }
        `}</style>
      </div>
    </div>
  );
}
