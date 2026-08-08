import { createCard, getCard, updateCard, getDeck } from '../db.js';
import { announce, focusElement } from '../a11y.js';
import { t } from '../strings.js';
import { field } from '../formField.js';

export async function renderCardEditor(container, deckId, cardId) {
  const deck = await getDeck(deckId);
  const existing = cardId ? await getCard(cardId) : null;

  container.innerHTML = '';
  const main = document.createElement('main');
  main.id = 'main';
  main.setAttribute('tabindex', '-1');

  const back = document.createElement('a');
  back.href = `#/deck/${deckId}`;
  back.className = 'back-link';
  back.textContent = `← ${deck ? deck.name : 'デッキ'}`;
  main.appendChild(back);

  const h1 = document.createElement('h1');
  h1.textContent = existing ? t.cardEditor.editHeading : t.cardEditor.addHeading;
  main.appendChild(h1);

  const form = document.createElement('form');
  form.setAttribute('aria-label', existing ? t.cardEditor.editHeading : t.cardEditor.addHeading);

  const frontField = field('card-front', t.cardEditor.frontLabel, existing?.front, true);
  const backField = field('card-back', t.cardEditor.backLabel, existing?.back, true);
  const exampleField = field('card-example', t.cardEditor.exampleLabel, existing?.example, true);
  frontField.input.required = true;
  backField.input.required = true;

  form.append(frontField.wrap, backField.wrap, exampleField.wrap);

  if (existing?.sourceUrl) {
    const sourceP = document.createElement('p');
    const sourceLink = document.createElement('a');
    sourceLink.href = existing.sourceUrl;
    sourceLink.target = '_blank';
    sourceLink.rel = 'noopener noreferrer';
    sourceLink.textContent = t.cardEditor.sourceLink;
    sourceP.appendChild(sourceLink);
    form.appendChild(sourceP);
  }

  const submit = document.createElement('button');
  submit.type = 'submit';
  submit.className = 'button-primary';
  submit.textContent = existing ? t.cardEditor.saveChanges : t.cardEditor.addCard;
  form.appendChild(submit);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const front = frontField.input.value.trim();
    const back = backField.input.value.trim();
    const example = exampleField.input.value.trim();
    if (!front || !back) return;

    if (existing) {
      await updateCard({ ...existing, front, back, example });
      announce(t.cardEditor.cardUpdated);
    } else {
      await createCard({ deckId, front, back, example });
      announce(t.cardEditor.cardAdded);
    }
    window.location.hash = `#/deck/${deckId}`;
  });

  main.appendChild(form);
  container.appendChild(main);
  focusElement(h1);
}
