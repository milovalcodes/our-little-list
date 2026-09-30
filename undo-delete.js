// One tap on a small × used to delete for good: a task, a date idea, a memory
// with its photo, a saved spot, an ask. Now the thing disappears at once but
// the real delete waits a few seconds behind a "deleted · undo" bar, the way
// Apple Reminders and Todoist do it. Nothing is re-created on undo, so the
// Firestore rules (which only let the person who added a record create it)
// never have to allow putting someone else's record back.

import { showFailure } from './ui-helpers.js';

const WAIT_MS = 5000;
const pending = new Map();

export function isPendingDelete(name, id) {
  return pending.has(`${name}/${id}`);
}

// Hides nothing by itself: the page's render filters with isPendingDelete and
// onChange asks it to render again.
export function deleteWithUndo(data, name, id, { label = 'deleted', onChange = () => {}, onCommitted } = {}) {
  const key = `${name}/${id}`;
  if (!id || pending.has(key)) return;
  const entry = { data, name, id, onChange, onCommitted, timer: window.setTimeout(() => void commit(key), WAIT_MS) };
  pending.set(key, entry);
  onChange();
  showUndoBar(label, key);
  window.littleHaptic?.('tap');
}

async function commit(key) {
  const entry = pending.get(key);
  if (!entry) return;
  window.clearTimeout(entry.timer);
  // The local snapshot drops the record as soon as the write is issued, so the
  // hold can end now; a refused delete comes back through the same listener.
  let write;
  try { write = entry.data.removeFrom(entry.name, entry.id); } catch (problem) { write = Promise.reject(problem); }
  pending.delete(key);
  document.querySelector(`.undo-toast[data-key="${CSS.escape(key)}"]`)?.remove();
  try {
    await write;
    entry.onCommitted?.();
  } catch (_) {
    entry.onChange();
    showFailure('that did not delete.', 'check the internet and try again.');
  }
}

function undo(key) {
  const entry = pending.get(key);
  if (!entry) return;
  window.clearTimeout(entry.timer);
  pending.delete(key);
  entry.onChange();
}

// One bar for everything still waiting: deleting a second thing within the
// five seconds turns it into "2 deleted · undo", which brings back both.
function showUndoBar(label, key) {
  document.querySelectorAll('.toast').forEach(el => el.remove());
  const keys = [...pending.keys()];
  const bar = document.createElement('div');
  bar.className = 'toast undo-toast';
  bar.dataset.key = key;
  bar.setAttribute('role', 'status');
  bar.setAttribute('aria-live', 'polite');
  bar.innerHTML = '<span></span><button type="button">undo</button>';
  bar.querySelector('span').textContent = keys.length > 1 ? `${keys.length} deleted` : label;
  bar.querySelector('button').addEventListener('click', () => { keys.forEach(undo); bar.remove(); });
  document.body.append(bar);
  window.setTimeout(() => bar.remove(), WAIT_MS);
}

// Leaving the page starts every waiting delete right away, so a delete is
// never lost to a quick tap on the dock.
export function flushPendingDeletes() {
  [...pending.keys()].forEach(key => void commit(key));
}
window.addEventListener('pagehide', flushPendingDeletes);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushPendingDeletes(); });
document.addEventListener('click', event => {
  const link = event.target.closest?.('a[href]');
  if (link && pending.size) flushPendingDeletes();
}, true);
