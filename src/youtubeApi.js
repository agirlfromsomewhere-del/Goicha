// Wraps YouTube Data API v3 (official, free-tier, key-based REST API) to
// approximate "how often does native speakers use this phrase" by:
//   1. searching for Japanese-relevant videos matching the phrase,
//   2. pulling top comments from those videos,
//   3. keeping only comments that actually contain the phrase and look
//      like they're written primarily in Japanese script.
//
// Real limitations, worth being upfront about (surfaced in the UI too):
// - There is no public API to search comments across all of YouTube, only
//   to list comments on a specific video - so this checks a small sample
//   of videos the search API surfaces, not "all of YouTube".
// - "Japanese script ratio" is a heuristic for "written in Japanese", not
//   a true native-vs-learner classifier - no such reliable classifier
//   exists as a simple client-side check. A learner writing a practice
//   sentence entirely in kana/kanji would also pass this filter.

const API_BASE = 'https://www.googleapis.com/youtube/v3';
const JAPANESE_SCRIPT_RE = /[぀-ヿ一-鿿ｦ-ﾟ]/;
const NATIVE_LIKELY_THRESHOLD = 0.7;

function japaneseScriptRatio(text) {
  const chars = [...text].filter((c) => !/\s/.test(c) && c.trim().length > 0);
  if (chars.length === 0) return 0;
  const jpChars = chars.filter((c) => JAPANESE_SCRIPT_RE.test(c));
  return jpChars.length / chars.length;
}

async function apiGet(path, params, apiKey) {
  const url = new URL(`${API_BASE}/${path}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  url.searchParams.set('key', apiKey);

  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const message = body?.error?.message || `YouTube API error (${res.status})`;
    const error = new Error(message);
    error.status = res.status;
    throw error;
  }
  return res.json();
}

async function searchVideos(query, apiKey, maxResults) {
  const data = await apiGet(
    'search',
    { part: 'snippet', type: 'video', relevanceLanguage: 'ja', maxResults, q: query },
    apiKey
  );
  return (data.items || []).map((item) => ({
    videoId: item.id.videoId,
    title: item.snippet.title,
  }));
}

async function getTopLevelComments(videoId, apiKey, maxResults) {
  const data = await apiGet(
    'commentThreads',
    { part: 'snippet', videoId, maxResults, order: 'relevance', textFormat: 'plainText' },
    apiKey
  );
  return (data.items || []).map((item) => item.snippet.topLevelComment.snippet.textDisplay);
}

export async function checkPhraseUsage(phrase, apiKey, { maxVideos = 8, maxCommentsPerVideo = 100 } = {}) {
  const videos = await searchVideos(phrase, apiKey, maxVideos);

  const matches = [];
  let videosChecked = 0;

  for (const video of videos) {
    let comments;
    try {
      comments = await getTopLevelComments(video.videoId, apiKey, maxCommentsPerVideo);
    } catch {
      // Comments disabled on this video, or another per-video error - skip it and keep going.
      continue;
    }
    videosChecked++;

    for (const text of comments) {
      if (!text.includes(phrase)) continue;
      if (japaneseScriptRatio(text) < NATIVE_LIKELY_THRESHOLD) continue;
      matches.push({ text, videoTitle: video.title, videoId: video.videoId });
    }
  }

  return { matches, videosChecked, videosFound: videos.length };
}
