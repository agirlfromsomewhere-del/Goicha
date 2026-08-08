import { openDB } from 'idb';

const DB_NAME = 'cardwise';
const DB_VERSION = 1;

let dbPromise;

export function initDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const decks = db.createObjectStore('decks', { keyPath: 'id' });
        decks.createIndex('byName', 'name');

        const cards = db.createObjectStore('cards', { keyPath: 'id' });
        cards.createIndex('byDeck', 'deckId');

        db.createObjectStore('reviewLog', { keyPath: 'id' });
      },
    });
  }
  return dbPromise;
}

function uid() {
  return crypto.randomUUID();
}

export async function createDeck(name) {
  const db = await initDB();
  const deck = { id: uid(), name, createdAt: Date.now() };
  await db.put('decks', deck);
  return deck;
}

export async function getDecks() {
  const db = await initDB();
  const decks = await db.getAll('decks');
  return decks.sort((a, b) => a.createdAt - b.createdAt);
}

export async function getDeck(id) {
  const db = await initDB();
  return db.get('decks', id);
}

export async function renameDeck(id, name) {
  const db = await initDB();
  const deck = await db.get('decks', id);
  if (!deck) return;
  deck.name = name;
  await db.put('decks', deck);
}

export async function deleteDeck(id) {
  const db = await initDB();
  const tx = db.transaction(['decks', 'cards'], 'readwrite');
  await tx.objectStore('decks').delete(id);
  const cardIndex = tx.objectStore('cards').index('byDeck');
  let cursor = await cardIndex.openCursor(IDBKeyRange.only(id));
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }
  await tx.done;
}

export async function createCard({ deckId, front, back, example, sourceUrl }) {
  const db = await initDB();
  const card = {
    id: uid(),
    deckId,
    front,
    back,
    example: example || '',
    sourceUrl: sourceUrl || '',
    ease: 2.5,
    interval: 0,
    repetitions: 0,
    dueDate: Date.now(),
    createdAt: Date.now(),
  };
  await db.put('cards', card);
  return card;
}

export async function getCard(id) {
  const db = await initDB();
  return db.get('cards', id);
}

export async function updateCard(card) {
  const db = await initDB();
  await db.put('cards', card);
}

export async function deleteCard(id) {
  const db = await initDB();
  await db.delete('cards', id);
}

export async function getCardsByDeck(deckId) {
  const db = await initDB();
  const cards = await db.getAllFromIndex('cards', 'byDeck', deckId);
  return cards.sort((a, b) => a.createdAt - b.createdAt);
}

export async function getDueCards(deckId) {
  const cards = await getCardsByDeck(deckId);
  const now = Date.now();
  return cards.filter((c) => c.dueDate <= now);
}

export async function logReview(cardId, grade) {
  const db = await initDB();
  await db.put('reviewLog', { id: uid(), cardId, grade, reviewedAt: Date.now() });
}
