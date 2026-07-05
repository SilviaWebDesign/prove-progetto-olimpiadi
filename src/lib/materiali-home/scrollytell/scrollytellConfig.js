import { sections } from '../sections.js';

// ── Sport topics ───────────────────────────────────────────────────────────
const SPORT_TOPICS = [
  {
    title: 'Alysa Liu',
    body:
      'Alysa Liu si presenta come una delle protagoniste più attese del pattinaggio artistico ai Giochi Olimpici Invernali di Milano-Cortina 2026. La sua partecipazione contribuisce a rafforzare l’attenzione internazionale sull’evento, in particolare tra il pubblico più giovane e gli appassionati degli sport su ghiaccio, grazie a uno stile tecnico e spettacolare che ha già segnato diverse competizioni internazionali.',
    source: 'WIKIPEDIA',
    comments: [
      'Sembra divertirsi davvero mentre gareggia, il che ormai è raro negli sport di alto livello, Liu è un ottimo esempio per i giovani atleti.',
      'Il suo ritorno in gara dopo il ritiro la rende una delle storie sportive più ispiranti dei Giochi, Alysa è un simbolo di rinascita.',
      'Il suo atteggiamento ‘senza pressione’ rompe gli schemi tradizionali del pattinaggio, rendendo lo sport più moderno e pop.',
      'La sua storia di discontinuità con lo sport dimostra che non prende sul serio la sua disciplina.',
      'La sua performance al Gala Olimpico è stata un insulto al pattinaggio artistico, avrebbe dovuto esibirsi su musica classica, non pop.',
      'È solo un’atleta come le altre, ma ha ricevuto un’attenzione esagerata da parte dei media, si sentiva parlare solo di lei.',
    ],
  },
  {
    title: 'Vladyslav Heraskevych',
    body:
      'L’atleta ucraino Vladyslav Heraskevych è stato escluso dalla competizione di skeleton per essersi rifiutato di rimuovere un casco commemorativo, il quale riportava i volti di oltre venti atleti e allenatori ucraini uccisi dall’inizio dell’invasione russa. Questo gesto viola la Regola 50 della Carta Olimpica, che vieta qualsiasi forma di propaganda o messaggio politico, religioso o razziale sui campi di gara.',
    source: 'RAI NEWS',
    comments: [
      'Il casco commemorativo non era propaganda politica ma un gesto umano di memoria verso colleghi e amici scomparsi, il provvedimento è stato ingiusto.',
      'Gli atleti dovrebbero avere la possibilità di esprimersi anche riguardo a temi non relazionati allo sport, in quanto personaggi pubblici la loro voce fa la differenza.',
      'Gesti come questo rendono le Olimpiadi più autentiche, perché mostrano il lato umano dietro la competizione.',
      'È stato ingenuo da parte di Heraskevych pensare di poter raggirare il regolamento olimpico senza subirne le conseguenze.',
      'Accettare simboli legati a conflitti in corso rende molto difficile mantenere il principio di neutralità olimpica, la squalifica era necessaria.',
      'Il Comitato Olimpico ha agito correttamente, un’eccezione avrebbe causato più difficoltà a far rispettare la stessa regola in altri casi.',
    ],
  },
  {
    title: 'Jutta Leerdam',
    body:
      'La pattinatrice olandese Jutta Leerdam è diventata protagonista di una controversia a seguito della sua celebrazione per la vittoria nei 1000 metri. L’atleta ha aperto la zip della sua tuta mostrando l’abbigliamento sottostante, intimo sportivo firmato Nike. Si presume che Leerdam possa aver ricevuto circa 850.000 euro dal marchio statunitense, a causa di un contratto di sponsorizzazione.',
    source: 'CORRIERE DELLA SERA',
    comments: [
      'Il suo gesto è stato unicamente l’espressione delle forti emozioni che stava provando, nessuna pubblicità occulta.',
      'La presunta collaborazione con Nike attesta semplicemente il livello sportivo di Leerman, tanto alto da poter influenzare il pubblico.',
      'La sua popolarità, aumentata anche dalle controversie, dona più visibilità al pattinaggio di velocità, sport spesso poco seguito.',
      'Ormai si premiano più le sponsorizzazioni che le medaglie…',
      'Questo gesto ha spostato l’attenzione mediatica dal risultato all’immagine dell’atleta, perdendo ogni legame con lo sport.',
      'La celebrazione sembra troppo forzata, costruita apposta per far parlare di sé oltre lo sport, da vera egocentrica.',
    ],
  },
];

