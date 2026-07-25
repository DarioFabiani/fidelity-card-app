import { useState } from 'preact/hooks';
import { unlock } from '../db';

export function UnlockScreen({ onUnlock }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password || loading) return;
    setLoading(true);
    setError('');
    try {
      const ok = await unlock(password);
      if (ok) {
        onUnlock();
      } else {
        setError('Password errata. Riprova.');
      }
    } catch {
      setError('Errore durante lo sblocco. Riprova.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class="unlock-screen">
      <div class="unlock-card">
        <div class="unlock-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <h2 class="unlock-title">Dati cifrati</h2>
        <p class="unlock-desc">
          Le tue carte fedeltà sono protette da password. Sbloccale per continuare.
        </p>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onInput={e => setPassword(e.target.value)}
            autoFocus
          />
          {error && <p class="unlock-error">{error}</p>}
          <button type="submit" class="btn btn-primary btn-block" disabled={loading || !password}>
            {loading ? 'Sblocco in corso...' : 'Sblocca'}
          </button>
        </form>
      </div>

      <style>{`
        .unlock-screen {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background: var(--color-bg);
        }
        .unlock-card {
          width: 100%;
          max-width: 360px;
          background: var(--color-surface);
          border-radius: var(--radius);
          padding: 32px 24px;
          box-shadow: var(--shadow-md);
          text-align: center;
        }
        .unlock-icon {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: var(--color-primary);
          color: #FFFFFF;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 16px;
        }
        .unlock-title {
          font-size: 18px;
          font-weight: 700;
          margin-bottom: 8px;
        }
        .unlock-desc {
          font-size: 14px;
          color: var(--color-text-secondary);
          margin-bottom: 20px;
        }
        .unlock-card form {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .unlock-error {
          font-size: 13px;
          color: var(--color-danger);
          text-align: left;
        }
      `}</style>
    </div>
  );
}
