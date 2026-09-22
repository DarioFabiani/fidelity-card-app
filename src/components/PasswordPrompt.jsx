import { useState } from 'preact/hooks';

/**
 * Modal that collects a password. `onSubmit` may return an error message
 * string to keep the dialog open and show it (e.g. wrong password); returning
 * nothing means success and the caller closes the dialog.
 */
export function PasswordPrompt({
  title,
  description,
  submitLabel = 'Conferma',
  withConfirm = false,
  // Also asks for the password in use now; passed to onSubmit as 2nd arg.
  withCurrent = false,
  newPasswordLabel = 'Password',
  minLength = 0,
  onSubmit,
  onClose
}) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setError('');

    if (withCurrent && !currentPassword) {
      setError('Inserisci la password attuale');
      return;
    }
    if (minLength && password.length < minLength) {
      setError(`La password deve avere almeno ${minLength} caratteri`);
      return;
    }
    if (withConfirm && password !== confirmPassword) {
      setError('Le due password non coincidono');
      return;
    }

    setBusy(true);
    try {
      const failure = await onSubmit(password, currentPassword);
      if (failure) setError(failure);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div class="modal-overlay" onClick={busy ? undefined : onClose}>
      <div class="modal-content" onClick={e => e.stopPropagation()}>
        <h3 class="pw-title">{title}</h3>
        {description && <p class="pw-desc">{description}</p>}

        <form onSubmit={handleSubmit} class="pw-form">
          {withCurrent && (
            <input
              type="password"
              placeholder="Password attuale"
              autoComplete="current-password"
              value={currentPassword}
              onInput={e => setCurrentPassword(e.target.value)}
              autoFocus
            />
          )}
          <input
            type="password"
            placeholder={newPasswordLabel}
            autoComplete={withConfirm ? 'new-password' : 'current-password'}
            value={password}
            onInput={e => setPassword(e.target.value)}
            autoFocus={!withCurrent}
          />
          {withConfirm && (
            <input
              type="password"
              placeholder="Conferma password"
              autoComplete="new-password"
              value={confirmPassword}
              onInput={e => setConfirmPassword(e.target.value)}
            />
          )}
          {error && <p class="pw-error">{error}</p>}
          <button type="submit" class="btn btn-primary btn-block" disabled={busy || !password}>
            {busy ? 'Attendi...' : submitLabel}
          </button>
          <button type="button" class="btn btn-outline btn-block" onClick={onClose} disabled={busy}>
            Annulla
          </button>
        </form>

        <style>{`
          .pw-title {
            font-size: var(--text-lg);
            font-weight: 700;
          }
          .pw-desc {
            margin-top: var(--space-2);
            font-size: var(--text-sm);
            color: var(--color-text-secondary);
            line-height: 1.6;
          }
          .pw-form {
            display: flex;
            flex-direction: column;
            gap: var(--space-3);
            margin-top: var(--space-5);
          }
          .pw-error {
            font-size: var(--text-sm);
            color: var(--color-danger);
          }
        `}</style>
      </div>
    </div>
  );
}
