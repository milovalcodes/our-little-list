import { personName } from './profile-store.js';
import { dateKey } from './ui-helpers.js';

// Ask once each local day when the other person is in a focus session. Normal
// asks still arrive, but quietly; “notify anyway” makes this ask urgent.
export async function chooseAskUrgency(data, viewer, other) {
  let focused = false;
  try {
    const statuses = await data.readOnce('statuses');
    const status = statuses.find(item => item.id === other || item.person === other);
    focused = Number(status?.focusUntil) > Date.now();
  } catch (_) { return false; }
  if (!focused) return false;

  const day = dateKey(new Date());
  const key = `our-little-list-focus-ask-prompt-${viewer}-${other}-${day}`;
  try { if (localStorage.getItem(key)) return false; localStorage.setItem(key, 'shown'); } catch (_) {}

  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'focus-ask-overlay';
    overlay.innerHTML = `<section class="focus-ask-dialog" role="dialog" aria-modal="true" aria-labelledby="focus-ask-title"><span>⏱</span><h2 id="focus-ask-title"></h2><p>the ask can still go through quietly. make this one urgent?</p><div><button type="button" data-focus-choice="normal">send normally</button><button type="button" data-focus-choice="urgent">notify anyway</button></div></section>`;
    overlay.querySelector('h2').textContent = `${personName(other)} is focusing`;
    const finish = urgent => { document.removeEventListener('keydown', onKey); overlay.remove(); resolve(urgent); };
    const onKey = event => { if (event.key === 'Escape') finish(false); };
    document.addEventListener('keydown', onKey);
    overlay.addEventListener('click', event => {
      const button = event.target.closest('[data-focus-choice]');
      if (button) finish(button.dataset.focusChoice === 'urgent');
      else if (event.target === overlay) finish(false);
    });
    document.body.append(overlay);
    overlay.querySelector('[data-focus-choice="normal"]').focus();
  });
}
