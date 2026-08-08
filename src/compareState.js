// Transient in-memory selection of words the user wants to compare side
// by side. Not persisted - this is view state, not data, and resets on
// full page reload, which is fine for a "pick some words, compare them
// now" flow within a single visit.
const MAX_COMPARE = 3;
let selected = [];

export function getCompareList() {
  return [...selected];
}

export function isInCompare(word) {
  return selected.includes(word);
}

export function canAddToCompare() {
  return selected.length < MAX_COMPARE;
}

export function addToCompare(word) {
  if (selected.includes(word) || selected.length >= MAX_COMPARE) return false;
  selected.push(word);
  return true;
}

export function removeFromCompare(word) {
  selected = selected.filter((w) => w !== word);
}

export function clearCompare() {
  selected = [];
}
