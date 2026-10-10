import {activityClock,activityWindow} from './activity-clock.js';
import {puzzleSeason} from './seasonal-puzzles.js';
import {EDITION_POOLS} from './puzzle-edition-bank.js';
import {EDITION_SEASONAL_POOLS} from './puzzle-edition-seasonal.js';
export const DIFFICULTY_START_DAY='2026-10-10';
export const DIFFICULTY_VERSION=4;
export const NEW_POOLS=[...EDITION_POOLS,...EDITION_SEASONAL_POOLS];
export function usesNewEdition(day,now=Date.now()){
 return (day.includes('-tie-')?activityClock(new Date(now)).day:day)>=DIFFICULTY_START_DAY;
}
const words=(difficulty,theme,text,season='')=>text.trim().split(/\s+/).map(word=>({word,theme,difficulty,season,id:'word-v4-'+(season||'regular')+'-'+difficulty+'-'+word}));
// Five-letter format retained. Broad themes help without defining the answer.
// Recognizable answers; hard favors repeated letters, silent letters and unusual
// arrangements rather than rare terminology. Themes guide without defining.
export const EDITION_WORDS=[
 ...words('normal','Things around us','alarm album apron badge basin blade board bunch brush cable chair chest clock cloud coast coral court cover crane crate crown curve diary drain dress earth fence field flame flask floor flute frame globe glove grape hinge honey house juice knife label layer lemon light lunch medal metal model money mouse music ocean olive paint panel paper party peach pearl piano pilot place plant plate point porch pound prize radio range relay river robot route salad scale scarf score shade shark sheet shelf shirt shore skate slice slope space spoon stage stair stone store stove straw style table thorn thumb tiger toast tower track trail train truck trunk watch whale wheat wheel world'),
 ...words('normal','People & little plans','admit adopt agree allow amend argue avoid aware brave bring build catch cause chase chose clean climb close count dance dream enjoy enter equal favor fetch fight first focus force fresh front giant grant greet grown guard guide happy heart hurry judge knock laugh learn leave lucky major march meant minor offer often order other owner peace phone pitch plain plans press pride proud quiet raise reach react ready reply right round royal safer sense serve share sharp shine shown skill smart smile solve sound spare speak spend stand start steam stick storm story study super sweet thank think throw tired touch trade trust truth twice visit voice waste whole wrong youth'),
 ...words('hard','Familiar words, unusual shapes','abbey abyss allay alley alloy amass annex array arrow attic audio avail award banjo berry bluff booby boost buddy buggy bunny cello cheek chess civic colon comma couch cough coyly daddy dizzy dodge elbow empty enemy eject error essay fuzzy gauge genie grief jazzy jelly kayak khaki kiosk knead known llama lobby loyal madam mimic mocha ninth nylon odder onion ought ozone paddy pizza puppy radar rally rarer retry rigid rover roomy rouge rural sassy savvy seedy seize sheep shyly siege sixth slyly sneer soggy sorry sushi tally petty teddy teeth thief title tooth tough truce tulip tummy twang union usual vivid vowel whiff witty woozy wreck wrist yacht'),
 ...words('normal','Halloween stories & costumes','ghost witch haunt curse crypt raven scary carve treat trick candy masks capes fangs howls magic spell demon beast prank','october'),
 ...words('normal','Fall colors & afternoons','amber apple cider crisp grain gourd hazel maple leafy acorn roast smoky windy clove ember seeds boots chill dusky','october'),
 ...words('hard','A spooky little twist','eerie mummy ghoul skull blood broom spook creep shush night black foggy booed coven','october'),
 ...words('hard','Autumn paths & textures','tawny bough sappy soggy woody','october'),
 ...words('normal','Christmas gatherings','angel carol chime choir feast merry peace party candy sugar spice clove gifts cards bells songs grace toast baker holly','december'),
 ...words('normal','Winter days & evenings','frost polar skate scarf boots white cabin flake steep steam quilt snowy drift shiny north robin','december'),
 ...words('hard','Holiday gatherings, with a twist','jolly belle queue cocoa glass staff bough','december'),
 ...words('hard','Winter patterns','sleet chill igloo fluff icily foggy slick night slush thaws furry','december'),
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
