// Reviewed answers with original clues. Practice and scored games may share
// vocabulary; an entire scored week shares one exclusion set instead.
import {PUZZLE_CATALOG} from './puzzle-catalog.js';
import {EDITION_WORDS} from './puzzle-edition.js';
import {PRACTICE_EDITION_WORDS,PRACTICE_EDITION_EXTRAS} from './practice-edition-bank.js';
import {DAILY_WORDS,SUNDAY_WORDS} from './daily-words.js';

const rows=(season,text)=>text.trim().split('\n').map(line=>{const [word,clue]=line.split('|');return {word,clue,season,difficulty:'both',id:'library-'+(season||'regular')+'-'+word.toLowerCase()};});
export const EXTRA_CLUES=[
 ...rows('october',`
AFRAID|Feeling that makes a harmless coat look like an intruder
ALIVE|What a movie monster unexpectedly turns out to be
ATTIC|The room above you that horror films make suspicious
AWAKE|What a scary film may keep you until sunrise
BARE|How trees look after losing their leaves
BAT|A flying mammal that lends a vampire its disguise
BATS|Winged mammals that navigate by echoes
BEWARE|A warning often followed by "of the dog"
BITE|A vampire's preferred way of leaving a mark
BLACKCAT|A feline blamed unfairly for bad luck
BLAZE|A lively fire rather than a candle's flicker
BONFIRE|An outdoor blaze with room for a gathering
BOO|A ghost's entire opening statement
BRANCH|A tree limb that may scrape a window at night
BREW|Make a potion, or a pot of tea
BRISK|Pleasantly sharp, as an autumn morning
BURN|What a flame does to a careless fingertip
CANDLE|A little wax light with a shrinking lifespan
CAPE|A superhero and a vampire might share this garment
CAULDRON|A witch's very large cooking pot
CELLAR|The underground room nobody visits alone in a scary film
CHILLER|A frightening story, not just a refrigerator
CLOAK|A flowing garment that helps a figure seem mysterious
COBWEB|Evidence a spider got there before the cleaner
COFFIN|A vampire's unconventional bed
CORN|The crop that can become a maze
COSTUME|An outfit chosen to look like someone else
CROWS|Black birds whose calls can sound like complaints
DARE|An invitation to prove you aren't scared
DARK|The condition that makes ordinary shadows suspicious
DEAD|The opposite of alive, unless the film has a sequel
DECAY|The gradual breakdown of fallen leaves
DEVIL|A horned costume with a pointed tail
DOORBELL|The sound announcing another trick-or-treater
DREAD|Fear of something that hasn't happened yet
DUSK|The interval when daylight starts handing over to night
ECHO|The reply an empty corridor can give you
EYES|The pair that seems to follow you in a painted portrait
FALL|A season, or what a loose leaf will do
FEAR|The feeling a haunted house is selling
FIRE|The reason you keep a safe distance from a bonfire
FLANNEL|A soft checked fabric for cooler days
FOG|Weather that gives a graveyard free special effects
FREAK|Something strikingly unusual, as in a freak storm
FRIGHT|A sudden dose of fear
GLOW|The soft light inside a carved pumpkin
GOBLIN|A mischievous little creature of folklore
GRAVE|A burial place, or a very serious manner
GRAVEYARD|A place full of headstones
GRIM|Bleak or forbidding, like the reaper's reputation
GROAN|The noise a supposedly empty house might make
GROWL|A low warning from an animal
HARVEST|Gather the crops before the cold arrives
HAY|Dried grass that gives a hayride its name
HAYRIDE|A wagon trip with straw-colored seating
HEADSTONE|A marker with a name and dates in a cemetery
HEARTH|The part of a fireplace nearest the room
HIDDEN|Out of sight, as the last piece of candy might be
HOOD|The part of a cloak that covers your head
HORROR|A genre designed to make you check behind you
HUSH|A request for silence before a suspicious noise
JACKAL|A wild canine associated with ancient Egyptian tombs
JOLT|A sudden shock from a jump scare
JUMPSCARE|A horror moment that catches your body before your brain
LANTERN|A portable light with a protective enclosure
LEAF|A tree's solar panel that changes color in autumn
LEAVES|They fall from trees, or someone departs
LURK|Stay hidden while waiting for a chance to appear
MASK|A face covering that can turn a friend unrecognizable
MAZE|A puzzle you solve with your feet
MIDNIGHT|The boundary between one date and the next
MIST|A thin veil of tiny water droplets
MONSTER|The creature you hope is only in the movie
MOON|The night light a werewolf keeps an eye on
MOONLIT|Illuminated by Earth's natural satellite
MOTH|A nighttime insect drawn to a porch light
MUD|The result of rain meeting a dirt path
NIGHTFALL|The arrival of darkness rather than a tumble
NOISE|What a quiet house suddenly makes at the worst moment
OCTOBER|The month whose last night is Halloween
ORANGE|A pumpkin color that is also a fruit
OWL|A bird that gives the night a hooting soundtrack
POTION|A witch's bottled mixture with uncertain side effects
PUMPKIN|A squash with a second career as a lantern
RATTLE|The sound of loose chains or a shaky window
REAP|Gather a crop, as the reaper's name suggests
RED|A leaf color that can also mean stop
RIP|Three letters on a cartoon gravestone
RUST|The reddish coating on an abandoned iron gate
RUSTLE|The sound of leaves moving underfoot
SCARE|What a haunted house tries to deliver
SCARECROW|A field guardian whose job is frightening birds
SCREAM|A frightened sound with very little indoor voice
SHADOW|The dark shape that follows you when there is light
SHIVER|Your body's response to cold or fear
SHOCK|A surprise powerful enough to stop a conversation
SILENT|Making no sound at all
SKELETON|The framework a costume may put on the outside
SMOKE|What rises above a bonfire
SNEAK|Move quietly to avoid being noticed
SOUL|The immaterial self in many ghost stories
SPIDER|An eight-legged decorator of neglected corners
SPIRIT|A ghost, or someone's enthusiasm
SPOOKY|Just frightening enough to be fun
SQUASH|A pumpkin's vegetable family, or press flat
STAIRS|The steps that creak in a horror film
STALK|Follow secretly, or a plant's supporting stem
STARTLE|Make someone jump without touching them
STEW|A slow-cooked meal for a chilly evening
STRAW|Dried stalks used to stuff a scarecrow
SWEATER|A knitted layer that gets its turn in cooler weather
THICKET|A dense patch of shrubs with little room to pass
THRILL|Excitement with a small edge of fear
TOMB|A burial chamber rather than an open grave
TORCH|A portable flame for an old-fashioned dark corridor
TRANCE|A dreamlike state associated with hypnosis
TREAT|The edible alternative to a trick
TWIG|A small branch that snaps underfoot
VAMPIRE|A fictional creature with an unusual blood type preference
VEIL|A thin covering that partly hides a face
WAND|A magician's handheld prop
WARLOCK|A male practitioner of magic in folklore
WEB|A spider's trap, or the place this app lives
WEREWOLF|A person with a very complicated full-moon schedule
WHISPER|Speech quiet enough for a secret
WICK|The thread that keeps a candle burning
WIND|The invisible force rearranging fallen leaves
WIZARD|A magic-user often pictured with a pointed hat
WOODS|A forest, particularly ominous after sunset
WRAITH|A ghostly figure rather than a living visitor
YELL|A shout with no attempt at subtlety
ZOMBIE|A walking corpse with a poor skincare routine`),
 ...rows('december',`
ADVENT|The countdown whose calendar may contain chocolate
BAKE|Use the oven to turn dough into something shareable
BAUBLE|A round ornament with a place on the tree
BELLS|Ringing decorations heard in a sleigh's approach
BLIZZARD|A snowstorm with wind doing most of the shouting
BOOTS|Footwear that separates your socks from the snow
BOW|A ribbon's finishing knot on a present
BOX|The part of a gift a cat may appreciate most
BRIGHT|Shining strongly, as holiday lights do
CANDYCANE|A striped sweet with a hook at one end
CARD|A paper greeting that can stand on a mantel
CELEBRATE|Mark a happy occasion with more than a nod
CHEER|Festive good spirits, or an encouraging shout
CHIMNEY|Santa's traditional alternative to a front door
CINNAMON|A warm spice often sold in curled sticks
COAL|A naughty stocking's traditional contents
COAT|An outer layer buttoned against the cold
COLD|The temperature that makes your breath visible
COOKIE|A small baked incentive for a midnight visitor
CRACKER|A festive paper tube that opens with a pop
CRANBERRY|A tart red fruit often served beside a holiday roast
CUP|A little vessel for hot cocoa
DECEMBER|The month that closes the calendar year
DECORATE|Give a room or tree its festive outfit
EGGNOG|A creamy holiday drink with eggs in its name
ELF|A small fictional worker in Santa's workshop
EVERGREEN|A tree that doesn't give up its leaves for winter
FAMILY|The people who may share a holiday table
FIREPLACE|An indoor home for a carefully contained fire
FLURRY|A brief snowfall, or a sudden burst of activity
FREEZE|Turn water into something you can skate on
GARLAND|A long decoration draped rather than hung as a ball
GINGER|The root that gives a holiday biscuit some bite
GINGERBREAD|A spiced biscuit that can become a house
GIVING|The side of gift exchange that isn't receiving
GLOVES|Winter coverings with a separate place for each finger
GOLD|A warm metallic holiday color
GREET|Welcome someone with words or a gesture
HEATER|A machine asked to undo the weather indoors
HOLIDAY|A day set aside from the ordinary routine
HOME|The destination of many December journeys
HOPE|Looking forward to a good outcome
HOT|The reassuring adjective before chocolate on a cold day
ICE|Water sturdy enough to build a rink from
ICICLE|A frozen drip hanging from a roof
ICY|Slippery with frozen water
IVY|A climbing plant paired with holly in a carol
JOY|A short word for a large amount of happiness
KIND|Thoughtful toward others, not a category here
KISS|What mistletoe traditionally invites
LIGHTS|The strings that make a tree visible after dark
LOG|A fireplace fuel with a chocolate cake namesake
MANTEL|The shelf above a fireplace where stockings hang
MITTEN|A hand covering that keeps four fingers together
MISTLETOE|A plant with a kissing tradition attached
NATIVITY|A scene depicting the birth celebrated at Christmas
NICE|The list a well-behaved child hopes to be on
NOEL|A four-letter Christmas greeting found in carols
NORTHPOLE|Santa's famously cold address
NUTCRACKER|A jawed tool that also lends its name to a ballet
ORNAMENT|A decoration given a branch of its own
PACKAGE|A wrapped object waiting to be opened
PAPER|The wrapping you carefully fold and someone promptly tears
PARCEL|A package, especially one sent by post
PEACE|The absence of conflict wished for in holiday greetings
PEPPERMINT|The cool flavor in many red-and-white sweets
PINE|A needled tree with a recognizable fresh scent
PLAID|A checked pattern often worn in colder weather
PRESENT|A gift, or the time that isn't past or future
PUDDING|A holiday dessert that may arrive flaming
REINDEER|The team pulling a fictional airborne sleigh
RIBBON|A narrow fabric strip that dresses up a gift
RINK|The enclosed area where ice skaters make their rounds
ROOF|The landing place above Santa's chosen chimney
RUDOLPH|The reindeer whose nose needs no flashlight
SANTA|The visitor who makes stockings worth hanging
SCARF|A strip of fabric tasked with warming your neck
SEASON|A quarter of the year, or add flavor to dinner
SILVER|The metallic partner to gold in many decorations
SLED|A small vehicle that uses runners instead of wheels
SLEIGH|A runner-equipped vehicle traditionally pulled by reindeer
SNOW|Frozen flakes that make the world look quieter
SNOWBALL|A handful of winter packed into throwing shape
SNOWFLAKE|A frozen crystal with six-sided symmetry
SNOWMAN|A temporary person assembled outdoors in winter
SOCK|An everyday stocking before it becomes decoration
SPARKLE|Shine in many tiny flashes
STAR|The decoration often given the tree's highest branch
STOCKING|A sock promoted to a gift container
TINSEL|Thin shiny strands draped over tree branches
TOGETHER|Not apart, as people hope to be for the holidays
TOY|A plaything that may arrive with batteries not included
TREE|A plant with an indoor decorating season
TURKEY|A large bird that may be the centerpiece of dinner
TWINKLE|Shine with little changes in brightness
UNWRAP|Remove the layer hiding a gift
WARM|Comfortably above chilly without being hot
WISH|A hope that may be written on a gift list
WOOL|Sheep's contribution to a winter wardrobe
WORKSHOP|The room where Santa's helpers supposedly build things
WRAP|Conceal a gift in paper before giving it
WREATH|A ring-shaped decoration hung on a door
YULE|An old word for the Christmas season`),
];

