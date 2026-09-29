import assert from 'node:assert/strict';
import { matchSavedPlace, placeDisplay, statusShowsPlace, arrivalMessage, announcesArrival, togetherPlace } from '../place-presets.js';

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
assert.equal(togetherPlace({ placePreset:'school', placeLabel:'campus' }, { placePreset:'school', placeLabel:'library' }), 'study party');
assert.equal(togetherPlace({ placePreset:'custom', placeLabel:'Gym' }, { placePreset:'custom', placeLabel:'gym' }), 'together at Gym');
assert.equal(togetherPlace({ placeLabel:'home' }, { placeLabel:'work' }), '');
console.log(' ok  arrivals say where, in the spot\'s own words');

console.log('LOCATION TAGS CLEAN');
