import * as THREE from 'three';

/**
 * @typedef {{
 *   id: string;
 *   azimuth: number;
 *   elevation: number;
 *   label: string;
 *   body: string;
 *   sources: string;
 * }} AboutHotspot
 */

/** Distanza minima tra marker consecutivi sul percorso (unità mondo). */
export const MIN_HOTSPOT_SPACING = 4.8;

/** Sei tappe sul percorso in senso orario (azimuth crescente = avanti nel percorso). */
/** @type {AboutHotspot[]} */
export const ABOUT_HOTSPOT_PATH = [
  {
    id: 'start',
    azimuth: 0.04,
    elevation: 0.1,
    label: 'Partenza',
    body:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Il percorso inizia dalla base della montagna.',
    sources: 'fonte placeholder'
  },
  {
    id: 'lower-slope',
    azimuth: 0.26,
    elevation: 0.28,
    label: 'Pendio inferiore',
    body:
      'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam.',
    sources: 'fonte placeholder'
  },
  {
    id: 'west-ridge',
    azimuth: 0.5,
    elevation: 0.46,
    label: 'Cresta ovest',
    body:
      'Quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
    sources: 'fonte placeholder'
  },
  {
    id: 'east-slope',
    azimuth: 0.68,
    elevation: 0.64,
    label: 'Versante est',
    body:
      'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.',
    sources: 'fonte placeholder'
  },
  {
    id: 'upper-ridge',
    azimuth: 0.82,
    elevation: 0.8,
    label: 'Alta quota',
    body:
      'Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim.',
    sources: 'fonte placeholder'
  },
  {
    id: 'peak',
    azimuth: 0.93,
    elevation: 0.9,
    label: 'Vetta',
    body:
      'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium.',
    sources: 'fonte placeholder'
  }
];

/** @deprecated Usa ABOUT_HOTSPOT_PATH */
export const ABOUT_HOTSPOTS = ABOUT_HOTSPOT_PATH;

/**
 * @param {string} id
 * @returns {number}
 */
export function getHotspotPathIndex(id) {
  return ABOUT_HOTSPOT_PATH.findIndex((h) => h.id === id);
}

/**
 * @param {string} id
 * @returns {AboutHotspot | null}
 */
export function getNextHotspot(id) {
  const index = getHotspotPathIndex(id);
  if (index < 0 || index >= ABOUT_HOTSPOT_PATH.length - 1) return null;
  return ABOUT_HOTSPOT_PATH[index + 1];
}

/**
 * @param {string} id
 * @returns {AboutHotspot | null}
 */
export function getPrevHotspot(id) {
  const index = getHotspotPathIndex(id);
  if (index <= 0) return null;
  return ABOUT_HOTSPOT_PATH[index - 1];
}

/** Distanza dalla superficie per appoggiare le card all'esterno del mesh. */
export const HOTSPOT_SURFACE_OFFSET = 0.28;

/** Margine minimo tra camera e superficie della montagna. */
export const CAMERA_SURFACE_MARGIN = 1.2;

/**
 * Angolo orizzontale in radianti attorno alla montagna (senso orario, vista dall'alto).
 * @param {number} azimuth Frazione [0, 1) lungo il percorso
 */
function hotspotAzimuthRadians(azimuth) {
  return -azimuth * Math.PI * 2;
}

/**
 * Direzione orizzontale attorno alla montagna.
 * @param {number} azimuth Frazione [0, 1)
 */
export function hotspotHorizontalDirection(azimuth) {
  const az = hotspotAzimuthRadians(azimuth);
  return new THREE.Vector3(Math.cos(az), 0, Math.sin(az)).normalize();
}

/**
 * @param {THREE.Intersection[]} hits
 * @param {THREE.Vector3} rayDir
 * @param {number} baseY
 * @returns {THREE.Intersection | undefined}
 */
function pickVisibleSurfaceHit(hits, rayDir, baseY) {
  for (const hit of hits) {
    if (hit.point.y < baseY - 0.15) continue;
    if (hit.face == null) return hit;

    const normal = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
    // Solo faccia esterna raggiunta dal raggio
    if (rayDir.dot(normal) >= 0) continue;
    if (normal.y < -0.35) continue;

    return hit;
  }
  return undefined;
}

/**
 * @param {THREE.Intersection} hit
 * @param {THREE.Vector3} horizontal
 */
function positionOnSurface(hit, horizontal) {
  const faceNormal =
    hit.face != null
      ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld).normalize()
      : horizontal.clone();

  const offsetNormal = new THREE.Vector3(faceNormal.x, Math.max(faceNormal.y, 0.12), faceNormal.z)
    .lerp(horizontal, 0.35)
    .normalize();

  return hit.point.clone().addScaledVector(offsetNormal, HOTSPOT_SURFACE_OFFSET);
}

