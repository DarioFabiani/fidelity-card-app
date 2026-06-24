import { exportCards, importCards } from '../db';

export async function downloadExport() {
  const cards = await exportCards();
  const data = JSON.stringify(cards, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `carte-fedelta-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  return cards.length;
}

export function uploadImport() {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return resolve(0);
      try {
        const text = await file.text();
        const cards = JSON.parse(text);
        if (!Array.isArray(cards)) throw new Error('Formato non valido');
        for (const card of cards) {
          if (!card.id || !card.providerName || !card.cardNumber) {
            throw new Error('Dati carta incompleti');
          }
        }
        await importCards(cards);
        resolve(cards.length);
      } catch (err) {
        reject(err);
      }
    };
    input.click();
  });
}
