import { getDueCards, updateCard, logReview, getDeck } from '../db.js';
import { schedule } from '../srs.js';
import { announce, focusElement } from '../a11y.js';
import { t } from '../strings.js';

export async function renderReview(container, deckId) {
  const deck = await getDeck(deckId);
  const queue = await getDueCards(deckId);
  const total = queue.length;
  let reviewed = 0;
  let showingAnswer = false;

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
  h1.textContent = t.review.heading(deck ? deck.name : '');
  main.appendChild(h1);

  const progress = document.createElement('p');
  progress.className = 'progress';
  main.appendChild(progress);

  const cardArea = document.createElement('div');
  cardArea.className = 'review-card';
  main.appendChild(cardArea);

  container.appendChild(main);

  function renderCurrent() {
    cardArea.innerHTML = '';

    if (queue.length === 0) {
      progress.textContent = '';

      const done = document.createElement('div');
      done.className = 'review-done';

      const doneH = document.createElement('h2');
      doneH.textContent = total === 0 ? t.review.nothingHeading : t.review.completeHeading;

      const summary = document.createElement('p');
      summary.textContent = total === 0 ? t.review.nothingMessage : t.review.completeMessage(reviewed);

      const doneBack = document.createElement('a');
      doneBack.href = `#/deck/${deckId}`;
      doneBack.className = 'button button-primary';
      doneBack.textContent = t.review.backToDeck;

      done.append(doneH, summary, doneBack);
      cardArea.appendChild(done);

      if (total > 0) {
        announce(t.review.completeAnnounce(reviewed));
      }
      focusElement(doneH);
      return;
    }

    const card = queue[0];
    progress.textContent = t.review.progress(reviewed + 1, total);

    const frontHeading = document.createElement('h2');
    frontHeading.textContent = t.review.frontSrHeading;
    frontHeading.className = 'sr-only';

    const frontText = document.createElement('p');
    frontText.className = 'card-text';
    frontText.textContent = card.front;

    cardArea.append(frontHeading, frontText);

    if (!showingAnswer) {
      const showBtn = document.createElement('button');
      showBtn.type = 'button';
      showBtn.className = 'button-primary';
      showBtn.textContent = t.review.showAnswer;
      showBtn.addEventListener('click', () => {
        showingAnswer = true;
        renderCurrent();
      });
      cardArea.appendChild(showBtn);
      focusElement(frontText);
    } else {
      const backHeading = document.createElement('h2');
      backHeading.textContent = t.review.backSrHeading;
      backHeading.className = 'sr-only';

      const backText = document.createElement('p');
      backText.className = 'card-text';
      backText.textContent = card.back;

      cardArea.append(backHeading, backText);

      if (card.example) {
        const exampleP = document.createElement('p');
        exampleP.className = 'card-example';
        exampleP.textContent = card.example;
        cardArea.appendChild(exampleP);
      }

      if (card.sourceUrl) {
        const sourceP = document.createElement('p');
        const sourceLink = document.createElement('a');
        sourceLink.href = card.sourceUrl;
        sourceLink.target = '_blank';
        sourceLink.rel = 'noopener noreferrer';
        sourceLink.textContent = t.cardEditor.sourceLink;
        sourceP.appendChild(sourceLink);
        cardArea.appendChild(sourceP);
      }

      const gradeRow = document.createElement('div');
      gradeRow.className = 'grade-row';
      gradeRow.setAttribute('role', 'group');
      gradeRow.setAttribute('aria-label', t.review.gradeGroupLabel);

      const grades = [
        { key: 'again', label: t.review.grades.again },
        { key: 'hard', label: t.review.grades.hard },
        { key: 'good', label: t.review.grades.good },
        { key: 'easy', label: t.review.grades.easy },
      ];

      for (const g of grades) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'grade-button';
        btn.textContent = g.label;
        btn.addEventListener('click', async () => {
          const updated = schedule(card, g.key);
          await updateCard(updated);
          await logReview(card.id, g.key);
          queue.shift();
          reviewed += 1;
          showingAnswer = false;
          announce(t.review.marked(g.label));
          renderCurrent();
        });
        gradeRow.appendChild(btn);
      }

      cardArea.appendChild(gradeRow);
      focusElement(backText);
    }
  }

  renderCurrent();
}
