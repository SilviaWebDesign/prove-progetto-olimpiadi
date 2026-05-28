<script>
  import { onMount } from 'svelte';
  import { mount, unmount } from 'svelte';
  import * as THREE from 'three';
  import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
  import { CSS3DRenderer, CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
  import FactCard from '$lib/components/file-chiara/FactCard.svelte';
  import { setCardRotationActive } from '$lib/components/file-chiara/cardRotation.js';
  import { rangeProgress, lerp, smoothRangeProgress, damp } from '$lib/components/file-chiara/scrollStages.js';
  import {
    fitModelToCenter,
    applyTreeMaterial,
    getOrbitRadiusFromTree,
    isCardBehindTreeByDepth,
    ORBIT_CARD_HALF_WIDTH,
    ORBIT_SURFACE_MARGIN
  } from '$lib/components/file-chiara/sustainabilityOrbit3d.js';
  import {
    captureCardTexture,
    createCardMesh,
    syncMeshWithCss3d,
    applyCardMeshTexture
  } from '$lib/components/file-chiara/sustainabilityCardMesh.js';
  import {
    getFactDockT,
    isFactActive as isFactSegmentActive,
    DOCK_UI_THRESHOLD
  } from '$lib/components/file-chiara/sustainabilityDock.js';

  /**
   * @type {{
   *   facts: { id: string, label: string, body: string, sources: string }[],
   *   modelSrc: string,
   *   scrollProgress: number,
   *   orbitStart: number,
   *   orbitEnd: number,
   *   factSegments: { start: number, end: number }[],
   *   active: boolean,
   *   reducedMotion?: boolean
   * }}
   */
  let {
    facts,
    modelSrc,
    scrollProgress,
    orbitStart,
    orbitEnd,
    factSegments,
    active = false,
    reducedMotion = false
  } = $props();

  const DOCK_POS = new THREE.Vector3(-1.45, 0.12, 1.15);
  const TREE_SIZE = 2.1;
  const ORBIT_RADIUS_FALLBACK = 1.92;
  const ORBIT_RX_RATIO = 1;
  const ORBIT_RZ_RATIO = 1;
  const CARD_SCENE_SCALE = 0.00335;
  /** Rotazione albero guidata dallo scroll (niente auto-animazione a tempo). */
  const TREE_SCROLL_TURNS = 1.15;
  /** Smussamento scroll → posizione card (lambda damp) */
  const SCROLL_SMOOTH_LAMBDA = 5.6;
  /** Ritarda il docking: l'albero resta "in mezzo" alle card più a lungo */
  const DOCK_MOVE_START_T = 0.32;
  const BEHIND_HYSTERESIS_FRAMES = 3;
  const OCCLUSION_OVERLAP_MIN = 0.5;
  const OCCLUSION_DEPTH_MARGIN = 0.14;
  const MIN_CAMERA_FACING_BLEND = 0.28;

  let orbitRadius = ORBIT_RADIUS_FALLBACK;
  let treeHullRadius = Math.max(0.2, ORBIT_RADIUS_FALLBACK - ORBIT_CARD_HALF_WIDTH - ORBIT_SURFACE_MARGIN);
  let targetScrollProgress = 0;
  let smoothedScrollProgress = 0;
  let lastFrameTime = 0;
  let lockedDockDriverIndex = -1;
  let lockedSegmentIndex = -1;
  const treeCenter = new THREE.Vector3(0, 0, 0);

  let container = $state(null);
  /** @type {THREE.WebGLRenderer | undefined} */
  let renderer;
  /** @type {CSS3DRenderer | undefined} */
  let css3dFrontRenderer;
  /** @type {THREE.Scene | undefined} */
  let scene;
  /** @type {THREE.PerspectiveCamera | undefined} */
  let camera;
  /** @type {THREE.Group | undefined} */
  let treeRoot;
  /** @type {THREE.Group | undefined} */
  let cardMeshGroup;
  /** @type {CSS3DObject[]} */
  let cardObjects = [];
  /**
   * @type {{
   *   el: HTMLDivElement,
   *   instance: ReturnType<typeof mount> | null,
   *   captureEl: HTMLDivElement,
   *   captureInstance: ReturnType<typeof mount> | null,
   *   expanded: boolean,
   *   mesh: THREE.Mesh | null,
   *   texture: THREE.CanvasTexture | null,
   *   textureReady: boolean,
   *   behindFrames: number
   * }[]}
   */
  let cardMounts = [];
  /** @type {HTMLDivElement | null} */
  let captureRoot = null;
  let animationFrameId = 0;
  /** @type {ResizeObserver | undefined} */
  let resizeObserver;

  const _lookTarget = new THREE.Vector3();
  const _cardWorld = new THREE.Vector3();
  const _smoothQuat = new THREE.Quaternion();
  const _targetQuat = new THREE.Quaternion();
  const _cameraFacingQuat = new THREE.Quaternion();
  const _lookMatrix = new THREE.Matrix4();

  $effect(() => {
    if (!active) return;
    setCardRotationActive(true);
    return () => setCardRotationActive(false);
  });

  /** @param {number} index */
  function isFactPast(index) {
    const seg = factSegments[index];
    if (!seg) return false;
    return scrollProgress >= seg.end;
  }

  /** @param {number} progress scroll smussato */
  function getOrbitAngle(progress) {
    if (reducedMotion) return 0;
    const orbitT = smoothRangeProgress(progress, orbitStart, orbitEnd);
    const inFacts =
      progress >= factSegments[0]?.start && progress < factSegments[2]?.end;
    const factT = inFacts
      ? smoothRangeProgress(progress, factSegments[0].start, factSegments[2].end)
      : 0;
    return orbitT * Math.PI * 2 + factT * Math.PI * 0.65;
  }

  /** @param {CSS3DObject} obj @param {THREE.Vector3} lookAtPoint */
  function orientCardTo(obj, lookAtPoint, smooth = 1) {
    _smoothQuat.copy(obj.quaternion);
    obj.lookAt(lookAtPoint);
    _targetQuat.copy(obj.quaternion);
    if (camera) {
      _lookMatrix.lookAt(obj.position, camera.position, obj.up);
      _cameraFacingQuat.setFromRotationMatrix(_lookMatrix);
      _targetQuat.slerp(_cameraFacingQuat, MIN_CAMERA_FACING_BLEND);
    }
    if (smooth >= 1) {
      obj.quaternion.copy(_targetQuat);
      return;
    }
    _smoothQuat.slerp(_targetQuat, smooth);
    obj.quaternion.copy(_smoothQuat);
  }

  function syncOrbitFromTree() {
    if (!treeRoot || treeRoot.children.length === 0) return;
    orbitRadius = getOrbitRadiusFromTree(treeRoot, treeCenter);
    treeHullRadius = Math.max(0.2, orbitRadius - ORBIT_CARD_HALF_WIDTH - ORBIT_SURFACE_MARGIN);
  }

  /** @param {CSS3DObject} obj @param {boolean} isDocked */
  function isCardBehindTree(obj, isDocked) {
    if (isDocked || !camera || !treeRoot || treeRoot.children.length === 0) return false;
    obj.getWorldPosition(_cardWorld);
    const inBackHalf = _cardWorld.z < treeCenter.z - 0.02;
    if (!inBackHalf) return false;
    return isCardBehindTreeByDepth(camera, _cardWorld, treeCenter, {
      treeRadiusWorld: treeHullRadius,
      cardHalfWidthWorld: ORBIT_CARD_HALF_WIDTH,
      overlapMin: OCCLUSION_OVERLAP_MIN,
      depthMargin: OCCLUSION_DEPTH_MARGIN
    });
  }

  /** @param {number} index */
  async function refreshCardMeshTexture(index) {
    const entry = cardMounts[index];
    if (!entry?.mesh || !scene) return;

    if (document.fonts?.ready) await document.fonts.ready;

    try {
      const texture = await captureCardTexture(entry.captureEl, entry.expanded);
      if (entry.texture) entry.texture.dispose();
      entry.texture = texture;
      applyCardMeshTexture(entry.mesh, texture, CARD_SCENE_SCALE, entry.expanded);
      entry.textureReady = true;
    } catch {
      entry.textureReady = false;
    }
  }

  /** @param {number} index */
  function syncCaptureCard(index) {
    const entry = cardMounts[index];
    const fact = facts[index];
    if (!entry || !fact) return;

    if (entry.captureInstance) unmount(entry.captureInstance);
    entry.captureInstance = mount(FactCard, {
      target: entry.captureEl,
      props: {
        label: fact.label,
        body: fact.body,
        sources: fact.sources,
        expanded: entry.expanded
      }
    });
  }

  function updateCardTransforms() {
    if (!camera) return;
    const activeCamera = camera;
    syncOrbitFromTree();
    const orbitAngle = getOrbitAngle(smoothedScrollProgress);
    const n = facts.length;
    const rx = orbitRadius * ORBIT_RX_RATIO;
    const rz = orbitRadius * ORBIT_RZ_RATIO;
    const inOrbitPhase =
      smoothedScrollProgress >= orbitStart - 0.01 || scrollProgress >= orbitStart - 0.01;
    const segmentActiveIndex = facts.findIndex((_, i) =>
      isFactSegmentActive(scrollProgress, factSegments, i)
    );
    const activeDockT =
      segmentActiveIndex >= 0 ? getFactDockT(scrollProgress, factSegments, segmentActiveIndex) : 0;

    if (segmentActiveIndex < 0) {
      lockedDockDriverIndex = -1;
      lockedSegmentIndex = -1;
    } else if (lockedSegmentIndex !== segmentActiveIndex || lockedDockDriverIndex < 0) {
      let leftMostX = Number.POSITIVE_INFINITY;
      let nextDriver = segmentActiveIndex;
      for (let i = 0; i < n; i++) {
        const baseAngle = (i / n) * Math.PI * 2 - Math.PI / 2 + orbitAngle;
        const ox = treeCenter.x + Math.cos(baseAngle) * rx;
        if (ox < leftMostX) {
          leftMostX = ox;
          nextDriver = i;
        }
      }
      lockedDockDriverIndex = nextDriver;
      lockedSegmentIndex = segmentActiveIndex;
    }
    const dockDriverIndex = lockedDockDriverIndex;

    /** @param {number} segProgress */
    const getDockBlendForSegmentProgress = (segProgress) => {
      // Più tempo in orbita tra una card fissata e la successiva:
      // ingresso dock ritardato, plateau centrale, rilascio prima della fine segmento.
      if (segProgress < 0.5) return 0;
      if (segProgress < 0.68) {
        const t = rangeProgress(segProgress, 0.5, 0.68);
        return t * t * (3 - 2 * t);
      }
      if (segProgress < 0.84) return 1;
      const t = rangeProgress(segProgress, 0.84, 1);
      const ease = t * t * (3 - 2 * t);
      return 1 - ease;
    };

    const focusedCardIndex =
      segmentActiveIndex >= 0 && activeDockT >= DOCK_UI_THRESHOLD ? dockDriverIndex : -1;

    cardObjects.forEach((obj, index) => {
      const baseAngle = (index / n) * Math.PI * 2 - Math.PI / 2 + orbitAngle;
      const ox = treeCenter.x + Math.cos(baseAngle) * rx;
      const oz = treeCenter.z + Math.sin(baseAngle) * rz;
      const oy = treeCenter.y;

      const dockT =
        index === dockDriverIndex && segmentActiveIndex >= 0
          ? activeDockT
          : getFactDockT(scrollProgress, factSegments, index);
      const activeCard = segmentActiveIndex >= 0 && index === dockDriverIndex;
      const past = isFactPast(index);
      const isDocked = activeCard && dockT > 0.35;
      const uiDocked = activeCard && dockT >= DOCK_UI_THRESHOLD;
      const seg = activeCard ? factSegments[segmentActiveIndex] : factSegments[index];
      const segProgress = seg ? rangeProgress(scrollProgress, seg.start, seg.end) : 0;

      let tx = ox;
      let ty = oy;
      let tz = oz;
      let scale = CARD_SCENE_SCALE;
      const dockMoveT = rangeProgress(dockT, DOCK_MOVE_START_T, 1);
      const dockBlend = activeCard ? getDockBlendForSegmentProgress(segProgress) : 0;
      const dockEaseRaw = Math.max(dockMoveT, dockBlend);
      const dockEase = dockEaseRaw * dockEaseRaw * (3 - 2 * dockEaseRaw);

      if (activeCard && dockMoveT > 0) {
        tx = lerp(ox, DOCK_POS.x, dockEase);
        ty = lerp(oy, DOCK_POS.y, dockEase);
        tz = lerp(oz, DOCK_POS.z, dockEase);
        scale = lerp(CARD_SCENE_SCALE, CARD_SCENE_SCALE * 1.05, dockEase);
      }

      obj.position.set(tx, ty, tz);
      obj.scale.setScalar(scale);
      obj.updateMatrixWorld(true);

      const isLeftOfTree = tx <= treeCenter.x - 0.08;
      const dockLocked = activeCard && dockBlend >= 0.98;
      if (dockLocked) {
        tx = DOCK_POS.x;
        ty = DOCK_POS.y;
        tz = DOCK_POS.z;
        scale = CARD_SCENE_SCALE * 1.05;
        obj.position.set(tx, ty, tz);
        obj.scale.setScalar(scale);
        obj.updateMatrixWorld(true);
      }
      const frontalTurnT =
        activeCard && isLeftOfTree ? rangeProgress(dockMoveT, 0.08, 0.96) : 0;
      const frontalTurnEase = frontalTurnT * frontalTurnT * (3 - 2 * frontalTurnT);
      const dockFrontT = activeCard ? rangeProgress(dockT, 0.12, 0.98) : 0;
      const dockFrontEase = Math.max(dockFrontT * dockFrontT * (3 - 2 * dockFrontT), dockBlend);
      const frontalPlateau = activeCard && dockBlend >= 0.8;
      const forceFrontal = activeCard && uiDocked;

      const turnSmooth = 0.1 + frontalTurnEase * 0.14;
      if (activeCard) {
        _lookTarget.copy(treeCenter).lerp(activeCamera.position, dockFrontEase);
        orientCardTo(obj, _lookTarget, 0.12 + dockFrontEase * 0.16);
        if (forceFrontal) {
          obj.quaternion.copy(activeCamera.quaternion);
        } else if (frontalPlateau) {
          obj.quaternion.slerp(activeCamera.quaternion, 0.24);
        } else {
          _targetQuat.copy(obj.quaternion);
          _targetQuat.slerp(activeCamera.quaternion, dockFrontEase);
          obj.quaternion.slerp(_targetQuat, 0.12 + dockFrontEase * 0.22);
        }
      } else if (frontalTurnEase > 0) {
        _lookTarget.copy(treeCenter).lerp(activeCamera.position, frontalTurnEase);
        orientCardTo(obj, _lookTarget, turnSmooth);
      } else {
        orientCardTo(obj, treeCenter, turnSmooth);
      }

      let opacity = 0;
      if (!inOrbitPhase && !activeCard && !past) {
        opacity = 0;
      } else if (focusedCardIndex >= 0 && index !== focusedCardIndex) {
        opacity = 0;
      } else if (activeCard) {
        opacity = 1;
      } else if (past) {
        opacity = 0.35;
      } else if (inOrbitPhase) {
        opacity = 1;
      }

      const el = /** @type {HTMLDivElement} */ (obj.element);
      const mountEntry = cardMounts[index];
      const behindNow = !dockLocked && opacity > 0.01 && isCardBehindTree(obj, isDocked);
      if (mountEntry) {
        mountEntry.behindFrames = behindNow ? mountEntry.behindFrames + 1 : 0;
      }
      const behindStable = (mountEntry?.behindFrames ?? 0) >= BEHIND_HYSTERESIS_FRAMES;
      const useMesh = behindStable && mountEntry?.textureReady && mountEntry?.mesh;

      el.style.opacity = useMesh ? '0' : String(opacity);
      el.style.visibility = opacity > 0.01 ? 'visible' : 'hidden';
      el.style.pointerEvents = opacity > 0.4 && !useMesh ? 'auto' : 'none';

      obj.userData.behindTree = behindStable;
      obj.userData.hasOpacity = opacity > 0.01;
      obj.userData.useMeshOcclusion = Boolean(useMesh);

      if (mountEntry?.mesh) {
        syncMeshWithCss3d(mountEntry.mesh, obj);
        const mat = /** @type {THREE.MeshBasicMaterial} */ (mountEntry.mesh.material);
        mat.opacity = opacity;
        mountEntry.mesh.visible = Boolean(useMesh);
      }
    });
  }

  function renderWithTreeOcclusion() {
    if (!css3dFrontRenderer || !renderer || !scene || !camera) return;

    cardObjects.forEach((obj) => {
      if (!obj.userData.hasOpacity) {
        obj.visible = false;
        return;
      }
      const idx = cardObjects.indexOf(obj);
      const useMesh = Boolean(obj.userData.useMeshOcclusion);
      obj.visible = !useMesh;
    });

    cardMeshGroup?.children.forEach((child) => {
      child.visible = false;
    });
    cardMounts.forEach((entry, idx) => {
      if (!entry.mesh || !cardObjects[idx]?.userData.hasOpacity) return;
      const useMesh = Boolean(cardObjects[idx].userData.useMeshOcclusion);
      entry.mesh.visible = Boolean(useMesh);
    });

    renderer.clear(true, true, true);
    if (treeRoot && treeRoot.children.length > 0) {
      treeRoot.visible = true;
      renderer.render(scene, camera);
    }

    css3dFrontRenderer.render(scene, camera);
  }

  /** @param {number} index */
  function syncCardExpanded(index) {
    const mountEntry = cardMounts[index];
    const fact = facts[index];
    if (!mountEntry || !fact) return;

    const expanded =
      getFactDockT(scrollProgress, factSegments, index) > 0.5 &&
      isFactSegmentActive(scrollProgress, factSegments, index);
    if (mountEntry.expanded === expanded) return;

    if (mountEntry.instance) unmount(mountEntry.instance);
    mountEntry.instance = mount(FactCard, {
      target: mountEntry.el,
      props: { label: fact.label, body: fact.body, sources: fact.sources, expanded }
    });
    mountEntry.expanded = expanded;
    syncCaptureCard(index);
    refreshCardMeshTexture(index);
  }

  $effect(() => {
    targetScrollProgress = scrollProgress;
    facts.forEach((_, index) => syncCardExpanded(index));
  });

  onMount(() => {
    scene = new THREE.Scene();
    cardMeshGroup = new THREE.Group();
    scene.add(cardMeshGroup);

    camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 0.28, 5.2);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);

    css3dFrontRenderer = new CSS3DRenderer();
    css3dFrontRenderer.domElement.className = 'css3d-layer css3d-front';

    if (!container) return;

    captureRoot = document.createElement('div');
    captureRoot.className = 'orbit-card-capture-root';
    document.body.appendChild(captureRoot);

    container.appendChild(renderer.domElement);
    container.appendChild(css3dFrontRenderer.domElement);

    renderer.domElement.classList.add('orbit-tree-canvas');

    scene.add(new THREE.AmbientLight(0xe8eaef, 1.35));
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.6);
    keyLight.position.set(5, 10, 7);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0xc5cad4, 1.5);
    fillLight.position.set(-6, 4, -5);
    scene.add(fillLight);
    const rimLight = new THREE.DirectionalLight(0xf5f7fa, 1.1);
    rimLight.position.set(0, 2, -8);
    scene.add(rimLight);

    treeRoot = new THREE.Group();
    scene.add(treeRoot);

    facts.forEach((fact, index) => {
      const el = document.createElement('div');
      el.className = 'orbit-card-css3d';

      const captureEl = document.createElement('div');
      captureEl.className = 'orbit-card-capture';
      captureRoot?.appendChild(captureEl);

      const instance = mount(FactCard, {
        target: el,
        props: { label: fact.label, body: fact.body, sources: fact.sources, expanded: false }
      });

      const captureInstance = mount(FactCard, {
        target: captureEl,
        props: { label: fact.label, body: fact.body, sources: fact.sources, expanded: false }
      });

      const placeholder = new THREE.CanvasTexture(document.createElement('canvas'));
      const mesh = createCardMesh(placeholder, CARD_SCENE_SCALE, false);
      cardMeshGroup.add(mesh);

      cardMounts.push({
        el,
        instance,
        captureEl,
        captureInstance,
        expanded: false,
        mesh,
        texture: null,
        textureReady: false,
        behindFrames: 0
      });

      const obj = new CSS3DObject(el);
      obj.scale.setScalar(CARD_SCENE_SCALE);
      cardObjects.push(obj);
      scene.add(obj);

      setTimeout(() => {
        refreshCardMeshTexture(index);
      }, 120);
    });

    const loader = new GLTFLoader();
    loader.load(modelSrc, (gltf) => {
      if (!treeRoot) return;
      const model = gltf.scene;
      fitModelToCenter(model, TREE_SIZE);
      applyTreeMaterial(model);
      treeRoot.add(model);
      treeRoot.updateMatrixWorld(true);
      syncOrbitFromTree();
      camera?.lookAt(treeCenter);
    });

    const updateLayout = () => {
      if (!container || !renderer || !camera || !css3dFrontRenderer) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      css3dFrontRenderer.setSize(w, h);
    };

    resizeObserver = new ResizeObserver(updateLayout);
    resizeObserver.observe(container);
    updateLayout();

    targetScrollProgress = scrollProgress;
    smoothedScrollProgress = scrollProgress;
    lastFrameTime = performance.now();

    const animate = (now) => {
      animationFrameId = requestAnimationFrame(animate);
      if (!renderer || !css3dFrontRenderer || !scene || !camera) return;

      const frameNow = typeof now === 'number' ? now : performance.now();
      const dt = Math.min(0.05, Math.max(0, (frameNow - lastFrameTime) / 1000));
      lastFrameTime = frameNow;
      smoothedScrollProgress = damp(
        smoothedScrollProgress,
        targetScrollProgress,
        dt,
        SCROLL_SMOOTH_LAMBDA
      );
      if (!Number.isFinite(smoothedScrollProgress)) {
        smoothedScrollProgress = targetScrollProgress;
      }

      if (treeRoot) {
        const treeSpinT = smoothRangeProgress(
          smoothedScrollProgress,
          orbitStart,
          factSegments[2]?.end ?? orbitEnd
        );
        treeRoot.rotation.y = treeSpinT * Math.PI * 2 * TREE_SCROLL_TURNS;
        treeRoot.updateMatrixWorld(true);
      }
      syncOrbitFromTree();
      camera.lookAt(treeCenter);
      camera.updateMatrixWorld();
      updateCardTransforms();

      if (active) {
        renderWithTreeOcclusion();
      }
    };
    animate(performance.now());

    return () => {
      resizeObserver?.disconnect();
      cancelAnimationFrame(animationFrameId);
      captureRoot?.remove();
      cardMounts.forEach((m) => {
        if (m.instance) unmount(m.instance);
        if (m.captureInstance) unmount(m.captureInstance);
        if (m.texture) m.texture.dispose();
        if (m.mesh) {
          m.mesh.geometry.dispose();
          /** @type {THREE.MeshBasicMaterial} */ (m.mesh.material).map?.dispose();
          m.mesh.material.dispose();
        }
      });
      cardMounts = [];
      cardObjects = [];
      renderer?.dispose();
      css3dFrontRenderer?.domElement.remove();
      if (renderer?.domElement?.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  });
