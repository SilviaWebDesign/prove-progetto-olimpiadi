import { rangeProgress, clamp } from '$lib/components/file-chiara/scrollStages.js';

/** Frazione del segmento scroll in cui la card raggiunge il dock */
export const DOCK_LERP_FRACTION = 0.35;

/** Soglia oltre cui si mostra il layout Figma (card sinistra + opinioni destra) */
export const DOCK_UI_THRESHOLD = 0.5;

/**
 * @param {number} scrollProgress
 * @param {{ start: number, end: number }[]} factSegments
 * @param {number} index
 */
export function getFactDockT(scrollProgress, factSegments, index) {
  const seg = factSegments[index];
  if (!seg) return 0;
  const local = rangeProgress(
    scrollProgress,
    seg.start,
    seg.start + (seg.end - seg.start) * DOCK_LERP_FRACTION
  );
  return Math.min(1, local * 1.4);
}

/**
 * @param {number} scrollProgress
 * @param {{ start: number, end: number }[]} factSegments
 * @param {number} index
 */
export function isFactActive(scrollProgress, factSegments, index) {
  const seg = factSegments[index];
  if (!seg) return false;
  return scrollProgress >= seg.start && scrollProgress < seg.end;
}

/**
 * @param {number} dockT
 */
export function dockUiOpacity(dockT) {
  return clamp((dockT - DOCK_UI_THRESHOLD) / (1 - DOCK_UI_THRESHOLD), 0, 1);
}

/**
 * @param {number} dockT
 */
export function orbitCardDockFade(dockT) {
  return 1 - dockUiOpacity(dockT);
}
