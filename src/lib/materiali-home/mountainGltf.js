import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export const MOUNTAIN_GLB_URL = '/oggetti/snow_mountain.glb';
/** Rotazione sul piano orizzontale (asse Y), in radianti — leggermente a destra rispetto a 90° */
export const MOUNTAIN_ROTATION_Y = Math.PI / 2 + 0.12;

/** @type {Promise<import('three/examples/jsm/loaders/GLTFLoader.js').GLTF> | null} */
let loadPromise = null;

/**
 * Precarica il GLB (cache Three + promise condivisa tra mount/navigazioni).
 * @returns {Promise<import('three/examples/jsm/loaders/GLTFLoader.js').GLTF>}
 */
export function preloadMountainGltf() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('preloadMountainGltf: solo nel browser'));
  }

  THREE.Cache.enabled = true;

  if (!loadPromise) {
    loadPromise = new Promise((resolve, reject) => {
      const loader = new GLTFLoader();
      loader.load(MOUNTAIN_GLB_URL, resolve, undefined, (err) => {
        loadPromise = null;
        reject(err);
      });
    });
  }

  return loadPromise;
}

/** @param {THREE.Object3D} model */
export function fitMountainModel(model) {
  model.rotation.set(0, MOUNTAIN_ROTATION_Y, 0);
  model.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const desiredSize = 45.0;
  const scaleFactor = desiredSize / Math.max(size.x, size.y, size.z);

  model.scale.set(scaleFactor, scaleFactor, scaleFactor);
  model.position.x = -center.x * scaleFactor - 2.5;
  model.position.y = -center.y * scaleFactor - 1.5;
  model.position.z = -center.z * scaleFactor - 10.5;

  model.updateMatrixWorld(true);

  const worldBox = new THREE.Box3().setFromObject(model);
  const worldSize = worldBox.getSize(new THREE.Vector3());
  const mountainCenter = worldBox.getCenter(new THREE.Vector3());

  /** Centro orizzontale della montagna, quota neve */
  const snowField = mountainCenter.clone();
  snowField.y = worldBox.min.y + worldSize.y * 0.16;
  /** Raggio minimo per orbita completa senza entrare nel mesh */
  const orbitRadius = Math.max(worldSize.x, worldSize.z) * 0.58 + 7;
  const topDownHeight = Math.max(worldSize.x, worldSize.z) * 0.52 + 8;

  return { mountainCenter, snowField, orbitRadius, topDownHeight };
}

/** Offset Y camera hero (home e about). */
export const HOME_CAM_Y_LOW = -2.9;
/** Z iniziale camera hero. */
export const HOME_CAMERA_Z_START = 7.8;
/** Zoom prospettiva hero home (scroll 0). */
export const HOME_HERO_ZOOM = 1.2;
/** Offset verticale del punto di inquadratura rispetto al centro montagna. */
export const HOME_LOOK_AT_Y_OFFSET = 2.2;

/**
 * Configurazione orbita hero condivisa con la home (scroll 0).
 *
 * @param {THREE.Vector3} mountainCenter
 * @param {THREE.Vector3} snowField
 * @param {number} orbitRadius
 * @param {number} topDownHeight
 */
export function buildHomeOrbitConfig(mountainCenter, snowField, orbitRadius, topDownHeight) {
  const c = mountainCenter;
  const startCam = new THREE.Vector3(0, HOME_CAM_Y_LOW, HOME_CAMERA_Z_START);
  const dx = startCam.x - c.x;
  const dz = startCam.z - c.z;
  const startAngle = Math.atan2(dx, dz);
  const heroRadius = Math.hypot(dx, dz);

  return {
    center: c.clone(),
    snowField: snowField.clone(),
    startAngle,
    orbitY: c.y + HOME_CAM_Y_LOW + 1.1,
    radius: Math.max(orbitRadius, heroRadius, 12) * 0.82,
    topDownHeight
  };
}

/**
 * Applica la pose camera della home (inizio scroll).
 *
 * @param {THREE.PerspectiveCamera} camera
 * @param {ReturnType<typeof buildHomeOrbitConfig>} orbitConfig
 * @param {THREE.Vector3} [targetOut]
 * @returns {THREE.Vector3}
 */
export function applyHomeHeroCamera(camera, orbitConfig, targetOut) {
  const angle = orbitConfig.startAngle;
  camera.position.set(
    orbitConfig.center.x + Math.sin(angle) * orbitConfig.radius,
    orbitConfig.orbitY,
    orbitConfig.center.z + Math.cos(angle) * orbitConfig.radius
  );

  const lookAt = (targetOut ?? new THREE.Vector3())
    .copy(orbitConfig.center)
    .add(new THREE.Vector3(0, HOME_LOOK_AT_Y_OFFSET, 0));

  camera.zoom = HOME_HERO_ZOOM;
  camera.updateProjectionMatrix();
  camera.up.set(0, 1, 0);
  camera.lookAt(lookAt);

  return lookAt;
}

/**
 * Limiti zoom orbita attorno alla vista hero.
 * @param {ReturnType<typeof buildHomeOrbitConfig>} orbitConfig
 */
export function homeOrbitDistanceLimits(orbitConfig) {
  return {
    min: orbitConfig.radius * 0.68,
    max: orbitConfig.radius * 1.14
  };
}

/**
 * Materiali montagna come in home (fog + trasparenza per whiteout).
 * @param {THREE.Object3D} object
 */
export function setupMountainRenderMaterials(object) {
  object.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    const mesh = o;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const cloned = materials.map((mat) => {
      const material = mat.clone();
      material.transparent = true;
      /** @type {any} */ (material).fog = true;
      material.side = THREE.FrontSide;
      return material;
    });
    mesh.material = cloned.length === 1 ? cloned[0] : cloned;
  });
}

/**
 * Attende che il container abbia dimensioni > 0 (layout post-navigazione).
 * @param {HTMLElement | undefined} el
 * @param {number} [maxFrames=40]
 * @returns {Promise<void>}
 */
export function waitForContainerSize(el, maxFrames = 40) {
  return new Promise(/** @param {() => void} resolve */ (resolve) => {
    let frames = 0;
    const check = () => {
      if (el && el.clientWidth > 0 && el.clientHeight > 0) {
        resolve();
        return;
      }
      if (frames++ >= maxFrames) {
        resolve();
        return;
      }
      requestAnimationFrame(check);
    };
    check();
  });
}
