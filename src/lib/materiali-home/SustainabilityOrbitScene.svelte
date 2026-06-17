<script>
  import { onMount } from 'svelte';
  import { mount, unmount } from 'svelte';
  import * as THREE from 'three';
  import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
  import { CSS3DRenderer, CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
  import FactCard from './FactCard.svelte';
  import { rangeProgress, lerp, damp } from './scrollStages.js';
  import {
    fitModelToCenter,
    applyTreeMaterial,
    getOrbitRadiusFromTree,
    isCardBehindTreeByDepth
  } from './sustainabilityOrbit3d.js';
  import {
    captureCardTexture,
    createCardMesh,
    syncMeshWithCss3d,
    applyCardMeshTexture
  } from './sustainabilityCardMesh.js';
  import {
    getFactDockT,
    isFactActive as isFactSegmentActive,
    DOCK_UI_THRESHOLD,
    orbitCardDockFade
  } from './sustainabilityDock.js';

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

  const DOCK_POS = new THREE.Vector3(-3.55, 0.12, 1.15);
  const TREE_SIZE = 2.1;
  const ORBIT_RADIUS_FALLBACK = 1.92;
  const ORBIT_RX_RATIO = 1;
  const ORBIT_RZ_RATIO = 1;
  const CARD_SCENE_SCALE = 0.00335;
  /** Smussamento scroll → posizione card (lambda damp, stile scrub GSAP) */
  const SCROLL_SMOOTH_LAMBDA = 6;

  let orbitRadius = ORBIT_RADIUS_FALLBACK;
  let targetScrollProgress = 0;
  let smoothedScrollProgress = 0;
  let lastFrameTime = 0;
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
   *   textureReady: boolean
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

  /**
   * Rotazione Y dell'albero legata allo scroll (come la ruspa in infrastrutture).
   * @param {number} progress
   */
  function getTreeScrollRotation(progress) {
    if (reducedMotion || progress < orbitStart) return 0;

    const orbitT = rangeProgress(progress, orbitStart, orbitEnd);
    const orbitRot = orbitT * Math.PI * 2;

    const inFacts =
      progress >= factSegments[0]?.start && progress < factSegments[2]?.end;
    const factT = inFacts
      ? rangeProgress(progress, factSegments[0].start, factSegments[2].end)
      : 0;
    const factRot = factT * Math.PI * 0.65;

    return orbitRot + factRot;
  }

  /** @param {number} progress scroll smussato */
  function getOrbitAngle(progress) {
    return getTreeScrollRotation(progress);
  }

  /** @param {number} index */
  function isFactPast(index) {
    const seg = factSegments[index];
    if (!seg) return false;
    return scrollProgress >= seg.end;
  }

  /** @param {CSS3DObject} obj @param {THREE.Vector3} lookAtPoint */
  function orientCardTo(obj, lookAtPoint) {
    obj.lookAt(lookAtPoint);
  }

  function syncOrbitFromTree() {
    if (!treeRoot || treeRoot.children.length === 0) return;
    orbitRadius = getOrbitRadiusFromTree(treeRoot, treeCenter);
  }

  /** @param {CSS3DObject} obj @param {boolean} isDocked */
  function isCardBehindTree(obj, isDocked) {
    if (isDocked || !camera || !treeRoot || treeRoot.children.length === 0) return false;
    obj.getWorldPosition(_cardWorld);
    return isCardBehindTreeByDepth(camera, _cardWorld, treeCenter);
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
        expanded: entry.expanded,
        orbit: true
      }
    });
  }

  function updateCardTransforms() {
    if (!camera) return;
    syncOrbitFromTree();
    const orbitAngle = getOrbitAngle(smoothedScrollProgress);
    const n = facts.length;
    const inOrbitPhase =
      smoothedScrollProgress >= orbitStart - 0.01 || scrollProgress >= orbitStart - 0.01;

    const hideOrbitPeers = factSegments.some(
      (_, i) =>
        isFactSegmentActive(scrollProgress, factSegments, i) &&
        getFactDockT(scrollProgress, factSegments, i) >= DOCK_UI_THRESHOLD
    );

    cardObjects.forEach((obj, index) => {
      const baseAngle = (index / n) * Math.PI * 2 - Math.PI / 2 + orbitAngle;
      const rx = orbitRadius * ORBIT_RX_RATIO;
      const rz = orbitRadius * ORBIT_RZ_RATIO;
      const ox = treeCenter.x + Math.cos(baseAngle) * rx;
      const oz = treeCenter.z + Math.sin(baseAngle) * rz;
      const oy = treeCenter.y;

      const dockT = getFactDockT(scrollProgress, factSegments, index);
      const activeCard = isFactSegmentActive(scrollProgress, factSegments, index);
      const past = isFactPast(index);
      const isDocked = activeCard && dockT > 0.35;
      const uiDocked = activeCard && dockT >= DOCK_UI_THRESHOLD;

      let tx = ox;
      let ty = oy;
      let tz = oz;
      let scale = CARD_SCENE_SCALE;

      if (activeCard && dockT > 0 && !uiDocked) {
        const dockEase = dockT * dockT * (3 - 2 * dockT);
        tx = lerp(ox, DOCK_POS.x, dockEase);
        ty = lerp(oy, DOCK_POS.y, dockEase);
        tz = lerp(oz, DOCK_POS.z, dockEase);
        scale = lerp(CARD_SCENE_SCALE, CARD_SCENE_SCALE * 1.05, dockEase);
      }

      obj.position.set(tx, ty, tz);
      obj.scale.setScalar(scale);
      obj.updateMatrixWorld(true);

      if (activeCard && dockT > 0.2) {
        _lookTarget.copy(treeCenter).lerp(camera.position, dockT);
        orientCardTo(obj, _lookTarget);
      } else {
        orientCardTo(obj, treeCenter);
      }

      let opacity = 0;
      if (!inOrbitPhase && !activeCard && !past) {
        opacity = 0;
      } else if (activeCard) {
        opacity = uiDocked ? 0 : orbitCardDockFade(dockT);
      } else if (past) {
        opacity = 0.35;
      } else if (inOrbitPhase) {
        opacity = 1;
      }

      if (hideOrbitPeers && !activeCard) {
        opacity = 0;
      }

      const el = /** @type {HTMLDivElement} */ (obj.element);
      const behind = opacity > 0.01 && isCardBehindTree(obj, isDocked);
      const mountEntry = cardMounts[index];
      const useMesh = behind && mountEntry?.textureReady && mountEntry?.mesh;

      el.style.opacity = useMesh ? '0' : String(opacity);
      el.style.visibility = opacity > 0.01 ? 'visible' : 'hidden';
      el.style.pointerEvents = opacity > 0.4 && !useMesh ? 'auto' : 'none';

      obj.userData.behindTree = behind;
      obj.userData.hasOpacity = opacity > 0.01;

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
      const entry = cardMounts[idx];
      const useMesh = obj.userData.behindTree && entry?.textureReady;
      obj.visible = !useMesh;
    });

    cardMeshGroup?.children.forEach((child) => {
      child.visible = false;
    });
    cardMounts.forEach((entry, idx) => {
      if (!entry.mesh || !cardObjects[idx]?.userData.hasOpacity) return;
      const useMesh = cardObjects[idx].userData.behindTree && entry.textureReady;
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
      props: { label: fact.label, body: fact.body, sources: fact.sources, expanded, orbit: true }
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
        props: {
          label: fact.label,
          body: fact.body,
          sources: fact.sources,
          expanded: false,
          orbit: true
        }
      });

      const captureInstance = mount(FactCard, {
        target: captureEl,
        props: {
          label: fact.label,
          body: fact.body,
          sources: fact.sources,
          expanded: false,
          orbit: true
        }
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
        textureReady: false
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
        treeRoot.rotation.y = getTreeScrollRotation(smoothedScrollProgress);
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
  }

  .orbit-scene :global(.orbit-card-css3d) {
    width: 424px;
    height: 559px;
    transform-style: preserve-3d;
    backface-visibility: hidden;
    will-change: transform, opacity;
    overflow: hidden;
  }

  .orbit-scene :global(.orbit-card-css3d .fact-card) {
    width: 424px;
    height: 559px;
    max-width: none;
    pointer-events: none;
  }

  .orbit-scene :global(.orbit-card-css3d .fact-card-inner) {
    width: 100%;
    height: 100%;
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
    height: 559px;
    overflow: hidden;
  }

  :global(.orbit-card-capture .fact-card) {
    width: 424px;
    height: 559px;
    max-width: none;
  }
</style>
