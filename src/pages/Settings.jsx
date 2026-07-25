import { useState } from 'preact/hooks';
import { route } from 'preact-router';
import { downloadExport, uploadImport } from '../utils/export-import';
import { getAllCards, isEncryptionEnabled, enableEncryption, disableEncryption } from '../db';
import { PageHeader } from '../components/PageHeader';

function EncryptionSetupModal({ onClose, onEnabled, showToast }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setError('');

    if (password.length < 6) {
      setError('La password deve avere almeno 6 caratteri');
      return;
    }
    if (password !== confirmPassword) {
      setError('Le due password non coincidono');
      return;
    }

    setSaving(true);
    try {
      const cards = await getAllCards();
      await enableEncryption(password, cards);
      onEnabled();
    } catch {
      showToast('Errore nell\'attivazione della cifratura', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div class="modal-overlay" onClick={onClose}>
      <div class="modal-content" onClick={e => e.stopPropagation()}>
        <h3 class="encryption-modal-title">Attiva cifratura</h3>
        <p class="encryption-modal-desc">
          Scegli una master password. Verrà usata per cifrare i dati delle carte sul dispositivo (AES-256-GCM) e non viene mai salvata: se la dimentichi non potrai più recuperare i dati cifrati.
        </p>
        <form onSubmit={handleSubmit} class="encryption-modal-form">
          <input
            type="password"
            placeholder="Password"
            value={password}
            onInput={e => setPassword(e.target.value)}
            autoFocus
          />
          <input
            type="password"
            placeholder="Conferma password"
            value={confirmPassword}
            onInput={e => setConfirmPassword(e.target.value)}
          />
          {error && <p class="encryption-modal-error">{error}</p>}
          <button type="submit" class="btn btn-primary btn-block" disabled={saving}>
            {saving ? 'Attivazione...' : 'Attiva cifratura'}
          </button>
          <button type="button" class="btn btn-outline btn-block" onClick={onClose} disabled={saving}>
            Annulla
          </button>
        </form>
      </div>

      <style>{`
        .encryption-modal-title {
          font-size: 18px;
          font-weight: 700;
          margin-bottom: 12px;
          text-align: center;
        }
        .encryption-modal-desc {
          font-size: 13px;
          color: var(--color-text-secondary);
          margin-bottom: 20px;
          line-height: 1.5;
        }
        .encryption-modal-form {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .encryption-modal-error {
          font-size: 13px;
          color: var(--color-danger);
        }
      `}</style>
    </div>
  );
}

export function Settings({ showToast }) {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [encryptionEnabled, setEncryptionEnabled] = useState(isEncryptionEnabled());
  const [showSetup, setShowSetup] = useState(false);
  const [confirmDisable, setConfirmDisable] = useState(false);
  const [disabling, setDisabling] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const count = await downloadExport();
      showToast(`${count} carte esportate`);
    } catch {
      showToast('Errore nell\'esportazione', 'error');
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      const count = await uploadImport();
      if (count > 0) {
        showToast(`${count} carte importate`);
      }
    } catch (err) {
      showToast(err.message || 'Errore nell\'importazione', 'error');
    } finally {
      setImporting(false);
    }
  };

  const handleDisable = async () => {
    if (!confirmDisable) {
      setConfirmDisable(true);
      return;
    }
    setDisabling(true);
    try {
      await disableEncryption();
      setEncryptionEnabled(false);
      showToast('Cifratura disattivata');
    } catch {
      showToast('Errore nella disattivazione della cifratura', 'error');
    } finally {
      setDisabling(false);
      setConfirmDisable(false);
    }
  };

  return (
    <div class="page">
      <PageHeader title="Impostazioni" onBack={() => route('/fidelity-card-app/')} />

      <div class="settings-section">
        <h3 class="settings-section-title">Dati</h3>

        <button class="settings-item" onClick={handleExport} disabled={exporting}>
          <div class="settings-item-content">
            <span class="settings-item-label">Esporta carte</span>
            <span class="settings-item-desc">Scarica un backup in formato JSON</span>
          </div>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </button>

        <button class="settings-item" onClick={handleImport} disabled={importing}>
          <div class="settings-item-content">
            <span class="settings-item-label">Importa carte</span>
            <span class="settings-item-desc">Carica un file JSON di backup</span>
          </div>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </button>
      </div>

      <div class="settings-section">
        <h3 class="settings-section-title">Sicurezza</h3>

        {encryptionEnabled ? (
          <button
            class="settings-item"
            onClick={handleDisable}
            onBlur={() => setConfirmDisable(false)}
            disabled={disabling}
          >
            <div class="settings-item-content">
              <span class="settings-item-label">
                {confirmDisable ? 'Conferma disattivazione' : 'Disattiva cifratura'}
              </span>
              <span class="settings-item-desc">
                {confirmDisable
                  ? 'I dati delle carte torneranno salvati in chiaro sul dispositivo'
                  : 'Le carte verranno salvate di nuovo in chiaro'}
              </span>
            </div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 9.9-1" />
            </svg>
          </button>
        ) : (
          <button class="settings-item" onClick={() => setShowSetup(true)}>
            <div class="settings-item-content">
              <span class="settings-item-label">Attiva cifratura</span>
              <span class="settings-item-desc">Proteggi le carte con una password (AES-256-GCM)</span>
            </div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </button>
        )}
      </div>

      <div class="settings-section">
        <h3 class="settings-section-title">Info</h3>
        <div class="settings-about">
          <p><strong>Carte Fedeltà</strong> v1.0.0</p>
          <p>Gestisci le tue carte fedeltà dal telefono.</p>
          <p>
            {encryptionEnabled
              ? 'I tuoi dati sono cifrati sul dispositivo (AES-256-GCM) e la password non viene mai salvata.'
              : 'I tuoi dati sono salvati solo sul tuo dispositivo.'}
          </p>
        </div>
      </div>

      {showSetup && (
        <EncryptionSetupModal
          onClose={() => setShowSetup(false)}
          onEnabled={() => {
            setEncryptionEnabled(true);
            setShowSetup(false);
            showToast('Cifratura attivata');
          }}
          showToast={showToast}
        />
      )}

      <style>{`
        .settings-section {
          margin-bottom: 24px;
        }
        .settings-section-title {
          font-size: 13px;
          font-weight: 600;
          color: var(--color-text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 8px;
        }
        .settings-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: 16px;
          background: var(--color-surface);
          border-radius: var(--radius-sm);
          margin-bottom: 8px;
          text-align: left;
          -webkit-tap-highlight-color: transparent;
          color: var(--color-text);
        }
        .settings-item:active {
          opacity: 0.8;
        }
        .settings-item-content {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .settings-item-label {
          font-size: 15px;
          font-weight: 600;
        }
        .settings-item-desc {
          font-size: 13px;
          color: var(--color-text-secondary);
        }
        .settings-about {
          padding: 16px;
          background: var(--color-surface);
          border-radius: var(--radius-sm);
          font-size: 14px;
          line-height: 1.6;
        }
        .settings-about p + p {
          margin-top: 4px;
        }
      `}</style>
    </div>
  );
}
