import { getKnownWordCount, getDecks, getCardsByDeck } from '../db.js';
import { focusElement } from '../a11y.js';
import { t } from '../strings.js';
import { navButton } from '../nav.js';
import { PENDING_DECK_NAME } from '../vocabSync.js';

const GOAL = 30000;
const TARGET_DATE = new Date('2027-03-04T00:00:00');

export async function renderVocabProgress(container) {
  container.innerHTML = '';

  const main = document.createElement('main');
  main.id = 'main';
  main.setAttribute('tabindex', '-1');

  const back = navButton('#/', t.backToDecks, 'back-link');
  main.appendChild(back);

  const h1 = document.createElement('h1');
  h1.textContent = t.vocabProgress.heading;
  main.appendChild(h1);

  const knownCount = await getKnownWordCount();

  const countP = document.createElement('p');
  countP.className = 'card-text';
  countP.textContent = t.vocabProgress.knownCount(knownCount);
  main.appendChild(countP);

  const progressP = document.createElement('p');
  progressP.textContent = t.vocabProgress.goalProgress(knownCount, GOAL);
  main.appendChild(progressP);

  const days = Math.ceil((TARGET_DATE.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const daysP = document.createElement('p');
  daysP.textContent = t.vocabProgress.daysRemaining(days);
  main.appendChild(daysP);

  const pendingHeading = document.createElement('h2');
  pendingHeading.textContent = t.vocabProgress.pendingHeading;
  main.appendChild(pendingHeading);

  const pendingIntro = document.createElement('p');
  pendingIntro.textContent = t.vocabProgress.pendingIntro;
  main.appendChild(pendingIntro);

  const pendingDeck = (await getDecks()).find((d) => d.name === PENDING_DECK_NAME);
  const pendingCount = pendingDeck ? (await getCardsByDeck(pendingDeck.id)).length : 0;

  if (pendingCount > 0) {
    main.appendChild(navButton(`#/deck/${pendingDeck.id}`, t.vocabProgress.goToPendingDeck));
  } else {
    const noPending = document.createElement('p');
    noPending.textContent = t.vocabProgress.noPending;
    main.appendChild(noPending);
  }

  container.appendChild(main);
  focusElement(h1);
}
