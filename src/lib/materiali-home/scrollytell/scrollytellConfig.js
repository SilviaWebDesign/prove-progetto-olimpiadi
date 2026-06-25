import { sections } from '../sections.js';

// ── Sport topics ───────────────────────────────────────────────────────────
const SPORT_TOPICS = [
  {
    counter: '1 / 3',
    title: 'Atleti e discipline',
    body: 'Milano-Cortina 2026 prevede oltre 100 medaglie in 16 discipline, con sedi che coprono dalle arena milanesi alle piste dolomitiche. Il Comitato Organizzatore ha promosso programmi di avvicinamento allo sport nelle scuole e campagne per tifosi e volontari.',
    source: 'IOC, CONI',
    comments: [
      'Le Olimpiadi aumentano la partecipazione sportiva giovanile e l\'interesse verso discipline minori.',
      'Gli atleti olimpici ispirano intere generazioni e avvicinano lo sport al grande pubblico.',
      'Il programma di gare valorizza tradizioni locali come lo sci alpinismo e il curling.',
      'I costi di accesso al top level escludono molti talenti prima ancora delle qualifiche.',
      'La pressione mediatica e agonistica pesa in modo sproporzionato sui giovani atleti.',
      'Il medagliere rispecchia più la spesa pubblica per lo sport che il merito puro.',
    ],
  },
  {
    counter: '2 / 3',
    title: 'Accesso e inclusione',
    body: 'Le Olimpiadi pongono domande sull\'equità nell\'accesso allo sport di alto livello. Programmi di sviluppo sportivo e iniziative per avvicinare giovani atleti cercano di ampliare le opportunità, ma le risorse necessarie per raggiungere il livello olimpico restano elevate.',
    comments: [
      'I programmi olimpici di avvicinamento allo sport raggiungono scuole e giovani di ogni estrazione.',
      'La diversità degli atleti partecipanti riflette un impegno concreto verso l\'inclusione sportiva.',
      'Le iniziative per atleti con disabilità dimostrano che lo sport può essere davvero universale.',
      'La preparazione olimpica richiede investimenti che solo famiglie benestanti possono sostenere.',
      'Le nazioni ricche continuano a dominare il medagliere, mostrando le disuguaglianze strutturali.',
      'Le regole di qualificazione tagliano fuori paesi che non possono permettersi strutture adeguate.',
    ],
  },
  {
    counter: '3 / 3',
    title: 'Sport nella società',
    body: 'I Giochi Olimpici lasciano un\'eredità che va oltre i risultati sportivi: campagne di avvicinamento allo sport nelle scuole, coinvolgimento dei volontari e stimoli per discipline meno conosciute contribuiscono a costruire una cultura sportiva nel territorio ospitante.',
    comments: [
      'Le Olimpiadi stimolano un interesse duraturo per lo sport nella popolazione locale.',
      'Il volontariato olimpico crea reti comunitarie e competenze che restano dopo i Giochi.',
      'La visibilità data a discipline minori può rilanciare la loro pratica per anni.',
      'L\'interesse per lo sport cala rapidamente una volta terminati i Giochi.',
      'I benefici sociali restano concentrati nelle aree urbane, escludendo le periferie.',
      'La narrazione olimpica oscura i problemi strutturali dello sport di base nel paese.',
    ],
  },
];

