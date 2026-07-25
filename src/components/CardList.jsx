import { CardItem } from './CardItem';
import { StarIcon } from './icons';

/**
 * Renders the sections produced by the sort hook. A section with a null label
 * carries no heading (the flat "most recent" run when nothing is starred).
 */
export function CardList({ sections, onToggleFavorite, onDelete }) {
  return (
    <div class="card-list">
      {sections.map(section => (
        <div class="card-section" key={section.key}>
          {section.label && (
            <h2 class={`card-section-label ${section.starred ? 'is-starred' : ''}`}>
              {section.starred && (
                <StarIcon size={12} fill="currentColor" stroke="none" aria-hidden="true" />
              )}
              {section.label}
            </h2>
          )}
          <div class="card-section-items">
            {section.cards.map(card => (
              <CardItem key={card.id} card={card} onToggleFavorite={onToggleFavorite} onDelete={onDelete} />
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
