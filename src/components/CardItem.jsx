import { route } from 'preact-router';
import { getContrastColor, cardGradient, DEFAULT_CARD_COLOR } from '../utils/color';
import { formatCardNumber } from '../utils/format';
import { StarIcon } from './icons';
import { ProviderLogo } from './ProviderLogo';

export function CardItem({ card, onToggleFavorite, onDelete }) {
  const color = card.color || DEFAULT_CARD_COLOR;
  const textColor = getContrastColor(color);

  // A record whose blob failed to decrypt. Shown rather than hidden, so the
  // user knows something is there — but with no navigation (there is nothing
  // to display) and no star (writing to it would seal a placeholder over the
  // original ciphertext). Deleting works: it needs no key.
  if (card._unreadable) {
    return (
      <div class="card-item-wrap">
        <div class="card-item card-item-unreadable">
          <div class="card-item-content">
            <span class="card-provider">Carta non leggibile</span>
            <span class="card-number">I dati non possono essere decifrati</span>
          </div>
        </div>
        {onDelete && (
          <button
            class="card-fav"
            onClick={() => onDelete(card.id)}
            aria-label="Rimuovi la carta non leggibile"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        )}
      </div>
    );
  }

  // The star is a sibling of the card button, not nested inside it: a button
  // within a button is invalid markup and swallows the inner click.
  return (
    <div class="card-item-wrap">
      <button
        class="card-item"
        style={{ background: cardGradient(color), color: textColor }}
        onClick={() => route(`/fidelity-card-app/card/${card.id}`)}
      >
        <ProviderLogo name={card.providerName} />
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
          <StarIcon
            size={20}
            fill={card.favorite ? 'currentColor' : 'none'}
            opacity={card.favorite ? 1 : 0.55}
          />
        </button>
      )}

    </div>
  );
}
