import { route } from 'preact-router';
import { useCards } from '../hooks/useCards';
import { useSearch } from '../hooks/useSearch';
import { useSortedCards } from '../hooks/useSortedCards';
import { SearchBar } from '../components/SearchBar';
import { SortToggle } from '../components/SortToggle';
import { CardList } from '../components/CardList';
import { EmptyState } from '../components/EmptyState';
import { InstallPrompt } from '../components/InstallPrompt';
import { PageMessage } from '../components/PageMessage';

export function Home() {
  const { cards, loading, error, toggleFav, remove } = useCards();
  const { query, setQuery, filtered } = useSearch(cards);
  const { mode, setMode, sections } = useSortedCards(filtered);

  return (
    <div class="page">
      {cards.length > 0 && (
        <>
          <SearchBar value={query} onInput={setQuery} />
          <div class="home-toolbar">
            <span class="home-count">
              {cards.length} {cards.length === 1 ? 'carta' : 'carte'}
            </span>
            <SortToggle mode={mode} onChange={setMode} />
          </div>
        </>
      )}

      {loading ? (
        <PageMessage>Caricamento...</PageMessage>
      ) : error ? (
        <PageMessage title="Impossibile leggere le carte">{error}</PageMessage>
      ) : cards.length === 0 ? (
        <EmptyState onAdd={() => route('/fidelity-card-app/add')} />
      ) : filtered.length === 0 ? (
        <PageMessage title="Nessun risultato">
          Nessuna carta corrisponde a "{query}".
        </PageMessage>
      ) : (
        <CardList sections={sections} onToggleFavorite={toggleFav} onDelete={remove} />
      )}

      <button
        class="fab"
        onClick={() => route('/fidelity-card-app/add')}
        aria-label="Aggiungi carta"
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      <InstallPrompt />

      <style>{`
        .home-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--space-3);
          margin-bottom: var(--space-4);
        }
        .home-count {
          font-size: var(--text-sm);
          color: var(--color-text-secondary);
        }
      `}</style>
    </div>
  );
}
