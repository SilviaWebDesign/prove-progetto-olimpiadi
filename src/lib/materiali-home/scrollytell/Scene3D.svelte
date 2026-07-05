<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import gsap from 'gsap';
  import * as THREE from 'three';
  import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
  import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
  import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
  import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js';
  import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
  import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

  export interface MobileFitOptions {
    ratio?: number;
    centerBias?: number;
    /** Limita il gap usato per la scala (non per il posizionamento). */
    maxScaleGap?: number;
  }

  export interface Scene3DApi {
    setRotationY:           (rad: number) => void;
    setScale:               (factor: number) => void;
    setOpacity:             (val: number) => void;
    setTransitionProgress:  (t: number) => void;
    settle:                 () => void;
    unsettle:               () => void;
    pulse:                  () => void;
    resetPulse:             () => void;
    morphToResult:          (path: string, onDone: () => void) => void;
    returnToParticles:      () => void;
    setMobileFit:           (topPx: number, bottomPx: number, options?: MobileFitOptions) => void;
    setMobileLayoutBlend:   (t: number) => void;
    clearMobileFit:         () => void;
    realignFeedback:        () => void;
  }

  interface Props {
    api?: Scene3DApi;
    modelSrc: string;
    onModelLoaded?: () => void;
    orbitEnabled?: boolean;
    feedbackActive?: boolean;
  }
  let {
    api = $bindable(),
    modelSrc,
    onModelLoaded,
    orbitEnabled = false,
    feedbackActive = false,
  }: Props = $props();

  let wrapperEl = $state<HTMLDivElement | null>(null);
  let canvasEl  = $state<HTMLCanvasElement | null>(null);

  let renderer:   THREE.WebGLRenderer | null = null;
  let scene:      THREE.Scene | null = null;
  let camera:     THREE.PerspectiveCamera | null = null;
  let modelGroup: THREE.Group | null = null;
  let materials:  THREE.MeshPhysicalMaterial[] = [];
  let baseScale = 1;
  const topicsPose = {
    modelPosition: new THREE.Vector3(),
    modelRotation: new THREE.Euler(),
    modelScale: 1,
    cameraPosition: new THREE.Vector3(),
    cameraLookAt: new THREE.Vector3(),
  };
  let topicsPoseSaved = false;

  const MODEL_FIT_FACTOR: Record<string, number> = {
    '/oggetti/ice_skate.glb': 0.72,
    '/oggetti/sport.glb': 0.72,
    '/oggetti/pianta.glb': 0.92,
  };

  /** Modelli piccoli nel file GLB: crossfade sulle posizioni finali invece del volo dall'origine. */
  const MODEL_PARTICLE_CROSSFADE = new Set([
    '/oggetti/pianta.glb',
    '/oggetti/sport.glb',
    '/oggetti/ice_skate.glb',
    '/oggetti/infrastrutture.glb',
  ]);

  /** Scala e posizione del modello in fase feedback. */
  const DEFAULT_FEEDBACK = { scaleMul: 1.33, yOffset: 0.55, lockSettled: false };
  const MODEL_FEEDBACK: Record<string, Partial<typeof DEFAULT_FEEDBACK>> = {
    '/oggetti/sport.glb':          { scaleMul: 0.38, yOffset: 0.45, lockSettled: true },
    '/oggetti/pianta.glb':         { scaleMul: 0.38, yOffset: 0.45, lockSettled: true },
    '/oggetti/infrastrutture.glb': { scaleMul: 0.38, yOffset: 0.45, lockSettled: true },
  };

  function feedbackConfig() {
    return { ...DEFAULT_FEEDBACK, ...MODEL_FEEDBACK[modelSrc] };
  }

  /** Altezza max del modello in fase feedback (frazione del viewport). */
  const FEEDBACK_MAX_VH = 0.36;
  const _feedbackPivot = new THREE.Vector3();
  let feedbackLayoutScale: THREE.Vector3 | null = null;

  function getCameraVisibleH(): number {
    if (!camera) return 1;
    const fov = camera.fov * (Math.PI / 180);
    return 2 * Math.tan(fov / 2) * camera.position.z;
  }

  function resetFeedbackViewCamera() {
    if (!camera) return;
    camera.position.set(0, 0, 6);
    camera.lookAt(0, 0, 0);
    if (controls) {
      controls.target.set(0, 0, 0);
      controls.update();
    }
  }

  /**
   * Centra il modello nel viewport.
   * doMorph centra la geometria sull'origine locale del gruppo: allineiamo
   * quel pivot (non l'AABB) al centro schermo (origine mondo).
   */
  function centerModelInViewport(group: THREE.Object3D) {
    if (!spinner || !camera) return;

    spinner.position.set(0, 0, 0);
    spinner.rotation.set(0, 0, 0);
    resetFeedbackViewCamera();

    group.updateMatrixWorld(true);

    if (feedbackLayoutScale) {
      group.scale.copy(feedbackLayoutScale);
    } else {
      const box = new THREE.Box3().setFromObject(group);
      const size = box.getSize(new THREE.Vector3());
      const maxWorldH = getCameraVisibleH() * FEEDBACK_MAX_VH;
      if (size.y > maxWorldH && size.y > 0) {
        group.scale.multiplyScalar(maxWorldH / size.y);
      }
      feedbackLayoutScale = group.scale.clone();
    }

    group.updateMatrixWorld(true);
    group.getWorldPosition(_feedbackPivot);
    spinner.position.copy(_feedbackPivot).negate();
  }

  function realignFeedbackModel() {
    if (activeResultGroup) centerModelInViewport(activeResultGroup);
    else if (modelGroup) centerModelInViewport(modelGroup);
  }

  function resetFeedbackLayout() {
    feedbackLayoutScale = null;
  }

  let isFeedbackActive = false;

  let activeResultGroup: THREE.Group | null = null;

  let rafId:    number | null = null;
  let spinner:  THREE.Group | null = null;
  let controls: OrbitControls | null = null;

  // ── Mobile viewport fit: modello riposizionato/riscalato nello spazio libero
  // tra testo e commenti, aggiornato via lerp continuo nel render loop ────────
  let mobileFitActive       = false;
  let mobileFitTargetScale  = 1;
  let mobileFitFinalOffsetY = 0;
  let mobileLayoutBlend     = 0;
  const MOBILE_FIT_LERP = 0.1;
  const MOBILE_FIT_RATIO = 1.16;
  /** 0.5 = centro del gap; valori più alti spostano il modello verso il basso. */
  const MOBILE_FIT_CENTER_BIAS = 0.64;

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

  /** Alterna a true/false ad ogni frame di morph: usato per dimezzare gli upload GPU. */
  let morphFrameParity = false;

  let manualPulseActive  = false;
  let manualPulseElapsed = 0;
  const MANUAL_PULSE_DURATION = 2.1;
  /** Moltiplicatore su elapsed per la pulsazione idle (più basso = più lento). */
  const IDLE_PULSE_SPEED = 0.65;

  // ── Result model preload + morph ───────────────────────────────────────────
  const resultModels = new Map<string, THREE.Group>();

  const resultTargets = new Float32Array(COUNT * 3);
  type MorphState = 'none' | 'morphing';
  let morphState: MorphState = 'none';
  let morphElapsed = 0;
  const MORPH_DURATION = 1.5;
  let morphDoneCallback: (() => void) | null = null;
  let resultModelMaterials: THREE.MeshPhysicalMaterial[] = [];
  let useParticleCrossfade = false;
  let scrollDrivenTransition = false;
  let transitionPrepared = false;

  // ── Particle hover ─────────────────────────────────────────────────────────
  const _hoverMouse = new THREE.Vector2();
  const _hoverRay = new THREE.Raycaster();
  const _hoverPlane = new THREE.Plane();
  const _hoverPlaneNormal = new THREE.Vector3();
  const _hoverHit = new THREE.Vector3();
  const _hoverTarget = new THREE.Vector3();
  const _hoverCenter = new THREE.Vector3();
  let lastPointerMoveMs = 0;
  let particleHoverRadius = 1.2;

  function particlesHoverActive() {
    return (
      !!particleMesh?.visible &&
      morphState === 'none' &&
      !orbitEnabled &&
      transitionState !== 'none'
    );
  }

  function computeParticleHoverRadius() {
    let maxDistSq = 0;
    for (let i = 0; i < COUNT; i++) {
      const x = particleTargets[i * 3];
      const y = particleTargets[i * 3 + 1];
      const z = particleTargets[i * 3 + 2];
      const d = x * x + y * y + z * z;
      if (d > maxDistSq) maxDistSq = d;
    }
    particleHoverRadius = Math.sqrt(maxDistSq) * 1.1;
  }

  function resetParticleHover() {
    if (!particleMat) return;
    particleMat.uniforms.uHoverStrength.value = 0;
  }

  function updateHoverPointer(clientX: number, clientY: number) {
    if (!renderer || !camera || !particleMat || !modelGroup || !particlesHoverActive()) return;

    const rect = renderer.domElement.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    _hoverMouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    _hoverMouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    _hoverRay.setFromCamera(_hoverMouse, camera);
    camera.getWorldDirection(_hoverPlaneNormal);
    modelGroup.getWorldPosition(_hoverCenter);
    _hoverPlane.setFromNormalAndCoplanarPoint(_hoverPlaneNormal, _hoverCenter);

    if (!_hoverRay.ray.intersectPlane(_hoverPlane, _hoverHit)) return;

    modelGroup.worldToLocal(_hoverHit);
    _hoverTarget.copy(_hoverHit);

    const distToCenter = _hoverTarget.length();
    if (distToCenter > particleHoverRadius) {
      particleMat.uniforms.uHoverStrength.value = THREE.MathUtils.lerp(
        particleMat.uniforms.uHoverStrength.value,
        0,
        0.22,
      );
      return;
    }

    particleMat.uniforms.uPointer.value.lerp(_hoverTarget, 0.28);
    particleMat.uniforms.uHoverStrength.value = THREE.MathUtils.lerp(
      particleMat.uniforms.uHoverStrength.value,
      1,
      0.16,
    );
    lastPointerMoveMs = performance.now();
  }

  function onPointerMove(event: PointerEvent) {
    updateHoverPointer(event.clientX, event.clientY);
  }

  function onPointerLeave() {
    resetParticleHover();
  }

  function decayParticleHover(dt: number) {
    if (!particleMat || !particlesHoverActive()) return;
    if (performance.now() - lastPointerMoveMs < 140) return;
    const decay = Math.pow(0.06, dt);
    particleMat.uniforms.uHoverStrength.value *= decay;
    if (particleMat.uniforms.uHoverStrength.value < 0.01) {
      particleMat.uniforms.uHoverStrength.value = 0;
    }
  }

  // ── Mount ──────────────────────────────────────────────────────────────────
  onMount(() => {
    if (!canvasEl || !wrapperEl) return;

    api = {
      setRotationY: (rad) => {
        if (modelGroup && (transitionState === 'none' || scrollDrivenTransition)) {
          modelGroup.rotation.y = rad;
        }
      },
      setScale: (f) => {
        if (modelGroup && (transitionState === 'none' || transitionState === 'done' || scrollDrivenTransition)) {
          modelGroup.scale.setScalar(baseScale * f);
        }
      },
      setOpacity:   (val) => {
        materials.forEach((m) => {
          const needsTransparent = val < 1;
          if (m.transparent !== needsTransparent) { m.transparent = needsTransparent; m.needsUpdate = true; }
          m.opacity = val;
        });
      },
      setTransitionProgress,
      settle:       () => setTransitionProgress(1),
      unsettle:     resetToSolid,
      pulse:       triggerManualPulse,
      resetPulse:  () => {
        manualPulseActive  = false;
        manualPulseElapsed = 0;
        if (particleMat) particleMat.uniforms.uPulse.value = 0;
      },
      morphToResult,
      returnToParticles: () => {
        if (controls) controls.enabled = false;
        resetFeedbackLayout();
        morphState = 'none';
        morphElapsed = 0;
        morphDoneCallback = null;
        if (spinner) {
          spinner.children
            .filter((child) => child !== modelGroup)
            .forEach((child) => spinner!.remove(child));
        }
        resultModelMaterials = [];
        activeResultGroup = null;
        restoreTopicsPose();
        if (spinner) spinner.position.y = 0;
        materials.forEach(m => { m.opacity = 0; m.visible = false; });
        if (particleMesh) particleMesh.visible = true;
        if (particleMat) {
          particleMat.uniforms.uBaseOpacity.value = 0.85;
          particleMat.uniforms.uPulse.value = 0;
        }
      },
      setMobileFit: (topPx, bottomPx, options = {}) => {
        if (!camera) return;
        mobileFitActive = true;
        const vh        = window.innerHeight;
        const fov       = camera.fov * (Math.PI / 180);
        const visibleH  = 2 * Math.tan(fov / 2) * camera.position.z;
        const gapPx     = Math.max(24, bottomPx - topPx);
        const scaleGap  = options.maxScaleGap != null
          ? Math.min(gapPx, options.maxScaleGap)
          : gapPx;
        const fitFactor = MODEL_FIT_FACTOR[modelSrc] ?? 1;
        const ratio     = options.ratio ?? MOBILE_FIT_RATIO;
        const centerBias = options.centerBias ?? MOBILE_FIT_CENTER_BIAS;
        mobileFitTargetScale = (ratio * (scaleGap / vh)) / (0.9 * fitFactor);
        const centerPx = topPx + gapPx * centerBias;
        mobileFitFinalOffsetY = ((vh / 2 - centerPx) / vh) * visibleH;
      },
      setMobileLayoutBlend: (t) => {
        mobileLayoutBlend = Math.max(0, Math.min(1, t));
      },
      clearMobileFit: () => {
        mobileFitActive = false;
        mobileLayoutBlend = 0;
        mobileFitTargetScale = 1;
        if (spinner) spinner.position.set(0, 0, 0);
        if (modelGroup) {
          const scale = topicsPoseSaved ? topicsPose.modelScale : baseScale;
          modelGroup.scale.setScalar(scale);
        }
      },
      realignFeedback: () => realignFeedbackModel(),
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
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerleave', onPointerLeave);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerleave', onPointerLeave);
    };
  });

  $effect(() => {
    if (!controls) return;
    controls.enabled = orbitEnabled;
    controls.autoRotate = !orbitEnabled;
  });

  $effect(() => {
    isFeedbackActive = feedbackActive;
    if (feedbackActive) realignFeedbackModel();
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
    // DPR più basso su mobile: riduce il carico di fill-rate su GPU più deboli,
    // percepibile durante le animazioni scroll-driven e il morph in fase feedback.
    const maxDpr = window.innerWidth < 768 ? 1.5 : 2;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxDpr));
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
        const fitFactor = MODEL_FIT_FACTOR[modelSrc] ?? 1;
        baseScale      = (visibleH * 0.9 * fitFactor) / maxDim;

        const group = new THREE.Group();
        group.add(gltf.scene);
        group.scale.setScalar(baseScale);

        materials = [];
        let hasSkinnedMesh = false;
        group.traverse((node) => {
          const mesh = node as THREE.Mesh;
          if (!mesh.isMesh) return;
          if ((mesh as THREE.SkinnedMesh).isSkinnedMesh) hasSkinnedMesh = true;
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
        useParticleCrossfade = hasSkinnedMesh || MODEL_PARTICLE_CROSSFADE.has(modelSrc) || maxDim < 1.5;
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

  function meshToRootGeometry(mesh: THREE.Mesh, rootWorldInv: THREE.Matrix4): THREE.BufferGeometry | null {
    const posAttr = mesh.geometry.getAttribute('position') as THREE.BufferAttribute | undefined;
    if (!posAttr) return null;

    const g = new THREE.BufferGeometry();
    const skinned = mesh as THREE.SkinnedMesh;

    if (skinned.isSkinnedMesh && skinned.skeleton) {
      mesh.updateWorldMatrix(true, false);
      skinned.skeleton.update();

      const baked = new Float32Array(posAttr.count * 3);
      const p = new THREE.Vector3();
      for (let i = 0; i < posAttr.count; i++) {
        skinned.getVertexPosition(i, p);
        baked[i * 3]     = p.x;
        baked[i * 3 + 1] = p.y;
        baked[i * 3 + 2] = p.z;
      }
      g.setAttribute('position', new THREE.BufferAttribute(baked, 3));
    } else {
      g.setAttribute('position', posAttr.clone());
    }

    if (mesh.geometry.index) g.setIndex(mesh.geometry.index.clone());
    const deindexed = g.toNonIndexed();
    g.dispose();

    const relMatrix = new THREE.Matrix4().multiplyMatrices(rootWorldInv, mesh.matrixWorld);
    deindexed.applyMatrix4(relMatrix);
    return deindexed;
  }

  function sampleParticleTargets(root: THREE.Group) {
    scene?.updateMatrixWorld(true);
    root.updateMatrixWorld(true);
    const rootWorldInv = new THREE.Matrix4().copy(root.matrixWorld).invert();

    const geos: THREE.BufferGeometry[] = [];
    root.traverse((node) => {
      const mesh = node as THREE.Mesh;
      if (!mesh.isMesh || !mesh.geometry || mesh === particleMesh) return;
      const geo = meshToRootGeometry(mesh, rootWorldInv);
      if (geo) geos.push(geo);
    });

    if (geos.length === 0) return;

    let merged = geos.length === 1 ? geos[0] : mergeGeometries(geos, false);

    if (!merged) {
      const samplers = geos.map((geo) => {
        const samplerMesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial());
        return new MeshSurfaceSampler(samplerMesh).build();
      });
      const weights = geos.map((geo) => geo.getAttribute('position')?.count ?? 0);
      const total = weights.reduce((sum, w) => sum + w, 0);
      const p = new THREE.Vector3();

      for (let i = 0; i < COUNT; i++) {
        let pick = Math.random() * total;
        let idx = 0;
        for (; idx < weights.length; idx++) {
          pick -= weights[idx];
          if (pick <= 0) break;
        }
        samplers[idx].sample(p);
        particleTargets[i * 3]     = p.x;
        particleTargets[i * 3 + 1] = p.y;
        particleTargets[i * 3 + 2] = p.z;
      }

      geos.forEach((g) => g.dispose());
      return;
    }

    geos.forEach(g => g.dispose());

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
  }

  function writeParticlePositions(positions: Float32Array) {
    if (!particleMesh || !iMatBuf) return;
    for (let i = 0; i < COUNT; i++) {
      const b = i * 16 + 12;
      iMatBuf[b]     = positions[i * 3];
      iMatBuf[b + 1] = positions[i * 3 + 1];
      iMatBuf[b + 2] = positions[i * 3 + 2];
    }
    particleMesh.instanceMatrix.needsUpdate = true;
  }

  function buildParticles(root: THREE.Group) {
    if (!scene || !spinner) return;

    sampleParticleTargets(root);
    computeParticleHoverRadius();

    // Match infrastrutture's world-space visual exactly.
    // Measured from infrastrutture.glb: baseScale=0.6405, radius=0.012, dirRange=8
    //   → world sphere radius = 0.012 × 0.6405 = 0.007686
    //   → world dir half-amp  = 4    × 0.6405 = 2.562 per component
    // Dividing by current baseScale keeps both world values constant across models.
    const INFRA_BS       = 0.6405;
    const particleRadius = 0.012 * INFRA_BS / baseScale;  // world radius = 0.007686
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
        uPulse:         { value: 0.0 },
        uBaseOpacity:   { value: 0.0 },
        uPointer:       { value: new THREE.Vector3() },
        uHoverRadius:   { value: 1.35 * INFRA_BS / baseScale },
        uHoverPush:     { value: 0.85 * INFRA_BS / baseScale },
        uHoverExpand:   { value: 0.55 * INFRA_BS / baseScale },
        uHoverStrength: { value: 0.0 },
      },
      vertexShader: /* glsl */`
        attribute vec3 aDirection;
        uniform float uPulse;
        uniform vec3 uPointer;
        uniform float uHoverRadius;
        uniform float uHoverPush;
        uniform float uHoverExpand;
        uniform float uHoverStrength;

        void main() {
          float expand = uHoverStrength * uHoverExpand;
          vec3 local = position + aDirection * (uPulse + expand);
          vec3 instPos = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
          vec3 toPart = instPos - uPointer;
          float dist = length(toPart);
          float infl = smoothstep(uHoverRadius, uHoverRadius * 0.18, dist) * uHoverStrength;
          vec3 repel = dist > 0.0001 ? normalize(toPart) * infl * uHoverPush : vec3(0.0);
          vec3 p = local + repel;
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

  function finalizeMorphView() {
    if (activeResultGroup && spinner) {
      // Trasferisce la rotazione idle sul modello risultato prima di azzerare lo spinner,
      // altrimenti il pattino appare capovolto/spostato a fine morph.
      activeResultGroup.rotation.y += spinner.rotation.y;
      spinner.rotation.set(0, 0, 0);
    }

    if (activeResultGroup) centerModelInViewport(activeResultGroup);
    else if (modelGroup) centerModelInViewport(modelGroup);
  }

  function resetFeedbackCamera() {
    if (!camera) return;
    freezeSpinnerRotation();
    if (spinner) spinner.rotation.set(0, 0, 0);
    resetFeedbackViewCamera();
  }

  function centerFeedbackView(scaleMul: number) {
    if (!modelGroup || !camera) return;

    resetFeedbackLayout();
    if (spinner) spinner.position.set(0, 0, 0);
    resetFeedbackViewCamera();

    modelGroup.rotation.set(0, 0, 0);
    modelGroup.position.set(0, 0, 0);
    modelGroup.scale.setScalar(baseScale * scaleMul);
    modelGroup.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(modelGroup);
    const center = box.getCenter(new THREE.Vector3());
    modelGroup.position.sub(center);

    centerModelInViewport(modelGroup);
  }

  function showEnlargedSourceModel(scaleMul: number, onDone: () => void) {
    if (!modelGroup || !particleMesh) return;

    morphState = 'none';
    particleMesh.visible = false;
    if (particleMat) {
      particleMat.uniforms.uPulse.value = 0;
      particleMat.uniforms.uBaseOpacity.value = 0;
      resetParticleHover();
    }

    centerFeedbackView(scaleMul);
    materials.forEach((m) => {
      m.opacity = 1;
      m.transparent = false;
      m.visible = true;
      m.needsUpdate = true;
    });

    onDone();
  }

  function doMorph(source: THREE.Group, onDone: () => void) {
    if (!scene || !camera || !spinner || !modelGroup || !particleMesh || !iMatBuf) { onDone(); return; }

    freezeSpinnerRotation();
    const resultGroup = source.clone();
    resultGroup.rotation.copy(modelGroup.rotation);

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
    const fb         = feedbackConfig();
    const morphSettled = fb.lockSettled ? 1 : settled;
    const resultMul    = fb.scaleMul;
    // Adatta sempre il modello di risultato al suo bounding box (non riusare baseScale
    // del modello sorgente: per sostenibilità causava scale errate con i GLB di feedback).
    resultGroup.scale.setScalar(resultBase * morphSettled * resultMul);

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
    activeResultGroup = resultGroup;
    scene.updateMatrixWorld();

    const modelGroupWorldInv = new THREE.Matrix4().copy(modelGroup.matrixWorld).invert();
    const geos: THREE.BufferGeometry[] = [];
    resultGroup.traverse(node => {
      const mesh = node as THREE.Mesh;
      if (!mesh.isMesh || !mesh.geometry) return;
      const posAttr = mesh.geometry.getAttribute('position') as THREE.BufferAttribute | undefined;
      if (!posAttr) return;
      const g = new THREE.BufferGeometry();

      if ((mesh as THREE.SkinnedMesh).isSkinnedMesh) {
        const sm = mesh as THREE.SkinnedMesh;
        const count = posAttr.count;
        const baked = new Float32Array(count * 3);
        const p = new THREE.Vector3();
        for (let i = 0; i < count; i++) {
          sm.getVertexPosition(i, p);
          baked[i * 3]     = p.x;
          baked[i * 3 + 1] = p.y;
          baked[i * 3 + 2] = p.z;
        }
        g.setAttribute('position', new THREE.Float32BufferAttribute(baked, 3));
      } else {
        g.setAttribute('position', posAttr.clone());
      }

      if (mesh.geometry.index) g.setIndex(mesh.geometry.index.clone());
      const deindexed = g.toNonIndexed();
      g.dispose();
      const relMatrix = new THREE.Matrix4().multiplyMatrices(modelGroupWorldInv, mesh.matrixWorld);
      deindexed.applyMatrix4(relMatrix);
      geos.push(deindexed);
    });

    if (geos.length === 0) { spinner.remove(resultGroup); onDone(); return; }
    const merged = geos.length === 1 ? geos[0] : mergeGeometries(geos, false);
    geos.forEach(g => g.dispose());
    if (!merged) { spinner.remove(resultGroup); onDone(); return; }

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
    morphFrameParity  = false;
    morphDoneCallback = onDone;
  }

  function morphToResult(path: string, onDone: () => void) {
    resetFeedbackLayout();
    const { scaleMul } = feedbackConfig();
    if (MODEL_FEEDBACK[modelSrc] && path === modelSrc) {
      showEnlargedSourceModel(scaleMul, onDone);
      return;
    }

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
      onDone();
    });
  }

  function freezeSpinnerRotation() {
    if (!spinner || !modelGroup || spinner.rotation.y === 0) return;
    modelGroup.rotation.y += spinner.rotation.y;
    spinner.rotation.y = 0;
  }

  function captureTopicsPose() {
    if (modelGroup) {
      topicsPose.modelPosition.copy(modelGroup.position);
      topicsPose.modelRotation.copy(modelGroup.rotation);
      topicsPose.modelScale = modelGroup.scale.x;
    }
    if (camera) topicsPose.cameraPosition.copy(camera.position);
    if (controls) {
      topicsPose.cameraLookAt.copy(controls.target);
    } else if (camera) {
      topicsPose.cameraLookAt.set(0, 0.3, 0);
    }
    topicsPoseSaved = true;
  }

  function restoreTopicsPose() {
    if (!topicsPoseSaved || !modelGroup) return;
    if (spinner) spinner.rotation.set(0, 0, 0);
    modelGroup.position.copy(topicsPose.modelPosition);
    modelGroup.rotation.copy(topicsPose.modelRotation);
    modelGroup.scale.setScalar(topicsPose.modelScale);
    if (camera) {
      camera.position.copy(topicsPose.cameraPosition);
      camera.lookAt(topicsPose.cameraLookAt);
    }
    if (controls) {
      controls.target.copy(topicsPose.cameraLookAt);
      controls.update();
    }
  }

  function resetToSolid() {
    transitionState = 'none';
    transitionProgress = 0;
    manualPulseActive = false;
    manualPulseElapsed = 0;

    if (particleMesh) {
      gsap.killTweensOf(particleMesh);
      particleMesh.visible = false;
    }
    if (particleMat) {
      particleMat.uniforms.uPulse.value = 0;
      particleMat.uniforms.uBaseOpacity.value = 0;
      resetParticleHover();
    }
    if (iMatBuf) {
      for (let i = 0; i < COUNT; i++) {
        const b = i * 16 + 12;
        iMatBuf[b] = iMatBuf[b + 1] = iMatBuf[b + 2] = 0;
      }
      particleMesh.instanceMatrix.needsUpdate = true;
    }
    particleCurrent.fill(0);

    materials.forEach((m) => {
      m.visible = true;
      m.transparent = false;
      m.opacity = 1;
      m.needsUpdate = true;
    });

    scrollDrivenTransition = false;
    transitionPrepared = false;
    if (spinner) spinner.position.y = 0;
    mobileLayoutBlend = 0;
  }

  function ensureTransitionPrepared() {
    if (transitionPrepared || !particleMesh || !modelGroup) return;
    transitionPrepared = true;

    scene?.updateMatrixWorld(true);
    spinner?.updateMatrixWorld(true);
    modelGroup.updateMatrixWorld(true);
    sampleParticleTargets(modelGroup);

    materials.forEach(m => {
      if (!m.transparent) { m.transparent = true; m.needsUpdate = true; }
      m.visible = true;
    });

    if (useParticleCrossfade) {
      particleCurrent.set(particleTargets);
      writeParticlePositions(particleCurrent);
      if (particleMat) particleMat.uniforms.uPulse.value = 0;
    } else {
      particleCurrent.fill(0);
    }

    particleMesh.visible = true;
  }

  function applyTransitionVisuals(p: number) {
    if (!particleMesh || !particleMat || !iMatBuf) return;

    if (useParticleCrossfade) {
      particleMat.uniforms.uPulse.value = 0;
      particleMat.uniforms.uBaseOpacity.value = p * 0.85;
      materials.forEach(m => {
        m.visible = true;
        m.opacity = Math.max(0, 1 - p);
      });
    } else {
      for (let i = 0; i < COUNT; i++) {
        particleCurrent[i * 3]     = particleTargets[i * 3]     * p;
        particleCurrent[i * 3 + 1] = particleTargets[i * 3 + 1] * p;
        particleCurrent[i * 3 + 2] = particleTargets[i * 3 + 2] * p;
        const b = i * 16 + 12;
        iMatBuf[b]     = particleCurrent[i * 3];
        iMatBuf[b + 1] = particleCurrent[i * 3 + 1];
        iMatBuf[b + 2] = particleCurrent[i * 3 + 2];
      }
      particleMesh.instanceMatrix.needsUpdate = true;

      particleMat.uniforms.uPulse.value = Math.sin(p * Math.PI) * 3.0;
      particleMat.uniforms.uBaseOpacity.value = Math.min(0.85, p * 1.7 * 0.85);
      materials.forEach(m => {
        m.visible = true;
        m.opacity = Math.max(0, 1 - p);
      });
    }
  }

  function finalizeTransition() {
    if (!particleMesh || !particleMat) return;
    freezeSpinnerRotation();
    captureTopicsPose();
    transitionState = 'done';
    transitionProgress = 1;
    writeParticlePositions(particleTargets);
    particleMat.uniforms.uBaseOpacity.value = 0.85;
    particleMat.uniforms.uPulse.value = 0;
    materials.forEach(m => { m.opacity = 0; m.visible = false; });
  }

  function setTransitionProgress(t: number) {
    const p = Math.max(0, Math.min(1, t));

    if (p <= 0) {
      resetToSolid();
      return;
    }

    scrollDrivenTransition = true;
    ensureTransitionPrepared();
    transitionProgress = p;

    if (p >= 1) {
      finalizeTransition();
      return;
    }

    transitionState = 'in';
    applyTransitionVisuals(p);
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

    const idleSpinAllowed =
      !isFeedbackActive &&
      !orbitEnabled &&
      morphState === 'none' &&
      (transitionState === 'done' ||
        transitionState === 'in' ||
        transitionState === 'none');

    if (spinner && idleSpinAllowed) {
      spinner.rotation.y += IDLE_RAD_S * dt;
    }
    if (controls?.enabled) controls.update(dt);

    if (mobileFitActive && !isFeedbackActive && spinner) {
      const targetY = mobileFitFinalOffsetY * mobileLayoutBlend;
      spinner.position.y += (targetY - spinner.position.y) * MOBILE_FIT_LERP;

      if (modelGroup && (transitionState === 'none' || transitionState === 'done')) {
        const currentScale = modelGroup.scale.x / baseScale;
        const nextScale = currentScale + (mobileFitTargetScale - currentScale) * MOBILE_FIT_LERP;
        modelGroup.scale.setScalar(baseScale * nextScale);
      }
    }

    decayParticleHover(dt);

    if (transitionState === 'in' && !scrollDrivenTransition && particleMesh && particleMat && iMatBuf) {
      transitionProgress = Math.min(1, transitionProgress + dt / TRANSITION_DURATION);

      if (useParticleCrossfade) {
        particleMat.uniforms.uPulse.value = 0;
        particleMat.uniforms.uBaseOpacity.value = Math.min(0.85, transitionProgress * 0.85);
        materials.forEach(m => { m.opacity = Math.max(0, 1 - transitionProgress); });
      } else {
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
      }

      if (transitionProgress >= 1) {
        transitionState = 'done';
        writeParticlePositions(particleTargets);
        particleMat.uniforms.uBaseOpacity.value = 0.85;
        materials.forEach(m => { m.opacity = 0; m.visible = false; });
      }
    }

    if (transitionState === 'done' && morphState === 'none' && particleMat) {
      if (manualPulseActive) {
        manualPulseElapsed += dt;
        const t = Math.min(1, manualPulseElapsed / MANUAL_PULSE_DURATION);
        particleMat.uniforms.uPulse.value = Math.sin(t * Math.PI) * 0.8;
        if (t >= 1) manualPulseActive = false;
      } else {
        particleMat.uniforms.uPulse.value = Math.abs(Math.sin(elapsed * Math.PI * IDLE_PULSE_SPEED)) * 0.04;
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
      // Il calcolo CPU resta ad ogni frame (mantiene invariati i tempi di convergenza),
      // ma l'upload del buffer instanceMatrix alla GPU (~1.3MB) avviene ogni 2 frame:
      // dimezza il carico di fill-rate durante il morph, impercettibile per un effetto
      // di particelle in convergenza. Pesante soprattutto su GPU mobile più deboli.
      morphFrameParity = !morphFrameParity;
      if (morphFrameParity || t >= 1) particleMesh.instanceMatrix.needsUpdate = true;

      if (t >= 0.8) {
        const fadeT = (t - 0.8) / 0.2;
        resultModelMaterials.forEach(m => { m.opacity = fadeT; });
      }

      if (t >= 1) {
        morphState = 'none';
        particleMesh.visible = false;
        resultModelMaterials.forEach(m => { m.opacity = 1; m.transparent = false; m.needsUpdate = true; });
        finalizeMorphView();
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
