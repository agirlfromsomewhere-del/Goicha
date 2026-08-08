import { getEntry } from '../dict.js';
import { focusElement } from '../a11y.js';
import { t } from '../strings.js';

export async function renderDictEntry(container, word) {
  container.innerHTML = '';

  const main = document.createElement('main');
  main.id = 'main';
  main.setAttribute('tabindex', '-1');

  const back = document.createElement('a');
  back.href = '#/dict';
  back.className = 'back-link';
  back.textContent = t.dictEntry.backToSearch;
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

  container.appendChild(main);
  focusElement(h1);
}
