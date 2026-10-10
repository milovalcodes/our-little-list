# Our Little App

A small shared website for two people. Lists, timed asks, notes, statuses, date
ideas, memories, and an opt-in map — plain HTML, CSS and JavaScript on
GitHub Pages, with Firebase for syncing between the two phones.

Live: https://milovalcodes.github.io/our-little-list/

## What it does

Each thing lives in one place:

- **Home** — both people, due tasks/routines, focus, the pinned fridge note, folded Updates, quick add and search. Today is a compatibility route to Home.
- **The list** — tasks, groceries and weekday routines with independent daily completion and optional reminder offsets. Legacy requests still render as checklist rows.
- **Notes** — short notes, reactions and the option to pin one on both home screens.
- **Profiles** — Home name labels open profiles. A portrait with an optional alter-ego photo flips on one tap, opens the profile on a double tap, then flips back; without a photo, the Home portrait opens the profile. Your own profile owns status editing, location controls and a camera badge for photo upload/removal (pick, preview, then save; tap the camera again to change or remove); your partner's shows their status and shared location; notes stay in Notes. Photos are square, compressed JPEGs in the household-only `profilePhotos` collection, writable only by their owner. Reduced motion skips the spin. Saved spots stay in Settings.
- **Activities** — daily question, Little Word, Word Search and Mini crossword. The weekly tracker shows source-by-source points, daily details, historical recaps and the largest per-game winning margin. Crown pings deep-link to the correct week. The retired arcade is no longer loaded, linked or notified; its stored records and compatibility data methods remain intact.
- **Date ideas** — ideas with optional details, filters and a random picker; completed dates can become memories.
- **Memories** — photos and small things worth keeping.
- **Settings** — setup checks, names, notification categories, quiet hours, sound, vibration and sign-out.
  Quiet hours hold ordinary pings until morning; reminders still ring at their time, and arrivals come through silently. A focus session holds chatter five minutes at a time, so ending it early lets things through soon after.
- **Guide** — under More, an in-app walkthrough and a record of each new release.

The dock is Home / List / Activities / Notes / More.
A small **add** button beside the heading opens the full composer on List,
Date ideas and Memories. Home has quick add; Notes has its own writing bar.
Activities has no unrelated add controls.

All signed-in pages load the same foreground notification module. In Firebase
mode it listens to the recipient's outbox, rather than duplicating an incomplete
set of per-feature listeners. Future reminders wait for worker validation. A
service-worker push offers its message to the visible page; only a positive
display acknowledgement quiets and closes the system copy. Category, quiet-hour
and focus preferences apply before display. Exact same-page taps reuse the
notification router without reloading drafts. Local preview keeps mock feed
listeners; never use that mode to prove phone delivery.

Confirmed outbox saves wake `POST /dispatch` with the member's short-lived
Firebase ID token; completed puzzle/answer saves wake `/dispatch/activities`.
The Worker authorizes a bounded Firestore profile LIST under the existing
household rules (including when no profile exists), never by trusting a client
UID or a decoded token. Only the configured site origin is accepted, and the
request cannot supply a recipient, message, endpoint or send time. CORS is not
the auth boundary: Firebase rules are. No admin/send secret ships to the client.

App-shell upgrades must bypass the HTTP cache: install uses `Request` with
`cache: 'reload'`, and registration uses `updateViaCache: 'none'`. Otherwise a
new shell can precache old JavaScript despite reporting the new cache version.
`node test/update-freshness-browser.mjs` checks a real installed-app upgrade
with a warm one-hour HTTP cache; set `GAME_BROWSER=webkit` for WebKit too.
Do not replace this with a clean-context test or clear users' storage to update.

Immediate delivery skips scheduled housekeeping for ordinary actions. It and
the minute backstop share a CAS-protected lease, bounded busy retries, and the
same validation/filtering/send code. A tiny `deliveryLocks/sent-{outboxId}`
acceptance receipt prevents resending after failed queue cleanup. These receipts
contain only timestamps; retain them while a corresponding outbox row may exist.
Provider acceptance followed by a crash before saving a receipt is an ambiguous
network failure, so this is not a claim of distributed exactly-once delivery.
Stable notification tags and event IDs also prevent ordinary duplicate UI alerts.
Offline writes wake only after server acknowledgement; a failed wake leaves the
queue intact for the backstop. Scheduled reminders and daily openings still use
the minute checker. Normal action delivery targets seconds, not guaranteed time.

