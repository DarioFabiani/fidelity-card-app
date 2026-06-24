import { route } from 'preact-router';
import { useCards } from '../hooks/useCards';
import { useSearch } from '../hooks/useSearch';
import { SearchBar } from '../components/SearchBar';
import { CardList } from '../components/CardList';
import { EmptyState } from '../components/EmptyState';
import { InstallPrompt } from '../components/InstallPrompt';

export function Home() {
  const { cards, loading } = useCards();
  const { query, setQuery, filtered } = useSearch(cards);

  return (
    <div class="page">
      {cards.length > 0 && (
        <SearchBar value={query} onInput={setQuery} />
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--color-text-secondary)' }}>
          Caricamento...
        </div>
      ) : cards.length === 0 ? (
        <EmptyState />
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--color-text-secondary)', fontSize: '14px' }}>
          Nessun risultato per "{query}"
        </div>
      ) : (
        <CardList cards={filtered} />
      )}

      <button
        class="fab"
        onClick={() => route('/fidelity-card-app/add')}
        aria-label="Aggiungi carta"
      >
        +
      </button>

      <InstallPrompt />
    </div>
  );
}
