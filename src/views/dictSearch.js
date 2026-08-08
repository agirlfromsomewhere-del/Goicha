import { ensureIndexLoaded, search } from '../dict.js';
import { announce, focusElement } from '../a11y.js';
import { t } from '../strings.js';
import { navButton } from '../nav.js';

export async function renderDictSearch(container) {
  container.innerHTML = '';

  const main = document.createElement('main');
  main.id = 'main';
  main.setAttribute('tabindex', '-1');

  const back = navButton('#/', t.backToDecks, 'back-link');
  main.appendChild(back);

  const h1 = document.createElement('h1');
  h1.textContent = t.dictSearch.heading;
  main.appendChild(h1);

  const label = document.createElement('label');
  label.setAttribute('for', 'dict-search-input');
  label.textContent = t.dictSearch.searchLabel;

  const input = document.createElement('input');
  input.type = 'text';
  input.id = 'dict-search-input';
  input.autocomplete = 'off';
  input.disabled = true;

  main.append(label, input);

  const resultsHeading = document.createElement('h2');
  resultsHeading.className = 'sr-only';
  resultsHeading.textContent = t.dictSearch.heading;

  const resultsList = document.createElement('ul');
  resultsList.className = 'deck-list';

  const statusText = document.createElement('p');
  statusText.className = 'progress';

  main.append(resultsHeading, statusText, resultsList);
  container.appendChild(main);
  focusElement(h1);

  statusText.textContent = t.dictSearch.prompt;

  await ensureIndexLoaded();
  input.disabled = false;

  // Guard against iOS/Japanese-IME composition: while the user is still
  // composing kana/kanji (before confirming), 'input' fires repeatedly on
  // incomplete text - searching on that gives confusing/empty results.
  // Wait for compositionend before running search on composed text.
  let isComposing = false;
  let debounceTimer;

  input.addEventListener('compositionstart', () => {
    isComposing = true;
  });

  input.addEventListener('compositionend', () => {
    isComposing = false;
    clearTimeout(debounceTimer);
    runSearch(input.value);
  });

  input.addEventListener('input', () => {
    if (isComposing) return;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => runSearch(input.value), 200);
  });

  function runSearch(query) {
    resultsList.innerHTML = '';

    if (!query.trim()) {
      statusText.textContent = t.dictSearch.prompt;
      return;
    }

    const results = search(query);

    if (results.length === 0) {
      statusText.textContent = t.dictSearch.noResults;
      announce(t.dictSearch.noResults);
      return;
    }

    const message = t.dictSearch.results(results.length);
    statusText.textContent = message;
    announce(message);

    for (const [word, reading] of results) {
      const li = document.createElement('li');
      const label = reading ? `${word} (${reading})` : word;
      const openBtn = navButton(`#/dict/word/${encodeURIComponent(word)}`, label);
      li.appendChild(openBtn);
      resultsList.appendChild(li);
    }
  }
}
