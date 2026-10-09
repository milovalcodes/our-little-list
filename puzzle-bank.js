// Original short clues. No artwork, code or puzzle data from the reference APK.
const pairs=text=>text.trim().split('\n').map(line=>{const [word,clue]=line.split('|');return {word,clue};});
export const EASY_CLUES=pairs(`
APPLE|Fruit that keeps the doctor away, supposedly
BEACH|Sand, waves, and probably a sunburn
BREAD|The outside of a sandwich
CHAIR|Please take a seat
CLOUD|A sky cushion, sort of
DANCE|Move to the music
DREAM|A story your sleeping brain makes
EARTH|Our planet
FLAME|The bright part of a candle
GRAPE|A tiny fruit that grows in bunches
HEART|It beats for a living
HONEY|A bee's sweet project
HOUSE|A place with rooms and a roof
JUICE|Fruit you can drink
LAUGH|What a good joke gets
LEMON|Sour yellow citrus
LIGHT|What a lamp gives off
MAGIC|A rabbit from a hat, perhaps
MANGO|Orange-fleshed tropical fruit
MUSIC|Songs, sounds, and rhythm
NIGHT|The sun's time off
OCEAN|A very large body of salt water
OLIVE|Small fruit often pressed for oil
PASTA|Spaghetti's food family
PEACH|Fuzzy fruit with a pit
PIANO|Instrument with black and white keys
PIZZA|A slice with cheese and toppings
PLANT|Give it water and some sunlight
RAIN|Water falling from clouds
RIVER|Water flowing toward the sea
ROBOT|A machine that follows instructions
SALAD|A bowl of leafy possibilities
SHEEP|Woolly farm animal
SMILE|A little curve on a happy face
SNAIL|Carries a shell and takes its time
SPACE|The place beyond Earth's atmosphere
SPOON|Soup's favourite utensil
STARS|Tiny lights in the night sky
STORY|Something that begins, happens, and ends
SUGAR|Sweet crystals for your coffee
TABLE|Dinner sits on it
TEA|Leaves steeped in hot water
TIGER|A big striped cat
TOAST|Bread, but warmer and crunchier
TRAIN|Transport that follows tracks
WATER|The drink your plants also like
WHALE|A huge ocean mammal
WHEEL|A round thing that helps a bike move
WINDOW|Glass you can look through
WINTER|The season after autumn
YELLOW|The colour of a ripe banana
ZEBRA|A striped relative of the horse
BRIDGE|It gets you across a river
BUTTER|Spread made from cream
CAMERA|A device for taking photos
CANDLE|Wax with a wick
CHERRY|Small red fruit, often sold in pairs
COFFEE|A brewed bean drink
COOKIE|A small baked treat
COTTON|Soft fibre used for T-shirts
FLOWER|The blooming part of a plant
FOREST|A lot of trees together
GARDEN|A place to grow flowers or food
GUITAR|A stringed instrument you can strum
ISLAND|Land surrounded by water
JACKET|An extra layer with sleeves
KITTEN|A very young cat
MARKET|A place where people sell things
MEADOW|An open grassy field
MIRROR|It shows your reflection
MONKEY|A primate often seen climbing trees
ORANGE|A citrus fruit and a colour
PILLOW|Your head's soft landing
PLANET|A world that orbits a star
POCKET|A small built-in place for your keys
PURPLE|A colour made with red and blue
RABBIT|Long-eared animal that hops
ROCKET|A vehicle launched into space
SHADOW|The dark shape made by blocked light
SILVER|A metal with the symbol Ag
SUMMER|The season after spring
SUNSET|The sun slipping below the horizon
TURTLE|A reptile with a protective shell
VELVET|Fabric with a soft, short pile
WAFFLE|Breakfast with little square pockets
WALLET|A holder for money and cards
ANCHOR|It helps keep a boat in place
BASKET|A woven container with a handle
BUBBLE|A thin ball of air and liquid
CASTLE|A fortified home with towers
DESERT|A very dry region
FEATHER|A bird's lightweight covering
FROG|An amphibian that begins as a tadpole
GHOST|A spooky visitor in a story
MOON|Earth's natural satellite
SOCK|A little fabric home for a foot
SOUP|A meal you usually eat with a spoon
STAR|The sun is one
TREE|A tall plant with a woody trunk
WAVE|A moving ridge on the sea
BOOK|Bound pages you can read
CAT|A small pet that purrs
DOG|A pet that barks
EGG|It has a shell, a yolk, and a white
ICE|Frozen water
MAP|A drawing that helps you find places
OWL|A bird associated with wisdom
SUN|The star at the centre of our system
WEB|A spider's silk construction
YARN|Thread used for knitting
HAT|Something worn on your head
LAMP|A portable source of light
ROSE|A flower famous for its thorns
SHIP|A large vessel that travels on water
SNOW|Frozen flakes falling from the sky
SOAP|It helps wash dirt away
NEST|A bird's home for eggs
PEAR|A fruit with a narrow top and round base
RAINBOW|An arc of colours after rain
PANCAKE|A flat breakfast cake from a pan
BLANKET|A warm covering for a nap
POPCORN|Kernels that puff when heated
HAMMOCK|A hanging bed between two supports
PENGUIN|A flightless bird in a little tuxedo
UNICORN|A mythical horse with one horn
AVOCADO|Green fruit used for guacamole
DINOSAUR|An animal from long before humans
SANDWICH|A filling between pieces of bread
UMBRELLA|A portable roof for rainy days
STICKER|A little picture with a sticky back
NOODLE|A long strip of pasta
PUDDING|A soft, sweet dessert
PICKLE|A cucumber preserved in brine
GOBLIN|A mischievous creature in folklore
NUGGET|A small lump, or a bite of chicken
WAFFLES|Breakfast grids, in the plural
COZY|Comfortably warm and snug
BOOP|A playful little tap on a nose
BANANA|A curved fruit with a yellow peel
KIWI|A fuzzy fruit with a green or golden centre
PAPAYA|A tropical fruit with many small black seeds
PLUM|A smooth-skinned stone fruit, often purple
GUAVA|A tropical fruit often made into pink paste
MELON|Cantaloupe is one kind of this fruit
LYCHEE|A small fruit with rough red skin and pale flesh
APRICOT|A small orange fruit related to the peach
FIG|A soft fruit famously tucked into a filled biscuit
LIME|A green citrus often squeezed into drinks
COCONUT|A tropical fruit with a hard, hairy shell
DATE|A sweet fruit that grows on a palm
RAISIN|A grape that has been dried
POMELO|A very large citrus related to grapefruit
QUINCE|A firm yellow fruit often cooked into jelly
CORAL|Tiny sea animals that build reefs
SHARK|A fish with a skeleton made of cartilage
SHELL|A hard covering washed up on the beach
CRAB|A sideways-walking animal with claws
SEAL|A flippered mammal that rests on shores
TIDE|The regular rise and fall of the sea
SAND|Tiny grains covering a beach
REEF|An underwater ridge, often made of coral
KELP|A large brown seaweed
SQUID|A sea animal with eight arms and two longer tentacles
OCTOPUS|An ocean animal with eight arms
LOBSTER|A large sea crustacean with a hard shell
SHRIMP|A small swimming crustacean
DOLPHIN|An ocean mammal known for clicks and whistles
SEAGULL|A coastal bird likely eyeing your chips
STARFISH|A sea animal shaped like a five-pointed star
SEAHORSE|A small fish with a curled tail and horse-like head
JELLYFISH|A drifting sea animal with stinging tentacles
SAIL|A sheet of fabric that catches wind on a boat
BOAT|A small craft for travelling on water
`);
export const HARD_CLUES=pairs(`
ABACUS|Counting frame with sliding beads
ABYSS|A seemingly bottomless gulf
ACUMEN|Sharp practical judgement
ADAGE|A short traditional saying
AEGIS|Protection, from the name of a mythical shield
AGATE|Banded variety of chalcedony
ALCOVE|A small recess in a room
ALIBI|Evidence that someone was elsewhere
ALLOY|A mixture of metals
AMBER|Fossilised tree resin
AMULET|An object worn for protection or luck
ANEMONE|A windflower, or a tentacled sea animal
APOGEE|The farthest orbital point from Earth
ARCANE|Understood by very few
ARID|Extremely dry
ATOLL|A ring-shaped coral island
AURORA|Coloured lights near the poles
AXIOM|A statement accepted as a starting truth
BASALT|Dark volcanic rock
BASILISK|A legendary reptile with a deadly gaze
BERYL|Mineral family that includes emerald
CADENCE|The rhythmic flow of a phrase
CAMEO|A brief appearance by a notable performer
CANOPY|An overhead covering, such as treetops
CHASM|A deep cleft in the ground
CHIMERA|A mythical creature assembled from several animals
CIPHER|A system for disguising a message
COBALT|Metal whose symbol is Co
CODA|A musical passage that brings a piece to an end
CORONA|The sun's outer atmosphere
CUSP|A pointed tip, or the brink of a change
DAHLIA|Garden flower named for botanist Anders Dahl
DEW|Moisture condensed on a cool surface
DIADEM|A jewelled crown or headband
ECLIPSE|One celestial body obscuring another
EDDY|A small circular current
ELEGY|A poem of mourning
ELIXIR|A supposedly magical potion
EMBOSSED|Decorated with a raised design
ENIGMA|Something difficult to understand
EPOCH|A distinctive period of time
EQUINOX|When day and night are roughly equal in length
ETCH|Cut a design into a surface
ETHER|An old name for the upper sky
FABLE|A short story with a moral
FACET|One flat surface of a cut gem
FJORD|A narrow sea inlet with steep sides
FLINT|Stone once used to strike sparks
FRACTAL|A shape with repeating detail at different scales
FUGUE|A composition with interweaving versions of a theme
GARNET|A gemstone often deep red
GAZEBO|A small open-sided garden pavilion
GEODE|A hollow rock lined with crystals
GLYPH|A carved or written symbol
GOSSAMER|Something as fine and light as spider silk
GROTTO|A small picturesque cave
HALCYON|Peaceful and happy, especially of a past time
HAIKU|A short Japanese poetic form
HELIUM|The element with atomic number two
HERON|A long-legged wading bird
HIATUS|A pause or break in continuity
IBIS|A wading bird with a curved bill
IDYLL|A peaceful, idealised scene
IRIS|The coloured ring around the pupil
ISOBAR|A line joining places of equal air pressure
JADE|A green ornamental stone
JASPER|An opaque variety of quartz
JUXTAPOSE|Place side by side for contrast
KESTREL|A small falcon known for hovering
LAGOON|Shallow water separated from the sea
LAPIS|The blue stone in the name ___ lazuli
LATTICE|A structure of crossed strips
LICHEN|A partnership involving a fungus and a photosynthetic organism
LILAC|A shrub with fragrant pale-purple flowers
LILT|A cheerful rise and fall in the voice
LIMINAL|Relating to a threshold or transition
LUMEN|A unit of luminous flux
LYRE|An ancient stringed instrument
MANTLE|A cloak, or Earth's layer below its crust
MARIGOLD|A garden flower often orange or yellow
MIRAGE|An optical illusion caused by bent light
MOSAIC|A picture made from small pieces
MYRIAD|A very large number
NACRE|Mother-of-pearl
NADIR|The lowest point
NAUTILUS|A sea creature with a chambered shell
NEBULA|A cloud of gas and dust in space
NEXUS|A connection or central link
NIMBUS|A luminous cloud or halo
OASIS|A fertile spot in a desert
OBELISK|A tall four-sided monument with a pointed top
OBSIDIAN|Dark volcanic glass
OCHRE|An earthy yellow or red pigment
ONYX|A banded ornamental stone
OPAL|A gemstone known for flashes of colour
ORBIT|The path of one body around another
PAPYRUS|An ancient writing material made from a reed
PARADOX|A statement that seems contradictory
PATINA|A surface appearance acquired with age
PETRICHOR|The pleasant smell after rain on dry ground
PLINTH|A base supporting a statue or column
PRISM|Glass that can split light into colours
QUARTZ|A common crystalline mineral
QUILL|A feather used as a writing pen
QUIRK|An unusual personal habit
QUORUM|The minimum attendance needed for official business
RAVINE|A deep narrow valley
REBUS|A puzzle that represents words with pictures
RELIC|An object surviving from the past
RUNE|A character in an ancient Germanic alphabet
SAFFRON|A spice made from crocus stigmas
SATORI|A sudden moment of enlightenment in Zen
SCARAB|A beetle symbol used in ancient Egypt
SEPAL|One part of a flower's outer protective whorl
SIENNA|An earth pigment named for an Italian city
SOLSTICE|When the sun reaches its most northerly or southerly declination
SPHINX|A mythical creature with a human head and lion's body
STANZA|A grouped set of lines in a poem
TALISMAN|An object thought to bring good fortune
TESSERA|One small tile in a mosaic
THISTLE|A prickly plant with purple flower heads
TORQUE|A force's tendency to cause rotation
TRYST|An arranged romantic meeting
UMBRA|The darkest central part of a shadow
VERDANT|Green with growing plants
VESPER|An evening prayer or evening star
VORTEX|A swirling mass of fluid
WREN|A small songbird with a short upright tail
XYLEM|Plant tissue that transports water from the roots
YONDER|At some distance in the direction indicated
ZENITH|The point directly overhead
ZEPHYR|A gentle breeze
ZIRCON|A gemstone containing zirconium
PELAGIC|Relating to the open sea rather than its floor
BENTHIC|Relating to the bottom of a body of water
ESTUARY|Where a river meets the sea
BRACKISH|Slightly salty, as water where river and sea mix
SALINITY|The amount of dissolved salt in water
UPWELLING|Deep ocean water rising toward the surface
GYRE|A large system of circulating ocean currents
HALOCLINE|A water layer where salinity changes rapidly with depth
BATHYAL|Of the deep ocean zone below the continental shelf
NERITIC|Relating to shallow sea water over a continental shelf
PLANKTON|Organisms drifting with water currents
BIVALVE|A mollusc whose shell has two hinged parts
CEPHALOPOD|The mollusc group containing squid and octopuses
COPEPOD|A tiny crustacean common in plankton
KRILL|Small shrimp-like animals eaten by many whales
MORAY|A reef-dwelling eel often seen peeking from a crevice
REMORA|A fish that attaches to larger animals with a suction disc
DIATOM|A microscopic alga with a glass-like silica wall
HALIBUT|A large flatfish with both eyes on one side
CONCH|A sea snail with a large spiral shell
WHELK|A marine snail with a pointed spiral shell
MUREX|A sea snail once used to make royal purple dye
ABALONE|An edible sea snail with a pearly, ear-shaped shell
LIMPET|A cone-shelled mollusc that clings to rocks
OYSTER|A two-shelled mollusc that may produce a pearl
BRINE|Water with a high concentration of salt
`);
