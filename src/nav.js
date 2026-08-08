// Internal navigation is done with real <button> elements rather than
// <a href="#..."> links (the app is a single page with hash-based routing,
// so there's nothing meaningful to open in a new tab / preview on hover -
// buttons match how the user actually navigates it). External hyperlinks
// (e.g. the "watch source video" link) stay as real <a> tags.
export function navButton(hash, text, className) {
  const btn = document.createElement('button');
  btn.type = 'button';
  if (className) btn.className = className;
  btn.textContent = text;
  btn.addEventListener('click', () => {
    window.location.hash = hash;
  });
  return btn;
}
