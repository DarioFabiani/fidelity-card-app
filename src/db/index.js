import { openDB } from 'idb';

const DB_NAME = 'fidelity-cards-db';
const DB_VERSION = 1;
const STORE_NAME = 'cards';

function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('providerName', 'providerName');
        store.createIndex('createdAt', 'createdAt');
      }
    }
  });
}

export async function getAllCards() {
  const db = await getDB();
  const cards = await db.getAll(STORE_NAME);
  return cards.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getCard(id) {
  const db = await getDB();
  return db.get(STORE_NAME, id);
}

export async function addCard(card) {
  const db = await getDB();
  const now = Date.now();
  const newCard = {
    id: crypto.randomUUID(),
    providerName: card.providerName,
    cardNumber: card.cardNumber,
    barcodeFormat: card.barcodeFormat || 'CODE128',
    notes: card.notes || '',
    color: card.color || '#1565C0',
    logoUrl: card.logoUrl || '',
    createdAt: now,
    updatedAt: now
  };
  await db.add(STORE_NAME, newCard);
  return newCard;
}

export async function updateCard(card) {
  const db = await getDB();
  const existing = await db.get(STORE_NAME, card.id);
  if (!existing) throw new Error('Carta non trovata');
  const updated = {
    ...existing,
    ...card,
    updatedAt: Date.now()
  };
  await db.put(STORE_NAME, updated);
  return updated;
}

export async function deleteCard(id) {
  const db = await getDB();
  await db.delete(STORE_NAME, id);
}

export async function importCards(cards) {
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  for (const card of cards) {
    await tx.store.put(card);
  }
  await tx.done;
}

export async function exportCards() {
  return getAllCards();
}
