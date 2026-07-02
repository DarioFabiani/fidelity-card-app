import { route } from 'preact-router';

function getContrastColor(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

export function CardItem({ card }) {
  const textColor = getContrastColor(card.color || '#1565C0');

  return (
    <button
      class="card-item"
      style={{ background: card.color || '#1565C0', color: textColor }}
      onClick={() => route(`/fidelity-card-app/card/${card.id}`)}
    >
      <div class="card-item-content">
        <span class="card-provider">{card.providerName}</span>
        <span class="card-number">{formatCardNumber(card.cardNumber)}</span>
      </div>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="9 18 15 12 9 6" />
      </svg>
      <style>{`
        .card-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: 20px;
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-sm);
          transition: transform 0.15s, box-shadow 0.15s;
          -webkit-tap-highlight-color: transparent;
          text-align: left;
        }
        .card-item:active {
          transform: scale(0.98);
        }
        .card-item-content {
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 0;
        }
        .card-provider {
          font-size: 16px;
          font-weight: 700;
        }
        .card-number {
          font-size: 13px;
          opacity: 0.85;
          font-family: 'SF Mono', 'Menlo', monospace;
        }
      `}</style>
    </button>
  );
}

function formatCardNumber(num) {
  if (num.length <= 8) return num;
  return num.replace(/(.{4})/g, '$1 ').trim();
}
