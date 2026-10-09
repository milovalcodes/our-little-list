// Sends the notifications the website queues up.
//
// This used to be a GitHub Actions cron. GitHub treats scheduled workflows as
// the lowest-priority queue and was firing a `*/5` schedule roughly every four
// hours, which made "remind me at 3pm" mean "sometime this afternoon". Workers
// cron triggers actually run on the minute.

import { settleWordWeeks } from './word-week.js';
import {settleActivityWeeks,notifyActivityResults} from './activity-week.js';
import {LEAGUE_WEEK} from '../../league-scores.js';
import {timedPuzzle,PUZZLE_TYPES,LEAGUE_START_DAY} from '../../daily-puzzles.js';
import {timedOver} from '../../timed-game.js';
import { signIn, createClient } from './firestore.js';
import { sendNotification } from './webpush.js';
import { normalizeNotificationPreferences, notificationKindEnabled, vibrationPattern, reminderSourcePath, reminderStillWanted, quietHoursEndUtc } from '../../notification-policy.js';
import { focusDelivery } from '../../delivery-policy.js';
import { questionClock, questionForDay } from '../../question-prompts.js';
import { wordForDay } from '../../daily-words.js';
import { activityWindow } from '../../activity-clock.js';
import {scheduleListReminders,listReminderWanted} from './list-reminders.js';

const GRACE_MS = 0;                  // never ring before the time that was chosen
const STALE_MS = 3 * 60 * 60_000;    // older than 3h: still send, but say it is late
const ABANDONED_MS = 7 * 24 * 60 * 60_000;
const LOCK_STALE_MS = 2 * 60_000;
let tokenCache = null;

function required(env, name) {
  const value = env[name];
  if (!value) throw new Error(`missing ${name}. Set it with: wrangler secret put ${name}`);
  return value;
}

