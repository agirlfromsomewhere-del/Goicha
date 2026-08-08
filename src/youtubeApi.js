// Wraps YouTube Data API v3 (official, free-tier, key-based REST API) to
// approximate "how often do people use this phrase" by scanning comments
// on a large, topically diverse sample of Japanese videos.
//
// Real limitation, surfaced in the UI too: there is no public API to
// search comments across all of YouTube, only to list comments on a
// specific video - so this checks a large sample of videos, not "all of
// YouTube". A phrase getting zero hits doesn't prove it's unnatural, just
// that it wasn't in this sample.
//
// The video pool is built two ways:
// - videos.list?chart=mostPopular: cheap (~1 quota unit/call), but this
//   chart is topically narrow - as of a 2025 YouTube change it only
//   reflects the Trending Music/Movies/Gaming charts. A rare phrase might
//   never show up there regardless of how many trending videos get
//   checked, because it's the wrong topic neighborhood, not too small a
//   neighborhood.
// - search.list with no query, just region/language/category filters,
//   rotated across many video categories: broadens the pool across
//   topics the trending chart doesn't cover (education, vlogs, how-to,
//   news, etc). Costs 100 quota units/call, so this is the expensive
//   part, but happens once per check regardless of the phrase.
//
// Deliberately NOT using search.list with the phrase itself as the query:
// that searches video titles/descriptions, surfacing videos "about" the
// phrase's keywords rather than videos likely to have it used naturally
// in casual comments.
//
// A third source, on top of the two above: recent uploads from a curated
// list of long-form Japanese talk/discussion channels (see
// discoveryChannels.js) - user-requested, since these tend to have far
// more natural conversational language and opinion-heavy comments than
// generic trending/category browsing turns up.

import { DISCOVERY_CHANNELS } from './discoveryChannels.js';

const API_BASE = 'https://www.googleapis.com/youtube/v3';
const RESULTS_PER_PAGE = 50;
const COMMENT_FETCH_CONCURRENCY = 5;
const CATEGORY_SEARCH_CONCURRENCY = 5;

// A deliberately topic-diverse spread of YouTube's standard category IDs.
const DISCOVERY_CATEGORIES = [
  '1', // Film & Animation
  '2', // Autos & Vehicles
  '15', // Pets & Animals
  '17', // Sports
  '19', // Travel & Events
  '20', // Gaming
  '22', // People & Blogs
  '23', // Comedy
  '24', // Entertainment
  '25', // News & Politics
  '26', // Howto & Style
  '27', // Education
  '28', // Science & Technology
];

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

async function mapWithConcurrency(items, limit, fn, shouldStop = () => false) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length && !shouldStop()) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function popularJapaneseVideos(apiKey, targetCount) {
  const videos = [];
  let pageToken;

  while (videos.length < targetCount) {
    const data = await apiGet(
      'videos',
      {
        part: 'snippet',
        chart: 'mostPopular',
        regionCode: 'JP',
        maxResults: RESULTS_PER_PAGE,
        ...(pageToken ? { pageToken } : {}),
      },
      apiKey
    );
    for (const item of data.items || []) {
      videos.push({ videoId: item.id, title: item.snippet.title });
    }
    pageToken = data.nextPageToken;
    if (!pageToken) break;
  }

  return videos.slice(0, targetCount);
}

async function searchByCategory(apiKey, categoryId) {
  const data = await apiGet(
    'search',
    {
      part: 'snippet',
      type: 'video',
      regionCode: 'JP',
      relevanceLanguage: 'ja',
      videoCategoryId: categoryId,
      order: 'date',
      maxResults: RESULTS_PER_PAGE,
    },
    apiKey
  );
  return (data.items || []).map((item) => ({ videoId: item.id.videoId, title: item.snippet.title }));
}

async function resolveChannelId(apiKey, entry) {
  if (entry.channelId) return entry.channelId;
  const data = await apiGet('channels', { part: 'id', forHandle: entry.handle }, apiKey);
  return (data.items && data.items[0] && data.items[0].id) || null;
}

async function channelRecentVideos(apiKey, channelId) {
  const data = await apiGet(
    'search',
    { part: 'snippet', type: 'video', channelId, order: 'date', maxResults: RESULTS_PER_PAGE },
    apiKey
  );
  return (data.items || []).map((item) => ({ videoId: item.id.videoId, title: item.snippet.title }));
}

async function discoverJapaneseVideos(apiKey) {
  const byId = new Map();

  const popular = await popularJapaneseVideos(apiKey, 400);
  for (const v of popular) byId.set(v.videoId, v);

  const categoryResults = await mapWithConcurrency(DISCOVERY_CATEGORIES, CATEGORY_SEARCH_CONCURRENCY, (id) =>
    searchByCategory(apiKey, id).catch(() => [])
  );
  for (const list of categoryResults) {
    for (const v of list) byId.set(v.videoId, v);
  }

  const channelResults = await mapWithConcurrency(DISCOVERY_CHANNELS, CATEGORY_SEARCH_CONCURRENCY, async (entry) => {
    try {
      const channelId = await resolveChannelId(apiKey, entry);
      if (!channelId) return [];
      return await channelRecentVideos(apiKey, channelId);
    } catch {
      return [];
    }
  });
  for (const list of channelResults) {
    for (const v of list) byId.set(v.videoId, v);
  }

  return [...byId.values()];
}

async function getTopLevelComments(videoId, apiKey, maxResults) {
  const data = await apiGet(
    'commentThreads',
    { part: 'snippet', videoId, maxResults, order: 'relevance', textFormat: 'plainText' },
    apiKey
  );
  return (data.items || []).map((item) => item.snippet.topLevelComment.snippet.textDisplay);
}

export async function checkPhraseUsage(
  phrase,
  apiKey,
  { maxCommentsPerVideo = 100, targetMatches = 10, onProgress } = {}
) {
  const videos = await discoverJapaneseVideos(apiKey);

  let videosChecked = 0;
  let videosDone = 0;
  const matches = [];

  await mapWithConcurrency(
    videos,
    COMMENT_FETCH_CONCURRENCY,
    async (video) => {
      try {
        const comments = await getTopLevelComments(video.videoId, apiKey, maxCommentsPerVideo);
        videosChecked++;
        for (const text of comments) {
          if (text.includes(phrase)) matches.push({ text, videoTitle: video.title, videoId: video.videoId });
        }
      } catch {
        // Comments disabled on this video, or another per-video error - skip it.
      }
      videosDone++;
      if (onProgress) onProgress(videosDone, videos.length, matches.length);
    },
    () => matches.length >= targetMatches
  );

  return {
    matches,
    videosChecked,
    videosFound: videos.length,
    // true if we stopped early because we hit targetMatches, false if we
    // ran out of videos to check before reaching it (or found none at all).
    reachedTarget: matches.length >= targetMatches,
  };
}
