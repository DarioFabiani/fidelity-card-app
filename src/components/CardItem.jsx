import { route } from 'preact-router';
import { getContrastColor, cardGradient, DEFAULT_CARD_COLOR } from '../utils/color';

export function CardItem({ card, onToggleFavorite }) {
  const color = card.color || DEFAULT_CARD_COLOR;
  const textColor = getContrastColor(color);

  // The star is a sibling of the card button, not nested inside it: a button
  // within a button is invalid markup and swallows the inner click.
  return (
    <div class="card-item-wrap">
      <button
        class="card-item"
        style={{ background: cardGradient(color), color: textColor }}
        onClick={() => route(`/fidelity-card-app/card/${card.id}`)}
      >
        <div class="card-item-content">
          <span class="card-provider">{card.providerName}</span>
          <span class="card-number">{formatCardNumber(card.cardNumber)}</span>
        </div>
      </button>

      {onToggleFavorite && (
        <button
          class="card-fav"
          style={{ color: textColor }}
          onClick={() => onToggleFavorite(card.id)}
          aria-label={card.favorite ? `Rimuovi ${card.providerName} dai preferiti` : `Aggiungi ${card.providerName} ai preferiti`}
          aria-pressed={Boolean(card.favorite)}
        >
          <svg
            width="20" height="20" viewBox="0 0 24 24"
            fill={card.favorite ? 'currentColor' : 'none'}
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
            style={{ opacity: card.favorite ? 1 : 0.55 }}
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </button>
      )}

      <style>{`
        .card-item-wrap {
          position: relative;
        }
        .card-item {
          position: relative;
          display: flex;
          align-items: center;
          width: 100%;
          padding: var(--space-5);
          padding-right: 60px;
          min-height: 88px;
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-md);
          transition: transform 0.15s ease, box-shadow 0.15s ease;
          -webkit-tap-highlight-color: transparent;
          text-align: left;
          overflow: hidden;
          isolation: isolate;
        }
        /* Soft sheen across the card face, keeps flat brand colours from looking dull. */
        .card-item::after {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(120% 80% at 100% 0%, rgba(255,255,255,0.18), transparent 60%);
          pointer-events: none;
          z-index: -1;
        }
        .card-item:active {
          transform: scale(0.985);
          box-shadow: var(--shadow-sm);
        }
        .card-item-content {
          display: flex;
          flex-direction: column;
          gap: var(--space-1);
          min-width: 0;
        }
        .card-provider {
          font-size: var(--text-lg);
          font-weight: 700;
          letter-spacing: -0.01em;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .card-number {
          font-size: var(--text-sm);
          opacity: 0.88;
          font-family: var(--font-mono);
          letter-spacing: 0.04em;
        }
        .card-fav {
          position: absolute;
          top: 50%;
          right: 10px;
          transform: translateY(-50%);
          display: flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          -webkit-tap-highlight-color: transparent;
          transition: transform 0.12s ease;
        }
        .card-fav:active {
          transform: translateY(-50%) scale(0.85);
        }
      `}</style>
    </div>
  );
}

function formatCardNumber(num) {
  if (!num) return '';
  if (num.length <= 8) return num;
  return num.replace(/(.{4})/g, '$1 ').trim();
}
