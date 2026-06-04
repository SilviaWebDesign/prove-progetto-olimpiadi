import * as THREE from 'three';

/** @param {THREE.Object3D} object @param {number} desiredSize */
export function fitModelToCenter(object, desiredSize) {
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const scaleFactor = desiredSize / Math.max(size.x, size.y, size.z);
  object.scale.setScalar(scaleFactor);
  object.position.set(-center.x * scaleFactor, -center.y * scaleFactor, -center.z * scaleFactor);
  object.updateMatrixWorld(true);
  const fittedBox = new THREE.Box3().setFromObject(object);
  const fittedCenter = fittedBox.getCenter(new THREE.Vector3());
  object.position.sub(fittedCenter);
}

const _box = new THREE.Box3();
const _cardCam = new THREE.Vector3();
const _treeCam = new THREE.Vector3();

/**
 * True se la card è più lontana della camera rispetto al centro albero (camera space).
 * @param {THREE.Camera} camera
 * @param {THREE.Vector3} cardPos
 * @param {THREE.Vector3} treeCenter
 */
export function isCardBehindTreeByDepth(camera, cardPos, treeCenter) {
  _cardCam.copy(cardPos).applyMatrix4(camera.matrixWorldInverse);
  _treeCam.copy(treeCenter).applyMatrix4(camera.matrixWorldInverse);
  return _cardCam.z < _treeCam.z - 0.04;
}

/** Mezza larghezza card in unità scena (424px × scale). */
export const ORBIT_CARD_HALF_WIDTH = 424 * 0.00335 * 0.5;

/** Margine tra card e silhouette albero sull'orbita. */
export const ORBIT_SURFACE_MARGIN = 0.2;

/**
 * Raggio orbita: aderisce al bbox orizzontale dell'albero.
 * @param {THREE.Object3D} treeRoot
 * @param {THREE.Vector3} [outCenter]
 */
export function getOrbitRadiusFromTree(treeRoot, outCenter) {
  const box = new THREE.Box3().setFromObject(treeRoot);
  if (outCenter) box.getCenter(outCenter);
  const size = box.getSize(new THREE.Vector3());
  const hullRadius = Math.max(size.x, size.z) * 0.52;
  return hullRadius + ORBIT_CARD_HALF_WIDTH + ORBIT_SURFACE_MARGIN;
}

/** @param {THREE.Object3D} object */
export function applyTreeMaterial(object) {
  const METALLIC_GRAY = new THREE.Color(0x8a8d94);
  object.traverse((child) => {
    if (!child.isMesh) return;
    const mesh = /** @type {THREE.Mesh} */ (child);
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const metallic = materials.map(
      () =>
        new THREE.MeshStandardMaterial({
          color: METALLIC_GRAY,
          metalness: 0.92,
          roughness: 0.28,
          depthWrite: true,
          depthTest: true
        })
    );
    mesh.material = metallic.length === 1 ? metallic[0] : metallic;
  });
}
