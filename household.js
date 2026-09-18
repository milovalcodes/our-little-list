// The one shared space.
//
// This used to be derived from whoever signed in — households/{currentUser.uid}
// — which was fine while both phones shared a single login. With an account per
// person that would have given each of you a separate, empty household, so the
// path is frozen here instead. The Firestore rules are what actually grant
// access to it.
export const HOUSEHOLD_ID = 'oLSxADOwjqS04hSS2aHGOcvozmz2';

// Which account is which side. Firebase UIDs are not secrets and are safe to
// ship; they are identifiers, not credentials.
export const MEMBERS = {
  REPLACE_WITH_SUN_UID: 'her',
  'oLSxADOwjqS04hSS2aHGOcvozmz2': 'him'
};

export function sideForUid(uid) {
  return (uid && MEMBERS[uid]) || null;
}

// Only the household path has to be real for the site to work. An unclaimed
// member slot is harmless — it just never matches anybody, and that account
// gets the "not one of ours" screen instead of a broken page.
export function configured() {
  return !HOUSEHOLD_ID.startsWith('REPLACE_WITH');
}
