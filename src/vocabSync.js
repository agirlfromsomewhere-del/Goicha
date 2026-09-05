// Pulls the known-words / pending-cards data files (regenerated externally -
// see the project's vocab-frequency-list tooling - whenever a new watched/
// read title's vocabulary gets processed) and merges anything new into this
// device's local database. Both files are append-only by convention (new
// entries added at the end, nothing earlier ever removed or reordered), so
// each device only needs to fetch/process the slice past what it already
// has - this keeps the sync fast even as the lists grow into the thousands.
import { addKnownWords, upsertCardsById, createDeck, getDecks } from './db.js';

const KNOWN_COUNT_KEY = 'vocabSync.knownWordsProcessed';
const PENDING_COUNT_KEY = 'vocabSync.pendingCardsProcessed';
export const PENDING_DECK_NAME = 'Words I Don’t Know Yet';

async function fetchJson(path) {
  try {
    const res = await fetch(path);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null; // offline, or file missing - sync just does nothing this run
  }
}

async function getOrCreatePendingDeck() {
  const existing = (await getDecks()).find((d) => d.name === PENDING_DECK_NAME);
  if (existing) return existing;
  return createDeck(PENDING_DECK_NAME);
}

// Returns { newKnownWords, newPendingCards } - counts actually added this run.
export async function syncVocabulary() {
  const result = { newKnownWords: 0, newPendingCards: 0 };

  const knownWords = await fetchJson('known-words.json');
  if (Array.isArray(knownWords)) {
    const processed = Number(localStorage.getItem(KNOWN_COUNT_KEY) || 0);
    const newEntries = knownWords.slice(processed);
    if (newEntries.length > 0) {
      result.newKnownWords = await addKnownWords(newEntries);
      localStorage.setItem(KNOWN_COUNT_KEY, String(knownWords.length));
    }
  }

  const pendingCards = await fetchJson('pending-cards.json');
  if (Array.isArray(pendingCards)) {
    const processed = Number(localStorage.getItem(PENDING_COUNT_KEY) || 0);
    const newEntries = pendingCards.slice(processed);
    if (newEntries.length > 0) {
      const deck = await getOrCreatePendingDeck();
      await upsertCardsById(
        deck.id,
        newEntries.map((it) => ({ id: `vocab-${it.word}`, front: `${it.word}（${it.reading}）`, back: it.definition })),
      );
      result.newPendingCards = newEntries.length;
      localStorage.setItem(PENDING_COUNT_KEY, String(pendingCards.length));
    }
  }

  return result;
}
