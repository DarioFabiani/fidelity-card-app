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
          margin-bottom: 16px;
        }
        .search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--color-text-secondary);
          pointer-events: none;
        }
        .search-input {
          padding-left: 40px;
          border-radius: var(--radius-full);
          background: var(--color-surface-variant);
          border: none;
          height: 48px;
        }
        .search-input:focus {
          background: var(--color-surface-variant);
        }
      `}</style>
    </div>
  );
}
