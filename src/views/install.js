import { focusElement } from '../a11y.js';
import { t } from '../strings.js';

export function renderInstall(container) {
  container.innerHTML = '';
  const main = document.createElement('main');
  main.id = 'main';
  main.setAttribute('tabindex', '-1');

  const back = document.createElement('a');
  back.href = '#/';
  back.className = 'back-link';
  back.textContent = t.backToDecks;
  main.appendChild(back);

  const h1 = document.createElement('h1');
  h1.textContent = t.install.heading;
  main.appendChild(h1);

  const p = document.createElement('p');
  p.textContent = t.install.intro;
  main.appendChild(p);

  const ol = document.createElement('ol');
  for (const step of t.install.steps) {
    const li = document.createElement('li');
    li.textContent = step;
    ol.appendChild(li);
  }
  main.appendChild(ol);

  container.appendChild(main);
  focusElement(h1);
}
