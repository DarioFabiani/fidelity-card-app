import { useState, useEffect, useCallback } from 'preact/hooks';
import { getAllCards, addCard, updateCard, deleteCard } from '../db';

export function useCards() {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAllCards();
      setCards(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const add = useCallback(async (card) => {
    const newCard = await addCard(card);
    setCards(prev => [newCard, ...prev]);
    return newCard;
  }, []);

  const update = useCallback(async (card) => {
    const updated = await updateCard(card);
    setCards(prev => prev.map(c => c.id === updated.id ? updated : c));
    return updated;
  }, []);

  const remove = useCallback(async (id) => {
    await deleteCard(id);
    setCards(prev => prev.filter(c => c.id !== id));
  }, []);

  return { cards, loading, reload: load, add, update, remove };
}
