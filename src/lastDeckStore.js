// Remembers the last deck the user added a dictionary flashcard to, so
// repeat use of "add as flashcard" doesn't require re-picking every time.
const STORAGE_KEY = 'cardwise-last-deck-id';

export function getLastDeckId() {
  return localStorage.getItem(STORAGE_KEY) || '';
}

export function setLastDeckId(deckId) {
  localStorage.setItem(STORAGE_KEY, deckId);
}
