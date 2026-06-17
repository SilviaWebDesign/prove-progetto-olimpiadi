export const MODEL_ROTATION_SPEED = 0.35;
export const TORCH_LIGHT_ORBIT_SPEED = 0.4;

let animBaseY = 0;
let animBaseTorchY = 0;
let animStart = 0;
let paused = true;

let activeRefs = 0;
let hoverRefs = 0;
let motionReduced = false;

function recomputePaused() {
  const shouldPause = activeRefs === 0 || motionReduced;

  if (paused && !shouldPause) {
    animStart = performance.now();
    paused = false;
    return;
  }

  if (!paused && shouldPause) {
    const elapsed = (performance.now() - animStart) / 1000;
    animBaseY += MODEL_ROTATION_SPEED * elapsed;
    animBaseTorchY += TORCH_LIGHT_ORBIT_SPEED * elapsed;
    paused = true;
  }
}

/** @param {boolean} on */
export function setCardRotationActive(on) {
  if (on) activeRefs += 1;
  else activeRefs = Math.max(0, activeRefs - 1);
  recomputePaused();
}

/** @param {boolean} on */
export function setCardRotationHovered(on) {
  if (on) hoverRefs += 1;
  else hoverRefs = Math.max(0, hoverRefs - 1);
  recomputePaused();
}

/** @param {boolean} reduced */
export function setCardRotationMotionReduced(reduced) {
  if (motionReduced === reduced) return;
  if (!paused) {
    const elapsed = (performance.now() - animStart) / 1000;
    animBaseY += MODEL_ROTATION_SPEED * elapsed;
    animBaseTorchY += TORCH_LIGHT_ORBIT_SPEED * elapsed;
    animStart = performance.now();
  }
  motionReduced = reduced;
  recomputePaused();
}

export function getModelRotationY() {
  if (paused) return animBaseY;
  const elapsed = (performance.now() - animStart) / 1000;
  return animBaseY + MODEL_ROTATION_SPEED * elapsed;
}

export function getTorchLightRotationY() {
  if (paused) return animBaseTorchY;
  const elapsed = (performance.now() - animStart) / 1000;
  return animBaseTorchY + TORCH_LIGHT_ORBIT_SPEED * elapsed;
}
