import { useState, useRef } from 'preact/hooks';
import { PROVIDERS } from '../constants/providers';
import { BARCODE_FORMATS, suggestFormat } from '../constants/barcodeFormats';
import { BarcodeScanner } from './BarcodeScanner';

export function CardForm({ initial, onSubmit, submitLabel = 'Salva' }) {
  const [providerName, setProviderName] = useState(initial?.providerName || '');
  const [cardNumber, setCardNumber] = useState(initial?.cardNumber || '');
  const [barcodeFormat, setBarcodeFormat] = useState(initial?.barcodeFormat || 'CODE128');
  const [color, setColor] = useState(initial?.color || '#1565C0');
  const [notes, setNotes] = useState(initial?.notes || '');
  const [suggestions, setSuggestions] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [scanning, setScanning] = useState(false);
  const formRef = useRef(null);

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

  const handleScan = (code, format) => {
    setCardNumber(code);
    setBarcodeFormat(format);
    setScanning(false);
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
    <>
    {scanning && (
      <BarcodeScanner onScan={handleScan} onClose={() => setScanning(false)} />
    )}
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
          <button type="button" class="scan-btn" onClick={() => setScanning(true)} title="Scansiona con fotocamera">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
          </button>
        </div>
      </div>

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
        <div class="color-picker">
          <input
            type="color"
            value={color}
            onInput={e => setColor(e.target.value)}
            class="color-input"
          />
          <span class="color-value">{color}</span>
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
        .card-number-row {
          display: flex;
          gap: 8px;
          align-items: stretch;
        }
        .card-number-row input {
          flex: 1;
          min-width: 0;
        }
        .scan-btn {
          flex-shrink: 0;
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--color-primary);
          color: #fff;
          border: none;
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: background 0.15s;
        }
        .scan-btn:hover {
          background: var(--color-primary-dark);
        }
        .color-picker {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .color-input {
          width: 48px;
          height: 48px;
          padding: 2px;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          cursor: pointer;
        }
        .color-value {
          font-family: 'SF Mono', 'Menlo', monospace;
          font-size: 14px;
          color: var(--color-text-secondary);
        }
      `}</style>
    </form>
    </>
  );
}
