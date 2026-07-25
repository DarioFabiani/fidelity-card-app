import { route } from 'preact-router';
import { useState } from 'preact/hooks';
import { decodeSharedCard, isValidShareData } from '../utils/share';
import { addCard } from '../db';
import { BarcodeDisplay } from '../components/BarcodeDisplay';

export function SharedCard({ data, showToast }) {
  const [pin, setPin] = useState('');
  const [card, setCard] = useState(null);
  const [unlocking, setUnlocking] = useState(false);
  const [pinError, setPinError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const validLink = isValidShareData(data);

  const handleUnlock = async (e) => {
    e.preventDefault();
    if (!pin || unlocking) return;
    setUnlocking(true);
    setPinError('');
    try {
      const decoded = await decodeSharedCard(data, pin);
      if (decoded) {
        setCard(decoded);
      } else {
        setPinError('PIN errato. Controlla e riprova.');
      }
    } catch {
      setPinError('PIN errato. Controlla e riprova.');
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
      <div class="page" style={{ textAlign: 'center', padding: '48px 0' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '8px' }}>Link non valido</h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', marginBottom: '20px' }}>
          Il link della carta condivisa non è valido o è corrotto.
        </p>
        <button class="btn btn-primary" onClick={() => route('/fidelity-card-app/')}>
          Vai alle mie carte
        </button>
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
          <h2 class="shared-card-unlock-title">Inserisci il PIN</h2>
          <p class="shared-card-unlock-desc">
            Chi ti ha inviato il link ti ha comunicato (a voce o con un altro messaggio) un PIN a 6 cifre: inseriscilo per vedere la carta.
          </p>
          <form onSubmit={handleUnlock}>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="PIN a 6 cifre"
              value={pin}
              onInput={e => setPin(e.target.value.replace(/\D/g, ''))}
              autoFocus
            />
            {pinError && <p class="shared-card-unlock-error">{pinError}</p>}
            <button type="submit" class="btn btn-primary btn-block" disabled={unlocking || !pin}>
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

      <div class="shared-card-header" style={{ background: card.color }}>
        <h2 class="shared-card-name">{card.providerName}</h2>
        <p class="shared-card-number">{card.cardNumber}</p>
      </div>

      <div style={{ marginTop: '16px' }}>
        <BarcodeDisplay value={card.cardNumber} format={card.barcodeFormat} fullscreenable={false} />
      </div>

      {card.notes && (
        <div style={{
          marginTop: '16px',
          padding: '16px',
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '14px'
        }}>
          {card.notes}
        </div>
      )}

      <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
          border-radius: var(--radius);
          padding: 24px;
          color: #FFFFFF;
          text-align: center;
        }
        .shared-card-name {
          font-size: 22px;
          font-weight: 700;
        }
        .shared-card-number {
          font-size: 14px;
          opacity: 0.9;
          margin-top: 4px;
          font-family: 'SF Mono', 'Menlo', monospace;
        }
      `}</style>
    </div>
  );
}