// ── Sostenibilità topics ───────────────────────────────────────────────────
const SUSTAINABILITY_TOPICS = [
  {
    title: 'Riuso delle sedi',
    body:
      'Milano-Cortina 2026 è stata progettata intorno a un uso esteso di sedi già esistenti o temporanee, al fine di non lasciare “cattedrali nel deserto”, come spesso accade. Secondo la comunicazione ufficiale, circa il 90% delle sedi di gara rientra in questa logica di riuso. Alcuni degli esempi sono lo stadio di San Siro, l’Unipol Forum, e Rho Fiera.',
    source: 'SIMICO',
    comments: [
      'Questa scelta favorisce una migliore gestione del territorio, senza stravolgere le aree urbane e montane coinvolte.',
      'In questo modo si evitano investimenti eccessivi in nuove infrastrutture destinate a restare inutilizzate.',
      'Usare sedi esistenti è una scelta molto più sensata che costruire tutto da zero, l’impatto ambientale è ridotto significativamente.',
      'Le Olimpiadi potevano essere un’occasione per costruire nuovi impianti più moderni nelle sedi coinvolte, per restare al passo coi tempi.',
      'La comunicazione riguardo al riuso delle strutture non è stata trasparente, era solo una strategia di marketing e green-washing.',
      'Molti impianti esistenti rischiano di non essere davvero adeguati agli standard richiesti per le competizioni olimpiche.',
    ],
  },
  {
    title: 'Impatto climatico',
    body:
      'Il report ufficiale di sostenibilità stima le emissioni complessive di circa 1.005.000 tonnellate di CO₂ equivalente per la realizzazione dell’evento, suddivise nel seguente modo: 30% per la pianificazione e realizzazione dei Giochi, 29% per la costruzione di infrastrutture permanenti, e 41% per le attività correlate.',
    source: 'OLYMPICS',
    comments: [
      'Il fatto che parte delle emissioni sia legata a infrastrutture permanenti suggerisce investimenti utili anche dopo i Giochi.',
      'È ammirevole che vengano rilasciate pubblicamente queste informazioni: Olimpiadi trasparenti e sostenibili!',
      'Suddividere le emissioni per fasi consente di individuare con precisione le aree su cui intervenire per ridurre l’impatto ambientale.',
      'Un milione di tonnellate di CO₂ sono ancora troppe per poter chiamare queste Olimpiadi ‘sostenibili’.',
      'Possono spacciarla come una conquista, ma bisogna vedere cosa viene considerato nel conteggio, conviene diffidare.',
      'Un report di sostenibilità non garantisce che le emissioni vengano realmente ridotte nelle fasi operative dell’evento.',
    ],
  },
  {
    title: 'Neve artificiale',
    body:
      'Le sedi alpine hanno fatto ricorso alla neve tecnica per garantire condizioni adatte alle competizioni. A Livigno sono stati prodotti oltre 600.000 metri cubi di neve da metà dicembre per freestyle e snowboard.',
    source: 'REUTERS',
    comments: [
      'Garantire piste adeguate può avere ricadute positive anche sul turismo invernale delle località coinvolte.',
      'La scelta di investire nella neve artificiale dimostra la volontà di adattare gli eventi sportivi al cambiamento climatico.',
      'La neve tecnica è l’unica soluzione concreta per mantenere vive le località alpine legate agli sport invernali.',
      'Produrre una tale quantità di metri cubi di neve artificiale comporta un enorme consumo di acqua ed energia.',
      'La necessità di produrre neve artificiale è indicatore di un’edizione dei Giochi poco sostenibile.',
      'Affidarsi alla neve tecnica per le competizioni renderà sempre meno naturale l’esperienza degli sport invernali.',
    ],
  },
];

