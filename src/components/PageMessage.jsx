export function PageMessage({ title, children, action }) {
  return (
    <div class="page-message">
      {title && <h2 class="page-message-title">{title}</h2>}
      {children && <p class="page-message-text">{children}</p>}
      {action}
      <style>{`
        .page-message {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 48px 24px;
          gap: var(--space-2);
          color: var(--color-text-secondary);
          font-size: var(--text-sm);
        }
        .page-message-title {
          font-size: var(--text-lg);
          font-weight: 700;
          color: var(--color-text);
        }
        .page-message-text {
          max-width: 280px;
        }
        .page-message > :last-child:not(p):not(h2) {
          margin-top: var(--space-3);
        }
      `}</style>
    </div>
  );
}