/**
 * Proietta un hotspot sulla superficie visibile (fianchi e parte alta).
 *
 * @param {THREE.Box3} worldBox
 * @param {THREE.Object3D} mountainModel
 * @param {AboutHotspot} hotspot
 * @param {THREE.Raycaster} raycaster
 * @returns {THREE.Vector3}
 */
export function hotspotSurfacePosition(worldBox, mountainModel, hotspot, raycaster) {
  const center = worldBox.getCenter(new THREE.Vector3());
  const size = worldBox.getSize(new THREE.Vector3());
  const sphere = worldBox.getBoundingSphere(new THREE.Sphere());
  const baseY = worldBox.min.y + size.y * 0.12;
  const horizontal = hotspotHorizontalDirection(hotspot.azimuth);
  const summitY = worldBox.min.y + size.y * 0.82;

  const bandY = THREE.MathUtils.lerp(
    baseY + size.y * 0.04,
    summitY,
    hotspot.elevation
  );

  /** @type {{ dist: number, yBias: number }[]} */
  const attempts = [
    { dist: sphere.radius * 1.35, yBias: 0 },
    { dist: sphere.radius * 1.2, yBias: size.y * 0.04 },
    { dist: sphere.radius * 1.05, yBias: -size.y * 0.03 },
    { dist: sphere.radius * 0.95, yBias: size.y * 0.07 }
  ];

  for (const { dist, yBias } of attempts) {
    const sampleY = THREE.MathUtils.clamp(bandY + yBias, baseY, summitY);
    const origin = new THREE.Vector3(
      center.x + horizontal.x * dist,
      sampleY,
      center.z + horizontal.z * dist
    );
    const aim = new THREE.Vector3(center.x, sampleY, center.z);
    const rayDir = aim.clone().sub(origin);
    if (rayDir.lengthSq() < 1e-6) continue;
    rayDir.normalize();

    raycaster.set(origin, rayDir);
    const hits = raycaster.intersectObject(mountainModel, true);
    const hit = pickVisibleSurfaceHit(hits, rayDir, baseY);
    if (hit) {
      const pos = positionOnSurface(hit, horizontal);
      pos.y = Math.max(pos.y, baseY);
      return pos;
    }
  }

  // Fallback: guscio sferico vicino alla montagna, poi micro-aggiustamento verso il mesh
  const az = hotspotAzimuthRadians(hotspot.azimuth);
  const polar = THREE.MathUtils.lerp(0.22, 0.62, hotspot.elevation);
  const shellDir = new THREE.Vector3(
    Math.cos(az) * Math.cos(polar),
    Math.sin(polar),
    Math.sin(az) * Math.cos(polar)
  ).normalize();

  const shellPoint = center.clone().addScaledVector(shellDir, sphere.radius * 0.9);
  shellPoint.y = Math.max(shellPoint.y, bandY);

  const inward = horizontal.clone().negate();
  raycaster.set(
    shellPoint.clone().addScaledVector(horizontal, HOTSPOT_SURFACE_OFFSET * 2),
    inward
  );
  const shellHits = raycaster.intersectObject(mountainModel, true);
  const shellHit = pickVisibleSurfaceHit(shellHits, inward, baseY);
  if (shellHit) {
    const pos = positionOnSurface(shellHit, horizontal);
    pos.y = Math.max(pos.y, baseY);
    return pos;
  }

  return shellPoint.addScaledVector(horizontal, HOTSPOT_SURFACE_OFFSET);
}

/**
 * Evita card troppo distanti dal volume della montagna.
 *
 * @param {THREE.Vector3} pos
 * @param {THREE.Box3} worldBox
 * @param {THREE.Object3D} mountainModel
 * @param {THREE.Vector3} horizontal
 * @param {THREE.Raycaster} raycaster
 */
export function ensureCardNearMountain(pos, worldBox, mountainModel, horizontal, raycaster) {
  const sphere = worldBox.getBoundingSphere(new THREE.Sphere());
  const center = sphere.center;
  const dist = pos.distanceTo(center);
  const maxDist = sphere.radius + HOTSPOT_SURFACE_OFFSET * 2.2;

  if (dist <= maxDist) return pos;

  const origin = center.clone().addScaledVector(horizontal, sphere.radius * 1.25);
  origin.y = pos.y;
  const rayDir = center.clone().sub(origin).normalize();

  raycaster.set(origin, rayDir);
  const hits = raycaster.intersectObject(mountainModel, true);
  const hit = pickVisibleSurfaceHit(hits, rayDir, worldBox.min.y + worldBox.getSize(new THREE.Vector3()).y * 0.12);
  if (hit) return positionOnSurface(hit, horizontal);

  return center
    .clone()
    .addScaledVector(horizontal, sphere.radius * 0.92)
    .add(new THREE.Vector3(0, (pos.y - center.y) * 0.85, 0));
}

