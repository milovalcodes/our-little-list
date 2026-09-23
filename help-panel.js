import { escapeHtml, toast, setButtonBusy, showFailure } from './ui-helpers.js';
import { personName } from './profile-store.js';
import { timeAgo } from './time-format.js';

const ANSWERS = {
  'on-it': { label: 'on it ✓', theirs: 'on it', tone: 'yes' },
  later: { label: 'in a bit ⏳', theirs: 'in a bit', tone: 'maybe' },
  cant: { label: "can't rn ✗", theirs: "can't right now", tone: 'no' }
};

export function initHelpPanel({ data, viewer, other }) {
  const $ = id => document.getElementById(id);
  let requests = [];
  let urgency = 'soon';

  document.querySelectorAll('#help-presets button').forEach(button => {
    button.addEventListener('click', () => {
      $('help-title').value = button.dataset.title;
      $('help-title').dataset.emoji = button.dataset.emoji;
      $('help-title').focus();
    });
  });
  $('help-title').addEventListener('input', () => { delete $('help-title').dataset.emoji; });

  document.querySelectorAll('#help-urgency .choice').forEach(button => {
    button.addEventListener('click', () => {
      urgency = button.dataset.urgency;
      document.querySelectorAll('#help-urgency .choice').forEach(item => item.classList.toggle('active', item === button));
    });
  });

  $('help-form').addEventListener('submit', async event => {
    event.preventDefault();
    const title = $('help-title').value.trim();
    if (!title) return;
    const submit = $('help-submit');
    setButtonBusy(submit, true, 'asking…');
    try {
      await data.addTo('help', {
        from: viewer,
        to: other,
        title,
        note: $('help-note').value.trim(),
        emoji: $('help-title').dataset.emoji || '🙋',
        urgency,
        state: 'open',
        createdAt: Date.now()
      });
      void data.notify(other, {
        title: urgency === 'now' ? `${personName(viewer)} needs a hand, kind of now` : `${personName(viewer)} needs a hand`,
        body: title,
        url: 'tasks.html#asks',
        kind: 'help'
      });
      event.target.reset();
      delete $('help-title').dataset.emoji;
      urgency = 'soon';
      document.querySelectorAll('#help-urgency .choice').forEach(item => item.classList.toggle('active', item.dataset.urgency === urgency));
      $('help-sent').hidden = false;
      $('help-sent').textContent = `asked ${personName(other)}.`;
      toast('asked 🫡');
    } catch (_) {
      showFailure('that ask did not go through.', 'check the internet and try again. Your words are still here.');
    } finally {
      setButtonBusy(submit, false);
    }
  });

  $('help-inbox-list').addEventListener('click', async event => {
    const button = event.target.closest('[data-answer]');
    if (!button) return;
    const id = button.closest('[data-id]')?.dataset.id;
    const request = requests.find(item => item.id === id);
    if (!request) return;
    const answer = button.dataset.answer;
    button.disabled = true;
    try {
      await data.updateIn('help', id, { state: answer, answeredAt: Date.now() });
      await data.notify(request.from, {
        title: `${personName(viewer)}: ${ANSWERS[answer].theirs}`,
        body: request.title,
        url: 'tasks.html#asks',
        kind: 'help-answer'
      });
      toast(ANSWERS[answer].label);
    } catch (_) {
      showFailure('that answer did not save.', 'check the internet and tap it again.');
      button.disabled = false;
    }
  });

  $('help-mine-list').addEventListener('click', async event => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const id = button.closest('[data-id]')?.dataset.id;
    if (!id) return;
    button.disabled = true;
    try {
      if (button.dataset.action === 'done') await data.updateIn('help', id, { state: 'done', closedAt: Date.now() });
      if (button.dataset.action === 'cancel') await data.removeFrom('help', id);
    } catch (_) {
      showFailure('that did not stick.', 'check the internet and try again.');
      button.disabled = false;
    }
  });

  function render() {
    const forMe = requests.filter(item => item.to === viewer && item.state !== 'done');
    const mine = requests.filter(item => item.from === viewer && item.state !== 'done');
    $('help-inbox').hidden = forMe.length === 0;
    $('inbox-title').textContent = `${personName(other)} needs something`;
    $('help-inbox-list').innerHTML = forMe.map(inboxCard).join('');
    $('help-mine-empty').hidden = mine.length > 0;
    $('help-mine-list').innerHTML = mine.map(mineCard).join('');
    $('help-heading').textContent = `Ask ${personName(other)} for a hand`;
  }

  function inboxCard(request) {
    const answered = request.state !== 'open';
    const buttons = Object.entries(ANSWERS).map(([key, value]) => `<button type="button" class="help-answer tone-${value.tone}${request.state === key ? ' is-chosen' : ''}" data-answer="${key}">${value.label}</button>`).join('');
    return `<article class="help-card urgency-${escapeHtml(request.urgency || 'soon')}" data-id="${escapeHtml(request.id)}">
      <div class="help-card-top"><span class="help-emoji">${escapeHtml(request.emoji || '🙋')}</span><div><strong>${escapeHtml(request.title || '')}</strong>${request.note ? `<p>${escapeHtml(request.note)}</p>` : ''}<small>${escapeHtml(timeAgo(request.createdAt))}</small></div></div>
      <div class="help-answers">${buttons}</div>${answered ? `<p class="help-answered">you said ${escapeHtml(ANSWERS[request.state]?.theirs || '')}</p>` : ''}
    </article>`;
  }

  function mineCard(request) {
    const answer = ANSWERS[request.state];
    return `<article class="help-card mine urgency-${escapeHtml(request.urgency || 'soon')}" data-id="${escapeHtml(request.id)}">
      <div class="help-card-top"><span class="help-emoji">${escapeHtml(request.emoji || '🙋')}</span><div><strong>${escapeHtml(request.title || '')}</strong><small>asked ${escapeHtml(timeAgo(request.createdAt))}</small><p class="help-reply ${answer ? `tone-${answer.tone}` : 'tone-waiting'}">${answer ? `${escapeHtml(personName(other))} said ${escapeHtml(answer.theirs)}` : `waiting on ${escapeHtml(personName(other))}`}</p></div></div>
      <div class="help-answers"><button type="button" class="help-answer tone-yes" data-action="done">sorted ✓</button><button type="button" class="help-answer tone-no" data-action="cancel">never mind</button></div>
    </article>`;
  }

  data.listenTo('help', items => {
    requests = items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    render();
  });
  window.addEventListener('littlelist:profile', render);
  render();
}
