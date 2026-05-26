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

/** Easing morbido 0→1 (Hermite) */
export function smoothstep(t) {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}

/** Progresso di segmento con ease-in-out */
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
