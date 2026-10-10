import {EASY_CLUES,HARD_CLUES} from './puzzle-bank.js';
import {SEASONAL_POOLS} from './seasonal-puzzles.js';

// Versioned, reviewed content. Persist a generated board before offering it:
// catalog additions must never change a board somebody has already started.
export const CATALOG_VERSION=2;
const groups=[
 ['normal','fruits','Fruit bowl',`APPLE GRAPE LEMON MANGO OLIVE PEACH CHERRY ORANGE PEAR AVOCADO BANANA KIWI PAPAYA PLUM GUAVA MELON LYCHEE APRICOT FIG LIME COCONUT DATE RAISIN POMELO QUINCE`],
 ['normal','ocean','By the ocean',`BEACH OCEAN WHALE WAVE ANCHOR SHIP CORAL SHARK SHELL CRAB SEAL TIDE SAND REEF KELP SQUID OCTOPUS LOBSTER SHRIMP DOLPHIN SEAGULL STARFISH SEAHORSE JELLYFISH SAIL BOAT`],
 ['hard','ocean','Ocean depths',`ANEMONE ATOLL EDDY FJORD LAGOON NACRE NAUTILUS PELAGIC BENTHIC ESTUARY BRACKISH SALINITY UPWELLING GYRE HALOCLINE BATHYAL NERITIC PLANKTON BIVALVE CEPHALOPOD COPEPOD KRILL MORAY REMORA DIATOM HALIBUT CONCH WHELK MUREX ABALONE LIMPET OYSTER BRINE`],
 ['normal','food','Something tasty',`APPLE BREAD GRAPE HONEY JUICE LEMON MANGO OLIVE PASTA PEACH PIZZA SALAD SPOON SUGAR TEA TOAST WATER BUTTER CHERRY COFFEE COOKIE ORANGE WAFFLE SOUP EGG PEAR PANCAKE POPCORN AVOCADO SANDWICH NOODLE PUDDING PICKLE NUGGET WAFFLES`],
 ['normal','nature','Outside for a bit',`BEACH CLOUD EARTH FLAME NIGHT OCEAN PLANT RAIN RIVER SHEEP SNAIL SPACE STARS TIGER WHALE WINTER ZEBRA FLOWER FOREST GARDEN ISLAND KITTEN MEADOW MONKEY PLANET RABBIT ROCKET SHADOW SUMMER SUNSET TURTLE DESERT FEATHER FROG MOON STAR TREE WAVE CAT DOG ICE OWL SUN WEB ROSE SNOW NEST RAINBOW PENGUIN DINOSAUR`],
 ['normal','home','Around the house',`CHAIR HOUSE LIGHT TABLE WINDOW CAMERA CANDLE COTTON JACKET MIRROR PILLOW POCKET VELVET WALLET BASKET BLANKET HAMMOCK SOCK BOOK YARN HAT LAMP SOAP STICKER UMBRELLA`],
 ['normal','play','Odds & ends',`DANCE DREAM HEART LAUGH MAGIC MUSIC PIANO ROBOT SMILE STORY TRAIN WHEEL YELLOW BRIDGE GUITAR MARKET PURPLE SILVER ANCHOR BUBBLE CASTLE GHOST MAP SHIP UNICORN GOBLIN COZY BOOP`],
 ['hard','earth','The natural world',`ABYSS AGATE ALLOY AMBER ANEMONE APOGEE ARID ATOLL AURORA BASALT BERYL CANOPY CHASM COBALT CORONA DAHLIA DEW ECLIPSE EDDY EQUINOX FJORD FLINT GARNET GEODE GOSSAMER GROTTO HELIUM HERON IBIS IRIS ISOBAR JADE JASPER KESTREL LAGOON LAPIS LICHEN LILAC LUMEN MANTLE MARIGOLD MIRAGE NACRE NAUTILUS NEBULA NIMBUS OASIS OBSIDIAN OCHRE ONYX OPAL ORBIT PETRICHOR PRISM QUARTZ RAVINE SAFFRON SCARAB SEPAL SIENNA SOLSTICE THISTLE UMBRA VERDANT VORTEX WREN XYLEM ZENITH ZEPHYR ZIRCON`],
 ['hard','words','Words, stories & ideas',`ACUMEN ADAGE AEGIS ALIBI ARCANE AXIOM BASILISK CADENCE CAMEO CHIMERA CIPHER CODA CUSP ELEGY ELIXIR ENIGMA EPOCH ETHER FABLE FRACTAL FUGUE GLYPH HALCYON HAIKU HIATUS IDYLL JUXTAPOSE LILT LIMINAL MYRIAD NADIR NEXUS PARADOX QUIRK QUORUM REBUS RUNE SATORI SPHINX STANZA TRYST VESPER YONDER`],
 ['hard','craft','Made by hand',`ABACUS ALCOVE AMULET DIADEM EMBOSSED ETCH FACET GAZEBO LATTICE LYRE MOSAIC OBELISK PAPYRUS PATINA PLINTH QUILL RELIC TALISMAN TESSERA TORQUE`],
];
const category=new Map();
for(const[difficulty,theme,label,words]of groups)for(const word of words.split(' '))if(!category.has(difficulty+':'+word))category.set(difficulty+':'+word,{theme,label});
export const PUZZLE_CATALOG=[...EASY_CLUES.map(e=>({...e,difficulty:'normal'})),...HARD_CLUES.map(e=>({...e,difficulty:'hard'}))].map(e=>{
 const group=category.get(e.difficulty+':'+e.word);
 if(!group)throw Error('Missing puzzle category: '+e.word);
 return Object.freeze({id:e.difficulty+'-'+e.word.toLowerCase(),...e,theme:group.theme,themeLabel:group.label});
}).concat(SEASONAL_POOLS.flatMap(p=>p.entries.map(e=>Object.freeze(e))));
import {NEW_POOLS} from './puzzle-edition.js';
PUZZLE_CATALOG.push(...NEW_POOLS.flatMap(p=>p.entries.map(e=>Object.freeze(e))));
export const PUZZLE_THEMES=[...groups.map(([difficulty,id,label])=>Object.freeze({difficulty,id,label,season:''})),...SEASONAL_POOLS.map(({difficulty,id,label,season})=>Object.freeze({difficulty,id,label,season})),...NEW_POOLS.map(({difficulty,id,label,season,edition})=>Object.freeze({difficulty,id,label,season,edition}))];
export function catalogPool(difficulty,theme){return PUZZLE_CATALOG.filter(e=>e.difficulty===difficulty&&e.theme===theme);}

