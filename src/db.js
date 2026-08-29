import { openDB } from 'idb';
import { createNewCardFields } from './srs.js';

const DB_NAME = 'cardwise';
const DB_VERSION = 2;

let dbPromise;

export function initDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          const decks = db.createObjectStore('decks', { keyPath: 'id' });
          decks.createIndex('byName', 'name');

          const cards = db.createObjectStore('cards', { keyPath: 'id' });
          cards.createIndex('byDeck', 'deckId');

          db.createObjectStore('reviewLog', { keyPath: 'id' });
        }
        if (oldVersion < 2) {
          // Words confirmed known (via a fully-understood watched/read title,
          // or marked known directly) - keyed by the word itself so re-syncing
          // the same word is a harmless overwrite, never a duplicate.
          db.createObjectStore('knownWords', { keyPath: 'word' });
        }
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
    ...createNewCardFields(),
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

// Bulk import: one shared transaction for the whole batch instead of
// createCard()'s one-transaction-per-card, which would be far too slow for
// an import of thousands of cards at once.
export async function bulkCreateCards(deckId, items) {
  const db = await initDB();
  const tx = db.transaction('cards', 'readwrite');
  const base = Date.now();
  let i = 0;
  for (const { front, back, example, sourceUrl } of items) {
    const card = {
      id: uid(),
      deckId,
      front,
      back,
      example: example || '',
      sourceUrl: sourceUrl || '',
      ...createNewCardFields(),
      // Every card needs a distinct createdAt (not just Date.now() once for
      // the batch) - getCardsByDeck sorts by it, and with an identical
      // timestamp the display order falls back to random UUID order instead
      // of the actual rank order the caller passed items in.
      createdAt: base + i,
    };
    tx.store.put(card);
    i++;
  }
  await tx.done;
}

// Like bulkCreateCards, but each item carries its own explicit, deterministic
// id (e.g. "vocab-<word>") instead of a random uuid, and uses put() - so
// syncing the same synced-vocabulary data twice (e.g. re-running the sync
// after new titles were added) never creates duplicate cards for a word
// that's already been turned into one.
export async function upsertCardsById(deckId, items) {
  const db = await initDB();
  const tx = db.transaction('cards', 'readwrite');
  const base = Date.now();
  let i = 0;
  for (const { id, front, back, example, sourceUrl } of items) {
    const existing = await tx.store.get(id);
    if (existing) continue; // don't reset FSRS progress on an already-synced card
    tx.store.put({
      id,
      deckId,
      front,
      back,
      example: example || '',
      sourceUrl: sourceUrl || '',
      ...createNewCardFields(),
      createdAt: base + i,
    });
    i++;
  }
  await tx.done;
}

export async function getKnownWordCount() {
  const db = await initDB();
  return db.count('knownWords');
}

export async function getKnownWord(word) {
  const db = await initDB();
  return db.get('knownWords', word);
}

// Adds known words, skipping any already recorded (put on an existing key
// would silently overwrite - fine either way since the record is small and
// idempotent, but skip to avoid needless writes on a large sync).
export async function addKnownWords(items) {
  const db = await initDB();
  const tx = db.transaction('knownWords', 'readwrite');
  let added = 0;
  for (const item of items) {
    const existing = await tx.store.get(item.word);
    if (existing) continue;
    tx.store.put({ ...item, addedAt: Date.now() });
    added++;
  }
  await tx.done;
  return added;
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
