import {cluePool,answerPool} from './round-library.js';
import {WORD_DEFINITIONS} from './word-definitions.js';
import {WORD_TOPICS} from './word-topics.js';

// A single reviewed view for future editions. Legacy catalogs remain frozen.
// The 20k accepted-guess lexicon is a spelling whitelist, not an answer bank.
const all = [false,true].flatMap(h=>['','october','december'].flatMap(s=>[
 ...answerPool(h,s),...cluePool(h,s),
]));
const clues = new Map(all.filter(e=>e.clue).map(e=>[e.word.toUpperCase(),e.clue]));
const corrections = {
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
 const clue=corrections[key]||extra?.clue||clues.get(key),theme=extra?.theme||WORD_TOPICS[key];
 if(!clue||!theme)throw Error('Missing reviewed word details: '+key);
 return {clue,theme};
}
export function reviewedEntry(entry) {
 const details=wordDetails(entry.word);
 return {...entry,...details,themeLabel:details.theme,word:entry.word.toUpperCase()};
}
export const WORD_BOOK=[...new Set([...all.map(e=>e.word.toUpperCase()),...Object.keys(WORD_DEFINITIONS)])].sort().map(word=>({word,...wordDetails(word)}));
