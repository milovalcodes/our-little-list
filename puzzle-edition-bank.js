// Original clues: familiar answers, difficulty through interpretation rather than trivia.
// Hard clues use fair double meanings; these are not academic grade levels.
export function editionPool(difficulty,theme,label,text,season=''){
 const id=(season?season+'-':'')+'v4-'+theme;
 return {id,label,difficulty,season,edition:4,entries:text.trim().split('\n').map(row=>{
  const [word,clue]=row.split('|');
  return {id:id+'-'+difficulty+'-'+word.toLowerCase(),word,clue,difficulty,theme:id,themeLabel:label,season};
 })};
}
export const EDITION_POOLS=[
 editionPool('normal','everyday','Small daily mysteries',`
ALARM|It interrupts a dream on purpose
POCKET|A place to keep change without a bank
MIRROR|It returns your look without judging it
BUTTON|A shirt fastener that can pop
ZIPPER|Its teeth close a jacket rather than chew
DRAWER|Pull-out home for socks or silverware
CURTAIN|Fabric that gives a window some privacy
PILLOW|The soft landing at the end of your day
BLANKET|Something to pull up when the temperature drops
LADDER|A way to gain height one rung at a time
HANDLE|The part of a suitcase that does the heavy lifting
HINGE|The joint that lets a door change its angle
SOCKET|A wall opening that supplies power
CABLE|The connection a wireless device does without
SCREEN|It can show a film or keep bugs out
SHELF|A resting place for books above the floor
FRAME|The border that helps a picture hang together
TOWEL|It gets wetter while making you drier
SPONGE|A kitchen helper that soaks up its work
BROOM|Its job is to give dust the brush-off
BUCKET|A container carried by a swinging handle
FAUCET|Turn it to make water arrive
DRAIN|The exit route for bathwater
KETTLE|A water heater that may announce itself with a whistle
TOASTER|A breakfast appliance with pop-up results
FREEZER|The place where leftovers wait below zero
RECEIPT|Paper proof that the shopping happened
WALLET|A pocket-sized home for cards and cash
PASSWORD|A secret that opens a digital door
CALENDAR|A collection of dates you can hang on a wall`),
 editionPool('normal','outdoors','Out and about',`
BRIDGE|A crossing that keeps your feet above the water
TUNNEL|A route that goes through rather than over
CORNER|Where two streets or two walls meet
SIGNAL|A traffic light gives drivers this instruction
STATION|A place to catch a train rather than chase it
TICKET|Proof you have paid for a journey or a show
PLATFORM|Where passengers wait beside the tracks
LUGGAGE|The bags that go on holiday with you
COMPASS|It points north even when you are lost
MAP|A folded guide that shows the bigger picture
TRAIL|A path that hikers follow through the countryside
SUMMIT|A mountain's highest meeting point
VALLEY|Low ground with higher land on both sides
STREAM|Running water smaller than a river
ISLAND|Land with water on every side
SHORE|The meeting place of land and water
HORIZON|The distant line where sky seems to meet earth
SHADOW|It follows you when the light is right
RAINBOW|A wet-weather arc that separates sunlight into colors
THUNDER|The sound that usually follows a flash
FORECAST|A prediction that helps you pack an umbrella
PUDDLE|A small bit of yesterday's rain underfoot
SHELTER|A place to escape the rain or wind
BENCH|A park seat long enough to share
FOUNTAIN|A water feature that sends its water upward
GARDEN|A patch of ground with a growing collection
ROOT|The plant part that keeps a low profile underground
BRANCH|A tree limb or a smaller office
SEED|A tiny starting point for a much bigger plant
PETAL|One piece of a flower's colorful display`),
 editionPool('normal','play','A little downtime',`
PUZZLE|A problem you solve for fun
RIDDLE|A question whose answer takes a sideways thought
CLUE|A small piece of help toward a bigger answer
GUESS|An answer offered before you are sure
PATTERN|A repeat that helps you predict what comes next
STRATEGY|A plan for winning rather than just hoping
SCORE|The numbers that say how the game is going
DRAW|A game result with nobody ahead
REPLAY|A chance to watch that moment again
REMATCH|Another game against the same opponent
SHUFFLE|Mix the deck before dealing
JOKER|The wild one in a deck of cards
DICE|Small cubes that leave the next move to chance
TOKEN|A small object that stands in for a player
PAWN|The chess piece that dreams of becoming a queen
KNIGHT|The chess piece that jumps in an L shape
CASTLE|A rook's familiar nickname
ARCADE|A place where games line up to take your coins
LEVEL|A stage to clear before the next challenge
BONUS|An extra reward beyond the regular score
TROPHY|A prize you can put on a shelf
CHAMPION|The person everyone else is trying to beat
COMIC|A story told through panels and speech bubbles
CHAPTER|A book's built-in stopping point
BOOKMARK|It remembers your place while you do something else
SEQUEL|A story that picks up after an earlier one
TRAILER|A movie's preview rather than its full story
ACTOR|Someone paid to be someone else
MELODY|The part of a song you are likely to hum
CHORUS|The part of a song that keeps coming back`),
 editionPool('normal','together','People and little plans',`
PROMISE|A commitment made with words rather than a contract
SECRET|Something shared with a request not to share it
TRUST|What lets you believe someone will keep their word
FAVOR|A helpful act someone does for you
ADVICE|A suggestion you may take without taking an object
APOLOGY|Words meant to repair a hurt
COMFORT|What a hug can offer without solving the problem
COURAGE|What helps you act even when you are scared
PATIENCE|The ability to wait without losing your cool
HABIT|Something repetition turns into second nature
CHOICE|What you make when there is more than one option
CHANCE|An opportunity or a matter of luck
CHANGE|It can be a fresh start or coins in your pocket
EFFORT|The work you put in even before a result
PROGRESS|Movement closer to where you want to be
BALANCE|What keeps both a tightrope walker and a budget steady
MEMORY|A moment kept after the moment is gone
SURPRISE|Something you did not see coming
INVITE|Ask someone to join the plan
GUEST|Someone welcomed into another person's home
HOST|The person who welcomes the guests
PARTNER|Someone on your side of a shared project or life
NEIGHBOR|Someone whose home is close to yours
TEAM|People working toward the same result
CHEER|A shout meant to lift someone else's spirits
LAUGH|A sound that can make a joke contagious
SMILE|A happy expression that needs no words
WAVE|A greeting you can send across a room
TOAST|Words raised with a glass in celebration
PICNIC|A meal taken outside with a blanket as the table`),
 editionPool('hard','double','Two ways to read it',`
BARK|A dog's complaint or a tree's coat
BANK|A place for savings or a river's edge
BAT|A flying mammal or a hitter's tool
BEAM|A ray of light or a very wide smile
BOLT|A metal fastener or a sudden dash
BOUND|Tied up, or headed somewhere
CHARGE|A battery needs it; a customer may dispute it
COACH|A team trainer or a long-distance bus
CRANE|A long-necked bird or a heavy lifter
CURRENT|Flowing through a wire, or happening right now
DRAFT|An unfinished version or a breeze indoors
FAIR|Even-handed, or a place with rides
FILE|A folder's contents or a nail-smoothing tool
FINE|Excellent, unless it is a parking penalty
GRAIN|A cereal seed or the lines in wood
ISSUE|A magazine edition or a problem to address
JAM|A fruit spread or traffic going nowhere
LEAF|A tree's page or a book's, so to speak
MATCH|A close contest or a tiny fire starter
MINT|A place that makes coins or a breath freshener
NOVEL|New and unusual, or a long work of fiction
PITCH|A sales proposal or the height of a note
PLANE|A flying vehicle or a flat surface in geometry
RACKET|A tennis tool or a terrible noise
SEAL|A flippered swimmer or a tight closure
SOLE|The bottom of a shoe, or the only one
SPRING|A season, a coil, or a leap
STABLE|Steady, or housing for horses
TENDER|Gentle to the touch, or an offer to buy
WELL|In good health, or a source of water`),
 editionPool('hard','sideways','Think sideways',`
ECHO|It has your voice but never starts the conversation
HOLE|It gets bigger as you take material away
SILENCE|You break it just by saying its name aloud
FOOTPRINT|A mark you leave behind while moving ahead
AGE|It keeps increasing without needing your permission
TOMORROW|Always one day away until its name changes
QUEUE|A line whose first letter says its whole name
KEYBOARD|It has keys and a space, but no lock or room
CLOCK|Its hands travel all day without leaving its face
NEEDLE|It has an eye but needs your help to see the thread
COMB|Its teeth tidy up rather than bite down
TEAPOT|It has a spout, a handle, and a steeping job
ENVELOPE|A paper traveler that may carry a stamp
SPIRAL|A curve that keeps circling without closing
KNOT|A problem in a shoelace, solved by pulling the right way
REFLECTION|A version of you that reverses every wave
CHECKMATE|The end of a chase in which the king cannot escape
SHORTCUT|A route chosen to make the journey smaller
BACKSPACE|The key that makes your last character disappear
BOOKEND|One of a pair that keeps a row of stories upright
DOORBELL|It announces a visitor before you see one
ESCALATOR|Stairs that do part of the climbing for you
TRADEOFF|Getting one benefit by giving another one up
LOOPHOLE|A gap in a rule rather than in a fence
DETOUR|The longer way that avoids a blocked short way
DEADLINE|A line you cross by being late, not by walking
OUTLINE|A plan with the details still missing
OVERLAP|The shared part of two things that partly cover each other
AFTERLIFE|A second existence imagined beyond the first one
DAYDREAM|A waking escape that never leaves your chair`),
 editionPool('hard','expressions','Hidden in plain speech',`
ICE|What a friendly first joke might break
BEANS|What a secret-spiller is said to spill
BUCKET|What a very small contribution is a drop in
ROPE|What you reach the end of when patience runs out
TOWEL|What you throw in when you finally give up
FENCE|What an undecided person sits on, figuratively
WATER|The hot stuff you are in when you are in trouble
BRIDGE|What you cross when you come to it, in advice
GROUND|What you stand when refusing to back down
FOOT|The body part you put down when setting a firm limit
SHOE|The other one you wait for someone to drop
SLEEVE|Where an openhearted person wears their heart
THUMB|The green digit of a successful gardener
LIP|The body part you bite to keep a comment in
TEETH|What a narrow escape is by the skin of
NECK|What you stick out when taking a risk for someone
SHOULDER|The cold body part that means you are being ignored
HEART|What you take when encouraged, or lose when discouraged
HEAD|What you keep when everyone else is panicking
TAIL|The side of a coin opposite heads
TABLE|Where an offer sits while it is available
CARPET|Where trouble may be swept if someone hides it
CORNER|What you turn when things start getting better
LOOP|What you are kept in when you receive the updates
BALL|What you drop when you neglect a responsibility
COURT|Where the ball is when it is your turn to decide
CHAIN|What someone pulls when they are teasing you
STRING|One of the things you pull to call in influential favors
NUTSHELL|A tiny container for a very brief explanation
ROOFTOP|A place to shout news you want everyone to hear`),
 editionPool('hard','twists','Familiar things, tricky angles',`
ADDRESS|It can locate a home or begin a speech
APPEAL|A request to reconsider, or the quality of being attractive
BOARD|A plank, a panel of directors, or a place to play chess
BRIGHT|Full of light, or quick to understand
CAPITAL|A country's main city or money put into a business
CELL|A prisoner's room or a living body's tiny building block
DATE|A calendar entry, a romantic meeting, or a sweet fruit
DECK|A ship's floor or a pack of cards
EXPRESS|Say what you feel, or travel with fewer stops
FAN|An admirer that may not move any air
FILTER|It removes grounds from coffee or distractions from a search
GLASSES|You can see through them or drink from them
GROOM|One half of a wedding pair, or tidy an animal's coat
HATCH|An opening in a roof, or emerge from an egg
IRON|A metal that also smooths your shirt
LAP|A circuit of a track or a seat for a cat
LIGHT|Not heavy, unless you mean the opposite of dark
MODEL|A small replica or a person displaying clothes
NOTE|A short message or one sound in a tune
ORDER|A restaurant request or the opposite of chaos
PALM|A tropical tree or the inside of your hand
PARK|Leave a car, or visit a green space
POUND|A unit of weight or strike repeatedly
RING|A piece of jewelry or the sound of a call
ROCK|A stone, a music genre, or a gentle back-and-forth movement
SINK|A kitchen basin or what a leaking boat might do
STICK|A piece of wood, or stay attached
TIE|Neckwear, a knot, or an even score
TRAIN|A line of carriages or practice to improve
WATCH|A timepiece, or keep your eyes on something`),
];
