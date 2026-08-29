import './style.css';
import { renderDeckList } from './views/deckList.js';
import { renderDeckDetail } from './views/deckDetail.js';
import { renderCardEditor } from './views/cardEditor.js';
import { renderReview } from './views/review.js';
import { renderInstall } from './views/install.js';
import { renderDictSearch } from './views/dictSearch.js';
import { renderDictEntry } from './views/dictEntry.js';
import { renderDictCompare } from './views/dictCompare.js';
import { renderUsageCheck } from './views/usageCheck.js';
import { renderYoutubeCapture } from './views/youtubeCapture.js';
import { renderSettings } from './views/settings.js';
import { renderVocabProgress } from './views/vocabProgress.js';
import { initAnnouncer } from './a11y.js';

const app = document.getElementById('app');

async function router() {
  const hash = window.location.hash.replace(/^#\/?/, '');
  const parts = hash.split('/').filter(Boolean);

  if (parts.length === 0) {
    await renderDeckList(app);
  } else if (parts[0] === 'install') {
    renderInstall(app);
  } else if (parts[0] === 'settings') {
    renderSettings(app);
  } else if (parts[0] === 'vocab-progress') {
    await renderVocabProgress(app);
  } else if (parts[0] === 'dict' && parts[1] === 'word' && parts[2]) {
    await renderDictEntry(app, parts[2]);
  } else if (parts[0] === 'dict' && parts[1] === 'compare') {
    await renderDictCompare(app);
  } else if (parts[0] === 'dict' && parts[1] === 'usage') {
    renderUsageCheck(app);
  } else if (parts[0] === 'dict') {
    await renderDictSearch(app);
  } else if (parts[0] === 'deck' && parts[1]) {
    const deckId = parts[1];
    if (parts[2] === 'new') {
      await renderCardEditor(app, deckId, null);
    } else if (parts[2] === 'card' && parts[3]) {
      await renderCardEditor(app, deckId, parts[3]);
    } else if (parts[2] === 'review') {
      await renderReview(app, deckId);
    } else if (parts[2] === 'capture') {
      await renderYoutubeCapture(app, deckId);
    } else {
      await renderDeckDetail(app, deckId);
    }
  } else {
    await renderDeckList(app);
  }
}

window.addEventListener('hashchange', router);
window.addEventListener('DOMContentLoaded', () => {
  initAnnouncer();
  router();
});

if ('serviceWorker' in navigator) {
  import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({ immediate: true });
  });
}
