import { getDecks, createDeck, getCardsByDeck, getDueCards } from '../db.js';
import { announce, focusElement } from '../a11y.js';
import { t } from '../strings.js';

export async function renderDeckList(container) {
  container.innerHTML = '';

  const main = document.createElement('main');
  main.id = 'main';
  main.setAttribute('tabindex', '-1');

  const h1 = document.createElement('h1');
  h1.textContent = t.home.title;
  main.appendChild(h1);

  const navRow = document.createElement('div');
  navRow.className = 'action-row';

  const installLink = document.createElement('a');
  installLink.href = '#/install';
  installLink.className = 'install-link';
  installLink.textContent = t.home.installLink;

  const dictLink = document.createElement('a');
  dictLink.href = '#/dict';
  dictLink.className = 'install-link';
  dictLink.textContent = t.home.dictLink;

  navRow.append(installLink, dictLink);
  main.appendChild(navRow);

  const formHeading = document.createElement('h2');
  formHeading.textContent = t.home.createDeckHeading;
  main.appendChild(formHeading);

  const form = document.createElement('form');
  form.setAttribute('aria-label', t.home.createDeckAriaLabel);

  const label = document.createElement('label');
  label.setAttribute('for', 'new-deck-name');
  label.textContent = t.deckNameLabel;

  const input = document.createElement('input');
  input.type = 'text';
  input.id = 'new-deck-name';
  input.name = 'deckName';
  input.required = true;
  input.autocomplete = 'off';

  const submit = document.createElement('button');
  submit.type = 'submit';
  submit.className = 'button-primary';
  submit.textContent = t.home.createDeckButton;

  form.append(label, input, submit);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = input.value.trim();
    if (!name) return;
    await createDeck(name);
    announce(t.home.deckCreated(name));
    await renderDeckList(container);
    document.getElementById('new-deck-name')?.focus();
  });

  main.appendChild(form);

  const listHeading = document.createElement('h2');
  listHeading.textContent = t.home.decksHeading;
  main.appendChild(listHeading);

  const decks = await getDecks();

  if (decks.length === 0) {
    const empty = document.createElement('p');
    empty.textContent = t.home.noDecks;
    main.appendChild(empty);
  } else {
    const ul = document.createElement('ul');
    ul.className = 'deck-list';

    for (const deck of decks) {
      const cards = await getCardsByDeck(deck.id);
      const due = await getDueCards(deck.id);

      const li = document.createElement('li');
      const link = document.createElement('a');
      link.href = `#/deck/${deck.id}`;
      link.textContent = deck.name;

      const meta = document.createElement('span');
      meta.textContent = t.home.deckMeta(cards.length, due.length);

      li.append(link, meta);
      ul.appendChild(li);
    }
    main.appendChild(ul);
  }

  container.appendChild(main);
  focusElement(h1);
}
