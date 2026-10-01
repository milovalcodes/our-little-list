export function newActivityCount(buckets, viewer, other, since) {
  const fresh = value => Number(value) > since;
  return [
    ...(buckets.items || []).filter(item => item.addedBy === other && fresh(item.createdAt)),
    ...(buckets.notes || []).filter(note => note.recipient === viewer && fresh(note.createdAt)),
    ...(buckets.dates || []).filter(idea => idea.addedBy === other && !idea.imported && fresh(idea.createdAt)),
    ...(buckets.statuses || []).filter(status => (status.person === other || status.id === other) && ['manual','custom','arrival','focus'].includes(status.updateKind) && fresh(status.updatedAt)),
    ...(buckets.help || []).filter(request => request.to === viewer && request.from !== viewer && fresh(request.createdAt)),
    ...(buckets.memories || []).filter(item => item.addedBy === other && fresh(item.createdAt)),
    ...(buckets.reactions || []).filter(item => item.by === other && fresh(item.createdAt))
  ].length;
}
