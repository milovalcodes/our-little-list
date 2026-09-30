// Shared by the scheduled worker and its manual backstop.
const FOCUS_HELD_KINDS = new Set(['status', 'item', 'date', 'memory', 'reaction', 'keepsake']);

export function focusDelivery(message, status, now = Date.now()) {
  const until = Number(status?.focusUntil) || 0;
  const active = until > now;
  if (!active || message?.urgent === true) return { holdUntil: 0, quiet: false };
  if (FOCUS_HELD_KINDS.has(message?.kind)) return { holdUntil: until + 1000, quiet: false };
  // Asks still arrive during focus. Unless marked urgent, they do so quietly.
  return { holdUntil: 0, quiet: message?.kind === 'help' };
}
