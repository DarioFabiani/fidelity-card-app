import { route } from 'preact-router';
import { useState, useEffect } from 'preact/hooks';
import { getCard, getAllCards, updateCard } from '../db';
import { CardForm } from '../components/CardForm';
import { PageHeader } from '../components/PageHeader';
import { PageMessage } from '../components/PageMessage';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useLeaveGuard } from '../hooks/useLeaveGuard';

/**
 * Back to the card this form was opened from. When the card page is the entry
 * right behind us (ViewCard marks it), going back to it keeps history as
 * list → card, so one Back returns to the list; replacing instead left
 * list → card → card and needed two.
 */
function returnToCard(id) {
  if (window.history.state?.editFrom === id) {
    window.history.back();
  } else {
    route(`/fidelity-card-app/card/${id}`, true);
  }
}

export function EditCard({ id, showToast }) {
  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [allCards, setAllCards] = useState([]);
  const guard = useLeaveGuard(() => returnToCard(id));

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
    guard.markSaved();
    showToast('Carta aggiornata!');
    returnToCard(id);
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
        onBack={guard.requestLeave}
      />
      <CardForm
        initial={card}
        onSubmit={handleSubmit}
        submitLabel="Salva modifiche"
        existingCards={allCards}
        onDirtyChange={guard.onDirtyChange}
      />
      {guard.asking && (
        <ConfirmDialog
          title="Scartare le modifiche?"
          message="Le modifiche a questa carta non sono state salvate."
          confirmLabel="Scarta"
          danger
          onConfirm={guard.confirm}
          onCancel={guard.cancel}
        />
      )}
    </div>
  );
}
