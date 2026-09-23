import { useBackToClose } from '../hooks/useBackToClose';

export function ConfirmDialog({ title, message, confirmLabel = 'Conferma', danger = false, onConfirm, onCancel }) {
  useBackToClose(true, onCancel);
  return (
    <div class="modal-overlay" onClick={onCancel}>
      <div class="modal-content" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" onClick={e => e.stopPropagation()}>
        <h3 class="confirm-title" id="confirm-title">{title}</h3>
        {message && <p class="confirm-message">{message}</p>}
        <div class="confirm-actions">
          <button type="button" class="btn btn-outline btn-block" onClick={onCancel}>
            Annulla
          </button>
          <button
            type="button"
            class={`btn ${danger ? 'btn-danger' : 'btn-primary'} btn-block`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
        <style>{`
          .confirm-title {
            font-size: var(--text-lg);
            font-weight: 700;
          }
          .confirm-message {
            margin-top: var(--space-2);
            font-size: var(--text-sm);
            color: var(--color-text-secondary);
            line-height: 1.6;
          }
          .confirm-actions {
            display: flex;
            gap: var(--space-2);
            margin-top: var(--space-5);
          }
          .confirm-actions .btn {
            flex: 1;
          }
        `}</style>
      </div>
    </div>
  );
}
