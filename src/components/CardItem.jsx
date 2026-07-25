import { route } from 'preact-router';
import { getContrastColor, cardGradient, DEFAULT_CARD_COLOR } from '../utils/color';

export function CardItem({ card }) {
  const color = card.color || DEFAULT_CARD_COLOR;
  const textColor = getContrastColor(color);

  return (
    <button
      class="card-item"
      style={{ background: cardGradient(color), color: textColor }}
      onClick={() => route(`/fidelity-card-app/card/${card.id}`)}
    >
      <div class="card-item-content">
        <span class="card-provider">{card.providerName}</span>
        <span class="card-number">{formatCardNumber(card.cardNumber)}</span>
      </div>
      <svg class="card-chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="9 18 15 12 9 6" />
      </svg>
      <style>{`
        .card-item {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: var(--space-5);
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
        .card-chevron {
          flex-shrink: 0;
          opacity: 0.7;
        }
      `}</style>
    </button>
  );
}

function formatCardNumber(num) {
  if (num.length <= 8) return num;
  return num.replace(/(.{4})/g, '$1 ').trim();
}
