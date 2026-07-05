import * as THREE from 'three';

const DEFAULT_MARKER_SIZE = 1.15;
const MARKER_RADIUS = DEFAULT_MARKER_SIZE / 2;
const PARTICLE_COUNT = 4500;

/** Stessi riferimenti visivi di Scene3D / infrastrutture. */
const INFRA_BS = 0.6405;
const PARTICLE_RADIUS = (0.012 * INFRA_BS) / DEFAULT_MARKER_SIZE;
const PULSE_DIR_SCALE = (8 * INFRA_BS) / DEFAULT_MARKER_SIZE;
const IDLE_PULSE_SPEED = 0.65;
const BASE_OPACITY = 0.85;
const ACTIVE_OPACITY = 0.95;

/**
 * @param {number} count
 * @param {number} radius
 * @returns {Float32Array}
 */
function sampleSphereSurface(count, radius) {
  const positions = new Float32Array(count * 3);
  const golden = Math.PI * (3 - Math.sqrt(5));

  for (let i = 0; i < count; i++) {
    const t = i / Math.max(count - 1, 1);
    const inclination = Math.acos(1 - 2 * t);
    const azimuth = golden * i;
    const sinInc = Math.sin(inclination);

    positions[i * 3] = radius * sinInc * Math.cos(azimuth);
    positions[i * 3 + 1] = radius * Math.cos(inclination);
    positions[i * 3 + 2] = radius * sinInc * Math.sin(azimuth);
  }

  return positions;
}

/**
 * @param {boolean} active
 * @returns {THREE.InstancedMesh}
 */
function buildParticleSphereMesh(active = false) {
  const targets = sampleSphereSurface(PARTICLE_COUNT, MARKER_RADIUS * 0.96);
  const directions = new Float32Array(PARTICLE_COUNT * 3);

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    directions[i * 3] = (Math.random() - 0.5) * PULSE_DIR_SCALE;
    directions[i * 3 + 1] = (Math.random() - 0.5) * PULSE_DIR_SCALE;
    directions[i * 3 + 2] = (Math.random() - 0.5) * PULSE_DIR_SCALE;
  }

  const geo = new THREE.SphereGeometry(PARTICLE_RADIUS, 4, 4);
  geo.setAttribute('aDirection', new THREE.InstancedBufferAttribute(directions, 3));

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uPulse: { value: 0.0 },
      uBaseOpacity: { value: active ? ACTIVE_OPACITY : BASE_OPACITY }
    },
    vertexShader: /* glsl */ `
      attribute vec3 aDirection;
      uniform float uPulse;
      void main() {
        vec3 p = position + aDirection * uPulse;
        gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uPulse;
      uniform float uBaseOpacity;
      void main() {
        gl_FragColor = vec4(0.0, 0.0, 0.0, uBaseOpacity + uPulse * 0.5);
      }
    `,
    transparent: true,
    depthWrite: false
  });

  const mesh = new THREE.InstancedMesh(geo, material, PARTICLE_COUNT);
  mesh.frustumCulled = false;
  mesh.userData.isMarkerParticles = true;

  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    position.set(targets[i * 3], targets[i * 3 + 1], targets[i * 3 + 2]);
    matrix.makeTranslation(position.x, position.y, position.z);
    mesh.setMatrixAt(i, matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;

  return mesh;
}

/** @param {THREE.Object3D} markerRoot @param {string} [_modelSrc] @param {THREE.Vector3} worldPoint */
export function orientMarkerTowardWorldPoint(markerRoot, _modelSrc, worldPoint) {
  const pos = markerRoot.position;
  const dx = worldPoint.x - pos.x;
  const dz = worldPoint.z - pos.z;
  if (dx * dx + dz * dz < 1e-8) return;
  markerRoot.rotation.y = Math.atan2(dx, dz);
}

/** @param {THREE.Object3D} object @param {boolean} active */
export function applyMarkerMaterial(object, active = false) {
  object.traverse((child) => {
    if (!(child instanceof THREE.InstancedMesh) || !child.userData.isMarkerParticles) return;
    const mat = child.material;
    if (!(mat instanceof THREE.ShaderMaterial)) return;
    mat.uniforms.uBaseOpacity.value = active ? ACTIVE_OPACITY : BASE_OPACITY;
  });
}

/** @param {THREE.Object3D} object @param {number} elapsedSeconds @param {boolean} [active] */
export function updateMarkerParticlePulse(object, elapsedSeconds, active = false) {
  const pulseAmp = active ? 0.06 : 0.04;
  const pulse = Math.abs(Math.sin(elapsedSeconds * Math.PI * IDLE_PULSE_SPEED)) * pulseAmp;

  object.traverse((child) => {
    if (!(child instanceof THREE.InstancedMesh) || !child.userData.isMarkerParticles) return;
    const mat = child.material;
    if (!(mat instanceof THREE.ShaderMaterial)) return;
    mat.uniforms.uPulse.value = pulse;
  });
}

export function preloadAboutMarkerModels() {
  return Promise.resolve();
}

/** @param {string} [_url] @param {boolean} [active] */
export function createMarkerParticleSphere(_url, active = false) {
  const group = new THREE.Group();

  const particles = buildParticleSphereMesh(active);
  particles.position.y = MARKER_RADIUS;
  group.add(particles);

  const hit = new THREE.Mesh(
    new THREE.SphereGeometry(MARKER_RADIUS * 0.9, 14, 14),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  hit.position.y = MARKER_RADIUS;
  group.add(hit);

  return group;
}

/** Compatibilità con il vecchio nome. */
export const cloneMarkerModel = createMarkerParticleSphere;

/** @param {THREE.Object3D} object */
export function disposeMarkerGeometries(object) {
  object.traverse((child) => {
    if (child instanceof THREE.InstancedMesh) {
      child.geometry?.dispose();
      child.material?.dispose();
      return;
    }
    if (!(child instanceof THREE.Mesh)) return;
    child.geometry?.dispose();
    const mats = Array.isArray(child.material) ? child.material : [child.material];
    mats.forEach((m) => m.dispose());
  });
}
