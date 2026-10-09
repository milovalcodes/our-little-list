import {activityClock} from './activity-clock.js';

// Original clues, kept separate from the year-round catalog. A saved puzzle is
// immutable; this calendar only chooses content when a NEW round is opened.
export function puzzleSeason(day,now=Date.now()){
 const date=day.includes('-tie-')?activityClock(new Date(now)).calendarDay:day;
 return ({'10':'october','12':'december'})[date.slice(5,7)]||'';
}
function pool(season,difficulty,theme,label,text){
 return {season,difficulty,id:season+'-'+theme,label,entries:text.trim().split('\n').map(line=>{
  const [word,clue]=line.split('|');
  return {id:season+'-'+theme+'-'+difficulty+'-'+word.toLowerCase(),word,clue,difficulty,theme:season+'-'+theme,themeLabel:label,season};
 })};
}
export const SEASONAL_POOLS=[
 pool('october','normal','halloween','Halloween night',`
PUMPKIN|Orange squash ready for carving
COSTUME|Your outfit for trick-or-treating
CANDY|The sweet reward at the door
WITCH|A spell caster with a pointed hat
BROOM|A witch's flying ride
GHOST|A visitor wearing a very simple sheet
SPIDER|Eight-legged web designer
COBWEB|A dusty spider decoration
BAT|Winged mammal in the night sky
MASK|A disguise for your face
TRICK|The alternative to a treat
TREAT|The welcome half of the doorbell phrase
SPELL|Magic put into words
POTION|A witch's bubbling brew
CAULDRON|The big pot for a magic brew
LANTERN|A light carried through the dark
PARTY|A gathering full of costumes
ORANGE|The classic pumpkin colour
BLACK|The other classic Halloween colour
CARVE|Cut a face into a pumpkin
FANGS|A vampire's pointy teeth
CAPE|Fabric trailing behind a vampire
SKULL|A bony head decoration
SKELETON|A whole body of bones`),
 pool('october','normal','horror','A little horror',`
HAUNT|What a ghost does to a house
CREEPY|Giving you an uneasy feeling
SCREAM|A very loud frightened sound
SHADOW|A dark shape cast by a light
MONSTER|A creature under the bed, perhaps
ZOMBIE|An undead shuffler
VAMPIRE|A fictional blood drinker
MUMMY|A monster wrapped in bandages
WEREWOLF|A person who changes at the full moon
HOWL|A wolf's long cry
CREAK|The sound of an old door opening
ATTIC|Top room where a spooky noise lives
CELLAR|The room below the house
MIRROR|A reflection might surprise you in this
FOG|Mist hiding the path ahead
NIGHT|When the spooky story usually starts
SCARY|Likely to make you jump
THUNDER|A storm's dramatic rumble
CHASE|Run after someone in a scary scene
ESCAPE|Get out of the haunted house
SHIVER|Tremble from fear or cold
EERIE|Strangely unsettling
BEAST|A large frightening creature
DOOM|A terrible fate in a scary story`),
 pool('october','normal','fall','Fall days',`
AUTUMN|Another name for fall
LEAVES|They turn red and gold on trees
ACORN|An oak tree's little seed
MAPLE|Tree famous for colourful leaves and syrup
CIDER|An apple drink for a cool day
APPLE|Fruit picked at an orchard
ORCHARD|Rows of fruit trees
HARVEST|Gather the season's crops
SQUASH|Vegetable family with butternut and acorn kinds
GOURD|Decorative cousin of a pumpkin
SCARF|A cosy wrap around your neck
SWEATER|A knitted layer for a crisp day
BOOTS|Footwear for a muddy walk
RAKE|Garden tool for fallen leaves
HAYRIDE|A wagon trip on straw bales
MAZE|A cornfield puzzle to walk through
CORN|Crop used to build an autumn maze
SPICE|Cinnamon is one of these
CLOVE|A small aromatic spice shaped like a nail
NUTMEG|Warm spice grated into a fall drink
BONFIRE|A big outdoor fire
BLANKET|A cosy cover for chilly evenings
CRISP|Pleasantly cool, like autumn air
CHESTNUT|Brown nut often roasted`),
 pool('october','hard','halloween','Halloween lore',`
SAMHAIN|Gaelic festival marking the end of harvest
GRIMOIRE|A book of magical instructions
ATHAME|A ceremonial blade in some witchcraft traditions
SIGIL|A symbol used in magic
COVEN|A gathering of witches
HEX|A curse in three letters
SABBAT|A seasonal festival in some pagan traditions
SCRYING|Seeking visions in a crystal or reflective surface
FAMILIAR|An animal companion to a fictional witch
MANDRAKE|A legendary screaming root
MUGWORT|An aromatic herb associated with folklore
WOLFSBANE|Poisonous plant named for a wolf's ruin
AMULET|An object worn for magical protection
TALISMAN|An object believed to bring magical luck
INCENSE|A fragrant substance burned in rituals
OCCULT|Relating to hidden or supernatural knowledge
ARCANE|Known or understood by only a few
GLYPH|A carved symbolic character
RUNE|A letter from an old Germanic alphabet
OMEN|A sign believed to predict an event
SPECTER|A ghostly apparition, American spelling
PHANTOM|An apparition with no solid body
ENCHANT|Place under a magical spell
WARLOCK|A male sorcerer in fantasy stories`),
 pool('october','hard','horror','Gothic horror',`
WRAITH|A ghostlike image of someone
REVENANT|One who returns from the dead
POLTERGEIST|A noisy ghost that moves objects
NOSFERATU|The title vampire of a 1922 silent film
LYCANTHROPY|The mythical transformation into a wolf
MACABRE|Grimly concerned with death
GHOUL|A graveyard monster in folklore
CRYPT|An underground burial chamber
SEPULCHER|A burial chamber, American spelling
OSSUARY|A container or place for human bones
MAUSOLEUM|A large above-ground tomb
BANSHEE|Irish spirit whose wail foretells death
DOPPELGANGER|A person's uncanny double
ELDRITCH|Strange and otherworldly in an unsettling way
ABERRANT|Departing from what is normal
PALLOR|An unusual paleness
CADAVER|A dead body used in study
PHOBIA|An intense, persistent fear
OMINOUS|Suggesting something bad is coming
LURID|Shockingly vivid or sensational
CHARNEL|Describing a place where bones are stored
RAVEN|Poe's bird that says Nevermore
SHROUD|A cloth wrapping for the dead
DIRGE|A song of mourning`),
 pool('october','hard','fall','Autumn details',`
EQUINOX|The seasonal point with nearly equal day and night
RUSSET|A reddish-brown autumn colour
OCHRE|An earthy yellow pigment
SIENNA|An earth pigment named after an Italian city
UMBER|A dark brown earth pigment
TAWNY|A warm orange-brown colour
DECIDUOUS|Describing trees that shed leaves annually
ABSCISSION|The natural shedding of a leaf
SENESCENCE|The biological process of growing old
PERSIMMON|An orange autumn fruit with a leafy cap
QUINCE|A fragrant yellow fruit often cooked into jelly
MEDLAR|A fruit traditionally eaten after softening
BRAMBLE|A prickly shrub bearing blackberries
BRACKEN|A large fern that turns brown in autumn
THATCH|A roof covering made of straw or reeds
STUBBLE|Short crop stalks left after harvest
SHEAF|A bundle of cut grain stalks
WINNOW|Separate grain from chaff using air
GLEAN|Gather leftover crops after harvest
CHAFE|Rub and cause irritation
CHILL|A slight coldness in the air
SLOE|The dark fruit of the blackthorn
COPSE|A small group of trees
BOUGH|A main branch of a tree`),
 pool('december','normal','christmas','Christmas things',`
SANTA|The visitor in a red suit
ELVES|Santa's tiny workshop helpers
SLEIGH|Santa's flying ride
REINDEER|Animals pulling Santa's ride
RUDOLPH|Reindeer with a glowing red nose
GIFTS|Wrapped surprises under the tree
RIBBON|A strip tied around a present
BOW|A ribbon knot on a gift
TREE|The centrepiece covered in ornaments
STAR|A bright shape on top of a tree
ANGEL|A winged tree topper
TINSEL|Shiny strands draped on branches
LIGHTS|A glowing string around the tree
CAROL|A Christmas song
BELLS|They jingle in a holiday song
HOLLY|Plant with prickly leaves and red berries
WREATH|A ring of greenery on a door
STOCKING|A large festive sock for gifts
COOKIE|A baked treat left out for Santa
COCOA|A warm chocolate drink
CHIMNEY|Santa's storybook way into a house
TOYS|Playthings from the workshop
FEAST|A large celebration meal
MERRY|The word before Christmas in a greeting`),
 pool('december','normal','winter','Winter days',`
WINTER|The coldest season
SNOW|White flakes falling from the sky
SNOWMAN|A snowy figure with a carrot nose
SNOWBALL|A handful of snow shaped for throwing
FROST|A thin icy coating on a window
ICICLE|A pointed piece of hanging ice
MITTENS|Hand coverings with one space for four fingers
SCARF|A warm wrap around your neck
BEANIE|A close-fitting knitted hat
COAT|An outer layer against the cold
BOOTS|Warm footwear for snowy paths
SLED|A small ride down a snowy hill
SKATES|Boots with blades for an ice rink
SKI|One of a pair of runners for snowy slopes
SLOPE|The downhill part of a ski trip
FLAKE|One small piece of falling snow
CHILLY|A little cold
FREEZE|Turn water into ice
FIRE|A warm glow in the hearth
HEARTH|The floor area in front of a fireplace
BLANKET|A soft layer for a cold evening
SOUP|A warm meal served in a bowl
PINE|An evergreen tree with needles
POLAR|Relating to the Earth's far north or south`),
 pool('december','hard','christmas','Christmas traditions',`
ADVENT|The season leading up to Christmas
NOEL|A Christmas word borrowed from French
YULE|An old name for the midwinter festival
WASSAIL|A warm spiced drink and festive toast
FRANKINCENSE|A fragrant resin among the Magi's gifts
MYRRH|Another resin among the Magi's gifts
EPIPHANY|January feast traditionally associated with the Magi
MAGI|The wise visitors in the Nativity story
NATIVITY|The birth scene depicted in a Christmas display
MANGER|An animal feeding trough in that scene
BAUBLE|A small decorative ornament
GARLAND|A long decorative chain of greenery
MISTLETOE|Plant hung above a holiday kiss
POINSETTIA|Holiday plant with colourful leaflike bracts
NUTCRACKER|A wooden figure and a Tchaikovsky ballet
STOLLEN|German fruit bread dusted with sugar
PANETTONE|Tall Italian sweet bread with dried fruit
MARZIPAN|A sweet paste made from almonds
PRALINE|A confection made with nuts and sugar
EGGNOG|A rich holiday drink made with eggs
KRAMPUS|Horned figure in Alpine Christmas folklore
VIXEN|One of Santa's reindeer, also a female fox
BLITZEN|Reindeer whose German name means lightning
DASHER|A reindeer with a speedy-sounding name`),
 pool('december','hard','winter','Deep winter',`
SOLSTICE|The turning point with the year's shortest daylight
HOARFROST|A white deposit of ice crystals
RIME|Ice deposited from freezing fog
SLEET|Frozen or partly frozen precipitation
GRAUPEL|Soft pellets formed when snow collects frozen droplets
FIRN|Old compacted snow not yet glacial ice
NEVE|Granular snow in the upper part of a glacier
GLACIER|A slow-moving mass of ice
CREVASSE|A deep crack in glacial ice
SERAC|A tower of ice on a glacier
MORAINE|Rock debris deposited by a glacier
TUNDRA|Cold, largely treeless land
TAIGA|The northern coniferous forest belt
BOREAL|Relating to northern regions
AURORA|Coloured light shimmering in a polar sky
ALBEDO|The proportion of light a surface reflects
PERMAFROST|Ground frozen for at least two consecutive years
SASTRUGI|Wind-carved ridges on a snow surface
ANORAK|A hooded jacket for cold weather
PARKA|A thick coat with a hood
BALACLAVA|A covering for the head and neck
CRAMPON|A spiked fitting for a mountaineering boot
PULK|A sled used to haul equipment over snow
APRES|The French word before ski for the social time after`),
];

