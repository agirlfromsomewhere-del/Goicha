// Daily new-card / review caps, Anki-style - two separate limits so a
// backlog of due reviews doesn't also force a big batch of brand-new
// cards on you the same day. Limits are user-configurable (see
// views/settings.js); today's counts reset automatically at local
// midnight since they're keyed by date string.
const LIMITS_KEY = 'cardwise-daily-limits';
const COUNTS_KEY = 'cardwise-daily-counts';

const DEFAULT_LIMITS = { newPerDay: 20, reviewsPerDay: 200 };

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function getDailyLimits() {
  const raw = localStorage.getItem(LIMITS_KEY);
  if (!raw) return { ...DEFAULT_LIMITS };
  try {
    return { ...DEFAULT_LIMITS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_LIMITS };
  }
}

export function setDailyLimits(limits) {
  localStorage.setItem(LIMITS_KEY, JSON.stringify(limits));
}

function getCounts() {
  const raw = localStorage.getItem(COUNTS_KEY);
  if (raw) {
    try {
      const counts = JSON.parse(raw);
      if (counts.date === todayKey()) return counts;
    } catch {
      // fall through to fresh counts
    }
  }
  return { date: todayKey(), newSeen: 0, reviewsSeen: 0 };
}

export function getTodaySeen() {
  const { newSeen, reviewsSeen } = getCounts();
  return { newSeen, reviewsSeen };
}

export function recordSeen(wasNew) {
  const counts = getCounts();
  if (wasNew) counts.newSeen += 1;
  else counts.reviewsSeen += 1;
  localStorage.setItem(COUNTS_KEY, JSON.stringify(counts));
}
