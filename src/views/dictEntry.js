import { getEntry } from '../dict.js';
import { announce, focusElement } from '../a11y.js';
import { t } from '../strings.js';
import { navButton } from '../nav.js';
import { isInCompare, canAddToCompare, addToCompare, removeFromCompare } from '../compareState.js';
import { getDecks, createCard } from '../db.js';
import { getYoutubeApiKey } from '../apiKeyStore.js';
import { checkPhraseUsage } from '../youtubeApi.js';
import { getLastDeckId, setLastDeckId } from '../lastDeckStore.js';

export async function renderDictEntry(container, word) {
  container.innerHTML = '';

  const main = document.createElement('main');
  main.id = 'main';
  main.setAttribute('tabindex', '-1');

  const back = navButton('#/dict', t.dictEntry.backToSearch, 'back-link');
  main.appendChild(back);

  const decoded = decodeURIComponent(word);
  const entry = await getEntry(decoded);

  if (!entry) {
    const h1 = document.createElement('h1');
    h1.textContent = decoded;
    const notFound = document.createElement('p');
    notFound.textContent = t.dictEntry.notFound;
    main.append(h1, notFound);
    container.appendChild(main);
    focusElement(h1);
    return;
  }

  const h1 = document.createElement('h1');
  h1.textContent = entry.word;
  main.appendChild(h1);

  if (entry.reading) {
    const reading = document.createElement('p');
    reading.className = 'card-example';
    reading.textContent = entry.reading;
    main.appendChild(reading);
  }

  const compareRow = document.createElement('div');
  compareRow.className = 'action-row';
  const compareBtn = document.createElement('button');
  compareBtn.type = 'button';

  function refreshCompareButton() {
    if (isInCompare(entry.word)) {
      compareBtn.textContent = t.dictEntry.removeFromCompare;
      compareBtn.disabled = false;
    } else {
      compareBtn.textContent = t.dictEntry.addToCompare;
      compareBtn.disabled = !canAddToCompare();
    }
  }
  refreshCompareButton();

  compareBtn.addEventListener('click', () => {
    if (isInCompare(entry.word)) {
      removeFromCompare(entry.word);
      announce(t.dictEntry.removedFromCompare(entry.word));
    } else if (canAddToCompare()) {
      addToCompare(entry.word);
      announce(t.dictEntry.addedToCompare(entry.word));
    } else {
      announce(t.dictEntry.compareFull);
    }
    refreshCompareButton();
  });
  compareRow.appendChild(compareBtn);
  main.appendChild(compareRow);

  for (const group of entry.entries) {
    const posHeading = document.createElement('h2');
    posHeading.textContent = group.pos;
    main.appendChild(posHeading);

    const ol = document.createElement('ol');
    for (const sense of group.senses) {
      const li = document.createElement('li');
      const gloss = document.createElement('p');
      gloss.className = 'card-text';
      gloss.textContent = sense.gloss;
      li.appendChild(gloss);

      if (sense.example) {
        const example = document.createElement('p');
        example.className = 'card-example';
        example.textContent = `${t.dictEntry.exampleLabel}${sense.example}`;
        li.appendChild(example);
      }

      ol.appendChild(li);
    }
    main.appendChild(ol);
  }

  main.appendChild(await buildAddCardSection(entry));

  if (entry.notes.length) {
    const notesHeading = document.createElement('h2');
    notesHeading.textContent = t.dictEntry.notesHeading;
    main.appendChild(notesHeading);
    for (const note of entry.notes) {
      const p = document.createElement('p');
      p.textContent = note;
      main.appendChild(p);
    }
  }

  if (entry.synonyms.length) {
    const synHeading = document.createElement('h2');
    synHeading.textContent = t.dictEntry.synonymsHeading;
    main.appendChild(synHeading);
    main.appendChild(wordLinkList(entry.synonyms));
  }

  if (entry.antonyms.length) {
    const antHeading = document.createElement('h2');
    antHeading.textContent = t.dictEntry.antonymsHeading;
    main.appendChild(antHeading);
    main.appendChild(wordLinkList(entry.antonyms));
  }

  container.appendChild(main);
  focusElement(h1);
}

