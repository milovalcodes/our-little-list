// Original clues. Level labels are editorial targets, not grade certifications.
// Freshman high-school: inference and general academic vocabulary. Introductory
// university: precise terminology, less literal clues, no unexplained trivia.
export function editionPool(difficulty,theme,label,text,season=''){
 const id=(season?season+'-':'')+'v3-'+theme;
 return {id,label,difficulty,season,edition:3,entries:text.trim().split('\n').map(row=>{
  const [word,clue]=row.split('|');
  return {id:id+'-'+difficulty+'-'+word.toLowerCase(),word,clue,difficulty,theme:id,themeLabel:label,season};
 })};
}
export const EDITION_POOLS=[
 editionPool('normal','language','Between the lines',`
METAPHOR|A comparison that skips the word like
IRONY|The fire station burning down would illustrate this
SATIRE|Criticism wearing the disguise of comedy
MOTIF|A recurring image that earns its repetition
ALLUSION|A borrowed reference the reader must recognize
CONTEXT|What an isolated quotation is missing
INFERENCE|A conclusion assembled from clues rather than stated
CONTRAST|The relationship between a palace and a shack in one scene
SUBTEXT|What a character means but never actually says
SYMBOL|An object carrying meaning beyond itself
THESIS|The claim an essay spends its paragraphs defending
EVIDENCE|A claim needs this more than confidence
ANALOGY|Explaining an unfamiliar relationship through a familiar one
TONE|An author's attitude heard through the wording
DICTION|A writer's choices at the level of individual words
NUANCE|A small distinction that can change an interpretation
PARADOX|A seemingly impossible statement with a defensible truth
BIAS|A preference that can tilt the presentation of facts
PREMISE|The starting assumption an argument rests on
REBUTTAL|An answer aimed at an opposing argument
RHETORIC|Language used with persuasion in mind
GENRE|The category that sets a reader's expectations
NARRATOR|The voice telling a story, not necessarily its author
CONFLICT|The struggle that keeps a plot from standing still
CLIMAX|The plot's decisive turning point
ALLEGORY|A narrative whose figures also represent abstract ideas
FABLE|A short invented tale built to deliver a moral
AMBIGUITY|Room for more than one reasonable interpretation
CONCISE|Brief without leaving the important part out
IMPLICIT|Present in the meaning without being directly stated`),
 editionPool('normal','science','Patterns in nature',`
ADAPT|Change in response to conditions
HABITAT|The address of a species, ecologically speaking
ECOSYSTEM|Organisms and their nonliving surroundings considered together
EROSION|Landscape removal, one grain at a time
SEDIMENT|Particles that settle after being carried by water
DENSITY|Mass divided by the space it occupies
INERTIA|Why a moving object resists a change in motion
FRICTION|The contact force that can turn motion into heat
ISOTOPE|Same element, different neutron count
MOLECULE|Atoms bonded into a single chemical unit
SOLVENT|The dissolving partner in a solution
SOLUTE|The dissolved partner in a solution
DIFFUSION|Particles spreading from a crowded region into a less crowded one
OSMOSIS|Water crossing a selectively permeable membrane
ENZYME|A biological catalyst
GENETICS|The study of how traits are inherited
RECESSIVE|An allele masked by a dominant one in a heterozygote
PREDATOR|An organism that obtains food by hunting another
MUTATION|A change in the sequence of genetic material
VARIABLE|The quantity a controlled experiment deliberately changes
CONTROL|The comparison group not given the treatment
REFRACT|Bend light as it crosses between materials
SPECTRUM|The range revealed when white light is separated
ORBIT|A path maintained by gravity and forward motion
GRAVITY|The attraction that gives falling objects their direction
FUSION|Joining light nuclei to release stellar energy
CURRENT|Rate of flow of electric charge
CIRCUIT|An electrical route that must close for sustained flow
PRESSURE|Force distributed over area
EQUINOX|The twice-yearly moment when the Sun crosses the celestial equator`),
 editionPool('normal','society','People & systems',`
CIVIC|Relating to the duties of citizenship
DEMOCRACY|A political system grounded in rule by the people
REPUBLIC|A state without a hereditary monarch as its head
SOVEREIGN|Independent of another state's authority
FEDERAL|Sharing power between national and regional governments
REFORM|Change intended to improve an existing institution
TREATY|A formal agreement between states
EMBARGO|A government ban on trade with a particular country
TARIFF|A tax collected on imported goods
SCARCITY|The economic problem of limited resources and competing wants
INCENTIVE|A reason that makes a choice more attractive
REVENUE|Money received before expenses are subtracted
DEFICIT|The amount by which spending exceeds income
SURPLUS|What remains when supply exceeds what is required
INFLATION|A sustained rise in the general price level
MONOPOLY|A market with a single seller
LABOR|Human effort treated as a factor of production
CAPITAL|Equipment and other produced resources used to make goods
MIGRATION|Movement from one region to settle in another
CULTURE|Shared practices and meanings learned within a group
PRIMARY|A source made by someone directly involved is this kind
CHRONICLE|A record arranged in the order events occurred
LEGACY|An influence that outlives the person who left it
ETHICS|Reasoning about what people ought to do
CONSENT|Permission given voluntarily
EQUITY|Fairness that takes differing circumstances into account
DISSENT|Disagreement with an official or majority position
ADVOCATE|Speak publicly in support of a cause
JUDICIAL|Belonging to the branch that interprets laws
STATUTE|A law enacted by a legislature`),
 editionPool('normal','reason','Reason & design',`
DEDUCE|Reach a conclusion from stated premises
INFER|Read the evidence beyond its literal statement
VALID|Describes an argument whose premises guarantee its conclusion
REFUTE|Show that a claim is false
ASSESS|Judge quality using relevant criteria
REVISE|Reconsider and alter a first attempt
CRITERION|One standard against which a choice is judged
PATTERN|A regularity that can suggest what comes next
RATIO|A comparison expressed by dividing two quantities
MEDIAN|The middle value after the data are ordered
MODE|The value that occurs most often in a data set
RANGE|The largest value minus the smallest
FACTOR|A whole number that divides another without a remainder
EXPONENT|The raised number that tells how many factors to multiply
FUNCTION|A rule assigning exactly one output to each input
LINEAR|Describes a graph with a constant rate of change
SLOPE|Rise divided by run
VECTOR|A quantity with both magnitude and direction
SCALAR|A quantity with magnitude but no direction
SYMMETRY|An arrangement preserved by a transformation
TANGENT|A line meeting a circle at exactly one point
CHORD|A segment whose endpoints lie on a circle
ARC|Part of the circumference, not a straight shortcut
AXIS|A reference line in a coordinate system
PROOF|A chain of reasoning that establishes a mathematical claim
ESTIMATE|An informed approximation rather than an exact count
SCALE|The ratio connecting a drawing to its real object
ALGORITHM|A finite sequence of instructions for solving a problem
ITERATE|Repeat a procedure using the previous result
ABSTRACT|Concerned with an idea rather than a particular object`),
 editionPool('hard','letters','Language & interpretation',`
METONYMY|The crown standing for the monarchy exemplifies this
SYNECDOCHE|All hands on deck uses a part for a whole: this figure
ANAPHORA|Repeated openings that give successive clauses their rhythm
CHIASMUS|A verbal arrangement that crosses from AB to BA
ZEUGMA|One governing word yoked to two unlike senses
APORIA|An expression of doubt, sometimes used deliberately in argument
LITOTES|An understatement built by denying the opposite
TROPE|A figurative turn rather than a literal use of language
DIERESIS|Two adjacent vowels pronounced in separate syllables
CAESURA|A pause inside a line of verse
ENJAMBMENT|A sentence crossing a verse boundary without a syntactic stop
SCANSION|The analysis of a poem's metrical pattern
SYNTAX|The rules for arranging words into structures
MORPHEME|The smallest unit of language that carries meaning
PHONEME|A sound distinction capable of distinguishing words
PRAGMATICS|Meaning examined in its social and situational context
SEMANTICS|The study of linguistic meaning
DEIXIS|Language whose reference depends on who speaks, where or when
REGISTER|A variety of language selected for a social situation
PARATAXIS|Placing clauses side by side without explicit subordination
PALIMPSEST|A reused manuscript retaining traces of its earlier text
EKPHRASIS|Writing that describes a work of visual art
PASTICHE|An imitation of another style without necessarily mocking it
DIEGESIS|The narrative world within which a story's events occur
MIMESIS|Art understood as representation or imitation
HAMARTIA|An error or failing contributing to a tragic downfall
CATHARSIS|The emotional purgation associated with tragedy
HUBRIS|Overreaching pride in a tragic framework
PERIPETEIA|A dramatic reversal of fortune
APOSTROPHE|Addressing an absent person or abstraction as if present`),
 editionPool('hard','systems','Matter & living systems',`
ENTROPY|A state function related to the number of accessible microstates
ENTHALPY|Internal energy plus pressure multiplied by volume
ISOMER|Same molecular formula, different arrangement
CHIRAL|Not superimposable on its mirror image
POLARITY|Unequal charge distribution across a chemical bond or molecule
ORBITAL|A quantum state describing an electron's spatial distribution
VALENCE|An atom's combining capacity
CATALYST|Changes reaction rate without being consumed overall
TITRATION|Finding concentration through a measured reaction with a standard
BUFFER|A solution that resists a change in pH
ALLELE|An alternative form of a gene at a given locus
LOCUS|A gene's particular position on a chromosome
GENOTYPE|Genetic constitution rather than its outward expression
PHENOTYPE|Observable traits produced through genotype and environment
MEIOSIS|Cell division that reduces chromosome number for sexual reproduction
MITOSIS|Nuclear division generally preserving chromosome number
HAPLOID|Having one complete set of chromosomes
DIPLOID|Having two complete sets of chromosomes
OPERON|A group of genes transcribed under shared regulatory control
INTRON|A sequence removed from a pre-mRNA during splicing
CODON|Three RNA bases specifying an amino acid or a stop
TAXON|A named group in biological classification
CLADE|An ancestor and all of its descendants
NICHE|A species' ecological role rather than merely its location
BIOME|A broad ecological region defined by climate and communities
SYMBIOSIS|A close, sustained association between different species
TROPISM|Directional growth in response to a stimulus
XYLEM|Vascular tissue carrying water from roots
PHLOEM|Vascular tissue transporting sugars from sources to sinks
STASIS|Evolutionary stability over a prolonged interval`),
 editionPool('hard','logic','Logic, data & knowledge',`
AXIOM|A starting proposition accepted without proof within a system
LEMMA|A proved result serving as a stepping stone to another
COROLLARY|A result following readily from an established theorem
INDUCTION|A proof method with a base case and a successor step
DEDUCTION|Reasoning in which true premises force the conclusion
ABDUCTION|Inference to a proposed best explanation
FALLACY|A defect in reasoning despite an apparently persuasive form
TAUTOLOGY|A proposition true under every assignment of truth values
MODAL|Concerning possibility or necessity in logic
ONTOLOGY|Inquiry into what kinds of things exist
EPISTEMIC|Relating to knowledge or justified belief
APRIORI|Justifiable independently of particular observations
EMPIRICAL|Grounded in observation rather than reasoning alone
HEURISTIC|A useful shortcut that does not guarantee an optimal answer
RECURSION|A procedure defined partly through smaller instances of itself
INVARIANT|A property preserved by the relevant transformation
BIJECTION|A mapping that is both one-to-one and onto
INJECTIVE|A function that never sends distinct inputs to the same output
GRADIENT|The vector pointing toward steepest local increase
INTEGRAL|The calculus quantity representing accumulated change
ASYMPTOTE|A line a curve approaches in an appropriate limit
VARIANCE|The mean squared deviation from the mean
RESIDUAL|An observed value minus its fitted prediction
QUANTILE|A cut point partitioning an ordered distribution
MEDIATOR|A variable through which an explanatory effect may operate
COVARIATE|An additional measured variable included in a model
LIKELIHOOD|A model's probability of observed data viewed as a function of parameters
POSTERIOR|The updated distribution after conditioning on evidence
PRIOR|A distribution assigned before the current evidence is incorporated
NULL|The default hypothesis tested against an alternative
ROBUST|Relatively insensitive to departures from assumptions`),
 editionPool('hard','humanities','Art, thought & society',`
HEGEMONY|Dominance maintained partly through accepted cultural norms
ANOMIE|A condition of weakened social norms
PRAXIS|Theory put into reflective action
TELOS|An end or purpose in philosophical explanation
ETHOS|Persuasive credibility based on the speaker's character
PATHOS|Persuasion appealing to an audience's emotions
LOGOS|Persuasion through reasoning and argument
ALTERITY|Otherness considered as a philosophical concept
HABITUS|Durable learned dispositions shaping perception and action
AGENCY|The capacity to act rather than merely be acted upon
REIFY|Treat an abstraction as though it were a concrete thing
DIALECTIC|Inquiry developing through conflicting positions
DUALISM|A view explaining a domain through two fundamental kinds
MONISM|A view grounding reality in one fundamental kind
STOICISM|A philosophy emphasizing virtue and judgment over external fortune
HEDONISM|A view giving pleasure a central role in value
MIMETIC|Characterized by imitation or representation
LIMINAL|Situated on a threshold between established states
NUMINOUS|Evoking a sense of sacred mystery and awe
SUBLIME|Aesthetically overwhelming rather than merely pretty
APSE|A vaulted recess often found at the end of a church
NAVE|A church's main longitudinal interior space
FRIEZE|A horizontal decorative band in architecture
PEDIMENT|The triangular upper part of a classical building front
PILASTER|A shallow rectangular projection resembling an attached column
RELIEF|Sculpture projecting from a supporting background
INTAGLIO|Printmaking from ink held in incised lines
IMPASTO|Paint applied thickly enough to leave a raised texture
FRESCO|Painting applied to freshly laid wet plaster
PENTIMENTO|A visible trace of a painter's earlier alteration
ICONOGRAPHY|The study of images and their conventional meanings`),
];
