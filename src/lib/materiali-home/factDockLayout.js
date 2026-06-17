/**
 * Layout dock fact + opinioni — Figma Versione-Finale / sostenibilità-main (2:234)
 * Frame di riferimento: 1512×982
 */
export const FACT_DOCK_FRAME = { width: 1512, height: 982 };

export const FACT_DOCK = {
  columnWidth: 377,
  insetLeft: 78,
  contentTop: 276,
  opinionGap: 14,
  /** Altezza minima card (Figma); stima per scala viewport con testo su 2–3 righe */
  opinionMinHeight: 82,
  opinionStackRow: 92,
  factHeight: 520
};

/** Altezza totale colonna opinioni (6 card + 5 gap) — stima per scale-down */
export const OPINIONS_STACK_HEIGHT =
  FACT_DOCK.opinionStackRow * 6 + FACT_DOCK.opinionGap * 5;
