import {ROUND_EXPANSION} from './round-expansion.js';
import {cluePool,answerPool} from './round-library.js';
import {WORD_DEFINITIONS} from './word-definitions.js';
import {WORD_TOPICS} from './word-topics.js';

// A single reviewed view for future editions. Legacy catalogs remain frozen.
// The 20k accepted-guess lexicon is a spelling whitelist, not an answer bank.
const all = [...ROUND_EXPANSION,...[false,true].flatMap(h=>['','october','december'].flatMap(s=>[
 ...answerPool(h,s),...cluePool(h,s),
]))];
const clues = new Map(all.filter(e=>e.clue).map(e=>[e.word.toUpperCase(),e.clue]));
const expansion=new Map(ROUND_EXPANSION.map(e=>[e.word,e]));
const corrections = {
 BROOK:'A small natural stream of flowing fresh water',
 FREAK:'A highly unusual occurrence or anomaly',
 CAUSE:'Bring about an effect or event',
 UTTER:'Express a word or sentence aloud',
 WEIRD:'Strange enough to seem unfamiliar or uncanny',
 SWIFT:'Moving at great speed, as a fast-running stream',
 PERIL:'A situation involving serious and immediate danger',
 OPINE:'State a personal view in speech or writing',
 EXTOL:'Praise a person or achievement with strong enthusiasm',
 ASYNC:'Describing operations that need not finish in step, in computing',
 BERRY:'A small soft fruit often picked from a bramble',
 FIRE:'The burning process that gives off heat and light',
 LYMPH:'A clear fluid that carries immune cells through the body',
 REAP:'Cut and gather a ripe crop',
 WOOD:"The hard material beneath a tree's bark",
 HAY:'Dried grass stored as fodder for farm animals',
 BRAWN:'Physical strength, especially muscular strength',
 NOEL:'A Christmas word sung in a familiar carol',
 TABLE:'A piece of furniture with a flat top and supporting legs',
 MAZE:'A network of paths with misleading turns and dead ends',
 LEAF:'A flat plant organ that usually captures sunlight',
 VAMPIRE:'A mythical creature said to drink blood',
 ZOMBIE:'A reanimated corpse in horror stories',
 PUMPKIN:'A large orange squash often carved into a lantern',
 GRAVE:'A place where a body is buried',
 QUIET:'Making little or no sound',
 SOUP:'A liquid dish made by cooking ingredients in stock or water',
 CURRENT:'A flow of water or electricity',
 STAR:'A luminous ball of gas in space; also a pointed tree decoration',
 SAFE:'Protected from danger, or a secure container for valuables',
 BOOTH:'A small enclosed space used for voting, selling, or seating',
 HATCH:'An opening with a cover, or emerge from an egg',
 PATCH:'A small piece used to cover a hole or damaged area',
 CHILLER:'A frightening film or story',
 SCHOOL:'A place where people are taught',
};
export function wordDetails(word) {
 const key=word.toUpperCase(),extra=WORD_DEFINITIONS[key];
 const clue=corrections[key]||expansion.get(key)?.clue||extra?.clue||clues.get(key),theme=expansion.get(key)?.theme||extra?.theme||WORD_TOPICS[key];
 if(!clue||!theme)throw Error('Missing reviewed word details: '+key);
 return {clue,theme};
}
export function reviewedEntry(entry) {
 const details=wordDetails(entry.word);
 return {...entry,...details,themeLabel:details.theme,word:entry.word.toUpperCase()};
}
export const WORD_BOOK=[...new Set([...all.map(e=>e.word.toUpperCase()),...Object.keys(WORD_DEFINITIONS)])].sort().map(word=>({word,...wordDetails(word)}));
