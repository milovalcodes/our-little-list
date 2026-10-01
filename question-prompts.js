// Original prompts inspired by open-ended relationship conversations, not
// copied from a card deck. See README for the Gottman and Planned Parenthood
// references behind the open-ended and consent-first approach.
// One shared America/New_York day, opening at 08:00. The bank never cycles:
// when it is exhausted, we add new prompts rather than quietly repeating old ones.
export const QUESTION_TIME_ZONE = 'America/New_York';
export const QUESTION_START_DAY = '2026-10-02';

const GROUPS = {
  playful: [
    'What tiny conspiracy should we invent about the people at the grocery store?',
    'If our relationship had a ridiculous mascot, what would it be?',
    'Which errand could we turn into a date with almost no effort?',
    'What would our two-person talent show act be?',
    'What is the most us-coded way to spend an unexpected free hour?',
    'If we opened a very bad restaurant together, what would it serve?',
    'What harmless thing should we become weirdly competitive about?',
    'What object in our lives deserves a dramatic backstory?',
    'What is a tiny tradition we could start this month?',
    'Which fictional world would be the funniest place for us to live?',
    'If I gave you a $10 date budget, what would you plan?',
    'What is one thing we should take an extremely unserious photo of?',
    'What is a song that instantly changes your mood?',
    'What is the worst possible name for a pet we would still end up loving?',
    'Which snack would you bring to our imaginary apocalypse bunker?',
    'What is a thing we could learn together and be terrible at first?',
    'If today had a soundtrack, what would its opening song be?',
    'What is a place nearby that we keep saying we will visit?',
    'What would a perfect no-plans Sunday with me actually look like?',
    'If we made a time capsule this week, what small thing belongs inside?',
    'What is the most dramatic way to announce that dinner is ready?',
    'Which of our running jokes deserves its own museum exhibit?',
    'What is a tiny adventure we could pull off after work?',
    'If we had to host a themed night tonight, what is the theme?',
    'What would you name a playlist about us?',
    'What weird little skill do you think I would be surprisingly good at?',
    'What is the funniest thing we have ever tried to do together?',
    'What should our next extremely low-stakes challenge be?',
    'Which ordinary moment with me would make a cute movie scene?',
    'If we switched jobs for one day, what would go wrong first?'
  ],
  deep: [
    'When do you feel most understood by me?',
    'What part of yourself are you still learning how to explain?',
    'Which memory of us do you return to when you need comfort?',
    'What did love look like to you growing up, and what do you want it to look like now?',
    'What is a fear you can say out loud more easily with me?',
    'When have you felt especially proud of the person you are becoming?',
    'What do you wish people asked you about more often?',
    'What is something you have changed your mind about since we met?',
    'What is one way our relationship has made your life bigger?',
    'What is a quiet hope you have for the next year?',
    'When do you feel most like yourself?',
    'What is a compliment you still remember years later?',
    'Which part of your past do you want me to understand better?',
    'What is something you are learning to forgive yourself for?',
    'What makes a place feel like home to you?',
    'What is a version of success that actually feels good to you?',
    'What have you needed lately but struggled to ask for?',
    'What is a belief about relationships you have unlearned?',
    'What is one thing you hope never changes about us?',
    'When do you feel brave, even if nobody notices?',
    'What is a dream you have not given enough attention to?',
    'What is something I know about you that others tend to miss?',
    'What does being safe with someone feel like to you?',
    'What is a question you would like me to ask you someday?',
    'Which ordinary moment from your childhood still feels vivid?',
    'What helps you trust that someone is really listening?',
    'What kind of future feels exciting instead of just expected?',
    'What is a lesson you learned the hard way that you value now?',
    'What part of us feels strongest lately?',
    'When did you first realize we were becoming important to each other?'
  ],
  flirty: [
    'What look of mine gets your attention every time?',
    'What is a very specific way you like being flirted with?',
    'Which kiss of ours would you replay?',
    'What is a date-night outfit you would love to see me wear?',
    'When do I accidentally make you blush?',
    'What is a small touch that says a lot to you?',
    'What is your favorite way for us to say hello after time apart?',
    'Where should I steal a kiss from you next?',
    'What is the most attractive thing I do without realizing it?',
    'What kind of message from me makes you grin at your phone?',
    'What is a romantic cliché you secretly want us to do?',
    'If we had an evening with no plans, how would you want it to begin?',
    'What is a moment when you felt especially wanted by me?',
    'What is something sweet you wish I would whisper to you?',
    'Which song should be playing when we dance in the kitchen?',
    'What is your favorite kind of cuddle?',
    'What is one way we could make an ordinary weeknight feel like a date?',
    'Which part of our first few dates still makes you smile?',
    'What would a perfectly cheesy love note from me say?',
    'What is a place where you want to hold my hand more often?',
    'What is an underrated thing about being close to me?',
    'If I planned a surprise date, what one clue would make you excited?',
    'What kind of compliment lands best from me?',
    'What is your favorite memory of us laughing and flirting at once?',
    'What is a tiny romantic gesture we should repeat?',
    'When do you feel our chemistry most?',
    'What would you put on a playlist for getting ready to see me?',
    'What is a way I can make you feel pursued without making a big production?',
    'Which shared glance of ours would someone else never understand?',
    'What is one thing you would love for us to do on a slow morning together?'
  ],
  intimate: [
    'What helps you feel comfortable telling me what you want physically?',
    'What kind of affection do you want more of lately?',
    'What makes a romantic moment feel relaxed instead of pressured?',
    'Is there a boundary you would like us to talk about more clearly?',
    'What is a way I can check in that feels natural when we are getting close?',
    'What helps you feel desired outside the bedroom?',
    'What is a kind of touch you especially like after a hard day?',
    'What is a fantasy you would feel comfortable discussing, even if we never try it?',
    'What helps you feel free to say no or not tonight?',
    'What is something new you might be curious to explore together?',
    'What does a really good wind-down together feel like to you?',
    'What is one thing about our physical connection you appreciate?',
    'When do you feel most confident in your body around me?',
    'What kind of compliment makes you feel sexy rather than self-conscious?',
    'What is a question about intimacy you wish were easier to ask?',
    'What is a romantic setting that genuinely works for you?',
    'How can we make room for closeness when one of us is tired?',
    'What is something that helps you switch from stressed to present?',
    'What is a playful way to show interest without assuming the answer is yes?',
    'What is a form of intimacy you love that is not sexual?',
    'What do you want us to be able to laugh about when things get awkward?',
    'How would you like us to talk when our desire does not line up?',
    'What is a physical memory of us that makes you smile?',
    'What is a subtle sign that tells you I am in the mood?',
    'What would make talking about pleasure feel easier for both of us?',
    'What kind of aftercare or quiet time feels best to you?',
    'What is a turn-on that has more to do with trust than with looks?',
    'When would you prefer affection without any expectation of sex?',
    'What is a way we can keep curiosity alive while respecting a no?',
    'What should we ask each other before trying something unfamiliar?'
  ],
  serious: [
    'What part of our routine is working for you, and what part is wearing you out?',
    'When we disagree, what helps you feel we are still on the same team?',
    'What is one practical thing I could take off your plate this week?',
    'How do you want us to handle a day when both of us are overwhelmed?',
    'What topic have we been politely avoiding?',
    'What do you need from me when you are upset but not ready to talk?',
    'What is one money conversation we should have before it becomes urgent?',
    'What does a fair split of invisible work look like to you?',
    'What is a repair attempt from me that actually helps after an argument?',
    'How can I tell when you want advice versus company?',
    'What would make our plans feel less stressful to organize?',
    'What is a boundary with other people that would help us protect our time?',
    'What is a way I have supported you well that I should keep doing?',
    'What is something small I do that lands harder than I realize?',
    'How can we make difficult conversations feel safer to start?',
    'What do you want us to prioritize if a month gets very busy?',
    'What does an apology need to include for it to feel real to you?',
    'How should we notice when one of us is doing too much?',
    'What is a promise we can realistically keep to each other this season?',
    'When do you feel like we are making decisions together?',
    'What are we assuming the other person knows but have not actually said?',
    'What is one thing about our future you want more clarity on?',
    'How do we want to handle alone time without either person feeling rejected?',
    'What is a habit we should change before it grows into resentment?',
    'How can I show up better when you are dealing with family stress?',
    'What makes you feel respected during a disagreement?',
    'What is a check-in question we should ask each other more often?',
    'Which decision should we make together instead of letting it happen by default?',
    'What would a good reset look like after a rough week?',
    'What is one thing we could celebrate about how we handled a hard moment?'
  ]
};

