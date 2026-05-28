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
const _cardNdc = new THREE.Vector3();
const _treeNdc = new THREE.Vector3();
const _camRight = new THREE.Vector3();
const _treeEdgeWorld = new THREE.Vector3();
const _cardEdgeWorld = new THREE.Vector3();

/**
 * Classificazione conservativa "dietro albero":
 * - overlap 2D (NDC) tra card e silhouette albero
 * - profondità card più lontana del centro albero con margine
 * In caso dubbio ritorna false (prefer visible).
 * @param {THREE.Camera} camera
 * @param {THREE.Vector3} cardPos
 * @param {THREE.Vector3} treeCenter
 * @param {{
 *   treeRadiusWorld?: number,
 *   cardHalfWidthWorld?: number,
 *   overlapMin?: number,
 *   depthMargin?: number
 * }} [opts]
 */
export function isCardBehindTreeByDepth(camera, cardPos, treeCenter, opts = {}) {
  const treeRadiusWorld = opts.treeRadiusWorld ?? 1;
  const cardHalfWidthWorld = opts.cardHalfWidthWorld ?? ORBIT_CARD_HALF_WIDTH;
  const overlapMin = opts.overlapMin ?? 0.5;
  const depthMargin = opts.depthMargin ?? 0.14;

  _cardCam.copy(cardPos).applyMatrix4(camera.matrixWorldInverse);
  _treeCam.copy(treeCenter).applyMatrix4(camera.matrixWorldInverse);
  const depthBehind = _cardCam.z < _treeCam.z - depthMargin;
  if (!depthBehind) return false;

  _cardNdc.copy(cardPos).project(camera);
  _treeNdc.copy(treeCenter).project(camera);
  if (Math.abs(_cardNdc.z) > 1.2 || Math.abs(_treeNdc.z) > 1.2) return false;

  _camRight.setFromMatrixColumn(camera.matrixWorld, 0).normalize();
  _treeEdgeWorld.copy(treeCenter).addScaledVector(_camRight, treeRadiusWorld);
  _cardEdgeWorld.copy(cardPos).addScaledVector(_camRight, cardHalfWidthWorld);

  const treeRadiusNdc = Math.abs(_treeEdgeWorld.project(camera).x - _treeNdc.x);
  const cardRadiusNdc = Math.abs(_cardEdgeWorld.project(camera).x - _cardNdc.x);
  const overlapRange = treeRadiusNdc + cardRadiusNdc;
  if (overlapRange <= 0) return false;

  const dx = Math.abs(_cardNdc.x - _treeNdc.x);
  const dy = Math.abs(_cardNdc.y - _treeNdc.y);
  const overlapsX = dx <= overlapRange * 0.58;
  const overlapsY = dy <= Math.max(treeRadiusNdc * 0.9, cardRadiusNdc * 0.7);
  if (!overlapsX || !overlapsY) return false;

  const proximity = Math.hypot(dx, dy) / overlapRange;
  const overlapsTreeSilhouette = proximity <= overlapMin;

  return overlapsTreeSilhouette;
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
