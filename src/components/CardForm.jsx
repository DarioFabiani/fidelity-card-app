import { useState, useRef } from 'preact/hooks';
import { PROVIDERS } from '../constants/providers';
import { BARCODE_FORMATS, suggestFormat } from '../constants/barcodeFormats';
import { CARD_COLORS, DEFAULT_CARD_COLOR } from '../utils/color';

export function CardForm({ initial, onSubmit, submitLabel = 'Salva' }) {
  const [providerName, setProviderName] = useState(initial?.providerName || '');
  const [cardNumber, setCardNumber] = useState(initial?.cardNumber || '');
  const [barcodeFormat, setBarcodeFormat] = useState(initial?.barcodeFormat || 'CODE128');
  const [color, setColor] = useState(initial?.color || DEFAULT_CARD_COLOR);
  const [notes, setNotes] = useState(initial?.notes || '');
  const [suggestions, setSuggestions] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [ScannerComponent, setScannerComponent] = useState(null);
  const formRef = useRef(null);

  const handleScanned = (text, format) => {
    setCardNumber(text);
    setBarcodeFormat(format);
    setScannerOpen(false);
  };

  const openScanner = async () => {
    if (!ScannerComponent) {
      const { BarcodeScanner } = await import('./BarcodeScanner');
      setScannerComponent(() => BarcodeScanner);
    }
    setScannerOpen(true);
  };

  const handleProviderInput = (value) => {
    setProviderName(value);
    if (value.length >= 1) {
      const q = value.toLowerCase();
      const matches = PROVIDERS.filter(p => p.name.toLowerCase().includes(q));
      setSuggestions(matches.slice(0, 5));
    } else {
      setSuggestions([]);
    }
  };

  const selectProvider = (provider) => {
    setProviderName(provider.name);
    setColor(provider.color);
    setBarcodeFormat(provider.barcodeFormat);
    setSuggestions([]);
  };

  const handleCardNumberInput = (value) => {
    setCardNumber(value);
    if (!initial) {
      const suggested = suggestFormat(value);
      setBarcodeFormat(suggested);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!providerName.trim() || !cardNumber.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit({
        providerName: providerName.trim(),
        cardNumber: cardNumber.trim(),
        barcodeFormat,
        color,
        notes: notes.trim()
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form ref={formRef} class="card-form" onSubmit={handleSubmit}>
      <div class="form-group">
        <label class="form-label">Nome negozio *</label>
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
        <label class="form-label">Numero carta *</label>
        <div class="card-number-row">
          <input
            type="text"
            value={cardNumber}
            onInput={e => handleCardNumberInput(e.target.value)}
            placeholder="Numero o codice a barre"
            required
            inputMode="numeric"
          />
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

      {scannerOpen && ScannerComponent && (
        <ScannerComponent
          onDetected={handleScanned}
          onClose={() => setScannerOpen(false)}
        />
      )}

      <div class="form-group">
        <label class="form-label">Formato codice a barre</label>
        <select value={barcodeFormat} onChange={e => setBarcodeFormat(e.target.value)}>
          {BARCODE_FORMATS.map(f => (
            <option key={f.value} value={f.value}>
              {f.label} — {f.description}
            </option>
          ))}
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Colore carta</label>
        <div class="color-swatches">
          {CARD_COLORS.map(c => (
            <button
              key={c}
              type="button"
              class={`color-swatch ${color.toLowerCase() === c.toLowerCase() ? 'is-selected' : ''}`}
              style={{ background: c }}
              onClick={() => setColor(c)}
              aria-label={`Colore ${c}`}
              aria-pressed={color.toLowerCase() === c.toLowerCase()}
            />
          ))}
          <label class="color-swatch color-custom" title="Scegli un colore">
            <input
              type="color"
              value={color}
              onInput={e => setColor(e.target.value)}
            />
          </label>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Note</label>
        <textarea
          value={notes}
          onInput={e => setNotes(e.target.value)}
          placeholder="Note opzionali..."
          rows={3}
        />
      </div>

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
          font-weight: 600;
          color: var(--color-text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
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
        .scan-btn:active {
          background: var(--color-bg);
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
          font-size: 15px;
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
