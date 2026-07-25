import { CardItem } from './CardItem';

/**
 * Renders either a flat run of cards or lettered sections, depending on what
 * the sort hook produced: a section with `letter: null` carries no heading.
 */
export function CardList({ sections }) {
  return (
    <div class="card-list">
      {sections.map(section => (
        <div class="card-section" key={section.letter ?? '_flat'}>
          {section.letter && (
            <h2 class="card-section-letter" aria-hidden="true">{section.letter}</h2>
          )}
          <div class="card-section-items">
            {section.cards.map(card => (
              <CardItem key={card.id} card={card} />
            ))}
          </div>
        </div>
      ))}
      <style>{`
        .card-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }
        .card-section {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }
        .card-section-letter {
          position: sticky;
          top: calc(var(--header-height) + env(safe-area-inset-top));
          z-index: 5;
          align-self: flex-start;
          padding: 2px 10px;
          border-radius: 999px;
          font-size: var(--text-xs);
          font-weight: 700;
          letter-spacing: 0.06em;
          color: var(--color-text-secondary);
          background: color-mix(in srgb, var(--color-bg) 85%, transparent);
          -webkit-backdrop-filter: blur(8px);
          backdrop-filter: blur(8px);
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
