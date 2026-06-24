export function EmptyState() {
  return (
    <div class="empty-state">
      <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" style={{ color: 'var(--color-text-secondary)', opacity: 0.5 }}>
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <line x1="2" y1="10" x2="22" y2="10" />
      </svg>
      <h2>Nessuna carta salvata</h2>
      <p>Tocca il pulsante + per aggiungere la tua prima carta fedeltà</p>
      <style>{`
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 48px 24px;
          gap: 12px;
        }
        .empty-state h2 {
          font-size: 18px;
          color: var(--color-text);
        }
        .empty-state p {
          font-size: 14px;
          color: var(--color-text-secondary);
          max-width: 250px;
        }
      `}</style>
    </div>
  );
}