// ── Infrastructure topics ─────────────────────────────────────────────────
const INFRASTRUCTURE_TOPICS = [
  {
    title: 'Villaggio Olimpico',
    body:
      'Il Villaggio Olimpico di Porta Romana è stato progettato per ospitare gli atleti ' +
      'durante i Giochi e diventare student housing dopo l’evento. Il progetto presenta tecnologie ' +
      'ed impianti finalizzati al risparmio energetico. Una volta adibito a studentato, la quota ' +
      'mensile si aggirerà intorno ai 1.000€ per posto letto.',
    source: 'WIKIPEDIA, INARCASSA',
    comments: [
      'Finalmente un progetto che ha a cuore il risparmio energetico, è ammirevole.',
      'Diventando student housing, il Villaggio può contribuire in modo utile alla città.',
      'Ha contribuito a creare una bella atmosfera tra gli atleti, e rafforzare la sportività, che è fondamentale.',
      'Il villaggio olimpico ha distrutto Porta Romana.',
      'La quota di affitto non è accessibile, sarà l’ennesimo studentato soltanto per ricchi.',
      'L’edificio non ha un aspetto gradevole, rovina il panorama urbano con la sua estetica da prefabbricato.',
    ],
  },
  {
    title: 'Arena Santa Giulia',
    body:
      'L’Arena Santa Giulia è stata progettata per ospitare l’hockey olimpico e ' +
      'diventare poi un’arena polifunzionale per eventi, sport e spettacoli. La costruzione dell’arena ' +
      'rientra nel progetto di riqualificazione del quartiere Santa Giulia, o Montecity-Rogoredo, nella ' +
      'periferia sudest di Milano.',
    source: 'WIKIPEDIA',
    comments: [
      'L’arena è completamente accessibile alle persone con disabilità, un grande passo avanti per l’Italia, finalmente.',
      'Design estremamente moderno, un ottimo passo verso la riqualificazione di Santa Giulia.',
      'Struttura molto adatta per i concerti, l’acustica è ottima!',
      'È inammissibile che l’arena sia stata utilizzata prima del suo completamento.',
      'La peggior arena di sempre, durante i Giochi si sono verificati troppi malfunzionamenti.',
      'Uno spreco di risorse, sicuramente l’arena resterà inutilizzata.',
    ],
  },
  {
    title: 'Sliding Centre',
    body:
      'L’Eugenio Monti Sliding Centre è un tracciato per bob, skeleton e slittino ' +
      'situato a Cortina d’Ampezzo. La pista è stata ricostruita per ospitare le gare dei tre sport alle ' +
      'Olimpiadi Invernali di Milano-Cortina, ed è considerata una delle strutture più emblematiche ' +
      'dei Giochi.',
    source: 'WIKIPEDIA',
    comments: [
      'Le Olimpiadi Invernali sono state l’occasione perfetta per ristrutturare la pista, finalmente si potrà praticare di nuovo il bob a Cortina!',
      'Gli atleti che ci hanno gareggiato l’hanno definita come la migliore di sempre, e il loro parere è sicuramente il più valido di tutti.',
      'Non è da poco costruire una struttura così di qualità in breve tempo, l’Italia dovrebbe esserne orgogliosa.',
      'La pista è stata costruita su un terreno franabile, è assurdo che questo progetto sia stato anche solo approvato.',
      'L’impatto ambientale dello Sliding Centre rende impossibile apprezzarlo, indipendentemente dalla sua utilità',
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

const SUSTAINABILITY_RESULT_PATHS = [
  '/oggetti/pianta_positivo.glb',
  '/oggetti/pianta_negativo.glb',
  '/oggetti/pianta_estremo_positivo.glb',
  '/oggetti/pianta_estremo_negativo.glb',
  '/oggetti/pianta_neutro.glb',
];

const RESULT_PATHS_BY_KEY = {
  infrastructure: INFRASTRUCTURE_RESULT_PATHS,
  sport: SPORT_RESULT_PATHS,
  sustainability: SUSTAINABILITY_RESULT_PATHS,
};

/** @type {Record<'positivo' | 'negativo' | 'piu-positivo' | 'piu-negativo' | 'neutro', number>} */
const RESULT_KEY_INDEX = {
  positivo: 0,
  negativo: 1,
  'piu-positivo': 2,
  'piu-negativo': 3,
  neutro: 4,
};

export const FEEDBACK_HEADING = {
  line1: 'Fatti unici, molteplici sguardi.',
  line2: 'Questa è la realtà, plasmata dalla tua opinione.',
};

/** @type {Record<'sustainability' | 'sport' | 'infrastructure', Record<string, string>>} */
const FEEDBACK_BODIES = {
  sustainability: {
    'piu-negativo':
      "L'impatto dei Giochi sull'ecosistema territoriale è stato distruttivo, irreversibile e ingiustificabile. Le Olimpiadi di Milano-Cortina 2026 non possono in alcun modo essere considerate sostenibili.",
    negativo:
      "Le misure di compensazione ambientale dichiarate dai canali ufficiali sono insufficienti rispetto all'impatto che i Giochi hanno avuto sul territorio locale.",
    neutro:
      "Va riconosciuto un impegno reale verso un'edizione dei Giochi più sostenibile, ma un evento di questa portata genera inevitabilmente un'impronta ecologica pesante, su cui si può ancora migliorare.",
    positivo:
      "Queste Olimpiadi si possono considerare una vittoria per la sostenibilità dei grandi eventi, le emissioni sono compromessi inevitabili nell'epoca del cambiamento climatico.",
    'piu-positivo':
      "Milano-Cortina 2026 stabilirà un nuovo standard mondiale per i grandi eventi, dimostrando che è possibile coniugare l'efficienza infrastrutturale con il rispetto assoluto dell'ambiente.",
  },
  sport: {
    'piu-negativo':
      "Le Olimpiadi non sono altro che un palcoscenico iper-commercializzato, gli interessi finanziari hanno completamente eclissato i valori etici degli atleti e l'autenticità della competizione.",
    negativo:
      "L'organizzazione ha lasciato che le polemiche extra-sportive e le logiche di marketing superassero talvolta il valore puramente agonistico e il fascino delle performance.",
    neutro:
      'Non si possono ignorare le contraddizioni di un sistema che deve scendere a pesanti compromessi tra etica, regolamenti rigidi e contratti milionari.',
    positivo:
      'I regolamenti sono necessari per garantire la neutralità sul campo di gara, mentre i media e le sponsorizzazioni aumentano la visibilità internazionale e il coinvolgimento della comunità.',
    'piu-positivo':
      "Questi Giochi hanno ispirato e unito persone e territori, grazie anche agli sponsor che hanno contribuito all'attrattività dell'evento, e ai regolamenti ufficiali che hanno tutelato l'armonia della competizione.",
  },
  infrastructure: {
    'piu-negativo':
      "Le infrastrutture dei Giochi rappresentano solo una cementificazione immoderata, frutto di una sconsiderata gestione dei fondi pubblici, e un danno permanente che supera i benefici temporanei dell'evento.",
    negativo:
      "I ritardi, i costi crescenti e l'incognita sull'effettivo utilizzo e mantenimento delle infrastrutture nel post-olimpiade generano innumerevoli dubbi sui rischi legati ai cantieri.",
    neutro:
      'Un evento globale di questa portata richiede aggiornamenti e rivoluzioni del territorio, ma questo comporta necessariamente pesanti compromessi economici e logistici.',
    positivo:
      'Lo sviluppo e il miglioramento delle infrastrutture e dei servizi in occasione delle Olimpiadi Invernali hanno un valore notevole, essendo questi elementi significativi per il territorio.',
    'piu-positivo':
      "Le infrastrutture olimpiche sono motore e simbolo di crescita e innovazione, un'eredità inestimabile che proietterà il territorio nel futuro, azzerando qualsiasi dubbio logistico o polemica sui costi.",
  },
};

/**
 * Fisher-Yates: ordine casuale degli indici commento (0..length-1).
 * @param {number} length
 * @returns {number[]}
 */
export function shuffleCommentOrder(length) {
  const order = Array.from({ length }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

/**
 * @param {boolean[][]} topicLikes
 * @returns {'positivo' | 'negativo' | 'piu-positivo' | 'piu-negativo' | 'neutro'}
 */
export function computeResultKey(topicLikes) {
  let totalPositive = 0;
  let totalNegative = 0;
  for (const tl of topicLikes) {
    totalPositive += tl.slice(0, 3).filter(Boolean).length;
    totalNegative += tl.slice(3, 6).filter(Boolean).length;
  }
  if (totalPositive > 0 && totalNegative === 0) return 'positivo';
  if (totalNegative > 0 && totalPositive === 0) return 'negativo';
  if (totalPositive > totalNegative) return 'piu-positivo';
  if (totalNegative > totalPositive) return 'piu-negativo';
  return 'neutro';
}

/**
 * @param {'sustainability' | 'sport' | 'infrastructure'} sectionId
 * @param {'positivo' | 'negativo' | 'piu-positivo' | 'piu-negativo' | 'neutro'} key
 */
export function getFeedbackBody(sectionId, key) {
  return FEEDBACK_BODIES[sectionId]?.[key] ?? FEEDBACK_BODIES.sport.neutro;
}

/**
 * @param {'sustainability' | 'sport' | 'infrastructure'} sectionId
 * @param {boolean[][]} topicLikes
 */
export function computeResultPath(sectionId, topicLikes) {
  const key = computeResultKey(topicLikes);
  const paths = RESULT_PATHS_BY_KEY[sectionId] ?? SPORT_RESULT_PATHS;
  return paths[RESULT_KEY_INDEX[key]];
}

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

  const sectionHeroTitles = new Set(['sustainability', 'sport']);

  const phraseByKey = {
    sustainability: sections.sustainability.introClaim?.join(' ') ?? sections.sustainability.intro,
    sport: sections.sport.introPhrase ?? sections.sport.claim,
    infrastructure:
      sections.infrastructure.introClaim?.join(' ') ?? sections.infrastructure.intro,
  };

  const heroTitleLayoutByKey = {
    sport: 'spread',
    sustainability: 'spread',
  };

  const visualByKey = {
    infrastructure: {
      frostSrc: '/images/frost-infrastrutture.jpg',
      bgSrc: '/images/frost-infrastrutture.jpg',
    },
    sport: {
      /** Alysa è a destra nell’asset — ancora a destra per inquadrare viso e figura */
      bgPosition: '84% 12%',
    },
  };

  return {
    pageTitle: `${section.title} — Quante facce ha una medaglia?`,
    heroTitle: sectionHeroTitles.has(key) ? section.heroTitle : section.title,
    heroTitleStyle: /** @type {'svg' | 'section'} */ (
      sectionHeroTitles.has(key) ? 'section' : 'svg'
    ),
    heroTitleLayout: /** @type {'center' | 'spread'} */ (heroTitleLayoutByKey[key] ?? 'center'),
    heroAriaLabel: section.title,
    frostSrc: visualByKey[key]?.frostSrc ?? section.hero.background,
    bgSrc: visualByKey[key]?.bgSrc ?? section.hero.background,
    bgPosition: visualByKey[key]?.bgPosition,
    phrase: phraseByKey[key] ?? section.intro,
    phraseLines:
      key === 'sustainability'
        ? sections.sustainability.introClaim
        : key === 'infrastructure'
          ? sections.infrastructure.introClaim
          : undefined,
    modelSrc: key === 'infrastructure' ? '/oggetti/infrastrutture.glb' : section.modelSrc,
    resultPaths: RESULT_PATHS_BY_KEY[key] ?? [],
    sectionId: /** @type {'infrastructure' | 'sport' | 'sustainability'} */ (section.id),
    topics: topicsByKey[key] ?? SPORT_TOPICS,
  };
}