function wordLinkList(words) {
  const ul = document.createElement('ul');
  ul.className = 'deck-list';
  for (const w of words) {
    const li = document.createElement('li');
    li.appendChild(navButton(`#/dict/word/${encodeURIComponent(w)}`, w));
    ul.appendChild(li);
  }
  return ul;
}

function buildDefinitionsText(entry) {
  const lines = [];
  for (const group of entry.entries) {
    for (const sense of group.senses) {
      lines.push(`(${group.pos}) ${sense.gloss}`);
    }
  }
  return lines.join('\n');
}

// The dictionary already carries at most one example per sense (see
// build-dict.mjs) - used to fill in when a YouTube search isn't available
// or doesn't turn up all 3 requested examples.
function collectDictionaryExamples(entry, limit) {
  const examples = [];
  for (const group of entry.entries) {
    for (const sense of group.senses) {
      if (sense.example) examples.push(sense.example);
      if (examples.length >= limit) return examples;
    }
  }
  return examples;
}

async function buildAddCardSection(entry) {
  const section = document.createElement('div');

  const heading = document.createElement('h2');
  heading.textContent = t.dictEntry.addCardHeading;
  section.appendChild(heading);

  const deckList = await getDecks();

  if (deckList.length === 0) {
    const p = document.createElement('p');
    p.textContent = t.dictEntry.noDecksYet;
    const goBtn = navButton('#/', t.dictEntry.goToDecks);
    section.append(p, goBtn);
    return section;
  }

  const form = document.createElement('form');
  form.setAttribute('aria-label', t.dictEntry.addCardHeading);

  const deckLabel = document.createElement('label');
  deckLabel.setAttribute('for', 'add-card-deck');
  deckLabel.textContent = t.dictEntry.deckLabel;

  const deckSelect = document.createElement('select');
  deckSelect.id = 'add-card-deck';
  const lastDeckId = getLastDeckId();
  for (const deck of deckList) {
    const option = document.createElement('option');
    option.value = deck.id;
    option.textContent = deck.name;
    if (deck.id === lastDeckId) option.selected = true;
    deckSelect.appendChild(option);
  }

  const createBtn = document.createElement('button');
  createBtn.type = 'submit';
  createBtn.className = 'button-primary';
  createBtn.textContent = t.dictEntry.createCardButton;

  form.append(deckLabel, deckSelect, createBtn);

  const status = document.createElement('p');
  status.className = 'progress';

  section.append(form, status);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const deckId = deckSelect.value;
    createBtn.disabled = true;

    const apiKey = getYoutubeApiKey();
    let examples = [];

    if (apiKey) {
      status.textContent = t.dictEntry.findingExamples;
      announce(t.dictEntry.findingExamples);
      try {
        const result = await checkPhraseUsage(entry.word, apiKey, {
          targetMatches: 3,
          onProgress: (done, total, matchCount) => {
            status.textContent = t.dictEntry.findingExamplesProgress(done, total, matchCount);
          },
        });
        examples = result.matches.slice(0, 3).map((m) => m.text);
      } catch {
        // Fall through to dictionary-only examples below.
      }
    }

    if (examples.length < 3) {
      examples = examples.concat(collectDictionaryExamples(entry, 3 - examples.length));
    }

    const front = entry.word;
    const backParts = [];
    if (entry.reading) backParts.push(entry.reading);
    backParts.push(buildDefinitionsText(entry));
    const back = backParts.join('\n\n');
    const example = examples.join('\n\n');

    await createCard({ deckId, front, back, example });
    setLastDeckId(deckId);

    status.textContent = t.dictEntry.cardCreated(entry.word);
    announce(t.dictEntry.cardCreated(entry.word));
    createBtn.disabled = false;
  });

  return section;
}
