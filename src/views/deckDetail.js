import { getDeck, getCardsByDeck, getDueCards, deleteDeck, deleteCard, renameDeck } from '../db.js';
import { announce, focusElement } from '../a11y.js';
import { t } from '../strings.js';
import { navButton } from '../nav.js';

export async function renderDeckDetail(container, deckId) {
  const deck = await getDeck(deckId);
  container.innerHTML = '';

  const main = document.createElement('main');
  main.id = 'main';
  main.setAttribute('tabindex', '-1');

  if (!deck) {
    const p = document.createElement('p');
    p.textContent = t.deckDetail.notFound;
    const back = navButton('#/', t.backToDecks);
    main.append(p, back);
    container.appendChild(main);
    focusElement(main);
    return;
  }

  const back = navButton('#/', t.backToDecks, 'back-link');
  main.appendChild(back);

  const h1 = document.createElement('h1');
  h1.textContent = deck.name;
  main.appendChild(h1);

  const cards = await getCardsByDeck(deckId);
  const due = await getDueCards(deckId);

  const status = document.createElement('p');
  status.textContent = t.deckDetail.status(cards.length, due.length);
  main.appendChild(status);

  const actions = document.createElement('div');
  actions.className = 'action-row';

  const addBtn = navButton(`#/deck/${deckId}/new`, t.deckDetail.addCard);
  actions.appendChild(addBtn);

  const captureBtn = navButton(`#/deck/${deckId}/capture`, t.youtubeCapture.navLink);
  actions.appendChild(captureBtn);

  const reviewBtn = navButton(
    `#/deck/${deckId}/review`,
    due.length > 0 ? t.deckDetail.startReview(due.length) : t.deckDetail.reviewAnyway,
    'button-primary'
  );
  if (cards.length === 0) reviewBtn.disabled = true;
  actions.appendChild(reviewBtn);

  main.appendChild(actions);

  const renameHeading = document.createElement('h2');
  renameHeading.textContent = t.deckDetail.renameHeading;
  main.appendChild(renameHeading);

  const renameForm = document.createElement('form');
  renameForm.setAttribute('aria-label', t.deckDetail.renameAriaLabel);

  const renameLabel = document.createElement('label');
  renameLabel.setAttribute('for', 'rename-deck-input');
  renameLabel.textContent = t.deckNameLabel;

  const renameInput = document.createElement('input');
  renameInput.type = 'text';
  renameInput.id = 'rename-deck-input';
  renameInput.value = deck.name;
  renameInput.required = true;

  const renameSubmit = document.createElement('button');
  renameSubmit.type = 'submit';
  renameSubmit.textContent = t.deckDetail.saveName;

  renameForm.append(renameLabel, renameInput, renameSubmit);
  renameForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = renameInput.value.trim();
    if (!name) return;
    await renameDeck(deckId, name);
    announce(t.deckDetail.renamed(name));
    await renderDeckDetail(container, deckId);
    focusElement(document.getElementById('main'));
  });
  main.appendChild(renameForm);

  const deleteBtn = document.createElement('button');
  deleteBtn.type = 'button';
  deleteBtn.className = 'button-danger';
  deleteBtn.textContent = t.deckDetail.deleteDeck;
  deleteBtn.addEventListener('click', async () => {
    const confirmed = window.confirm(t.deckDetail.confirmDeleteDeck(deck.name));
    if (!confirmed) return;
    await deleteDeck(deckId);
    window.location.hash = '#/';
  });
  main.appendChild(deleteBtn);

  const cardsHeading = document.createElement('h2');
  cardsHeading.textContent = t.deckDetail.cardsHeading;
  main.appendChild(cardsHeading);

  if (cards.length === 0) {
    const empty = document.createElement('p');
    empty.textContent = t.deckDetail.noCards;
    main.appendChild(empty);
  } else {
    const ul = document.createElement('ul');
    ul.className = 'card-list';
    for (const card of cards) {
      const li = document.createElement('li');
      const openBtn = navButton(`#/deck/${deckId}/card/${card.id}`, card.front);

      const del = document.createElement('button');
      del.type = 'button';
      del.textContent = t.deckDetail.deleteCard;
      del.setAttribute('aria-label', t.deckDetail.deleteCardAriaLabel(card.front));
      del.addEventListener('click', async () => {
        const confirmed = window.confirm(t.deckDetail.confirmDeleteCard(card.front));
        if (!confirmed) return;
        await deleteCard(card.id);
        announce(t.deckDetail.cardDeleted);
        await renderDeckDetail(container, deckId);
        focusElement(document.getElementById('main'));
      });

      li.append(openBtn, del);
      ul.appendChild(li);
    }
    main.appendChild(ul);
  }

  container.appendChild(main);
  focusElement(h1);
}
