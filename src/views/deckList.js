import { getDecks, createDeck, getCardsByDeck, getDueCards } from '../db.js';
import { announce, focusElement } from '../a11y.js';
import { t } from '../strings.js';
import { navButton } from '../nav.js';
import { syncVocabulary } from '../vocabSync.js';

export async function renderDeckList(container) {
  container.innerHTML = '';

  // Best-effort, silent: pulls in any newly-processed known words / pending
  // cards since last time this device was opened. Never blocks rendering -
  // if it's offline or the data files aren't reachable, this just no-ops.
  syncVocabulary().catch(() => {});

  const main = document.createElement('main');
  main.id = 'main';
  main.setAttribute('tabindex', '-1');

  const h1 = document.createElement('h1');
  h1.textContent = t.home.title;
  main.appendChild(h1);

  const navRow = document.createElement('div');
  navRow.className = 'action-row';

  const installBtn = navButton('#/install', t.home.installLink, 'install-link');
  const dictBtn = navButton('#/dict', t.home.dictLink, 'install-link');
  const progressBtn = navButton('#/vocab-progress', t.home.progressLink, 'install-link');
  const settingsBtn = navButton('#/settings', t.home.settingsLink, 'install-link');

  navRow.append(installBtn, dictBtn, progressBtn, settingsBtn);
  main.appendChild(navRow);

  const createSection = document.createElement('div');
  main.appendChild(createSection);

  function showCreateButton() {
    createSection.innerHTML = '';
    const showBtn = document.createElement('button');
    showBtn.type = 'button';
    showBtn.textContent = t.home.showCreateDeck;
    showBtn.addEventListener('click', showCreateForm);
    createSection.appendChild(showBtn);
  }

  function showCreateForm() {
    createSection.innerHTML = '';

    const formHeading = document.createElement('h2');
    formHeading.textContent = t.home.createDeckHeading;
    createSection.appendChild(formHeading);

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

    const actionsRow = document.createElement('div');
    actionsRow.className = 'action-row';

    const submit = document.createElement('button');
    submit.type = 'submit';
    submit.className = 'button-primary';
    submit.textContent = t.home.createDeckButton;

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.textContent = t.home.cancelCreateDeck;
    cancelBtn.addEventListener('click', showCreateButton);

    actionsRow.append(submit, cancelBtn);
    form.append(label, input, actionsRow);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = input.value.trim();
      if (!name) return;
      await createDeck(name);
      announce(t.home.deckCreated(name));
      await renderDeckList(container);
    });

    createSection.appendChild(form);
    focusElement(input);
  }

  showCreateButton();

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
      const openBtn = navButton(`#/deck/${deck.id}`, deck.name);

      const meta = document.createElement('span');
      meta.textContent = t.home.deckMeta(cards.length, due.length);

      li.append(openBtn, meta);
      ul.appendChild(li);
    }
    main.appendChild(ul);
  }

  container.appendChild(main);
  focusElement(h1);
}
