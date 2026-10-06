import { escapeHtml, setButtonBusy, showFailure, toast } from './ui-helpers.js';
import { personName } from './profile-store.js';
import { promptFor, QUESTION_START_DAY, questionClock, questionForDay, questionPhase } from './question-prompts.js';

export function startDailyQuestion({ data, viewer, other }) {
  const $ = id => document.getElementById(id);
  if (!$('question-form')) return;
  const clock = questionClock();
  const phase = questionPhase(clock);
  // The local preview has no delivery Worker to open a question. Give it a
  // stable preview day so the exact same answer flow stays testable offline.
  const day = data.mode === 'local' && !questionForDay(clock.day) ? QUESTION_START_DAY : clock.day;
  const selected = questionForDay(day);
  let question = null;
  let mineAnswer = null;
  let partnerAnswer = null;
  let answerRead = 0;
  let editing = false;
  let answersExpanded = false;
  const available = Boolean(selected && (phase === 'open' || data.mode === 'local'));
  const firstDay = new Intl.DateTimeFormat('en-US', { month:'long', day:'numeric', timeZone:'UTC' }).format(new Date(`${QUESTION_START_DAY}T00:00:00Z`));
  $('question-prompt').textContent = phase === 'upcoming' && data.mode !== 'local' ? 'The first question is on its way' : phase === 'exhausted' ? 'No new question yet' : available ? 'getting today’s question…' : 'Back at 8 a.m.';
  $('question-form').hidden = !available;
  if (!selected || !available) {
    $('question-answers').textContent = phase === 'upcoming' ? `The first one opens ${firstDay} at 8 a.m. Eastern. Nothing used up yet.` : phase === 'exhausted' ? 'We’ve used every question in this set. New ones need to be added before they can repeat.' : 'A fresh question opens at 8 a.m. Eastern.';
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

  // Answers are private until both are in, and the rules enforce that. So:
  // - your own answer is only read once you have one (reading a missing doc
  //   is refused, which used to pop "answers did not load" every morning);
  // - the partner's is read once both are in, and when you answered second
  //   the server may not have your answer yet, so a refusal or no signal just
  //   waits and tries again instead of showing an error.
  let retryTimer = 0;
  async function loadAnswers(attempt = 0) {
    if (!question) return;
    window.clearTimeout(retryTimer);
    const revision = ++answerRead;
    const iAnswered = Boolean(question.answers?.[viewer]?.at);
    const both = iAnswered && Boolean(question.answers?.[other]?.at);
    let mine = mineAnswer;
    let theirs = partnerAnswer;
    let missed = false;
    if (iAnswered && !(mine?.text && Number(mine.at) >= Number(question.answers[viewer].at))) {
      try { mine = await data.readDoc('questionAnswers', `${day}-${viewer}`) || mine; } catch (_) { missed = true; }
    }
    if (both && !theirs?.text) {
      try { theirs = await data.readDoc('questionAnswers', `${day}-${other}`); } catch (_) { missed = true; }
    }
    if (revision !== answerRead) return;
    mineAnswer = iAnswered ? mine : null;
    partnerAnswer = both ? theirs : null;
    render();
    if ((missed || (both && !partnerAnswer?.text)) && attempt < 6) {
      retryTimer = window.setTimeout(() => void loadAnswers(attempt + 1), Math.min(30000, 2000 * 2 ** attempt));
    }
  }

  $('question-edit').addEventListener('click', () => {
    editing = true;
    answersExpanded = true;
    $('question-answer').value = mineAnswer?.text || '';
    render();
    $('question-answer').focus();
  });
  $('question-reveal').addEventListener('click',()=>{answersExpanded=!answersExpanded;render();});

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
    const prompt = promptFor(day, question?.promptId ?? selected.promptId) || selected.prompt;
    $('question-prompt').textContent = prompt;
    if (!question && data.mode !== 'local') {
      $('question-form').hidden = true;
      $('question-answers').textContent = 'Opening the question now. Give it a moment.';
      return;
    }
    const answers = question?.answers || {};
    const both = Boolean(answers.her?.at && answers.him?.at);
    $('question').classList.toggle('is-folded',both&&!answersExpanded&&!editing);
    $('question-reveal').hidden=!both;
    $('question-reveal').textContent=answersExpanded?'hide answers':'see answers';
    if(both&&!answersExpanded&&!editing)$('question-prompt').textContent='Today’s question ✓';
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
