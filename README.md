# Our Little List

A small shared website for two people. Lists, reminders, notes, statuses, date
ideas, small favours, and an opt-in map — plain HTML, CSS and JavaScript on
GitHub Pages, with Firebase for syncing between the two phones.

Live: https://milovalcodes.github.io/our-little-list/

## What it does

- Two themed sides, sun and moon, with a shared middle
- A shared list and grocery list either person can add to or tick off
- Reminders that actually arrive — see **Reminders** below
- Tiny notes with live popups and a twinkle
- **Help me out** — quick asks like "bring water" or "call me when free", with
  on it / in a bit / can't right now answers
- Discord-style statuses with optional expiry
- A shared date-idea pile with favourites, a random picker and a done pile
- An activity feed with unread counts, read receipts and last-online presence
- A read-only "admire the sun / admire the moon" view of the other side
- An opt-in live map with 15-minute, 1-hour and 3-hour sharing windows, plus
  last-known locations and proximity messages
- A phone checker that tests sync, internet, installation, notifications and
  location, and offers the exact fix when something is off
- Installable on both iPhone and Android, works offline for reading

## Reminders, and how they reach a closed phone

GitHub Pages only serves files — it cannot run anything on a schedule. So
delivery works like this:

1. The website writes the notification into an `outbox` collection in Firestore,
   with a `sendAt` timestamp. A reminder for Friday at 3pm sits there until then.
2. A Cloudflare Worker (`worker/`) runs every minute, signs in as one member
   account, and sends anything that is due as a real Web Push message.
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

Copy `firestore.rules` into the Firebase console with the same UIDs. The Checks
workflow fails if `household.js` and `firestore.rules` ever disagree, because a
mismatch would quietly lock somebody out.

Everything lives under `households/{HOUSEHOLD_ID}` — lists, notes, reminders,
statuses, dates, help requests, locations, push subscriptions and the outbox.

### 2. The delivery worker

The public values are already filled in in `worker/wrangler.toml`. From `worker/`:

```
npm install
npx wrangler login
npx wrangler secret put LITTLE_EMAIL        # either member's email
npx wrangler secret put LITTLE_PASSWORD     # that account's password
npx wrangler secret put VAPID_PRIVATE_KEY   # private half of the push key pair
npx wrangler deploy
```

Watch it with `npx wrangler tail`, or read **Observability → Logs** in the
dashboard. A quiet minute logs `{"checked":true,"sent":0,"subscribed":2}`.

Logging is declared in `wrangler.toml`, not just toggled in the dashboard —
`wrangler deploy` overwrites anything the file does not mention, so a toggle set
by hand only survives until the next push.

Optionally `wrangler secret put RUN_SECRET`, which enables
`POST /run?key=…` on the worker URL to force a pass while testing.

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

1. Edit the files.
2. Bump `CACHE` in `service-worker.js` whenever a cached file changes. Do not
   cache-bust with `?v=2` instead: the worker precaches the bare path, so a
   query string means that file is never served from the cache at all.
3. Commit and push `main`. GitHub Pages publishes it; open copies pick up the new
   service worker and reload themselves.

## Checking your work

```
node test/delivery.test.mjs           # the Firestore layer, against a mocked REST API
npm install --no-save http_ece web-push
node test/webpush.test.mjs            # the encryption, decoded by an independent library
node test/delivery-worker.test.mjs    # a full delivery pass, seven scenarios
```

And the browser pass, which loads every page at phone size, clicks through the
real flows and fails on any script error or sideways scroll:

```
npm install playwright
python3 -m http.server 8777     # from a copy with apiKey set to REPLACE_ME
node test/smoke.mjs
```

`.github/workflows/checks.yml` runs all four of the above except the browser
pass, plus three static checks: every file the service worker precaches exists,
no page asks for a local file with a `?query` (the cache stores the bare path,
so those silently stop working offline), and `household.js` and
`firestore.rules` list the same account ids.

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
