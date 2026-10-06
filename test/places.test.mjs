import assert from 'node:assert/strict';
import { matchSavedPlace, placeDisplay, statusShowsPlace, arrivalMessage, leaveMessage, announcesArrival, announcesLeave, overlappingPlace, togetherPlace } from '../place-presets.js';

const home = { id:'home', preset:'home', label:'our place', lat:26.1, lng:-80.2, radius:150 };
const near = { lat:26.1005, lng:-80.2, accuracy:10 };
const far = { lat:26.104, lng:-80.2, accuracy:10 };

assert.equal(matchSavedPlace([home], near)?.id, 'home', 'a point inside the radius should match');
assert.equal(matchSavedPlace([home], far), null, 'a point well outside the radius should not match');

const edge = { lat:26.10155, lng:-80.2, accuracy:0 };
assert.equal(matchSavedPlace([home], edge), null, 'a new place should not grab a point outside its radius');
assert.equal(matchSavedPlace([home], edge, 'home')?.id, 'home', 'the active place gets exit hysteresis so GPS wobble does not flap the status');

assert.deepEqual(
  (({ emoji, status, animation }) => ({ emoji, status, animation }))(placeDisplay({ preset:'work' })),
  { emoji:'💻', status:'working hard', animation:'working' }
);
assert.equal(placeDisplay({ preset:'custom', label:'the creature habitat' }).status, 'at the creature habitat');

// Opening a page must not rewrite a status that already says the right thing.
// It used to, on every page's first GPS fix, and each rewrite reached the other
// phone as a status update.
const atHome = { person:'her', text:'', locationText:'vibing at home', locationPreset:'home', locationPlaceId:'home' };
assert.equal(statusShowsPlace(atHome, home), true, 'still home: nothing to write');
assert.equal(statusShowsPlace(atHome, null), false, 'left home: that is a change');
assert.equal(statusShowsPlace({ person:'her', text:'song', locationText:'' }, null), true, 'no saved spots and none shown: nothing to write');
assert.equal(statusShowsPlace(null, null), true, 'no status yet and no spot: nothing to say');
assert.equal(statusShowsPlace(null, home), false, 'no status yet but at a spot: write it');
assert.equal(statusShowsPlace({ locationText:'vibing at home', locationPreset:'home' }, home), true, 'a status written before place ids were stored still counts');
assert.equal(statusShowsPlace(atHome, { ...home, id:'home2' }), false, 'a different spot with the same words is still a move');
console.log(' ok  a status is only rewritten when the spot actually changes');

// Arriving at a saved spot tells the other phone, in the spot's own words.
assert.equal(arrivalMessage({ preset:'home' }, 'Sol').title, 'Sol just got home! 🏠');
assert.equal(arrivalMessage({ preset:'work' }, 'Luna').title, 'Luna just got to work :c');
assert.equal(arrivalMessage({ preset:'custom', label:'the gym', emoji:'🏋️' }, 'Luna').title, 'Luna just got to the gym 🏋️');
assert.equal(arrivalMessage({ preset:'home' }, 'Sol').body, 'vibing at home');
assert.equal(arrivalMessage({ preset:'home' }, 'Sol', { together:true }).body, "you're both here · home together");
assert.equal(announcesArrival({}), true, 'on unless switched off');
assert.equal(announcesArrival({ notifyOnArrival:false }), true, 'the old unticked-by-default box is not an off switch');
assert.equal(announcesArrival({ announce:false }), false);
assert.equal(announcesLeave({}), false, 'leaving pings are opt-in, including on old saved spots');
assert.equal(announcesLeave({ announceLeave:true }), true);
assert.equal(leaveMessage(home,'Sol').title, 'Sol is leaving our place 🏠');
assert.equal(leaveMessage(home,'Sol',{ late:true }).title, 'Sol left our place', 'a leave noticed later does not say "is leaving"');
assert.equal(announcesLeave({ preset:'work', announceLeave:false }), true, 'work pings on leaving unless switched off with the bell');
assert.equal(announcesLeave({ preset:'work', announceLeave:false, leaveChosen:true }), false, 'an explicit off is kept');
assert.equal(announcesLeave({ preset:'home' }), false, 'home stays opt-in');
assert.ok(!arrivalMessage(home,'Sol',{ late:true }).title.includes('just'), 'a late arrival does not say "just"');
assert.equal(overlappingPlace([home],near,100)?.id,'home','overlapping circles cannot both be saved');
assert.equal(overlappingPlace([home],far,100),null,'a separate spot is fine');
assert.equal(togetherPlace({ placePreset:'school', placeLabel:'campus' }, { placePreset:'school', placeLabel:'library' }), 'study party');
assert.equal(togetherPlace({ placePreset:'custom', placeLabel:'Gym' }, { placePreset:'custom', placeLabel:'gym' }), 'together at Gym');
assert.equal(togetherPlace({ placeLabel:'home' }, { placeLabel:'work' }), '');
console.log(' ok  arrivals say where, in the spot\'s own words');

// On my way: almost together, then together at last.
{
  const { approachStep, approachStage, APPROACH } = await import('../journey.js');
  const { placeDistance } = await import('../place-presets.js');
  const now = Date.parse('2026-10-06T21:00:00Z');
  const partner = { lat:26.1, lng:-80.2, updatedAt:now - 600000, shareUntil:now + 60000 };
  const at = (km, minutesAgo = 1, stage) => ({ lat:26.1 + km / 111.2, lng:-80.2, at:now - minutesAgo * 60000, stage });
  const step = (before, after, p = partner) => approachStep({ before, after, partner:p, distance:placeDistance, now });
  assert.equal(step(null, at(1)).ping, null, 'the first reading is a starting point, not news');
  assert.equal(step(at(5, 1, 'far'), at(1.2)).ping, 'near', 'driving into 1.5 km says almost together');
  assert.equal(step(at(1.2, 1, 'near'), at(0.08)).ping, 'together', 'within about 100 m is together');
  assert.equal(step(at(1.2, 1, 'near'), at(1.0)).ping, null, 'still near is not news again');
  assert.equal(approachStage(2000, 'near'), 'near', 'wobbling at the edge does not drop back out');
  assert.equal(step(at(5, 90, 'far'), at(1.2)).ping, null, 'an old reading is no proof of moving closer');
  assert.equal(step(at(1.25, 1, 'far'), at(1.2, 0, 'far')).ping, null, 'a few metres closer is not driving over');
  assert.equal(step(at(5, 1, 'far'), at(1.2), { ...partner, updatedAt:now - APPROACH.partnerFresh - 1 }).ping, null, 'a day-old spot is not where they are');
  console.log(' ok  almost together, then together at last, without wobble repeats');
}

console.log('LOCATION TAGS CLEAN');
