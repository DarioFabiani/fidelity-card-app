import { getContrastColor, cardGradient } from '../utils/color';

/**
 * Colour banner shared by ViewCard and SharedCard: gradient background tinted
 * to the card's colour, contrasting text, provider name and formatted number.
 * `action` is an optional element (ViewCard's favourite-star button) absolutely
 * positioned in the top-right corner via .card-banner-fav.
 */
export function CardBanner({ color, name, number, action }) {
  return (
    <div class="card-banner" style={{ background: cardGradient(color), color: getContrastColor(color) }}>
      {action}
      <h2 class="card-banner-name">{name}</h2>
      <p class="card-banner-number">{number}</p>
      <style>{`
        .card-banner {
          position: relative;
          border-radius: var(--radius-lg);
          padding: var(--space-6);
          text-align: center;
          box-shadow: var(--shadow-md);
        }
        .card-banner-fav {
          position: absolute;
          top: var(--space-2);
          right: var(--space-2);
          display: flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          color: inherit;
          -webkit-tap-highlight-color: transparent;
          transition: transform 0.12s ease;
        }
        .card-banner-fav:active {
          transform: scale(0.85);
        }
        .card-banner-name {
          font-size: var(--text-xl);
          font-weight: 700;
          letter-spacing: -0.02em;
          /* Keeps a long name from wrapping underneath the absolutely
             positioned star in the top-right corner. */
          padding: 0 40px;
          /* A long name took five lines and pushed the barcode off screen. */
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          overflow-wrap: anywhere;
        }
        .card-banner-number {
          font-size: var(--text-sm);
          opacity: 0.9;
          margin-top: var(--space-1);
          font-family: var(--font-mono);
          letter-spacing: 0.06em;
        }
      `}</style>
    </div>
  );
}
