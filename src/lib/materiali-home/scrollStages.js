/** Rotazione 2π completata — la camera resta ferma fino a HOME_SNOW_DIVE_START */
export const HOME_ORBIT_END = 0.45;
/** Inizio immersione neve + fade verso bianco (dopo la pausa post-orbita) */
export const HOME_SNOW_DIVE_START = 0.46;
/** Sfondo bianco pieno e canvas 3D spento — prima del terzo testo narrativo */
export const SNOW_ZONE_SCROLL = 0.62;
/** Fase cards — montagna top-down riappare insieme alle card */
export const HOME_CARDS_START = 0.82;
export const HOME_CARDS_END = 0.88;

/** Range scroll per lo zoom sfondo in fase cards (più ampio = zoom più lento) */
export const HOME_CARDS_ZOOM_START = HOME_CARDS_START;
export const HOME_CARDS_ZOOM_END = 1;

/** > 1 rallenta la curva di zoom rispetto allo scroll */
export const HOME_CARDS_ZOOM_EASE_POWER = 1.2;

/** > 1 rallenta lo zoom durante l’immersione neve */
export const HOME_SNOW_ZOOM_EASE_POWER = 1.15;

/** Lambda per lo smoothing scroll → camera (più basso = più morbido) */
export const HOME_SCROLL_DAMP_LAMBDA = 5.5;

/** Secondo blocco narrativo home — "Attraversa il percorso…" */
export const HOME_TEXT2 = { in: 0.28, inEnd: 0.33, out: 0.35, outEnd: 0.40 };

/** Peso scroll orbita durante HOME_TEXT2 (< 1 = montagna più lenta) */
export const HOME_ORBIT_TEXT2_SLOW_WEIGHT = 0.34;

/** @param {number} progress @param {number} start @param {number} end */
export function rangeProgress(progress, start, end) {
  if (progress <= start) return 0;
  if (progress >= end) return 1;
  return (progress - start) / (end - start);
}

/**
 * @param {number} progress
 * @param {number} fadeInStart
 * @param {number} fadeInEnd
 * @param {number} fadeOutStart
 * @param {number} fadeOutEnd
 */
export function stageOpacity(progress, fadeInStart, fadeInEnd, fadeOutStart, fadeOutEnd) {
  if (progress < fadeInStart) return 0;
  if (progress < fadeInEnd) return rangeProgress(progress, fadeInStart, fadeInEnd);
  if (progress < fadeOutStart) return 1;
  if (progress < fadeOutEnd) return 1 - rangeProgress(progress, fadeOutStart, fadeOutEnd);
  return 0;
}

/** @param {number} value @param {number} min @param {number} max */
export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/** @param {number} a @param {number} b @param {number} t */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/** @param {number} t @param {number} edge0 @param {number} edge1 */
export function remap(t, edge0, edge1) {
  return rangeProgress(t, edge0, edge1);
}

/**
 * Easing morbido 0→1 (Hermite)
 * @param {number} t
 */
export function smoothstep(t) {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}

/**
 * Ease-out morbido (stile moxy.studio)
 * @param {number} t
 */
export function easeOutCubic(t) {
  const x = clamp(t, 0, 1);
  return 1 - Math.pow(1 - x, 3);
}

/** Ease-in-out morbido per transizioni camera/zoom */
export function easeInOutQuint(t) {
  const x = clamp(t, 0, 1);
  return x < 0.5 ? 16 * x * x * x * x * x : 1 - Math.pow(-2 * x + 2, 5) / 2;
}

/**
 * Opacità di stage con fade in/out eased (non lineare).
 * @param {number} progress
 * @param {number} fadeInStart
 * @param {number} fadeInEnd
 * @param {number} fadeOutStart
 * @param {number} fadeOutEnd
 */
export function stageMoxyOpacity(progress, fadeInStart, fadeInEnd, fadeOutStart, fadeOutEnd) {
  if (progress < fadeInStart) return 0;
  if (progress < fadeInEnd) {
    return easeOutCubic(rangeProgress(progress, fadeInStart, fadeInEnd));
  }
  if (progress < fadeOutStart) return 1;
  if (progress < fadeOutEnd) {
    return 1 - easeOutCubic(rangeProgress(progress, fadeOutStart, fadeOutEnd));
  }
  return 0;
}

