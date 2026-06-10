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

/**
 * Attende che il container abbia dimensioni > 0 (layout post-navigazione).
 * @param {HTMLElement | undefined} el
 * @param {number} [maxFrames=40]
 */
export function waitForContainerSize(el, maxFrames = 40) {
  return new Promise((resolve) => {
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
