import { useState, useMemo } from 'preact/hooks';

/** Lowercase with accents folded, so "tigota" finds "Tigotà". */
export function foldText(value) {
  return (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

/** Spaces and dashes dropped: the number is shown grouped ("1234 5678"). */
function compactNumber(value) {
  return (value || '').replace(/[\s-]/g, '').toLowerCase();
}

export function matchesQuery(card, query) {
  const q = foldText(query);
  if (!q) return true;
  const qNumber = compactNumber(q);
  return (
    foldText(card.providerName).includes(q) ||
    (qNumber !== '' && compactNumber(card.cardNumber).includes(qNumber)) ||
    foldText(card.notes).includes(q)
  );
}

export function useSearch(cards) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(
    () => (query.trim() ? cards.filter(card => matchesQuery(card, query)) : cards),
    [cards, query]
  );

  return { query, setQuery, filtered };
}
