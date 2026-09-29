import assert from 'node:assert/strict';
import { matchSavedPlace, placeDisplay } from '../place-presets.js';

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

console.log('LOCATION TAGS CLEAN');
