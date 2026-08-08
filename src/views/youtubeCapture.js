import { createCard, getDeck } from '../db.js';
import { announce, focusElement } from '../a11y.js';
import { t } from '../strings.js';
import { field } from '../formField.js';
import { navButton } from '../nav.js';
import { createPlayer, extractVideoId, formatTime } from '../youtube.js';

export async function renderYoutubeCapture(container, deckId) {
  const deck = await getDeck(deckId);

  container.innerHTML = '';
  const main = document.createElement('main');
  main.id = 'main';
  main.setAttribute('tabindex', '-1');

  const back = navButton(`#/deck/${deckId}`, `← ${deck ? deck.name : 'Deck'}`, 'back-link');
  main.appendChild(back);

  const h1 = document.createElement('h1');
  h1.textContent = t.youtubeCapture.heading;
  main.appendChild(h1);

  const urlForm = document.createElement('form');
  urlForm.setAttribute('aria-label', t.youtubeCapture.heading);

  const urlField = field('yt-url', t.youtubeCapture.urlLabel, '', false);
  urlForm.appendChild(urlField.wrap);

  const loadButton = document.createElement('button');
  loadButton.type = 'submit';
  loadButton.className = 'button-primary';
  loadButton.textContent = t.youtubeCapture.loadButton;
  urlForm.appendChild(loadButton);

  const status = document.createElement('p');
  status.className = 'progress';

  // Reachable before the embedded player in the DOM so VoiceOver users can
  // jump straight to the capture form instead of swiping through YouTube's
  // own dozens of player controls (play/pause, captions, settings, etc.)
  // every time. Only shown once a video is actually loaded.
  const skipButton = document.createElement('button');
  skipButton.type = 'button';
  skipButton.hidden = true;
  skipButton.textContent = t.youtubeCapture.skipToForm;
  skipButton.addEventListener('click', () => {
    focusElement(document.getElementById('capture-heading'));
  });

  const playerHolder = document.createElement('div');
  const playerDiv = document.createElement('div');
  playerDiv.id = 'yt-player-target';
  playerHolder.appendChild(playerDiv);

  const captureSection = document.createElement('div');
  captureSection.hidden = true;

  main.append(urlForm, status, skipButton, playerHolder, captureSection);
  container.appendChild(main);
  focusElement(h1);

  let player = null;
  let recordedSeconds = null;

  urlForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const videoId = extractVideoId(urlField.input.value.trim());
    if (!videoId) {
      status.textContent = t.youtubeCapture.invalidUrl;
      announce(t.youtubeCapture.invalidUrl);
      return;
    }

    status.textContent = '';
    captureSection.hidden = true;
    skipButton.hidden = true;
    recordedSeconds = null;

    if (player) {
      player.destroy();
      player = null;
    }
    playerDiv.remove();
    playerDiv.id = 'yt-player-target';
    playerDiv.textContent = '';
    playerHolder.appendChild(playerDiv);

    player = await createPlayer('yt-player-target', videoId);
    status.textContent = t.youtubeCapture.videoLoaded;
    announce(t.youtubeCapture.videoLoaded);
    skipButton.hidden = false;

    setupCaptureForm(videoId);
  });

  function setupCaptureForm(videoId) {
    captureSection.innerHTML = '';
    captureSection.hidden = false;

    const captureHeading = document.createElement('h2');
    captureHeading.id = 'capture-heading';
    captureHeading.textContent = t.youtubeCapture.captureHeading;
    captureSection.appendChild(captureHeading);

    const timeRow = document.createElement('div');
    timeRow.className = 'action-row';

    const grabTimeButton = document.createElement('button');
    grabTimeButton.type = 'button';
    grabTimeButton.textContent = t.youtubeCapture.grabTimeButton;

    const timeLabel = document.createElement('p');
    timeLabel.textContent = t.youtubeCapture.noTimeYet;

    grabTimeButton.addEventListener('click', () => {
      if (!player) return;
      recordedSeconds = player.getCurrentTime();
      const formatted = formatTime(recordedSeconds);
      timeLabel.textContent = t.youtubeCapture.timeLabel(formatted);
      announce(t.youtubeCapture.timeRecorded(formatted));
    });

    timeRow.appendChild(grabTimeButton);
    captureSection.append(timeRow, timeLabel);

    const captureForm = document.createElement('form');
    captureForm.setAttribute('aria-label', t.cardEditor.addHeading);

    const frontField = field('capture-front', t.cardEditor.frontLabel, '', true);
    const backField = field('capture-back', t.cardEditor.backLabel, '', true);
    const exampleField = field('capture-example', t.cardEditor.exampleLabel, '', true);
    frontField.input.required = true;
    backField.input.required = true;

    captureForm.append(frontField.wrap, backField.wrap, exampleField.wrap);

    const saveButton = document.createElement('button');
    saveButton.type = 'submit';
    saveButton.className = 'button-primary';
    saveButton.textContent = t.youtubeCapture.saveButton;
    captureForm.appendChild(saveButton);

    captureForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const front = frontField.input.value.trim();
      const back = backField.input.value.trim();
      const example = exampleField.input.value.trim();
      if (!front || !back) return;

      const base = `https://www.youtube.com/watch?v=${videoId}`;
      const sourceUrl = recordedSeconds != null ? `${base}&t=${Math.floor(recordedSeconds)}s` : base;

      await createCard({ deckId, front, back, example, sourceUrl });
      announce(t.youtubeCapture.cardSaved);

      frontField.input.value = '';
      backField.input.value = '';
      exampleField.input.value = '';
      recordedSeconds = null;
      timeLabel.textContent = t.youtubeCapture.noTimeYet;
      frontField.input.focus();
    });

    captureSection.appendChild(captureForm);
  }
}
