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
        aria-label="Cerca carte"
      />
      {value && (
        // Explicit clear button: the native one of type=search is missing or
        // tiny on several mobile browsers.
        <button type="button" class="search-clear" onClick={() => onInput('')} aria-label="Cancella la ricerca">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
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
          /* Opaque on purpose: unlike the header and the sheets, this element
             scrolls with the content, so a backdrop-filter here would be
             recomputed every frame against a backdrop that is almost always a
             flat --color-bg. Costly, and invisible. */
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          height: 46px;
          box-shadow:
            inset 0 1px 0 color-mix(in srgb, #FFFFFF 45%, transparent),
            var(--shadow-sm);
        }
        .search-input {
          padding-right: 48px;
        }
        .search-input::-webkit-search-cancel-button {
          -webkit-appearance: none;
          display: none;
        }
        .search-clear {
          position: absolute;
          right: 1px;
          top: 50%;
          transform: translateY(-50%);
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--color-text-secondary);
          border-radius: 50%;
        }
      `}</style>
    </div>
  );
}
