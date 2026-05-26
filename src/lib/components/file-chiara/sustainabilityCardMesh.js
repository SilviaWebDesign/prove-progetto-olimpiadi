import * as THREE from 'three';
//import html2canvas from 'html2canvas';

export const CARD_PX_WIDTH = 424;
export const CARD_PX_HEIGHT = 559;
export const CARD_PX_HEIGHT_EXPANDED = 680;

/**
 * @param {number} scale
 * @param {boolean} [expanded]
 */
export function getCardWorldSize(scale, expanded = false) {
  const h = expanded ? CARD_PX_HEIGHT_EXPANDED : CARD_PX_HEIGHT;
  return { w: CARD_PX_WIDTH * scale, h: h * scale };
}

/**
 * @param {HTMLElement} element
 * @param {boolean} [expanded]
 */
/**
 * @param {HTMLElement} element — nodo montato off-screen con FactCard
 * @param {boolean} [expanded]
 */
export async function captureCardTexture(element, expanded = false) {
  const height = expanded ? CARD_PX_HEIGHT_EXPANDED : CARD_PX_HEIGHT;
  const canvas = await html2canvas(element, {
    backgroundColor: null,
    scale: Math.min(window.devicePixelRatio, 2),
    width: CARD_PX_WIDTH,
    height,
    logging: false,
    useCORS: true
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * @param {THREE.Texture} texture
 * @param {number} scale
 * @param {boolean} [expanded]
 */
export function createCardMesh(texture, scale, expanded = false) {
  const { w, h } = getCardWorldSize(scale, expanded);
  const geometry = new THREE.PlaneGeometry(w, h);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthTest: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    alphaTest: 0.02
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.renderOrder = 2;
  return mesh;
}

/**
 * La geometria è già in unità mondo (424×scale): copiamo solo posizione e rotazione.
 * @param {THREE.Mesh} mesh
 * @param {import('three/examples/jsm/renderers/CSS3DRenderer.js').CSS3DObject} css3dObj
 */
export function syncMeshWithCss3d(mesh, css3dObj) {
  css3dObj.updateMatrixWorld(true);
  mesh.position.setFromMatrixPosition(css3dObj.matrixWorld);
  mesh.quaternion.setFromRotationMatrix(css3dObj.matrixWorld);
  mesh.scale.set(1, 1, 1);
}

/**
 * @param {THREE.Mesh} mesh
 * @param {THREE.Texture} texture
 * @param {number} scale
 * @param {boolean} [expanded]
 */
export function applyCardMeshTexture(mesh, texture, scale, expanded = false) {
  const mat = /** @type {THREE.MeshBasicMaterial} */ (mesh.material);
  if (mat.map && mat.map !== texture) {
    mat.map.dispose();
  }
  mat.map = texture;
  mat.needsUpdate = true;

  const { w, h } = getCardWorldSize(scale, expanded);
  mesh.geometry.dispose();
  mesh.geometry = new THREE.PlaneGeometry(w, h);
}