// Specific hints take precedence over broader vocabulary hints. These are
// answer categories, not clues that spell out a word or alter its difficulty.
const hints=[
 ['Fruit',`apple grape lemon mango melon olive peach berry guava fruit cherry orange pear avocado`],
 ['Food & drink',`bread candy cream honey pizza salad snack spice sugar toast treat bagel baker basil chips cider cocoa crisp dairy donut dough drink feast flour grain gravy grill gummy humus icing jelly juice juicy latte lunch milky minty mocha nacho nutty onion pasta pecan plate ramen roast sauce scoop slice sushi sweet syrup tangy taste tasty tummy wafer wheat whisk yeast yummy zesty aroma brine broil crepe cumin gruel gusto knead sieve tuber vegan yolky`],
 ['Animals',`eagle puppy robin squid whale zebra beast bunny camel crane ducky gecko goose hippo horse hound kitty koala llama mouse otter panda pooch quack shark sheep sloth snail snake tiger wings wooly aphid avian corgi eider fauna feral hyena quail rhino snout squab stork tabby talon udder venom vixen warty`],
 ['Plants & flowers',`bloom grass green maple acorn cedar daisy field hazel leafy lilac poppy sprig thorn tulip woods chaff flora hedge kudzu loamy mulch oaken peony reedy tuber`],
 ['Ocean & water',`beach coral marsh ocean pearl river shell shore water canal canoe creek float kayak oasis sandy swamp yacht atoll bayou bilge delta fjord foamy scuba skiff soggy trawl wharf`],
 ['Sky, space & weather',`cloud earth flame frost light night rainy shiny space spark stars steam storm sunny white world alien fiery flash globe lunar north orbit outer shade shine smoke snowy solar south windy abyss aglow azure balmy chasm ether flint gulch knoll lofty lumen ozone prism umbra vapor wispy xenon`],
 ['Around the house',`house plush shirt spoon table apron attic bench blade board boots brass brick broom brush cabin chair chalk chest chime comfy couch craft cover denim dress duvet fence floor glass glove homes hotel igloo knife label linen lodge nylon pants paper patch phone photo plaid porch purse quilt ruler scarf screw sheet shelf shoes skirt socks stick stool straw towel trash trunk wagon wheel anvil bezel caulk dowel epoxy foyer gauze hinge inlay lapel lathe parka patio pylon rivet sauna stave tulle twine vault wedge`],
 ['Music, art & stories',`dance dream magic music piano radio stage story actor album angel beads chess clown comic crown diary disco drama fairy gamer ghost gnome hobby image indie lyric media movie mural noise opera paint party pixel print queen quest rhyme royal scene score silly skate slime sound spook style tempo title video vinyl viola vivid voice vocal witch banjo blurb cameo cello coven crone debut deity essay fable fugue genie glyph gnoll haiku idyll jazzy jewel joust limbo motif motto naiad ninja nymph pagan pixie polka prose psalm quill realm rebus relic revue rouge rune satyr sepia spear tiara twang vogue vowel waltz yodel`],
 ['Feelings & personality',`blush brave charm fresh happy heart laugh merry quiet smile buddy chill dizzy eager enjoy faith fancy fuzzy grace guilt haven humor jolly loyal lucky moody nerdy noble peace prank pride proud rebel relax rogue smart snoop snoot softy trust upset weird worry yearn amiss amity angst bawdy brisk cynic ennui ethos gaffe gaunt gusto inane inept irate leery loopy lurid mirth pesky petty phony piety pique qualm quirk rowdy sassy savvy smirk snarl stoic suave sulky surly swoon tacit terse tryst verve wacky witty woozy wryly zippy`],
 ['People & the body',`adult agent ankle birth brain bride cheek coach elbow groom grown hairy heard heavy human inner leash niece nurse pinky pilot pulse skull sleep smell snore spine sweat teeth thigh thumb tired tooth touch uncle waist watch widow woman wound wrist young youth aorta bicep cramp femur ivory lymph navel obese pudgy pygmy rabbi sinew spasm tibia tumor ulcer urine valet vicar`],
];
const hintByWord=new Map();
for(const [label,words]of hints)for(const word of words.split(' '))if(!hintByWord.has(word))hintByWord.set(word,label);
export function wordTheme(word,hard=false){return hintByWord.get(String(word).toLowerCase())||(hard?'Tricky vocabulary':'Everyday vocabulary');}
