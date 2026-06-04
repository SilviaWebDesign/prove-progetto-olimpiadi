const INTRO =
  'Le Olimpiadi prendono forma attraverso cantieri, impianti e collegamenti tra territori. Queste opere possono essere lette come investimenti utili o come interventi costosi, il cui valore dipende da cosa resterà dopo l’evento.';

const CLAIM =
  'Ogni Olimpiade lascia medaglie, record ed eventi memorabili. Ma lascia anche interpretazioni in conflitto. Qui non troverai un’opinione unica; scoprirai il modo in cui essa prende forma.';

const OPINION_QUOTE =
  '“LoreSe diventa davvero student housing, il villaggio può lasciare qualcosa di utile alla città.”';

/** Hero condiviso — sfondo alberi + frost interattivo */
const HERO_ASSETS = {
  background: '/sections/hero-feature.jpg'
};

const SUSTAINABILITY_INTRO_CLAIM =
  'Le Olimpiadi sono accompagnate da scelte che riguardano ambiente e risorse. Questi interventi possono essere letti come attenzione al territorio oppure come iniziative dal valore limitato, misurabile solo nel tempo.';

const SUSTAINABILITY_FACT_1_BODY =
  'Milano-Cortina 2026 è stata progettata intorno a un uso esteso di sedi già esistenti o temporanee, al fine di non lasciare “cattedrali nel deserto”, come spesso accade. Secondo la comunicazione ufficiale, circa il 90% delle sedi di gara rientra in questa logica di riuso. Alcuni degli esempi sono lo stadio di San Siro, l’Unipol Forum, e Rho Fiera.';

const SUSTAINABILITY_FACT_2_BODY =
  'Il Villaggio Olimpico di Porta Romana è stato progettato per ospitare gli atleti durante i Giochi e diventare student housing dopo l’evento. Il progetto include edifici residenziali, spazi pubblici e una nuova piazza di quartiere.';

const SUSTAINABILITY_FACT_3_BODY =
  'Le scelte energetiche e i trasporti collegati ai Giochi sono stati presentati come un modello di efficienza. Il loro impatto reale dipende da come verranno usati impianti e infrastrutture dopo l’evento.';

