import { PlusIcon } from './icons';

export function EmptyState({ onAdd }) {
  return (
    <div class="empty-state">
      <div class="empty-illustration" aria-hidden="true">
        <div class="empty-card empty-card-back" />
        <div class="empty-card empty-card-front">
          <div class="empty-barcode">
            {Array.from({ length: 14 }).map((_, i) => (
              <span key={i} style={{ width: i % 3 === 0 ? '4px' : '2px' }} />
            ))}
          </div>
        </div>
      </div>

      <h2>Nessuna carta salvata</h2>
      <p>Aggiungi la tua prima tessera fedeltà: potrai mostrarla alla cassa senza portarti dietro la plastica.</p>

      {onAdd && (
        <button class="btn btn-primary" onClick={onAdd}>
          <PlusIcon size={18} />
          Aggiungi carta
        </button>
      )}

      <style>{`
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 40px 24px;
          gap: var(--space-3);
        }
        .empty-illustration {
          position: relative;
          width: 150px;
          height: 100px;
          margin-bottom: var(--space-4);
        }
        .empty-card {
          position: absolute;
          border-radius: 10px;
          box-shadow: var(--shadow-md);
        }
        .empty-card-back {
          inset: 0 14px 16px 0;
          background: var(--color-border);
          transform: rotate(-8deg);
        }
        .empty-card-front {
          inset: 12px 0 0 14px;
          background: linear-gradient(135deg, var(--color-primary-light), var(--color-primary));
          transform: rotate(4deg);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .empty-barcode {
          display: flex;
          align-items: center;
          gap: 3px;
          height: 34px;
        }
        .empty-barcode span {
          display: block;
          height: 100%;
          background: rgba(255,255,255,0.85);
          border-radius: 1px;
        }
        .empty-state h2 {
          font-size: var(--text-lg);
          font-weight: 700;
          color: var(--color-text);
        }
        .empty-state p {
          font-size: var(--text-sm);
          color: var(--color-text-secondary);
          max-width: 290px;
          line-height: 1.6;
        }
        .empty-state .btn {
          margin-top: var(--space-2);
        }
      `}</style>
    </div>
  );
}
