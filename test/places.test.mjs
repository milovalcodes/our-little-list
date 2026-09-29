import assert from 'node:assert/strict';
import { matchSavedPlace, placeDisplay, statusShowsPlace } from '../place-presets.js';

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

console.log('LOCATION TAGS CLEAN');
