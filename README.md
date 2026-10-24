# Our Little App

A small shared website for two people. Lists, timed asks, notes, statuses, date
ideas, memories, and an opt-in map — plain HTML, CSS and JavaScript on
GitHub Pages, with Firebase for syncing between the two phones.

Live: https://milovalcodes.github.io/our-little-list/

## v141 maintenance note

Daily games are retired. Use `pnpm run test:activities`, `pnpm run test:browser:activities`, `pnpm run test:rules`, and the selected shared notification/offline checks.

## What it does

Each thing lives in one place:

- **Home** — both people, due tasks/routines, focus, the pinned fridge note, folded Updates, quick add and search. Today is a compatibility route to Home.
- **The list** — tasks, groceries and weekday routines with independent daily completion and optional reminder offsets. Legacy requests still render as checklist rows.
- **Notes** — short notes, reactions and the option to pin one on both home screens.
- **Profiles** — Home name labels open profiles. A portrait with an optional alter-ego photo flips on one tap, opens the profile on a double tap, then flips back; without a photo, the Home portrait opens the profile. Your own profile owns status editing, location controls and a camera badge for photo upload/removal (pick, preview, then save; tap the camera again to change or remove); your partner's shows their status and shared location; notes stay in Notes. Photos are square, compressed JPEGs in the household-only `profilePhotos` collection, writable only by their owner. Reduced motion skips the spin. Saved spots stay in Settings.
- **Activities** — one daily question at 9 a.m. Eastern and read-only recorded weekly wins. Answers remain private until both people answer. Daily/practice games, new settlements, game notifications and competition-to-pet rewards are retired. See [backup and restoration](docs/daily-games-restore.md).
- **Date ideas** — ideas with optional details, filters and a random picker; completed dates can become memories.
- **Memories** — photos and small things worth keeping.
- **Settings** — setup checks, names, notification categories, quiet hours, sound, vibration and sign-out.
  Quiet hours hold ordinary pings until morning; reminders still ring at their time, and arrivals come through silently. A focus session holds chatter five minutes at a time, so ending it early lets things through soon after.
- **Guide** — under More, an in-app walkthrough and a record of each new release.

The dock is Home / List / Activities / Notes / More.
A small **add** button beside the heading opens the full composer on List,
Date ideas and Memories. Home has quick add; Notes has its own writing bar.
Activities has no unrelated add controls.

## Isolated manual QA

The v126 game pass adds a shared result reveal and one reaction per player,
game and puzzle revision. `gameReactions` only accepts the four supported emoji
from the authenticated owner once both current rounds have ended. Deploy its
Firestore rules before publishing the v126 site. Reactions do not alter scores
or create pings. Resetting a puzzle isolates its previous reactions and reveal.
Timed starts also read the other timed game in the same Firebase transaction;
the second competing start returns the running round's remaining time. Closing
a card still never pauses a scored clock.

Little Star's build publishes content-hashed WebP files in `little-star/art/`.
Its smaller HTML is precached with the shell; artwork is cached on first use
and retained across shell upgrades. The standalone source demo still embeds
its artwork. Publish the generated art directory with the HTML, and retain old
hashes so already-open game pages can finish loading. Never edit generated
Little Star output directly.

`node tools/qa-preview.mjs` serves the ordinary app at `http://127.0.0.1:8879/him.html?as=him` with local-only storage and an empty Firebase configuration. A second tab using `?as=her` checks the other side without touching live accounts. No service worker is installed on this QA origin. For Little Star, use `node tools/star-preview.mjs` as documented in `little-star/README.md`; it runs the real game adapter against disposable RAM state. The release builder also copies the actual UI restore function into a generated CI fixture so clock-only sync, stale replies and active-game protection can be tested without duplicating its logic.

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

## Daily questions and win history

Activities contains only the daily question and read-only saved wins. Questions open at 9 a.m. America/New_York; answers remain separate protected documents until both participants answer, then remain accessible through Memories. One deduplicated morning notification uses `question-open`; answer and reveal events retain their existing recipient logic and settings.

`win-history.js` reads final `wordWeeks` records, normalizes older score units through `win-records.js`, and keeps historical crown-memory deep links working. No new winner is inferred for an unfinished week. All gameplay mutations, content catalogs, practice boards, resets, new weekly settlement, reward imports and game reminders are retired. The service-worker update discards old game assets. Old game bookmarks and notifications lead to the question.

Existing database documents, question event markers, pet wallets, reward ledgers and notification registrations are preserved. [Restoration instructions](docs/daily-games-restore.md) identify the source ZIP, Git bundle, baseline tag and deployment order.

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

Choose the scope with `scripts/check-scope.mjs`; shared backend changes need broader regression coverage. `pnpm test` checks the common application and delivery logic. `pnpm run test:activities` checks daily questions, history, retirement and offline contracts. `pnpm run test:browser:activities` checks cache upgrades and both themes in Chromium/WebKit at phone and desktop widths. `pnpm run test:rules` runs the local emulator tests for immutable archives, old-client rejection and question privacy; it requires Java 21. Never run fixtures against production.

Browser suites use an isolated local preview at port 8777 with Firebase config replaced by an empty test config. `pnpm run test:browser` exercises shared flows. Little Star and retired puzzle test suites are stopped; their source remains in the backup. The standalone shared-interface and dock tests remain `test/interface-design-browser.mjs` and `test/dock-scroll-browser.mjs`.

## Notes

Home no longer subscribes to game results or prompts play. Navigation attention counts the unanswered question only. Settings offers daily questions and no game-turn/streak toggles. Shared App feel settings retain sound, volume, haptics and motion; puzzle-only typing and tile-color controls are removed. The Activities dock uses a heart.

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
