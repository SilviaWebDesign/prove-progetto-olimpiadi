const INTRO =
  'Le Olimpiadi prendono forma attraverso cantieri, impianti e collegamenti tra territori. Queste opere possono essere lette come investimenti utili o come interventi costosi, il cui valore dipende da cosa resterà dopo l’evento.';

const INFRASTRUCTURE_INTRO_CLAIM = [
  'Le Olimpiadi',
  'prendono forma',
  'attraverso cantieri,',
  'impianti e',
  'collegamenti tra',
  'territori. Queste',
  'opere possono',
  'essere lette come',
  'investimenti utili o',
  'come interventi',
  'costosi, il cui valore',
  'dipende da cosa',
  'resterà dopo',
  'l’evento.'
];

const CLAIM =
  'Ogni Olimpiade lascia medaglie, record ed eventi memorabili. Ma lascia anche interpretazioni in conflitto. Qui non troverai un’opinione unica; scoprirai il modo in cui essa prende forma.';

const OPINION_QUOTE =
  '“LoreSe diventa davvero student housing, il villaggio può lasciare qualcosa di utile alla città.”';

/** Hero condiviso — sfondo alberi + frost interattivo */
const HERO_ASSETS = {
  background: '/images/hero-feature.jpg'
};

const SPORT_INTRO_PHRASE =
  'Le Olimpiadi vivono grazie a gare, atleti e discipline differenti. Questi eventi possono essere occasioni di crescita e partecipazione oppure competizioni incentrate su visibilità e risultati, in equilibrio tra sportività e spettacolo.';

const SPORT_FACT_BODY =
  'Alysa Liu si presenta come una delle protagoniste più attese del pattinaggio artistico ai Giochi Olimpici Invernali di Milano-Cortina 2026. La sua partecipazione contribuisce a rafforzare l’attenzione internazionale sull’evento, in particolare tra il pubblico più giovane e gli appassionati degli sport su ghiaccio, grazie a uno stile tecnico e spettacolare che ha già segnato diverse competizioni internazionali.';

const SPORT_OPINIONS = [
  {
    quote:
      '“Sembra divertirsi davvero mentre gareggia, il che ormai è raro negli sport di alto livello, Liu è un ottimo esempio per i giovani atleti.”'
  },
  {
    quote:
      '“Il suo ritorno in gara dopo il ritiro la rende una delle storie sportive più ispiranti dei Giochi, Alysa è un simbolo di rinascita.”'
  },
  {
    quote:
      '“Il suo atteggiamento ‘senza pressione’ rompe gli schemi tradizionali del pattinaggio, rendendo lo sport più moderno e pop.”'
  },
  {
    quote:
      '“La sua storia di discontinuità con lo sport dimostra che non prende sul serio la sua disciplina.”'
  },
  {
    quote:
      '“La sua performance al Gala Olimpico è stata un insulto al pattinaggio artistico, avrebbe dovuto esibirsi su musica classica, non pop.”'
  },
  {
    quote:
      '“È solo un’atleta come le altre, ma ha ricevuto un’attenzione esagerata da parte dei media, si sentiva parlare solo di lei.”'
  }
];

const SUSTAINABILITY_INTRO_CLAIM = [
  'Le Olimpiadi sono',
  'accompagnate da',
  'scelte che',
  'riguardano ambiente',
  'e risorse. Questi',
  'interventi possono',
  'essere letti come',
  'attenzione al',
  'territorio oppure',
  'come iniziative dal',
  'valore limitato,',
  'misurabile solo nel',
  'tempo.'
];

const SUSTAINABILITY_FACT_1_BODY =
  'Milano-Cortina 2026 è stata progettata intorno a un uso esteso di sedi già esistenti o temporanee, al fine di non lasciare “cattedrali nel deserto”, come spesso accade. Secondo la comunicazione ufficiale, circa il 90% delle sedi di gara rientra in questa logica di riuso. Alcuni degli esempi sono lo stadio di San Siro, l’Unipol Forum, e Rho Fiera.';

const SUSTAINABILITY_FACT_2_BODY =
  'Il report ufficiale di sostenibilità stima le emissioni complessive di circa 1.005.000 tonnellate di CO₂ equivalente per la realizzazione dell’evento, suddivise nel seguente modo: 30% per la pianificazione e realizzazione dei Giochi, 29% per la costruzione di infrastrutture permanenti, e 41% per le attività correlate.';