export const sections = {
  sustainability: {
    id: 'sustainability',
    slug: 'sostenibilita',
    title: 'SOSTENIBILITÀ',
    heroTitle: 'sostenibilità',
    menuLabel: 'Sostenibilità',
    theme: 'sustainability',
    accent: '#3eaf3f',
    modelSrc: '/oggetti/albero.glb',
    hero: {
      background: '/sections/hero-feature.jpg'
    },
    introClaim: SUSTAINABILITY_INTRO_CLAIM,
    facts: [
      {
        id: 'fact-1',
        label: 'sostenibilità · fact 1',
        body: SUSTAINABILITY_FACT_1_BODY,
        sources: 'wikipedia, inarcassa'
      },
      {
        id: 'fact-2',
        label: 'sostenibilità · fact 2',
        body: SUSTAINABILITY_FACT_2_BODY,
        sources: 'comune di milano, ioc'
      },
      {
        id: 'fact-3',
        label: 'sostenibilità · fact 3',
        body: SUSTAINABILITY_FACT_3_BODY,
        sources: 'ministero ambiente'
      }
    ],
    opinionsByFact: [
      [
        {
          id: 's1-o1',
          quote:
            '“La comunicazione riguardo al riuso delle strutture non è stata trasparente, era solo una strategia di marketing.”',
          sentiment: 'negative'
        },
        {
          id: 's1-o2',
          quote:
            '“Il riuso delle sedi esistenti riduce sprechi e impatto ambientale rispetto a costruire ex novo.”',
          sentiment: 'positive'
        },
        {
          id: 's1-o3',
          quote: '“Il 90% di sedi riutilizzate suona bene, ma i numeri vanno verificati nel dettaglio.”',
          sentiment: 'negative'
        },
        {
          id: 's1-o4',
          quote:
            '“San Siro e Rho Fiera dimostrano che si può organizzare un evento globale senza nuovi colossi.”',
          sentiment: 'positive'
        },
        {
          id: 's1-o5',
          quote:
            '“Il riuso dichiarato non tiene conto degli impatti indotti da cantieri e trasformazioni urbane.”',
          sentiment: 'negative'
        },
        {
          id: 's1-o6',
          quote:
            '“Riutilizzare impianti esistenti è la scelta più sensata per ridurre la carbon footprint.”',
          sentiment: 'positive'
        }
      ],
      [
        {
          id: 's2-o1',
          quote:
            '“Il villaggio olimpico lascerà un patrimonio utile alla città se diventa davvero student housing.”',
          sentiment: 'positive'
        },
        {
          id: 's2-o2',
          quote: '“Porta Romana rischia di restare un’isola costosa senza integrazione col quartiere.”',
          sentiment: 'negative'
        },
        {
          id: 's2-o3',
          quote: '“La piazza e gli spazi pubblici possono rigenerare un’area trascurata da anni.”',
          sentiment: 'positive'
        },
        {
          id: 's2-o4',
          quote: '“Gli alloggi post-Giochi non bastano da soli a compensare il disagio dei cantieri.”',
          sentiment: 'negative'
        },
        {
          id: 's2-o5',
          quote:
            '“La comunicazione sul riuso delle strutture non è stata trasparente, era solo una strategia di marketing.”',
          sentiment: 'negative'
        },
        {
          id: 's2-o6',
          quote: '“Un campus universitario può rilanciare un intero quartiere se ben collegato.”',
          sentiment: 'positive'
        }
      ],
      [
        {
          id: 's3-o1',
          quote: '“Le politiche green dei Giochi sono un segnale importante per il Paese.”',
          sentiment: 'positive'
        },
        {
          id: 's3-o2',
          quote: '“Trasporti e energia restano impatti enormi, anche con sedi riusate.”',
          sentiment: 'negative'
        },
        {
          id: 's3-o3',
          quote: '“Senza monitoraggio post-evento, le promesse ambientali restano sulla carta.”',
          sentiment: 'negative'
        },
        {
          id: 's3-o4',
          quote: '“Un’Olimpiade può accelerare investimenti in mobilità sostenibile duratura.”',
          sentiment: 'positive'
        },
        {
          id: 's3-o5',
          quote:
            '“Le promesse green servono più a costruire un’immagine che a cambiare le pratiche.”',
          sentiment: 'negative'
        },
        {
          id: 's3-o6',
          quote: '“Monitorare i dati post-Giochi è l’unico modo per giudicare il reale impatto.”',
          sentiment: 'positive'
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
        'Il Villaggio Olimpico di Porta Romana è stato progettato per ospitare gli atleti durante i Giochi e diventare student housing dopo l’evento. Il progetto include edifici residenziali, spazi pubblici e una nuova piazza di quartiere.',
      cta: 'Scopri di più',
      body: 'Il Villaggio Olimpico di Porta Romana è stato progettato per ospitare gli atleti durante i Giochi e diventare student housing dopo l’evento. Il progetto include edifici residenziali, spazi pubblici e una nuova piazza di quartiere.'
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
    modelSrc: '/oggetti/pattinatrice3.glb',
    hero: HERO_ASSETS,
    intro: INTRO,
    claim: CLAIM,
    featured: {
      title:
        'Il Villaggio Olimpico di Porta Romana è stato progettato per ospitare gli atleti durante i Giochi e diventare student housing dopo l’evento. Il progetto include edifici residenziali, spazi pubblici e una nuova piazza di quartiere.',
      cta: 'Scopri di più',
      body: 'Il Villaggio Olimpico di Porta Romana è stato progettato per ospitare gli atleti durante i Giochi e diventare student housing dopo l’evento. Il progetto include edifici residenziali, spazi pubblici e una nuova piazza di quartiere.'
    },
    opinions: Array.from({ length: 6 }, () => ({ quote: OPINION_QUOTE })),
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
    modelSrc: '/oggetti/torcia.glb',
    hero: HERO_ASSETS,
    intro: INTRO,
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

/** @type {typeof sections.sustainability} */
export const sectionList = Object.values(sections);

/**
 * @param {string} slug
 */
export function getSectionBySlug(slug) {
  return sectionList.find((section) => section.slug === slug) ?? null;
}
