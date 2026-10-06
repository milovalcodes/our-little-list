// "On my way" pings: one phone getting closer to the other. Pure logic, no
// browser globals, so it can be tested and shared.
//
// The stages have a gap between the distance that enters a stage and the one
// that leaves it. GPS wobble at the edge would otherwise ring the other phone
// with "almost together" again and again.
import { friendlyDistance } from './place-presets.js';

export const APPROACH = Object.freeze({
  nearEnter: 1500,      // within 1.5 km: almost together
  nearLeave: 3000,      // back out past 3 km before it can ring again
  togetherEnter: 120,   // within 120 m: together
  togetherLeave: 400,
  movedCloser: 100,     // this phone must have closed at least this much itself
  partnerFresh: 12 * 60 * 60 * 1000, // an older last-known spot is not "where they are"
  baselineStale: 45 * 60 * 1000,     // an older reading is no basis for "getting closer"
  cooldown: 40 * 60 * 1000
});

const RANK = { far: 0, near: 1, together: 2 };

export function approachStage(meters, previous = 'far') {
  if (!Number.isFinite(meters)) return 'far';
  if (meters <= APPROACH.togetherEnter) return 'together';
  if (previous === 'together' && meters <= APPROACH.togetherLeave) return 'together';
  if (meters <= APPROACH.nearEnter) return 'near';
  if ((previous === 'near' || previous === 'together') && meters <= APPROACH.nearLeave) return 'near';
  return 'far';
}

// Decides whether this fix is worth a ping to the other phone.
// - before/after: this phone's previous and current reading { lat, lng, at, stage }
// - partner: their latest spot { lat, lng, updatedAt, shareUntil }
// Returns { stage, ping: null | 'near' | 'together' }.
export function approachStep({ before, after, partner, distance, now = Date.now() }) {
  const fresh = partner && Number.isFinite(partner.lat) && Number.isFinite(partner.lng)
    && now - (Number(partner.updatedAt) || 0) <= APPROACH.partnerFresh;
  if (!fresh) return { stage: 'far', ping: null, meters: NaN };
  const meters = distance(after, partner);
  const stage = approachStage(meters, before?.stage || 'far');
  // No earlier reading, or one from long ago: this is where we start counting
  // from, not news. Opening the app next to each other is not an arrival.
  if (!before || now - (Number(before.at) || 0) > APPROACH.baselineStale) return { stage, ping: null, meters };
  if (RANK[stage] <= RANK[before.stage || 'far']) return { stage, ping: null, meters };
  // Closer because this phone moved, not because they walked over here.
  const closedGap = distance(before, partner) - meters;
  if (closedGap < APPROACH.movedCloser) return { stage, ping: null, meters };
  return { stage, ping: stage, meters };
}

export function approachMessage(kind, name, { meters, partnerLive }) {
  if (kind === 'together') {
    return { title: 'together at last 🫶', body: `${name} made it to you.` };
  }
  return {
    title: `${name} is almost there`,
    body: partnerLive
      ? `${friendlyDistance(meters)} away and getting closer.`
      : `${friendlyDistance(meters)} from your last spot and getting closer.`
  };
}
