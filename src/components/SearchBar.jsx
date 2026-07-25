export function SearchBar({ value, onInput }) {
  return (
    <div class="search-bar">
      <svg class="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        type="search"
        placeholder="Cerca carte..."
        value={value}
        onInput={e => onInput(e.target.value)}
        class="search-input"
      />
      <style>{`
        .search-bar {
          position: relative;
          margin-bottom: var(--space-4);
        }
        .search-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--color-text-secondary);
          pointer-events: none;
        }
        .search-input {
          padding-left: 42px;
          border-radius: 999px;
          background: color-mix(in srgb, var(--color-surface) 70%, transparent);
          -webkit-backdrop-filter: blur(16px) saturate(180%);
          backdrop-filter: blur(16px) saturate(180%);
          border: 1px solid color-mix(in srgb, var(--color-border) 70%, transparent);
          height: 46px;
          box-shadow:
            inset 0 1px 0 color-mix(in srgb, #FFFFFF 45%, transparent),
            var(--shadow-sm);
        }
        @media (prefers-reduced-transparency: reduce) {
          .search-input {
            background: var(--color-surface);
            -webkit-backdrop-filter: none;
            backdrop-filter: none;
          }
        }
        .search-input::-webkit-search-cancel-button {
          -webkit-appearance: none;
          height: 16px;
          width: 16px;
          background: var(--color-text-secondary);
          border-radius: 50%;
          mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' stroke='white' stroke-width='3' stroke-linecap='round'%3E%3Cline x1='18' y1='6' x2='6' y2='18'/%3E%3Cline x1='6' y1='6' x2='18' y2='18'/%3E%3C/svg%3E") center/contain no-repeat;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
