// Original theme sets. The anchor is a longer answer; its direct clue and
// surrounding related entries make it approachable without specialist trivia.
export const CROSSWORD_THEMES=[];
function theme(id,title,description,anchors,words,season='') {
 CROSSWORD_THEMES.push({id,title,description,anchors:anchors.split(' '),words:new Set((anchors+' '+words).split(' ')),season});
}
theme('bread','From dough to toast','Ingredients, tools, and steps in baking bread.','SOURDOUGH BREADMAKER','BREAD YEAST FLOUR DOUGH KNEAD PROOF RISE CRUST CRUMB SLICE TOAST OVEN BAKE BAKER WHEAT GRAIN RYE SALT WATER BUTTER KNIFE LOAF TRAY TIMER');
theme('supper','Something simmering','A meal prepared slowly in the kitchen.','SIMMER RECIPE KITCHEN','SOUP STEW BROTH STOCK STOVE OVEN PAN POT SPOON BOWL ONION GARLIC CARROT HERB SPICE SALT PEPPER SAUCE CHOP DICE STIR TASTE AROMA STEAM HEAT');
theme('coffee','At the coffee counter','Drinks, equipment, and little treats in a café.','ESPRESSO CAPPUCCINO','COFFEE LATTE MOCHA DECAF MILK CREAM FOAM SUGAR CUP MUG BEANS GRIND ROAST AROMA STEAM KETTLE TEA CAKE COOKIE BISCUIT MENU ORDER TABLE');
theme('sewing','Made with thread','Tools and techniques for sewing and mending.','NEEDLEWORK PATCHWORK','NEEDLE THREAD STITCH FABRIC CLOTH COTTON LINEN WOOL YARN BUTTON ZIPPER HEM SEAM PATCH QUILT PIN SCISSORS SLEEVE DRESS SHIRT SKIRT SATIN TULLE');
theme('garden','A growing patch','Plants and the work that helps a garden grow.','GREENHOUSE GARDENER','GARDEN PLANT SEED SOIL WATER ROOT STEM LEAF BLOOM FLOWER PETAL BULB TULIP DAISY PEONY LILAC HEDGE SHRUB SPADE RAKE MULCH COMPOST WEED THORN');
theme('shore','Where land meets sea','Things found along a coast and in shallow water.','COASTLINE SEASHELL','COAST SHORE BEACH SAND TIDE WAVE SURF FOAM SHELL CORAL REEF ROCK CRAB GULL PEBBLE OCEAN SEA SALT DUNE BOAT PIER WHARF LAGOON ATOLL');
theme('weather','Look out the window','Clouds, forecasts, and changing weather.','FORECAST THUNDER','CLOUD RAIN WIND STORM SHOWER DRIZZLE MIST FOG HAIL SNOW SLEET FROST ICE SUN HEAT WARM COLD DAMP WET DRY BREEZE GUST LIGHTNING RAINBOW');
theme('music','Play it together','Instruments and the building blocks of a performance.','ORCHESTRA HARMONY','MUSIC MELODY RHYTHM TEMPO NOTE CHORD SCALE TUNE SONG VOICE CHOIR PIANO VIOLIN VIOLA CELLO FLUTE DRUM GUITAR BASS HARP BATON STAGE SCORE');
theme('books','Between the covers','Stories and the parts of a book that hold them.','BOOKMARK CHAPTER','BOOK NOVEL STORY TALE FABLE FICTION AUTHOR TITLE COVER SPINE PAGE PAPER PRINT PROSE PLOT HERO SCENE ENDING LIBRARY SHELF READ INK QUILL');
theme('cinema','A night at the movies','The people and things involved in a film.','SCREENPLAY DIRECTOR','MOVIE FILM CINEMA SCREEN ACTOR CAST ROLE SCENE SCRIPT DRAMA COMEDY THRILLER SEQUEL TRAILER TICKET POPCORN SEAT CAMERA SOUND STUNT STAR');
theme('journey','Off for a little trip','Packing, finding the way, and getting somewhere new.','ITINERARY LUGGAGE','TRAVEL JOURNEY TRIP ROUTE MAP COMPASS ROAD TRAIN PLANE PILOT TICKET STATION HOTEL CABIN BAG CASE PACK GUIDE TOUR VISIT LOCAL ARRIVE DEPART');
theme('home','Room to settle in','Furniture and features that make a house a home.','FIREPLACE ARMCHAIR','HOME HOUSE ROOM DOOR WINDOW FLOOR WALL ROOF CHIMNEY HEARTH SOFA COUCH CHAIR TABLE SHELF LAMP PILLOW BLANKET CURTAIN CARPET RUG MIRROR FRAME');
theme('chess','Across the chessboard','Pieces, positions, and moves in a game of chess.','CHECKMATE CHESSBOARD','CHESS BOARD KING QUEEN ROOK BISHOP KNIGHT PAWN CHECK MATE CASTLE MOVE TURN FILE RANK SQUARE WHITE BLACK DRAW STALEMATE CAPTURE');
theme('post','A little letter','Writing, wrapping, and sending something to someone.','ENVELOPE POSTCARD','LETTER NOTE PAPER PEN INK WRITE STAMP POST MAIL ADDRESS CARD PARCEL PACKAGE WRAP TAPE LABEL SEAL SEND REPLY GREET MESSAGE BOX');
theme('stars','Above us after dark','Objects and observations in the night sky.','TELESCOPE STARLIGHT','STAR MOON PLANET ORBIT SPACE SKY NIGHT LUNAR SOLAR COMET METEOR GALAXY VENUS MARS EARTH GLOW LIGHT PHASE ECLIPSE SHADOW DUSK DAWN');
theme('river','Along the river','Fresh water and the land it flows through.','WATERFALL RIVERBANK','RIVER STREAM BROOK CREEK WATER FLOW CURRENT RAPID DELTA BANK REED FROG FISH OTTER BRIDGE STONE ROCK MOSS MUD CANOE PADDLE LAKE POND');
theme('art','A splash of color','Materials, marks, and surfaces used to make art.','WATERCOLOR SKETCHBOOK','PAINT BRUSH CANVAS PAPER PENCIL CRAYON CHALK INK SKETCH DRAW LINE SHADE TONE COLOR HUE BLUE RED GREEN GOLD MURAL MOSAIC FRAME PALETTE');
theme('bicycle','A ride around town','Parts of a bicycle and the things a rider uses.','HANDLEBAR BICYCLE','WHEEL PEDAL CHAIN BRAKE SPOKE TIRE SEAT SADDLE FRAME GEAR BELL HELMET ROAD PATH TRAIL RIDE TURN HILL PUMP CYCLE');
theme('hive','Flowers to honey','Bees, their home, and the plants they visit.','HONEYCOMB BEEKEEPER','BEE HIVE HONEY WAX COMB QUEEN DRONE SWARM STING WING FLOWER PETAL BLOOM POLLEN NECTAR GARDEN MEADOW CLOVER');
theme('baking','A sweet little batch','Ingredients and treats from the oven.','SHORTBREAD CHEESECAKE','CAKE COOKIE BISCUIT SUGAR BUTTER FLOUR EGG CREAM VANILLA CHOCOLATE COCOA ICING DOUGH OVEN BAKE BAKER TRAY MIXER WHISK BOWL TART PIE CRUST');
theme('halloween','Ready for trick-or-treating','Outfits, decorations, and sweets for Halloween.','JACKOLANTERN TRICKORTREAT','COSTUME MASK CAPE WIG MAKEUP FANGS CANDY TREAT TRICK PUMPKIN CARVE CANDLE WICK GLOW DOORBELL BAG BUCKET GHOST WITCH HAT BAT BOO','october');
theme('witch','In the witch’s kitchen','A spell-making scene from a Halloween story.','CAULDRON WITCHCRAFT','WITCH WIZARD WARLOCK MAGIC SPELL POTION BREW WAND BROOM HAT CLOAK CAT BAT TOAD NEWT HERB ROOT BUBBLE STIR SMOKE CHARM CURSE COVEN','october');
theme('haunted','That old haunted house','Places, sounds, and shadows in a spooky house.','HAUNTEDHOUSE COBWEB','GHOST HAUNT SPIRIT SHADOW ATTIC CELLAR DOOR WINDOW STAIRS CREAK GROAN RATTLE ECHO DRAFT CANDLE LANTERN SPIDER WEB DUST DARK HIDDEN SECRET','october');
theme('harvest','Out in the autumn field','Gathering crops as the growing season ends.','SCARECROW HARVEST','FIELD FARM CROP CORN WHEAT GRAIN HAY STRAW BALE HAYRIDE PUMPKIN GOURD SQUASH SEED STALK REAP RAKE LEAF ACORN APPLE CIDER ORCHARD','october');
theme('forest','An autumn walk','Leaves, trees, and small things along a woodland path.','WOODLAND CHESTNUT','TREE WOODS FOREST LEAF LEAVES MAPLE OAK ACORN TWIG BRANCH BOUGH BARK MOSS FERN PATH TRAIL BOOTS RUSTLE WIND AMBER TAWNY RED BROWN','october');
theme('scary-story','One more spooky story','Characters and suspense in a frightening tale.','NIGHTMARE JUMPSCARE','STORY TALE HORROR FEAR FRIGHT DREAD SCARE SCREAM SHIVER STARTLE THRILL MONSTER VAMPIRE WEREWOLF ZOMBIE GHOUL GHOST MUMMY DARK MIDNIGHT MOON','october');
theme('autumn-evening','A chilly evening in','Warm food and soft layers after an autumn walk.','FIREPLACE SWEATER','HEARTH FIRE EMBER LOG BLAZE WARM GLOW WOOL KNIT YARN BLANKET PILLOW SOFA TEA CIDER SOUP STEW SPOON MUG KETTLE CHILL BRISK COAT SCARF','october');
theme('lanterns','Little lights in the dark','Ways to light an October night.','CANDLELIGHT LANTERN','CANDLE WICK WAX FLAME FIRE GLOW LIGHT TORCH LAMP MATCH SPARK EMBER SHADOW DARK NIGHT DUSK MOON STAR PUMPKIN CARVE','october');
theme('gingerbread','A house you can eat','Baking and decorating a gingerbread house.','GINGERBREAD CINNAMON','GINGER SPICE CLOVE NUTMEG FLOUR SUGAR BUTTER DOUGH BAKE OVEN COOKIE ICING CANDY ROOF DOOR WINDOW WALL SWEET TREAT','december');
theme('tree','A branch for every bauble','Decorations and lights for a Christmas tree.','EVERGREEN ORNAMENT','TREE PINE FIR SPRUCE BRANCH NEEDLE BAUBLE TINSEL GARLAND LIGHTS STAR ANGEL RIBBON BOW GOLD SILVER GLASS SPARKLE TWINKLE','december');
theme('gifts','Something under the ribbon','Preparing and exchanging holiday presents.','WRAPPING STOCKING','GIFT GIFTS PRESENT PACKAGE PARCEL BOX PAPER WRAP UNWRAP RIBBON BOW TAPE TAG LABEL CARD WISH LIST TOY GIVING SHARE SURPRISE','december');
theme('sleigh','A Christmas Eve journey','The traditional story of Santa’s delivery route.','REINDEER NORTHPOLE','SANTA ELF WORKSHOP TOY SLEIGH SLED RUDOLPH REIN BELLS SKY NIGHT ROOF CHIMNEY FIREPLACE STOCKING COOKIE MILK SNOW BOOTS COAT','december');
theme('winter','A world of white','Snow, ice, and a cold winter day outdoors.','SNOWFLAKE BLIZZARD','SNOW FROST ICE ICICLE ICY SLEET SLUSH FLURRY DRIFT COLD FREEZE FROZEN THAW WIND CHILL WHITE SLED SKATE RINK SNOWMAN SNOWBALL','december');
theme('carols','Music by the tree','Singing and performing holiday music together.','NUTCRACKER CAROLERS','CAROL CHOIR SONG SONGS VOICE NOTE TUNE MELODY HARMONY CHIME BELLS PIANO MUSIC DANCE BALLET STAGE NOEL JOY CHEER MERRY','december');
theme('winter-layers','Wrapped up warm','Clothing and fabrics that keep winter out.','OVERCOAT MITTENS','COAT SCARF HAT BOOTS GLOVE GLOVES MITTEN WOOL FLEECE KNIT YARN SWEATER SOCK SOCKS HOOD JACKET BUTTON ZIPPER WARM LAYER QUILT','december');
theme('holiday-table','A place at the table','Food and company at a December gathering.','CRANBERRY CELEBRATE','FAMILY FRIEND GUEST HOME TOGETHER FEAST TURKEY ROAST GRAVY SAUCE POTATO CARROT PIE PUDDING CREAM SPICE PLATE FORK SPOON TABLE CHAIR TOAST PEACE','december');

