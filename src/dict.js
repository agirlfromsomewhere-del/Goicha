// Client-side access to the preprocessed Japanese Wiktionary dataset
// (see scripts/build-dict.mjs). Two tiers: a small index fetched once for
// search, and per-shard definition files fetched lazily on demand so the
// full ~20MB dictionary is never downloaded up front.

let indexData = null;
let indexPromise = null;
const shardCache = new Map();

export function ensureIndexLoaded() {
  if (indexData) return Promise.resolve(indexData);
  if (!indexPromise) {
    indexPromise = fetch('dict/index.json')
      .then((res) => res.json())
      .then((data) => {
        indexData = data;
        return data;
      });
  }
  return indexPromise;
}

// Assumes ensureIndexLoaded() has already resolved. Prefix matches
// (word/reading starts with the query) rank above substring matches.
export function search(query, limit = 50) {
  if (!indexData) return [];
  const q = query.trim();
  if (!q) return [];

  const starts = [];
  const contains = [];

  for (const row of indexData) {
    const [word, reading] = row;
    const readingMatch = reading && reading.length > 0;
    if (word.startsWith(q) || (readingMatch && reading.startsWith(q))) {
      starts.push(row);
    } else if (word.includes(q) || (readingMatch && reading.includes(q))) {
      contains.push(row);
    }
  }

  return [...starts, ...contains].slice(0, limit);
}

export async function getEntry(word) {
  if (!indexData) await ensureIndexLoaded();
  const row = indexData.find((r) => r[0] === word);
  if (!row) return null;

  const [, reading, shardId] = row;
  let shard = shardCache.get(shardId);
  if (!shard) {
    shard = await fetch(`dict/entries/${shardId}.json`).then((res) => res.json());
    shardCache.set(shardId, shard);
  }

  const entries = shard[word];
  if (!entries) return null;
  return { word, reading, entries };
}