function words(season,difficulty,theme,text){return text.split(' ').map(word=>({word,season,difficulty,theme,id:'word-'+season+'-'+difficulty+'-'+word}));}
export const SEASONAL_WORDS=[
 ...words('october','normal','Halloween night','witch ghost candy treat trick spell broom magic skull fangs masks cloak carve eerie spook'),
 ...words('october','normal','A little horror','haunt scary creep beast night creak shock blood dread'),
 ...words('october','normal','Fall days','acorn maple cider apple gourd spice clove crisp amber maize rakes boots scarf leafy'),
 ...words('october','hard','Halloween & horror lore','coven crypt ghoul hexed lurid wails crone dirge'),
 ...words('october','hard','Autumn details','ochre umber tawny sheaf glean bough copse chaff loamy mulch oaken'),
 ...words('december','normal','Christmas things','santa elves gifts holly merry jolly bells carol angel candy feast cocoa wraps'),
 ...words('december','normal','Winter days','snowy frost flake scarf boots wooly'),
 ...words('december','normal','Christmas things','green white shine light sugar sweet dance party peace glows'),
 ...words('december','normal','Winter days','chill polar icily skate skier sleds pines fires'),
 ...words('december','hard','Christmas traditions','myrrh vixen magus noels'),
 ...words('december','hard','Deep winter','sleet taiga parka nival serac rimes firns neves apres hoary glint eider floes bergs gelid rimer'),
];
export function seasonalWords(season,hard=false){return SEASONAL_WORDS.filter(e=>e.season===season&&e.difficulty===(hard?'hard':'normal'));}
