import { route } from 'preact-router';
import { useCards } from '../hooks/useCards';
import { CardForm } from '../components/CardForm';
import { PageHeader } from '../components/PageHeader';

export function AddCard({ showToast }) {
  // The list is loaded only so the form can flag a number already saved.
  const { cards, add } = useCards();

  const handleSubmit = async (data) => {
    const card = await add(data);
    showToast('Carta aggiunta!');
    // Straight to the new card, so the barcode can be checked right away.
    // Replacing the form in history keeps Back from returning to it.
    route(`/fidelity-card-app/card/${card.id}`, true);
  };

  return (
    <div class="page">
      <PageHeader title="Aggiungi carta" onBack={() => route('/fidelity-card-app/')} />
      <CardForm onSubmit={handleSubmit} submitLabel="Aggiungi" existingCards={cards} />
    </div>
  );
}
