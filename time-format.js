// One shared set of time helpers. Previously each page carried its own copy of
// timeAgo(); location.js had a version with no hour/day units, so a spot from
// yesterday read "last seen 1287m ago".

export function timeAgo(value) {
  const at = Number(value);
  if (!Number.isFinite(at) || at <= 0) return 'a while ago';
  const seconds = Math.max(0, Math.floor((Date.now() - at) / 1000));
  if (seconds < 15) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  return friendlyDate(at, { month: 'short', day: 'numeric' });
}

export function friendlyDate(value, options = { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) {
  const at = Number(value);
  if (!Number.isFinite(at) || at <= 0) return '';
  return new Intl.DateTimeFormat(undefined, options).format(new Date(at));
}

export function friendlyWhen(value) {
  const at = Number(value);
  if (!Number.isFinite(at) || at <= 0) return '';
  const date = new Date(at);
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow = date.toDateString() === tomorrow.toDateString();
  const clock = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(date);
  if (sameDay) return `today at ${clock}`;
  if (isTomorrow) return `tomorrow at ${clock}`;
  return new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date);
}

export function friendlyDuration(minutes) {
  const value = Number(minutes) || 0;
  if (value < 60) return `${value} minutes`;
  const hours = value / 60;
  return hours === 1 ? '1 hour' : `${hours} hours`;
}
