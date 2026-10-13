// Kept tiny: gameplay and the delivery Worker need reset guards, not the
// word banks or the CPU-heavy board generator.
export const revisionOf=round=>round?.revision||0;
export function assertRevision(puzzle,expected=0,game=null){
 if(revisionOf(puzzle)!==expected||(game&&revisionOf(game)!==revisionOf(puzzle)))throw Error('This round was reset. The fresh board is loading; try again in a moment.');
}
