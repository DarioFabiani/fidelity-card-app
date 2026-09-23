import { SORT_RECENT, SORT_ALPHA } from '../hooks/useSortedCards';

const OPTIONS = [
  { value: SORT_RECENT, label: 'Recenti' },
  { value: SORT_ALPHA, label: 'A-Z' }
];

export function SortToggle({ mode, onChange }) {
  return (
    <div class="sort-toggle" role="group" aria-label="Ordina le carte">
      {OPTIONS.map(opt => (
        <button
          key={opt.value}
          type="button"
          class={`sort-option ${mode === opt.value ? 'is-active' : ''}`}
          onClick={() => onChange(opt.value)}
          aria-pressed={mode === opt.value}
        >
          {opt.label}
        </button>
      ))}
      <style>{`
        .sort-toggle {
          display: inline-flex;
          gap: 2px;
          padding: 3px;
          border-radius: 999px;
          background: color-mix(in srgb, var(--color-text) 7%, transparent);
        }
        .sort-option {
          min-height: 38px;
          padding: 6px 16px;
          border-radius: 999px;
          font-size: var(--text-sm);
          font-weight: 600;
          color: var(--color-text-secondary);
          -webkit-tap-highlight-color: transparent;
          transition: background 0.15s, color 0.15s;
        }
        .sort-option.is-active {
          background: var(--color-surface);
          color: var(--color-text);
          box-shadow: var(--shadow-sm);
        }
      `}</style>
    </div>
  );
}
