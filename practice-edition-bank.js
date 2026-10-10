// Original, assorted practice. No seasonal scheduling and no competitive writes.
const entries=(difficulty,text)=>text.trim().split('\n').map(line=>{const [word,clue]=line.split('|');return {word,clue,difficulty};});
export const PRACTICE_EDITION_WORDS=[
 ...entries('normal',`
ABACK|Taken this way, someone was caught by surprise
ABASE|Lower someone's dignity or standing
ABASH|Make someone lose their self-confidence through embarrassment
ABIDE|Accept a decision even when it is not the one you wanted
ABODE|A dwelling, in a more literary register
ACRID|Sharp and irritating to the nose or taste
ADAGE|A compact saying passed along as practical wisdom
ADDLE|Confuse a mind that was previously clear
ADIEU|A farewell borrowed into English from French
ADOBE|Sun-dried earth used as a building material
ADORN|Add ornament without changing the underlying object
AFOUL|In conflict with a rule: running ___ of it
AGAPE|Open-mouthed, especially from astonishment
AGATE|A banded variety of chalcedony
AGAVE|A succulent whose stored sugars can be fermented
AISLE|The passage between rows rather than either row itself
ALGAE|Photosynthetic aquatic organisms, many of them microscopic
ALIAS|An alternative identity under which someone is known
ALIGN|Bring positions or purposes into agreement
ALLAY|Reduce a fear without necessarily removing its cause
ALLOT|Assign a share of a limited resource
ALOFT|Above the ground, in a more literary expression
ALTER|Change without necessarily replacing
AMASS|Accumulate into a substantial quantity
AMBLE|Walk at an unhurried, relaxed pace
AMITY|A state of friendly relations
ANNEX|Add territory to an existing political unit
ANTIC|A deliberately odd or playful action
APHID|A small sap-feeding insect often attended by ants
AORTA|The main artery carrying blood away from the heart
APNEA|A temporary interruption of breathing
APTLY|In a manner well suited to the circumstances
ARBOR|A shaded garden structure formed with climbing plants
ARDOR|Strong enthusiasm rather than mild interest
ARENA|A setting for competition, literal or figurative
ASIDE|Words addressed to the audience but not heard by other characters
ASKEW|At an angle rather than in the expected alignment
ATOLL|A coral formation enclosing a lagoon
AVAIL|Be of use, often after the word no
AWASH|Flooded with water or figuratively overwhelmed with something
BALMY|Pleasantly mild, as weather can be
BANAL|Unoriginal to the point of being dull
BELIE|Give a false impression of the truth beneath
BERTH|A designated place for a vessel to lie
BESET|Trouble persistently from several directions
BEZEL|The rim holding a gemstone or watch face
BLASE|Unimpressed through overfamiliarity
BLEAK|Without much promise or encouragement
BRIAR|A thorny shrub or tangled growth
BRINE|Water with a high concentration of dissolved salt
BRUNT|The main force of an unpleasant impact
CACHE|A stored reserve, including one kept by a browser
CADET|Someone training for a military or similar service
CAIRN|A pile of stones used as a marker
CANON|An accepted body of works or principles
CARAT|A unit of gemstone mass, not gold purity
CHASM|A deep gap, also used for a major disagreement
CHIDE|Reproach someone for their conduct
CLEFT|Split or divided, as a rock face might be
CLOUT|Influence that makes others take someone seriously
DEBIT|An accounting entry on the left side of an account
DEBUT|A first public appearance
DECOR|The combined furnishing and decoration of a space
DECOY|A substitute intended to draw attention away from the real target
DEPOT|A place where supplies are stored or vehicles are based
DETER|Discourage an action by making its consequences unattractive
DIRGE|A solemn piece associated with mourning
DOWEL|A cylindrical peg used to align or join pieces
DRONE|A sustained low sound without much variation
DUSKY|Dim or shadowed rather than fully dark
DWELL|Remain mentally focused on a subject, sometimes excessively
EBONY|A dense dark wood traditionally used for ornamental work
EDICT|An authoritative proclamation
EJECT|Force something out of a position or enclosure
ELATE|Make someone feel intensely pleased
ENSUE|Happen as a result of what came before
EPOCH|A period marked by a distinctive development
ERODE|Wear away gradually, physically or figuratively
ESSAY|Attempt something; also a familiar form of prose
EXALT|Raise in rank, status or praise
EXTOL|Praise enthusiastically
FARCE|Comedy relying on exaggerated and improbable situations
FERAL|Wild after escape from domestication
FETID|Having an intensely unpleasant smell
FJORD|A narrow sea inlet in a valley carved by a glacier
FLAIR|A distinctive natural aptitude
FLINT|A hard variety of silica once widely used for cutting tools
FORTE|The activity in which someone is especially strong
FORUM|A setting for public discussion
FOYER|The entrance space before the main interior
FRAIL|Easily damaged or weakened
GAFFE|A conspicuous social mistake
GAUNT|Unusually thin and drawn in appearance
GUISE|An outward appearance that may conceal identity or intent
HASTE|Speed adopted at the possible expense of care
HAVOC|Widespread confusion or destruction
HEDGE|Reduce exposure to risk by taking an offsetting position
HOARD|Accumulate and keep a reserve instead of using it
IDYLL|A scene or account of peaceful, idealized life
INEPT|Lacking the skill needed for a situation
JAUNT|A short excursion undertaken for pleasure
JUROR|A person selected to help determine a verdict
KNACK|A particular skill that seems to come naturally
LATHE|A machine that rotates material while it is shaped
LEERY|Cautious because of suspicion
LOFTY|Elevated in position or in ambition
LURID|Sensationally vivid, especially about disturbing material
MAXIM|A short statement expressing a general rule
MIRED|Stuck in mud or in a difficult situation
MIRTH|Amusement expressed through enjoyment or laughter
MOGUL|An influential and powerful person in an industry
MOULT|Shed an outer covering as part of growth or renewal
NOTCH|A cut marking a position, or a step in a scale
ODIUM|Widespread hatred or disgust directed toward someone
ONSET|The beginning of a process, especially an unwelcome one
PARRY|Deflect a blow or an inconvenient question
PITHY|Brief but carrying a substantial point
PLUMB|Exactly vertical, or to investigate to the depth
PROWL|Move about stealthily in search of something
RALLY|Recover strength after a setback
RAVEL|Entangle threads, or in another sense disentangle them
ROGUE|Operating outside accepted rules or control
ROUSE|Bring from inactivity into awareness or action
SCOUR|Search an area thoroughly
SCOWL|An expression showing displeasure through contracted brows
SHIRK|Avoid a responsibility that properly belongs to you
SKEIN|A loose coil of yarn, or a tangled sequence of events
SMELT|Extract metal from ore through heating and chemical reduction
STAKE|An interest exposed to gain or loss
STINT|A limited period spent performing a particular job
STRUT|A supporting member resisting compression
SWATH|A broad strip cut or affected in one pass
TEPID|Neither strongly enthusiastic nor notably warm
THROE|A sharp pang, usually encountered in the plural
TRITE|Worn out through excessive repetition
TRUSS|A rigid framework distributing a structural load
VENAL|Willing to act dishonestly in exchange for money
VEXED|Troubled, or much disputed
VOGUE|The prevailing fashion for a time
WRACK|Severely torment, as with pain or doubt
YEARN|Feel a sustained and intense longing`),
 ...entries('hard',`
ABACI|Counting frames, in the Latin-derived plural
ABUTS|Shares a boundary without an intervening gap
ACTIN|A protein forming thin filaments in muscle and the cytoskeleton
ACUTE|An angle smaller than a right angle
ADZES|Cutting tools with blades set across their handles
AEONS|Immensely long periods, in the British spelling
AGLET|The protective tip at the end of a lace
ALGAL|Relating to photosynthetic organisms such as kelp
ALOES|Succulents whose leaves may yield a soothing gel
AMBIT|The scope or bounds of an activity
AMINO|Describes the group containing nitrogen characteristic of amino acids
ANGST|Anxiety with an existential undertone
ANISE|A plant whose seeds supply a licorice-like flavor
APACE|At a rapid rate, in literary usage
APRES|The French-derived word in the social activity apres-ski
AREAL|Relating to an area rather than to a length
ASCUS|A fungal sac in which spores develop
ASPIC|A savory jelly used to enclose chilled food
AUGER|A tool whose spiral form helps bore a hole
AVERS|States a claim as true
AXIAL|Situated along or relating to a central line
AZIDE|A compound containing the three-nitrogen anion
BAIZE|A woolen fabric used on some gaming tables
BASAL|Located at the base, or representing a resting level
BATIK|A textile-dyeing method using wax to resist color
BEGET|Bring into existence, in a formal or archaic register
BIGHT|A bend in a coastline or a loop in a rope
BILGE|The lowest internal part of a ship's hull
BOLUS|A rounded mass of chewed food ready to be swallowed
BRACT|A modified leaf associated with a flower or inflorescence
BURET|A graduated laboratory tube used to dispense measured liquid
CALYX|The collective sepals of a flower
CANID|A member of the mammal family containing dogs and foxes
CAPON|A castrated male chicken raised for meat
CAULK|Fill a joint to make it watertight
CHERT|A fine-grained sedimentary rock composed largely of silica
CIRRI|Slender appendages or high wispy clouds, in plural form
COCCI|Spherical bacteria, in plural form
CROFT|A small enclosed farm, especially in Scotland
CUBIT|An ancient length based on the forearm
CURIE|A historical unit of radioactivity
DATUM|A single given fact used as a basis for reasoning
DEBAR|Exclude someone officially from an activity
DEISM|Belief in a creator who does not intervene through revelation
DELFT|Blue-and-white tin-glazed earthenware named for a Dutch city
DIMER|A molecule formed from two associated subunits
DINGO|A wild canine associated with Australia
DOYEN|The senior or most respected member of a field
DRUPE|A fleshy fruit surrounding a hard stone containing the seed
DUCAL|Relating to the rank or domain of a duke
DUPLE|Describes a musical meter organized in groups of two
DYADS|Groups or relationships consisting of two members
ECLAT|Conspicuous brilliance or acclaim
EIDER|A sea duck known for its insulating down
ELUTE|Wash an adsorbed substance out with a solvent
EMEND|Correct errors in a text
EMERY|An abrasive material containing corundum
ERGOT|A fungus affecting grasses, especially rye
EVICT|Remove an occupant through legal process
EWERS|Wide-mouthed pitchers with handles
FEMUR|The long bone between hip and knee
FOLIO|A sheet folded once to produce two leaves
FOSSA|A depression or hollow in an anatomical structure
FOVEA|A small retinal region responsible for especially sharp central vision
FUGAL|Written in the contrapuntal manner of a fugue
GEODE|A rock cavity lined with crystals
GESSO|A ground coating prepared beneath painting or gilding
GLANS|The rounded end of an anatomical structure
GLUME|One of the bracts surrounding a grass spikelet
GNOME|A concise maxim, in its literary sense
GONAD|An organ producing reproductive cells
GYRUS|A ridge of the cerebral cortex
HADAL|Relating to the ocean's deepest trenches
HAPAX|A word occurring only once in a particular body of text
HELIX|A curve winding around an axis while moving along it
HILUM|The region where vessels enter or leave an organ
HYOID|The neck bone that supports the tongue without articulating with another bone
ILEAL|Relating specifically to the final portion of the small intestine
IMINE|A compound characterized by a carbon-nitrogen double bond
INCUS|The anvil-shaped middle-ear bone
INDRI|A large lemur native to Madagascar
IONIC|Relating to charged atoms, or to a classical architectural order
KOINE|A shared dialect developing between speakers of different varieties
LAMIA|A female monster of classical mythology
LARVA|An immature stage preceding metamorphosis
LAVER|An edible seaweed, traditionally used in Welsh cooking
LEMUR|A primate from a group native to Madagascar
LIMEN|A threshold of sensation or awareness
LINAC|An accelerator that speeds charged particles along a straight path
LORIS|A slow-moving primate of tropical Africa or Asia
LYSIS|The breakdown or rupture of a cell
MANSE|A house traditionally occupied by a minister
METED|Measured out an allotted quantity
MOIRE|A rippled visual pattern produced by overlapping regular patterns
MUCIN|A glycoprotein contributing to the properties of mucus
NACRE|The layered shell material also called mother-of-pearl
NARES|The openings of the nostrils, plural
NISEI|A US-born child of Japanese immigrants
OCHER|The American variant spelling of an earthy mineral pigment
ODEON|An ancient Greek or Roman building for musical performances
OLEIC|Describes a common monounsaturated fatty acid
OPERA|The plural of opus, as well as a theatrical art form
OSIER|A willow cultivated for flexible shoots used in basketry
OVOID|Egg-shaped rather than perfectly spherical
OXBOW|A curved lake formed when a river meander is cut off
PARSE|Analyze a sentence into its grammatical components
PAYEE|The party to whom a payment is made
PINNA|The visible outer part of the ear
PODIA|Platforms for speakers, in the Latin-derived plural
PRATE|Talk at length without saying much of value
PYLON|A monumental gateway or a tall supporting structure
RAJAH|An Indian ruler or prince, in an English variant spelling
REBUS|A puzzle using pictures to stand for words or sounds
RENAL|Relating to the kidneys
SEPAL|One of the outer floral parts enclosing a developing bud
SITAR|A long-necked plucked instrument associated with Indian classical music
SPIEL|A rehearsed persuasive speech
SPOOR|Tracks or other signs left by an animal
STILE|Steps allowing people to cross a fence without opening a gate
STROP|A strip used to finish the edge of a razor
SUTRA|A concise teaching text in certain Indian religious traditions
SWARD|An expanse of short grass, in literary usage
THANE|A historical rank of landholding noble in Scotland
THYME|An aromatic herb of the mint family
TORUS|The surface formed by rotating a circle around an outside coplanar axis
TUPLE|An ordered collection of a specified number of elements
USURY|Lending at an unlawfully or excessively high rate of interest
UVULA|The small projection hanging from the soft palate
VILLI|Small projections increasing the absorptive surface of the intestine
VITAE|The second word in the Latin phrase abbreviated CV
WHELK|A marine gastropod with a spiral shell
ZONAL|Arranged in or relating to distinct regions`),
];
export const PRACTICE_EDITION_EXTRAS=[
 ...entries('normal',`
IMPART|Communicate knowledge or a quality to someone else
ELICIT|Draw out a response without directly supplying it
ASSERT|State a position with confidence
DEBATE|Examine opposing positions through structured argument
QUALIFY|Limit a statement so that it does not claim too much
RESOLVE|Find a solution to a disagreement or uncertainty
COHERENT|Fitting together in a logically consistent way
TENTATIVE|Offered provisionally rather than as a final conclusion
EXPLICIT|Stated directly rather than left to inference
SKEPTICAL|Inclined to question a claim before accepting it
VERSATILE|Able to perform well in several different roles
RESILIENT|Able to recover after disruption
PRUDENT|Showing care for likely consequences
FRUGAL|Avoiding unnecessary expenditure
TENACIOUS|Persistent despite resistance or difficulty
IMPARTIAL|Not favoring either side of a dispute
CREDIBLE|Deserving to be believed on the available grounds
FEASIBLE|Possible within the relevant constraints
TANGIBLE|Capable of being physically touched or clearly demonstrated
RELUCTANT|Not eager to undertake an action
ANOMALY|A case departing from the expected pattern
DILEMMA|A choice between competing difficult alternatives
PRECEDENT|An earlier case used to guide a later decision
CONSENSUS|Broad agreement within a group
SCRUTINY|Close and critical examination
INSIGHT|An understanding that reveals a less obvious relationship
JUSTIFY|Supply adequate reasons for a claim or action
CONCEDE|Acknowledge a point made by the opposing side
INTEGRITY|Consistency between professed principles and conduct
DISCREET|Careful not to draw unnecessary attention`),
 ...entries('hard',`
ABEYANCE|A state of temporary suspension
ADUMBRATE|Outline a plan or idea without developing its details
APOCRYPHAL|Of doubtful authenticity despite frequent repetition
ASSIDUOUS|Showing persistent and careful effort
ATTENUATE|Reduce the force or magnitude of something
COGENT|Clear, convincing and logically forceful
COMITY|Mutual courtesy between institutions or states
CONFLATE|Treat distinct things as though they were the same
CONTINGENT|Dependent on conditions rather than necessary in itself
DEFERENCE|Respectful yielding to another's judgment
DISSONANCE|A lack of agreement, including a clash between beliefs
EQUIVOCAL|Open to different interpretations rather than unambiguous
EXIGENT|Demanding immediate attention or action
EXOGENOUS|Originating outside the system being considered
ENDOGENOUS|Originating within the system being considered
FECUND|Highly productive of offspring or ideas
GERMANE|Directly relevant to the matter being discussed
INCHOATE|Only partly formed or organized
INIMICAL|Hostile to an interest or development
LACONIC|Expressing much in very few words
MENDACIOUS|Given to lying rather than merely mistaken
NOETIC|Relating to intellectual apprehension
OBVIATE|Remove the need for something
PARSIMONY|Preference for economy of assumptions in an explanation
PERFIDY|A deliberate breach of trust
PROBITY|Strong adherence to honesty and moral principle
PROLEPSIS|Anticipating an objection or narrating an event in advance
RECONDITE|Not readily understood without specialized knowledge
SALIENCE|The quality of standing out from surrounding information
VITIATE|Impair the validity or effectiveness of something`),
];
