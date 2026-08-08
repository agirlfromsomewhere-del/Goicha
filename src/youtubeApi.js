// Wraps YouTube Data API v3 (official, free-tier, key-based REST API) to
// approximate "how often do people use this phrase" by scanning comments
// on Japanese videos, digging progressively deeper until enough matches
// are found or the available sources are genuinely exhausted.
//
// Real limitation, surfaced in the UI too: there is no public API to
// search comments across all of YouTube, only to list comments on a
// specific video - so this checks a large, growing sample, not "all of
// YouTube". A phrase getting zero hits doesn't prove it's unnatural, just
// that it wasn't found before the search stopped.
//
// Video discovery combines three paginated sources, treated as streams
// that keep giving more results on request until each runs dry:
// - videos.list?chart=mostPopular: cheap (~1 quota unit/call), but
//   topically narrow - as of a 2025 YouTube change it only reflects the
//   Trending Music/Movies/Gaming charts.
// - search.list with no query, just region/language/category filters,
//   rotated across many video categories: broadens the pool across
//   topics the trending chart doesn't cover. Costs 100 quota units/call.
// - search.list scoped to a curated list of long-form Japanese talk/
//   discussion channels (discoveryChannels.js) - user-requested, since
//   these have far more natural conversational language and opinion-
//   heavy comments than generic browsing turns up. Also 100 units/call,
//   but far more likely to actually contain natural phrasing.
//
// Search strategy: round 1 pulls one page from every source (broad net).
// If that's not enough, later rounds drop the generic category streams
// and only keep paginating the cheap trending stream plus the curated
// channels - deepening into the sources most likely to pay off, rather
// than repeatedly re-paying for 13 category searches each round.
//
// Deliberately NOT using search.list with the phrase itself as the query:
// that searches video titles/descriptions, surfacing videos "about" the
// phrase's keywords rather than videos likely to have it used naturally
// in casual comments.

import { DISCOVERY_CHANNELS } from './discoveryChannels.js';

const API_BASE = 'https://www.googleapis.com/youtube/v3';
const RESULTS_PER_PAGE = 50;
const COMMENT_FETCH_CONCURRENCY = 5;
const DISCOVERY_CONCURRENCY = 5;
const MAX_ROUNDS = 30;
const MAX_VIDEOS_CHECKED = 5000;

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
    error.reason = body?.error?.errors?.[0]?.reason;
    throw error;
  }
  return res.json();
}

function isQuotaError(err) {
  return err && (err.reason === 'quotaExceeded' || err.reason === 'dailyLimitExceeded');
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

// --- Paginated page-fetchers, each returning { items, nextPageToken } ---

async function popularPage(apiKey, pageToken) {
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
  return {
    items: (data.items || []).map((item) => ({ videoId: item.id, title: item.snippet.title })),
    nextPageToken: data.nextPageToken,
  };
}

async function categoryPage(apiKey, categoryId, pageToken) {
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
      ...(pageToken ? { pageToken } : {}),
    },
    apiKey
  );
  return {
    items: (data.items || []).map((item) => ({ videoId: item.id.videoId, title: item.snippet.title })),
    nextPageToken: data.nextPageToken,
  };
}

async function channelPage(apiKey, channelId, pageToken) {
  const data = await apiGet(
    'search',
    {
      part: 'snippet',
      type: 'video',
      channelId,
      order: 'date',
      maxResults: RESULTS_PER_PAGE,
      ...(pageToken ? { pageToken } : {}),
    },
    apiKey
  );
  return {
    items: (data.items || []).map((item) => ({ videoId: item.id.videoId, title: item.snippet.title })),
    nextPageToken: data.nextPageToken,
  };
}

async function resolveChannelId(apiKey, entry) {
  if (entry.channelId) return entry.channelId;
  const data = await apiGet('channels', { part: 'id', forHandle: entry.handle }, apiKey);
  return (data.items && data.items[0] && data.items[0].id) || null;
}

// A stream wraps a paginated fetcher: each next() call returns the next
// page's items, or [] once exhausted (or once it fails - treated the same
// as exhausted for non-quota errors, so one broken source doesn't derail
// the whole search).
function createStream(fetchPage) {
  let pageToken;
  let exhausted = false;
  return {
    get exhausted() {
      return exhausted;
    },
    async next() {
      if (exhausted) return [];
      let data;
      try {
        data = await fetchPage(pageToken);
      } catch (err) {
        if (isQuotaError(err)) throw err;
        exhausted = true;
        return [];
      }
      pageToken = data.nextPageToken;
      if (!pageToken) exhausted = true;
      return data.items;
    },
  };
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
  const popularStream = createStream((pageToken) => popularPage(apiKey, pageToken));
  const categoryStreams = DISCOVERY_CATEGORIES.map((id) => createStream((pageToken) => categoryPage(apiKey, id, pageToken)));

  const resolvedChannels = await mapWithConcurrency(DISCOVERY_CHANNELS, DISCOVERY_CONCURRENCY, async (entry) => {
    try {
      const channelId = await resolveChannelId(apiKey, entry);
      return channelId ? channelId : null;
    } catch {
      return null;
    }
  });
  const channelStreams = resolvedChannels
    .filter(Boolean)
    .map((channelId) => createStream((pageToken) => channelPage(apiKey, channelId, pageToken)));

  const seen = new Set();
  const matches = [];
  let videosChecked = 0;
  let round = 0;
  let quotaExceeded = false;

  async function checkBatch(videos) {
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
        } catch (err) {
          if (isQuotaError(err)) {
            quotaExceeded = true;
            return;
          }
          // Comments disabled on this video, or another per-video error - skip it.
        }
        if (onProgress) onProgress(videosChecked, matches.length, round);
      },
      () => matches.length >= targetMatches || quotaExceeded
    );
  }

  try {
    while (matches.length < targetMatches && round < MAX_ROUNDS && videosChecked < MAX_VIDEOS_CHECKED && !quotaExceeded) {
      round++;
      // Round 1: cast the widest net. Later rounds: drop the generic
      // category streams (already gave their initial breadth) and only
      // keep deepening the cheap trending stream plus the curated
      // channels, which are far more likely to actually pay off.
      const roundStreams = round === 1 ? [popularStream, ...categoryStreams, ...channelStreams] : [popularStream, ...channelStreams];
      const liveStreams = roundStreams.filter((s) => !s.exhausted);
      if (liveStreams.length === 0) break;

      const pages = await mapWithConcurrency(liveStreams, DISCOVERY_CONCURRENCY, (s) => s.next());

      const newVideos = [];
      for (const page of pages) {
        for (const v of page) {
          if (!seen.has(v.videoId)) {
            seen.add(v.videoId);
            newVideos.push(v);
          }
        }
      }

      if (newVideos.length > 0) await checkBatch(newVideos);
    }
  } catch (err) {
    if (isQuotaError(err)) quotaExceeded = true;
    else throw err;
  }

  return {
    matches,
    videosChecked,
    videosFound: seen.size,
    reachedTarget: matches.length >= targetMatches,
    quotaExceeded,
  };
}
