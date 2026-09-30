import { dateKey, escapeHtml, setButtonBusy, showFailure, toast } from './ui-helpers.js';
import { personName } from './profile-store.js';
import { QUESTIONS, questionForDay } from './question-prompts.js';

export function startDailyQuestion({ data, viewer, other }) {
  const $ = id => document.getElementById(id);
  if (!$('question-form')) return;
  const day = dateKey(new Date());
  const { promptId, prompt } = questionForDay(day);
  let question = null;
  let editing = false;
  $('question-prompt').textContent = prompt;

  data.listenToQuery('questions', { where:{field:'day',value:day} }, items => {
    question = items.find(item => item.id === day) || null;
    render();
  });

  $('question-edit').addEventListener('click', () => {
    editing = true;
    $('question-answer').value = question?.answers?.[viewer]?.text || '';
    render();
    $('question-answer').focus();
  });

  $('question-form').addEventListener('submit', async event => {
    event.preventDefault();
    const text = $('question-answer').value.trim();
    if (!text) return;
    const button = $('question-save');
    setButtonBusy(button, true, 'saving…');
    try {
      const existing = await data.readDoc('questions', day);
      const hadAnswered = Boolean(existing?.answers?.[viewer]?.text);
      const answer = { text, at:Date.now() };
      await data.setTo('questions', day, { day, promptId, answers:{ [viewer]:answer } });
      question = { ...(existing || { id:day, day, promptId }), answers:{ ...(existing?.answers || {}), [viewer]:answer } };
      editing = false;
      render();
      if (!hadAnswered) void data.notify(other, {
        title:`${personName(viewer)} answered today’s question`,
        body:'your turn whenever', url:'today.html#question', kind:'note'
      });
      toast(hadAnswered?'answer updated':'answer saved');
    } catch (_) {
      showFailure('that answer did not save.', 'check the internet and try again. Your words are still here.');
    } finally { setButtonBusy(button, false); }
  });

  function render() {
    const answers = question?.answers || {};
    const mine = answers[viewer];
    const theirs = answers[other];
    const both = Boolean(mine?.text && theirs?.text);
    $('question-form').hidden = Boolean(mine?.text) && !editing;
    $('question-save').textContent = mine?.text ? 'save edit' : 'answer';
    $('question-edit').hidden = !mine?.text || editing;
    const own = mine?.text ? `<div class="question-answer"><small>you</small><p>${escapeHtml(mine.text)}</p></div>` : '';
    const partner = both
      ? `<div class="question-answer"><small>${escapeHtml(personName(other))}</small><p>${escapeHtml(theirs.text)}</p></div>`
      : `<p class="question-waiting">${theirs?.text ? `${escapeHtml(personName(other))} answered · yours first to reveal it` : mine?.text ? `waiting for ${escapeHtml(personName(other))}` : 'answer yours, then compare notes'}</p>`;
    $('question-answers').innerHTML = own + partner;
  }

  window.addEventListener('littlelist:profile', render);
  window.setInterval(() => { if (dateKey(new Date()) !== day) location.reload(); }, 60000);
  render();
}
