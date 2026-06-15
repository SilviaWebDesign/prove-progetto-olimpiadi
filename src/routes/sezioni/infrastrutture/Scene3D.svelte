<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import * as THREE from 'three';
  import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
  import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
  import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
  import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js';
  import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

  export interface Scene3DApi {
    setRotationY: (rad: number) => void;
    setScale:     (factor: number) => void;
    setOpacity:   (val: number) => void;
    settle:       () => void;
    unsettle:     () => void;
    pulse:        () => void;
  }

  interface Props { api?: Scene3DApi; onModelLoaded?: () => void; }
  let { api = $bindable(), onModelLoaded }: Props = $props();

  let wrapperEl = $state<HTMLDivElement | null>(null);
  let canvasEl  = $state<HTMLCanvasElement | null>(null);

  let renderer:   THREE.WebGLRenderer | null = null;
  let scene:      THREE.Scene | null = null;
  let camera:     THREE.PerspectiveCamera | null = null;
  let modelGroup: THREE.Group | null = null;
  let materials:  THREE.MeshPhysicalMaterial[] = [];
  let baseScale = 1;

  let rafId:   number | null = null;
  let spinner: THREE.Group | null = null;

  const clock      = new THREE.Clock();
  const IDLE_RAD_S = THREE.MathUtils.degToRad(7);

  // ── Particle system ────────────────────────────────────────────────────────
  const COUNT = 20000;

  let particleMesh: THREE.InstancedMesh | null = null;
  let particleMat:  THREE.ShaderMaterial | null = null;
  // Direct reference to instanceMatrix Float32Array for zero-overhead writes
  let iMatBuf: Float32Array | null = null;

  // Sampled target positions and lerped current positions (spinner-local space)
  const particleTargets = new Float32Array(COUNT * 3);
  const particleCurrent = new Float32Array(COUNT * 3);

  type TState = 'none' | 'in' | 'done';
  let transitionState: TState = 'none';
  let transitionProgress = 0;
  const TRANSITION_DURATION = 2.0;

  let manualPulseActive  = false;
  let manualPulseElapsed = 0;
  const MANUAL_PULSE_DURATION = 1.5;

  // ── Mount ──────────────────────────────────────────────────────────────────
  onMount(() => {
    if (!canvasEl || !wrapperEl) return;

    api = {
      setRotationY: (rad) => { if (modelGroup) modelGroup.rotation.y = rad; },
      setScale:     (f)   => { if (modelGroup) modelGroup.scale.setScalar(baseScale * f); },
      setOpacity:   (val) => { materials.forEach((m) => { m.opacity = val; }); },
      settle:       startTransition,
      unsettle:     () => {
        // Only possible before transition commits
        if (transitionState !== 'none') return;
        materials.forEach(m => { m.opacity = 1; });
      },
      pulse: triggerManualPulse,
    };

    initThree();
    startLoop();

    if ('requestIdleCallback' in window) {
      (window as Window & typeof globalThis & { requestIdleCallback: (cb: () => void) => void })
        .requestIdleCallback(loadModel);
    } else {
      setTimeout(loadModel, 100);
    }

    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); };
  });

  // ── Destroy ────────────────────────────────────────────────────────────────
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
    renderer?.dispose();
    scene = null; renderer = null; camera = null;
    modelGroup = null; spinner = null;
    materials = []; particleMesh = null; particleMat = null; iMatBuf = null;
  });

  // ── Three.js init ──────────────────────────────────────────────────────────
  function initThree() {
    if (!canvasEl || !wrapperEl) return;

    renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace    = THREE.SRGBColorSpace;
    renderer.toneMapping         = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    scene = new THREE.Scene();
    // background = null → transparent, page background shows through

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    const w = wrapperEl.clientWidth  || window.innerWidth;
    const h = wrapperEl.clientHeight || window.innerHeight;
    camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    camera.position.set(0, 0, 6);
    renderer.setSize(w, h);

    const key = new THREE.DirectionalLight(0xffffff, 3.5);
    key.position.set(5, 10, 7);
    scene.add(key);

    const fill = new THREE.DirectionalLight(0xffffff, 1.5);
    fill.position.set(-5, 2, -5);
    scene.add(fill);
  }

  // ── GLB load ───────────────────────────────────────────────────────────────
  function loadModel() {
    const draco = new DRACOLoader();
    draco.setDecoderPath('/draco/');
    const loader = new GLTFLoader();
    loader.setDRACOLoader(draco);

    loader.load(
      '/oggetti/infrastrutture.glb',
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

  // ── Build particle cloud ───────────────────────────────────────────────────
  function buildParticles(root: THREE.Group) {
    if (!scene || !spinner) return;

    // ── 1. Merge all mesh geometries (position only, deindexed) in root-local space
    scene.updateMatrixWorld();
    const rootWorldInv = new THREE.Matrix4().copy(root.matrixWorld).invert();

    const geos: THREE.BufferGeometry[] = [];
    root.traverse((node) => {
      const mesh = node as THREE.Mesh;
      if (!mesh.isMesh || !mesh.geometry) return;
      const posAttr = mesh.geometry.getAttribute('position') as THREE.BufferAttribute | undefined;
      if (!posAttr) return;

      // Keep only position to ensure mergeGeometries succeeds across heterogeneous meshes
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', posAttr.clone());
      if (mesh.geometry.index) g.setIndex(mesh.geometry.index.clone());

      const deindexed = g.toNonIndexed();
      g.dispose();

      // Transform positions from mesh-local to root-local space
      const relMatrix = new THREE.Matrix4().multiplyMatrices(rootWorldInv, mesh.matrixWorld);
      deindexed.applyMatrix4(relMatrix);
      geos.push(deindexed);
    });

    if (geos.length === 0) return;

    const merged = geos.length === 1 ? geos[0] : mergeGeometries(geos, false);
    geos.forEach(g => g.dispose());
    if (!merged) return;

    // ── 2. Sample surface (MeshSurfaceSampler weights by triangle area)
    const samplerMesh = new THREE.Mesh(merged, new THREE.MeshBasicMaterial());
    const sampler = new MeshSurfaceSampler(samplerMesh).build();
    const p = new THREE.Vector3();

    for (let i = 0; i < COUNT; i++) {
      sampler.sample(p);
      // Scale from root-local to spinner-local (= visual world space)
      particleTargets[i * 3]     = p.x * baseScale;
      particleTargets[i * 3 + 1] = p.y * baseScale;
      particleTargets[i * 3 + 2] = p.z * baseScale;
    }
    merged.dispose();

    // ── 3. Per-instance random directions for the pulse expansion shader
    const directions = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      directions[i * 3]     = (Math.random() - 0.5) * 8;
      directions[i * 3 + 1] = (Math.random() - 0.5) * 8;
      directions[i * 3 + 2] = (Math.random() - 0.5) * 8;
    }

    // ── 4. Build InstancedMesh with ShaderMaterial
    const geo = new THREE.SphereGeometry(0.08, 8, 8);
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

    // ── 5. Pre-fill instance matrices as identity at origin
    //    Only x/y/z (indices 12/13/14 of each 16-element column-major matrix)
    //    will be updated during the transition; the rest stay identity.
    iMatBuf = particleMesh.instanceMatrix.array as Float32Array;
    for (let i = 0; i < COUNT; i++) {
      const b = i * 16;
      iMatBuf[b]      = 1; iMatBuf[b + 1]  = 0; iMatBuf[b + 2]  = 0; iMatBuf[b + 3]  = 0;
      iMatBuf[b + 4]  = 0; iMatBuf[b + 5]  = 1; iMatBuf[b + 6]  = 0; iMatBuf[b + 7]  = 0;
      iMatBuf[b + 8]  = 0; iMatBuf[b + 9]  = 0; iMatBuf[b + 10] = 1; iMatBuf[b + 11] = 0;
      // translation [12,13,14] = 0,0,0  (starts at origin)
      iMatBuf[b + 15] = 1;
    }
    particleMesh.instanceMatrix.needsUpdate = true;

    spinner.add(particleMesh);
  }

  // ── Transition trigger ─────────────────────────────────────────────────────
  function startTransition() {
    if (transitionState !== 'none' || !particleMesh) return;
    transitionState    = 'in';
    transitionProgress = 0;
    particleCurrent.fill(0); // particles start at origin and lerp outward
    particleMesh.visible = true;
  }

  // ── Manual pulse trigger ───────────────────────────────────────────────────
  function triggerManualPulse() {
    if (transitionState !== 'done') return;
    manualPulseActive  = true;
    manualPulseElapsed = 0;
  }

  // ── Render loop ────────────────────────────────────────────────────────────
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
    const elapsed = clock.elapsedTime; // updated by getDelta()

    if (spinner) spinner.rotation.y += IDLE_RAD_S * dt;

    // ── Phase A: solid → particles transition (~2s) ─────────────────────────
    if (transitionState === 'in' && particleMesh && particleMat && iMatBuf) {
      transitionProgress = Math.min(1, transitionProgress + dt / TRANSITION_DURATION);

      // Lerp particle positions toward sampled targets; write directly to buffer
      for (let i = 0; i < COUNT; i++) {
        particleCurrent[i * 3]     += (particleTargets[i * 3]     - particleCurrent[i * 3])     * 0.04;
        particleCurrent[i * 3 + 1] += (particleTargets[i * 3 + 1] - particleCurrent[i * 3 + 1]) * 0.04;
        particleCurrent[i * 3 + 2] += (particleTargets[i * 3 + 2] - particleCurrent[i * 3 + 2]) * 0.04;
        const b = i * 16 + 12; // translation column of the column-major 4x4
        iMatBuf[b]     = particleCurrent[i * 3];
        iMatBuf[b + 1] = particleCurrent[i * 3 + 1];
        iMatBuf[b + 2] = particleCurrent[i * 3 + 2];
      }
      particleMesh.instanceMatrix.needsUpdate = true;

      // Pulsing expansion arc: sin(0→π) * 3.0
      particleMat.uniforms.uPulse.value      = Math.sin(transitionProgress * Math.PI) * 3.0;
      // Opacity ramps to 0.85 over first half of transition
      particleMat.uniforms.uBaseOpacity.value = Math.min(0.85, transitionProgress * 1.7 * 0.85);
      // Solid model fades out
      materials.forEach(m => { m.opacity = Math.max(0, 1 - transitionProgress); });

      if (transitionProgress >= 1) {
        transitionState = 'done';
        // Snap to exact target positions
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

    // ── Phase B: steady state — only uniform animation, no per-particle work ─
    if (transitionState === 'done' && particleMat) {
      if (manualPulseActive) {
        manualPulseElapsed += dt;
        const t = Math.min(1, manualPulseElapsed / MANUAL_PULSE_DURATION);
        particleMat.uniforms.uPulse.value = Math.sin(t * Math.PI) * 1.2;
        if (t >= 1) manualPulseActive = false;
      } else {
        // Gentle auto-pulse: continuous blink via |sin(t·π)| * 0.4
        particleMat.uniforms.uPulse.value = Math.abs(Math.sin(elapsed * Math.PI)) * 0.4;
      }
    }

    renderer.render(scene, camera);
  }

  function onResize() {
    if (!renderer || !camera || !wrapperEl) return;
    const w = wrapperEl.clientWidth;
    const h = wrapperEl.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
</script>

<div class="scene-wrapper" bind:this={wrapperEl}>
  <canvas bind:this={canvasEl}></canvas>
</div>

<style>
  .scene-wrapper {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  canvas {
    display: block;
    width: 100%;
    height: 100%;
  }
</style>
