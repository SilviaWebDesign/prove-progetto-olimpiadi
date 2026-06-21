<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import * as THREE from 'three';
  import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
  import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
  import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
  import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js';
  import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
  import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

  export interface Scene3DApi {
    setRotationY:        (rad: number) => void;
    setScale:            (factor: number) => void;
    setOpacity:          (val: number) => void;
    settle:              () => void;
    unsettle:            () => void;
    pulse:               () => void;
    resetPulse:          () => void;
    preloadResultModels: () => void;
    morphToResult:       (path: string, onDone: () => void) => void;
    returnToParticles:   () => void;
  }

  interface Props {
    api?: Scene3DApi;
    modelSrc: string;
    resultPaths?: string[];
    onModelLoaded?: () => void;
    orbitEnabled?: boolean;
  }
  let {
    api = $bindable(),
    modelSrc,
    resultPaths = [],
    onModelLoaded,
    orbitEnabled = false,
  }: Props = $props();

  let wrapperEl = $state<HTMLDivElement | null>(null);
  let canvasEl  = $state<HTMLCanvasElement | null>(null);

  let renderer:   THREE.WebGLRenderer | null = null;
  let scene:      THREE.Scene | null = null;
  let camera:     THREE.PerspectiveCamera | null = null;
  let modelGroup: THREE.Group | null = null;
  let materials:  THREE.MeshPhysicalMaterial[] = [];
  let baseScale = 1;

  let rafId:    number | null = null;
  let spinner:  THREE.Group | null = null;
  let controls: OrbitControls | null = null;

  const clock      = new THREE.Clock();
  const IDLE_RAD_S = THREE.MathUtils.degToRad(7);

  // ── Particle system ────────────────────────────────────────────────────────
  const COUNT = 20000;

  let particleMesh: THREE.InstancedMesh | null = null;
  let particleMat:  THREE.ShaderMaterial | null = null;
  let iMatBuf: Float32Array | null = null;

  const particleTargets = new Float32Array(COUNT * 3);
  const particleCurrent = new Float32Array(COUNT * 3);

  type TState = 'none' | 'in' | 'done';
  let transitionState: TState = 'none';
  let transitionProgress = 0;
  const TRANSITION_DURATION = 2.0;

  let manualPulseActive  = false;
  let manualPulseElapsed = 0;
  const MANUAL_PULSE_DURATION = 1.5;

  // ── Result model preload + morph ───────────────────────────────────────────
  const resultModels = new Map<string, THREE.Group>();

  const resultTargets = new Float32Array(COUNT * 3);
  type MorphState = 'none' | 'morphing';
  let morphState: MorphState = 'none';
  let morphElapsed = 0;
  const MORPH_DURATION = 1.5;
  let morphDoneCallback: (() => void) | null = null;
  let resultModelMaterials: THREE.MeshPhysicalMaterial[] = [];

  // ── Mount ──────────────────────────────────────────────────────────────────
  onMount(() => {
    if (!canvasEl || !wrapperEl) return;

    api = {
      setRotationY: (rad) => { if (modelGroup) modelGroup.rotation.y = rad; },
      setScale:     (f)   => { if (modelGroup) modelGroup.scale.setScalar(baseScale * f); },
      setOpacity:   (val) => { materials.forEach((m) => { m.opacity = val; }); },
      settle:       startTransition,
      unsettle:     () => {
        if (transitionState !== 'none') return;
        materials.forEach(m => { m.opacity = 1; });
      },
      pulse:       triggerManualPulse,
      resetPulse:  () => {
        manualPulseActive  = false;
        manualPulseElapsed = 0;
        if (particleMat) particleMat.uniforms.uPulse.value = 0;
      },
      preloadResultModels,
      morphToResult,
      returnToParticles: () => {
        if (controls) controls.enabled = false;
        if (particleMesh) particleMesh.visible = true;
        if (particleMat) {
          particleMat.uniforms.uBaseOpacity.value = 0.85;
          particleMat.uniforms.uPulse.value = 0;
        }
        resultModelMaterials.forEach(m => { m.opacity = 0; m.visible = false; });
      },
    };

    initThree();

    if (renderer && camera) {
      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping   = true;
      controls.dampingFactor   = 0.05;
      controls.enableZoom      = false;
      controls.minDistance     = 1.5;
      controls.maxDistance     = 8;
      controls.enablePan       = false;
      controls.autoRotate      = true;
      controls.autoRotateSpeed = 1.5;
      controls.enabled         = false;
      controls.target.set(0, 0.3, 0);
    }

    startLoop();

    if ('requestIdleCallback' in window) {
      (window as Window & typeof globalThis & { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => void })
        .requestIdleCallback(loadModel, { timeout: 300 });
    } else {
      setTimeout(loadModel, 100);
    }

    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); };
  });

  $effect(() => {
    if (controls) controls.enabled = orbitEnabled;
  });

  onDestroy(() => {
    stopLoop();
    scene?.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.geometry?.dispose();
      const mats = Array.isArray(mesh.material)
        ? (mesh.material as THREE.Material[])
        : [mesh.material as THREE.Material];
      mats.forEach((m) => m.dispose());
    });
    controls?.dispose();
    renderer?.dispose();
    scene = null; renderer = null; camera = null;
    modelGroup = null; spinner = null; controls = null;
    materials = []; particleMesh = null; particleMat = null; iMatBuf = null;
  });

  function initThree() {
    if (!canvasEl || !wrapperEl) return;

    renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace    = THREE.SRGBColorSpace;
    renderer.toneMapping         = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    scene = new THREE.Scene();

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    const w = window.innerWidth;
    const h = window.innerHeight;
    camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    camera.position.set(0, 0, 6);
    camera.lookAt(0, 0.3, 0);
    renderer.setSize(w, h);

    const key = new THREE.DirectionalLight(0xffffff, 3.5);
    key.position.set(5, 10, 7);
    scene.add(key);

    const fill = new THREE.DirectionalLight(0xffffff, 1.5);
    fill.position.set(-5, 2, -5);
    scene.add(fill);
  }

  function loadModel() {
    const draco = new DRACOLoader();
    draco.setDecoderPath('/draco/');
    const loader = new GLTFLoader();
    loader.setDRACOLoader(draco);

    loader.load(
      modelSrc,
      (gltf) => {
        if (!scene || !camera) return;

        const box    = new THREE.Box3().setFromObject(gltf.scene);
        const center = box.getCenter(new THREE.Vector3());
        const size   = box.getSize(new THREE.Vector3());
        gltf.scene.position.sub(center);

        const fov      = camera.fov * (Math.PI / 180);
        const dist     = camera.position.z;
        const visibleH = 2 * Math.tan(fov / 2) * dist;
        const maxDim   = Math.max(size.x, size.y, size.z);
        baseScale      = (visibleH * 0.9) / maxDim;

        const group = new THREE.Group();
        group.add(gltf.scene);
        group.scale.setScalar(baseScale);

        materials = [];
        group.traverse((node) => {
          const mesh = node as THREE.Mesh;
          if (!mesh.isMesh) return;
          mesh.geometry.computeVertexNormals();
          const chrome = new THREE.MeshPhysicalMaterial({
            color:              0x181818,
            metalness:          1.0,
            roughness:          0.015,
            envMapIntensity:    5.0,
            clearcoat:          1.0,
            clearcoatRoughness: 0.01,
            transparent:        true,
            opacity:            0,
          });
          mesh.material = chrome;
          materials.push(chrome);
        });

        modelGroup = group;
        spinner = new THREE.Group();
        spinner.add(group);
        scene.add(spinner);
        draco.dispose();

        buildParticles(group);
        onModelLoaded?.();
      },
      undefined,
      (err) => { console.error('[Scene3D] load error:', err); onModelLoaded?.(); }
    );
  }

  function buildParticles(root: THREE.Group) {
    if (!scene || !spinner) return;

    scene.updateMatrixWorld();
    const rootWorldInv = new THREE.Matrix4().copy(root.matrixWorld).invert();

    const geos: THREE.BufferGeometry[] = [];
    root.traverse((node) => {
      const mesh = node as THREE.Mesh;
      if (!mesh.isMesh || !mesh.geometry) return;
      const posAttr = mesh.geometry.getAttribute('position') as THREE.BufferAttribute | undefined;
      if (!posAttr) return;

      const g = new THREE.BufferGeometry();
      g.setAttribute('position', posAttr.clone());
      if (mesh.geometry.index) g.setIndex(mesh.geometry.index.clone());

      const deindexed = g.toNonIndexed();
      g.dispose();

      const relMatrix = new THREE.Matrix4().multiplyMatrices(rootWorldInv, mesh.matrixWorld);
      deindexed.applyMatrix4(relMatrix);
      geos.push(deindexed);
    });

    if (geos.length === 0) return;

    const merged = geos.length === 1 ? geos[0] : mergeGeometries(geos, false);
    geos.forEach(g => g.dispose());
    if (!merged) return;

    const samplerMesh = new THREE.Mesh(merged, new THREE.MeshBasicMaterial());
    const sampler = new MeshSurfaceSampler(samplerMesh).build();
    const p = new THREE.Vector3();

    for (let i = 0; i < COUNT; i++) {
      sampler.sample(p);
      particleTargets[i * 3]     = p.x;
      particleTargets[i * 3 + 1] = p.y;
      particleTargets[i * 3 + 2] = p.z;
    }
    merged.dispose();

    // Match infrastrutture's world-space visual exactly.
    // Measured from infrastrutture.glb: baseScale=0.6405, radius=0.008, dirRange=8
    //   → world sphere radius = 0.008 × 0.6405 = 0.005124
    //   → world dir half-amp  = 4    × 0.6405 = 2.562 per component
    // Dividing by current baseScale keeps both world values constant across models.
    const INFRA_BS       = 0.6405;
    const particleRadius = 0.008 * INFRA_BS / baseScale;  // world radius = 0.005124
    const dirScale       = 8    * INFRA_BS / baseScale;   // world amp    = 2.562 per component
    const directions = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      directions[i * 3]     = (Math.random() - 0.5) * dirScale;
      directions[i * 3 + 1] = (Math.random() - 0.5) * dirScale;
      directions[i * 3 + 2] = (Math.random() - 0.5) * dirScale;
    }

    const geo = new THREE.SphereGeometry(particleRadius, 4, 4);
    geo.setAttribute('aDirection', new THREE.InstancedBufferAttribute(directions, 3));

    particleMat = new THREE.ShaderMaterial({
      uniforms: {
        uPulse:       { value: 0.0 },
        uBaseOpacity: { value: 0.0 },
      },
      vertexShader: /* glsl */`
        attribute vec3 aDirection;
        uniform float uPulse;
        void main() {
          vec3 p = position + aDirection * uPulse;
          gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(p, 1.0);
        }
      `,
      fragmentShader: /* glsl */`
        uniform float uPulse;
        uniform float uBaseOpacity;
        void main() {
          gl_FragColor = vec4(0.0, 0.0, 0.0, uBaseOpacity + uPulse * 0.5);
        }
      `,
      transparent: true,
      depthWrite:  false,
    });

    particleMesh = new THREE.InstancedMesh(geo, particleMat, COUNT);
    particleMesh.frustumCulled = false;
    particleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    particleMesh.visible = false;

    iMatBuf = particleMesh.instanceMatrix.array as Float32Array;
    for (let i = 0; i < COUNT; i++) {
      const b = i * 16;
      iMatBuf[b]      = 1; iMatBuf[b + 1]  = 0; iMatBuf[b + 2]  = 0; iMatBuf[b + 3]  = 0;
      iMatBuf[b + 4]  = 0; iMatBuf[b + 5]  = 1; iMatBuf[b + 6]  = 0; iMatBuf[b + 7]  = 0;
      iMatBuf[b + 8]  = 0; iMatBuf[b + 9]  = 0; iMatBuf[b + 10] = 1; iMatBuf[b + 11] = 0;
      iMatBuf[b + 15] = 1;
    }
    particleMesh.instanceMatrix.needsUpdate = true;

    root.add(particleMesh);
  }

  function preloadResultModels() {
    const uniquePaths = [...new Set(resultPaths)];
    if (uniquePaths.length === 0) return;
    const draco = new DRACOLoader();
    draco.setDecoderPath('/draco/');
    const loader = new GLTFLoader();
    loader.setDRACOLoader(draco);
    let remaining = uniquePaths.length;
    uniquePaths.forEach(path => {
      loader.load(path, (gltf) => {
        resultModels.set(path, gltf.scene);
        remaining--;
        if (remaining === 0) draco.dispose();
      }, undefined, (err) => {
        console.warn('[Scene3D] preload error:', path, err);
        remaining--;
        if (remaining === 0) draco.dispose();
      });
    });
  }

  function doMorph(source: THREE.Group, onDone: () => void) {
    if (!scene || !camera || !spinner || !modelGroup || !particleMesh || !iMatBuf) return;

    const resultGroup = source.clone();

    resultGroup.updateMatrixWorld(true);
    const box    = new THREE.Box3().setFromObject(resultGroup);
    const center = box.getCenter(new THREE.Vector3());
    const size   = box.getSize(new THREE.Vector3());
    resultGroup.position.sub(center);

    const fov        = camera.fov * (Math.PI / 180);
    const visibleH   = 2 * Math.tan(fov / 2) * camera.position.z;
    const maxDim     = Math.max(size.x, size.y, size.z);
    const resultBase = (visibleH * 0.9) / maxDim;
    const settled    = modelGroup.scale.x / baseScale;
    resultGroup.scale.setScalar(resultBase * settled * 1.33);

    resultModelMaterials = [];
    resultGroup.traverse(node => {
      const mesh = node as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.geometry.computeVertexNormals();
      const chrome = new THREE.MeshPhysicalMaterial({
        color: 0x181818, metalness: 1.0, roughness: 0.015,
        envMapIntensity: 5.0, clearcoat: 1.0, clearcoatRoughness: 0.01,
        transparent: true, opacity: 0,
      });
      mesh.material = chrome;
      resultModelMaterials.push(chrome);
    });

    spinner.add(resultGroup);
    scene.updateMatrixWorld();

    const modelGroupWorldInv = new THREE.Matrix4().copy(modelGroup.matrixWorld).invert();
    const geos: THREE.BufferGeometry[] = [];
    resultGroup.traverse(node => {
      const mesh = node as THREE.Mesh;
      if (!mesh.isMesh || !mesh.geometry) return;
      const posAttr = mesh.geometry.getAttribute('position') as THREE.BufferAttribute | undefined;
      if (!posAttr) return;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', posAttr.clone());
      if (mesh.geometry.index) g.setIndex(mesh.geometry.index.clone());
      const deindexed = g.toNonIndexed();
      g.dispose();
      const relMatrix = new THREE.Matrix4().multiplyMatrices(modelGroupWorldInv, mesh.matrixWorld);
      deindexed.applyMatrix4(relMatrix);
      geos.push(deindexed);
    });

    if (geos.length === 0) { spinner.remove(resultGroup); return; }
    const merged = geos.length === 1 ? geos[0] : mergeGeometries(geos, false);
    geos.forEach(g => g.dispose());
    if (!merged) { spinner.remove(resultGroup); return; }

    const samplerMesh = new THREE.Mesh(merged, new THREE.MeshBasicMaterial());
    const sampler = new MeshSurfaceSampler(samplerMesh).build();
    const p = new THREE.Vector3();
    for (let i = 0; i < COUNT; i++) {
      sampler.sample(p);
      resultTargets[i * 3]     = p.x;
      resultTargets[i * 3 + 1] = p.y;
      resultTargets[i * 3 + 2] = p.z;
    }
    merged.dispose();

    particleCurrent.set(particleTargets);
    particleMesh.visible = true;

    morphState        = 'morphing';
    morphElapsed      = 0;
    morphDoneCallback = onDone;
  }

  function morphToResult(path: string, onDone: () => void) {
    const cached = resultModels.get(path);
    if (cached) { doMorph(cached, onDone); return; }

    const draco = new DRACOLoader();
    draco.setDecoderPath('/draco/');
    const loader = new GLTFLoader();
    loader.setDRACOLoader(draco);
    loader.load(path, (gltf) => {
      draco.dispose();
      resultModels.set(path, gltf.scene);
      doMorph(gltf.scene, onDone);
    }, undefined, (err) => {
      console.error('[Scene3D] on-demand load error:', path, err);
      draco.dispose();
    });
  }

  function startTransition() {
    if (transitionState !== 'none' || !particleMesh) return;
    transitionState    = 'in';
    transitionProgress = 0;
    particleCurrent.fill(0);
    particleMesh.visible = true;
  }

  function triggerManualPulse() {
    if (transitionState !== 'done') return;
    manualPulseActive  = true;
    manualPulseElapsed = 0;
  }

  function startLoop() {
    if (rafId !== null) return;
    rafId = requestAnimationFrame(tick);
  }

  function stopLoop() {
    if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
  }

  function tick() {
    rafId = requestAnimationFrame(tick);
    if (!renderer || !scene || !camera) return;

    const dt      = clock.getDelta();
    const elapsed = clock.elapsedTime;

    if (spinner && !orbitEnabled) spinner.rotation.y += IDLE_RAD_S * dt;
    if (controls?.enabled) controls.update(dt);

    if (transitionState === 'in' && particleMesh && particleMat && iMatBuf) {
      transitionProgress = Math.min(1, transitionProgress + dt / TRANSITION_DURATION);

      for (let i = 0; i < COUNT; i++) {
        particleCurrent[i * 3]     += (particleTargets[i * 3]     - particleCurrent[i * 3])     * 0.04;
        particleCurrent[i * 3 + 1] += (particleTargets[i * 3 + 1] - particleCurrent[i * 3 + 1]) * 0.04;
        particleCurrent[i * 3 + 2] += (particleTargets[i * 3 + 2] - particleCurrent[i * 3 + 2]) * 0.04;
        const b = i * 16 + 12;
        iMatBuf[b]     = particleCurrent[i * 3];
        iMatBuf[b + 1] = particleCurrent[i * 3 + 1];
        iMatBuf[b + 2] = particleCurrent[i * 3 + 2];
      }
      particleMesh.instanceMatrix.needsUpdate = true;

      particleMat.uniforms.uPulse.value       = Math.sin(transitionProgress * Math.PI) * 3.0;
      particleMat.uniforms.uBaseOpacity.value  = Math.min(0.85, transitionProgress * 1.7 * 0.85);
      materials.forEach(m => { m.opacity = Math.max(0, 1 - transitionProgress); });

      if (transitionProgress >= 1) {
        transitionState = 'done';
        for (let i = 0; i < COUNT; i++) {
          const b = i * 16 + 12;
          iMatBuf[b]     = particleTargets[i * 3];
          iMatBuf[b + 1] = particleTargets[i * 3 + 1];
          iMatBuf[b + 2] = particleTargets[i * 3 + 2];
        }
        particleMesh.instanceMatrix.needsUpdate = true;
        particleMat.uniforms.uBaseOpacity.value = 0.85;
        materials.forEach(m => { m.opacity = 0; m.visible = false; });
      }
    }

    if (transitionState === 'done' && morphState === 'none' && particleMat) {
      if (manualPulseActive) {
        manualPulseElapsed += dt;
        const t = Math.min(1, manualPulseElapsed / MANUAL_PULSE_DURATION);
        particleMat.uniforms.uPulse.value = Math.sin(t * Math.PI) * 1.2;
        if (t >= 1) manualPulseActive = false;
      } else {
        particleMat.uniforms.uPulse.value = Math.abs(Math.sin(elapsed * Math.PI)) * 0.08;
      }
    }

    if (morphState === 'morphing' && particleMesh && particleMat && iMatBuf) {
      morphElapsed += dt;
      const t = Math.min(1, morphElapsed / MORPH_DURATION);

      for (let i = 0; i < COUNT; i++) {
        particleCurrent[i * 3]     += (resultTargets[i * 3]     - particleCurrent[i * 3])     * 0.06;
        particleCurrent[i * 3 + 1] += (resultTargets[i * 3 + 1] - particleCurrent[i * 3 + 1]) * 0.06;
        particleCurrent[i * 3 + 2] += (resultTargets[i * 3 + 2] - particleCurrent[i * 3 + 2]) * 0.06;
        const b = i * 16 + 12;
        iMatBuf[b]     = particleCurrent[i * 3];
        iMatBuf[b + 1] = particleCurrent[i * 3 + 1];
        iMatBuf[b + 2] = particleCurrent[i * 3 + 2];
      }
      particleMesh.instanceMatrix.needsUpdate = true;

      if (t >= 0.8) {
        const fadeT = (t - 0.8) / 0.2;
        resultModelMaterials.forEach(m => { m.opacity = fadeT; });
      }

      if (t >= 1) {
        morphState = 'none';
        particleMesh.visible = false;
        resultModelMaterials.forEach(m => { m.opacity = 1; });
        const cb = morphDoneCallback;
        morphDoneCallback = null;
        cb?.();
      }
    }

    renderer.render(scene, camera);
  }

  function onResize() {
    if (!renderer || !camera) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
</script>

<div class="scene-wrapper" bind:this={wrapperEl} style:pointer-events={orbitEnabled ? 'auto' : 'none'}>
  <canvas bind:this={canvasEl}></canvas>
</div>

<style>
  .scene-wrapper {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 0;
  }

  canvas {
    display: block;
    width: 100%;
    height: 100%;
  }
</style>
