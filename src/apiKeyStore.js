// Stores the user's own YouTube Data API key locally on their device only.
// It's sent exclusively to Google's API (see youtubeApi.js) - never to any
// server of this app's, since this app has no server.
const STORAGE_KEY = 'cardwise-youtube-api-key';

export function getYoutubeApiKey() {
  return localStorage.getItem(STORAGE_KEY) || '';
}

export function setYoutubeApiKey(key) {
  localStorage.setItem(STORAGE_KEY, key.trim());
}
