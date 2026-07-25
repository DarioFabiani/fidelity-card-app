import { useState } from 'preact/hooks';
import { dumpRawRecords, resetEverything } from '../db';
import { ConfirmDialog } from './ConfirmDialog';

/**
 * Shown when the vault cannot be opened at all. Without this the error screen
 * was a dead end: no buttons, and Settings unreachable because this screen
 * short-circuits the router.
 *
 * The raw dump comes first on purpose — it needs no key and cannot fail, so
 * the user always has a copy in hand before being offered the destructive way
 * out.
 */
export function VaultRecovery({ message, onCancel }) {
  const [confirmReset, setConfirmReset] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dumped, setDumped] = useState(false);

  const handleDump = async () => {
    setBusy(true);
    try {
      const records = await dumpRawRecords();
      const blob = new Blob([JSON.stringify(records, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `carte-fedelta-dati-grezzi-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setDumped(true);
    } finally {
      setBusy(false);
    }
  };

  const handleReset = async () => {
    setConfirmReset(false);
    await resetEverything();
    window.location.reload();
  };

  return (
    <div class="page vault-recovery">
      <h2 class="vault-recovery-title">Impossibile leggere i dati</h2>
      <p class="vault-recovery-text">{message}</p>

      <div class="vault-recovery-actions">
        <button class="btn btn-primary btn-block" onClick={handleDump} disabled={busy}>
          Scarica una copia dei dati
        </button>
        <p class="vault-recovery-hint">
          Salva i dati così come sono sul dispositivo, cifrati compresi. Non serve la password
          e può tornare utile per recuperarli in seguito.
        </p>

        <button
          class="btn btn-outline btn-block vault-recovery-reset"
          onClick={() => setConfirmReset(true)}
          disabled={busy}
        >
          Ripristina l'app
        </button>
        {!dumped && (
          <p class="vault-recovery-hint">
            Prima di ripristinare, conviene scaricare la copia qui sopra.
          </p>
        )}
      </div>

      {onCancel && (
        <button class="btn btn-outline btn-block vault-recovery-back" onClick={onCancel} disabled={busy}>
          Torna allo sblocco
        </button>
      )}

      {confirmReset && (
        <ConfirmDialog
          title="Ripristinare l'app?"
          message="Tutte le carte e le impostazioni di cifratura verranno cancellate da questo dispositivo. L'operazione non può essere annullata."
          confirmLabel="Ripristina"
          danger
          onConfirm={handleReset}
          onCancel={() => setConfirmReset(false)}
        />
      )}

      <style>{`
        .vault-recovery {
          padding-top: calc(var(--space-6) * 2);
        }
        .vault-recovery-title {
          font-size: var(--text-xl);
          font-weight: 700;
          margin-bottom: var(--space-3);
        }
        .vault-recovery-text {
          font-size: var(--text-sm);
          color: var(--color-text-secondary);
          line-height: 1.6;
          margin-bottom: var(--space-6);
        }
        .vault-recovery-actions {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }
        .vault-recovery-hint {
          font-size: var(--text-xs);
          color: var(--color-text-secondary);
          line-height: 1.5;
          margin-bottom: var(--space-4);
        }
        .vault-recovery-back {
          margin-top: var(--space-5);
        }
        .vault-recovery-reset {
          color: var(--color-danger);
          border-color: color-mix(in srgb, var(--color-danger) 35%, transparent);
        }
      `}</style>
    </div>
  );
}
