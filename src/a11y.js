let announcer;

export function initAnnouncer() {
  announcer = document.getElementById('announcer');
}

// Push a message into the polite live region so VoiceOver speaks it
// without stealing focus from whatever the user is doing.
export function announce(message) {
  if (!announcer) return;
  announcer.textContent = '';
  // setTimeout (not requestAnimationFrame) so the announcement still
  // fires even if the tab/app is backgrounded and not rendering frames.
  setTimeout(() => {
    announcer.textContent = message;
  }, 50);
}

// Move keyboard/VoiceOver focus to an element that isn't normally
// focusable (headings, status text) after a navigation or action,
// so screen reader users land somewhere meaningful instead of at
// the top of the page.
export function focusElement(el) {
  if (!el) return;
  if (!el.hasAttribute('tabindex')) {
    el.setAttribute('tabindex', '-1');
  }
  el.focus();
}