// ── Sostenibilità topics (opinioni riordinate: 3 positive poi 3 negative) ──
const SUSTAINABILITY_TOPICS = [
  {
    counter: '1 / 3',
    title: 'Riuso delle sedi',
    body: 'Milano-Cortina 2026 è stata progettata intorno a un uso esteso di sedi già esistenti o temporanee, al fine di non lasciare "cattedrali nel deserto". Secondo la comunicazione ufficiale, circa il 90% delle sedi di gara rientra in questa logica di riuso. Alcuni esempi sono lo stadio di San Siro, l\'Unipol Forum e Rho Fiera.',
    source: 'WIKIPEDIA, INARCASSA',
    comments: [
      'Il riuso delle sedi esistenti riduce sprechi e impatto ambientale rispetto a costruire ex novo.',
      'San Siro e Rho Fiera dimostrano che si può organizzare un evento globale senza nuovi colossi.',
      'Riutilizzare impianti esistenti è la scelta più sensata per ridurre la carbon footprint.',
      'La comunicazione riguardo al riuso delle strutture non è stata trasparente, era solo una strategia di marketing.',
      'Il 90% di sedi riutilizzate suona bene, ma i numeri vanno verificati nel dettaglio.',
      'Il riuso dichiarato non tiene conto degli impatti indotti da cantieri e trasformazioni urbane.',
    ],
  },
  {
    counter: '2 / 3',
    title: 'Il Villaggio Olimpico',
    body: 'Il Villaggio Olimpico di Porta Romana è stato progettato per ospitare gli atleti durante i Giochi e diventare student housing dopo l\'evento. Il progetto include edifici residenziali, spazi pubblici e una nuova piazza di quartiere.',
    source: 'COMUNE DI MILANO, IOC',
    comments: [
      'Il villaggio olimpico lascerà un patrimonio utile alla città se diventa davvero student housing.',
      'La piazza e gli spazi pubblici possono rigenerare un\'area trascurata da anni.',
      'Un campus universitario può rilanciare un intero quartiere se ben collegato.',
      'Porta Romana rischia di restare un\'isola costosa senza integrazione col quartiere.',
      'Gli alloggi post-Giochi non bastano da soli a compensare il disagio dei cantieri.',
      'La comunicazione sul riuso delle strutture non è stata trasparente, era solo una strategia di marketing.',
    ],
  },
  {
    counter: '3 / 3',
    title: 'Energia e trasporti',
    body: 'Le scelte energetiche e i trasporti collegati ai Giochi sono stati presentati come un modello di efficienza. Il loro impatto reale dipende da come verranno usati impianti e infrastrutture dopo l\'evento.',
    source: 'MINISTERO AMBIENTE',
    comments: [
      'Le politiche green dei Giochi sono un segnale importante per il Paese.',
      'Un\'Olimpiade può accelerare investimenti in mobilità sostenibile duratura.',
      'Monitorare i dati post-Giochi è l\'unico modo per giudicare il reale impatto.',
      'Trasporti e energia restano impatti enormi, anche con sedi riusate.',
      'Senza monitoraggio post-evento, le promesse ambientali restano sulla carta.',
      'Le promesse green servono più a costruire un\'immagine che a cambiare le pratiche.',
    ],
  },
];

// ── Infrastructure topics (kept for completeness) ─────────────────────────
const INFRASTRUCTURE_TOPICS = [
  {
    counter: '1 / 3',
    title: 'Villaggio Olimpico',
    body: 'Il Villaggio Olimpico di Porta Romana è stato progettato per ospitare gli atleti durante i Giochi e diventare student housing dopo l\'evento. Il progetto presenta tecnologie ed impianti finalizzati al risparmio energetico. Una volta adibito a studentato, la quota mensile si aggirerà intorno ai 1.000€ per posto letto.',
    comments: [
      'Finalmente un progetto che ha a cuore il risparmio energetico, è ammirevole.',
      'Diventando student housing, il Villaggio può contribuire in modo utile alla città.',
      'Ha contribuito a creare una bella atmosfera tra gli atleti, e rafforzare la sportività, che è fondamentale.',
      'Il villaggio olimpico ha distrutto Porta Romana.',
      'La quota di affitto non è accessibile, sarà l\'ennesimo studentato soltanto per ricchi.',
      'L\'edificio non ha un aspetto gradevole, rovina il panorama urbano con la sua estetica da prefabbricato.',
    ],
  },
  {
    counter: '2 / 3',
    title: 'Arena Santa Giulia',
    body: 'L\'Arena Santa Giulia è stata progettata per ospitare l\'hockey olimpico e diventare poi un\'arena polifunzionale per eventi, sport e spettacoli. La costruzione dell\'arena rientra nel progetto di riqualificazione del quartiere Santa Giulia, o Montecity-Rogoredo, nella periferia sudest di Milano.',
    comments: [
      'L\'arena è completamente accessibile alle persone con disabilità, un grande passo avanti per l\'Italia, finalmente.',
      'Design estremamente moderno, un ottimo passo verso la riqualificazione di Santa Giulia.',
      'Struttura molto adatta per i concerti, l\'acustica è ottima!',
      'È inammissibile che l\'arena sia stata utilizzata prima del suo completamento.',
      'La peggior arena di sempre, durante i Giochi si sono verificati troppi malfunzionamenti.',
      'Uno spreco di risorse, sicuramente l\'arena resterà inutilizzata.',
    ],
  },
  {
    counter: '3 / 3',
    title: 'Sliding Centre',
    body: 'L\'Eugenio Monti Sliding Centre è un tracciato per bob, skeleton e slittino situato a Cortina d\'Ampezzo. La pista è stata ricostruita per ospitare le gare dei tre sport alle Olimpiadi Invernali di Milano-Cortina, ed è considerata una delle strutture più emblematiche dei Giochi.',
    comments: [
      'Le Olimpiadi Invernali sono state l\'occasione perfetta per ristrutturare la pista, finalmente si potrà praticare di nuovo il bob a Cortina!',
      'Gli atleti che ci hanno gareggiato l\'hanno definita come la migliore di sempre, e il loro parere è sicuramente il più valido di tutti.',
      'Non è da poco costruire una struttura così di qualità in breve tempo, l\'Italia dovrebbe esserne orgogliosa.',
      'La pista è stata costruita su un terreno franabile, è assurdo che questo progetto sia stato anche solo approvato.',
      'L\'impatto ambientale dello Sliding Centre rende impossibile apprezzarlo, indipendentemente dalla sua utilità.',
      'Dubito che verrà utilizzata dopo il termine dei Giochi, mantenerla sarà solo un peso economico per lo Stato.',
    ],
  },
];

