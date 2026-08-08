import { getEntry } from '../dict.js';
import { announce, focusElement } from '../a11y.js';
import { t } from '../strings.js';
import { navButton } from '../nav.js';
import { getCompareList, removeFromCompare, clearCompare } from '../compareState.js';

export async function renderDictCompare(container) {
  const back = navButton('#/dict', t.dictCompare.backToDict, 'back-link');

  container.innerHTML = '';
  const main = document.createElement('main');
  main.id = 'main';
  main.setAttribute('tabindex', '-1');
  main.appendChild(back);

  const h1 = document.createElement('h1');
  h1.textContent = t.dictCompare.heading;
  main.appendChild(h1);

  const words = getCompareList();

  if (words.length === 0) {
    const empty = document.createElement('p');
    empty.textContent = t.dictCompare.empty;
    main.appendChild(empty);
    container.appendChild(main);
    focusElement(h1);
    return;
  }

  const clearBtn = document.createElement('button');
  clearBtn.type = 'button';
  clearBtn.className = 'button-danger';
  clearBtn.textContent = t.dictCompare.clearAll;
  clearBtn.addEventListener('click', () => {
    clearCompare();
    renderDictCompare(container);
  });
  main.appendChild(clearBtn);

  for (const word of words) {
    const entry = await getEntry(word);
    main.appendChild(renderWordSection(container, word, entry));
  }

  container.appendChild(main);
  focusElement(h1);
}

function renderWordSection(container, word, entry) {
  const section = document.createElement('section');
  section.className = 'review-card';

  const h2 = document.createElement('h2');
  h2.textContent = word;
  section.appendChild(h2);

  if (!entry) {
    const p = document.createElement('p');
    p.textContent = t.dictEntry.notFound;
    section.appendChild(p);
  } else {
    if (entry.reading) {
      const reading = document.createElement('p');
      reading.className = 'card-example';
      reading.textContent = entry.reading;
      section.appendChild(reading);
    }

    for (const group of entry.entries) {
      const posHeading = document.createElement('h3');
      posHeading.textContent = group.pos;
      section.appendChild(posHeading);

      const ol = document.createElement('ol');
      for (const sense of group.senses) {
        const li = document.createElement('li');
        const gloss = document.createElement('p');
        gloss.className = 'card-text';
        gloss.textContent = sense.gloss;
        li.appendChild(gloss);
        ol.appendChild(li);
      }
      section.appendChild(ol);
    }

    if (entry.notes.length) {
      const notesHeading = document.createElement('h3');
      notesHeading.textContent = t.dictEntry.notesHeading;
      section.appendChild(notesHeading);
      for (const note of entry.notes) {
        const p = document.createElement('p');
        p.textContent = note;
        section.appendChild(p);
      }
    }

    if (entry.synonyms.length) {
      const synHeading = document.createElement('h3');
      synHeading.textContent = t.dictEntry.synonymsHeading;
      section.appendChild(synHeading);
      const p = document.createElement('p');
      p.textContent = entry.synonyms.join('、');
      section.appendChild(p);
    }
  }

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.textContent = t.dictCompare.remove(word);
  removeBtn.addEventListener('click', () => {
    removeFromCompare(word);
    announce(t.dictEntry.removedFromCompare(word));
    renderDictCompare(container);
  });
  section.appendChild(removeBtn);

  return section;
}
