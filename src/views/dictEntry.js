import { getEntry } from '../dict.js';
import { announce, focusElement } from '../a11y.js';
import { t } from '../strings.js';
import { navButton } from '../nav.js';
import { isInCompare, canAddToCompare, addToCompare, removeFromCompare } from '../compareState.js';

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
