/**
 * Offered when a new build has been downloaded. The update is applied only on
 * request (or on its own the next time the app is fully closed): reloading
 * by itself could land in the middle of showing a barcode at the till, wipe a
 * half-filled form, or — with encryption on — drop the key and ask for the
 * password at the worst moment.
 */
export function UpdateBanner({ onUpdate, onDismiss }) {
  return (
    <div class="update-banner" role="status">
      <span>È disponibile una nuova versione</span>
      <div class="update-actions">
        <button class="update-apply" onClick={onUpdate}>Aggiorna</button>
        <button class="update-dismiss" onClick={onDismiss} aria-label="Più tardi">&times;</button>
      </div>
      <style>{`
        .update-banner {
          position: fixed;
          top: calc(var(--header-height) + env(safe-area-inset-top) + var(--space-2));
          left: 50%;
          transform: translateX(-50%);
          width: calc(100% - 2 * var(--space-4));
          max-width: 568px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--space-3);
          padding: var(--space-2) var(--space-2) var(--space-2) var(--space-4);
          background: var(--color-surface);
          color: var(--color-text);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          box-shadow: var(--shadow-lg);
          font-size: var(--text-sm);
          z-index: 160;
          animation: fadeIn 0.2s ease;
        }
        .update-actions {
          display: flex;
          align-items: center;
          gap: var(--space-1);
        }
        .update-apply {
          padding: 6px 14px;
          border-radius: 999px;
          background: var(--color-primary);
          color: var(--color-on-primary);
          font-weight: 600;
        }
        .update-dismiss {
          font-size: 20px;
          padding: 2px 10px;
          color: var(--color-text-secondary);
        }
      `}</style>
    </div>
  );
}
