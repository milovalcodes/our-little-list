const PROFILE_KEY = 'our-little-list-couple-profile-v1';

export function cachedProfile() {
  try {
    const value = JSON.parse(localStorage.getItem(PROFILE_KEY));
    return {
      sunName: cleanName(value?.sunName),
      moonName: cleanName(value?.moonName)
    };
  } catch (_) {
    return { sunName:'', moonName:'' };
  }
}

export function saveCachedProfile(profile) {
  const value = {
    sunName: cleanName(profile?.sunName),
    moonName: cleanName(profile?.moonName)
  };
  localStorage.setItem(PROFILE_KEY, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent('littlelist:profile',{ detail:value }));
  applyProfileNames(document, value);
  return value;
}

export function personName(person, profile = cachedProfile()) {
  return person === 'her' ? (profile.sunName || 'her') : (profile.moonName || 'him');
}

export function applyProfileNames(root = document, profile = cachedProfile()) {
  root.querySelectorAll('[data-person-name]').forEach(element => {
    const person = element.dataset.personName === 'sun' ? 'her' : 'him';
    const name = personName(person, profile);
    const hasCustomName = person === 'her' ? Boolean(profile.sunName) : Boolean(profile.moonName);
    if (!hasCustomName && !element.dataset.personFallback) return;
    const value = hasCustomName ? name : element.dataset.personFallback;
    element.textContent = (element.dataset.personFormat || '{name}').replace('{name}', value);
  });
}

function cleanName(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, 24);
}
