// Centralized UI text. Every user-facing string in the app lives here so
// wording can be reviewed and fixed in one place.

export const appName = 'Cardwise';

function pluralCard(n) {
  return `${n} card${n === 1 ? '' : 's'}`;
}

export const t = {
  // Shared
  backToDecks: '← All decks',
  deckNameLabel: 'Deck name',

  // Home / deck list
  home: {
    title: appName,
    installLink: 'How to install this app on your iPhone',
    dictLink: 'Look up a word in the dictionary',
    createDeckHeading: 'Create a new deck',
    createDeckAriaLabel: 'Create a new deck',
    createDeckButton: 'Create deck',
    deckCreated: (name) => `Deck "${name}" created`,
    decksHeading: 'Your decks',
    noDecks: 'No decks yet. Create one above to get started.',
    deckMeta: (cardCount, dueCount) => `${pluralCard(cardCount)}, ${dueCount} due`,
  },

  // Deck detail
  deckDetail: {
    notFound: 'Deck not found.',
    status: (cardCount, dueCount) => `${pluralCard(cardCount)} total, ${dueCount} due for review`,
    addCard: 'Add a card',
    startReview: (dueCount) => `Start review (${dueCount} due)`,
    reviewAnyway: 'Review anyway (nothing due)',
    renameHeading: 'Rename deck',
    renameAriaLabel: 'Rename deck',
    saveName: 'Save name',
    renamed: (name) => `Deck renamed to "${name}"`,
    deleteDeck: 'Delete this deck',
    confirmDeleteDeck: (name) => `Delete "${name}" and all its cards? This cannot be undone.`,
    cardsHeading: 'Cards',
    noCards: 'No cards yet.',
    deleteCard: 'Delete',
    deleteCardAriaLabel: (front) => `Delete card: ${front}`,
    confirmDeleteCard: (front) => `Delete this card?\n\n${front}`,
    cardDeleted: 'Card deleted',
  },

  // Card editor
  cardEditor: {
    editHeading: 'Edit card',
    addHeading: 'Add a new card',
    frontLabel: 'Front (question / word)',
    backLabel: 'Back (answer / meaning)',
    exampleLabel: 'Example sentence (optional)',
    saveChanges: 'Save changes',
    addCard: 'Add card',
    cardUpdated: 'Card updated',
    cardAdded: 'Card added',
    sourceLink: 'Watch the source video',
  },

  // YouTube video capture
  youtubeCapture: {
    navLink: 'Create a card from a video',
    heading: 'Create a card from a video',
    urlLabel: 'YouTube video URL',
    loadButton: 'Load video',
    invalidUrl: 'Please enter a valid YouTube video URL.',
    videoLoaded: 'Video loaded.',
    skipToForm: 'Skip video player controls, go to capture form',
    captureHeading: 'Capture a card',
    grabTimeButton: 'Record current time',
    timeRecorded: (time) => `Recorded ${time}`,
    timeLabel: (time) => `Recorded time: ${time}`,
    noTimeYet: 'No time recorded yet.',
    saveButton: 'Save card',
    cardSaved: 'Card saved. The video is still playing, so you can keep capturing more.',
  },

  // Review session
  review: {
    heading: (deckName) => `Reviewing: ${deckName}`,
    frontSrHeading: 'Front',
    backSrHeading: 'Back',
    progress: (current, total) => `Card ${current} of ${total}`,
    nothingHeading: 'Nothing to review',
    completeHeading: 'Review complete',
    nothingMessage: 'This deck has no cards due right now.',
    completeMessage: (count) => `You reviewed ${pluralCard(count)}.`,
    backToDeck: 'Back to deck',
    completeAnnounce: (count) => `Review complete. You reviewed ${pluralCard(count)}.`,
    showAnswer: 'Show answer',
    gradeGroupLabel: 'Grade this card',
    grades: {
      again: 'Again',
      hard: 'Hard',
      good: 'Good',
      easy: 'Easy',
    },
    marked: (label) => `Marked ${label}.`,
  },

  // Install instructions
  install: {
    heading: 'Install on your iPhone',
    intro:
      "Adding Cardwise to your Home Screen lets it open like a regular app, full-screen, with its own icon, and it keeps working without a live internet connection.",
    steps: [
      'Open this page in Safari, not Chrome or another browser. Only Safari can add apps to the Home Screen on iPhone.',
      'Tap the Share button, the square with an arrow pointing up, usually at the bottom of the screen.',
      'Scroll down in the menu that appears and tap "Add to Home Screen".',
      'Tap "Add" in the top-right corner.',
      `Close Safari and find the new ${appName} icon on your Home Screen. Open it from there from now on.`,
    ],
  },

  // Dictionary search
  dictSearch: {
    heading: 'Dictionary',
    searchLabel: 'Word to look up',
    prompt: 'Type a word to search.',
    results: (count) => `${count} result${count === 1 ? '' : 's'} found`,
    noResults: 'No results found',
    compareLink: (count) => `Compare selected words (${count})`,
    usageCheckLink: 'Check how a phrase is used',
  },

  // Dictionary entry
  dictEntry: {
    backToSearch: '← Dictionary',
    definitionsHeading: 'Definitions',
    exampleLabel: 'Example: ',
    notFound: 'This word was not found.',
    notesHeading: 'Usage notes',
    synonymsHeading: 'Similar words',
    antonymsHeading: 'Opposite words',
    addToCompare: 'Add to comparison',
    removeFromCompare: 'Remove from comparison',
    addedToCompare: (word) => `${word} added to comparison`,
    removedFromCompare: (word) => `${word} removed from comparison`,
    compareFull: 'You can compare up to 3 words at a time. Remove one before adding another.',
  },

  // Word comparison
  dictCompare: {
    backToDict: '← Dictionary',
    heading: 'Compare words',
    empty: 'Add at least 2 words from the dictionary to compare them here.',
    clearAll: 'Clear all',
    remove: (word) => `Remove ${word} from comparison`,
  },

  // Phrase usage check (YouTube comments)
  usageCheck: {
    backToDict: '← Dictionary',
    heading: 'Check how a phrase is used',
    intro:
      "Search Japanese YouTube comments for a phrase to see how many times it turns up in comments that look like they're written by native speakers. This checks a sample of videos, not all of YouTube, so a low count doesn't necessarily mean a phrase is unnatural.",
    phraseLabel: 'Phrase to check',
    checkButton: 'Check usage',
    apiKeyMissing: 'You need to add a YouTube API key before this can search. See instructions below.',
    apiKeyLabel: 'YouTube Data API key',
    apiKeySave: 'Save key',
    apiKeySaved: 'API key saved.',
    apiKeyHelp:
      'This feature needs your own free YouTube Data API key so it can search on your behalf (there is a small daily free quota from Google). Go to console.cloud.google.com, create a project, enable "YouTube Data API v3", create an API key under Credentials, and paste it below. The key is stored only on this device and sent only to Google, never anywhere else.',
    searching: 'Searching YouTube...',
    resultCount: (count, videoCount) =>
      `Found this phrase in ${count} comment${count === 1 ? '' : 's'} across ${videoCount} video${videoCount === 1 ? '' : 's'} checked.`,
    noMatches: 'No matching comments found in the videos checked.',
    examplesHeading: 'Example comments',
    apiError: 'Something went wrong talking to YouTube. Check your API key and try again.',
  },
};
