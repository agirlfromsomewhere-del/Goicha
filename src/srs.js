// SM-2 spaced-repetition scheduling (the classic Anki-style algorithm).
const MIN_EASE = 1.3;
const DAY_MS = 24 * 60 * 60 * 1000;

// Map our four grading buttons onto SM-2's 0-5 quality scale.
const QUALITY = { again: 0, hard: 3, good: 4, easy: 5 };

export function schedule(card, grade) {
  const quality = QUALITY[grade];
  let { ease, interval, repetitions } = card;

  if (quality < 3) {
    repetitions = 0;
    interval = 1;
  } else {
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * ease);
    }
    repetitions += 1;
  }

  ease = ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (ease < MIN_EASE) ease = MIN_EASE;

  const dueDate = Date.now() + interval * DAY_MS;

  return { ...card, ease, interval, repetitions, dueDate, lastReviewed: Date.now() };
}
