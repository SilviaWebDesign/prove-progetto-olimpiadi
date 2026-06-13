import { sections } from '../sections.js';

/** @param {{ quote: string }} op */
function quoteBody(op) {
  return op.quote;
}

/**
 * @param {'sustainability' | 'sport' | 'infrastructure'} key
 */
export function getScrollytellConfig(key) {
  const section = sections[key];

  const cards =
    key === 'infrastructure'
      ? [
          {
            id: 0,
            body: 'Lo Stadio di San Siro sarà completamente ristrutturato per ospitare le cerimonie olimpiche.',
            liked: false
          },
          {
            id: 1,
            body: "L'Unipol Forum di Assago è già pronto e non richiede interventi strutturali rilevanti.",
            liked: false
          },
          {
            id: 2,
            body: "Rho Fiera viene adattata come hub logistico e media center per l'intera manifestazione.",
            liked: false
          },
          {
            id: 3,
            body: 'Circa il 90% delle sedi di gara rientra in una logica di riuso o utilizzo di strutture temporanee.',
            liked: false
          },
          {
            id: 4,
            body: 'Il villaggio olimpico di Milano sarà poi convertito in alloggi per studenti universitari.',
            liked: false
          },
          {
            id: 5,
            body: 'Le piste da ghiaccio temporanee verranno smontate dopo i Giochi, senza strutture inutilizzate.',
            liked: false
          }
        ]
      : key === 'sustainability' && section.opinionsByFact?.[0]
        ? section.opinionsByFact[0].map((op, id) => ({
            id,
            body: quoteBody(op),
            liked: false
          }))
        : section.opinions.map((op, id) => ({
            id,
            body: quoteBody(op),
            liked: false
          }));

  /** @type {Set<string>} */
  const sectionHeroTitles = new Set(['sustainability', 'sport']);

  const fact =
    key === 'sustainability' && section.facts?.[0]
      ? section.facts[0]
      : null;

  /** @type {Record<string, string>} */
  const factBodyByKey = {
    infrastructure:
      'Milano-Cortina 2026 è stata progettata intorno a un uso esteso di sedi già esistenti o ' +
      'temporanee, al fine di non lasciare "cattedrali nel deserto", come spesso accade. Secondo ' +
      'la comunicazione ufficiale, circa il 90% delle sedi di gara rientra in questa logica di ' +
      "riuso. Alcuni degli esempi sono lo stadio di San Siro, l'Unipol Forum, e Rho Fiera."
  };

  /** @type {Record<string, string>} */
  const topicCounter = {
    sustainability: '1 / 3',
    sport: '2 / 3',
    infrastructure: '1 / 3'
  };

  /** @type {Record<string, string>} */
  const phraseByKey = {
    sustainability: sections.sustainability.introClaim?.join(' ') ?? sections.sustainability.intro,
    sport: sections.sport.introPhrase ?? sections.sport.claim,
    infrastructure:
      'Le Olimpiadi prendono forma attraverso cantieri, impianti e collegamenti tra territori. Queste opere possono essere lette come investimenti utili o come interventi costosi, il cui valore dipende da cosa resterà dopo l\'evento.'
  };

  /** @type {Record<string, string>} */
  const frostByKey = {
    sustainability: section.hero.background,
    sport: section.hero.background,
    infrastructure: section.hero.background
  };

  return {
    id: section.id,
    pageTitle: `${section.title} — Quante facce ha una medaglia?`,
    heroTitle: sectionHeroTitles.has(key) ? section.heroTitle : section.title,
    heroTitleStyle: /** @type {'svg' | 'section'} */ (
      sectionHeroTitles.has(key) ? 'section' : 'svg'
    ),
    heroAriaLabel: section.title,
    frostSrc: frostByKey[key],
    bgSrc: frostByKey[key],
    phrase: phraseByKey[key],
    topicCounter: topicCounter[key],
    factTitle: fact?.title ?? (key === 'infrastructure' ? 'Riuso delle sedi' : section.featured.title),
    factBody: fact?.body ?? factBodyByKey[key] ?? section.featured.body,
    factSource:
      fact?.sources?.toUpperCase() ??
      section.featured?.sources?.toUpperCase() ??
      'FONTE',
    modelSrc: key === 'infrastructure' ? '/oggetti/infrastrutture.glb' : section.modelSrc,
    sectionId: /** @type {'infrastructure' | 'sport' | 'sustainability'} */ (section.id),
    cards
  };
}
