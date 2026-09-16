const CACHE = 'our-little-list-map-v9';
const ASSETS = ['./','./index.html','./her.html','./him.html','./tasks.html','./reminders.html','./notes.html','./location.html','./styles.css','./shared.js','./tasks.js','./reminders.js','./notes.js','./location.js','./live-notes.js','./ui-helpers.js','./firebase-data.js','./firebase-config.js','./sun-moon-personalized.png','./sun-profile.png','./moon-profile.png','./manifest.webmanifest'];

self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(fetch(event.request).then(response => {
    const copy = response.clone();
    caches.open(CACHE).then(cache => cache.put(event.request,copy));
    return response;
  }).catch(async () => {
    const cached = await caches.match(event.request);
    if (cached) return cached;
    if (event.request.mode === 'navigate') return caches.match('./index.html');
    return Response.error();
  }));
});

self.addEventListener('push', event => {
  let data = { title:'Our Little List', body:'There’s a new little nudge waiting for you ♡', url:'./index.html' };
  try { data = { ...data, ...event.data.json() }; } catch (_) {}
  event.waitUntil(self.registration.showNotification(data.title,{ body:data.body, icon:'./sun-moon-personalized.png', badge:'./sun-moon-personalized.png', data:{ url:data.url } }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data?.url || './index.html'));
});
