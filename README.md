# Our Little List

A small shared website for two people. Lists, timed asks, notes, statuses, date
ideas, memories, and an opt-in map — plain HTML, CSS and JavaScript on
GitHub Pages, with Firebase for syncing between the two phones.

Live: https://milovalcodes.github.io/our-little-list/

## What it does

Each thing lives in one place:

- **Home** — both people at a glance, the pinned fridge note, quick add and search.
- **Today** — due items, a focus timer and the latest activity.
- **The list** — repeatable tasks, groceries by aisle and requests; a timed request is also a reminder, for either person or yourself.
- **Notes** — short notes, reactions and the option to pin one on both home screens.
- **Profiles** — either Home avatar opens the same profile layout. Your own profile owns status editing and location controls; your partner's shows their status, recent notes and shared actions. Saved spots stay in Settings.
- **Activities** — daily question + Little Word, then the anytime games on `activities.html`, with Three to Move, Four in a Row and Dots & Boxes. Each keeps a shared live board and its own score. First to three rounds wins a match; match wins persist. Confirmed transactions and rules protect turns and scores, and create the turn ping atomically. Old pings are dropped by the delivery worker.
- **Date ideas** — ideas with optional details, filters and a random picker; completed dates can become memories.
- **Memories** — photos and small things worth keeping.
- **Settings** — setup checks, names, notification categories, quiet hours, sound, vibration and sign-out.
  Quiet hours hold ordinary pings until morning; reminders still ring at their time, and arrivals come through silently. A focus session holds chatter five minutes at a time, so ending it early lets things through soon after.
- **Guide** — under More, an in-app walkthrough and a record of each new release.

The dock is Home / List / Activities / Today / More. Notes is first in More.
A small **add** button beside the heading opens the full composer on List,
Date ideas and Memories. Home has quick add; Notes has its own writing bar.
Activities and Today have no unrelated add controls.

Deletes have a short undo window. The site can be installed on iPhone or Android and read offline. Websites cannot track location while closed.

Old links still work: `reminders.html`, `activity.html`, `notifications.html`,
`help.html`, `admire.html`, `location.html` and `profiles.html` are no longer
pages. `old-links.js` maps each to where it lives now; GitHub Pages' `404.html`
and the service worker both use it, so old bookmarks and queued notifications
still land in the right place. Old `today.html#game…` links forward to
`activities.html` with their game, round and viewer query intact.

## Reminders, and how they reach a closed phone

GitHub Pages only serves files — it cannot run anything on a schedule. So
delivery works like this:

1. The website writes the notification into an `outbox` collection in Firestore,
   with a `sendAt` timestamp. An ask for Friday at 3pm sits there until then. It
   carries a reference to its ask, and is dropped if that ask is deleted,
   sorted or turned down first.
2. A Cloudflare Worker (`worker/`) runs every minute, signs in as one member,
   claims a short delivery lock, and sends anything due as one Web Push message.
3. The service worker receives it and shows the notification, whether or not the
   site is open.

Free on Cloudflare's free plan, no credit card, no Firebase Blaze plan.

The old GitHub Actions cron delivered hours late, so `.github/workflows/deliver.yml`
is manual-only. Its launcher calls the same delivery function as Cloudflare;
there is no second notification implementation to drift or double-send.

Things to know:
- **On iPhone, notifications only work once the site is on the Home Screen.**
  That is an Apple rule, not something the site can route around. The phone
  checker says so and walks through it.

## Daily activities

The delivery Worker opens one question at **9 a.m. America/New_York time**
each day alongside a five-letter word and queues one combined opening ping per person. After the first answer, it
pings the person who has not answered; after both answer, it pings the first person to answer to
compare. Those event markers are written atomically with their outbox records,
so a retry cannot duplicate the pings. Quiet hours and each phone's question
notification switch still apply. A push needs an active subscription on that
phone; without one it waits in the outbox until the phone registers again.

Each answer is stored in its own Firestore document. The shared question has
only answered-at markers. Security rules let either person read their own words,
but the other person's words become readable only after **both** markers exist.
Edits are available during the current day. Past answered questions appear as virtual memories backed by the original protected answer documents; there is no shared plaintext archive. The 150 prompts are selected in a fixed,
non-repeating order; after all 150 days the app asks for a new batch rather than
silently repeating an old question. This batch begins October 2, 2026.

