import { route } from 'preact-router';
import { useState, useEffect } from 'preact/hooks';
import { getCard, updateCard } from '../db';
import { CardForm } from '../components/CardForm';
import { PageHeader } from '../components/PageHeader';
import { PageMessage } from '../components/PageMessage';

export function EditCard({ id, showToast }) {
  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCard(id).then(c => {
      setCard(c);
      setLoading(false);
    });
  }, [id]);

  const handleSubmit = async (data) => {
    await updateCard({ ...data, id });
    showToast('Carta aggiornata!');
    route(`/fidelity-card-app/card/${id}`);
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

  return (
    <div class="page">
      <PageHeader
        title="Modifica carta"
        onBack={() => route(`/fidelity-card-app/card/${id}`)}
      />
      <CardForm initial={card} onSubmit={handleSubmit} submitLabel="Salva modifiche" />
    </div>
  );
}
