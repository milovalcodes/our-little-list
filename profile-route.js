// The person being viewed is not the signed-in person. Never use this value
// for write ownership, notification subscriptions, or the viewer's theme.
export function profileUrl(person, section = '') {
  return `status.html#profile-${person === 'him' ? 'him' : 'her'}${['map', 'focus'].includes(section) ? `-${section}` : ''}`;
}

export function profileRoute(hash, viewer) {
  const other = viewer === 'her' ? 'him' : 'her';
  const match = /^#profile-(her|him)(?:-(map|focus))?$/.exec(hash);
  if (match) return { person: match[1], section: match[2] || '' };
  return { person: hash === '#partner' ? other : viewer, section: hash === '#couple-map' ? 'map' : '' };
}