const SUSTAINABILITY_FACT_3_BODY =
  'Le sedi alpine hanno fatto ricorso alla neve tecnica per garantire condizioni adatte alle competizioni. A Livigno sono stati prodotti oltre 600.000 metri cubi di neve da metà dicembre per freestyle e snowboard.';

export const sections = {
  sustainability: {
    id: 'sustainability',
    slug: 'sostenibilita',
    title: 'SOSTENIBILITÀ',
    heroTitle: 'sostenibilità',
    menuLabel: 'Sostenibilità',
    theme: 'sustainability',
    accent: '#3eaf3f',
    modelSrc: '/oggetti/sostenibilita.glb',
    hero: {
      background: '/images/foresta.png'
    },
    introClaim: SUSTAINABILITY_INTRO_CLAIM,
    facts: [
      {
        id: 'fact-1',
        label: 'sostenibilità · fact 1',
        title: 'Riuso delle sedi',
        body: SUSTAINABILITY_FACT_1_BODY,
        sources: 'simico'
      },
      {
        id: 'fact-2',
        label: 'sostenibilità · fact 2',
        title: 'Impatto climatico',
        body: SUSTAINABILITY_FACT_2_BODY,
        sources: 'olympics'
      },
      {
        id: 'fact-3',
        label: 'sostenibilità · fact 3',
        title: 'Neve artificiale',
        body: SUSTAINABILITY_FACT_3_BODY,
        sources: 'reuters'
      }
    ],
    opinionsByFact: [
      [
        {
          id: 's1-o1',
          quote:
            '“Questa scelta favorisce una migliore gestione del territorio, senza stravolgere le aree urbane e montane coinvolte.”',
          sentiment: 'positive'
        },
        {
          id: 's1-o2',
          quote:
            '“In questo modo si evitano investimenti eccessivi in nuove infrastrutture destinate a restare inutilizzate.”',
          sentiment: 'positive'
        },
        {
          id: 's1-o3',
          quote:
            '“Usare sedi esistenti è una scelta molto più sensata che costruire tutto da zero, l’impatto ambientale è ridotto significativamente.”',
          sentiment: 'positive'
        },
        {
          id: 's1-o4',
          quote:
            '“Le Olimpiadi potevano essere un’occasione per costruire nuovi impianti più moderni nelle sedi coinvolte, per restare al passo coi tempi.”',
          sentiment: 'negative'
        },
        {
          id: 's1-o5',
          quote:
            '“La comunicazione riguardo al riuso delle strutture non è stata trasparente, era solo una strategia di marketing e green-washing.”',
          sentiment: 'negative'
        },
        {
          id: 's1-o6',
          quote:
            '“Molti impianti esistenti rischiano di non essere davvero adeguati agli standard richiesti per le competizioni olimpiche.”',
          sentiment: 'negative'
        }
      ],
      [
        {
          id: 's2-o1',
          quote:
            '“Il fatto che parte delle emissioni sia legata a infrastrutture permanenti suggerisce investimenti utili anche dopo i Giochi.”',
          sentiment: 'positive'
        },
        {
          id: 's2-o2',
          quote:
            '“È ammirevole che vengano rilasciate pubblicamente queste informazioni: Olimpiadi trasparenti e sostenibili!”',
          sentiment: 'positive'
        },
        {
          id: 's2-o3',
          quote:
            '“Suddividere le emissioni per fasi consente di individuare con precisione le aree su cui intervenire per ridurre l’impatto ambientale.”',
          sentiment: 'positive'
        },
        {
          id: 's2-o4',
          quote:
            '“Un milione di tonnellate di CO₂ sono ancora troppe per poter chiamare queste Olimpiadi ‘sostenibili’.”',
          sentiment: 'negative'
        },
        {
          id: 's2-o5',
          quote:
            '“Possono spacciarla come una conquista, ma bisogna vedere cosa viene considerato nel conteggio, conviene diffidare.”',
          sentiment: 'negative'
        },
        {
          id: 's2-o6',
          quote:
            '“Un report di sostenibilità non garantisce che le emissioni vengano realmente ridotte nelle fasi operative dell’evento.”',
          sentiment: 'negative'
        }
      ],
      [
        {
          id: 's3-o1',
          quote:
            '“Garantire piste adeguate può avere ricadute positive anche sul turismo invernale delle località coinvolte.”',
          sentiment: 'positive'
        },
        {
          id: 's3-o2',
          quote:
            '“La scelta di investire nella neve artificiale dimostra la volontà di adattare gli eventi sportivi al cambiamento climatico.”',
          sentiment: 'positive'
        },
        {
          id: 's3-o3',
          quote:
            '“La neve tecnica è l’unica soluzione concreta per mantenere vive le località alpine legate agli sport invernali.”',
          sentiment: 'positive'
        },
        {
          id: 's3-o4',
          quote:
            '“Produrre una tale quantità di metri cubi di neve artificiale comporta un enorme consumo di acqua ed energia.”',
          sentiment: 'negative'
        },
        {
          id: 's3-o5',
          quote:
            '“La necessità di produrre neve artificiale è indicatore di un’edizione dei Giochi poco sostenibile.”',
          sentiment: 'negative'
        },
        {
          id: 's3-o6',
          quote:
            '“Affidarsi alla neve tecnica per le competizioni renderà sempre meno naturale l’esperienza degli sport invernali.”',
          sentiment: 'negative'
        }
      ]
    ],
    closure: {
      title: 'Questa è la realtà, plasmata dalla tua opinione',
      hint: 'Scorri per continuare'
    },
    intro: INTRO,
    claim: CLAIM,
    featured: {
      title:
        'Il report ufficiale di sostenibilità stima le emissioni complessive di circa 1.005.000 tonnellate di CO₂ equivalente per la realizzazione dell’evento, suddivise nel seguente modo: 30% per la pianificazione e realizzazione dei Giochi, 29% per la costruzione di infrastrutture permanenti, e 41% per le attività correlate.',
      cta: 'Scopri di più',
      body:
        'Il report ufficiale di sostenibilità stima le emissioni complessive di circa 1.005.000 tonnellate di CO₂ equivalente per la realizzazione dell’evento, suddivise nel seguente modo: 30% per la pianificazione e realizzazione dei Giochi, 29% per la costruzione di infrastrutture permanenti, e 41% per le attività correlate.'
    },
    opinions: Array.from({ length: 6 }, () => ({ quote: OPINION_QUOTE })),
    footerBand: true,
    footerSnowImage: '/sections/footer-snow.png',
    footerGradientImage: '/sections/snow-bg.jpg'
  },
  sport: {
    id: 'sport',
    slug: 'sport',
    title: 'SPORT',
    heroTitle: 'sport',
    menuLabel: 'Sport',
    theme: 'sport',
    accent: '#422ccb',
    modelSrc: '/oggetti/sport.glb',
    hero: {
      background: '/images/alysasfondo.png'
    },
    intro: INTRO,
    introPhrase: SPORT_INTRO_PHRASE,
    claim: CLAIM,
    featured: {
      title: 'Alysa Liu',
      cta: 'Scopri di più',
      body: SPORT_FACT_BODY,
      sources: 'wikipedia'
    },
    opinions: SPORT_OPINIONS,
    footerBand: false,
    footerSnowImage: null,
    footerGradientImage: null
  },
  infrastructure: {
    id: 'infrastructure',
    slug: 'infrastrutture',
    title: 'INFRASTRUTTURE',
    heroTitle: 'infrastrutture',
    menuLabel: 'Infrastrutture',
    theme: 'infrastructure',
    accent: '#ff783c',
    modelSrc: '/oggetti/excavator.glb',
    hero: {
      background: '/images/villaggio.png'
    },
    intro: INTRO,
    introClaim: INFRASTRUCTURE_INTRO_CLAIM,
    claim: CLAIM,
    featured: {
      title: 'Il villaggio olimpico ha distrutto Porta Romana',
      cta: 'info',
      body: 'Il villaggio olimpico ha distrutto Porta Romana'
    },
    opinions: Array.from({ length: 6 }, () => ({ quote: OPINION_QUOTE })),
    footerBand: false,
    footerSnowImage: null,
    footerGradientImage: null
  }
};

export const sectionList = Object.values(sections);

/**
 * @param {string} slug
 */
export function getSectionBySlug(slug) {
  return sectionList.find((section) => section.slug === slug) ?? null;
}

/**
 * @param {typeof sections[keyof typeof sections] | keyof typeof sections | string} sectionOrKey
 */
export function getSectionHref(sectionOrKey) {
  const section =
    typeof sectionOrKey === 'string'
      ? sections[/** @type {keyof typeof sections} */ (sectionOrKey)] ??
        sectionList.find((item) => item.id === sectionOrKey || item.slug === sectionOrKey)
      : sectionOrKey;

  return section ? `/sezioni/${section.slug}` : '/prototypes/home';
}
