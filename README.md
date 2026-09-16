# Our Little List

A GitHub Pages-ready progressive web app with separate “For Her” and “For Him” spaces.

## What works now

- Two themed personal dashboards
- A separate shared checklist that either person can add to or complete
- A friendly, chip-based reminder/date maker
- Tiny notes with realtime in-app popups
- A shared grocery view
- An opt-in live map with 15-minute, 1-hour, and 3-hour sharing windows
- Cute proximity messages, including “almost together” and “together at last :)”
- Local device storage fallback
- Firebase Authentication and Firestore adapter ready for configuration
- Installable PWA shell and offline cache
- Web Push receiving handler (delivery service still required for background phone popups)

## What cross-device use still needs

GitHub Pages is static and cannot safely store shared data or send scheduled push messages. Connect one small backend before publishing for two-phone sync. Recommended options:

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

## Local preview

Serve this folder over HTTP so the service worker can register. Opening the HTML files directly still supports the visual interface and local lists, but not installation or notifications.

