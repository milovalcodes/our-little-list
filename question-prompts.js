// Original prompts written for the two of us, in the spirit of couple
// board games, “would you rather” rounds, the well-known closeness
// questionnaires and love-map quizzes. None are copied from a deck or a test.
// One shared America/New_York day, opening at 09:00. A bank never cycles:
// when it is exhausted, we add new prompts rather than quietly repeating old ones.
//
// A question record stores only a promptId, so each bank keeps its order
// forever. Days before NEW_BANK_DAY read the first (legacy) bank; from then on
// the couple bank below is used. Each bank holds exactly 150 prompts, which is
// what firestore.rules allows for promptId and keeps the 37-step shuffle whole.
import { activityClock, ACTIVITY_TIME_ZONE } from './activity-clock.js';
export const QUESTION_TIME_ZONE = ACTIVITY_TIME_ZONE;
export const QUESTION_START_DAY = '2026-10-02';
export const NEW_BANK_DAY = '2026-10-07';

const LEGACY_GROUPS = {
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

const GROUPS = {
  game: [
    "Would you rather have a weekend with zero plans, or one packed with surprises I planned?",
    "Which of us would survive longer on a deserted island, and what is your evidence?",
    "Rate my cooking out of 10, honestly, and name the dish that earned the score.",
    "Which of us is more likely to cry at a commercial? Defend your answer.",
    "Would you rather relive our first date or skip ahead to a trip we have not taken yet?",
    "What is my most predictable reaction to something? Do your best impression in words.",
    "If we were on a couples game show, which round would we lose first?",
    "Guess my answer: what is my comfort meal after a bad day?",
    "Would you rather read my mind for one day, or have me read yours?",
    "Which three emojis describe me best, and why those?",
    "Which of us is the bigger kid on a birthday, honestly?",
    "Finish the sentence: “You know you are dating me when…”",
    "Would you rather we take a cooking class or a dance class together?",
    "What is one thing I do that deserves an award? Name the award.",
    "Guess my answer: which famous person would I most want to have dinner with?",
    "Which of us would get us lost first on a road trip with no phones?",
    "Would you rather spend a whole day with me in silence, or a whole day talking nonstop?",
    "If our relationship were a board game, how would you win?",
    "What is the pettiest thing we have ever argued about, and who was right?",
    "Guess my answer: what is the first thing I would buy if we won the lottery?",
    "Would you rather get a love letter or a surprise playlist from me?",
    "Which of my habits would you borrow for a week if you could?",
    "Two truths and a lie about your childhood. I will guess tonight.",
    "Who is more likely to say “I’m fine” when they are not, and what gives it away?",
    "Big spoon or little spoon forever? You only get one.",
    "Which movie couple are we most like, and which one do we wish we were?",
    "Guess my answer: which chore do I secretly not mind doing?",
    "What is a word or phrase I say way too often?",
    "If our relationship had a weather forecast today, what would it say?",
    "Hot seat: you get one question tonight that I have to answer honestly. What is it?"
  ],
  deep: [
    "When did you first realize you were really falling for me?",
    "What did you believe about love before us that you no longer believe?",
    "What part of your childhood still shows up in how you love me?",
    "When do you feel most understood by me?",
    "What is a fear you rarely say out loud?",
    "What are you proud of that you do not get to talk about enough?",
    "What does feeling safe with someone look like for you?",
    "Which moment with me would you replay if you could?",
    "What do you need more of from me but have not asked for?",
    "What part of yourself are you still learning to accept?",
    "Who taught you the most about loyalty, and how?",
    "What do you think I worry about most? Do you think you are right?",
    "What would you want me to always remember about you?",
    "When was the last time you felt lonely, even with people around?",
    "What is a dream you let go of, and do you miss it?",
    "What are we each better at because we are together?",
    "What is a hard thing you went through that I do not know the whole story of?",
    "How do you most like to be comforted when you are sad?",
    "What is something about me you only understood once we got close?",
    "What does home mean to you now?",
    "If your younger self met me, what would they think?",
    "Which of your values matters most to you right now, and why?",
    "Is there something small you would like to be forgiven for?",
    "What makes you feel most loved: words, touch, time, help, or gifts? Give a recent example.",
    "What is a question you have always wanted me to ask you?",
    "What do you admire about how I handle hard days?",
    "Which of my beliefs have you come to share?",
    "What moment made you trust me completely?",
    "What do you wish people understood about you at first glance?",
    "What is one thing you would like us to be braver about?"
  ],
  spicy: [
    "What is something I do that turns you on without me even trying?",
    "Describe your perfect slow night in with me, start to finish.",
    "Which kiss of ours do you still think about?",
    "Where is somewhere unexpected you have wanted to kiss me?",
    "What do you find most attractive about me when I am not trying?",
    "Morning, afternoon, or late night: when are you most in the mood?",
    "What is one fantasy you would be open to telling me about in person?",
    "Which outfit of mine drives you a little crazy?",
    "What is something new you would like us to try in the bedroom?",
    "How do you like to be seduced: slow and teasing, or straight to the point?",
    "Which touch of mine relaxes you instantly?",
    "What is your favorite thing to hear me whisper?",
    "What is the sexiest memory we share that still makes you smile?",
    "What would a whole day devoted to each other’s pleasure look like?",
    "What is a boundary that helps you relax and enjoy being close?",
    "Lights on or lights off, and why?",
    "What compliment about your body would you love to hear more often?",
    "If you planned how our next date night ends, how would it go?",
    "What one word describes how you want to feel when we are intimate?",
    "Where would you love to get away to just for romance?",
    "What makes you feel most confident and desired?",
    "What could be our secret signal for “I want you tonight”?",
    "Massage, bath, or slow dancing in the kitchen: which is the best warm-up?",
    "What is something you have been shy to ask for?",
    "What did you notice first about me physically?",
    "Which song belongs on a playlist just for the two of us, alone?",
    "What makes a kiss unforgettable to you?",
    "How has our intimacy changed since we met, and what do you love about it now?",
    "Teasing over text: yes or no? Give me a sample.",
    "What is one way I could make you feel wanted today?"
  ],
  memories: [
    "What is the first thing you remember thinking about me?",
    "What is the funniest moment we have had that nobody else would get?",
    "Which outing or trip of ours would you take again tomorrow?",
    "Which meal we shared do you still remember, and why?",
    "What did you tell your friends about me early on?",
    "What small moment from this year do you never want to forget?",
    "When did you feel most proud of us as a team?",
    "Pick a photo of us you love. What was happening just outside the frame?",
    "What is the best gift I have given you, and why did it land?",
    "Which argument of ours ended up making us stronger?",
    "When did I surprise you the most?",
    "Which song will always remind you of us?",
    "Which place feels like it belongs to us?",
    "What is the most romantic thing I have done without realizing it?",
    "Which of our firsts do you remember most clearly?",
    "When did I take care of you in a way you still think about?",
    "When have we laughed the hardest together?",
    "Which holiday or birthday together stands out for you?",
    "What did we used to do a lot that we should bring back?",
    "Which mistake of ours do we laugh about now?",
    "When did you know for sure I had your back?",
    "What did our first real conversation feel like to you?",
    "Which inside joke of ours is your favorite, and how did it start?",
    "If you could say hi to us from one moment in the past, which moment?",
    "When were we completely lost, on a map or otherwise?",
    "When did we first start to feel like a real team at home?",
    "Which little habit of mine did you notice early and still love?",
    "Which night out of ours gets a perfect 10?",
    "When did we do something brave together?",
    "Which memory of us would you put in a museum?"
  ],
  future: [
    "Where do you picture us living in ten years? Be specific.",
    "What adventure do you want us to check off next year?",
    "What kind of old couple do you think we will be?",
    "Which tradition do you want us to start and keep forever?",
    "If money did not matter, how would we spend an ordinary Tuesday?",
    "What do you want to learn before your next big birthday?",
    "What should our home feel like when people walk in?",
    "Which goal do you want me to cheer you on for this year?",
    "Which country should we visit together first, and why?",
    "What does a perfect anniversary look like five years from now?",
    "What is something you want us to save up for?",
    "How should we celebrate wins, big or small?",
    "What would you want our weekends to look like when life slows down?",
    "What is one thing you would like us to stop doing in the next year?",
    "Which skill should we learn as a couple?",
    "If we started a bucket list tonight, what is the first line?",
    "What would make next year better than this one for us?",
    "What promise would you like to make me for the coming year?",
    "Where do you want to watch a sunrise together someday?",
    "How do you hope we handle getting older together?",
    "Which dream of mine do you want to help make happen?",
    "What kind of hosts do you want us to be?",
    "Which place that mattered to you do you want to show me?",
    "What do you hope people say about us as a couple?",
    "What small luxury do you want in our future life?",
    "How do you want us to spend our time once we stop working?",
    "What challenge do you think we are ready for now?",
    "If we made new promises to each other someday, what would you add?",
    "What is one way you want us to give back together?",
    "What are you most looking forward to with me this month?"
  ]
};

export const LEGACY_QUESTIONS = Object.entries(LEGACY_GROUPS).flatMap(([category, prompts]) =>
  prompts.map(prompt => ({ category, prompt }))
);

export const QUESTIONS = Object.entries(GROUPS).flatMap(([category, prompts]) =>
  prompts.map(prompt => ({ category, prompt }))
);

const DAY_MS = 86400000;
function ordinal(day) {
  const millis = Date.parse(`${day}T00:00:00Z`);
  if (!Number.isFinite(millis) || new Date(millis).toISOString().slice(0,10) !== day) throw new Error('invalid question day');
  return Math.floor((millis - Date.parse(`${QUESTION_START_DAY}T00:00:00Z`)) / DAY_MS);
}

function bankFor(day) {
  return day < NEW_BANK_DAY ? LEGACY_QUESTIONS : QUESTIONS;
}

export function questionForDay(day) {
  const legacy = day < NEW_BANK_DAY;
  const bank = bankFor(day);
  const index = ordinal(day) - (legacy ? 0 : ordinal(NEW_BANK_DAY));
  if (index < 0 || index >= bank.length) return null;
  // 37 is coprime to 150, so this permutation visits every prompt exactly once.
  const promptId = (index * 37 + 11) % bank.length;
  return { promptId, ...bank[promptId] };
}

// The words for a stored question, from the bank that day used.
export function promptFor(day, promptId) {
  return bankFor(day)[promptId]?.prompt || '';
}

export function questionPhase(clock) {
  if (clock.day < QUESTION_START_DAY) return 'upcoming';
  if (!questionForDay(clock.day)) return 'exhausted';
  return clock.open ? 'open' : 'waiting';
}

export function questionClock(now = new Date()) { return activityClock(now); }