/**
 * Allontana posizioni troppo vicine sul piano orizzontale (Y invariato).
 *
 * @param {THREE.Vector3[]} positions
 * @param {number} [minDist]
 */
export function enforceHotspotSeparation(positions, minDist = MIN_HOTSPOT_SPACING) {
  for (let pass = 0; pass < 14; pass++) {
    let moved = false;
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const delta = new THREE.Vector3().subVectors(positions[i], positions[j]);
        delta.y = 0;
        const dist = delta.length();
        if (dist >= minDist || dist < 1e-4) continue;
        const push = (minDist - dist) * 0.5;
        delta.normalize();
        positions[i].addScaledVector(delta, push);
        positions[j].addScaledVector(delta, -push);
        moved = true;
      }
    }
    if (!moved) break;
  }
}

/**
 * Riaggancia un marker alla superficie del mesh (stesso XZ).
 *
 * @param {THREE.Vector3} pos
 * @param {THREE.Box3} worldBox
 * @param {THREE.Object3D} mountainModel
 * @param {THREE.Raycaster} raycaster
 * @returns {THREE.Vector3}
 */
export function snapPositionToMountainSurface(pos, worldBox, mountainModel, raycaster) {
  const size = worldBox.getSize(new THREE.Vector3());
  const center = worldBox.getCenter(new THREE.Vector3());
  const baseY = worldBox.min.y + size.y * 0.12;

  const horizontal = new THREE.Vector3(pos.x - center.x, 0, pos.z - center.z);
  if (horizontal.lengthSq() < 1e-6) {
    horizontal.set(0, 0, 1);
  } else {
    horizontal.normalize();
  }

  const castFromY = worldBox.min.y + size.y * 0.92;
  raycaster.set(new THREE.Vector3(pos.x, castFromY, pos.z), new THREE.Vector3(0, -1, 0));
  const hits = raycaster.intersectObject(mountainModel, true);

  for (const hit of hits) {
    if (hit.point.y < baseY - 0.15) continue;
    if (hit.face != null) {
      const normal = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
      if (normal.y < -0.35) continue;
    }
    return positionOnSurface(hit, horizontal);
  }

  return pos;
}

/**
 * @param {THREE.Box3} worldBox
 */
export function minCameraOrbitDistance(worldBox) {
  const sphere = worldBox.getBoundingSphere(new THREE.Sphere());
  return sphere.radius * 1.08;
}

/**
 * Limite massimo di allontanamento (dezoom) attorno al target.
 * @param {THREE.Box3} worldBox
 */
export function maxCameraOrbitDistance(worldBox) {
  const sphere = worldBox.getBoundingSphere(new THREE.Sphere());
  return sphere.radius * 1.48;
}

/**
 * Distanza camera ↔ card quando una carta è selezionata.
 * @param {THREE.Box3} worldBox
 */
export function focusCameraDistance(worldBox) {
  const sphere = worldBox.getBoundingSphere(new THREE.Sphere());
  return THREE.MathUtils.clamp(sphere.radius * 0.17, 4.0, 5.2);
}

/**
 * Raggio orbita sicuro per la camera attorno al centro montagna.
 * @param {THREE.Box3} worldBox
 */
export function safeOrbitRadius(worldBox) {
  const sphere = worldBox.getBoundingSphere(new THREE.Sphere());
  return sphere.radius * 1.28;
}

/**
 * Posizione camera per inquadrare una card frontalmente.
 *
 * @param {THREE.Vector3} cardPos
 * @param {THREE.Vector3} mountainCenter
 * @param {THREE.Box3} worldBox
 */
export function computeFocusCameraPosition(cardPos, mountainCenter, worldBox) {
  const outward = new THREE.Vector3().subVectors(cardPos, mountainCenter);
  outward.y = 0;
  if (outward.lengthSq() < 1e-6) outward.set(0, 0, 1);
  outward.normalize();

  const dist = focusCameraDistance(worldBox);

  return new THREE.Vector3(
    cardPos.x + outward.x * dist,
    cardPos.y,
    cardPos.z + outward.z * dist
  );
}

/**
 * @param {THREE.Vector3} a
 * @param {THREE.Vector3} b
 * @param {number} t
 */