// A word's intended sense must fit this board, not just its spelling. These
// override the general word-book definition only inside the relevant theme.
const senses={
 bread:{PROOF:'Let yeast dough rest and rise before baking',RISE:'Expand as yeast produces gas inside dough',CRUST:'The firm outer surface of a baked loaf',GRAIN:'The edible seed of wheat or another cereal plant'},
 supper:{STOCK:'A flavorful cooking liquid made by simmering ingredients in water',DICE:'Cut food into small, roughly equal cubes',HERB:'A leafy plant used to flavor a savory dish'},
 coffee:{BEANS:'Roasted seeds that are ground to make coffee',ROAST:'Heat raw coffee seeds to develop their flavor',GRIND:'Break roasted coffee seeds into fine particles',FOAM:'The layer of tiny milk bubbles on a cappuccino',ORDER:'Tell the barista which drink you would like'},
 sewing:{HEM:'Folded and stitched edge at the bottom of a garment',PIN:'A thin pointed fastener that holds fabric before sewing'},
 garden:{BULB:'An underground plant structure that can grow into a tulip',BED:'A prepared patch of soil for flowers or vegetables'},
 shore:{SHELL:'A hard protective covering left by a sea creature',WAVE:'A moving ridge of water that breaks near the shore',SURF:'The foamy breaking waves along a beach'},
 weather:{SHOWER:'A brief period of falling rain',HAIL:'Small balls of ice falling from a storm cloud'},
 music:{SCALE:'A sequence of musical notes arranged by pitch',NOTE:'One musical sound with a particular pitch',SCORE:'Written music showing the parts of a performance',BASS:'The lowest-pitched part in a musical arrangement'},
 books:{SPINE:'The bound edge of a book, often printed with its title',COVER:'The protective outside of a book',PLOT:'The connected events that make up a story',HERO:'The central character whose journey a story follows'},
 cinema:{STAR:'A leading performer in a film',CAST:'All the actors chosen for a film',SHOOT:'Record a scene with a camera',TRAILER:'A short preview advertising a film'},
 journey:{CASE:'A container in which a traveler packs clothes',PACK:'Put belongings into luggage before a trip',TRAIN:'Linked railway carriages carrying passengers or goods'},
 home:{FRAME:'The border that holds a picture on the wall',HEARTH:'The floor and immediate area around a fireplace'},
 chess:{QUEEN:'The chess piece that moves any distance along rows, columns, or diagonals',KING:'The chess piece that must never be left in check',FILE:'A vertical column of squares on a chessboard',RANK:'A horizontal row of squares on a chessboard',CHECK:'A direct threat to the opposing king',CASTLE:'Make the special chess move involving the king and a rook',DRAW:'A chess result in which neither player wins',MATE:'A king is threatened and has no legal escape',TURN:'One player’s opportunity to make a move'},
 post:{SEAL:'Close an envelope securely before mailing it',POST:'Send a letter through the mail',CARD:'A paper greeting with space for a personal message',LABEL:'An attached piece of paper showing a parcel’s destination'},
 stars:{STAR:'A distant luminous ball of gas, like our Sun',SPACE:'The region beyond Earth’s atmosphere',PHASE:'One of the Moon’s changing apparent shapes',SHADOW:'The dark region formed when a celestial body blocks light'},
 river:{BANK:'The raised land alongside a river',CURRENT:'The moving flow of water in a river',BED:'The ground beneath a flowing river',DELTA:'Sediment-built land where a river meets another body of water'},
 art:{DRAW:'Make a picture with a pencil or similar tool',TONE:'How light or dark a color appears',SHADE:'A darker version of a color',BRUSH:'A bristled tool used to apply paint',PALETTE:'The surface on which a painter mixes colors'},
 bicycle:{GEAR:'A toothed wheel that changes the mechanical advantage of pedaling',CHAIN:'Linked metal loops that carry power from pedals to the rear wheel',BRAKE:'A device used to slow or stop a bicycle',BELL:'A small ringing device that alerts people to a cyclist'},
 hive:{QUEEN:'The egg-laying female in a bee colony',COMB:'The wax structure of cells where bees store honey',WING:'One of a bee’s thin flight surfaces',DRONE:'A male bee in a colony',STING:'The sharp puncture a bee can deliver in defense'},
 baking:{ICING:'A sweet coating spread over a cake or biscuit',CRUST:'The baked outer shell of a pie or tart',CREAM:'The rich fatty part of milk used in many desserts'},
 halloween:{TRICK:'The mischievous alternative to a treat in a Halloween greeting',TREAT:'A sweet given to a costumed doorstep visitor',BAT:'A flying mammal often pictured in Halloween decorations',MASK:'A face covering worn as part of a costume'},
 witch:{CHARM:'A magical spell or object believed to bring protection',BREW:'Prepare a magical mixture by heating its ingredients',CAT:'A feline companion often pictured beside a witch'},
 haunted:{DRAFT:'A cool current of air that seems to enter a closed room',SPIRIT:'A ghost believed to remain after a person has died'},
 harvest:{FIELD:'An open area of land used for growing crops',REAP:'Cut and gather a ripe crop',STALK:'The main stem of a corn plant'},
 forest:{BARK:'The protective outer layer of a tree trunk',PATH:'A narrow walking route through the trees'},
 'scary-story':{THRILL:'A rush of excitement mixed with fear',MONSTER:'A frightening imaginary creature in a story'},
 'autumn-evening':{LOG:'A cut section of tree trunk used as firewood',KNIT:'Make warm fabric by forming linked loops of yarn'},
 lanterns:{MATCH:'A small stick struck to light a flame',WICK:'The thread inside a candle that draws wax to its flame'},
 gingerbread:{ICING:'A sweet paste used to join and decorate edible house pieces',ROOF:'The sloping top of an edible gingerbread house'},
 tree:{STAR:'A pointed ornament often placed at the top of a Christmas tree',ANGEL:'A winged figure used as a Christmas tree topper',NEEDLE:'A thin, pointed evergreen leaf',LIGHTS:'Small electric bulbs strung around a Christmas tree'},
 gifts:{PRESENT:'A gift prepared for someone to open',TAG:'A small label identifying a gift’s recipient',WRAPPING:'Paper or fabric covering a present',STOCKING:'A large festive sock hung for small gifts'},
 sleigh:{REIN:'A strap used to guide an animal pulling a sleigh',BELLS:'Ringing objects attached to a Christmas sleigh'},
 winter:{DRIFT:'A mound of snow piled up by the wind',FLURRY:'A brief, light fall of snow',RINK:'An enclosed area of ice used for skating'},
 carols:{NOTE:'One musical pitch in a Christmas melody',SCORE:'The written music used by holiday performers'},
 'winter-layers':{LAYER:'One garment worn over another to retain warmth',HOOD:'The attached head covering on a warm coat'},
 'holiday-table':{TOAST:'A short speech made while raising a glass',ROAST:'A large piece of meat cooked in an oven',GUEST:'Someone invited to share the holiday gathering'},
};
for(const t of CROSSWORD_THEMES)t.clues=senses[t.id]||{};
export function themeEntry(t,e){return t.words.has(e.word)?{...e,clue:t.clues[e.word]||e.clue,theme:t.title}:e;}
