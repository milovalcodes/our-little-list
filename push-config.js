// Public half of the VAPID key pair. This is meant to be public — it only lets a
// browser create a subscription addressed to us. The private half lives as the
// VAPID_PRIVATE_KEY secret on the Cloudflare Worker that does the sending (and
// a second copy in the repository's Actions secrets, for the manual backstop).
// It never ships here.
export const VAPID_PUBLIC_KEY = 'BJeV-0cnT_CgN9jL29iIZqS8Q3EVaBB7qY4F9e3gsbtHIY5KWJKbNIY9rC-WtaNBu5Q9kjgcwDDmxcw3ZQszBkM';

// Collection names shared by the website and the delivery workflow.
export const PUSH_SUBS = 'pushSubs';
export const OUTBOX = 'outbox';
