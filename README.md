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
2. A GitHub Actions workflow (`.github/workflows/deliver.yml`) runs every five
   minutes, signs in as the same shared couple account the phones use, and sends
   anything that is due as a real Web Push message.
3. The service worker receives it and shows the notification, whether or not the
   site is open.

Free on a public repository, no credit card, no Firebase Blaze plan.

Two things to know:

- **GitHub's scheduler is best-effort.** A nudge can land a few minutes late when
  GitHub is busy. If minute-exact timing matters more than the cost, swap the
  workflow for a Firebase Cloud Function on the Blaze plan.
- **On iPhone, notifications only work once the site is on the Home Screen.**
  That is an Apple rule, not something the site can route around. The phone
  checker says so and walks through it.

## One-time setup

### 1. Firebase

Enable **Email/Password** in Firebase Authentication and create the one shared
account both phones sign in with. Put the web app config in `firebase-config.js`
(these values are public by design — the security rules are what protect the
data).

Firestore rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /households/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

Everything lives under `households/{uid}` — lists, notes, reminders, statuses,
dates, help requests, locations, push subscriptions and the outbox — so that one
rule covers all of it.

### 2. Notification keys

The public half of the VAPID key pair is already in `push-config.js`. Add the
private half and the sign-in details as **repository secrets**
(Settings → Secrets and variables → Actions):

| Secret | What it is |
| --- | --- |
| `LITTLE_EMAIL` | the shared account's email |
| `LITTLE_PASSWORD` | the shared account's password |
| `VAPID_PUBLIC_KEY` | same value as in `push-config.js` |
| `VAPID_PRIVATE_KEY` | the private half, kept only here |
| `VAPID_SUBJECT` | `mailto:` plus any contact address |

To roll the keys later: `npx web-push generate-vapid-keys`, put the public half
in `push-config.js`, the private half in the secret. Both phones re-register on
their next visit.

### 3. Both phones

Open the site, sign in with the shared account, add it to the Home Screen, then
open **Everything on?** and allow notifications and location. That page reports
whether the phone is actually registered for background nudges, rather than just
whether permission was granted.

## Making small changes

1. Edit the files.
2. Bump `CACHE` in `service-worker.js` whenever a cached file changes.
3. Commit and push `main`. GitHub Pages publishes it; open copies pick up the new
   service worker and reload themselves.

## Checking your work

```
node test/delivery.test.mjs     # the delivery layer, against a mocked Firestore
```

And the browser pass, which loads every page at phone size, clicks through the
real flows and fails on any script error or sideways scroll:

```
npm install playwright
python3 -m http.server 8777     # from a copy with apiKey set to REPLACE_ME
node test/smoke.mjs
```

`.github/workflows/checks.yml` runs the parse check, the delivery test and a
check that every file the service worker precaches actually exists.

## Notes

- Do not put private keys, service-account files or push secrets in the files
  served by Pages. The Firebase web config is the one exception — it is meant to
  be public.
- The side codes on the front door keep the two sides from getting mixed up on a
  shared phone. They are a speed bump, not a safe: anyone holding the phone can
  reset one.
- Background location is not possible from a website on either platform. The map
  updates while the page is open; a native app would be needed for Life360-style
  tracking. The Android build is paused — the website is the shared source of
  truth on both phones.
