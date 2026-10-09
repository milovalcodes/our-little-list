// Shared by the scheduled worker and its manual backstop.
const FOCUS_HELD_KINDS = new Set(['status', 'item', 'item-finished', 'date', 'memory', 'reaction', 'keepsake', 'game']);

// A queued content notification is only useful while its source still exists.
// Old queues did not have refs, so recover their exact, known destination IDs.
export function contentSourcePath(message) {
  const collection={note:'notes',item:'items',date:'dates',memory:'memories',reaction:'reactions'}[message?.kind];
  if(!collection)return '';
  const ref=new RegExp('^'+collection+'/([A-Za-z0-9_-]+)'+(message.kind==='reaction'?'(?:/\\d+)?':'')+'$').exec(message.ref||'');
  if(ref)return collection+'/'+ref[1];
  if(message.kind==='reaction')return '';
  const prefix={note:'note',item:'item',date:'date',memory:'memory'}[message.kind];
  try{
    const url=new URL(message.url||'', 'https://our-app.invalid/');
    const file={note:'notes.html',item:'tasks.html',date:'dates.html',memory:'memories.html'}[message.kind];
    const match=new RegExp('^#'+prefix+'-([A-Za-z0-9_-]+)$').exec(url.hash);
    return url.pathname.split('/').pop()===file&&match?collection+'/'+match[1]:'';
  }catch(_){return '';}
}

export function contentStillWanted(message, source) {
  if(!source)return false;
  if(message.kind==='note')return (source.recipient||source.to)===message.to&&!source.read;
  if(message.kind==='reaction')return source.to===message.to&&Number(message.ref.split('/')[2])===Number(source.createdAt);
  return !source.done;
}

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
