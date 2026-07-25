import { route } from 'preact-router';
import { useState } from 'preact/hooks';
import { decodeSharedCard, isValidShareData } from '../utils/share';
import { addCard } from '../db';
import { BarcodeDisplay } from '../components/BarcodeDisplay';
import { PageMessage } from '../components/PageMessage';
import { getContrastColor, cardGradient, DEFAULT_CARD_COLOR } from '../utils/color';

export function SharedCard({ data, showToast }) {
  const [code, setCode] = useState('');
  const [card, setCard] = useState(null);
  const [unlocking, setUnlocking] = useState(false);
  const [codeError, setCodeError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const validLink = isValidShareData(data);

  const handleUnlock = async (e) => {
    e.preventDefault();
    if (!code || unlocking) return;
    setUnlocking(true);
    setCodeError('');
    try {
      const decoded = await decodeSharedCard(data, code);
      if (decoded) {
        setCard(decoded);
      } else {
        setCodeError('Codice errato. Controlla e riprova.');
      }
    } catch {
      setCodeError('Codice errato. Controlla e riprova.');
    } finally {
      setUnlocking(false);
    }
  };

  const handleSave = async () => {
    if (!card) return;
    setSaving(true);
    try {
      await addCard(card);
      setSaved(true);
      showToast('Carta salvata!');
    } catch {
      showToast('Errore nel salvataggio', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!validLink) {
    return (
      <div class="page">
        <PageMessage
          title="Link non valido"
          action={
            <button class="btn btn-primary" onClick={() => route('/fidelity-card-app/')}>
              Vai alle mie carte
            </button>
          }
        >
          Il link della carta condivisa non è valido o è corrotto.
        </PageMessage>
      </div>
    );
  }

  if (!card) {
    return (
      <div class="page">
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
            Qualcuno ha condiviso una carta con te
          </p>
        </div>

        <div class="shared-card-unlock">
          <h2 class="shared-card-unlock-title">Inserisci il codice</h2>
          <p class="shared-card-unlock-desc">
            Chi ti ha inviato il link ti ha comunicato a parte un codice di 8 caratteri: inseriscilo per vedere la carta.
          </p>
          <form onSubmit={handleUnlock}>
            <input
              type="text"
              inputMode="text"
              autoCapitalize="characters"
              autoComplete="off"
              spellcheck={false}
              maxLength={12}
              placeholder="es. K7M2-P9XR"
              value={code}
              onInput={e => setCode(e.target.value)}
              autoFocus
            />
            {codeError && <p class="shared-card-unlock-error">{codeError}</p>}
            <button type="submit" class="btn btn-primary btn-block" disabled={unlocking || !code}>
              {unlocking ? 'Sblocco...' : 'Sblocca'}
            </button>
          </form>
        </div>

        <style>{`
          .shared-card-unlock {
            background: var(--color-surface);
            border-radius: var(--radius);
            padding: 24px;
            text-align: center;
          }
          .shared-card-unlock-title {
            font-size: 18px;
            font-weight: 700;
            margin-bottom: 8px;
          }
          .shared-card-unlock-desc {
            font-size: 14px;
            color: var(--color-text-secondary);
            margin-bottom: 16px;
          }
          .shared-card-unlock form {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }
          .shared-card-unlock-error {
            font-size: 13px;
            color: var(--color-danger);
            text-align: left;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div class="page">
      <div style={{ textAlign: 'center', marginBottom: '16px' }}>
        <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
          Qualcuno ha condiviso una carta con te
        </p>
      </div>

      <div
        class="shared-card-header"
        style={{
          background: cardGradient(card.color || DEFAULT_CARD_COLOR),
          color: getContrastColor(card.color || DEFAULT_CARD_COLOR)
        }}
      >
        <h2 class="shared-card-name">{card.providerName}</h2>
        <p class="shared-card-number">{card.cardNumber}</p>
      </div>

      <div style={{ marginTop: 'var(--space-4)' }}>
        <BarcodeDisplay value={card.cardNumber} format={card.barcodeFormat} fullscreenable={false} />
      </div>

      {card.notes && (
        <div class="shared-card-notes">
          {card.notes}
        </div>
      )}

      <div style={{ marginTop: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {saved ? (
          <button class="btn btn-primary btn-block" onClick={() => route('/fidelity-card-app/')}>
            Vai alle mie carte
          </button>
        ) : (
          <button class="btn btn-primary btn-block" onClick={handleSave} disabled={saving}>
            {saving ? 'Salvataggio...' : 'Salva questa carta'}
          </button>
        )}
      </div>

      <style>{`
        .shared-card-header {
          border-radius: var(--radius-lg);
          padding: var(--space-6);
          text-align: center;
          box-shadow: var(--shadow-md);
        }
        .shared-card-name {
          font-size: var(--text-xl);
          font-weight: 700;
          letter-spacing: -0.02em;
        }
        .shared-card-number {
          font-size: var(--text-sm);
          opacity: 0.9;
          margin-top: var(--space-1);
          font-family: var(--font-mono);
          letter-spacing: 0.06em;
        }
        .shared-card-notes {
          margin-top: var(--space-4);
          padding: var(--space-4);
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius);
          font-size: var(--text-sm);
        }
      `}</style>
    </div>
  );
}
