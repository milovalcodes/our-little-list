import {activityClock,activityWindow} from './activity-clock.js';
import {puzzleSeason} from './seasonal-puzzles.js';
import {EDITION_POOLS} from './puzzle-edition-bank.js';
import {EDITION_SEASONAL_POOLS} from './puzzle-edition-seasonal.js';
export const DIFFICULTY_START_DAY='2026-10-10';
export const DIFFICULTY_VERSION=3;
export const NEW_POOLS=[...EDITION_POOLS,...EDITION_SEASONAL_POOLS];
export function usesNewEdition(day,now=Date.now()){
 return (day.includes('-tie-')?activityClock(new Date(now)).day:day)>=DIFFICULTY_START_DAY;
}
const words=(difficulty,theme,text,season='')=>text.trim().split(/\s+/).map(word=>({word,theme,difficulty,season,id:'word-v3-'+(season||'regular')+'-'+difficulty+'-'+word}));
// Five-letter format retained. Broad themes help without defining the answer.
// No elementary filler, proper-name trivia, or invented spellings as answers.
export const EDITION_WORDS=[
 ...words('normal','Arguments & ideas','claim infer imply logic proof valid doubt query rebut scope issue terms facts views basis cause argue'),
 ...words('normal','Language & literature','irony prose verse theme motif trope idiom essay genre lyric drama fable quote novel enact evoke utter voice'),
 ...words('normal','Character & judgment','acute adept agile aloof amiss ample aware blunt brave civil cruel eager frank grave ideal irate lucid naive noble overt pious prone rigid sober stern staid stoic'),
 ...words('normal','Actions & intentions','adapt adopt amend avert cease defer deign elude equip exert expel feign forgo glean grant grope guard guide hover incur merge posit probe purge quell recur repel reset sever shift spurn surge trace unify unite usurp waive wield yield'),
 ...words('normal','Science & measurement','alloy angle chord clone curve decay dense diode fiber focal force gauge genes ionic layer metal phase plane prism ratio react scale slope solid solar sonic spore state tonic toxin vapor virus'),
 ...words('normal','Art & structure','array bevel blend carve color draft etude facet flute gamut glaze inlay mural panel pitch shade shape sheen style tenor tonal vault weave frame'),
 ...words('normal','Society & exchange','asset audit civic class creed elect elite equal ethic exile guild labor legal lease merit money norms offer owner pacts price quota reign remit rival serve share trade trial union urban value wages worth'),
 ...words('hard','Logic & philosophy','axiom lemma modal ethos logos datum prior ought qualm tenet reify'),
 ...words('hard','Chemistry & physics','anion anode boson gluon meson muons quark qubit redox ester amide amine argon boron radon xenon joule henry tesla farad ohmic aural'),
 ...words('hard','Biology & anatomy','atria cilia clade codon glial ileum islet labia locus lumen lymph ovule stoma taxon ulnar vagal xylem'),
 ...words('hard','Language & form','affix elide elegy gloss lithe schwa argot iambs'),
 ...words('hard','Art & cultural history','aegis agora asana bardo cameo canto fugue haiku icons mudra naves ochre oriel quoin stupa tawny verso'),
 ...words('hard','Precise vocabulary','abate abhor assay augur belay chary copse demur ennui ergot expat fecal guile imago inert inter inure mores nadir nexus opine paean pique poise prion quash salvo salve sated sinew tacit terse trice tryst umbra verve whorl wryly'),
 ...words('normal','Autumn ecology & color','amber ashen bough chaff clove copse decay ember fungi glean gourd grain hazel loamy maple ochre sheaf spore tawny umber wanes','october'),
 ...words('normal','Gothic stories & folklore','alibi curse coven crypt dread eerie haunt pagan raven realm rites ruins spell taunt vigil wails dirge ghoul shrew','october'),
 ...words('hard','Gothic thought & ritual','anima imago limen numen taboo umbra wight','october'),
 ...words('hard','Autumn botany & soil','glebe humic hypha mesic pappi sorus tilth xeric xylem glume arils','october'),
 ...words('normal','Christmas music & traditions','adore altar angel carol chime choir creed ethos feast grace hymns mercy mirth natal noels organ paean peace pious psalm reign saint tenor tonal truce unite vicar vigil viola','december'),
 ...words('normal','Winter science & landscapes','chill dense drift floes flume frost glaze glint hoary icily polar rimes sleet slope taiga vapor','december'),
 ...words('hard','Midwinter music & ritual','amens canto exult fugue kyrie magus modal motet myrrh neume','december'),
 ...words('hard','Glacial landforms & ice','arete esker firns gelid karst loess nival nilas serac tarns talus neves','december'),
];

function shuffle(entries,seed){const a=[...entries];for(let i=a.length-1;i>0;i--){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const j=seed%(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;}
export function editionWordPool(hard=false,season=''){return EDITION_WORDS.filter(e=>e.difficulty===(hard?'hard':'normal')&&e.season===season);}
function selectWord(day,hard,position,now){
 const season=puzzleSeason(day,now),entries=shuffle(editionWordPool(hard,season),20261010+(hard?197:43)+(season?Number(day.slice(0,4)):0));
 const entry=entries[((position%entries.length)+entries.length)%entries.length];
 return {word:entry.word,theme:entry.theme,difficulty:entry.difficulty,catalogVersion:DIFFICULTY_VERSION,entryId:entry.id};
}
export function editionWordForDay(day){
 const hard=new Date(day+'T12:00Z').getUTCDay()===0;
 const elapsed=Math.round((Date.parse(day+'T12:00Z')-Date.parse(DIFFICULTY_START_DAY+'T12:00Z'))/86400000);
 const sundays=elapsed<1?0:Math.floor((elapsed-1)/7)+1;
 const d=Number(day.slice(8,10)),firstSunday=1+(7-new Date(day.slice(0,7)+'-01T12:00Z').getUTCDay())%7;
 const monthSundays=d<firstSunday?0:Math.floor((d-firstSunday)/7)+1;
 const position=puzzleSeason(day)?(hard?monthSundays-1:d-monthSundays-1):(hard?sundays-1:elapsed-sundays);
 return {day,...selectWord(day,hard,position),...activityWindow(day)};
}
export function editionWordForTie(week,round,now){
 const day=week+'-tie-'+round,index=Math.floor(Date.parse(week+'T12:00Z')/604800000);
 return {day,...selectWord(day,true,index+round,now),opensAt:now,closesAt:4102444800000,week};
}
