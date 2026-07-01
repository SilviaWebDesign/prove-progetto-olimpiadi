import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ABOUT_HOTSPOT_PATH } from './aboutHotspots.js';

const DEFAULT_MARKER_SIZE = 1.85;

/** Solo orientamento locale; la scala è uguale per tutti i modelli. */
/** @type {Record<string, { rotationY?: number }>} */
export const ABOUT_MARKER_MODEL_CONFIG = {
  '/oggetti/scii.glb': { rotationY: Math.PI / 4 },
  '/oggetti/bobsled.glb': { rotationY: -Math.PI / 2 }
};

export const MARKER_MATERIAL = new THREE.MeshStandardMaterial({
  color: 0x8a8d94,
  metalness: 0.92,
  roughness: 0.28,
  fog: true
});

export const MARKER_MATERIAL_ACTIVE = new THREE.MeshStandardMaterial({
  color: 0x6d7078,
  metalness: 0.92,
  roughness: 0.28,
  fog: true
});

/** @type {Map<string, Promise<THREE.Object3D>>} */
const loadCache = new Map();

/** @param {string} url */
function getMarkerConfig(url) {
  return {
    size: DEFAULT_MARKER_SIZE,
    rotationY: 0,
    yOffset: 0,
    ...ABOUT_MARKER_MODEL_CONFIG[url]
  };
}

/** @param {THREE.Object3D} object @param {string} url */
function fitMarkerModel(object, url) {
  const cfg = getMarkerConfig(url);
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const scaleFactor = cfg.size / Math.max(size.x, size.y, size.z);

  object.scale.setScalar(scaleFactor);
  object.position.set(
    -center.x * scaleFactor,
    -center.y * scaleFactor + cfg.yOffset,
    -center.z * scaleFactor
  );
  if (cfg.rotationY) object.rotation.y = cfg.rotationY;
  object.updateMatrixWorld(true);

  const fittedBox = new THREE.Box3().setFromObject(object);
  const fittedCenter = fittedBox.getCenter(new THREE.Vector3());
  object.position.x -= fittedCenter.x;
  object.position.z -= fittedCenter.z;
  // Appoggia la base del modello su y=0 (non il centro del bounding box)
  object.position.y -= fittedBox.min.y;
  object.position.y += cfg.yOffset;
}

/** @param {THREE.Object3D} object @param {boolean} active */
export function applyMarkerMaterial(object, active = false) {
  const material = active ? MARKER_MATERIAL_ACTIVE : MARKER_MATERIAL;
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    if (child.geometry?.attributes?.color) {
      child.geometry.deleteAttribute('color');
    }
    child.material = material;
  });
}

/** @param {string} url */
function loadMarkerTemplate(url) {
  if (!loadCache.has(url)) {
    loadCache.set(
      url,
      new Promise((resolve, reject) => {
        const loader = new GLTFLoader();
        loader.load(
          url,
          (gltf) => {
            const model = gltf.scene;
            fitMarkerModel(model, url);
            applyMarkerMaterial(model, false);
            resolve(model);
          },
          undefined,
          reject
        );
      })
    );
  }
  return loadCache.get(url);
}

export function preloadAboutMarkerModels() {
  const urls = [...new Set(ABOUT_HOTSPOT_PATH.map((hotspot) => hotspot.modelSrc))];
  return Promise.all(urls.map((url) => loadMarkerTemplate(url)));
}

/** @param {string} url @param {boolean} [active] */
export async function cloneMarkerModel(url, active = false) {
  const template = await loadMarkerTemplate(url);
  const model = template.clone(true);
  applyMarkerMaterial(model, active);
  return model;
}

/** @param {THREE.Object3D} object */
export function disposeMarkerGeometries(object) {
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.geometry?.dispose();
  });
}
