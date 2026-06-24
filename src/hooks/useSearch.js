import { useState, useMemo } from 'preact/hooks';

export function useSearch(cards) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query.trim()) return cards;
    const q = query.toLowerCase().trim();
    return cards.filter(card =>
      card.providerName.toLowerCase().includes(q) ||
      card.cardNumber.includes(q) ||
      (card.notes && card.notes.toLowerCase().includes(q))
    );
  }, [cards, query]);

  return { query, setQuery, filtered };
}