// ── Result model paths ─────────────────────────────────────────────────────
// Order: [positivo, negativo, piuPositivo, piuNegativo, neutro]
const INFRASTRUCTURE_RESULT_PATHS = [
  '/oggetti/infrastrutture-positivo.glb',
  '/oggetti/infrastrutture-negativo.glb',
  '/oggetti/infrastrutture-piu-positivo.glb',
  '/oggetti/infrastrutture-piu-negativo.glb',
  '/oggetti/infrastrutture-neutro.glb',
];

const SPORT_RESULT_PATHS = [
  '/oggetti/sport-positivo.glb',
  '/oggetti/sport-negativo.glb',
  '/oggetti/sport-piu-positivo.glb',
  '/oggetti/sport-piu-negativo.glb',
  '/oggetti/sport-neutro.glb',
];

const SUSTAINABILITY_RESULT_PATHS = Array(5).fill('/oggetti/sostenibilita.glb');

/**
 * @param {'sustainability' | 'sport' | 'infrastructure'} key
 */
export function getScrollytellConfig(key) {
  const section = sections[key] ?? sections.sport;

  const topicsByKey = {
    sport: SPORT_TOPICS,
    sustainability: SUSTAINABILITY_TOPICS,
    infrastructure: INFRASTRUCTURE_TOPICS,
  };

  const resultPathsByKey = {
    infrastructure: INFRASTRUCTURE_RESULT_PATHS,
    sport: SPORT_RESULT_PATHS,
    sustainability: SUSTAINABILITY_RESULT_PATHS,
  };

  const sectionHeroTitles = new Set(['sustainability', 'sport']);

  const phraseByKey = {
    sustainability: sections.sustainability.introClaim?.join(' ') ?? sections.sustainability.intro,
    sport: sections.sport.introPhrase ?? sections.sport.claim,
    infrastructure:
      'Le Olimpiadi prendono forma attraverso cantieri, impianti e collegamenti tra territori. Queste opere possono essere lette come investimenti utili o come interventi costosi, il cui valore dipende da cosa resterà dopo l\'evento.',
  };

  const heroTitleLayoutByKey = {
    sport: 'spread',
  };

  return {
    pageTitle: `${section.title} — Quante facce ha una medaglia?`,
    heroTitle: sectionHeroTitles.has(key) ? section.heroTitle : section.title,
    heroTitleStyle: /** @type {'svg' | 'section'} */ (
      sectionHeroTitles.has(key) ? 'section' : 'svg'
    ),
    heroTitleLayout: /** @type {'center' | 'spread'} */ (heroTitleLayoutByKey[key] ?? 'center'),
    heroAriaLabel: section.title,
    frostSrc: section.hero.background,
    bgSrc: section.hero.background,
    phrase: phraseByKey[key] ?? section.intro,
    modelSrc: key === 'infrastructure' ? '/oggetti/infrastrutture.glb' : section.modelSrc,
    resultPaths: resultPathsByKey[key] ?? [],
    sectionId: /** @type {'infrastructure' | 'sport' | 'sustainability'} */ (section.id),
    topics: topicsByKey[key] ?? SPORT_TOPICS,
  };
}
