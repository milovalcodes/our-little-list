# Our Little List

A small shared website for two people. Lists, timed asks, notes, statuses, date
ideas, memories, and an opt-in map — plain HTML, CSS and JavaScript on
GitHub Pages, with Firebase for syncing between the two phones.

Live: https://milovalcodes.github.io/our-little-list/

## What it does

Each thing lives in one place:

- **Home** — both people at a glance, the pinned fridge note, quick add and search.
- **Today** — due items, one question of the day, a focus timer, Sun vs Moon and the latest activity.
- **The list** — repeatable tasks, groceries by aisle and requests; a timed request is also a reminder, for either person or yourself.
- **Notes** — short notes, reactions and the option to pin one on both home screens.
- **Profiles** — either Home avatar opens the same profile layout. Your own profile owns status editing and location controls; your partner's shows their status, recent notes and shared actions. Saved spots stay in Settings.
- **Sun vs Moon** — one shared asynchronous board in Today. Place three pieces each, then shift a piece to an empty square to make three in a row. First to three rounds wins a match; match wins persist. Confirmed transactions and rules protect turns and scores, and create the turn ping atomically. Old pings are dropped by the delivery worker.
- **Date ideas** — ideas with optional details, filters and a random picker; completed dates can become memories.
- **Memories** — photos and small things worth keeping.
- **Settings** — setup checks, names, notification categories, quiet hours, sound, vibration and sign-out.
  Quiet hours hold ordinary pings until morning; reminders still ring at their time, and arrivals come through silently. A focus session holds chatter five minutes at a time, so ending it early lets things through soon after.
- **Guide** — under More, an in-app walkthrough and a record of each new release.

The bottom **add** button opens the current page's full composer on List,
Notes, Date ideas, and Memories. Elsewhere it opens the quick chooser.

Deletes have a short undo window. The site can be installed on iPhone or Android and read offline. Websites cannot track location while closed.

Old links still work: `reminders.html`, `activity.html`, `notifications.html`,
`help.html`, `admire.html`, `location.html` and `profiles.html` are no longer
pages. `old-links.js` maps each to where it lives now; GitHub Pages' `404.html`
and the service worker both use it, so old bookmarks and queued notifications
still land in the right place.

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

## Question of the day

The delivery Worker opens one question at **8 a.m. America/New_York time**
each day and queues one opening ping per person. After the first answer, it
pings the person who has not answered; after both answer, it pings both to
compare. Those event markers are written atomically with their outbox records,
so a retry cannot duplicate the pings. Quiet hours and each phone's question
notification switch still apply. A push needs an active subscription on that
phone; without one it waits in the outbox until the phone registers again.

Each answer is stored in its own Firestore document. The shared question has
only answered-at markers. Security rules let either person read their own words,
but the other person's words become readable only after **both** markers exist.
Edits to your answer remain possible. The 150 prompts are selected in a fixed,
non-repeating order; after all 150 days the app asks for a new batch rather than
silently repeating an old question. This batch begins October 2, 2026.

The prompts are original wording inspired by [Gottman's Love Maps](https://www.gottman.com/product/love-map-cards-for-couples/)
and [relationship-building questions](https://info.gottman.com/blog/20-relationship-building-questions-for-couples?hs_amp=true),
with intimate prompts framed around [consent](https://www.plannedparenthood.org/learn/relationships/sexual-consent/how-do-i-talk-about-consent)
and [talking about sex](https://www.plannedparenthood.org/learn/sex-pleasure-and-sexual-dysfunction/sex-and-pleasure/how-do-i-talk-my-partner-about-sex).

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
open **Settings** (⚙︎ top-left on home) and allow notifications and location. The front door sends
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