export const QUESTIONS = Object.entries(GROUPS).flatMap(([category, prompts]) =>
  prompts.map(prompt => ({ category, prompt }))
);

const DAY_MS = 86400000;
function ordinal(day) {
  const millis = Date.parse(`${day}T00:00:00Z`);
  if (!Number.isFinite(millis) || new Date(millis).toISOString().slice(0,10) !== day) throw new Error('invalid question day');
  return Math.floor((millis - Date.parse(`${QUESTION_START_DAY}T00:00:00Z`)) / DAY_MS);
}

export function questionForDay(day) {
  const index = ordinal(day);
  if (index < 0 || index >= QUESTIONS.length) return null;
  // 37 is coprime to 150, so this permutation visits every prompt exactly once.
  const promptId = (index * 37 + 11) % QUESTIONS.length;
  return { promptId, ...QUESTIONS[promptId] };
}

export function questionClock(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: QUESTION_TIME_ZONE, year:'numeric',month:'2-digit',day:'2-digit',
    hour:'2-digit',minute:'2-digit',hourCycle:'h23'
  }).formatToParts(now).filter(part => part.type !== 'literal').map(part => [part.type,part.value]));
  const day = `${parts.year}-${parts.month}-${parts.day}`;
  return { day, open: Number(parts.hour) >= 8, hour:Number(parts.hour), minute:Number(parts.minute) };
}
