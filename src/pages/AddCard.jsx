import { route } from 'preact-router';
import { useCards } from '../hooks/useCards';
import { useLeaveGuard } from '../hooks/useLeaveGuard';
import { CardForm } from '../components/CardForm';
import { PageHeader } from '../components/PageHeader';
import { ConfirmDialog } from '../components/ConfirmDialog';

export function AddCard({ showToast }) {
  // The list is loaded only so the form can flag a number already saved.
  const { cards, add } = useCards();
  const guard = useLeaveGuard(() => route('/fidelity-card-app/'));

  const handleSubmit = async (data) => {
    const card = await add(data);
    showToast('Carta aggiunta!');
    // Straight to the new card, so the barcode can be checked right away.
    // Replacing the form in history keeps Back from returning to it.
    await guard.leaveAfterSave(() => route(`/fidelity-card-app/card/${card.id}`, true));
  };

  return (
    <div class="page">
      <PageHeader title="Aggiungi carta" onBack={guard.requestLeave} />
      <CardForm
        onSubmit={handleSubmit}
        submitLabel="Aggiungi"
        existingCards={cards}
        onDirtyChange={guard.onDirtyChange}
      />
      {guard.asking && (
        <ConfirmDialog
          title="Scartare la carta?"
          message="Quello che hai inserito non è stato salvato."
          confirmLabel="Scarta"
          danger
          onConfirm={guard.confirm}
          onCancel={guard.cancel}
        />
      )}
    </div>
  );
}
