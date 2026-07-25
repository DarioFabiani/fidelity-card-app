import { useState, useMemo, useCallback } from 'preact/hooks';

const STORAGE_KEY = 'fidelity-sort-mode';

export const SORT_RECENT = 'recent';
export const SORT_ALPHA = 'alpha';

function readStoredMode() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === SORT_ALPHA ? SORT_ALPHA : SORT_RECENT;
  } catch {
    // Private mode / storage disabled: fall back to the default.
    return SORT_RECENT;
  }
}

/**
 * Section letter for a card: the first letter of the provider name, with
 * accents folded (Tigotà -> T) and anything not A-Z bucketed under "#".
 */
export function sectionLetter(name) {
  const first = (name || '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '')[0];
  if (!first) return '#';
  const upper = first.toUpperCase();
  return upper >= 'A' && upper <= 'Z' ? upper : '#';
}

/**
 * Applies the chosen ordering. In alphabetical mode the list is also cut into
 * lettered sections; "recent" keeps the newest-first order the db returns and
 * stays a single flat run.
 */
export function useSortedCards(cards) {
  const [mode, setModeState] = useState(readStoredMode);

  const setMode = useCallback((next) => {
    setModeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Preference just won't persist; ordering still applies for this session.
    }
  }, []);

  const sections = useMemo(() => {
    if (mode !== SORT_ALPHA) {
      return [{ letter: null, cards }];
    }

    const sorted = [...cards].sort((a, b) =>
      (a.providerName || '').localeCompare(b.providerName || '', 'it', { sensitivity: 'base' })
    );

    const grouped = [];
    for (const card of sorted) {
      const letter = sectionLetter(card.providerName);
      const last = grouped[grouped.length - 1];
      if (last && last.letter === letter) {
        last.cards.push(card);
      } else {
        grouped.push({ letter, cards: [card] });
      }
    }
    return grouped;
  }, [cards, mode]);

  return { mode, setMode, sections };
}
