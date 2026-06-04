/**
 * Layout dock fact + opinioni — Figma Versione-Finale / sostenibilità-main (2:234)
 * Frame di riferimento: 1512×982
 */
export const FACT_DOCK_FRAME = { width: 1512, height: 982 };

export const FACT_DOCK = {
  columnWidth: 424,
  insetLeft: 80,
  contentTop: 180,
  opinionGap: 20,
  /** Altezza minima card (Figma); stima per scala viewport con testo su 2–3 righe */
  opinionMinHeight: 96,
  opinionStackRow: 118,
  factHeight: 680
};

/** Altezza totale colonna opinioni (6 card + 5 gap) — stima per scale-down */
export const OPINIONS_STACK_HEIGHT =
  FACT_DOCK.opinionStackRow * 6 + FACT_DOCK.opinionGap * 5;