The prompts are original wording inspired by [Gottman's Love Maps](https://www.gottman.com/product/love-map-cards-for-couples/)
and [relationship-building questions](https://info.gottman.com/blog/20-relationship-building-questions-for-couples?hs_amp=true),
with intimate prompts framed around [consent](https://www.plannedparenthood.org/learn/relationships/sexual-consent/how-do-i-talk-about-consent)
and [talking about sex](https://www.plannedparenthood.org/learn/sex-pleasure-and-sexual-dysfunction/sex-and-pleasure/how-do-i-talk-my-partner-about-sex).

### Little Word
Five guesses, server-confirmed transactions, private per-person guess rows and shared count/result summaries. Daily words run 9 a.m. to 9 a.m. Eastern, including DST. The larger accepted-guess dictionary is [dwyl/english-words](https://github.com/dwyl/english-words), pinned in word-lexicon.js under the Unlicense (WORD-DICTIONARY-LICENSE.txt). The two answer banks are hand-picked separately.

Weekly points: 10/4/3/2/1 for winning on guesses 1–5; otherwise 0. Sunday hard words count double. Once both finish Sunday, or Monday at 9 latest, the Worker settles the week. A tie opens a shared hard-word duel, repeating until one result is mathematically unbeatable. Duel rounds have no timeout and do not change the weekly total. Immutable wordWeeks records drive crown overlays and consecutive weekly streaks. New daily puzzles continue during a tie-break.

The game is friendly, not anti-cheat software: puzzle answers exist in the client-readable puzzle documents. Private guess rows are restricted by side. Like existing question scheduling, the Worker uses a household member credential rather than an admin key; this is not a public competitive ranking service.

## One-time setup

### 1. Firebase

Enable **Email/Password** in Firebase Authentication and create **one account per
person**. Each of you signs in with your own password, on any device, and Firebase
remembers it — there are no PINs. Which side you see is decided by the account you
signed in with, not by a URL you could retype.

Put the web app config in `firebase-config.js` (those values are public by design —
the rules are what protect the data), then fill in `household.js`:

```js
export const HOUSEHOLD_ID = '<the uid the data already lives under>';
export const MEMBERS = {
  '<her uid>': 'her',
  '<his uid>': 'him'
};
```

`HOUSEHOLD_ID` is a **fixed path**, not whoever is signed in. That is the whole
trick: two accounts, one shared household, and no data migration — it stays
exactly where it already was.

Deploy `firestore.rules` with `pnpm exec firebase deploy --only firestore:rules`,
or paste it into the Firebase console. Both people can read the shared space,
while only the matching account can write its own status, presence, location
and notification subscription. The Checks workflow fails if `household.js` and
`firestore.rules` ever disagree.

Everything lives under `households/{HOUSEHOLD_ID}` — lists, notes, requests,
statuses, dates, help requests, locations, push subscriptions and the outbox.

### 2. The delivery worker

The public values are already filled in in `worker/wrangler.toml`. From the repo root:

```
pnpm install
pnpm --dir worker exec wrangler login
pnpm --dir worker exec wrangler secret put LITTLE_EMAIL
pnpm --dir worker exec wrangler secret put LITTLE_PASSWORD
pnpm --dir worker exec wrangler secret put VAPID_PRIVATE_KEY
pnpm --dir worker exec wrangler deploy
```

Watch it with `pnpm --dir worker exec wrangler tail`, or read **Observability → Logs** in the
dashboard. A quiet minute logs `{"checked":true,"sent":0,"subscribed":2}`.

Logging is declared in `wrangler.toml`, not just toggled in the dashboard —
`wrangler deploy` overwrites anything the file does not mention, so a toggle set
by hand only survives until the next push.

Optionally set `RUN_SECRET`, which enables `POST /run` on the worker URL to
force a pass while testing. Send it as `Authorization: Bearer …` so the secret
does not end up in URLs or request logs.

The same secrets still exist as **repository secrets** for the manual GitHub
backstop; they are independent copies.

To roll the keys later: `npx web-push generate-vapid-keys`, put the public half
in `push-config.js`, the private half in the secret. Both phones re-register on
their next visit.

### 3. Both phones

Open the site, sign in with **your own** account, add it to the Home Screen, then
open **More → Settings** and allow notifications and location. The front door sends
you to your side automatically. That page reports
whether the phone is actually registered for background nudges, rather than just
whether permission was granted.

## Making small changes

1. Run `pnpm install` once, then edit the files. Shared diary colors, spacing,
   cards and controls are in `diary.css`; keep feature behavior in its existing
   page files.
2. Update the relevant Tutorial topic in `guide.html` when behavior changes or
   a function is added. Add an Added/Changed/Fixed entry under Patch notes for
   this release. The guide is part of the update, not an optional follow-up.
3. Bump `CACHE` in `service-worker.js` whenever a cached file changes and match
   that number in `guide.html`'s `data-guide-version` and newest `data-release`.
   `test/guide-contract.test.mjs` checks this in CI. Do not
   cache-bust with `?v=2` instead: the worker precaches the bare path, so a
   query string means that file is never served from the cache at all.
4. Commit and push `main`. GitHub Pages publishes it; open copies pick up the new
   service worker and reload themselves.

## Checking your work

The Activities shelf shares one delivery/transaction layer. The original
`games/sun-moon` board and scores are retained; `games/connect-four` and
`games/dots-boxes` are independent. `arcade-game.js` contains original classic
game implementations, not extracted APK code or assets. The supplied JindoBlu
app was used only to identify suitable games. Separate-phone play is turn-based;
no frame-by-frame Firestore writes or real-time arcade physics are involved.
Game pings include the board ID, and bonus box turns don't notify the opponent
until control passes (or the round ends). The rules recheck each move and score.

The app-wide regression pass also covers edited daily answers, delayed game
acknowledgements, read receipts in background tabs, location pause/consent races,
photo-selection races, and completing one date from both phones. Date completion
and its memory use one online transaction; no partially saved pair or duplicate
memory. Monthly repeats keep `recurrenceDay` through short months using the same
helper on List, Home and Today. Changing the due day resets that anchor.

```
pnpm test                             # syntax, data, push, dedupe and delivery
pnpm exec firebase emulators:exec --project demo-little-list --only firestore --config firebase.test.json "node test/game-rules.test.mjs"  # Java 21, no live data
```

And the browser pass, which loads every page at phone size, clicks through the
real flows and fails on any script error or sideways scroll:

```
pnpm exec playwright install chromium
python3 -m http.server 8777     # browser tests intercept Firebase; leave the production config alone
pnpm run test:browser
pnpm run test:visual     # screenshots both sides in your temp folder, checks 390px and 320px
```

`.github/workflows/checks.yml` runs the unit and browser passes, plus static
checks: every precached file exists, local assets do not use cache-breaking
query strings, and `household.js` and `firestore.rules` list the same accounts.

## Notes

- Do not put private keys, service-account files or push secrets in the files
  served by Pages. The Firebase web config is the one exception — it is meant to
  be public.
- There are no side codes. They were per-device, could not sync, and with a
  shared login they were never a real boundary — your account password is the
  gate now.
- Background location is not possible from a website on either platform. The map
  updates while the page is open; a native app would be needed for Life360-style
  tracking. The Android build is paused — the website is the shared source of
  truth on both phones.

### Daily-word regression checks

`test/word-colors-browser.mjs` covers both profiles and all three seasonal palettes, including dark absent letters, repeated-letter precedence and no animation replay when typing. `test/activities-browser.mjs` covers late confirmations and partial historic score records. `test/word-rules.test.mjs` validates private guesses, atomic results and immutable bounded weekly scores against the demo emulator.

The optional `GAME_BROWSER=webkit` word real-time test forwards unary demo-emulator HTTP calls through Playwright's transport because Windows WebKit can fail to rewind a POST after a localhost connection reset. It retains the real Firebase SDK, responses, permissions and live Listen channels; no production traffic or app settings are changed. This is not a physical iPhone push test.
