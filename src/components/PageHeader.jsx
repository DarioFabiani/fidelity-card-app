import { BackArrowIcon } from './icons';

export function PageHeader({ title, onBack }) {
  return (
    <div class="page-header">
      {onBack && (
        <button type="button" class="page-back" onClick={onBack} aria-label="Torna indietro">
          <BackArrowIcon size={22} />
        </button>
      )}
      <h2 class="page-title">{title}</h2>
      <style>{`
        .page-header {
          display: flex;
          align-items: center;
          gap: 4px;
          margin-bottom: var(--space-5);
          margin-left: -8px;
        }
        .page-back {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          flex-shrink: 0;
          border-radius: 50%;
          color: var(--color-text);
          -webkit-tap-highlight-color: transparent;
          transition: background 0.15s;
        }
        .page-back:active {
          background: var(--color-border);
        }
        .page-title {
          font-size: var(--text-xl);
          font-weight: 700;
          letter-spacing: -0.02em;
          min-width: 0;
        }
      `}</style>
    </div>
  );
}
