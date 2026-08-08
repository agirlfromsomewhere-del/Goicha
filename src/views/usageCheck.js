import { announce, focusElement } from '../a11y.js';
import { t } from '../strings.js';
import { navButton } from '../nav.js';
import { field } from '../formField.js';
import { getYoutubeApiKey, setYoutubeApiKey } from '../apiKeyStore.js';
import { checkPhraseUsage } from '../youtubeApi.js';

export function renderUsageCheck(container) {
  container.innerHTML = '';
  const main = document.createElement('main');
  main.id = 'main';
  main.setAttribute('tabindex', '-1');

  const back = navButton('#/dict', t.usageCheck.backToDict, 'back-link');
  main.appendChild(back);

  const h1 = document.createElement('h1');
  h1.textContent = t.usageCheck.heading;
  main.appendChild(h1);

  const intro = document.createElement('p');
  intro.textContent = t.usageCheck.intro;
  main.appendChild(intro);

  // API key setup
  const keyHeading = document.createElement('h2');
  keyHeading.textContent = t.usageCheck.apiKeyLabel;
  main.appendChild(keyHeading);

  const keyHelp = document.createElement('p');
  keyHelp.className = 'card-example';
  keyHelp.textContent = t.usageCheck.apiKeyHelp;
  main.appendChild(keyHelp);

  const keyForm = document.createElement('form');
  keyForm.setAttribute('aria-label', t.usageCheck.apiKeyLabel);
  const keyField = field('yt-api-key', t.usageCheck.apiKeyLabel, getYoutubeApiKey(), false);
  const keySave = document.createElement('button');
  keySave.type = 'submit';
  keySave.textContent = t.usageCheck.apiKeySave;
  keyForm.append(keyField.wrap, keySave);
  main.appendChild(keyForm);

  keyForm.addEventListener('submit', (e) => {
    e.preventDefault();
    setYoutubeApiKey(keyField.input.value);
    announce(t.usageCheck.apiKeySaved);
    updateCheckAvailability();
  });

  // Phrase check
  const checkHeading = document.createElement('h2');
  checkHeading.textContent = t.usageCheck.heading;
  main.appendChild(checkHeading);

  const checkForm = document.createElement('form');
  checkForm.setAttribute('aria-label', t.usageCheck.heading);
  const phraseField = field('usage-phrase', t.usageCheck.phraseLabel, '', false);
  phraseField.input.required = true;
  const checkBtn = document.createElement('button');
  checkBtn.type = 'submit';
  checkBtn.className = 'button-primary';
  checkBtn.textContent = t.usageCheck.checkButton;
  checkForm.append(phraseField.wrap, checkBtn);
  main.appendChild(checkForm);

  const status = document.createElement('p');
  status.className = 'progress';
  const resultsArea = document.createElement('div');
  main.append(status, resultsArea);

  function updateCheckAvailability() {
    const hasKey = !!getYoutubeApiKey();
    checkBtn.disabled = !hasKey;
    if (!hasKey) {
      status.textContent = t.usageCheck.apiKeyMissing;
    } else if (status.textContent === t.usageCheck.apiKeyMissing) {
      status.textContent = '';
    }
  }
  updateCheckAvailability();

  checkForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const phrase = phraseField.input.value.trim();
    if (!phrase) return;

    const apiKey = getYoutubeApiKey();
    if (!apiKey) {
      status.textContent = t.usageCheck.apiKeyMissing;
      return;
    }

    resultsArea.innerHTML = '';
    checkBtn.disabled = true;
    status.textContent = t.usageCheck.searching;
    announce(t.usageCheck.searching);

    try {
      const { matches, videosChecked, reachedTarget } = await checkPhraseUsage(phrase, apiKey, {
        onProgress: (done, total, matchCount) => {
          status.textContent = t.usageCheck.searchProgress(done, total, matchCount);
          // Only announce every 20 videos so VoiceOver isn't interrupted
          // constantly - the visible text still updates every time.
          if (done % 20 === 0 || done === total) announce(status.textContent);
        },
      });

      let message;
      if (reachedTarget) {
        message = t.usageCheck.resultCount(matches.length, videosChecked);
      } else if (matches.length > 0) {
        message = t.usageCheck.exhaustedSome(matches.length, videosChecked);
      } else {
        message = t.usageCheck.exhaustedNone(videosChecked);
      }
      status.textContent = message;
      announce(message);

      if (matches.length > 0) {
        const examplesHeading = document.createElement('h2');
        examplesHeading.textContent = t.usageCheck.examplesHeading;
        resultsArea.appendChild(examplesHeading);

        const ul = document.createElement('ul');
        ul.className = 'card-list';
        for (const match of matches) {
          const li = document.createElement('li');
          const text = document.createElement('p');
          text.className = 'card-text';
          text.textContent = match.text;
          const source = document.createElement('a');
          source.href = `https://www.youtube.com/watch?v=${match.videoId}`;
          source.target = '_blank';
          source.rel = 'noopener noreferrer';
          source.textContent = match.videoTitle;
          li.append(text, source);
          ul.appendChild(li);
        }
        resultsArea.appendChild(ul);
      }
    } catch (err) {
      status.textContent = t.usageCheck.apiError;
      announce(t.usageCheck.apiError);
    } finally {
      checkBtn.disabled = !getYoutubeApiKey();
    }
  });

  container.appendChild(main);
  focusElement(h1);
}
