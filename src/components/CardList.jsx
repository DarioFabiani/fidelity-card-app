import { CardItem } from './CardItem';

export function CardList({ cards }) {
  return (
    <div class="card-list">
      {cards.map(card => (
        <CardItem key={card.id} card={card} />
      ))}
      <style>{`
        .card-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
      `}</style>
    </div>
  );
}
