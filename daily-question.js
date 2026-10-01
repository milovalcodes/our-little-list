import { escapeHtml, setButtonBusy, showFailure, toast } from './ui-helpers.js';
import { personName } from './profile-store.js';
import { QUESTIONS, QUESTION_START_DAY, questionClock, questionForDay } from './question-prompts.js';

export function startDailyQuestion({ data, viewer, other }) {
  const $ = id => document.getElementById(id);
  if (!$('question-form')) return;
  const clock = questionClock();
  // The local preview has no delivery Worker to open a question. Give it a
  // stable preview day so the exact same answer flow stays testable offline.
  const day = data.mode === 'local' && !questionForDay(clock.day) ? QUESTION_START_DAY : clock.day;
  const selected = questionForDay(day);
  let question = null;
  let mineAnswer = null;
  let partnerAnswer = null;
  let answerRead = 0;
  let editing = false;
  const available = Boolean(selected && (clock.open || data.mode === 'local'));
  $('question-prompt').textContent = !selected ? 'No new question yet' : available ? 'getting today’s question…' : 'Back at 8 a.m.';
  $('question-form').hidden = !available;
  if (!selected || !available) {
    $('question-answers').textContent = !selected ? 'We’ve used every question in this set. New ones need to be added before they can repeat.' : 'A fresh question opens at 8 a.m. Eastern.';
    $('question-edit').hidden = true;
    window.setInterval(() => { if (questionClock().day !== clock.day || questionClock().open !== clock.open) location.reload(); }, 30000);
    return;
  }

  data.listenToQuery('questions', { where:{field:'day',value:day} }, items => {
    question = items.find(item => item.id === day) || null;
    if (!question && data.mode === 'local') question = { id:day, day, promptId:selected.promptId, answers:{} };
    render();
    void loadAnswers();
  });

  async function loadAnswers() {
    if (!question) return;
    const revision = ++answerRead;
    try {
      const mine = await data.readDoc('questionAnswers', `${day}-${viewer}`);
      const both = Boolean(question.answers?.her?.at && question.answers?.him?.at);
      const theirs = both ? await data.readDoc('questionAnswers', `${day}-${other}`) : null;
      if (revision !== answerRead) return;
      mineAnswer = mine;
      partnerAnswer = theirs;
      render();
    } catch (_) {
      if (revision === answerRead) showFailure('answers did not load.', 'check the internet and reopen today.');
    }
  }

  $('question-edit').addEventListener('click', () => {
    editing = true;
    $('question-answer').value = mineAnswer?.text || '';
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
      // The live snapshot is available offline. A fresh server read here would
      // reject a perfectly queueable answer when the phone loses signal.
      const existing = question;
      if (!existing && data.mode !== 'local') throw new Error('question has not opened on the server');
      if (data.mode === 'local' && !await data.readDoc('questions', day)) {
        await data.setTo('questions', day, { day, promptId:selected.promptId, answers:{} });
      }
      const hadAnswered = Boolean(mineAnswer?.text);
      const at = Date.now();
      await data.answerQuestion(day, viewer, text, at);
      mineAnswer = { day, person:viewer, text, at };
      question = { ...(existing || { id:day, day, promptId:selected.promptId }), answers:{ ...(existing?.answers || {}), [viewer]:{ at } } };
      editing = false;
      render();
      void loadAnswers();
      toast(hadAnswered?'answer updated':'answer saved');
    } catch (_) {
      showFailure('that answer did not save.', 'check the internet and try again. Your words are still here.');
    } finally { setButtonBusy(button, false); }
  });

  function render() {
    const prompt = QUESTIONS[question?.promptId ?? selected.promptId]?.prompt || selected.prompt;
    $('question-prompt').textContent = prompt;
    if (!question && data.mode !== 'local') {
      $('question-form').hidden = true;
      $('question-answers').textContent = 'Opening the question now. Give it a moment.';
      return;
    }
    const answers = question?.answers || {};
    const both = Boolean(answers.her?.at && answers.him?.at);
    $('question-form').hidden = Boolean(mineAnswer?.text) && !editing;
    $('question-save').textContent = mineAnswer?.text ? 'save edit' : 'answer';
    $('question-edit').hidden = !mineAnswer?.text || editing;
    const own = mineAnswer?.text ? `<div class="question-answer"><small>you</small><p>${escapeHtml(mineAnswer.text)}</p></div>` : '';
    const partner = both
      ? partnerAnswer?.text ? `<div class="question-answer"><small>${escapeHtml(personName(other))}</small><p>${escapeHtml(partnerAnswer.text)}</p></div>` : '<p class="question-waiting">opening both answers…</p>'
      : `<p class="question-waiting">${answers[other]?.at ? `${escapeHtml(personName(other))} answered · yours first to reveal it` : mineAnswer?.text ? `waiting for ${escapeHtml(personName(other))}` : 'answer yours, then compare notes'}</p>`;
    $('question-answers').innerHTML = own + partner;
  }

  window.addEventListener('littlelist:profile', render);
  window.setInterval(() => { if (questionClock().day !== clock.day || questionClock().open !== clock.open) location.reload(); }, 30000);
  render();
}
