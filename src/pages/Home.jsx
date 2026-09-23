import { route } from 'preact-router';
import { useState } from 'preact/hooks';
import { useCards } from '../hooks/useCards';
import { useSearch } from '../hooks/useSearch';
import { useSortedCards } from '../hooks/useSortedCards';
import { SearchBar } from '../components/SearchBar';
import { SortToggle } from '../components/SortToggle';
import { CardList } from '../components/CardList';
import { EmptyState } from '../components/EmptyState';
import { InstallPrompt } from '../components/InstallPrompt';
import { PageMessage } from '../components/PageMessage';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { PlusIcon } from '../components/icons';

export function Home({ showToast }) {
  const [confirmRemoveId, setConfirmRemoveId] = useState(null);
  const { cards, loading, error, toggleFav, remove } = useCards();
  const { query, setQuery, filtered } = useSearch(cards);
  const { mode, setMode, sections } = useSortedCards(filtered);

  const handleToggleFavorite = async (id) => {
    try {
      await toggleFav(id);
    } catch {
      showToast?.('Impossibile aggiornare i preferiti', 'error');
    }
  };

  const handleRemove = async (id) => {
    setConfirmRemoveId(null);
    try {
      await remove(id);
    } catch {
      showToast?.('Errore nell\'eliminazione', 'error');
    }
  };

  return (
    <div class="page page-with-fab">
      {cards.length > 0 && (
        <>
          <SearchBar value={query} onInput={setQuery} />
          <div class="home-toolbar">
            <span class="home-count">
              {query.trim() && filtered.length !== cards.length
                ? `${filtered.length} di ${cards.length}`
                : `${cards.length} ${cards.length === 1 ? 'carta' : 'carte'}`}
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
        <CardList sections={sections} onToggleFavorite={handleToggleFavorite} onDelete={setConfirmRemoveId} />
      )}

      <button
        class="fab"
        onClick={() => route('/fidelity-card-app/add')}
        aria-label="Aggiungi carta"
      >
        <PlusIcon size={26} />
      </button>

      {confirmRemoveId && (
        <ConfirmDialog
          title="Rimuovere la carta non leggibile?"
          message="Il record verrà eliminato definitivamente. I suoi dati non sono comunque recuperabili senza la password con cui erano stati cifrati."
          confirmLabel="Rimuovi"
          danger
          onConfirm={() => handleRemove(confirmRemoveId)}
          onCancel={() => setConfirmRemoveId(null)}
        />
      )}

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