</script>

<div class="orbit-scene" bind:this={container} aria-hidden="true"></div>

<style>
  .orbit-scene {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }

  .orbit-scene :global(.orbit-tree-canvas) {
    position: absolute;
    inset: 0;
    display: block;
    width: 100% !important;
    height: 100% !important;
    z-index: 1;
    pointer-events: none;
    background: transparent !important;
  }

  .orbit-scene :global(.css3d-front) {
    position: absolute;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
    z-index: 2;
    transform-style: preserve-3d;
    -webkit-transform-style: preserve-3d;
  }

  .orbit-scene :global(.orbit-card-css3d) {
    width: 424px;
    transform-style: preserve-3d;
    -webkit-transform-style: preserve-3d;
    backface-visibility: visible;
    -webkit-backface-visibility: visible;
    will-change: transform, opacity;
    transform: translateZ(0.01px);
    -webkit-transform: translateZ(0.01px);
  }

  .orbit-scene :global(.orbit-card-css3d .fact-card),
  .orbit-scene :global(.orbit-card-css3d .fact-card-inner) {
    backface-visibility: visible;
    -webkit-backface-visibility: visible;
    will-change: transform, opacity;
  }

  .orbit-scene :global(.orbit-card-css3d .fact-card) {
    width: 424px;
    pointer-events: none;
  }

  :global(.orbit-card-capture-root) {
    position: fixed;
    left: -12000px;
    top: 0;
    width: 424px;
    opacity: 1;
    visibility: visible;
    pointer-events: none;
    z-index: -1;
  }

  :global(.orbit-card-capture) {
    width: 424px;
  }
</style>
