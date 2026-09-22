import { route } from 'preact-router';
import { useState, useEffect } from 'preact/hooks';
import { getCard, getAllCards, updateCard } from '../db';
import { CardForm } from '../components/CardForm';
import { PageHeader } from '../components/PageHeader';
import { PageMessage } from '../components/PageMessage';

export function EditCard({ id, showToast }) {
  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [allCards, setAllCards] = useState([]);

  useEffect(() => {
    // Only feeds the duplicate-number hint; a failure just hides it.
    getAllCards().then(setAllCards).catch(() => {});
  }, []);

  useEffect(() => {
    // Without the catch a rejected read would leave the page stuck on
    // "Caricamento..." forever instead of reporting the problem.
    getCard(id)
      .then(setCard)
      .catch(() => setCard(null))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (data) => {
    await updateCard({ ...data, id });
    showToast('Carta aggiornata!');
    // Replace, so Back from the card does not reopen the form just saved.
    route(`/fidelity-card-app/card/${id}`, true);
  };

  if (loading) {
    return (
      <div class="page">
        <PageMessage>Caricamento...</PageMessage>
      </div>
    );
  }

  if (!card) {
    return (
      <div class="page">
        <PageMessage
          title="Carta non trovata"
          action={
            <button class="btn btn-primary" onClick={() => route('/fidelity-card-app/')}>
              Vai alle mie carte
            </button>
          }
        >
          La carta che stai cercando non esiste più.
        </PageMessage>
      </div>
    );
  }

  if (card._unreadable) {
    return (
      <div class="page">
        <PageMessage
          title="Carta non leggibile"
          action={
            <button class="btn btn-primary" onClick={() => route('/fidelity-card-app/')}>
              Vai alle mie carte
            </button>
          }
        >
          I dati di questa carta non possono essere decifrati, quindi non è possibile modificarla.
        </PageMessage>
      </div>
    );
  }

  return (
    <div class="page">
      <PageHeader
        title="Modifica carta"
        onBack={() => route(`/fidelity-card-app/card/${id}`)}
      />
      <CardForm initial={card} onSubmit={handleSubmit} submitLabel="Salva modifiche" existingCards={allCards} />
    </div>
  );
}
