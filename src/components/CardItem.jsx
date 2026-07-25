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

    </div>
  );
}

function formatCardNumber(num) {
  if (!num) return '';
  if (num.length <= 8) return num;
  return num.replace(/(.{4})/g, '$1 ').trim();
}
