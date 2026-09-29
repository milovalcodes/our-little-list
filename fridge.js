// The fridge is a pinned note. It used to be a separate sticky-note record next
// to notes; now any note can be pinned, the home screen shows the one that is,
// and writing on the fridge sends a note that arrives pinned.

export function fridgeNote(notes = []) {
  return notes
    .filter(note => note.pinned)
    .sort((a, b) => Number(b.pinnedAt || b.createdAt || 0) - Number(a.pinnedAt || a.createdAt || 0))[0] || null;
}

// One thing on the fridge at a time: pinning a note takes the others down.
export async function pinNote(data, notes, id, viewer) {
  await Promise.all(notes.filter(note => note.pinned && note.id !== id).map(note => data.updateIn('notes', note.id, { pinned: false })));
  await data.updateIn('notes', id, { pinned: true, pinnedAt: Date.now(), pinnedBy: viewer });
}

export async function clearFridge(data, notes) {
  await Promise.all(notes.filter(note => note.pinned).map(note => data.updateIn('notes', note.id, { pinned: false })));
}