export async function deliver(env, { scheduleQuestions = true } = {}) {
  const apiKey = required(env, 'FIREBASE_API_KEY');
  const projectId = required(env, 'FIREBASE_PROJECT_ID');
  const householdId = required(env, 'HOUSEHOLD_ID');
  const email = required(env, 'LITTLE_EMAIL');
  const password = required(env, 'LITTLE_PASSWORD');

  const vapid = {
    publicKey: required(env, 'VAPID_PUBLIC_KEY'),
    privateKey: required(env, 'VAPID_PRIVATE_KEY'),
    subject: env.VAPID_SUBJECT || `mailto:${email}`
  };

  const idToken = await tokenFor({ apiKey, email, password });
  const db = createClient({ projectId, idToken });
  const household = `households/${householdId}`;
  const lockPath = `${household}/deliveryLocks/active`;
  const lockAt = Date.now();

  if (!await acquireDeliveryLock(db, lockPath, lockAt)) {
    return { checked: false, skipped: 'already-running' };
  }

  try {

    const now = Date.now();
    try { await scheduleListReminders(db,household,now); }
    catch(problem) { console.error(`list reminders skipped: ${problem?.message || problem}`); }
    // The daily question is a nicety; a failure there (a 5xx, or rules not
    // deployed yet) must not stop reminders, asks and notes going out.
    if (scheduleQuestions) {
      try { await ensureQuestionOfDay(db, household, now); }
      catch (problem) { console.error(`daily question skipped: ${problem?.message || problem}`); }
      try { await settleWordWeeks(db, household, now,{before:LEAGUE_WEEK}); await settleActivityWeeks(db,household,now); await notifyActivityResults(db,household,now); }
      catch (problem) { console.error(`weekly word skipped: ${problem?.message || problem}`); }
    }

    const subscriptions = {};
    for (const record of await db.list(`${household}/pushSubs`)) {
      if (record?.subscription?.endpoint) subscriptions[record.id] = record;
    }

    const due = await db.dueFrom(`${household}/outbox`, 'sendAt', now + GRACE_MS, 50);
    if (due.length === 0) {
      return { checked: true, sent: 0, subscribed: Object.keys(subscriptions).length };
    }

    let sent = 0;
    let left = 0;
    let dropped = 0;
    let muted = 0;
    let held = 0;
    const statusCache = new Map();

    for (const message of due) {
      if(message.kind==='list-reminder' && !await listReminderWanted(db,household,message)) {
        await db.remove(message.path);dropped+=1;continue;
      }
      // Lateness starts when the message was due, not when it was created. A
      // reminder made a month early is brand-new at its scheduled moment.
      const dueAge = Math.max(0, now - Number(message.sendAt || message.createdAt || now));
      if (dueAge > ABANDONED_MS) {
        await db.remove(message.path);
        dropped += 1;
        continue;
      }

    // A nudge whose ask (or old-style reminder) was deleted, sorted or turned
    // down should not still go off.
      if (message.kind === 'reminder' && message.ref) {
        const source = reminderSourcePath(message.ref);
        const reminder = source ? await db.get(`${household}/${source}`) : null;
        if (!reminderStillWanted(reminder)) {
          await db.remove(message.path);
          dropped += 1;
          continue;
        }
      }

      if (message.kind === 'word-week' && String(message.ref || '').includes('-tie-')
        && await db.get(`${household}/wordDuelEnds/${String(message.ref).split('/').pop()}`)) {
        await db.remove(message.path); dropped += 1; continue;
      }
      if (message.kind === 'activities-open' && String(message.ref || '').split('/').pop() !== questionClock(now).day) {
        await db.remove(message.path); dropped += 1; continue;
      }
      if(message.kind==='activity-result'){
        const match=/^activities\/(\d{4}-\d{2}-\d{2}(?:-tie-\d+)?)-(word|search|crossword)-(waiting|reveal)$/.exec(message.ref||'');
        const day=match?.[1],type=match?.[2],event=match?.[3];
        const stale=!match||(day.includes('-tie-')?Boolean(await db.get(`${household}/wordDuelEnds/${day}`)):day!==questionClock(now).day);
        const result=!stale&&event==='waiting'?await db.get(`${household}/${type==='word'?'wordResults':'timedResults'}/${day}-${type==='word'?'':type+'-'}${message.to}`):null;
        if(stale||(event==='waiting'&&(type==='word'?result?.done:timedOver(result,now)))){await db.remove(message.path);dropped+=1;continue;}
      }
      if (String(message.kind || '').startsWith('question-')) {
        const clock = questionClock(now);
        const day = String(message.ref || '').split('/').pop();
        const record = day === clock.day && clock.open ? await db.get(`${household}/questions/${day}`) : null;
        // Drop stale question pings even when this side has no subscription.
        // Otherwise a late registration could resurrect an obsolete message.
        const bothAnswered = Boolean(record?.answers?.her?.at && record?.answers?.him?.at);
        if (!record
          || (message.kind === 'question-open' && record.answers?.[message.to]?.at)
          || (message.kind === 'question-answered' && bothAnswered)) {
          await db.remove(message.path);
          dropped += 1;
          continue;
        }
      }

      if (message.kind === 'game') {
        await db.remove(message.path);
        dropped += 1;
        continue;
      }

      const target = subscriptions[message.to];
      if (!target) {
      // Nobody on that side has turned notifications on yet. Leave it queued so
      // it lands once they do, then give up quietly.
        left += 1;
        continue;
      }

      // Category choices live beside this side's push subscription. Filtering
      // here — before Web Push — is important: a service worker is not allowed
      // to receive a userVisibleOnly push and quietly show nothing.
      const preferences = normalizeNotificationPreferences(target.preferences);
      if (!notificationKindEnabled(message.kind, preferences)) {
        await db.remove(message.path);
        muted += 1;
        continue;
      }

      let recipientStatus = statusCache.get(message.to);
      if (recipientStatus === undefined) {
        recipientStatus = await db.get(`${household}/statuses/${message.to}`) || null;
        statusCache.set(message.to, recipientStatus);
      }
      const focus = focusDelivery(message, recipientStatus, now);
      // Quiet hours hold chatter until morning. A reminder is a time someone
      // chose on purpose, so it is never held; an arrival is only news right
      // now ("just got home" at 8am is not), so it comes through silently.
      const quietEnd = message.urgent === true || ['reminder','list-reminder'].includes(message.kind)
        ? 0
        : quietHoursEndUtc(now, preferences.quietHours, Number(target.utcOffsetMinutes));
      const quietArrival = Boolean(quietEnd) && message.kind === 'arrival';
      const holdUntil = Math.max(focus.holdUntil, quietArrival ? 0 : quietEnd);
      if (holdUntil) {
        // One refused or vanished message must not stop the whole pass: it
        // stays at the front of the queue, so every later pass would fail on
        // it too and nothing behind it would ever go out.
        try {
          await db.moveSendAt(message.path, holdUntil);
        } catch (problem) {
          console.error(`could not hold ${message.id}: ${problem?.message || problem}`);
        }
        held += 1;
        continue;
      }

      const payload = JSON.stringify({
        title: message.title || 'Our Little App',
        body: message.body || '',
        url: message.url || 'index.html',
        tag: `${message.kind || 'note'}-${message.id}`,
        kind: message.kind || 'note',
        late: dueAge > STALE_MS,
        silent: preferences.backgroundSound === 'silent' || focus.quiet || quietArrival,
        vibrate: vibrationPattern(preferences.vibration)
      });

      const result = await sendNotification(target.subscription, payload, vapid, {
        ttl: 86400,
        urgency: ['reminder', 'list-reminder', 'list-nudge', 'help', 'arrival'].includes(message.kind) || message.urgent === true ? 'high' : 'normal'
      });

      if (result.ok) {
        await db.remove(message.path);
        sent += 1;
      } else if (result.status === 404 || result.status === 410) {
      // The browser threw the subscription away. Clear it so that phone
      // re-registers next time it opens the site.
      console.log(`subscription for ${message.to} is gone (${result.status}); clearing it`);
        await db.remove(`${household}/pushSubs/${message.to}`);
        delete subscriptions[message.to];
        left += 1;
      } else {
        console.error(`could not send ${message.id}: ${result.status} ${result.text.slice(0, 200)}`);
        left += 1;
      }
    }

    return { checked: true, sent, left, dropped, muted, held, subscribed: Object.keys(subscriptions).length };
  } finally {
    await db.remove(lockPath).catch(problem => console.error(`could not release delivery lock: ${problem.message || problem}`));
  }
}

