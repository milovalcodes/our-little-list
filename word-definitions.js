// Original, plain-language definitions for answers that had no clue in v121.
// Headings are semantic subjects, not difficulty labels. Keep spelling explicit.
export const WORD_DEFINITIONS = {};
function add(theme, text) {
 for (const row of text.trim().split('\n')) {
  const [word, clue] = row.split('|');
  if (!word || !clue || WORD_DEFINITIONS[word]) throw Error('Invalid word definition: '+word);
  WORD_DEFINITIONS[word] = {clue, theme};
 }
}
add('Food & cooking', `
APRON|A protective garment tied over clothes while cooking
GRAPE|A small vine-grown fruit eaten fresh or made into wine
JUICE|Liquid squeezed from fruit or vegetables
LEMON|A yellow citrus fruit with a sour taste
LUNCH|The meal usually eaten around midday
OLIVE|A small oily fruit often served in a martini
PEACH|A soft, fuzzy-skinned fruit with a large stone
PLATE|A flat dish on which food is served
SALAD|A dish of mixed ingredients, often with leafy greens
SLICE|A thin, flat piece cut from a larger food
STOVE|A kitchen appliance with burners for cooking
WHEAT|A cereal grain commonly ground into bread flour
FRUIT|The seed-bearing part of a plant, such as an apple
MELON|A large, juicy fruit with a thick rind
PIZZA|A baked dough base topped with sauce and cheese
SPICE|An aromatic plant ingredient used to flavor food
BAGEL|A ring-shaped bread boiled before baking
BAKER|Someone who makes bread, cakes, or pastries
BASIL|A fragrant herb used in pesto
BERRY|A small, juicy fruit such as a raspberry
CHIPS|Thin, crisp slices of fried potato
DAIRY|Milk and foods made from it
DONUT|A sweet fried dough ring, often glazed
DOUGH|An unbaked mixture of flour and liquid
DRINK|A liquid meant to be swallowed
FLOUR|Finely ground grain used in baking
GRAVY|A sauce made from meat juices
GRILL|Cook food over direct heat on a metal rack
GUAVA|A tropical fruit with fragrant flesh and many seeds
GUMMY|Chewy and sticky, like a gelatin candy
JELLY|A clear fruit spread set with pectin
JUICY|Full of liquid, as a ripe peach is
LATTE|Espresso mixed with steamed milk
MINTY|Having the cool flavor of peppermint
MOCHA|A coffee drink flavored with chocolate
NACHO|A tortilla chip served with melted cheese
ONION|A layered bulb used in cooking that can make eyes water
PECAN|A smooth-shelled nut used in a familiar Southern pie
PINCH|A small amount held between finger and thumb
RAMEN|Japanese noodles served in broth
ROAST|Cook with dry heat in an oven
SUSHI|A Japanese dish of seasoned rice with various toppings
SYRUP|A thick, sweet liquid poured over pancakes
TANGY|Having a pleasantly sharp, sour flavor
TASTE|The sense that detects sweetness and bitterness
TASTY|Pleasant to eat because of its flavor
WAFER|A very thin, crisp biscuit
WHISK|A kitchen tool with wire loops for beating ingredients
YEAST|A microorganism that makes bread dough rise
ZESTY|Having a lively, pleasantly sharp flavor
KNEAD|Work dough by pressing and folding it
BRINE|Very salty water used to preserve food
BROIL|Cook food directly beneath intense heat
CREPE|A very thin pancake
CUMIN|An earthy spice often used in curries
GRUEL|A thin porridge made by boiling grain in water
QUART|A liquid measure equal to two US pints
SQUAB|A young pigeon, especially one raised for food
TEPID|Only slightly warm, as neglected tea might be
TUBER|An underground plant part that stores food, like a potato
VEGAN|Eating no animal products
YOLKY|Containing much of the yellow part of an egg`);
add('Animals & their features', `
MOUSE|A small rodent with a pointed snout and a long tail
SHARK|A fish with a cartilaginous skeleton and rows of teeth
TIGER|A large wild cat with dark stripes
WHALE|A large marine mammal that breathes air
EAGLE|A large bird of prey with powerful talons
PUPPY|A young dog
ROBIN|A songbird known for a reddish breast
SQUID|A sea animal with eight arms and two longer tentacles
BUGGY|Infested with insects, as a campsite might be
BUNNY|An affectionate name for a rabbit
CAMEL|A desert mammal with one or two humps
DUCKY|An affectionate name for a little duck
GECKO|A small lizard often able to climb smooth walls
GOOSE|A long-necked water bird larger than a duck
HIPPO|A large African mammal that spends much of its day in water
HORSE|A hoofed animal ridden by people
HOUND|A dog bred to track or hunt
KITTY|An affectionate name for a cat
KOALA|An Australian marsupial that eats eucalyptus leaves
LEASH|A strap used to keep a dog close on a walk
LLAMA|A South American pack animal related to the camel
POOCH|An informal name for a dog
SHEEP|A wool-bearing farm animal
SLOTH|A slow-moving tree-dwelling mammal
SNAIL|A soft-bodied animal that carries a spiral shell
SNAKE|A long, legless reptile
SNOOT|An informal word for an animal's nose or snout
WINGS|The paired limbs a bird uses to fly
FANGS|Long pointed teeth used to bite prey
HOWLS|Long, drawn-out cries made by wolves
BOOBY|A tropical seabird with large webbed feet
APHID|A tiny insect that feeds on plant sap
AVIAN|Relating to birds
CORGI|A short-legged herding dog with upright ears
EIDER|A sea duck whose soft down is used in bedding
FERAL|Living wild after domestication
HYENA|An African carnivore known for a laugh-like call
QUAIL|A small ground-dwelling game bird
RHINO|A large thick-skinned mammal with a horn on its nose
SNARL|A growl that exposes an animal's teeth
SNOUT|The projecting nose and mouth of an animal
SPAWN|The eggs laid by fish or frogs
STORK|A long-legged wading bird with a long bill
TABBY|A domestic cat with a striped or mottled coat
TALON|A bird of prey's sharp claw
UDDER|The milk-producing organ of a cow
VENOM|Poison delivered by a bite or sting
VIXEN|A female fox
FURRY|Covered with soft animal hair`);
add('Plants & growing things', `
PLANT|A living thing that usually makes food from sunlight
THORN|A sharp, pointed growth on a stem
BLOOM|A flower, or the act of producing flowers
GRASS|The narrow-leaved plants that make up a lawn
TULIP|A spring flower grown from a bulb
CEDAR|An evergreen tree known for fragrant wood
DAISY|A flower with a round center and surrounding petals
HAZEL|A shrub that produces small edible nuts
HUMUS|Dark soil material formed from decayed organic matter
LEAFY|Covered with many flat green plant parts
LILAC|A shrub with fragrant purple or white flower clusters
SPRIG|A small stem bearing leaves or flowers
SEEDS|Plant structures from which new plants can grow
HOLLY|An evergreen plant with prickly leaves and red berries
PADDY|A flooded field in which rice is grown
CHAFF|The dry husks separated from grain
FAUNA|The animals of a particular region
FLORA|The plants of a particular region
HEDGE|A row of shrubs grown as a boundary
KUDZU|A fast-growing climbing vine
MULCH|Material spread over soil to retain moisture
OAKEN|Made from the wood of an oak tree
PEONY|A garden plant with large, showy flowers
REEDY|Full of tall, slender wetland plants
SAPPY|Full of a plant's sticky liquid
BOUGH|A large branch of a tree
WOODY|Hard and fibrous like a tree's stem`);
add('Land, water & weather', `
COAST|The land beside the sea
CORAL|A hard structure built by tiny marine animals
EARTH|The planet we live on, or the soil beneath our feet
OCEAN|A vast body of salt water
RIVER|A natural stream of water flowing toward a sea or lake
STONE|A small piece of rock
WORLD|The planet and all the people and places on it
BEACH|A strip of sand or pebbles beside water
MARSH|Low, wet land with grasses and reeds
RAINY|Having frequent falling drops of water
SUNNY|Bright with direct sunlight
CANAL|An artificial waterway used for transport or irrigation
DUSTY|Covered in fine, dry particles
FIERY|Burning strongly or resembling flames
MOIST|Slightly wet
NORTH|The compass direction opposite south
ROCKY|Covered in stones or exposed rock
SANDY|Covered with loose grains of rock
SNOWY|Covered with frozen flakes of water
SOUTH|The compass direction opposite north
SWAMP|Wetland often containing trees and standing water
WINDY|Having a lot of moving air
SMOKY|Filled with particles from burning material
POLAR|Relating to Earth's far northern or southern regions
ABYSS|An extremely deep gulf or chasm
OZONE|A form of oxygen that helps block ultraviolet sunlight
SOGGY|Soaked with water and unpleasantly soft
ATOLL|A ring-shaped coral island enclosing a lagoon
BALMY|Pleasantly warm, as mild evening weather
BAYOU|A slow-moving waterway in a marshy area
CHASM|A deep, wide opening in the ground
DELTA|Land formed from sediment at a river's mouth
ERODE|Wear away gradually through water, wind, or friction
FJORD|A long, narrow sea inlet between steep cliffs
FOAMY|Covered with a mass of small bubbles
GULCH|A narrow, steep-sided ravine
KNOLL|A small, rounded hill
LOAMY|Rich in a balanced mixture of sand, silt, and clay
VAPOR|A substance in its gaseous form
FOGGY|Filled with a thick cloud of tiny water droplets
ICILY|In an extremely cold or unfriendly manner
SLICK|Smooth and slippery
THAWS|Becomes unfrozen as the temperature rises`);
add('Clothes & personal belongings', `
BADGE|A small emblem worn to show a role or membership
CROWN|A ceremonial headpiece worn by a monarch
DIARY|A book for recording personal experiences day by day
DRESS|A one-piece garment with a skirt
MEDAL|A small metal award, often worn on a ribbon
PEARL|A smooth round gem formed inside a mollusk
SHIRT|A garment covering the upper body, usually with sleeves
BEADS|Small pierced pieces threaded into jewelry
DENIM|The sturdy cotton fabric used for jeans
LINEN|Fabric made from the fibers of the flax plant
NYLON|A synthetic fiber used in clothing and rope
PANTS|A garment with a separate section for each leg
SHOES|Outer coverings for the feet
SKIRT|A garment that hangs from the waist without separate legs
SOCKS|Soft coverings worn on the feet inside shoes
WOOLY|Covered with wool or resembling its texture
MASKS|Coverings worn over the face as a disguise
CAPES|Sleeveless outer garments that hang from the shoulders
KHAKI|A light brown fabric or color often used for uniforms
ROUGE|Red makeup applied to the cheeks
BEZEL|The rim that holds a gemstone or watch face in place
CARAT|A unit used to measure the weight of a gemstone
GAUZE|Thin, loosely woven fabric used for dressings
GAUZY|Thin and translucent, like a sheer curtain
JEWEL|A precious stone cut for decoration
LAPEL|The folded part of a jacket's front collar
MAUVE|A pale purple color
PARKA|A warm, hooded coat
PLUME|A long feather used as an ornament
TIARA|A jeweled ornamental headband
TULLE|Fine netting used for veils and ballet skirts
VOGUE|The fashion or style popular at a particular time`);
add('Home, tools & materials', `
BASIN|A bowl-shaped container used for washing
BLADE|The flat cutting part of a knife
BRUSH|A tool with bristles for cleaning or painting
CRATE|A sturdy slatted box for carrying goods
FLASK|A narrow-necked container for liquids
LABEL|A tag that identifies an item
METAL|A material such as iron or copper that conducts heat
PAINT|A colored liquid coating applied to a surface
PANEL|A flat section of a wall, door, or other surface
SHEET|A large thin piece of fabric, paper, or other material
STAIR|One step in a flight between floors
BLOCK|A solid piece of material, often with flat sides
BRASS|A yellow alloy of copper and zinc
CABIN|A small, simple house, often made of wood
CHALK|A soft white material used to write on a board
COUCH|A long upholstered seat for several people
DUVET|A soft quilt filled with down or synthetic fibers
GLOSS|A shiny finish on a surface
HOMES|Places where people live
IGLOO|A dome-shaped shelter built from blocks of snow
LODGE|A small house used as a holiday or country retreat
SCREW|A threaded fastener turned into a surface
SLIME|A slippery, sticky substance
SPRAY|Liquid dispersed in many tiny droplets
STOCK|A supply of goods kept ready for use
TRASH|Unwanted material ready to be thrown away
ALLEY|A narrow passage between buildings
ALLOY|A mixture of a metal with other elements
ANNEX|An addition to a larger building
KIOSK|A small booth used for sales or information
LOBBY|The entrance hall of a hotel or public building
ANVIL|A heavy metal block used by a blacksmith
CAULK|Material used to seal a gap around a window or tub
CRIMP|Make small folds or ridges in an edge
DOWEL|A cylindrical wooden pin used to join pieces
EPOXY|A strong adhesive made by mixing a resin and hardener
FLINT|A hard stone that can produce sparks when struck
FOYER|The entrance hall of a building
INGOT|A block of metal cast for storage or further shaping
INLAY|A decorative piece set into the surface of another material
IVORY|The hard white material of elephant tusks
LATHE|A machine that rotates material while shaping it
NICHE|A shallow recess in a wall for a decorative object
PATIO|A paved outdoor area beside a house
PYLON|A tall structure supporting overhead cables
RIVET|A metal fastener hammered flat at one end
SPRUE|The channel through which molten material enters a mold
STAVE|One of the narrow wooden strips forming a barrel
TWINE|Strong string made from twisted strands
VAULT|A secure room used for storing valuables
WEDGE|A piece thick at one end and thin at the other
FLUFF|Small, soft fibers gathered into a light mass`);
add('Travel & places', `
PILOT|Someone who controls an aircraft
PLACE|A particular position or location
ROUTE|The course taken to get from one place to another
TOWER|A tall, narrow building or structure
TRUCK|A motor vehicle built to carry goods
WHEEL|A circular part that turns around an axle
CANOE|A narrow boat usually moved with a paddle
CARGO|Goods carried by a ship, aircraft, or truck
DRIVE|Control a vehicle as it moves
HAVEN|A safe place offering shelter
HITCH|Get a ride in someone else's vehicle
HOTEL|A building offering rooms to paying travelers
KAYAK|A narrow boat moved with a double-bladed paddle
LOCAL|Belonging to the nearby area
URBAN|Relating to a town or city
WAGON|A four-wheeled vehicle for carrying goods
YACHT|A boat used for recreation or racing
ROVER|A vehicle designed to travel across rough terrain
RURAL|Relating to the countryside
WRECK|A badly damaged ship or vehicle
AISLE|A passage between rows of seats or shelves
BILGE|The lowest inside area of a ship's hull
BLIMP|An airship that keeps its shape through gas pressure
CAIRN|A pile of stones marking a route or memorial
DEPOT|A transport station or storage center
JAUNT|A short journey taken for pleasure
SCUBA|Equipment that lets a diver breathe underwater
SKIFF|A small, light rowing or sailing boat
TROOP|A group of soldiers or scouts
WHARF|A structure beside water where ships load goods
ZONED|Divided into areas for particular uses`);
add('Music, art & entertainment', `
FLUTE|A woodwind instrument played by blowing across an opening
PIANO|A keyboard instrument whose hammers strike strings
RADIO|A device that receives broadcasts carried by electromagnetic waves
STAGE|A raised area where performers appear
CRAFT|An activity that involves making things skillfully by hand
DISCO|Dance music associated with clubs and the 1970s
DRAMA|A play or story centered on conflict and emotion
GAMER|Someone who plays video or tabletop games
HOBBY|An activity done regularly for pleasure
IMAGE|A picture or visual representation
INDIE|Produced independently of a major entertainment company
LYRIC|A word or line from a song
MEDIA|Channels used to communicate news and entertainment
MURAL|A large painting made directly on a wall
PIXEL|A single tiny element of a digital image
RHYME|Words sharing the same ending sound
TEMPO|The speed at which music is played
TITLE|The name of a book, film, or other work
VIDEO|A recording of moving pictures
VINYL|The material used to make traditional phonograph records
VIOLA|A bowed string instrument slightly larger than a violin
VOCAL|Relating to the human singing voice
SONGS|Musical compositions with words to sing
AUDIO|Recorded or transmitted sound
BANJO|A string instrument with a circular drum-like body
CELLO|A large bowed instrument held between the player's knees
JAZZY|Having the lively style or rhythms of jazz
TWANG|A vibrating sound made by a plucked string
CAMEO|A brief appearance by a well-known performer
DEBUT|A performer's first public appearance
ECLAT|Brilliant success that attracts public acclaim
FUGUE|A musical piece in which a theme enters in successive voices
MOTIF|A repeated design, idea, or musical phrase
POLKA|A lively dance in a quick two-beat rhythm
REVUE|A stage show made up of songs, dances, and sketches
SEGUE|Move smoothly from one piece or topic to the next
SEPIA|A reddish-brown tone used in old photographs
WALTZ|A dance with three beats in each measure
YODEL|Sing by rapidly switching between lower and higher registers`);
add('Games, prizes & sport', `
PRIZE|Something awarded for winning or doing well
RELAY|A race in which teammates take turns completing sections
CHESS|A strategy board game with kings, queens, and pawns
CLOWN|A comic performer often wearing exaggerated makeup
QUEST|A long search for something important
SCOUT|Someone sent ahead to gather information
AWARD|A prize given in recognition of an achievement
BLUFF|Pretend to have a stronger hand or position than you do
RALLY|A sequence of shots exchanged in tennis
DEUCE|A tied tennis score of forty points each
JOUST|A contest in which mounted riders charge with lances
REBUS|A puzzle that represents words with pictures and letters
SPEAR|A long weapon with a pointed tip, also used for fishing
TALLY|A running count or record of a score`);
add('People & relationships', `
THIEF|Someone who takes another person's property without permission
OWNER|Someone to whom a thing belongs
YOUTH|The period between childhood and adulthood
ADULT|A fully grown person
AGENT|Someone authorized to act on another person's behalf
BIRTH|The beginning of a baby's life outside the womb
BRIDE|A woman on her wedding day
BUDDY|An informal word for a close friend
HUMAN|A member of our species
NIECE|The daughter of your sibling
QUEEN|A female monarch
REBEL|Someone who resists established authority
UNCLE|A parent's brother or the husband of a parent's sibling
VOTER|Someone who casts a ballot in an election
WIDOW|A woman whose spouse has died
DADDY|A child's affectionate name for their father
ENEMY|Someone actively opposed to another person
MADAM|A polite form of address for a woman
CADET|A trainee in a military or police academy
CYNIC|Someone who doubts other people's good motives
ENVOY|A representative sent on a diplomatic mission
FRIAR|A member of a religious order who serves in the community
MOGUL|A powerful leader in a business or industry
RABBI|A Jewish religious teacher or leader
RIVAL|Someone competing for the same goal
VALET|Someone employed to park cars or attend to a person's needs
VICAR|A parish minister in certain Christian churches
STAFF|The people employed by an organization`);
add('Body & wellbeing', `
ANKLE|The joint between the foot and leg
BRAIN|The organ that coordinates thought and bodily activity
CHEEK|The part of the face beside the nose and mouth
DIZZY|Feeling unsteady or as though the room is spinning
ELBOW|The joint midway along the arm
PINKY|The smallest finger on a hand
SKULL|The bony structure that encloses the brain
SLEEP|A natural resting state with reduced awareness
SNORE|Make a harsh breathing sound while asleep
SPINE|The column of bones supporting the back
SWEAT|Moisture released through the skin to cool the body
THIGH|The upper part of a leg between hip and knee
TIRED|In need of rest or sleep
TOOTH|One of the hard structures used for biting and chewing
TUMMY|An informal name for the stomach
WAIST|The part of the body between the ribs and hips
WOUND|An injury where body tissue is damaged
WRIST|The joint connecting the hand and forearm
COUGH|Expel air suddenly from the lungs with a harsh sound
WOOZY|Dizzy, weak, or unsteady
AORTA|The main artery carrying blood away from the heart
BICEP|Informal singular name for the muscle at the front of the upper arm
CRAMP|A painful involuntary tightening of a muscle
FEMUR|The long bone in the thigh
GAUNT|Extremely thin, especially from illness or hunger
LYMPH|Fluid carried by the body's lymphatic vessels
NAVEL|The mark where the umbilical cord was attached
OBESE|A clinical term for having a very high level of body fat
PUDGY|Slightly plump or rounded
SINEW|A tendon connecting muscle to bone
SPASM|A sudden involuntary muscle movement
TIBIA|The shinbone at the front of the lower leg
TUMOR|An abnormal mass of tissue
ULCER|An open sore on the skin or inside the body
URINE|Liquid waste produced by the kidneys
BLOOD|The fluid that carries oxygen through the body`);
add('Stories, beliefs & traditions', `
MAGIC|Supernatural powers used to make impossible things happen
ALIEN|A being imagined to come from another world
FAIRY|A small magical being in folklore, often with wings
FAITH|Strong trust or belief, often religious
GNOME|A small bearded figure in folklore and garden ornaments
PRANK|A practical joke played on someone
SPOOK|An informal word for a ghost
SCARY|Causing fear or alarm
DEMON|An evil supernatural spirit
ABBEY|A monastery or convent and its church
GENIE|A magical spirit that grants wishes in traditional stories
COVEN|A gathering of witches
CRONE|An old woman, especially a witch-like figure in a tale
DEITY|A god or goddess
DWARF|A small, humanlike being in many fantasy stories
GNOLL|A hyena-like humanoid creature in fantasy games
IDYLL|A scene or story of peaceful, idealized life
KARMA|The consequences of actions in certain religious traditions
MYRRH|An aromatic resin traditionally used in incense
NAIAD|A freshwater nymph in Greek mythology
NYMPH|A minor nature spirit in Greek mythology
PAGAN|Relating to a religion outside the major world religions, often nature-based
PIETY|Devotion to religious beliefs and duties
PIXIE|A small mischievous fairy
PSALM|A sacred song, especially one from the biblical book of that name
SATYR|A woodland figure in Greek mythology with goat-like features
VIGIL|A period of staying awake to keep watch or pray
EERIE|Strange in a way that makes you feel uneasy
GHOUL|A mythical creature said to haunt graves`);
add('Science, shapes & technology', `
CURVE|A line that bends smoothly rather than staying straight
GLOBE|A spherical model of Earth
ROBOT|A programmable machine that performs tasks
SCALE|A series of measurement marks or levels
SPACE|The vast region beyond Earth's atmosphere
PHONE|A device used to speak with someone at a distance
STARS|Luminous balls of gas visible as points in the night sky
LASER|A device producing a narrow, concentrated beam of light
LOGIC|Reasoning according to consistent rules
LUNAR|Relating to the moon
MICRO|A prefix meaning one millionth or very small
PHASE|A distinct stage in a process or cycle
POWER|The rate at which energy is transferred or used
RADAR|A system that detects objects using reflected radio waves
SOLID|A state of matter with a definite shape and volume
SPEED|The distance traveled in a given amount of time
TOTAL|The whole amount after adding all parts
WIDTH|The distance from one side of something to the other
ARRAY|An ordered arrangement of items
GAUGE|An instrument used to measure a quantity
RIGID|Stiff and unable to bend easily
ASYNC|Short for asynchronous: happening without waiting in step
AXIOM|A statement accepted as a starting point for reasoning
EPOCH|A starting point for measuring time, or a distinct historical period
ETHER|A class of chemical compounds containing an oxygen link
FACET|One flat face of a cut gem or geometric solid
INERT|Not readily reacting or moving
LUMEN|A unit measuring the amount of visible light emitted
OXIDE|A compound of oxygen and another element
PRISM|A transparent shape that can separate white light into colors
RADII|The plural of radius: distances from a circle's center to its edge
ROTOR|A rotating part of a machine
SONIC|Relating to sound
UMBRA|The darkest central part of a shadow
WHORL|A pattern of spirals or concentric curves
XENON|A noble gas used in some bright lamps
ZONAL|Relating to a particular area or belt`);
add('Language & expression', `
HAIKU|A short Japanese poetic form traditionally arranged in three lines
QUILL|A feather whose sharpened end can be used as a pen
VOICE|The sound produced when a person speaks or sings
HELLO|A word used to greet someone
HEARD|Perceived a sound with the ears
LYING|Saying something you know is untrue
MIMIC|Imitate another person's voice or behavior
RHETORIC|The art of using language persuasively
SHOUT|Speak very loudly
SPEAK|Express thoughts using spoken words
SWEAR|Make a solemn promise, or use offensive language
THANK|Express gratitude to someone
TOPIC|The subject being discussed
WRITE|Form letters or words to communicate
COLON|A punctuation mark of two dots, often introducing a list
COMMA|A punctuation mark separating parts of a sentence
ESSAY|A short piece of writing examining a subject
VOWEL|A speech sound made with an open vocal tract, such as A or E
AFFIX|A prefix or suffix attached to a word
BLURB|A short description used to promote a book
GLYPH|A written or carved symbol
IMPLY|Suggest something without stating it directly
OPINE|Express an opinion
PARSE|Analyze the grammatical structure of a sentence
POSIT|Put forward an idea as a basis for discussion
PROSE|Ordinary written language rather than verse
QUERY|A question or request for information
QUOTE|Repeat someone's exact words
TACIT|Understood without being stated aloud
TERSE|Using very few words
USAGE|The customary way a word or expression is used
UTTER|Say something aloud
WELSH|Relating to the language or people of Wales
SHUSH|Tell someone to be quiet
BOOED|Expressed disapproval with a drawn-out shout`);
add('Money, work & society', `
MONEY|Coins, notes, or balances used to pay for things
STORE|A place where goods are sold
ADOPT|Take something as your own, including a policy or a child
GRANT|Give formally, especially permission or funding
GUARD|Protect someone or keep watch over a place
JUDGE|A person who makes decisions in a court
OFFER|Propose to give or do something
SERVE|Provide assistance or fulfill a duty
SPEND|Use money to pay for something
TRADE|Exchange goods or services
BRAND|A name or identity used to distinguish a company's products
CHORE|A routine task that needs doing
LEGAL|Allowed by law
PROXY|A person authorized to act or vote for another
ROYAL|Relating to a monarch or their family
SHIFT|A scheduled period of work
UNION|An organization representing workers together
VALUE|The worth or usefulness of something
CIVIC|Relating to the duties and life of a city's residents
ASSAY|A test of the composition or quality of a material
CLOUT|Influence that can help someone get things done
DROIT|A legal right, using a word borrowed from French
EXILE|Being forced to live away from one's homeland
RUPEE|A unit of currency used in India and several other countries
USURP|Take a position of power without the right to do so`);
add('Time, position & amount', `
BUNCH|A number of things gathered or held together
POINT|An exact location or a sharp end
RANGE|The span between the lowest and highest values
FIRST|Coming before all others in order
FRONT|The forward-facing part of something
MAJOR|Greater in importance or size
MINOR|Lesser in importance or size
OFTEN|On many occasions
OTHER|Different from the one already mentioned
TWICE|Two times
WHOLE|Complete, with no part missing
TODAY|The day happening now
DAILY|Happening every day
DELAY|A wait that makes something happen later
ENTRY|The act of going in, or a submitted item
EXTRA|More than the usual or required amount
INNER|Located toward the inside
LARGE|Greater than usual in size
LATER|At a time after the present or another event
MONTH|One of the twelve divisions of a year
PIECE|One part of a larger whole
PRIME|A number greater than one divisible only by itself and one
SEVEN|The number of days in a week
SHORT|Having little length or duration
SMALL|Limited in size or amount
STRIP|A long, narrow piece of something
THEIR|Belonging to the people already mentioned
THING|An object or matter without a more specific name
THREE|The number after two and before four
TIMER|A device that measures a set interval
UNDER|In a position lower than something else
UPPER|Situated above another part
WHOSE|Belonging to which person
AMASS|Gather a large amount over time
NINTH|Coming after eighth in order
ODDER|More unusual than something else
RARER|Less common or less often found
SIXTH|Coming after fifth in order
HALVE|Divide into two equal parts
JIFFY|An informal word for a very short time
LAPSE|A temporary failure or an interval of time
LIMBO|An uncertain state while waiting for a decision
OCCUR|Happen or take place
RECUR|Happen again, often repeatedly
SWATH|A broad strip or area
TRICE|A very short moment
UNDUE|More than is reasonable or necessary
UNWED|Not married`);
add('Feelings & character', `
AWARE|Knowing or noticing what is happening
BRAVE|Willing to face something frightening
HAPPY|Feeling pleasure or contentment
LUCKY|Helped by chance or good fortune
PRIDE|Satisfaction in an achievement or someone you care about
PROUD|Feeling pleased about an achievement
BLUSH|A reddening of the cheeks from embarrassment
BOAST|Speak with excessive pride about yourself
EAGER|Keen and impatient to do something
GUILT|The feeling of having done something wrong
HUMOR|The quality that makes something funny
JOLLY|Cheerful and full of good spirits
LOYAL|Faithful to a person, group, or commitment
MOODY|Having frequent changes of feeling
NERDY|Very enthusiastic about a specialized interest
SILLY|Playfully foolish or lacking seriousness
SOFTY|An easily moved, tenderhearted person
UPSET|Unhappy or emotionally disturbed
WORRY|Feel anxious about a possible problem
YEARN|Feel a strong longing for something
ALLAY|Make someone's fear or worry less intense
COYLY|In a shy or playfully reserved way
GRIEF|Deep sorrow, especially after a loss
SASSY|Lively and boldly cheeky
SAVVY|Having practical understanding and good judgment
SHYLY|In a timid or bashful manner
SLYLY|In a secretive or cunning manner
SORRY|Feeling regret or sympathy
PETTY|Concerned with small, unimportant grievances
AMITY|Friendly relations between people or countries
ANGST|A deep feeling of anxiety or unease
COVET|Strongly desire something belonging to someone else
ENNUI|A feeling of weary boredom
ETHOS|The characteristic values of a person or community
FLAIR|A natural talent or a distinctive style
GUSTO|Great enthusiasm and enjoyment
IRATE|Extremely angry
KNACK|A natural ability to do something well
LEERY|Wary or suspicious
MIRTH|Amusement, especially expressed in laughter
PIQUE|Annoyance at feeling slighted
QUALM|A doubt or uneasy feeling about doing something
STOIC|Enduring difficulty without showing distress
SUAVE|Confident and smoothly polite
SULKY|Quietly bad-tempered because of annoyance
SURLY|Unfriendly and bad-tempered
VERVE|Lively energy and enthusiasm
WITTY|Clever and amusing in expression
WRYLY|In a dryly humorous or ironic way`);
add('Actions & choices', `
MELEE|A confused struggle involving several people
ADMIT|Acknowledge that something is true
AGREE|Have the same opinion or accept a proposal
ALLOW|Give permission for something
AMEND|Make a small correction or improvement
ARGUE|Give reasons for a view, or dispute with someone
AVOID|Keep away from something
BRING|Carry something toward the speaker or destination
BUILD|Construct something from separate parts
CATCH|Stop and hold something that is moving
CAUSE|Make something happen
CHASE|Run after someone or something
CHOSE|Selected one option in the past
CLEAN|Remove dirt from something
CLIMB|Move upward using feet and often hands
DANCE|Move rhythmically, usually to music
ENJOY|Take pleasure in an experience
ENTER|Go into a place
FETCH|Go and bring something back
FIGHT|Take part in a struggle or conflict
FOCUS|Direct your attention toward one thing
FORCE|Make something happen through strength or pressure
GROWN|Increased in size or developed fully
GUIDE|Show someone the way or how to do something
LEARN|Gain knowledge or a new skill
LEAVE|Go away from a place
MARCH|Walk with a steady, regular step
MEANT|Intended to say or do something
PLANS|Arrangements for things to do in the future
RAISE|Lift something to a higher position
REACH|Stretch out far enough to touch something
REACT|Respond to an event or stimulus
REPLY|Give an answer to a message or question
SHARE|Let someone else use or enjoy part of something
SHINE|Give off or reflect bright light
SHOWN|Displayed so that someone could see
SOLVE|Find an answer to a problem or puzzle
SPARE|Keep from using or harming something
STAND|Be upright on your feet
START|Begin an action or process
STUDY|Spend time learning about a subject
THINK|Use your mind to form ideas or judgments
THROW|Send something through the air with your arm
TOUCH|Make physical contact with something
WASTE|Use carelessly without a useful result
BURST|Break open suddenly under pressure
FLASH|Give off a brief, bright light
FLOAT|Remain on the surface of a liquid
PEDAL|Push the foot-operated parts that drive a bicycle
PUNCH|Strike with a closed fist
RELAX|Become less tense or take a rest
SCRUB|Clean by rubbing hard
SHAKE|Move quickly back and forth
SHOOT|Send a projectile from a weapon, or take a photograph
SLIDE|Move smoothly along a surface
SNOOP|Pry into someone else's private affairs
SPENT|Used up money, time, or energy
SPLAT|Land with a wet, flat impact
SPLIT|Divide into separate parts
STARE|Look fixedly for a long time
STATE|Express something clearly in words
STINK|Give off a strong, unpleasant smell
STUFF|Pack material tightly into a space
SWELL|Become larger through internal pressure
SWIRL|Move in a twisting or circular pattern
TEACH|Help someone gain knowledge or a skill
TRACE|Follow the outline or course of something
TWIST|Turn something into a winding shape
UNITE|Bring together into one group
AVAIL|Be useful or of benefit
BOOST|Increase or help something improve
DODGE|Move quickly aside to avoid something
EJECT|Force something out of a place or machine
RETRY|Make another attempt after a failure
SEIZE|Take hold of something suddenly or forcefully
SNEER|Smile in a way that shows contempt
CEASE|Stop happening or doing something
CINCH|Fasten tightly, or make an outcome certain
CLINK|Make a light ringing sound by touching glass or metal
DECOY|Lure someone away using a false target
ELUDE|Escape or avoid capture
EQUIP|Provide the tools needed for a task
EVADE|Avoid or get away from something
EVOKE|Bring a memory or feeling to mind
EXALT|Praise or raise to a high position
EXPEL|Force someone to leave a place or group
EXTOL|Praise enthusiastically
FEIGN|Pretend to have a feeling or condition
GNASH|Grind the teeth together in anger
GRAFT|Join part of one plant onto another to grow
HOARD|Collect and store more than is needed
HOIST|Raise something using ropes or machinery
IMPEL|Drive or urge someone to act
KNELT|Lowered the body onto one or both knees
MERGE|Join together into one
MOULT|Shed old feathers, hair, or skin
PIVOT|Turn around a fixed central point
PREEN|Clean and arrange feathers with the beak
SKIMP|Use less time or material than is needed
SKULK|Move or hide in a secretive, suspicious way
SMIRK|Smile in a self-satisfied way
SQUAT|Crouch with knees bent and heels close to the body
SULLY|Damage the purity or reputation of something
SWOON|Faint, or be overcome with admiration
TAUNT|Provoke someone with insulting remarks
TRAWL|Fish by dragging a net through water
TWEAK|Make a small adjustment
UNDID|Reversed or unfastened something
VYING|Competing eagerly for something
WHACK|Hit something with a sharp blow
WINCE|Flinch in response to pain or embarrassment
WRACK|Cause great pain or distress, as in nerve-racking
WREAK|Cause something harmful, as in havoc
CREEP|Move slowly and quietly`);
add('Qualities & descriptions', `
EQUAL|The same in value, size, or amount
GIANT|Extremely large in size
PLAIN|Simple and without decoration
READY|Prepared for what is about to happen
RIGHT|Correct or in accordance with what is true
SAFER|Less likely to cause harm than something else
SENSE|An ability to perceive, or a reasonable meaning
SHARP|Having an edge or point that cuts easily
SKILL|An ability developed through practice
SMART|Quick to understand and learn
STYLE|A distinctive way something looks or is done
SUPER|An informal word meaning excellent
SWEET|Having a sugary taste or a kind manner
TRUTH|What agrees with the actual facts
WRONG|Not correct or accurate
GREEN|The color of healthy grass
NIGHT|The period of darkness between sunset and sunrise
SHINY|Reflecting light from a bright surface
WHITE|The color of fresh snow
ARROW|A pointed symbol showing a direction
BLACK|The color of coal or an unlit sky
COMFY|An informal word for physically comfortable
CURLY|Having twists or ringlets
FANCY|Decorative, elaborate, or luxurious
FUZZY|Covered with short, soft fibers
GRACE|Smoothness and elegance of movement
GRAND|Impressive in size or appearance
HAIRY|Covered in a lot of hair
HANDY|Useful and conveniently close
MAYBE|Possibly, but not certainly
MILKY|White or cloudy like milk
NAKED|Without clothing or a covering
PUFFY|Softly swollen or inflated
QUICK|Moving or happening at speed
QUITE|To a considerable degree
ROGUE|A person or thing behaving outside expected rules
ROUGH|Having an uneven or coarse surface
SMELL|An odor detected by the nose
SWIFT|Moving very quickly
TIGHT|Held firmly or with little room to spare
TOUGH|Strong and difficult to break or endure
UNITY|The state of being joined as one
USUAL|Happening in the normal or customary way
VAGUE|Not clearly expressed or defined
VIVID|Very bright, clear, or intensely imagined
WEIRD|Strange or unusual
WORTH|The value or merit of something
DUSKY|Dim or darkening, like the light at twilight
ERROR|A mistake in an action or judgment
KNOWN|Recognized or understood already
OUGHT|A word expressing what someone should do
ROOMY|Having plenty of space inside
SEEDY|Shabby and disreputable
AGLOW|Shining with a soft light
AMISS|Not quite right; something is wrong
APTLY|In a suitable or fitting way
AROMA|A distinctive, often pleasant smell
ASKEW|Tilted or out of alignment
AZURE|A bright blue color like a clear sky
BAWDY|Humorous in a way that refers openly to sex
FLUKE|An unlikely stroke of luck
GAFFE|An embarrassing social mistake
GUISE|An outward appearance that can conceal the truth
HAVOC|Widespread disorder or damage
HEFTY|Heavy or large in amount
INANE|Silly and lacking meaning
INEPT|Lacking the skill to do something well
LITHE|Supple and able to move gracefully
LOFTY|Very high or elevated in ambition
LOOPY|Informally, silly or slightly confused
LURID|Shockingly vivid or sensational
PERIL|Serious danger
PESKY|Persistently annoying
PHONY|Fake or not genuine
PYGMY|Unusually small, as in the name of a small animal species
QUIRK|A distinctive unusual habit or feature
ROWDY|Noisy and difficult to control
SISSY|A dated, disparaging word for someone called timid
SPREE|A brief period of indulging freely in an activity
STOUT|Strong and solidly built
TAWNY|A warm brownish-orange color
TRITE|Overused and no longer interesting
UNFIT|Not suitable or physically able for a purpose
WACKY|Unusually funny or eccentric
WARTY|Covered with small, rough bumps
WHIFF|A brief, faint smell
WISPY|Thin, light, and delicate
ZIPPY|Quick and lively`);
add('Gatherings & giving', `
PARTY|A social gathering for celebration or fun
GIFTS|Things given freely to other people
CARDS|Paper greetings sent for special occasions
TEDDY|A stuffed toy bear
TRUCE|An agreement to stop fighting temporarily
TRYST|A private meeting between lovers`);
add('Memory, history & keepsakes', `
RELIC|An object surviving from an earlier time
REALM|A kingdom or a particular field of interest
REIGN|The period during which a monarch rules
SIEGE|An attempt to capture a place by surrounding it
BLUR|An indistinct shape or memory
TRADITION|A custom handed down through generations
OPIUM|A drug obtained from the poppy plant`);
add('Food & cooking', `
SOURDOUGH|Bread raised with a fermented starter instead of packaged yeast
BREADMAKER|A kitchen machine that mixes, kneads, and bakes a loaf
SIMMER|Cook liquid gently just below boiling
CAPPUCCINO|Espresso topped with steamed milk and a thick layer of foam
CHEESECAKE|A dessert with a soft cheese filling on a crumb or pastry base
SHORTBREAD|A crumbly biscuit traditionally made with butter, sugar, and flour
BOWL|A deep, round dish for soup or mixing
CARROT|An orange root vegetable
EGG|An oval food laid by a hen
FOAM|A layer of tiny bubbles on a drink
GRIND|Reduce beans or grains to small particles
HERB|A plant used to flavor food
LOAF|Bread baked as a single shaped piece
MENU|A list of food and drinks available to order
MILK|A white liquid produced by mammals to feed their young
PAN|A shallow container used for cooking
PEPPER|A pungent spice ground from small dried berries
POT|A deep container used for cooking
POTATO|An edible underground tuber
RYE|A cereal grain used in dense breads
SALT|A white mineral seasoning
STIR|Mix with a circular motion using a spoon or other tool
TART|A small open pastry with a sweet or savory filling
VANILLA|A sweet-smelling flavoring made from an orchid's pods`);
add('Clothes & personal belongings', `
NEEDLEWORK|Sewing or embroidery done with a small pointed tool and thread
PATCHWORK|Sewing that joins pieces of different fabrics into a larger design
OVERCOAT|A long warm coat worn over other clothes
MITTENS|Hand coverings with one space for four fingers and another for the thumb
HEM|A folded and sewn edge of a garment
HAT|A covering worn on the head
KNIT|Make fabric by looping yarn with needles
SEAM|The line where pieces of fabric are sewn together
THREAD|A fine strand used for sewing
STITCH|One loop of thread made with a needle`);
add('Plants & growing things', `
GREENHOUSE|A glass or transparent building that shelters growing plants
GARDENER|Someone who cultivates and cares for plants
CLOVER|A low plant with leaves usually divided into three leaflets
COMPOST|Decayed organic material added to soil
BULB|An underground plant structure from which a shoot grows
FLOWER|A plant's reproductive structure, often with colorful petals
FERN|A plant with divided fronds that reproduces by spores
MOSS|A small, soft green plant that grows in damp places
NECTAR|Sweet liquid in flowers that attracts pollinators
OAK|A tree that produces acorns
POLLEN|Fine grains produced by the male parts of flowers
REED|A tall, slender plant growing in wet ground
SHRUB|A woody plant smaller than a tree
SOIL|The earth in which plants grow
STEM|The main supporting stalk of a plant
WEED|A plant growing where it is not wanted
WOODLAND|An area of land covered with trees
FOREST|A large area densely covered with trees`);
add('Animals & their features', `
BEEKEEPER|Someone who maintains hives and cares for honey-producing insects
HONEYCOMB|A structure of six-sided wax cells built by bees
BEE|A flying insect that collects nectar and pollen
CAT|A small domesticated feline
CRAB|A crustacean with a broad shell and a pair of claws
DRONE|A male bee in a colony
FISH|An aquatic animal that usually breathes through gills
FROG|A jumping amphibian with a short body and no adult tail
GULL|A coastal bird with long wings and a loud call
HIVE|The home of a colony of bees
NEWT|A small amphibian resembling a lizard
STING|A sharp defensive puncture delivered by a bee
SWARM|A large group of insects moving together
TOAD|A short-legged amphibian often with rough skin
WING|One of a bird's paired flight limbs`);
add('Land, water & weather', `
COASTLINE|The outline where the land meets the sea
SEASHELL|The hard outer covering left by a marine mollusk
WATERFALL|Water flowing over a steep drop
RIVERBANK|The land along the edge of a flowing watercourse
BREEZE|A gentle wind
DAWN|The first light before sunrise
DRIZZLE|Rain falling in very small droplets
DUNE|A mound of sand formed by wind
FLOW|Move steadily in a stream
HAIL|Frozen pellets falling from a storm cloud
LAKE|A large body of water surrounded by land
LIGHTNING|A bright electrical discharge during a storm
POND|A small body of still water
RAPID|A fast-flowing, turbulent part of a river
REEF|A ridge of rock or coral near the sea's surface
SAND|Loose, small grains of rock
SEA|A large body of salt water
SHOWER|A brief period of rain
SKY|The open space seen above the Earth
SUN|The star at the center of our solar system
SURF|Waves breaking on a shore
TIDE|The regular rise and fall of the sea
WET|Covered or soaked with liquid`);
add('Music, art & entertainment', `
ORCHESTRA|A large group of musicians playing strings, winds, and percussion together
HARMONY|Different musical notes sounding together in a pleasing combination
SCREENPLAY|The written script for a film, including dialogue and scene directions
DIRECTOR|The person guiding a film's actors and artistic choices
SKETCHBOOK|A bound collection of blank pages for drawing
WATERCOLOR|Paint mixed with water to make translucent washes of color
AUTHOR|The person who writes a book or other work
BASS|The lowest range of a voice or musical instrument
BLUE|The color of a clear daytime sky
COLOR|A visual quality such as red, blue, or green
DRUM|A percussion instrument struck with hands or sticks
FILM|A motion picture, or the material once used to record one
HARP|A large string instrument played by plucking
HERO|The central courageous character in a story
HUE|A particular color or shade
INK|Colored liquid used for writing or printing
LINE|A long, narrow mark made on a surface
PAGE|One side of a sheet in a book
PEN|An instrument that writes with ink
PENCIL|A writing tool with a graphite core
RHYTHM|A repeating pattern of beats or sounds
ROLE|The part an actor plays
SCRIPT|The written words and directions for a performance
SONG|A musical composition with words to sing
STUNT|A daring physical action performed for entertainment
THRILLER|A story designed to create suspense and excitement
TONE|The quality or pitch of a sound
TUNE|A recognizable sequence of musical notes
VIOLIN|A four-stringed instrument bowed while held under the chin
CAROLERS|People who sing Christmas songs, often from door to door`);
add('Home, tools & materials', `
ARMCHAIR|A comfortable seat with supports for both arms
SCISSORS|A cutting tool with two pivoting blades
BAG|A flexible container for carrying things
BELL|A hollow metal object that rings when struck
CASE|A protective container for an object
PIN|A thin pointed fastener used to hold fabric in place
PUMP|A device that moves air or liquid
RUG|A floor covering smaller than a carpet
SPADE|A digging tool with a flat blade
TAPE|A narrow adhesive strip used to fasten things
WAX|A moldable substance used to make candles`);
add('Travel & places', `
ITINERARY|A planned route and schedule for a journey
BICYCLE|A two-wheeled vehicle powered by pedals
HANDLEBAR|The steering bar held by a bicycle rider
ARRIVE|Reach the destination of a journey
BOAT|A small vessel used to travel on water
DEPART|Leave a place to begin a journey
FARM|Land used to grow crops or raise animals
HELMET|A hard protective covering for the head
LIBRARY|A place where books are kept for reading or borrowing
PACK|Put belongings into a bag for a trip
PADDLE|A short oar used to move a canoe or kayak
PIER|A structure extending out over water
RIDE|Travel on a bicycle, animal, or vehicle
SADDLE|A seat on a bicycle or riding animal
SEAT|A place or piece of furniture for sitting
SPOKE|A rod connecting a wheel's hub to its rim
TIRE|The rubber covering around a wheel
TOUR|A journey visiting several places
TRAVEL|Go from one place to another
TRIP|A journey away from home and back`);
add('Games, prizes & sport', `
CHESSBOARD|The alternating light-and-dark squares on which chess is played
STALEMATE|A chess position where a player has no legal move but is not in check
BISHOP|The chess piece that moves diagonally
CAPTURE|Take an opponent's piece off the board
KING|The chess piece that must be protected from checkmate
MATE|A chess position in which a king cannot escape check
MOVE|A player's action during a turn
RANK|A horizontal row of squares on a chessboard
ROOK|The chess piece that moves along rows and columns
SQUARE|A shape with four equal sides and four right angles
TURN|One player's opportunity to act`);
add('Language & expression', `
POSTCARD|A card with a picture on one side and a mailed message on the other
ADDRESSBOOK|A collection of people's contact details
LIST|Items written one after another
MAIL|Letters and parcels sent through the postal system
MESSAGE|Information communicated from one person to another
POST|Send something through the mail
READ|Understand the meaning of written words
SEND|Cause something to go to a destination
STAMP|A small adhesive label showing postage has been paid`);
add('Science, shapes & technology', `
TELESCOPE|An optical instrument that makes distant objects look closer
STARLIGHT|Light reaching us from distant suns
ECLIPSE|An event in which one celestial body blocks light from another
GALAXY|A vast system of stars, gas, and dust held together by gravity
GEAR|A toothed wheel that transfers motion in a machine
MARS|The red planet, fourth from the Sun
METEOR|A streak of light from a space rock burning in the atmosphere
PLANET|A large body orbiting a star
VENUS|The second planet from the Sun`);
add('Stories, beliefs & traditions', `
JACKOLANTERN|A hollow pumpkin carved with a face and lit from inside (hyphens omitted)
TRICKORTREAT|The Halloween doorstep request for sweets (spaces omitted)
WITCHCRAFT|The practice of casting spells in folklore
HAUNTEDHOUSE|A building said to contain ghosts (two words)
CANDLELIGHT|Illumination from a burning wax taper
WRAPPING|Paper or other material used to cover a gift
GIFT|Something given freely to another person`);
add('Actions & choices', `
RISE|Move upward or increase in height
BALE|A tightly bound bundle of hay or straw`);
