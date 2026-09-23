# Our Little List

A small shared website for two people. Lists, reminders, notes, statuses, date
ideas, small favours, and an opt-in map — plain HTML, CSS and JavaScript on
GitHub Pages, with Firebase for syncing between the two phones.

Live: https://milovalcodes.github.io/our-little-list/

## What it does

- Two themed sides, sun and moon, with a shared middle
- A compact Today page for due stuff, quick focus sessions and dumping a thought
- A shared list with recurring chores, plus a grocery list grouped by aisle
- Reminders that actually arrive — see **Reminders** below
- Tiny notes with live popups, reactions and a twinkle
- **Help me out** — quick asks like "bring water" or "call me when free", with
  on it / in a bit / can't right now answers
- Discord-style statuses, energy levels and arrival presets
- A shared date-idea pile with favourites, mood filters, a random picker and a done pile
- A private memory jar for little photos and things worth keeping
- An activity feed with unread counts, read receipts and last-online presence
- A read-only "admire the sun / admire the moon" view of the other side
- Foreground location that starts with the app, can be paused from the status
  page, and becomes an honest last-known spot when the phone suspends it
- A phone checker that tests sync, internet, installation, notifications and
  location, and offers the exact fix when something is off
- Installable on both iPhone and Android, works offline for reading

## Reminders, and how they reach a closed phone

GitHub Pages only serves files — it cannot run anything on a schedule. So
delivery works like this:

1. The website writes the notification into an `outbox` collection in Firestore,
   with a `sendAt` timestamp. A reminder for Friday at 3pm sits there until then.
2. A Cloudflare Worker (`worker/`) runs every minute, signs in as one member,
   claims a short delivery lock, and sends anything due as one Web Push message.
3. The service worker receives it and shows the notification, whether or not the
   site is open.

Free on Cloudflare's free plan, no credit card, no Firebase Blaze plan.

**This started as a GitHub Actions cron and that did not work.** GitHub treats
scheduled workflows as its lowest-priority queue: a `*/5` schedule fired roughly
every four hours, so reminders arrived the same afternoon rather than at the
time you picked. `.github/workflows/deliver.yml` is kept as a manual backstop
with its schedule removed — running both would deliver everything twice. It has
to stay behaviourally identical to `worker/src/index.js`; the comment at the top
of `tools/deliver.mjs` says why.

Things to know:
- **On iPhone, notifications only work once the site is on the Home Screen.**
  That is an Apple rule, not something the site can route around. The phone
  checker says so and walks through it.

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

Everything lives under `households/{HOUSEHOLD_ID}` — lists, notes, reminders,
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
open **Everything on?** and allow notifications and location. The front door sends
you to your side automatically. That page reports
whether the phone is actually registered for background nudges, rather than just
whether permission was granted.

## Making small changes

1. Run `pnpm install` once, then edit the files.
2. Bump `CACHE` in `service-worker.js` whenever a cached file changes. Do not
   cache-bust with `?v=2` instead: the worker precaches the bare path, so a
   query string means that file is never served from the cache at all.
3. Commit and push `main`. GitHub Pages publishes it; open copies pick up the new
   service worker and reload themselves.

## Checking your work

```
pnpm test                             # syntax, data, push, dedupe and delivery
```

And the browser pass, which loads every page at phone size, clicks through the
real flows and fails on any script error or sideways scroll:

```
pnpm exec playwright install chromium
python3 -m http.server 8777     # from a copy with apiKey set to REPLACE_ME
pnpm run test:browser
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
