import {PRACTICE_EDITION_WORDS,PRACTICE_EDITION_EXTRAS} from './practice-edition-bank.js';
import {random,searchGrid,crosswordGrid} from './daily-puzzles.js';

// Changed answers need a separate save namespace; keep old progress intact.
export const PRACTICE_VERSION=2;
export const PRACTICE_COUNTS={word:200,search:100,crossword:100};
export const PRACTICE_NAMES={word:'Little Word',search:'Word Search',crossword:'Mini crossword'};
// Freeze the chosen order independently of future daily-bank additions.
const wordOrder='ANNEX FORTE EJECT DUSKY ALLAY CHIDE JAUNT AMBLE ASKEW BRIAR CLEFT RAVEL NOTCH BRUNT FERAL STAKE APNEA SWATH MIRED AORTA DEPOT CLOUT DOWEL ALGAE LURID SHIRK STINT FORUM GUISE ERODE DETER MAXIM FRAIL SCOUR EBONY CADET DWELL EXTOL DEBIT DECOR MOGUL STRUT BELIE HOARD FETID BLASE VENAL INEPT SMELT WRACK GAFFE BANAL BLEAK HEDGE ADAGE ARBOR ADORN ADOBE EXALT ALIAS YEARN EDICT ELATE BESET AMITY FLINT ALTER EPOCH ADDLE ARDOR ASIDE ALIGN AWASH AISLE ROUSE AVAIL MOULT BALMY ATOLL PARRY ABASE AGAPE ONSET ABASH SCOWL CACHE VEXED ROGUE APTLY AGATE ACRID THROE CANON HASTE CHASM ODIUM KNACK APHID ABIDE TEPID AUGER ADZES BEGET FUGAL CANID LORIS OLEIC WHELK CALYX INCUS RAJAH SPIEL HYOID CHERT ALGAL PRATE HAPAX ASPIC ILEAL STILE DRUPE OPERA CROFT CAPON SUTRA INDRI LYSIS NACRE ABUTS EIDER HILUM CUBIT AREAL HELIX METED EMERY MUCIN AZIDE LARVA FOVEA ABACI MANSE APACE COCCI CIRRI STROP CAULK AEONS GYRUS OVOID BASAL LINAC DINGO GLANS AMBIT TORUS HADAL LAMIA NARES BRACT PINNA EVICT OSIER BURET ECLAT VILLI GONAD FEMUR SITAR LEMUR PAYEE MOIRE DOYEN PARSE THYME RENAL APRES USURY CURIE AXIAL AGLET ANGST NISEI ASCUS TUPLE DELFT ELUTE PYLON REBUS THANE DYADS EMEND IMINE BOLUS DIMER ANISE ZONAL GEODE BILGE DEBAR'.split(' ');
const byWord=new Map(PRACTICE_EDITION_WORDS.map(e=>[e.word,e]));
export const PRACTICE_WORDS=wordOrder.map(word=>byWord.get(word));
if(PRACTICE_WORDS.length!==200||PRACTICE_WORDS.some(e=>!e))throw Error('Incomplete practice edition');
const cache=new Map();
const boardBank=[...PRACTICE_EDITION_WORDS,...PRACTICE_EDITION_EXTRAS];
export function practicePuzzle(type,index){
 if(!Object.hasOwn(PRACTICE_COUNTS,type)||!Number.isInteger(index)||index<0||index>=PRACTICE_COUNTS[type])throw Error('That practice puzzle is not in this collection.');
 const key=type+':'+index;
 if(cache.has(key))return cache.get(key);
 const hard=index>=PRACTICE_COUNTS[type]/2,difficulty=hard?'hard':'normal';
 const bank=boardBank.filter(e=>e.difficulty===difficulty),size=hard?12:11,rng=random('practice-v2:'+key);
 const layout=type==='word'?PRACTICE_WORDS[index]:type==='search'
  ?searchGrid(bank,size,rng,true)
  :crosswordGrid(bank,size,rng,hard?8:6,80);
 const puzzle={...layout,type,index,difficulty,id:'practice-v2-'+key,theme:'A little of everything'};
 cache.set(key,puzzle);return puzzle;
}
