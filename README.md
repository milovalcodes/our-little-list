# Our Little List

A GitHub Pages-ready progressive web app with separate “For Her” and “For Him” spaces.

## What works now

- Two themed personal dashboards
- A separate shared checklist that either person can add to or complete
- A friendly, chip-based reminder/date maker
- Tiny notes with realtime in-app popups
- A shared activity feed with unread counts, read receipts, and last-online status
- A phone checker for sync, internet, installation, notifications, and location permission
- A small synthesized twinkle for live updates after the user has interacted with the page
- A shared grocery view
- An opt-in live map with 15-minute, 1-hour, and 3-hour sharing windows
- Cute proximity messages, including “almost together” and “together at last :)”
- Local device storage fallback
- Firebase Authentication and Firestore sync across both phones
- Installable PWA shell and offline cache
- Web Push receiving handler (delivery service still required for background phone popups)

## Cross-device setup

The included Firebase adapter uses one shared email/password account for both phones. Firestore data is stored below `households/{uid}`, so security rules can restrict every list, note, reminder, and location to that authenticated account.

The live map stores each person’s latest position in `households/{uid}/locations`. Positions have an expiry time and stop appearing when the chosen sharing window ends. Location is never requested automatically; each person must tap **Share my spot** on their own phone.

Use these Firestore rules:

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

Enable Email/Password in Firebase Authentication and replace the placeholders in `firebase-config.js` with the web app configuration from Firebase.

Location sharing requires the secure GitHub Pages address (HTTPS) and each phone’s location permission. Both iPhone and Android browsers may pause live website location updates in the background, so keep the map open while meeting up. A native iOS/Android companion app is required for Life360-style background tracking.

Do not put private API keys, service-account keys, or push-signing secrets in these frontend files.

## Tiny-update workflow

The website is deliberately plain HTML, CSS, and JavaScript. Small fixes do not need an app-store build:

1. Edit the files.
2. Bump the cache name in `service-worker.js` when cached files change.
3. Commit and push `main`.
4. GitHub Pages publishes the update automatically; an open copy refreshes when the new service worker takes over.

The Android app is paused. The current website is the shared source of truth on iPhone and Android.

## Local preview

Serve this folder over HTTP so the service worker can register. Opening the HTML files directly still supports the visual interface and local lists, but not installation or notifications.

