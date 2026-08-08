// One-time (re-runnable) preprocessing: turns the raw Japanese Wiktionary
// JSONL dump (from kaikki.org) into a compact, sharded dataset the app can
// serve as static files without ever downloading the whole 190MB+ dump.
//
// Usage: node scripts/build-dict.mjs <path-to-raw.jsonl>

import fs from 'node:fs';
import readline from 'node:readline';

const SHARD_COUNT = 64;
const MAX_SENSES_PER_ENTRY = 3;
const MAX_EXAMPLE_LENGTH = 200;

const inputPath = process.argv[2];
if (!inputPath) {
  console.error('Usage: node scripts/build-dict.mjs <path-to-raw.jsonl>');
  process.exit(1);
}

const KANA_RE = /^[぀-ゟ゠-ヿー・]+$/;
const isKana = (s) => typeof s === 'string' && s.length > 0 && KANA_RE.test(s);

function extractReading(obj) {
  const forms = obj.forms || [];
  const translit = forms.find((f) => f.tags && f.tags.includes('transliteration'));
  if (translit) return translit.form;
  if (isKana(obj.word)) return obj.word;
  const plain = forms.find((f) => (!f.tags || f.tags.length === 0) && isKana(f.form));
  return plain ? plain.form : '';
}

function extractSenses(obj) {
  const senses = [];
  for (const sense of obj.senses || []) {
    if (!sense.glosses || sense.glosses.length === 0) continue;
    const gloss = sense.glosses[0];
    const example = sense.examples && sense.examples[0] && sense.examples[0].text;
    senses.push({
      gloss,
      example: example ? example.slice(0, MAX_EXAMPLE_LENGTH) : undefined,
    });
    if (senses.length >= MAX_SENSES_PER_ENTRY) break;
  }
  return senses;
}

// Common words written in kanji (verbs/adjectives especially) are often
// stored in this dataset as a bare "kanji notation of <reading>" stub under
// the kanji headword, with the real definition living under the hiragana
// reading instead. Detect those stubs so callers can redirect to the real
// entry rather than surfacing an unhelpful cross-reference.
function formOfTarget(obj) {
  const senses = obj.senses || [];
  if (senses.length === 0) return null;
  const allRedirects = senses.every((s) => s.form_of && s.form_of[0] && s.form_of[0].word);
  return allRedirects ? senses[0].form_of[0].word : null;
}

// Simple, stable string hash for shard assignment.
function shardFor(word) {
  let hash = 0;
  for (let i = 0; i < word.length; i++) {
    hash = (hash * 31 + word.codePointAt(i)) | 0;
  }
  return Math.abs(hash) % SHARD_COUNT;
}

async function main() {
  const byWord = new Map(); // word -> { reading, entries: [{pos, senses}] }
  const redirects = []; // { word, target } for pure "kanji notation of X" stubs

  const rl = readline.createInterface({
    input: fs.createReadStream(inputPath, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });

  let lineCount = 0;
  for await (const line of rl) {
    if (!line.trim()) continue;
    lineCount++;
    const obj = JSON.parse(line);

    const senses = extractSenses(obj);
    if (senses.length === 0) continue;

    const word = obj.word;
    const reading = extractReading(obj);
    const pos = obj.pos_title || obj.pos || '';

    const target = formOfTarget(obj);
    if (target && target !== word) {
      redirects.push({ word, target });
      continue;
    }

    let record = byWord.get(word);
    if (!record) {
      record = { reading, entries: [] };
      byWord.set(word, record);
    }
    if (!record.reading && reading) record.reading = reading;
    record.entries.push({ pos, senses });
  }

  console.log(`Read ${lineCount} lines, ${byWord.size} unique headwords with real definitions, ${redirects.length} cross-reference stubs.`);

  let resolved = 0;
  for (const { word, target } of redirects) {
    if (byWord.has(word)) continue; // word already has a real definition of its own
    const targetRecord = byWord.get(target);
    if (!targetRecord) continue; // target has no usable definition either; drop the stub
    byWord.set(word, targetRecord);
    resolved++;
  }
  console.log(`Resolved ${resolved} kanji-form stubs to their real definition (e.g. 食べる -> たべる).`);

  const indexRows = [];
  const shards = Array.from({ length: SHARD_COUNT }, () => ({}));

  for (const [word, record] of byWord) {
    const shardId = shardFor(word);
    indexRows.push([word, record.reading, shardId]);
    shards[shardId][word] = record.entries;
  }

  fs.mkdirSync('public/dict/entries', { recursive: true });
  fs.writeFileSync('public/dict/index.json', JSON.stringify(indexRows));

  let totalShardBytes = 0;
  shards.forEach((shard, i) => {
    const json = JSON.stringify(shard);
    totalShardBytes += Buffer.byteLength(json);
    fs.writeFileSync(`public/dict/entries/${i}.json`, json);
  });

  const indexBytes = fs.statSync('public/dict/index.json').size;
  console.log(`index.json: ${(indexBytes / 1024 / 1024).toFixed(2)} MB`);
  console.log(`entries/*.json (${SHARD_COUNT} shards): ${(totalShardBytes / 1024 / 1024).toFixed(2)} MB total, ${(totalShardBytes / SHARD_COUNT / 1024).toFixed(0)} KB avg/shard`);
}

main();
