// FSRS (Free Spaced Repetition Scheduler) - the algorithm modern Anki
// itself uses (replacing the older SM-2 algorithm as of Anki 23.10+).
// Uses the official open-spaced-repetition/ts-fsrs library with its
// default, research-derived parameters (no per-user optimization, same
// as what a fresh Anki install uses before you've logged enough reviews
// to run its optimizer).
import { createEmptyCard, fsrs, Rating, State } from 'ts-fsrs';

const scheduler = fsrs();

const RATING = { again: Rating.Again, hard: Rating.Hard, good: Rating.Good, easy: Rating.Easy };

function fromFsrsCard(fsrsCard) {
  return {
    dueDate: fsrsCard.due.getTime(),
    stability: fsrsCard.stability,
    difficulty: fsrsCard.difficulty,
    elapsed_days: fsrsCard.elapsed_days,
    scheduled_days: fsrsCard.scheduled_days,
    learning_steps: fsrsCard.learning_steps,
    reps: fsrsCard.reps,
    lapses: fsrsCard.lapses,
    state: fsrsCard.state,
    last_review: fsrsCard.last_review ? fsrsCard.last_review.getTime() : undefined,
  };
}

// Converts our stored card (plain object, dates as numbers) into an FSRS
// Card (Date objects). Cards created before FSRS was introduced won't
// have these fields yet - initialize them fresh but keep the card's
// existing due date so upgrading doesn't suddenly dump everyone's whole
// deck into "due today".
function toFsrsCard(card) {
  if (card.state !== undefined) {
    return {
      due: new Date(card.dueDate),
      stability: card.stability,
      difficulty: card.difficulty,
      elapsed_days: card.elapsed_days,
      scheduled_days: card.scheduled_days,
      learning_steps: card.learning_steps,
      reps: card.reps,
      lapses: card.lapses,
      state: card.state,
      last_review: card.last_review ? new Date(card.last_review) : undefined,
    };
  }
  const empty = createEmptyCard();
  return { ...empty, due: new Date(card.dueDate ?? Date.now()) };
}

// Fresh FSRS state for a brand-new card.
export function createNewCardFields() {
  return fromFsrsCard(createEmptyCard());
}

export function isNewCard(card) {
  return card.state === undefined || card.state === State.New;
}

export function schedule(card, grade) {
  const fsrsCard = toFsrsCard(card);
  const result = scheduler.next(fsrsCard, new Date(), RATING[grade]);
  return { ...card, ...fromFsrsCard(result.card) };
}
