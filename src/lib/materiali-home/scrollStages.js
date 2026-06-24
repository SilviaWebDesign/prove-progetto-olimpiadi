/** Rotazione 2π completata — la camera resta ferma fino a HOME_SNOW_DIVE_START */
export const HOME_ORBIT_END = 0.45;
/** Inizio immersione neve + fade verso bianco (dopo la pausa post-orbita) */
export const HOME_SNOW_DIVE_START = 0.46;
/** Sfondo bianco pieno e canvas 3D spento — prima del terzo testo narrativo */
export const SNOW_ZONE_SCROLL = 0.62;
/** Fase cards — montagna top-down riappare insieme alle card */
export const HOME_CARDS_START = 0.9;
export const HOME_CARDS_END = 0.95;

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
