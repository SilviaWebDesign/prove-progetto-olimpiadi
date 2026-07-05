<script>
  import { onMount, tick } from 'svelte';
  import { browser } from '$app/environment';
  import * as THREE from 'three';
  import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
  import {
    fitMountainModel,
    preloadMountainGltf,
    waitForContainerSize,
    buildHomeOrbitConfig,
    applyHomeHeroCamera,
    homeOrbitDistanceLimits,
    setupMountainRenderMaterials,
    HOME_CAM_Y_LOW,
    HOME_CAMERA_Z_START,
    HOME_HERO_ZOOM
  } from './mountainGltf.js';
  import {
    ABOUT_HOTSPOT_PATH,
    hotspotSnowPosition,
    enforceHotspotSeparation,
    snapPositionToSnowSurface,
    computeFocusCameraPosition,
    clampFocusCameraPosition,
    focusCameraDistance,
    sampleOrbitFocusTransition,
    getMarkerFocusPoint,
    panFocusToViewportX
  } from './aboutHotspots.js';
  import {
    createMarkerParticleSphere,
    applyMarkerMaterial,
    disposeMarkerGeometries,
    orientMarkerTowardWorldPoint,
    updateMarkerParticlePulse
  } from './aboutMarkerModels.js';

  const FOCUS_CAMERA_ZOOM = 1.08;
  const CAMERA_TRANSITION_MS = 900;

  const smogColor = '#ffffff';

  /** @type {{ selectedHotspot?: import('./aboutHotspots.js').AboutHotspot | null }} */
  let { selectedHotspot = $bindable(null) } = $props();

  /** @type {HTMLDivElement | undefined} */
  let container = $state(undefined);
  /** @type {THREE.WebGLRenderer | undefined} */
  let renderer;
  /** @type {THREE.Scene | undefined} */
  let scene;
  /** @type {THREE.PerspectiveCamera | undefined} */
  let camera;
  /** @type {THREE.FogExp2 | undefined} */
  let sceneFog;
  /** @type {OrbitControls | undefined} */
  let controls;
  let animationFrameId = 0;
  /** @type {THREE.Object3D | undefined} */
  let snowMountainModel;
  /** @type {THREE.Group | undefined} */
  let markerGroup;
  let initGeneration = 0;
  let paused = false;

  /**
   * @type {{
   *   object: THREE.Group;
   *   model: THREE.Object3D;
   *   hotspot: import('./aboutHotspots.js').AboutHotspot;
   *   baseScale: number;
   *   spinSpeed: number;
   * }[]}
   */
  let markers = [];

  const _worldBox = new THREE.Box3();
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let pointerDownX = 0;
  let pointerDownY = 0;
  let lastAnimationTime = 0;
  /** @type {ReturnType<typeof buildHomeOrbitConfig> | null} */
  let homeOrbitConfig = null;
  const _heroLookAt = new THREE.Vector3();
  /** Quota minima camera (linea neve / base render). */
  /** @type {number | null} */
  let cameraFloorY = null;
  let cameraReady = false;
  /** @type {string | null} */
  let lastSelectedHotspotId = null;
  let transitionActive = false;
  /** @type {{
   *   startTime: number;
   *   duration: number;
   *   fromCam: THREE.Vector3;
   *   toCam: THREE.Vector3;
   *   fromTarget: THREE.Vector3;
   *   toTarget: THREE.Vector3;
   *   fromZoom: number;
   *   toZoom: number;
   *   focusing: boolean;
   * } | null} */
  let cameraTransition = null;

  /** @param {THREE.Object3D} object */
  function hotspotFromObject(object) {
    let current = object;
    while (current) {
      if (current.userData?.hotspot) return current.userData.hotspot;
      current = current.parent;
    }
    return null;
  }

  function applyMountainOrbitLimits() {
    if (!controls || !homeOrbitConfig) return;
    const limits = homeOrbitDistanceLimits(homeOrbitConfig);
    controls.minDistance = limits.min;
    controls.maxDistance = limits.max;
    controls.target.copy(_heroLookAt);
  }

  /** Impedisce di ruotare la camera sotto la montagna. */
  function setupOrbitPolarLimits() {
    if (!controls || !camera || !controls.target) return;

    controls.minPolarAngle = 0.25;
    controls.maxPolarAngle = Math.PI / 2 - 0.1;
  }

  function applyFocusOrbitLimits() {
    if (!controls) return;
    const dist = focusCameraDistance(_worldBox);
    controls.minDistance = dist * 0.55;
    controls.maxDistance = dist * 1.3;
    setupOrbitPolarLimits();
  }

  /** Mantiene la camera sopra la linea neve anche dopo drag/zoom. */
  function clampCameraAboveSnow() {
    if (!camera || !controls || cameraFloorY == null) return;
    if (camera.position.y >= cameraFloorY) return;

    camera.position.y = cameraFloorY;
    camera.lookAt(controls.target);
    controls.update();
  }

  /** @returns {{ cam: THREE.Vector3; target: THREE.Vector3 }} */
  function getHeroCameraPose() {
    if (!homeOrbitConfig) {
      return {
        cam: new THREE.Vector3(0, HOME_CAM_Y_LOW, HOME_CAMERA_Z_START),
        target: new THREE.Vector3()
      };
    }

    const angle = homeOrbitConfig.startAngle;
    return {
      cam: new THREE.Vector3(
        homeOrbitConfig.center.x + Math.sin(angle) * homeOrbitConfig.radius,
        homeOrbitConfig.orbitY,
        homeOrbitConfig.center.z + Math.cos(angle) * homeOrbitConfig.radius
      ),
      target: _heroLookAt.clone()
    };
  }

  /** @param {import('./aboutHotspots.js').AboutHotspot | null} hotspot */
  function getHotspotMarkerEntry(hotspot) {
    return markers.find((m) => m.hotspot.id === hotspot?.id) ?? null;
  }

  /** @param {import('./aboutHotspots.js').AboutHotspot | null} hotspot */
  function getHotspotMarkerPosition(hotspot) {
    const entry = getHotspotMarkerEntry(hotspot);
    return entry?.object.position.clone() ?? null;
  }

  /** @param {import('./aboutHotspots.js').AboutHotspot | null} hotspot */
  function getHotspotFocusPoint(hotspot) {
    const entry = getHotspotMarkerEntry(hotspot);
    return entry ? getMarkerFocusPoint(entry.object) : null;
  }

  function startCameraTransition(hotspot) {
    if (!camera || !controls || !homeOrbitConfig) return;

    const fromCam = camera.position.clone();
    const fromTarget = controls.target.clone();
    const fromZoom = camera.zoom;

    /** @type {THREE.Vector3} */
    let toCam;
    /** @type {THREE.Vector3} */
    let toTarget;
    let toZoom = HOME_HERO_ZOOM;
    const focusing = hotspot != null;

    if (hotspot) {
      const entry = getHotspotMarkerEntry(hotspot);
      const markerPos = getHotspotMarkerPosition(hotspot);
      const focusPoint = getHotspotFocusPoint(hotspot);
      if (!entry || !markerPos || !focusPoint) return;

      toTarget = focusPoint.clone();
      toCam = computeFocusCameraPosition(markerPos, focusPoint, homeOrbitConfig.center, _worldBox);
      if (snowMountainModel) {
        toCam = clampFocusCameraPosition(markerPos, toCam, snowMountainModel, raycaster);
      }

      const savedCam = camera.position.clone();
      const savedTarget = controls.target.clone();
      camera.position.copy(toCam);
      controls.target.copy(toTarget);
      camera.lookAt(toTarget);
      panFocusToViewportX(camera, controls.target, focusPoint);
      toCam = camera.position.clone();
      toTarget = controls.target.clone();
      orientMarkerTowardWorldPoint(entry.object, entry.hotspot.modelSrc, toCam);
      camera.position.copy(savedCam);
      controls.target.copy(savedTarget);

      toZoom = FOCUS_CAMERA_ZOOM;
    } else {
      const hero = getHeroCameraPose();
      toCam = hero.cam;
      toTarget = hero.target;
    }

    transitionActive = true;
    cameraTransition = {
      startTime: performance.now(),
      duration: CAMERA_TRANSITION_MS,
      fromCam,
      toCam,
      fromTarget,
      toTarget,
      fromZoom,
      toZoom,
      focusing
    };
  }

  /** @param {number} now */
  function updateCameraTransition(now) {
    if (!cameraTransition || !camera || !controls || !homeOrbitConfig) return;

    const rawT = Math.min((now - cameraTransition.startTime) / cameraTransition.duration, 1);
    const t = 1 - Math.pow(1 - rawT, 3);

    const { cam, target } = sampleOrbitFocusTransition(
      cameraTransition.fromCam,
      cameraTransition.toCam,
      cameraTransition.fromTarget,
      cameraTransition.toTarget,
      homeOrbitConfig.center,
      _worldBox,
      t,
      { allowCloseFocus: true }
    );

    camera.position.copy(cam);
    controls.target.copy(target);
    camera.up.set(0, 1, 0);
    camera.lookAt(target);
    camera.zoom = THREE.MathUtils.lerp(cameraTransition.fromZoom, cameraTransition.toZoom, t);
    camera.updateProjectionMatrix();

    if (cameraTransition.focusing && selectedHotspot) {
      const entry = getHotspotMarkerEntry(selectedHotspot);
      if (entry) {
        orientMarkerTowardWorldPoint(entry.object, entry.hotspot.modelSrc, camera.position);
      }
    }

    if (rawT >= 1) {
      const { focusing } = cameraTransition;
      cameraTransition = null;
      transitionActive = false;

      if (focusing) {
        applyFocusOrbitLimits();
      } else {
        applyMountainOrbitLimits();
      }

      setupOrbitPolarLimits();
      controls.update();
    }
  }

  function updateMarkerSelection() {
    for (const entry of markers) {
      const active = selectedHotspot?.id === entry.hotspot.id;
      applyMarkerMaterial(entry.object, active);
      entry.object.scale.setScalar(active ? entry.baseScale * 1.22 : entry.baseScale);
    }
  }

  /** @param {THREE.Box3} worldBox */
  async function buildMarkers(worldBox) {
    if (!scene || !markerGroup || !snowMountainModel) return;

    for (const entry of markers) {
      markerGroup.remove(entry.object);
      disposeMarkerGeometries(entry.object);
    }
    markers = [];

    /** @type {THREE.Vector3[]} */
    const positions = [];

    ABOUT_HOTSPOT_PATH.forEach((hotspot) => {
      const worldPos = hotspotSnowPosition(worldBox, snowMountainModel, hotspot, raycaster);
      positions.push(worldPos);
    });

    enforceHotspotSeparation(positions);

    for (let i = 0; i < positions.length; i++) {
      positions[i] = snapPositionToSnowSurface(
        positions[i],
        worldBox,
        snowMountainModel,
        raycaster
      );
    }

    for (let index = 0; index < ABOUT_HOTSPOT_PATH.length; index++) {
      const hotspot = ABOUT_HOTSPOT_PATH[index];
      const model = createMarkerParticleSphere(hotspot.modelSrc);
      const root = new THREE.Group();
      root.add(model);
      root.position.copy(positions[index]);
      root.userData.hotspot = hotspot;
      markerGroup.add(root);
      markers.push({ object: root, model, hotspot, baseScale: 1, spinSpeed: 0 });
    }

    updateMarkerSelection();
  }

  /** @param {PointerEvent} event */
  function onPointerDown(event) {
    pointerDownX = event.clientX;
    pointerDownY = event.clientY;
  }

  /** @param {PointerEvent} event */
  function onPointerClick(event) {
    if (!renderer || !camera || !markerGroup) return;

    const dx = event.clientX - pointerDownX;
    const dy = event.clientY - pointerDownY;
    if (dx * dx + dy * dy > 36) return;

    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(markerGroup.children, true);
    if (!hits.length) return;

    const hotspot = hotspotFromObject(hits[0].object);
    if (hotspot) selectedHotspot = hotspot;
  }

  function resizeRenderer() {
    if (!container || !camera || !renderer) return;
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (w <= 0 || h <= 0) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }

  function onVisibilityChange() {
    paused = document.hidden;
  }

  function animate() {
    if (!renderer || !scene || !camera) return;

    animationFrameId = requestAnimationFrame(animate);
    if (paused) return;

    const now = performance.now();

    for (const entry of markers) {
      const active = selectedHotspot?.id === entry.hotspot.id;
      updateMarkerParticlePulse(
        entry.model,
        now * 0.001 + entry.hotspot.azimuth * 4,
        active
      );
    }

    if (controls && cameraReady) {
      controls.enabled = !transitionActive;
    }

    if (cameraTransition) {
      updateCameraTransition(now);
    } else {
      controls?.update();
      clampCameraAboveSnow();
    }

    renderer.render(scene, camera);
  }

  function teardown() {
    initGeneration += 1;
    cancelAnimationFrame(animationFrameId);
    window.removeEventListener('resize', resizeRenderer);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    renderer?.domElement.removeEventListener('pointerdown', onPointerDown);
    renderer?.domElement.removeEventListener('pointerup', onPointerClick);

    for (const entry of markers) {
      markerGroup?.remove(entry.object);
      disposeMarkerGeometries(entry.object);
    }
    markers = [];

    controls?.dispose();
    controls = undefined;

    if (markerGroup) {
      scene?.remove(markerGroup);
      markerGroup = undefined;
    }

    if (snowMountainModel && scene) {
      scene.remove(snowMountainModel);
      snowMountainModel.traverse((o) => {
        if (!(o instanceof THREE.Mesh)) return;
        const mesh = o;
        mesh.geometry?.dispose();
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach((m) => m.dispose());
      });
      snowMountainModel = undefined;
    }

    if (renderer) {
      renderer.dispose();
      renderer.domElement.remove();
      renderer = undefined;
    }

    scene = undefined;
    camera = undefined;
    sceneFog = undefined;
    homeOrbitConfig = null;
    cameraFloorY = null;
    cameraReady = false;
    lastSelectedHotspotId = null;
    lastAnimationTime = 0;
    cameraTransition = null;
    transitionActive = false;
  }

  $effect(() => {
    const hotspot = selectedHotspot;
    updateMarkerSelection();
    if (!cameraReady) return;

    const id = hotspot?.id ?? null;
    if (id === lastSelectedHotspotId) return;

    lastSelectedHotspotId = id;
    startCameraTransition(hotspot);
  });

  onMount(() => {
    if (!browser) return;

    const gen = ++initGeneration;

    (async () => {
      await tick();
      await waitForContainerSize(container);
      if (gen !== initGeneration || !container) return;

      scene = new THREE.Scene();
      markerGroup = new THREE.Group();
      scene.add(markerGroup);

      sceneFog = new THREE.FogExp2(smogColor, 0.028);
      scene.fog = sceneFog;

      const w = Math.max(container.clientWidth, 1);
      const h = Math.max(container.clientHeight, 1);

      camera = new THREE.PerspectiveCamera(44, w / h, 0.1, 500);
      camera.position.set(0, HOME_CAM_Y_LOW, HOME_CAMERA_Z_START);

      renderer = new THREE.WebGLRenderer({
        antialias: window.devicePixelRatio <= 1.5,
        alpha: true,
        powerPreference: 'high-performance'
      });
      renderer.setSize(w, h);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      renderer.setClearColor(0xffffff, 1);
      container.appendChild(renderer.domElement);

      container.style.cursor = 'grab';

      scene.add(new THREE.AmbientLight(0xffffff, 2.0));
      const directionalLight = new THREE.DirectionalLight(0xeaeff5, 2.5);
      directionalLight.position.set(5, 10, 7);
      scene.add(directionalLight);

      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = false;
      controls.enablePan = true;
      controls.screenSpacePanning = true;
      controls.panSpeed = 0.85;
      controls.enableZoom = true;
      controls.zoomSpeed = 0.75;
      controls.rotateSpeed = 0.65;
      controls.mouseButtons = {
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.PAN
      };
      controls.touches = {
        ONE: THREE.TOUCH.ROTATE,
        TWO: THREE.TOUCH.DOLLY_PAN
      };

      renderer.domElement.addEventListener('pointerdown', onPointerDown);
      renderer.domElement.addEventListener('pointerup', onPointerClick);
      window.addEventListener('resize', resizeRenderer);
      document.addEventListener('visibilitychange', onVisibilityChange);

      resizeRenderer();
      animate();

      try {
        const gltf = await preloadMountainGltf();
        if (gen !== initGeneration || !scene || !controls || !camera) return;

        snowMountainModel = gltf.scene.clone(true);
        const { mountainCenter, snowField, orbitRadius, topDownHeight } =
          fitMountainModel(snowMountainModel);
        setupMountainRenderMaterials(snowMountainModel);
        scene.add(snowMountainModel);

        _worldBox.setFromObject(snowMountainModel);
        homeOrbitConfig = buildHomeOrbitConfig(
          mountainCenter,
          snowField,
          orbitRadius,
          topDownHeight
        );
        cameraFloorY = snowField.y - 0.2;

        try {
          await buildMarkers(_worldBox);
        } catch (markerErr) {
          console.error('[ExplorableMountainScene] creazione marker fallita:', markerErr);
        }

        applyHomeHeroCamera(camera, homeOrbitConfig, _heroLookAt);
        controls.target.copy(_heroLookAt);
        applyMountainOrbitLimits();
        setupOrbitPolarLimits();
        controls.update();
        cameraReady = true;
        controls.enabled = true;
        lastSelectedHotspotId = selectedHotspot?.id ?? null;

        resizeRenderer();
      } catch (err) {
        console.error('[ExplorableMountainScene] caricamento montagna fallito:', err);
      }
    })();

    return teardown;
  });
</script>

<div class="three-canvas" bind:this={container}></div>

<style>
  .three-canvas {
    position: relative;
    width: 100%;
    height: 100%;
    touch-action: none;
    overflow: hidden;
  }
</style>
