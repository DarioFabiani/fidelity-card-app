import { useState } from 'preact/hooks';
import { route } from 'preact-router';
import { downloadExport, pickImportFile, decryptImport, commitImport } from '../utils/export-import';
import { isEncryptionEnabled, enableEncryption, disableEncryption, changePassword } from '../db';
import { PageHeader } from '../components/PageHeader';
import { PasswordPrompt } from '../components/PasswordPrompt';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { LockIcon } from '../components/icons';
import { AUTOLOCK_OPTIONS, getAutoLockMinutes, setAutoLockMinutes } from '../utils/autolock';

function importSummary({ added, updated, kept = 0 }) {
  const parts = [];
  if (added) parts.push(`${added} ${added === 1 ? 'carta importata' : 'carte importate'}`);
  if (updated) parts.push(`${updated} ${updated === 1 ? 'aggiornata' : 'aggiornate'}`);
  if (kept) {
    parts.push(`${kept} già ${kept === 1 ? 'presente' : 'presenti'} (tenuta la versione più recente)`);
  }
  return parts.length ? parts.join(', ') : 'Nessuna carta importata';
}

export function Settings({ showToast }) {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [encryptionEnabled, setEncryptionEnabled] = useState(isEncryptionEnabled());
  const [showSetup, setShowSetup] = useState(false);
  const [confirmDisable, setConfirmDisable] = useState(false);
  const [askExportPassword, setAskExportPassword] = useState(false);
  const [pendingImport, setPendingImport] = useState(null);
  const [autoLock, setAutoLock] = useState(getAutoLockMinutes);
  const [showChangePassword, setShowChangePassword] = useState(false);

  const runExport = async (password) => {
    setExporting(true);
    try {
      const { count, skipped } = await downloadExport(password);
      const exported = `${count} ${count === 1 ? 'carta esportata' : 'carte esportate'}`;
      showToast(skipped
        ? `${exported} — ${skipped} non ${skipped === 1 ? 'leggibile esclusa' : 'leggibili escluse'}`
        : exported,
        skipped ? 'error' : 'success');
    } catch {
      showToast('Errore nell\'esportazione', 'error');
    } finally {
      setExporting(false);
    }
  };

  // With encryption on, the backup leaves the device — so it gets its own
  // password rather than being written out in the clear.
  const handleExport = () => {
    if (encryptionEnabled) {
      setAskExportPassword(true);
    } else {
      runExport(null);
    }
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      const picked = await pickImportFile();
      if (!picked) return;
      if (picked.encrypted) {
        setPendingImport(picked);
        return;
      }
      showToast(importSummary(await commitImport(picked.cards)));
    } catch (err) {
      showToast(err.message || 'Errore nell\'importazione', 'error');
    } finally {
      setImporting(false);
    }
  };

  const handleDisable = async () => {
    setConfirmDisable(false);
    try {
      await disableEncryption();
      setEncryptionEnabled(false);
      showToast('Cifratura disattivata');
    } catch {
      showToast('Errore nella disattivazione della cifratura', 'error');
    }
  };

  return (
    <div class="page">
      <PageHeader title="Impostazioni" onBack={() => route('/fidelity-card-app/')} />

      <div class="settings-section">
        <h3 class="label-caps settings-section-title">Dati</h3>

        <button class="settings-item" onClick={handleExport} disabled={exporting}>
          <div class="settings-item-content">
            <span class="settings-item-label">Esporta carte</span>
            <span class="settings-item-desc">{encryptionEnabled ? 'Backup JSON protetto da password' : 'Scarica un backup in formato JSON'}</span>
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
        <h3 class="label-caps settings-section-title">Sicurezza</h3>

        {encryptionEnabled ? (
          <button class="settings-item" onClick={() => setConfirmDisable(true)}>
            <div class="settings-item-content">
              <span class="settings-item-label">Disattiva cifratura</span>
              <span class="settings-item-desc">Le carte verranno salvate di nuovo in chiaro</span>
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
            <LockIcon size={20} />
          </button>
        )}

        {encryptionEnabled && (
          <button class="settings-item" onClick={() => setShowChangePassword(true)}>
            <div class="settings-item-content">
              <span class="settings-item-label">Cambia password</span>
              <span class="settings-item-desc">Ricifra le carte con una nuova master password</span>
            </div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="7.5" cy="15.5" r="4.5" /><path d="M10.7 12.3 21 2" /><path d="m16 7 3 3" /><path d="m19 4 2 2" />
            </svg>
          </button>
        )}

        {encryptionEnabled && (
          <label class="settings-item settings-select">
            <div class="settings-item-content">
              <span class="settings-item-label">Blocco automatico</span>
              <span class="settings-item-desc">Chiede di nuovo la password dopo che l'app è rimasta in background</span>
            </div>
            <select
              value={autoLock}
              onChange={e => {
                const minutes = Number(e.target.value);
                setAutoLock(minutes);
                setAutoLockMinutes(minutes);
              }}
            >
              {AUTOLOCK_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div class="settings-section">
        <h3 class="label-caps settings-section-title">Info</h3>
        <div class="settings-about">
          <p><strong>Carte Fedeltà</strong> v{__APP_VERSION__}</p>
          <p>Gestisci le tue carte fedeltà dal telefono.</p>
          <p>
            {encryptionEnabled
              ? 'I tuoi dati sono cifrati sul dispositivo (AES-256-GCM) e la password non viene mai salvata.'
              : 'I tuoi dati sono salvati solo sul tuo dispositivo.'}
          </p>
        </div>
      </div>

      {showSetup && (
        <PasswordPrompt
          title="Attiva cifratura"
          description="Scegli una master password. Verrà usata per cifrare i dati delle carte sul dispositivo (AES-256-GCM) e non viene mai salvata: se la dimentichi non potrai più recuperare i dati cifrati."
          submitLabel="Attiva cifratura"
          withConfirm
          minLength={6}
          onClose={() => setShowSetup(false)}
          onSubmit={async (password) => {
            try {
              await enableEncryption(password);
            } catch (err) {
              // Surface the real reason: hiding it behind a generic string
              // left the user with no idea what state the vault was in.
              return err?.message || 'Errore nell\'attivazione della cifratura';
            }
            setEncryptionEnabled(true);
            setShowSetup(false);
            showToast('Cifratura attivata');
          }}
        />
      )}

      {showChangePassword && (
        <PasswordPrompt
          title="Cambia password"
          description="Le carte vengono ricifrate con la nuova password. Anche i backup protetti già esportati restano apribili solo con la password usata per crearli."
          submitLabel="Cambia password"
          withCurrent
          withConfirm
          newPasswordLabel="Nuova password"
          minLength={6}
          onClose={() => setShowChangePassword(false)}
          onSubmit={async (password, current) => {
            if (password === current) return 'La nuova password è uguale a quella attuale';
            try {
              const ok = await changePassword(current, password);
              if (!ok) return 'Password attuale errata';
            } catch (err) {
              return err?.message || 'Errore nel cambio password';
            }
            setShowChangePassword(false);
            showToast('Password cambiata');
          }}
        />
      )}

      {askExportPassword && (
        <PasswordPrompt
          title="Proteggi il backup"
          description="Il file di backup lascia il dispositivo, quindi viene cifrato con una password. Può essere la stessa master password o un'altra: ti servirà per reimportarlo."
          submitLabel="Esporta"
          withConfirm
          minLength={6}
          onClose={() => setAskExportPassword(false)}
          onSubmit={async (password) => {
            setAskExportPassword(false);
            await runExport(password);
          }}
        />
      )}

      {pendingImport && (
        <PasswordPrompt
          title={pendingImport.raw ? 'Copia dei dati cifrata' : 'Backup protetto'}
          description={pendingImport.raw
            ? 'Questa copia contiene carte cifrate. Inserisci la master password che era in uso quando è stata salvata.'
            : 'Questo backup è cifrato. Inserisci la password usata al momento dell\'esportazione.'}
          submitLabel="Importa"
          onClose={() => setPendingImport(null)}
          onSubmit={async (password) => {
            const cards = await decryptImport(pendingImport, password);
            if (!cards) return 'Password errata o file di backup corrotto';
            const summary = importSummary(await commitImport(cards));
            setPendingImport(null);
            showToast(summary);
          }}
        />
      )}

      {confirmDisable && (
        <ConfirmDialog
          title="Disattivare la cifratura?"
          message="I dati delle carte torneranno salvati in chiaro su questo dispositivo, senza protezione da password."
          confirmLabel="Disattiva"
          danger
          onConfirm={handleDisable}
          onCancel={() => setConfirmDisable(false)}
        />
      )}

      <style>{`
        .settings-section {
          margin-bottom: 24px;
        }
        .settings-section-title {
          font-size: 13px;
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
        .settings-select {
          flex-wrap: wrap;
          gap: var(--space-3);
          cursor: default;
        }
        .settings-select select {
          width: auto;
          padding: 8px 10px;
        }
        .settings-item-label {
          font-size: var(--text-base);
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
