// Thin wrapper around YouTube's official, publicly documented IFrame Player
// API. This only embeds and plays a video and reads its own playback
// position (getCurrentTime) — both officially supported — so it doesn't
// touch any of the unofficial caption endpoints that are now blocked by
// YouTube's anti-scraping checks.

let apiPromise;

function loadIframeApi() {
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
  if (!apiPromise) {
    apiPromise = new Promise((resolve) => {
      const previous = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (previous) previous();
        resolve(window.YT);
      };
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(script);
    });
  }
  return apiPromise;
}

export async function createPlayer(elementId, videoId) {
  const YT = await loadIframeApi();
  return new Promise((resolve) => {
    const player = new YT.Player(elementId, {
      videoId,
      width: '100%',
      height: '220',
      events: {
        onReady: () => resolve(player),
      },
    });
  });
}

export function extractVideoId(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  const host = parsed.hostname.replace(/^www\./, '').replace(/^m\./, '');

  if (host === 'youtu.be') {
    return parsed.pathname.slice(1).split('/')[0] || null;
  }

  if (host === 'youtube.com') {
    if (parsed.pathname === '/watch') return parsed.searchParams.get('v');
    const embedMatch = parsed.pathname.match(/^\/embed\/([^/]+)/);
    if (embedMatch) return embedMatch[1];
    const shortsMatch = parsed.pathname.match(/^\/shorts\/([^/]+)/);
    if (shortsMatch) return shortsMatch[1];
  }

  return null;
}

export function formatTime(totalSeconds) {
  const seconds = Math.floor(totalSeconds);
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
