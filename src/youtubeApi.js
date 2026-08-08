// Wraps YouTube Data API v3 (official, free-tier, key-based REST API) to
// approximate "how often do people use this phrase" by scanning comments
// on a large sample of currently-popular Japanese videos.
//
// Real limitation, surfaced in the UI too: there is no public API to
// search comments across all of YouTube, only to list comments on a
// specific video - so this checks a large sample of videos, not "all of
// YouTube". A phrase getting zero hits doesn't prove it's unnatural, just
// that it wasn't in this sample.
//
// Deliberately NOT using search.list with the phrase as the query: that
// searches video titles/descriptions, which surfaces videos "about" the
// phrase's keywords rather than videos likely to have it used naturally
// in casual comments - and costs 100 quota units per call versus ~1 for
// the videos.list call used below, which is why this can afford to check
// far more videos.

const API_BASE = 'https://www.googleapis.com/youtube/v3';
const RESULTS_PER_PAGE = 50;
const COMMENT_FETCH_CONCURRENCY = 5;

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

async function getTopLevelComments(videoId, apiKey, maxResults) {
  const data = await apiGet(
    'commentThreads',
    { part: 'snippet', videoId, maxResults, order: 'relevance', textFormat: 'plainText' },
    apiKey
  );
  return (data.items || []).map((item) => item.snippet.topLevelComment.snippet.textDisplay);
}

// Like a normal concurrency-limited map, but workers stop picking up new
// items once shouldStop() returns true. Workers already mid-request finish
// (not aborted), so with a concurrency of N you can overshoot the stop
// condition by up to N-1 in-flight results - fine at this scale.
async function mapWithConcurrency(items, limit, fn, shouldStop) {
  let next = 0;
  async function worker() {
    while (next < items.length && !shouldStop()) {
      const i = next++;
      await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}

export async function checkPhraseUsage(
  phrase,
  apiKey,
  { maxVideos = 10000, maxCommentsPerVideo = 100, targetMatches = 10, onProgress } = {}
) {
  const videos = await popularJapaneseVideos(apiKey, maxVideos);

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
