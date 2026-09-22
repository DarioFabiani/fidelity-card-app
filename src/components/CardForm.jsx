import { useState, useMemo, useRef, useLayoutEffect } from 'preact/hooks';
import { PROVIDERS } from '../constants/providers';
import { BARCODE_FORMATS, suggestFormat, isAlphanumericFormat } from '../constants/barcodeFormats';
import { CARD_COLORS, CARD_COLOR_NAMES, DEFAULT_CARD_COLOR, colorForName } from '../utils/color';
import { foldText } from '../hooks/useSearch';
import { sameCardNumber, normalizeCardNumber } from '../utils/format';
import { BarcodeDisplay } from './BarcodeDisplay';

/**
 * `existingCards` (optional) lets the form warn about a card already saved
 * with the same number — the usual way to end up with duplicates is saving a
 * card someone shared, or re-adding one after forgetting it was there.
 */
export function CardForm({ initial, onSubmit, submitLabel = 'Salva', existingCards = [], onDirtyChange }) {
  const [providerName, setProviderName] = useState(initial?.providerName || '');
  const [cardNumber, setCardNumber] = useState(initial?.cardNumber || '');
  const [barcodeFormat, setBarcodeFormat] = useState(initial?.barcodeFormat || 'CODE128');
  // Once the format has been chosen explicitly, stop guessing it from the
  // number: re-guessing on every keystroke silently reverted the choice.
  const [formatPickedByUser, setFormatPickedByUser] = useState(false);
  const [color, setColor] = useState(initial?.color || DEFAULT_CARD_COLOR);
  // Until a colour is chosen (or comes with a suggested shop), a new card
  // takes one from its name.
  const [colorPicked, setColorPicked] = useState(Boolean(initial));
  const [notes, setNotes] = useState(initial?.notes || '');
  const [suggestions, setSuggestions] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [ScannerComponent, setScannerComponent] = useState(null);
  const [scannerError, setScannerError] = useState('');
  const [submitError, setSubmitError] = useState('');
  // Which keyboard the number field asks for. Kept as explicit state rather
  // than derived from the guessed format: deriving it flipped the keyboard
  // mid-typing as soon as the digits happened to form a valid EAN.
  const [lettersKeyboard, setLettersKeyboard] = useState(
    () => /[^0-9\s]/.test(initial?.cardNumber || '') ||
      ['CODE39', 'QR_CODE', 'CODABAR'].includes(initial?.barcodeFormat)
  );
  const numberRef = useRef(null);

  const toggleKeyboard = () => {
    setLettersKeyboard(v => !v);
    // Mobile keyboards only pick up a new inputmode on the next focus.
    const input = numberRef.current;
    if (input && document.activeElement === input) {
      input.blur();
      setTimeout(() => input.focus(), 0);
    }
  };

  // Lets the page ask before throwing away what was typed.
  const dirty =
    providerName !== (initial?.providerName || '') ||
    cardNumber !== (initial?.cardNumber || '') ||
    notes !== (initial?.notes || '') ||
    (initial ? barcodeFormat !== (initial.barcodeFormat || 'CODE128') || color !== (initial.color || DEFAULT_CARD_COLOR) : false);
  // Layout effect: reported before the next paint, so a Back pressed right
  // after typing is already guarded.
  useLayoutEffect(() => { onDirtyChange?.(dirty); }, [dirty]);

  const duplicate = useMemo(
    () => existingCards.find(c => c.id !== initial?.id && !c._unreadable && sameCardNumber(c.cardNumber, cardNumber)),
    [existingCards, cardNumber, initial]
  );

  const handleScanned = (text, format) => {
    setCardNumber(text);
    setBarcodeFormat(format);
    // The scanner read the real format off the card: don't let a later
    // correction to the number re-guess it.
    setFormatPickedByUser(true);
    setScannerOpen(false);
  };

  const openScanner = async () => {
    setScannerError('');
    if (!ScannerComponent) {
      try {
        // The scanner chunk is fetched on demand and is not precached, so
        // offline this can fail. Silently doing nothing made the button look
        // broken; the error state is local so the form owns its own message.
        const { BarcodeScanner } = await import('./BarcodeScanner');
        setScannerComponent(() => BarcodeScanner);
      } catch {
        setScannerError('Scanner non disponibile offline: inserisci il numero a mano.');
        return;
      }
    }
    setScannerOpen(true);
  };

  const handleProviderInput = (value) => {
    setProviderName(value);
    if (!colorPicked) setColor(colorForName(value));
    if (value.length >= 1) {
      const q = foldText(value);
      const matches = PROVIDERS.filter(p => foldText(p.name).includes(q));
      setSuggestions(matches.slice(0, 5));
    } else {
      setSuggestions([]);
    }
  };

  const selectProvider = (provider) => {
    setProviderName(provider.name);
    setColor(provider.color);
    setColorPicked(true);
    setBarcodeFormat(provider.barcodeFormat);
    // The provider carries the format its cards actually use — that is a
    // choice as explicit as picking from the menu, so stop guessing from the
    // number afterwards. Without this, typing the number right after picking
    // the shop silently overrode it.
    setFormatPickedByUser(true);
    setSuggestions([]);
  };

  const handleCardNumberInput = (value) => {
    setCardNumber(value);
    // Letters pasted in: the digits-only keypad would not let them be edited.
    if (/[^0-9\s]/.test(value)) setLettersKeyboard(true);
    if (!initial && !formatPickedByUser) {
      setBarcodeFormat(suggestFormat(value));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!providerName.trim() || !cardNumber.trim() || submitting) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      await onSubmit({
        providerName: providerName.trim(),
        cardNumber: normalizeCardNumber(cardNumber),
        barcodeFormat,
        color,
        notes: notes.trim()
      });
    } catch (err) {
      // Without this a failed write left the button spinning back to its
      // label with no word on why nothing happened — and what was typed
      // looked saved.
      setSubmitError(err?.message ? `Salvataggio non riuscito: ${err.message}` : 'Salvataggio non riuscito. Riprova.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form class="card-form" onSubmit={handleSubmit}>
      <div class="form-group">
        <label class="label-caps form-label">Nome negozio *</label>
        <input
          type="text"
          value={providerName}
          onInput={e => handleProviderInput(e.target.value)}
          onBlur={() => setTimeout(() => setSuggestions([]), 200)}
          placeholder="es. Conad, Esselunga..."
          required
          autoComplete="off"
        />
        {suggestions.length > 0 && (
          <ul class="suggestions">
            {suggestions.map(p => (
              <li key={p.name}>
                <button type="button" onMouseDown={() => selectProvider(p)}>
                  <span class="suggestion-dot" style={{ background: p.color }} />
                  {p.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div class="form-group">
        <label class="label-caps form-label">Numero carta *</label>
        <div class="card-number-row">
          <input
            ref={numberRef}
            type="text"
            value={cardNumber}
            onInput={e => handleCardNumberInput(e.target.value)}
            placeholder="Numero o codice a barre"
            required
            inputMode={lettersKeyboard ? 'text' : 'numeric'}
            autoCapitalize="characters"
            autoComplete="off"
            spellcheck={false}
          />
          <button
            type="button"
            class="scan-btn keyboard-btn"
            onClick={toggleKeyboard}
            aria-label={lettersKeyboard ? 'Usa il tastierino numerico' : 'Usa la tastiera con lettere'}
            title={lettersKeyboard ? 'Tastierino numerico' : 'Tastiera con lettere'}
          >
            {lettersKeyboard ? '123' : 'ABC'}
          </button>
          <button
            type="button"
            class="scan-btn"
            onClick={openScanner}
            aria-label="Scansiona con la fotocamera"
            title="Scansiona con la fotocamera"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </button>
        </div>
      </div>

      {scannerError && <p class="scan-error">{scannerError}</p>}

      {duplicate && (
        <p class="form-warning">
          Hai già una carta con questo numero: <strong>{duplicate.providerName}</strong>.
        </p>
      )}

      {scannerOpen && ScannerComponent && (
        <ScannerComponent
          onDetected={handleScanned}
          onClose={() => setScannerOpen(false)}
        />
      )}

      <div class="form-group">
        <label class="label-caps form-label">Formato codice a barre</label>
        <select
          value={barcodeFormat}
          onChange={e => {
            setBarcodeFormat(e.target.value);
            setFormatPickedByUser(true);
            // Picked a format that carries letters: offer the letters.
            if (isAlphanumericFormat(e.target.value) && e.target.value !== 'CODE128') setLettersKeyboard(true);
          }}
        >
          {BARCODE_FORMATS.map(f => (
            <option key={f.value} value={f.value}>
              {f.label} — {f.description}
            </option>
          ))}
        </select>
      </div>

      {cardNumber.trim() && (
        <div class="form-group">
          <span class="label-caps form-label">Anteprima</span>
          <BarcodeDisplay value={normalizeCardNumber(cardNumber)} format={barcodeFormat} fullscreenable={false} compact showFallbackWarning />
        </div>
      )}

      <div class="form-group">
        <label class="label-caps form-label">Colore carta</label>
        <div class="color-swatches">
          {CARD_COLORS.map(c => (
            <button
              key={c}
              type="button"
              class={`color-swatch ${color.toLowerCase() === c.toLowerCase() ? 'is-selected' : ''}`}
              style={{ background: c }}
              onClick={() => { setColor(c); setColorPicked(true); }}
              aria-label={`Colore ${CARD_COLOR_NAMES[c]}`}
              aria-pressed={color.toLowerCase() === c.toLowerCase()}
            />
          ))}
          <label class="color-swatch color-custom" title="Scegli un colore">
            <input
              type="color"
              value={color}
              onInput={e => { setColor(e.target.value); setColorPicked(true); }}
              aria-label="Colore personalizzato"
            />
          </label>
        </div>
      </div>

      <div class="form-group">
        <label class="label-caps form-label">Note</label>
        <textarea
          value={notes}
          onInput={e => setNotes(e.target.value)}
          placeholder="Note opzionali..."
          rows={3}
        />
      </div>

      {submitError && <p class="scan-error" role="alert">{submitError}</p>}

      <button type="submit" class="btn btn-primary btn-block" disabled={submitting}>
        {submitting ? 'Salvataggio...' : submitLabel}
      </button>

      <style>{`
        .card-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
          position: relative;
        }
        .form-label {
          font-size: 13px;
        }
        .card-number-row {
          display: flex;
          gap: 8px;
        }
        .card-number-row input {
          flex: 1;
        }
        .scan-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 48px;
          height: 48px;
          flex-shrink: 0;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          color: var(--color-primary);
        }
        .keyboard-btn {
          font-size: var(--text-xs);
          font-weight: 700;
          letter-spacing: 0.04em;
        }
        .scan-btn:active {
          background: var(--color-bg);
        }
        .scan-error {
          font-size: var(--text-sm);
          color: var(--color-danger);
        }
        .form-warning {
          font-size: var(--text-sm);
          margin-top: -12px;
          padding: var(--space-2) var(--space-3);
          border-left: 3px solid var(--color-accent);
          background: color-mix(in srgb, var(--color-accent) 10%, transparent);
          border-radius: 4px;
        }
        .suggestions {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          box-shadow: var(--shadow-md);
          z-index: 10;
          list-style: none;
          overflow: hidden;
        }
        .suggestions button {
          width: 100%;
          padding: 12px;
          text-align: left;
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: var(--text-base);
        }
        .suggestions button:hover {
          background: var(--color-bg);
        }
        .suggestion-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .color-swatches {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(44px, 1fr));
          gap: var(--space-2);
        }
        .color-swatch {
          position: relative;
          aspect-ratio: 1;
          border-radius: var(--radius-sm);
          box-shadow: var(--shadow-sm);
          -webkit-tap-highlight-color: transparent;
          transition: transform 0.12s ease;
        }
        .color-swatch:active {
          transform: scale(0.92);
        }
        .color-swatch.is-selected::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          border: 2px solid var(--color-surface);
          box-shadow: 0 0 0 2px var(--color-text);
        }
        /* The free colour picker stays available, shown as a rainbow swatch. */
        .color-custom {
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          background: conic-gradient(
            from 180deg,
            #A34F47, #A2663F, #877033, #55805F, #467C7D, #4A6E92, #6F5583, #97536B, #A34F47
          );
          cursor: pointer;
        }
        .color-custom input {
          position: absolute;
          opacity: 0;
          width: 100%;
          height: 100%;
          padding: 0;
          border: none;
          cursor: pointer;
        }
      `}</style>
    </form>
  );
}
