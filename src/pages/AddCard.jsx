import { route } from 'preact-router';
import { useCards } from '../hooks/useCards';
import { CardForm } from '../components/CardForm';
import { PageHeader } from '../components/PageHeader';

export function AddCard({ showToast }) {
  const { add } = useCards();

  const handleSubmit = async (data) => {
    await add(data);
    showToast('Carta aggiunta!');
    route('/fidelity-card-app/');
  };

  return (
    <div class="page">
      <PageHeader title="Aggiungi carta" onBack={() => route('/fidelity-card-app/')} />
      <CardForm onSubmit={handleSubmit} submitLabel="Aggiungi" />
    </div>
  );
}
