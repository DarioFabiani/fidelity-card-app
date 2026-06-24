import { route } from 'preact-router';
import { useState, useEffect } from 'preact/hooks';
import { getCard, updateCard } from '../db';
import { CardForm } from '../components/CardForm';

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
      <div class="page" style={{ textAlign: 'center', padding: '48px 0', color: 'var(--color-text-secondary)' }}>
        Caricamento...
      </div>
    );
  }

  if (!card) {
    return (
      <div class="page" style={{ textAlign: 'center', padding: '48px 0', color: 'var(--color-text-secondary)' }}>
        Carta non trovata
      </div>
    );
  }

  return (
    <div class="page">
      <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '20px' }}>
        Modifica Carta
      </h2>
      <CardForm initial={card} onSubmit={handleSubmit} submitLabel="Salva modifiche" />
    </div>
  );
}
