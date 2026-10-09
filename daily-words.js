import {activityWindow} from './activity-clock.js';
import {wordTheme,CATALOG_VERSION} from './puzzle-catalog.js';
import {puzzleSeason,seasonalWords,SEASONAL_WORDS} from './seasonal-puzzles.js';
export const WORD_START_DAY='2026-10-08';
// Original, hand-picked answer bank. Keep this order stable; daily documents
// also retain their word, so future bank additions cannot rewrite a played day.
// This is a friendly shared puzzle, not a secret/anti-cheat answer service.
export const DAILY_WORDS=`
apple beach bread bloom blush brave candy charm cloud coral cream dance dream eagle earth flame fresh frost fruit grape grass green happy heart honey house laugh lemon light magic mango maple marsh melon merry music night ocean olive peach pearl piano pizza plant plush puppy quiet radio rainy river robin salad shell shirt shiny shore smile snack space spark spice spoon squid stage stars steam stone storm sugar sunny sweet swing table toast today train treat tulip voice water whale wheat white world zebra acorn actor adult agent album alert alien alone angel ankle apron arrow attic badge bagel baker basil beads beast bench berry birth black blade blind block board boast bonus boots brain brand brass brick bride bring brown brush buddy buggy build bunch bunny burst cabin camel canal canoe cargo catch cedar chair chalk chase cheek chess chest chill chime chips chore cider clown coach cocoa comic comfy couch cover craft crane crash creek crisp crown curly daily dairy daisy delay denim diary disco dizzy donut dough drama dress drink drive ducky dusty duvet eager early elbow enjoy entry equal extra fairy faith fancy feast fence field fiery flash float floor flour flute fuzzy gamer gecko ghost giant glass globe gloss glove gnome goose grace grain grand gravy grill groan groom grown guava guess guest guide guilt gummy habit hairy handy hatch haven hazel heard heavy hello hobby hippo hitch homes horse hotel hound human humus humor hurry icing igloo image indie inner jelly jolly juice juicy kayak kitty knife koala label large laser later latte leafy learn leash leave legal lilac linen llama local lodge logic loyal lucky lunar lunch lying lyric major match maybe media messy metal micro might milky mimic minty model mocha moist money month moody motor mouse movie mural nacho naked nerdy niece noble noise north nurse nutty nylon oasis onion opera orbit other otter ounce outer paint panda pants paper party pasta patch pause peace pecan pedal penny phase phone photo piece pilot pinch pinky pixel place plaid plain plane plate plaza pluck pooch poppy porch pound power prank pride prime print prize proof proud proxy puffy pulse punch purse quack queen quest quick quilt quite radar ramen ranch reach ready rebel relax reply reset rhyme right roast robot rocky rogue rough round royal rugby ruler sandy sauce scale scarf scene scent scoop score scout screw scrub serve seven shade shake share shark sharp sheep sheet shelf shift shine shoes shoot short shout shrug silly skate skill skirt skull sleep slice slide slime sloth small smart smell smoke snail snake snoop snoot snore snowy socks softy solar solid sound south spare speak speed spend spent spine splat split spook spray sprig stand stare start state steep stick still stink stock store story straw strip study stuff style super sushi swamp swear sweat swell swift swirl syrup tangy taste tasty teach teeth tempo thank their thick thief thigh thing think third thorn three throw thumb tiger tight timer tired title token tooth topic torch total touch tough towel tower trace track trade trail trash trick troop truck trunk trust truth tummy twist uncle under union unite unity upper upset urban usual vague valid value video vinyl viola visit vivid vocal voter wafer wagon waist waste watch weird wheel whisk whole whose widow width windy wings witch woman woods wooly worry worth wound wrist write wrong yacht yearn yeast young youth yummy zesty zoned
`.trim().split(/\s+/);
// A separate Sunday bank: unusual letter combinations and repeated letters,
// still recognizable words, with no overlap with the everyday answers.
export const SUNDAY_WORDS=`
abyss affix aglow aisle alloy amiss amity ample angst anvil aorta aphid aptly aroma assay askew async atoll avian axiom azure balmy banjo bawdy bayou bezel bicep bilge blimp blurb brine brisk broil cadet cairn cameo carat caulk cease cello chaff chasm cinch civic clink clout corgi coven covet cramp crepe crimp crone crypt cumin cynic debut decoy deity delta depot deuce dodge dowel droit dwarf eclat eider elude ennui envoy epoxy epoch equip erode essay ether ethos evade evoke exalt exile expel extol facet fauna feign femur feral fetch fjord flair flint flora fluke foamy foyer friar fugue gaffe gauze gaunt gauzy genie glyph gnash gnoll graft gruel guise gulch gusto haiku halve havoc hedge hefty hinge hoard hoist hyena idyll impel imply inane inept inert ingot inlay irate ivory jaunt jazzy jewel jiffy joust judge karma khaki knead knelt knack knoll kudzu lapel lapse lathe leery limbo lithe loamy lofty loopy lumen lurid lymph mauve melee merge mirth mogul motif motto moult mulch myrrh naiad navel niche ninja nymph oaken obese occur oddly opine opium oxide ozone pagan parka parse patio peony peril pesky petty phony piety pique pivot pixie plume polka posit preen prism prose psalm pudgy pylon pygmy quail qualm quart query queue quill quirk quota quote rabbi radii rally realm rebus recur reedy reign relic revue rhino rigid rinse rival rivet roost rotor rouge rowdy rupee sappy sassy satyr sauna savvy scuba segue seize sepia sieve sinew sissy skiff skimp skulk smirk snarl snout soggy sonic spasm spawn spear spree sprue squab squat stave stoic stork stout suave sulky sully surly swath swoon tabby tacit talon taunt tawny tepid terse tiara tibia trawl trice trite truce tryst tuber tulle tumor twang tweak twine udder ulcer umbra undid undue unfit unwed unzip urine usage usurp utter valet vapor vault vegan venom verve vicar vigil vixen vogue vowel vying wacky waltz warty wedge welsh whack wharf whiff whorl wince wispy witty woozy wrack wreak wryly xenon yodel yolky zippy zonal`.trim().split(/\s+/);
function shuffled(words,seed) {
  const bank=[...words];
  for(let i=bank.length-1;i>0;i--){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const j=seed%(i+1);[bank[i],bank[j]]=[bank[j],bank[i]];}
  return bank;
}
const bank=shuffled(DAILY_WORDS,190819),sundays=shuffled(SUNDAY_WORDS,78123);
export const LITTLE_WORD_CATALOG=[...DAILY_WORDS.map(word=>({word,difficulty:'normal'})),...SUNDAY_WORDS.map(word=>({word,difficulty:'hard'}))].map(entry=>({...entry,id:'word-'+entry.word,theme:wordTheme(entry.word,entry.difficulty==='hard')})).concat(SEASONAL_WORDS);
function metadata(word,hard){return {theme:wordTheme(word,hard),difficulty:hard?'hard':'normal',catalogVersion:CATALOG_VERSION,entryId:'word-'+word};}
function seasonalAnswer(day,hard,position,now){
 const season=puzzleSeason(day,now);
 if(!season)return null;
 const year=Number(day.slice(0,4)),entries=shuffled(seasonalWords(season,hard),year+(hard?78123:190819));
 const entry=entries[((position%entries.length)+entries.length)%entries.length];
 return {word:entry.word,theme:entry.theme,difficulty:entry.difficulty,catalogVersion:CATALOG_VERSION,entryId:entry.id};
}
export const WORD_BANK_SIZE=bank.length;
export function wordForDay(day) {
  const window=activityWindow(day),index=Math.round((Date.parse(day+'T12:00:00Z')-Date.parse(WORD_START_DAY+'T12:00:00Z'))/86400000);
  if(index<0)return null;
  const sunday=new Date(day+'T12:00:00Z').getUTCDay()===0;
  // First Sunday is offset 3 from the Thursday launch.
  const sundayCount=index<3?0:Math.floor((index-3)/7)+1;
  const position=sunday?sundayCount-1:index-sundayCount;
  const word=(sunday?sundays:bank)[position%(sunday?sundays:bank).length];
  // Separate weekday/Sunday positions avoid repeats within a seasonal month.
  const monthDay=Number(day.slice(8,10)),firstWeekday=new Date(day.slice(0,7)+'-01T12:00Z').getUTCDay();
  const firstSunday=1+(7-firstWeekday)%7,sundaysSoFar=monthDay<firstSunday?0:Math.floor((monthDay-firstSunday)/7)+1;
  const seasonal=seasonalAnswer(day,sunday,sunday?sundaysSoFar-1:monthDay-sundaysSoFar-1);
  return {day,word,...metadata(word,sunday),...seasonal,...window};
}

export function wordForTie(week,round,now=Date.now()){
  const id=week+'-tie-'+round;
  const index=Math.floor(Date.parse(week+'T12:00:00Z')/604800000);
  const word=sundays[(index*13+round*17)%sundays.length];
  return {day:id,word,...metadata(word,true),...seasonalAnswer(id,true,index+round,now),opensAt:now,closesAt:4102444800000,week};
}