/**
 * Reveal per singola riga con stagger durante il fade-in del blocco.
 * @param {number} sectionT 0→1 progresso del fade-in del blocco
 * @param {number} lineIndex
 * @param {number} lineCount
 * @param {number} [stagger=0.14] ritardo relativo tra righe
 */
export function lineStaggerReveal(sectionT, lineIndex, lineCount, stagger = 0.14) {
  if (lineCount <= 1) return easeOutCubic(sectionT);
  const spread = stagger * (lineCount - 1);
  const local = (sectionT - lineIndex * stagger) / Math.max(0.001, 1 - spread);
  return easeOutCubic(clamp(local, 0, 1));
}

/** Solo opacità (nessuna traslazione). @param {number} t 0→1 */
export function fadeOpacityStyle(t) {
  return `opacity: ${clamp(t, 0, 1)};`;
}

/**
 * Opacità riga legata allo scroll (stagger in, fade out uniforme).
 * @param {number} progress
 * @param {{ in: number, inEnd: number, out: number, outEnd: number }} seg
 * @param {number} lineIndex
 * @param {number} lineCount
 */
export function scrollLineReveal(progress, seg, lineIndex, lineCount) {
  const { in: fadeInStart, inEnd: fadeInEnd, out: fadeOutStart, outEnd: fadeOutEnd } = seg;
  if (progress < fadeInStart) return 0;
  if (progress < fadeInEnd) {
    const sectionT = rangeProgress(progress, fadeInStart, fadeInEnd);
    return lineStaggerReveal(sectionT, lineIndex, lineCount);
  }
  if (progress < fadeOutStart) return 1;
  if (progress < fadeOutEnd) {
    return 1 - easeOutCubic(rangeProgress(progress, fadeOutStart, fadeOutEnd));
  }
  return 0;
}

/**
 * Progresso di segmento con ease-in-out
 * @param {number} progress @param {number} start @param {number} end
 */
export function smoothRangeProgress(progress, start, end) {
  return smoothstep(rangeProgress(progress, start, end));
}

/**
 * Interpolazione esponenziale verso un target (frame-rate indipendente).
 * @param {number} current
 * @param {number} target
 * @param {number} deltaSec
 * @param {number} [lambda=7]
 */
export function damp(current, target, deltaSec, lambda = 7) {
  const factor = 1 - Math.exp(-deltaSec * lambda);
  return current + (target - current) * factor;
}

/**
 * Rallenta l’orbita della montagna mentre è visibile il secondo testo narrativo.
 * @param {number} pageScroll progresso scroll pagina 0→1
 */
export function remapMountainScroll(pageScroll) {
  const p = clamp(pageScroll, 0, 1);
  if (p <= 0) return 0;
  if (p >= HOME_SNOW_DIVE_START) return p;

  const slowStart = HOME_TEXT2.in;
  const slowEnd = HOME_TEXT2.outEnd;
  const slowWeight = HOME_ORBIT_TEXT2_SLOW_WEIGHT;

  const segments = [
    { start: 0, end: slowStart, weight: 1 },
    { start: slowStart, end: slowEnd, weight: slowWeight },
    { start: slowEnd, end: HOME_SNOW_DIVE_START, weight: 1 }
  ];

  const totalWeight = segments.reduce(
    (sum, seg) => sum + (seg.end - seg.start) * seg.weight,
    0
  );

  let accumulated = 0;
  for (const seg of segments) {
    if (p <= seg.start) break;
    const len = seg.end - seg.start;
    if (p >= seg.end) {
      accumulated += len * seg.weight;
    } else {
      accumulated += (p - seg.start) * seg.weight;
      break;
    }
  }

  return (accumulated / totalWeight) * HOME_SNOW_DIVE_START;
}

/**
 * Progresso zoom sfondo nella fase cards — curva morbida fino a fine pagina.
 * @param {number} pageScroll
 */
export function cardsZoomProgress(pageScroll) {
  const t = rangeProgress(pageScroll, HOME_CARDS_ZOOM_START, HOME_CARDS_ZOOM_END);
  const eased = smoothstep(t);
  return Math.pow(eased, HOME_CARDS_ZOOM_EASE_POWER);
}
