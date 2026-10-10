// Original assorted practice clues. No seasonal gating, timers or competitive writes.
// Order is fixed within this edition. Hard means trickier familiar words, not jargon.
const entries=(difficulty,text)=>text.trim().split('\n').map(line=>{const [word,clue]=line.split('|');return {word,clue,difficulty};});
export const PRACTICE_EDITION_WORDS=[
 ...entries('normal',`
ABOUT|The word between a story and its subject
ABOVE|On a higher floor, relative to yours
ABIDE|Go along with the rules even when you dislike them
ABORT|End a mission before it reaches its goal
ADAPT|Change your approach to fit new conditions
ADEPT|Skilled enough to make a difficult job look easy
ADORE|Love with more than a little enthusiasm
ADORN|Make something prettier by adding decorations
AFTER|The opposite of before on a timeline
AGAIN|The request that gives a favorite song another turn
AGILE|Quick on your feet and able to change direction
AGING|What birthdays keep reminding you is happening
AHEAD|In front of the person trying to catch you
ALIBI|An explanation that puts a suspect somewhere else
ALIGN|Arrange things so they follow the same line
ALIKE|Similar enough to invite a comparison
ALIVE|Still part of the living rather than the dead
ALOFT|Up in the air, as a flag or a kite might be
ALOOF|Keeping a cool distance from other people
ALOUD|Said where other people can hear, not just thought
ALTER|Make a change without replacing the whole thing
AMAZE|Surprise someone enough to leave them impressed
AMONG|Surrounded by members of a group
AMPLE|More than enough to meet the need
AMUSE|Keep someone entertained or make them laugh
ANNOY|Get on someone's nerves without leaving the room
APPLY|Put yourself forward for a job or a place
ARENA|A performance space surrounded by spectators
ARISE|Come up, as an unexpected problem might
ARMOR|Protection worn rather than carried as a shield
ASIDE|Out of the way, or a quiet comment to an audience
ASSET|Something valuable that helps rather than hurts you
AUDIT|A careful check of an organization's accounts
AVERT|Prevent trouble before it arrives
AWAIT|Stay ready for something that has not arrived
AWAKE|No longer asleep, even if you wish you were
BACON|Breakfast strips that often share a plate with eggs
BARGE|A flat-bottomed cargo boat, or push in rudely
BATON|The object one relay runner hands to the next
BELOW|On the lower side of a line or a limit
BLAND|In need of flavor or a little personality
BLANK|A space waiting for someone to fill it
BLAST|A sudden explosion, or an exceptionally good time
BLEAK|Offering very little hope or warmth
BLEND|Mix separate ingredients until they work together
BLUNT|Not sharp, either at the edge or in the wording
BOXER|An athlete whose gloves are not for keeping warm
BRACE|Support something, or prepare yourself for an impact
BRAID|Hair arranged in strands that repeatedly cross
BRAKE|The part you use to slow down a bicycle
BRAWN|Physical strength rather than mental cleverness
BRINK|The very edge before a major change or drop
BROAD|Wide enough to cover a lot of ground
BROKE|Out of money, or the past of break
BROTH|A savory liquid that can start a bowl of soup
BRUNT|The heaviest part of an unpleasant impact
BUDGE|Move even a little, especially after resisting
BUGLE|A brass instrument used to sound military calls
BULGE|A rounded swelling pushing outward
BULKY|Taking up more space than is convenient to carry
BURNT|Cooked past golden and into regret
BUYER|The person on the paying side of a sale
CATER|Provide the food for someone else's event
CHANT|Repeat words to a rhythm rather than ordinary speech
CHEAP|Low in price, not necessarily low in quality
CHEAT|Take an advantage the rules do not permit
CHILD|A young person, or someone's offspring at any age
CHORD|Several musical notes sounding at the same time
CHUCK|Throw something without much ceremony
CHUMP|Someone who has been easily fooled
CHUNK|A thick piece rather than a thin slice
CHURN|Work cream until it becomes butter
CLAIM|Say something belongs to you, or state it is true
CLAMP|A tool that holds two pieces firmly together
CLANG|A loud metallic sound after a collision
CLASH|A collision of people, ideas, or colors
CLASP|A small fastener that keeps a necklace on
CLASS|A group learning together, or a category
CLEAR|Easy to see through or easy to understand
CLERK|Someone helping customers at a shop counter
CLING|Hold tightly rather than let go
CLONE|An exact copy rather than an original
CLOTH|Woven material before it becomes a garment
CLUMP|A dense little bunch stuck together
COBRA|A snake famous for spreading a hood
COMET|A space traveler that can leave a bright tail
CRACK|A narrow break that has not split the whole object
CRANK|A handle that works by being turned
CRAWL|Move with your hands and knees close to the ground
CRAZE|A burst of popularity that may not last
CREST|The top of a wave just before it breaks
CRUDE|Rough and unrefined rather than polished
CRUMB|The smallest souvenir left by a slice of toast
CRUSH|Press hard enough to destroy the shape
CRUST|The outside of bread that is firmer than the middle
DEALT|Distributed the cards before a game
DEBIT|Money taken out rather than put into an account
DEBUG|Find and fix what is making a program misbehave
DECAF|Coffee with most of its caffeine removed
DECAY|Slowly break down rather than remain preserved`),
 ...entries('hard',`
ALGAE|Green pond growth whose name ends in two vowels
ANNUL|Declare an agreement invalid rather than merely end it
BINGO|A winning shout that doubles as a way to say exactly right
BISON|A shaggy grazer often mistaken in name for a buffalo
BLEAT|A sheep's complaint, with no words attached
BLESS|Offer good wishes, especially after a sneeze
BLISS|Happiness without much room for anything else
BLITZ|A fast, concentrated attack rather than a slow campaign
BLOAT|Swell with air or fluid, like software with too many features
BLOWN|Moved by wind, or completely lost as an opportunity
BOOTH|A small enclosed seat or stall, not quite a room
BOUND|Tied up, headed somewhere, or a single big leap
BREED|A type of dog, or cause something to develop
BROOD|A family of chicks, or dwell unhappily on a thought
BROOK|A little stream, or tolerate in the phrase brook no delay
BUSHY|Thick and full, whether eyebrows or a shrub
CACHE|A hidden store with the same sound as money
CADDY|A golfer's helper who carries rather than swings the clubs
CAPER|A mischievous adventure or a small pickled cooking ingredient
CHECK|Look for errors, or put a chess king under threat
CHICK|A bird before it earns its adult name
CHILI|A pepper or a spicy stew, depending on the menu
CLICK|A mouse's command, or the moment an idea makes sense
CLIFF|A rock face whose edge demands a careful step
CLUNG|Held on tightly, with the holding now in the past
CONCH|A large spiral shell that can be blown like a horn
COULD|Was able to, without saying that it actually happened
CRAZY|Wildly unreasonable, as in an idea that just might work
CROAK|A frog's voice, or a rough human one
CROCK|An earthenware pot rather than a metal pan
CROOK|A dishonest person, or the bend in an arm
CROSS|Go over to the other side, or be mildly angry
CURRY|A spiced dish, or seek favor by flattering someone
CYCLE|A sequence that gets back to where it began
DECOR|A room's furnishing style, not its floor plan
DEFER|Put something off, or yield to another person's judgment
DENSE|Packed closely together rather than spread thin
DEPTH|Distance downward, or the quality of a thoughtful answer
DERBY|A famous sort of horse race that is also a rounded hat
DETER|Discourage an action before it happens
DIGIT|A number symbol that can also mean a finger
DINER|A person eating or the restaurant they eat in
DITCH|A dug channel, or abandon a plan
DITTO|A compact way to say the same thing again
DIVER|Someone whose sightseeing happens underwater
DONOR|Someone who gives without being the seller
DOUBT|The hesitation between believing and rejecting
DOZEN|A bakery's ordinary count before the extra one
DRAFT|A first attempt at writing, or an indoor breeze
DRAPE|Let fabric hang in loose folds
DRAWL|A way of speaking that gives vowels extra time
DREAD|Fear that arrives before the thing you fear
DRIED|What fruit becomes after much of its water is removed
DRILL|A hole-making tool, or a repeated practice exercise
DROVE|Steered a car, or a large moving group of animals
DRYER|The laundry appliance after the washer
DWELL|Live somewhere, or keep returning to the same thought
FABLE|A short tale whose ending teaches a lesson
FAINT|Barely detectable, or briefly lose consciousness
FAULT|A mistake or a break in Earth's crust
FIBER|A cloth's threadlike ingredient that food labels also mention
FILMY|Thin and nearly transparent, like a light veil
FINCH|A small songbird with a seed-cracking beak
FIZZY|Bubbly enough for a drink to make a little noise
FLAKY|Breaking into thin pieces, or unreliable about plans
FLEET|A group of ships, or unusually quick
FLICK|A quick movement of a finger, or an informal movie
FLOCK|A gathering of birds, or move somewhere in a crowd
FLUID|Able to flow, or gracefully changing rather than fixed
FOCAL|At the center, as in a point of attention
FOLLY|A foolish plan, even when it sounds grand
FORTE|Your strong suit, without requiring a deck of cards
FORUM|A place for discussion rather than a single speech
FUDGE|A soft sweet, or adjust facts a little dishonestly
FUNKY|Unconventionally stylish, or carrying a strong odor
GAVEL|A judge's small hammer with no nails to hit
GIDDY|Dizzy with excitement rather than calmly pleased
GIZMO|A handy thing whose proper name escapes you
GLEAM|A brief shine, or a hopeful look in someone's eye
GLOAT|Enjoy a victory a little too visibly
GRIPE|A complaint rather than a congratulations
GROUT|The filler between tiles, not the tiles themselves
GUPPY|A little aquarium fish with a double consonant
HILLY|Full of rises and dips rather than level ground
HIKER|A walker whose route is more trail than sidewalk
HONOR|Respect that can be earned but not simply demanded
HYPER|More energetic than the room may be ready for
IDEAL|The perfect version, even when reality falls short
INBOX|A digital arrival hall for messages
INDEX|A book's lookup guide that usually lives at the back
INTRO|The bit before a song gets properly underway
JERKY|Dried meat, or movements that are not smooth
JUMPY|Quick to startle even before a real threat appears
JUROR|A courtroom listener who helps decide the verdict
KEBAB|Food cooked on a skewer rather than loose in a pan
LANKY|Tall and thin with rather long limbs
LEDGE|A narrow natural shelf on a rock face
LEVER|A bar that gives a small effort a bigger lifting effect
LIVER|An organ whose name sounds like a person who lives
MOLAR|A grinding tooth near the back rather than a cutting front one`),
 ...entries('normal',`
MANGO|A tropical fruit with orange flesh and a large flat pit
MAYOR|The elected leader of a city rather than a country
METER|A device that measures use, as with water or electricity
MIGHT|A word that leaves the outcome possible but uncertain
MIXER|A kitchen machine that combines ingredients by beating them
MOTOR|The part that turns energy into movement
MOUNT|Climb onto a horse or fix a picture on a wall
MOUTH|The opening used for eating and speaking
MOVIE|A story watched on a screen rather than read on a page
NASTY|Unpleasant enough to make you want to avoid it
NERVE|The courage you work up before a difficult conversation
NEWLY|Recently, as in a pair who have just married
NOISE|Sound that may be less welcome than music
NURSE|A healthcare worker who tends to patients
OASIS|A watered green place surrounded by desert
OPALS|Gemstones whose colors can seem to shift as they catch the light
ORBIT|The path one object takes around another in space
OTTER|A playful water-loving mammal with dense fur
OUNCE|A small unit of weight, sixteen of which make a pound
OUTER|Farther from the middle rather than closer to it
PAUSE|A temporary stop before carrying on
PERCH|A bird's resting place above the ground
PERKY|Cheerfully energetic rather than sleepy or flat
PLAZA|An open public square surrounded by buildings
PLUCK|Pull a string to make it sound
PLUMB|A vertical line's quality, or install water pipes
PROOF|Evidence strong enough to support a conclusion
PULSE|The beat you can feel at your wrist
PURSE|A small bag carried for money and personal items
RANCH|A large farm mainly raising livestock
RATIO|A comparison of one amount with another
RINSE|Use clean water to remove soap or loose dirt
RIVAL|Someone competing for the same thing you want
RUGBY|A team sport with an oval ball and no forward passes
RULER|A measuring stick, or someone who governs
SAUCE|The flavorful liquid spooned over a dish
SCENT|A smell that can linger after its source has gone
SHRUG|A shoulder movement that can mean you do not know
SOLAR|Powered by or connected with the sun
SPARK|A tiny fiery start that can lead to something bigger
SWING|A playground seat suspended to move back and forth
THICK|Not thin, whether a wall, a book, or a sauce
THIRD|The place after second and before fourth
TIDAL|Rising and falling with the sea's regular movement
VALID|Acceptable under the rules, as with a current ticket
VITAL|Important enough that you cannot safely do without it
WATER|The clear liquid you can drink without adding anything
WOMAN|An adult female person
YOUNG|Early in life rather than near its end
ZEBRA|An African grazer wearing natural black-and-white stripes`),
 ...entries('hard',`
MAMBO|A lively Cuban dance with a repeated opening consonant
MESSY|Untidy enough to make finding your keys a small adventure
MOTTO|A short phrase that sums up a guiding belief
MUSHY|Too soft on the plate, or extremely sentimental in a note
NANNY|A person paid to care for children in their home
NEEDY|Requiring more help or reassurance than usual
NIFTY|Cleverly useful in a small but pleasing way
NINJA|A stealthy martial-arts figure that became a word for an expert
NOBLE|Honorable in character, or belonging to the aristocracy
NOMAD|Someone whose home moves rather than stays in one place
NOISY|Making enough sound to be hard to ignore
NUTTY|Tasting of nuts, or a little eccentric
ODDLY|In a way that feels unusual or unexpected
OPERA|A stage drama in which much of the story is sung
ORGAN|A part of a body or a keyboard instrument with pipes
OVERT|Out in the open rather than deliberately hidden
PANDA|A bamboo-eating bear whose coat is mostly black and white
PAPAL|Relating to the pope rather than clergy in general
PASTA|Noodles, tubes, or ribbons that start from dough
PENNY|A small coin that can drop when something finally makes sense
PESTO|A basil-based sauce that turns pasta green
PHOTO|An instant you can keep without keeping time still
PLUSH|Luxuriously soft, like a stuffed toy's surface
POPPY|A flower whose name repeats its first letter twice
PUPIL|A student, or the dark opening at the center of an eye
QUACK|A duck's sound or a fraudulent medical practitioner
QUOTA|An assigned share or a target amount to reach
RERUN|An old episode getting another turn on screen
RESET|Start over without necessarily replacing the device
RETRO|Newly made but deliberately dressed like the past
REVEL|Enjoy yourself enthusiastically, often with others
ROOST|A bird's nighttime resting place, or settle there
RUMMY|A card game built around matching sets and sequences
SALSA|A dance that shares its name with a spicy sauce
SATIN|A smooth fabric with one particularly shiny face
SAUNA|A hot little room entered on purpose to sweat
SIEVE|A mesh tool that keeps lumps but lets finer material pass
SCOOP|A rounded serving of ice cream, or a reporter's exclusive story
SONAR|Sound used to locate objects underwater
SPOOF|A humorous imitation rather than the genuine thing
TABOO|Something a culture treats as forbidden
TAFFY|A chewy sweet made by pulling and stretching
TENET|A belief treated as a basic principle
TUTOR|A teacher who works with one learner or a small group
UNZIP|Open something by separating its interlocking teeth
VENUE|The place an event happens, rather than the event itself
VILLA|A large country house or a holiday home
VODKA|A clear distilled spirit often used in cocktails
WEARY|Tired in body or spirit after too much effort
YUMMY|An informal verdict that something tastes very good`),
];
export const PRACTICE_EDITION_EXTRAS=[
 ...entries('normal',`
ALMOND|A nut often turned into a milk alternative
ANCHOR|A ship's heavy way of staying put
APRICOT|A small orange fruit with a stone in the middle
BALLET|A dance form whose performers may rise onto their toes
BAMBOO|A hollow-stemmed grass on a panda's menu
BANANA|A curved fruit that comes with its own peel-away wrapper
BEACON|A guiding light for someone finding their way
BEAVER|A rodent whose building projects can block a stream
BISCUIT|A small bread in America or a cookie in Britain
BOUQUET|Flowers arranged to be given together
BUBBLE|A pocket of air wearing a very thin liquid coat
CACTUS|A water-storing plant that often comes with sharp defenses
CANVAS|A painter's surface before the picture appears
CASHEW|A curved nut shaped a little like a kidney
CEREAL|A breakfast food that usually shares its bowl with milk
CHERRY|A small red fruit that can sit on top of a sundae
COCONUT|A tropical fruit with a hard shell and white flesh
COMEDY|A story whose main job is to make you laugh
COTTON|A soft plant fiber turned into shirts and sheets
CRAYON|A colorful drawing tool made from wax
CUSHION|A chair's removable layer of softness
DOODLE|A drawing made while your mind is somewhere else
DUMPLING|A small parcel of dough, sometimes hiding a filling
FABRIC|The material a tailor starts with
FALCON|A fast-flying bird that hunts other animals
GARLIC|A strong-flavored bulb divided into individual cloves
GUITAR|A stringed instrument that can be strummed or picked
HAMMOCK|A bed whose whole job is hanging around
LIZARD|A scaly reptile often found warming itself in the sun
MEADOW|An open grassy area that may fill with wildflowers`),
 ...entries('hard',`
COBBLER|A shoe repairer who shares a name with a fruit dessert
COFFEE|A brewed drink whose bean is actually a seed
DAZZLE|Impress so brightly that looking becomes difficult
ESPRESSO|A concentrated coffee with no X in its spelling
FERRET|A long-bodied pet, or search persistently for hidden facts
FIDDLE|A violin's informal name, or fidget with something
HICCUP|A small involuntary gasp, or a temporary hitch in a plan
HUMMUS|A chickpea dip whose name contains a doubled consonant
JIGSAW|A cutting tool that also names a pieced-together puzzle
JUGGLE|Keep objects in the air, or manage competing demands
LAGOON|Shallow water partly cut off from the open sea
LASAGNA|A pasta dish built in layers rather than twirled
MARBLE|A small glass toy that shares its name with a stone
MOSAIC|A whole picture assembled from many small pieces
MUFFIN|A small baked item often sold as breakfast rather than dessert
NOODLE|A strip of pasta, or an informal word for your head
ORIGAMI|Paper turned into shapes without scissors or glue
PALETTE|An artist's mixing board or a chosen set of colors
PAPAYA|An orange-fleshed tropical fruit with a crowd of black seeds
PEBBLE|A small stone whose rough edges have been worn away
PIGEON|A familiar city bird that once carried important messages
POPCORN|A cinema snack that expands dramatically when heated
PRETZEL|A salty snack whose shape ties itself in a knot
RIPPLE|A small wave that lends its name to a spreading effect
ROCKET|A space vehicle, or rise exceptionally quickly
SANDAL|Footwear that leaves much of the foot uncovered
SEQUIN|A tiny shiny clothing decoration rather than a button
SKETCH|A rough drawing or a short comic scene
WAFFLE|A breakfast with little pockets, or avoid a firm decision
WIGGLE|A small side-to-side movement or room to negotiate`),
];
