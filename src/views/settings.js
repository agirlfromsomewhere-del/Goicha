import { announce, focusElement } from '../a11y.js';
import { t } from '../strings.js';
import { navButton } from '../nav.js';
import { field } from '../formField.js';
import { getDailyLimits, setDailyLimits } from '../dailyLimitStore.js';

export function renderSettings(container) {
  container.innerHTML = '';
  const main = document.createElement('main');
  main.id = 'main';
  main.setAttribute('tabindex', '-1');

  const back = navButton('#/', t.settings.backToDecks, 'back-link');
  main.appendChild(back);

  const h1 = document.createElement('h1');
  h1.textContent = t.settings.heading;
  main.appendChild(h1);

  const heading = document.createElement('h2');
  heading.textContent = t.settings.reviewLimitsHeading;
  main.appendChild(heading);

  const intro = document.createElement('p');
  intro.textContent = t.settings.reviewLimitsIntro;
  main.appendChild(intro);

  const limits = getDailyLimits();

  const form = document.createElement('form');
  form.setAttribute('aria-label', t.settings.reviewLimitsHeading);

  const newField = field('setting-new-per-day', t.settings.newPerDayLabel, String(limits.newPerDay), false);
  newField.input.type = 'number';
  newField.input.min = '0';
  newField.input.inputMode = 'numeric';

  const reviewsField = field('setting-reviews-per-day', t.settings.reviewsPerDayLabel, String(limits.reviewsPerDay), false);
  reviewsField.input.type = 'number';
  reviewsField.input.min = '0';
  reviewsField.input.inputMode = 'numeric';

  const saveBtn = document.createElement('button');
  saveBtn.type = 'submit';
  saveBtn.className = 'button-primary';
  saveBtn.textContent = t.settings.saveButton;

  form.append(newField.wrap, reviewsField.wrap, saveBtn);
  main.appendChild(form);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const newPerDay = Math.max(0, parseInt(newField.input.value, 10) || 0);
    const reviewsPerDay = Math.max(0, parseInt(reviewsField.input.value, 10) || 0);
    setDailyLimits({ newPerDay, reviewsPerDay });
    announce(t.settings.saved);
  });

  container.appendChild(main);
  focusElement(h1);
}
