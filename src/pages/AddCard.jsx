import { route } from 'preact-router';
import { useCards } from '../hooks/useCards';
import { CardForm } from '../components/CardForm';

export function AddCard({ showToast }) {
  const { add } = useCards();

  const handleSubmit = async (data) => {
    await add(data);
    showToast('Carta aggiunta!');
    route('/fidelity-card-app/');
  };

  return (
    <div class="page">
      <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '20px' }}>
        Aggiungi Carta
      </h2>
      <CardForm onSubmit={handleSubmit} submitLabel="Aggiungi" />
    </div>
  );
}
