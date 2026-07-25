import { CardItem } from './CardItem';

/**
 * Renders the sections produced by the sort hook. A section with a null label
 * carries no heading (the flat "most recent" run when nothing is starred).
 */
export function CardList({ sections, onToggleFavorite }) {
  return (
    <div class="card-list">
      {sections.map(section => (
        <div class="card-section" key={section.key}>
          {section.label && (
            <h2 class={`card-section-label ${section.starred ? 'is-starred' : ''}`}>
              {section.starred && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              )}
              {section.label}
            </h2>
          )}
          <div class="card-section-items">
            {section.cards.map(card => (
              <CardItem key={card.id} card={card} onToggleFavorite={onToggleFavorite} />
            ))}
          </div>
        </div>
      ))}
      <style>{`
        .card-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
        }
        .card-section {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }
        .card-section-label {
          position: sticky;
          top: calc(var(--header-height) + env(safe-area-inset-top));
          z-index: 5;
          align-self: flex-start;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 3px 10px;
          border-radius: 999px;
          font-size: var(--text-xs);
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--color-text-secondary);
          background: color-mix(in srgb, var(--color-bg) 85%, transparent);
          -webkit-backdrop-filter: blur(8px);
          backdrop-filter: blur(8px);
        }
        .card-section-label.is-starred {
          color: var(--color-accent);
        }
        .card-section-items {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }
      `}</style>
    </div>
  );
}