export function slerpUnitVectors(a, b, t) {
  const dot = THREE.MathUtils.clamp(a.dot(b), -1, 1);
  const omega = Math.acos(dot);
  if (omega < 1e-5) {
    return a.clone();
  }
  const s0 = Math.sin((1 - t) * omega) / Math.sin(omega);
  const s1 = Math.sin(t * omega) / Math.sin(omega);
  return new THREE.Vector3().addScaledVector(a, s0).addScaledVector(b, s1);
}

/**
 * Campiona camera e target lungo un arco esterno tra due pose.
 *
 * @param {THREE.Vector3} fromCam
 * @param {THREE.Vector3} toCam
 * @param {THREE.Vector3} fromTarget
 * @param {THREE.Vector3} toTarget
 * @param {THREE.Vector3} mountainCenter
 * @param {THREE.Box3} worldBox
 * @param {number} t
 * @returns {{ cam: THREE.Vector3, target: THREE.Vector3 }}
 */
export function sampleOrbitFocusTransition(
  fromCam,
  toCam,
  fromTarget,
  toTarget,
  mountainCenter,
  worldBox,
  t,
  options = {}
) {
  const { allowCloseFocus = false } = options;

  if (allowCloseFocus) {
    return {
      cam: new THREE.Vector3().lerpVectors(fromCam, toCam, t),
      target: new THREE.Vector3().lerpVectors(fromTarget, toTarget, t)
    };
  }

  const minR = safeOrbitRadius(worldBox);
  const fromOffset = new THREE.Vector3().subVectors(fromCam, mountainCenter);
  const toOffset = new THREE.Vector3().subVectors(toCam, mountainCenter);
  const fromR = Math.max(fromOffset.length(), minR);
  const toR = Math.max(toOffset.length(), minR);

  const fromDir = fromOffset.normalize();
  const toDir = toOffset.normalize();

  const dir = slerpUnitVectors(fromDir, toDir, t);
  const radius = THREE.MathUtils.lerp(fromR, toR, t);

  const cam = mountainCenter.clone().addScaledVector(dir, radius);
  const target = new THREE.Vector3().lerpVectors(fromTarget, toTarget, t);

  return { cam, target };
}

/**
 * @param {THREE.PerspectiveCamera} cam
 * @param {THREE.Object3D} mountainModel
 * @param {THREE.Box3} worldBox
 * @param {THREE.Raycaster} raycaster
 * @param {number} [margin]
 * @param {{ meshRaycast?: boolean }} [options]
 */
export function clampCameraOutsideMountain(
  cam,
  mountainModel,
  worldBox,
  raycaster,
  margin = CAMERA_SURFACE_MARGIN,
  options = {}
) {
  const { meshRaycast = false } = options;
  const sphere = worldBox.getBoundingSphere(new THREE.Sphere());
  const minSphereDist = sphere.radius + margin;
  const fromCenter = new THREE.Vector3().subVectors(cam.position, sphere.center);
  const centerDist = fromCenter.length();

  if (centerDist < minSphereDist && centerDist > 1e-4) {
    cam.position.copy(sphere.center).addScaledVector(fromCenter.normalize(), minSphereDist);
  }

  if (!meshRaycast) return;

  const toCenter = new THREE.Vector3().subVectors(sphere.center, cam.position);
  if (toCenter.lengthSq() < 1e-6) return;
  toCenter.normalize();

  raycaster.set(cam.position, toCenter);
  const hits = raycaster.intersectObject(mountainModel, true);
  if (!hits.length) return;

  const hit = hits[0];
  if (hit.face == null) return;

  const normal = hit.face.normal.clone().transformDirection(hit.object.matrixWorld).normalize();
  const distToHit = cam.position.distanceTo(hit.point);

  if (distToHit < margin + 0.08) {
    cam.position.copy(hit.point).addScaledVector(normal, margin);
  }
}

/**
 * @param {THREE.Vector3} surfacePoint
 * @param {THREE.Vector3} desiredCamPos
 * @param {THREE.Object3D} mountainModel
 * @param {THREE.Raycaster} raycaster
 * @param {number} [margin]
 * @returns {THREE.Vector3}
 */
export function clampFocusCameraPosition(surfacePoint, desiredCamPos, mountainModel, raycaster, margin = CAMERA_SURFACE_MARGIN) {
  const out = desiredCamPos.clone();
  const toCam = new THREE.Vector3().subVectors(out, surfacePoint);
  const dist = toCam.length();
  if (dist < 1e-4) return out;

  toCam.normalize();
  raycaster.set(surfacePoint, toCam);
  const hits = raycaster.intersectObject(mountainModel, true);
  if (!hits.length) return out;

  const minDist = hits[0].distance + margin;
  if (dist < minDist) {
    out.copy(surfacePoint).addScaledVector(toCam, minDist);
  }
  return out;
}