export async function ensureQuestionOfDay(db, household, now) {
  const clock = questionClock(now);
  if (!clock.open) return { open: false };
  const selected = questionForDay(clock.day);
  const word = wordForDay(clock.day);
  if (!selected && !word) return { open: false, exhausted: true };
  if (word) {
    const wordPath = `${household}/wordPuzzles/${clock.day}`;
    if (!await db.get(wordPath)) await db.create(wordPath, word);
  }
  if(clock.day>=LEAGUE_START_DAY)for(const type of PUZZLE_TYPES){
    const puzzlePath=`${household}/timedPuzzles/${clock.day}-${type}`;
    if(!await db.get(puzzlePath))await db.create(puzzlePath,timedPuzzle(clock.day,type,now));
  }
  const path = `${household}/questions/${clock.day}`;
  let question = await db.get(path);
  if (!question && selected) {
    await db.create(path, { day: clock.day, promptId: selected.promptId, answers: {}, openedAt: now, closesAt: activityWindow(clock.day).closesAt });
    question = await db.get(path);
  }
  if (!question && selected) throw new Error(`question ${clock.day} could not be read after opening`);

  const queueEvent = async (event, people, title, body) => {
    const marker = `${household}/questionEvents/${clock.day}-${event}`;
    if (await db.get(marker)) return false;
    const documents = [{ path: marker, fields: { day: clock.day, event, createdAt: now } }];
    for (const person of people) {
      documents.push({
        path: `${household}/outbox/question-${clock.day}-${event}-${person}`,
        fields: {
          to: person, title, body, url: event === 'open' ? 'activities.html#daily' : 'activities.html#question',
          kind: event === 'open' ? 'activities-open' : `question-${event}`, ref: `questions/${clock.day}`,
          sendAt: now, createdAt: now
        }
      });
    }
    return db.createMany(documents);
  };

  // Reuse the old opening marker: deploying after the old morning ping must not send a second one.
  await queueEvent('open', ['her', 'him'], 'Today’s activities are ready', clock.day>=LEAGUE_START_DAY?'Three puzzles + a question for two.':selected && word ? 'A question for two + a five-letter mystery.' : selected ? 'Today’s question is ready.' : 'Your five-letter mystery is ready.');
  const her = Boolean(question?.answers?.her?.at);
  const him = Boolean(question?.answers?.him?.at);
  if (her !== him) {
    await queueEvent('answered', [her ? 'him' : 'her'], 'They answered, waiting on you', 'Your turn on today’s question. Answers unlock once you both answer.');
  }
  if (her && him) {
    // The second answer is typed in the app, so that person sees the reveal
    // there. Only the one who answered first is away and needs the ping.
    const first = Number(question.answers.her.at) <= Number(question.answers.him.at) ? 'her' : 'him';
    await queueEvent('reveal', [first], 'Both answers are in', 'Your answers are revealed. Go see what you both said.');
  }
  return { open: true, day: clock.day, answered: Number(her) + Number(him) };
}

async function tokenFor(credentials) {
  const key = `${credentials.apiKey}:${credentials.email}`;
  if (tokenCache?.key === key && tokenCache.expiresAt > Date.now() + 5 * 60_000) return tokenCache.idToken;
  const signed = await signIn(credentials);
  tokenCache = {
    key,
    idToken: signed.idToken,
    expiresAt: Date.now() + signed.expiresIn * 1000
  };
  return signed.idToken;
}

async function acquireDeliveryLock(db, path, now) {
  if (await db.create(path, { acquiredAt: now })) return true;
  const existing = await db.get(path);
  if (existing && now - Number(existing.acquiredAt || 0) < LOCK_STALE_MS) return false;
  await db.remove(path);
  return db.create(path, { acquiredAt: now });
}

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(
      deliver(env)
        .then(result => console.log(JSON.stringify(result)))
        .catch(problem => console.error(`delivery failed: ${problem.message || problem}`))
    );
  },

  // Lets you run it by hand while setting up, and gives a health check.
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== '/run') {
      return new Response('our little app delivery. POST /run with the shared secret to trigger a pass.', { status: 200 });
    }
    if (request.method !== 'POST') {
      return new Response('POST only', { status: 405, headers: { Allow: 'POST' } });
    }
    if (!env.RUN_SECRET || request.headers.get('Authorization') !== `Bearer ${env.RUN_SECRET}`) {
      return new Response('nope', { status: 403 });
    }
    try {
      return Response.json(await deliver(env));
    } catch (problem) {
      return Response.json({ error: problem.message || String(problem) }, { status: 500 });
    }
  }
};
