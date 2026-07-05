import * as THREE from 'three';

export const MARKER_SPHERE_RADIUS = 0.925;
const PARTICLE_COUNT = 5000;
/** Raggio mondo di ogni particella (allineato a Scene3D, scalato sul marker). */
const PARTICLE_RADIUS = 0.038;
const DIR_SCALE = 1.15;

/** @type {THREE.BufferGeometry | null} */
let sharedParticleGeo = null;

/**
 * @param {{ active?: boolean }} [opts]
 * @returns {THREE.ShaderMaterial}
 */
function createParticleMaterial({ active = false } = {}) {
  const baseOpacity = active ? 0.95 : 0.88;

  return new THREE.ShaderMaterial({
    uniforms: {
      uPulse: { value: 0 },
      uBaseOpacity: { value: baseOpacity },
    },
    vertexShader: /* glsl */`
      attribute vec3 aDirection;
      uniform float uPulse;

      void main() {
        vec3 local = position + aDirection * uPulse;
        gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(local, 1.0);
      }
    `,
    fragmentShader: /* glsl */`
      uniform float uPulse;
      uniform float uBaseOpacity;

      void main() {
        gl_FragColor = vec4(0.0, 0.0, 0.0, uBaseOpacity + uPulse * 0.45);
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: true,
  });
}

function buildSharedParticleGeo() {
  const directions = new Float32Array(PARTICLE_COUNT * 3);
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    directions[i * 3] = (Math.random() - 0.5) * DIR_SCALE;
    directions[i * 3 + 1] = (Math.random() - 0.5) * DIR_SCALE;
    directions[i * 3 + 2] = (Math.random() - 0.5) * DIR_SCALE;
  }

  const geo = new THREE.SphereGeometry(PARTICLE_RADIUS, 5, 5);
  geo.setAttribute('aDirection', new THREE.InstancedBufferAttribute(directions, 3));
  return geo;
}

function ensureSharedParticleGeo() {
  if (!sharedParticleGeo) {
    sharedParticleGeo = buildSharedParticleGeo();
  }
  return sharedParticleGeo;
}

/** @param {THREE.InstancedMesh} mesh @param {Float32Array} positions */
function writeInstanceMatrices(mesh, positions) {
  const matrix = new THREE.Matrix4();
  const buf = mesh.instanceMatrix.array;

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    matrix.identity();
    matrix.setPosition(
      positions[i * 3],
      positions[i * 3 + 1],
      positions[i * 3 + 2],
    );
    matrix.toArray(buf, i * 16);
  }

  mesh.instanceMatrix.needsUpdate = true;
}

/** @returns {Float32Array} */
function sampleSphereSurface() {
  const positions = new Float32Array(PARTICLE_COUNT * 3);

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const u = Math.random();
    const v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    const sinPhi = Math.sin(phi);

    positions[i * 3] = MARKER_SPHERE_RADIUS * sinPhi * Math.cos(theta);
    positions[i * 3 + 1] = MARKER_SPHERE_RADIUS * sinPhi * Math.sin(theta);
    positions[i * 3 + 2] = MARKER_SPHERE_RADIUS * Math.cos(phi);
  }

  return positions;
}

/**
 * @param {boolean} [active]
 * @returns {THREE.Group}
 */
export function createParticleSphereMarker(active = false) {
  const root = new THREE.Group();
  const spinGroup = new THREE.Group();
  const positions = sampleSphereSurface();
  const geo = ensureSharedParticleGeo().clone();
  const mat = createParticleMaterial({ active });

  const particles = new THREE.InstancedMesh(geo, mat, PARTICLE_COUNT);
  particles.frustumCulled = false;
  particles.renderOrder = 2;
  particles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  writeInstanceMatrices(particles, positions);

  const hitSphere = new THREE.Mesh(
    new THREE.SphereGeometry(MARKER_SPHERE_RADIUS * 1.1, 16, 16),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  hitSphere.position.y = MARKER_SPHERE_RADIUS;

  spinGroup.position.y = MARKER_SPHERE_RADIUS;
  spinGroup.add(particles);
  spinGroup.add(hitSphere);
  root.add(spinGroup);

  root.userData.particleMesh = particles;
  root.userData.particleMat = mat;
  root.userData.spinGroup = spinGroup;
  root.userData.hitSphere = hitSphere;

  return root;
}

/** @param {THREE.Object3D} object @param {boolean} active */
export function applyMarkerMaterial(object, active = false) {
  const mat = object.userData?.particleMat;
  if (!mat) return;
  mat.uniforms.uBaseOpacity.value = active ? 0.95 : 0.88;
}

/** @param {THREE.Object3D} object */
export function updateMarkerPulse(object, pulse) {
  const mat = object.userData?.particleMat;
  if (!mat) return;
  mat.uniforms.uPulse.value = pulse;
}

/** @param {THREE.Object3D} object */
export function disposeMarkerGeometries(object) {
  const particles = object.userData?.particleMesh;
  const hitSphere = object.userData?.hitSphere;
  const mat = object.userData?.particleMat;

  particles?.geometry?.dispose();
  hitSphere?.geometry?.dispose();
  mat?.dispose();
}

export function preloadAboutMarkerModels() {
  ensureSharedParticleGeo();
  return Promise.resolve();
}

/** @param {boolean} [active] */
export async function cloneMarkerModel(_url, active = false) {
  return createParticleSphereMarker(active);
}

/** @param {THREE.Object3D} markerRoot @param {THREE.Vector3} worldPoint */
export function orientMarkerTowardWorldPoint(markerRoot, _modelSrc, worldPoint) {
  const pos = markerRoot.position;
  const dx = worldPoint.x - pos.x;
  const dz = worldPoint.z - pos.z;
  if (dx * dx + dz * dz < 1e-8) return;
  markerRoot.rotation.y = Math.atan2(dx, dz);
}