// Cold-season evenings, food, weather and stories: shared vocabulary is fine,
// but Halloween/Christmas-only material stays gated to its own month.
const cozy=rows('',`
ABSENT|Not there when someone takes attendance
ACROSS|From one side of the room to the other
ACTOR|Someone paid to become another person on screen
AFTER|The word before dark in an evening plan
ALBUM|A collection that can hold either songs or photographs
ALERT|Watchful, or a warning on your phone
ALONE|Without company, especially unfortunate in a scary film
AMAZED|Surprised enough to stop what you were doing
AMUSED|Entertained without necessarily laughing out loud
ANCIENT|Old enough to predate the history textbook
ANIMAL|A creature that might leave mysterious tracks
ANTLER|A branching structure on a deer's head
ASH|The powdery remains after a fire goes out
ASHES|What remains of logs after the warmth is gone
BACK|Where you keep looking when a story makes you nervous
BARK|A tree's outer layer, or a dog's alarm
BEAM|A shaft of light or a very wide smile
BEARD|Facial hair that can finish several different costumes
BEDTIME|The hour a good book keeps postponing
BLANKET|An extra layer for a sofa-based movie marathon
BLIND|Unable to see, as a fold over the eyes makes you
BOIL|Heat a liquid until bubbles keep rising
BOOK|A story that doesn't need its battery charged
BOTTLE|A narrow-necked container that may hold a mysterious liquid
BOUND|Tied up, or heading toward a destination
BREAD|A baked loaf that makes a kitchen smell occupied
BRICK|A building block that can line a fireplace
BRIDGE|A crossing over a river rather than through it
BROWN|The color of many fallen leaves and tree trunks
BUNDLE|A collection tied together, or wrap up against the cold
BUTTER|A dairy spread that melts on warm toast
CAKE|A baked dessert with room for candles on top
CAMERA|The device that records a supposedly empty room
CAMP|A temporary outdoor home with very thin walls
CARAMEL|Sugar cooked until it turns golden and sticky
CARRY|Hold something while taking it somewhere else
CAST|A film's performers, or send a spell into action
CHAIR|A seat for one at a crowded table
CHARM|A lucky object, or the ability to win someone over
CHECK|Look again to be certain the door is locked
CHEST|An old storage box, or the front of your torso
CHOCOLATE|Cocoa's most popular reason for existing
CHOP|Cut into pieces rather than take one careful slice
CINEMA|A place where strangers share a giant screen
CIRCLE|A shape with no corners, useful for a gathering
CLEAR|Free of clouds, or easy to understand
CLOCK|The thing that sounds much louder in a silent room
CLOSE|Shut the door, or stand a little nearer
CLOTH|Woven material that can become a table covering
CLOUD|A sky formation that can hide the moon
COCOON|A protective covering with a transformation inside
COMFORT|The feeling supplied by a blanket and familiar company
CORNER|Where two walls meet and a shadow can collect
COTTAGE|A small house with a cozy reputation
COUNT|What you do to be certain everyone came back
COVER|Hide something from view, or the front of a book
CRASH|A sudden loud impact that interrupts the quiet
CREAK|The sound an old floor makes under a foot
CREAM|A rich dairy topping for a warm dessert
CREEK|A small stream, not the sound of a floorboard
CURTAIN|Fabric that can hide a window or open a performance
DAMP|Slightly wet rather than thoroughly soaked
DANGER|The condition a warning sign wants you to avoid
DEEP|Far below the surface, or unusually thoughtful
DEN|An animal's shelter or a cozy room in a house
DOOR|A hinged barrier with a habit of opening in scary films
DOUBT|The feeling behind "are you sure?"
DREAM|A story your sleeping mind writes without permission
DRIP|A falling drop that can keep a quiet house noisy
DRY|What wet socks need to become
DUST|The coating that suggests a room hasn't been visited
EARLY|Before the expected time, as dusk becomes in colder months
EMPTY|Containing nothing, despite the suspicious noises
ENDING|The part of a story that explains the earlier clues
ENVELOPE|A paper pocket for a card or a secret letter
ESCAPE|Get out of somewhere you would rather not be
EVENING|The part of the day between afternoon and night
FAINT|Barely perceptible, as a faraway noise might be
FABLE|A short story with a lesson tucked inside
FALLEN|No longer on its branch, as a leaf might be
FALSE|Not true, as a film's first explanation often is
FEATHER|A bird's light covering that can finish a costume
FENCE|A boundary you can build around a garden
FICTION|A story whose events need not have happened
FIELD|An open stretch of land where crops might grow
FLAME|The visible, moving part of a fire
FLEECE|A sheep's covering or a soft warm fabric
FLICKER|A small, unsteady change in a light
FLOOR|The surface underfoot that may have a loose board
FOLLOW|Come after someone rather than lead
FOOTSTEP|The sound that proves someone is walking nearby
FORGET|Fail to remember, as a shopping list helps you not to
FORK|An eating utensil, or a choice between two paths
FRAME|A border around a photograph, or falsely implicate someone
FRESH|Newly made, as a batch from the oven
FRIEND|The person you would prefer not to lose in a maze
FROZEN|Turned solid by the cold
GARDEN|A patch where you grow things rather than merely walk
GATE|An opening in a fence that may need oiling
GLASS|A transparent material that reflects a face at night
GOLDEN|The color of a well-baked crust or late-afternoon light
GOODBYE|The farewell at the end of a visit
GUEST|Someone welcomed into another person's home
HANDLE|The part of a door or mug meant to be held
HEAT|What a fire supplies to a cold room
HEAVY|Weighing enough to require both hands
HIDE|Stay out of sight until someone finds you
HILL|An elevation smaller than a mountain
HOLLOW|Empty inside, as an old tree trunk can be
HONEY|A sweet pantry staple supplied by bees
HOUSE|A building that becomes haunted with one adjective
HUNGRY|Ready for the food rather than another photograph of it
HURRY|Move faster because you don't want to be late
INCH|A small distance for a door to stand open
INSIDE|The desirable location when the weather gets unpleasant
JACKET|A shorter outer layer than a coat
JAM|A fruit preserve, or get stuck
JAR|A wide-mouthed container for preserves
JOURNEY|A trip with more story potential than a short errand
KETTLE|The vessel that announces tea with boiling water
KEY|The small object that turns a locked door into an open one
KITCHEN|The room with the best smells before a gathering
KNIFE|A cutting utensil that handles a pumpkin's carving
KNOCK|Announce yourself without using the doorbell
LAMP|A light with a table or floor as its home
LATE|After the expected time, or deep into the evening
LAYER|One of several coverings worn against the cold
LEGEND|An old story that may have grown in the telling
LETTER|A written message, or one piece of a word
LISTEN|Give your ears something to do on purpose
LOCK|A mechanism that makes a key useful
LOST|Unable to find the way out of a maze
LUCK|The factor a superstition claims to control
MATCH|A small stick that can start a large fire
MELT|Become liquid as ice or butter does when warmed
MEMORY|A recollection that a photograph can bring back
MOVIE|A story shown in moving pictures
MUG|A handled cup often occupied by something warm
MUSIC|The soundtrack that tells you a film is about to get tense
MYSTERY|A puzzle whose answer the story withholds
NARROW|Not very wide, as an old staircase might be
NEAR|Close in distance rather than far away
NEEDLE|A pine leaf, or a tiny sewing tool
NEST|A bird's carefully assembled home
NOVEL|A book-length story, or something entirely new
OVEN|The hot box that transforms a tray of dough
PANTRY|The storage area you raid for an evening snack
PATH|A route worn through a garden or woodland
PHOTO|A frozen moment kept without any ice
PIE|A filling with a pastry home
PILLOW|A soft landing for your head
PITCH|A musical note's height, or complete darkness after black
PLOT|A story's sequence of events, or a small piece of land
PORCH|The covered space just outside a front door
PRINT|A mark left behind, as a muddy shoe may make
QUIET|What a house becomes before its smallest sound seems huge
RAIN|Weather best appreciated from behind a window
RECIPE|The instructions between ingredients and dinner
RETURN|Come back after being away
ROAD|A route that can wind through a dark forest
ROOM|A space inside a building, or enough space to move
ROUND|Circular, as a wreath or a pumpkin may be
SAFE|Out of danger, or a locked container
SAUCE|A liquid accompaniment rather than the main dish
SCENE|One part of a film's action in a particular place
SCENT|A smell that can bring a season straight back
SECRET|Something known but not meant to be shared
SEED|A plant's starting point hidden inside its fruit
SHADE|A darker area made by blocking the light
SHUT|Closed, as the window should be on a cold night
SLOW|Unhurried, as a simmering pot should be
SNACK|A small meal with a supporting role in movie night
SOFA|A shared seat that makes staying in an appealing plan
SOFT|Pleasantly yielding, as a fleece blanket is
SOUP|A meal you can drink from a spoon
SOUND|Something heard, or in good condition
SPOON|The utensil a bowl of soup needs
STEEP|Let tea sit in hot water, or describe a sharp hill
STILL|Not moving, or nevertheless
STORY|A tale that can make the dark seem occupied
SUGAR|The sweet crystals in a biscuit recipe
SUNSET|The point at which daylight drops below the horizon
TABLE|The furniture around which a gathering can gather
TALE|A story, not the end of an animal
TEA|A warm drink made by steeping leaves
THUNDER|The sound that follows lightning
TICKET|A small proof that you paid to enter
TOAST|Warm bread, or words spoken with a raised glass
TRACKS|Marks that show where someone or something went
TRAY|A flat carrier for a fresh batch of biscuits
TRUST|Believe someone even when you cannot check
TUNNEL|An underground passage with an entrance and an exit
VISIT|Spend time at someone else's place
WAIT|Stay until something happens
WALK|Travel at the pace of one foot after the other
WALL|A room's vertical boundary
WATCH|Look closely, or a little clock worn on the wrist
WATER|What becomes mist, rain, or ice as conditions change
WINDOW|The opening that turns indoors into a weather-watching seat
WONDER|Curiosity, or a feeling of amazement
WOOD|Tree material with a second career as firewood
YARN|A knitting material that can also mean a long story`);
EXTRA_CLUES.push(...['october','december'].flatMap(season=>cozy.map(e=>({...e,season,id:'library-'+season+'-'+e.word.toLowerCase()}))));
const unique=items=>[...new Map(items.map(e=>[e.word.toUpperCase(),{...e,word:e.word.toUpperCase()}])).values()];
const reviewed=PUZZLE_CATALOG.filter(e=>e.id?.includes('v4-'));
const practice=[...PRACTICE_EDITION_WORDS,...PRACTICE_EDITION_EXTRAS].map(e=>({...e,id:'practice-shared-'+e.difficulty+'-'+e.word.toLowerCase(),season:''}));
export function cluePool(hard=false,season=''){
 // Broad seasonal headings allow related everyday vocabulary as well as the
 // seasonal additions. Nonseasonal months never draw seasonal-only entries.
 const entries=[...reviewed,...practice,...EXTRA_CLUES].filter(e=>(e.season||'')===season&&(e.difficulty===(hard?'hard':'normal')||e.difficulty==='both'));
 return unique(entries).filter(e=>e.word.length>=3&&e.word.length<=11);
}
const themed=EDITION_WORDS.map(e=>({...e,word:e.word.toLowerCase()}));
export function answerPool(hard=false,season=''){
 const list=[...themed.filter(e=>e.season===season&&e.difficulty===(hard?'hard':'normal')),
  ...cluePool(hard,season).filter(e=>e.word.length===5).map(e=>({...e,word:e.word.toLowerCase(),difficulty:hard?'hard':'normal'}))];
 if(!season)list.push(...(hard?SUNDAY_WORDS:DAILY_WORDS).map(word=>({word,difficulty:hard?'hard':'normal',season:'',id:'shared-word-'+word})));
 return [...new Map(list.filter(e=>/^[a-z]{5}$/.test(e.word)).map(e=>[e.word,{...e,theme:season==='october'?'Halloween & autumn':season==='december'?'Christmas & winter':'Everyday words & ideas',id:e.id||'library-word-'+e.word}])).values()];
}
export const LIBRARY_STATS={acceptedMinimum:20148,answers:unique([false,true].flatMap(h=>['','october','december'].flatMap(s=>answerPool(h,s)))).length,clues:unique([false,true].flatMap(h=>['','october','december'].flatMap(s=>cluePool(h,s)))).length};