Every opted-in visible ping requests high Web Push
transport priority on Apple and Android; this does not bypass focus, quiet hours
or category choices. Logs separate queue wait from push-provider acceptance time,
alongside scheduling and total duration, without message bodies or endpoints.
Provider acceptance is not proof of phone display; locked-phone delivery must
also be checked on real devices. Missing subscriptions rotate out of the due queue; stale notes,
reactions, memories and routine nudges are checked before sending. Sign-out
removes only the current browser endpoint, with a Firestore transaction to
preserve a concurrent registration. Keep observability explicitly enabled in
Wrangler ([Cloudflare logging configuration](https://developers.cloudflare.com/workers/observability/logs/workers-logs/)).

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

Weekly points: 100/40/30/20/10 for winning on guesses 1–5; otherwise 0. Sunday hard words count double. Once both finish all three Sunday rounds, or Monday at 9 latest, the Worker settles the week. A tie opens a hard trio (one of each game), carrying cumulative points into each repeated set. Close only when secured points strictly exceed the opponent’s maximum final total. The word has no timeout; timed games have 120 seconds. New trio finals use format=trio and scoreVersion=2. Legacy word-only ties retain their original settlement path; old final scores display at 10× without rewriting history. Immutable wordWeeks records drive crown overlays and consecutive weekly streaks. New daily puzzles continue during a tie-break.

The game is friendly, not anti-cheat software: puzzle answers exist in the client-readable puzzle documents. Private guess rows are restricted by side. Like existing question scheduling, the Worker uses a household member credential rather than an admin key; this is not a public competitive ranking service.

### Word Search, crossword and the puzzle catalog

`weekly-report.js` reconciles game/day breakdowns with authoritative weekly finals. Tie timers are evaluated at `settledAt` so a timer expiring after an early clinch cannot invent more points. The first launch week’s tie IDs sort before the timed-game start date; they must still be included. Missing historic detail is disclosed instead of inventing a reason for the win. `weekly-tracker.js` loads only the selected week’s public summaries, never private guesses, and keeps expanded rows while scores update.

Both new boards have a 120-second server-stamped timer. Scores are `round(found / total * 50)`; hard Sunday/tie boards double that rounded score. An untouched or zero-word board earns zero. Confirmed partial results still count when the timer expires with the browser closed. A refresh cannot reset a start timestamp. Timed private routes can only be read by a partner after both rounds have ended. New games count from October 9, 2026; past days are not fabricated.

`puzzle-edition.js` activates catalog v3 for activity days starting October 10, 2026 (9 a.m. Eastern). It contains 429 curated five-letter entries and 512 original themed clue entries across 17 pools. Normal targets early high-school inference/vocabulary; hard targets introductory university concepts. These are editorial targets, not measured grade certifications. Word Search stays at 10 words on 11×11 normal / 12×12 hard grids, with all eight directions. Crosswords target 6 normal / 8 hard answers on the same compact sizes. Timers remain 120 seconds and scoring is unchanged. October selects Halloween/horror/fall, December Christmas/winter, other months regular pools. Legacy catalogs and seeds remain for pre-cutover regeneration; saved Firestore puzzles always win over generators. Never overwrite an existing puzzle. Individual timed clue words can recur in different boards. The accepted-guess dictionary remains broader than the answer bank. All clues are original, not extracted APK or commercial crossword data.

Difficulty references: [grades 9–10 language standards](https://www.thecorestandards.org/ELA-Literacy/L/9-10/) and introductory [OpenStax Biology terminology](https://openstax.org/books/biology-2e/pages/45-key-terms). These guide scope, not a claim of educational calibration. Run `test/puzzle-edition.test.mjs`, seasonal and daily puzzle tests before changing the catalog. Deployment must update the Cloudflare scheduler as well as Pages; the database schema is unchanged.

`timedGames` contains owner-private word order/times; `timedResults` contains only shared counts and timestamps. Transactions write both. `activityEvents` deduplicates completion/reveal notifications. Daily activities share one 9 a.m. opening ping. All daily-game pings use the daily-activities preference and stale waiting pings are dropped. The weekly trio maximum is 1,600, plus at most 400 per hard tie set. Closed sets reject further moves. Run `test/timed-rules.test.mjs` only under the demo Firestore emulator, and `test/timed-browser.mjs` on the local test server; real-time two-account coverage lives in `test/word-realtime-browser.mjs`.

### Memory categories and dates

`memory-catalog.js` derives one crown memory per authoritative `wordWeeks` record, like the existing archived-question view. No duplicate collection or backfill is needed: previous wins appear immediately and survive reloads. Crown dates use `settledAt`; unknown old dates are shown as a week. Manual memories store an optional `memoryDate` civil date while retaining `createdAt` for sync/audit. Both profiles sort by the chosen event date. Questions, crown results and completed-date entries are App memories; authored text/photos are Your memories. Direct links select the appropriate category. No archived partner answer is copied into a public memory.

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

The retired arcade's `games/sun-moon`, `games/connect-four` and `games/dots-boxes`
records are retained. The compatibility data methods and rules remain tested,
but the old UI module is removed and the Worker drops all old arcade pings.
Their old links lead to daily Activities. No private game history is deleted.

The app-wide regression pass also covers edited daily answers, delayed daily-game
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

### Home, attention badges and practice

Home owns today's tasks, focus and the folded updates feed. `today.html` is a
compatibility redirect that preserves anchors; do not build another dashboard
there. Notes live in Notes, not profiles or the Home feed. A transient incoming
note banner is not a read receipt.

`navigation-attention.js` owns destination badges and the installed app badge.
Seasonal shapes are only styling for real unread or unfinished work, never
permanent decoration on every navigation icon.

Practice has 200 Little Words, 100 Word Searches and 100 crosswords. Progress is
local to the browser, household and side; it never writes competitive records,
points or notifications. The v2 practice edition replaces all boards, with normal
and hard halves and answers separate from the active daily bank. v1 saves are left
intact in their old namespace, not carried onto different answers. Keep v2 order and seeds stable so saved
boards remain valid. A layout-changing catalog needs a new storage version.
Practice clues are original. The MIT-attributed extra dictionary expands
accepted guesses only, not daily answers (`WORD-LIST-LICENSE.txt`).

Run `test/practice.test.mjs`, `test/practice-browser.mjs` and
`test/declutter-browser.mjs` alongside the full regression suite.

### Shared routines and reminders

Routines are task records with `routineDays` (Sunday=0). Each day's completion lives in `routineChecks/{itemId}_{YYYY-MM-DD}`; never reset the shared item with a timer or reuse yesterday's completion document. The shared day resets at midnight America/New_York, while activities still reset at 9 a.m. Eastern. Home, Today and the list subscribe only to the current day's checks.

The worker queries only items with a reminder time. It atomically creates an event marker and notifications for each selected offset. Before delivery it rechecks the schedule, recipient, completion and deletion. Existing asks retain their original records and scheduled pings but render as checklist rows. Deploy the additive Firestore rules, then the worker, then Pages.

`test/routines.test.mjs` checks clocks/DST, scheduling and dedupe. `test/routines-browser.mjs` covers the UI and daily resets; `test/routines-realtime-browser.mjs` uses two authenticated demo-emulator phones and the real Firebase SDK. Run the regular browser and seasonal visual suites as well. The new recovery and cache-lifetime tests cover slow snapshots, interrupted drags, photo failures and service-worker persistence. Physical push delivery and GPS still need a phone check.

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

`test/word-celebration-browser.mjs` checks all finish tiers, one-time coronations, deferred prompts while typing, 320px animation frames, seasonal portraits and reduced motion. Effects live outside the board: do not put repeating reveal animations on guessed tiles.

“Peek their process” reads one partner board on demand only after both players finish that puzzle (winning or using all five guesses). Firestore independently checks both private game documents; `wordGames` collection queries remain owner-only. Keep these checks when changing the UI. `test/word-peek-browser.mjs` covers loading/error retry and the reveal UI; `test/word-rules.test.mjs` and `test/word-realtime-browser.mjs` cover the actual permissions and two-phone unlock. Deploy rules before the frontend for changes to this boundary.
