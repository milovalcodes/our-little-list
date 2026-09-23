const COMMON_EMOJIS = [
  '❤️','😂','🥹','😍','😘','😭','😮','😡','🥰','😊','🤭','🫠',
  '👍','👎','🙏','🫡','🫶','👏','🤝','💀','🤨','😒','🥺','😈',
  '💛','💜','✨','🔥','🎉','👀','💋','🧍','🐀','🤡','🍅','🧠'
];

let activePicker = null;

export function openEmojiPicker({ current = '', onSelect, onRemove } = {}) {
  const dialog = ensurePicker();
  activePicker = { onSelect, onRemove };
  dialog.querySelector('[data-picker-current]').textContent = current || '♡';
  dialog.querySelector('[data-picker-remove]').hidden = !current;
  const input = dialog.querySelector('#emoji-reaction-input');
  const useButton = dialog.querySelector('[data-picker-use]');
  const hint = dialog.querySelector('[data-picker-hint]');
  input.value = '';
  useButton.disabled = true;
  useButton.dataset.emoji = '';
  hint.textContent = 'any emoji works';
  dialog.querySelectorAll('[data-picker-emoji]').forEach(button => {
    button.classList.toggle('active', button.dataset.pickerEmoji === current);
  });
  if (typeof dialog.showModal === 'function') dialog.showModal();
  else dialog.setAttribute('open', '');
  window.setTimeout(() => input.focus({ preventScroll: true }), 80);
}

function ensurePicker() {
  let dialog = document.getElementById('emoji-reaction-picker');
  if (dialog) return dialog;
  dialog = document.createElement('dialog');
  dialog.id = 'emoji-reaction-picker';
  dialog.className = 'emoji-picker';
  dialog.setAttribute('aria-labelledby', 'emoji-picker-title');
  dialog.innerHTML = `<div class="emoji-picker-card">
    <div class="emoji-picker-head">
      <div><span class="tiny-kicker">tiny but important</span><h2 id="emoji-picker-title">pick a reaction</h2></div>
      <button class="emoji-picker-close" type="button" data-picker-close aria-label="Close">×</button>
    </div>
    <div class="emoji-picker-grid" aria-label="Common reactions">
      ${COMMON_EMOJIS.map(value => `<button type="button" data-picker-emoji="${value}" aria-label="React ${value}">${value}</button>`).join('')}
    </div>
    <label class="emoji-picker-keyboard" for="emoji-reaction-input">
      <span>or use your emoji keyboard</span>
      <span class="emoji-picker-input-row"><input id="emoji-reaction-input" type="text" inputmode="text" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="done" aria-describedby="emoji-picker-hint" placeholder="tap here  ☻"><b data-picker-current>♡</b></span>
      <small id="emoji-picker-hint" data-picker-hint>any emoji works</small>
    </label>
    <div class="emoji-picker-actions">
      <button class="quiet-action" type="button" data-picker-remove hidden>remove mine</button>
      <button class="primary-action" type="button" data-picker-use disabled>react</button>
    </div>
  </div>`;
  document.body.append(dialog);

  dialog.addEventListener('click', event => {
    if (event.target === dialog || event.target.closest('[data-picker-close]')) return closePicker(dialog);
    const choice = event.target.closest('[data-picker-emoji]');
    if (choice) return finishPicker(dialog, 'select', choice.dataset.pickerEmoji);
    if (event.target.closest('[data-picker-remove]')) return finishPicker(dialog, 'remove');
    const use = event.target.closest('[data-picker-use]');
    if (use && !use.disabled) finishPicker(dialog, 'select', use.dataset.emoji);
  });
  dialog.addEventListener('cancel', event => { event.preventDefault(); closePicker(dialog); });
  const input = dialog.querySelector('#emoji-reaction-input');
  input.addEventListener('input', () => {
    const emoji = firstEmoji(input.value);
    const useButton = dialog.querySelector('[data-picker-use]');
    const hint = dialog.querySelector('[data-picker-hint]');
    useButton.dataset.emoji = emoji;
    useButton.disabled = !emoji;
    dialog.querySelector('[data-picker-current]').textContent = emoji || '♡';
    hint.textContent = input.value && !emoji ? 'emoji only pls' : 'any emoji works';
  });
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      const useButton = dialog.querySelector('[data-picker-use]');
      if (!useButton.disabled) finishPicker(dialog, 'select', useButton.dataset.emoji);
    }
  });
  return dialog;
}

function firstEmoji(value) {
  const parts = typeof Intl.Segmenter === 'function'
    ? [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(value)].map(item => item.segment)
    : Array.from(value);
  return parts.find(part => /\p{Extended_Pictographic}|\p{Emoji_Presentation}|\uFE0F|\u20E3/u.test(part)) || '';
}

function finishPicker(dialog, action, emoji = '') {
  const callbacks = activePicker;
  closePicker(dialog);
  if (action === 'remove') callbacks?.onRemove?.();
  else if (emoji) callbacks?.onSelect?.(emoji);
}

function closePicker(dialog) {
  activePicker = null;
  if (dialog.open && typeof dialog.close === 'function') dialog.close();
  else dialog.removeAttribute('open');
}
