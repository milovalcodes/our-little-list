// Shared by the scheduled worker and its manual backstop.
const FOCUS_HELD_KINDS = new Set(['status', 'item', 'item-finished', 'date', 'memory', 'reaction', 'keepsake']);

export function focusDelivery(message, status, now = Date.now()) {
  const until = Number(status?.focusUntil) || 0;
  const active = until > now;
  if (!active || message?.urgent === true) return { holdUntil: 0, quiet: false };
  // Held a few minutes at a time rather than to the end of the session, so
  // tapping "done" early lets everything through on the next pass instead of
  // up to 45 minutes later.
  if (FOCUS_HELD_KINDS.has(message?.kind)) return { holdUntil: Math.min(until + 1000, now + 5 * 60000), quiet: false };
  // Asks still arrive during focus. Unless marked urgent, they do so quietly.
  return { holdUntil: 0, quiet: message?.kind === 'help' };
}
