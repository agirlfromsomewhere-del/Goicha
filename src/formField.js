// Shared labeled-field builder used by the card editor and the YouTube
// capture form so both produce the same accessible input markup.
export function field(id, labelText, value, multiline) {
  const wrap = document.createElement('div');
  wrap.className = 'field';

  const label = document.createElement('label');
  label.setAttribute('for', id);
  label.textContent = labelText;

  const input = multiline ? document.createElement('textarea') : document.createElement('input');
  if (!multiline) input.type = 'text';
  input.id = id;
  input.value = value || '';

  wrap.append(label, input);
  return { wrap, input };
}
