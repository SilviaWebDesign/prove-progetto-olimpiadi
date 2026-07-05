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
    getMarkerFocusPoint,
    panFocusToViewportX,
    sampleSmoothCameraTransition,
    sampleUnfocusTransition,
  getHotspotPlacement,
  isAboutMobileLayout,
  MIN_HOTSPOT_SPACING
} from './aboutHotspots.js';
  import {
    createMarkerParticleSphere,
    applyMarkerMaterial,
    disposeMarkerGeometries,
    updateMarkerParticlePulse
  } from './aboutMarkerModels.js';

  const FOCUS_CAMERA_ZOOM = 1.08;
  const FOCUS_TRANSITION_MS = 1800;
  const HERO_TRANSITION_MS = 1400;
  /** Vista iniziale about: lato opposto rispetto alla home. */
  const ABOUT_HERO_ANGLE_OFFSET = Math.PI;
  /** Zoom hero about (più basso = montagna più lontana). */
  const ABOUT_HERO_ZOOM = HOME_HERO_ZOOM * 0.82;

  /** Pan viewport applicato all'ultimo focus (per smontarlo in deselezione). */
  const storedFocusPan = {
    cam: new THREE.Vector3(),
    target: new THREE.Vector3()
  };

  /** Smoothstep 0→1 */
  function smoothstep(t) {
    const x = THREE.MathUtils.clamp(t, 0, 1);
    return x * x * (3 - 2 * x);
  }

  const _tmpTarget = new THREE.Vector3();

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
  /** Pose hero salvata all'init — destinazione esatta della deselezione. */
  const _storedHeroCam = new THREE.Vector3();
  const _storedHeroTarget = new THREE.Vector3();
  let heroPoseStored = false;
  const _camOffset = new THREE.Vector3();
  const _camSpherical = new THREE.Spherical();
  const _centerSpherical = new THREE.Spherical();
  const MOUNTAIN_MIN_POLAR = 0.25;
  const MOUNTAIN_MAX_POLAR = Math.PI / 2 - 0.1;
  /** Quota minima camera (linea neve / base render). */
  /** @type {number | null} */
  let cameraFloorY = null;
  let cameraReady = false;
  /** @type {string | null} */
  let lastSelectedHotspotId = null;
  let transitionActive = false;
  /** @type {{
   *   fromCam: THREE.Vector3;
   *   fromTarget: THREE.Vector3;
   *   fromZoom: number;
   *   toCam: THREE.Vector3;
   *   toTarget: THREE.Vector3;
   *   panCam: THREE.Vector3;
   *   panTarget: THREE.Vector3;
   *   toZoom: number;
   *   startTime: number;
   *   duration: number;
   *   toFocus: boolean;
   * } | null} */
  let cameraTransition = null;
  let mobileLayout = false;

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
  }

  /** @param {OrbitControls} ctrl */
  function resetOrbitControlDeltas(ctrl) {
    ctrl._sphericalDelta.set(0, 0, 0);
    ctrl._panOffset.set(0, 0, 0);
    ctrl._scale = 1;
  }

  /** Sincronizza OrbitControls senza clamp che alterano posizione/angolo. */
  function syncControlsToCameraPose() {
    if (!controls || !camera) return;

    resetOrbitControlDeltas(controls);

    const minD = controls.minDistance;
    const maxD = controls.maxDistance;
    const minP = controls.minPolarAngle;
    const maxP = controls.maxPolarAngle;

    controls.minDistance = 0;
    controls.maxDistance = Infinity;
    controls.minPolarAngle = 0;
    controls.maxPolarAngle = Math.PI;
    controls.update();

    controls.minDistance = minD;
    controls.maxDistance = maxD;
    controls.minPolarAngle = minP;
    controls.maxPolarAngle = maxP;
  }

  function applyCameraTransitionPose(t) {
    if (!cameraTransition || !camera || !controls) return;

    const eased = smoothstep(t);
    const {
      fromCam,
      fromTarget,
      fromZoom,
      toCam,
      toTarget,
      panCam,
      panTarget,
      toZoom
    } = cameraTransition;

    const unfocusing = !cameraTransition.toFocus;
    const { cam, target } =
      unfocusing && homeOrbitConfig
        ? sampleUnfocusTransition(
            fromCam,
            toCam,
            fromTarget,
            toTarget,
            homeOrbitConfig.center,
            eased,
            { minPhi: MOUNTAIN_MIN_POLAR, maxPhi: MOUNTAIN_MAX_POLAR }
          )
        : sampleSmoothCameraTransition(fromCam, toCam, fromTarget, toTarget, eased);

    const panWeight = cameraTransition.toFocus ? eased : 1 - eased;

    camera.position.copy(cam).addScaledVector(panCam, panWeight);
    controls.target.copy(target).addScaledVector(panTarget, panWeight);
    camera.zoom = THREE.MathUtils.lerp(fromZoom, toZoom, eased);
    camera.updateProjectionMatrix();
    camera.up.set(0, 1, 0);
    camera.lookAt(controls.target);
    clampCameraAboveSnow(
      unfocusing
        ? { pivot: _storedHeroTarget, clampCenter: true }
        : undefined
    );
  }

  function finishCameraTransition() {
    if (!cameraTransition || !camera || !controls) return;

    const { toFocus } = cameraTransition;

    if (toFocus) {
      applyCameraTransitionPose(1);
      clampCameraAboveSnow();
      storedFocusPan.cam.copy(cameraTransition.panCam);
      storedFocusPan.target.copy(cameraTransition.panTarget);
      applyFocusOrbitLimits();
    } else if (heroPoseStored) {
      camera.position.copy(_storedHeroCam);
      controls.target.copy(_storedHeroTarget);
      camera.zoom = ABOUT_HERO_ZOOM;
      camera.updateProjectionMatrix();
      camera.up.set(0, 1, 0);
      camera.lookAt(_storedHeroTarget);
      applyMountainOrbitLimits();
      setupOrbitPolarLimits();
      storedFocusPan.cam.set(0, 0, 0);
      storedFocusPan.target.set(0, 0, 0);
    } else {
      applyCameraTransitionPose(1);
      clampCameraAboveSnow({ pivot: _storedHeroTarget, clampCenter: true });
      applyMountainOrbitLimits();
      setupOrbitPolarLimits();
      storedFocusPan.cam.set(0, 0, 0);
      storedFocusPan.target.set(0, 0, 0);
    }

    syncControlsToCameraPose();
    clampCameraAboveSnow(toFocus ? undefined : { pivot: _storedHeroTarget, clampCenter: true });

    cameraTransition = null;
    transitionActive = false;
    controls.enabled = true;
  }

  /** Impedisce di ruotare la camera sotto la montagna. */
  function setupOrbitPolarLimits() {
    if (!controls || !camera || !controls.target) return;

    controls.minPolarAngle = MOUNTAIN_MIN_POLAR;
    controls.maxPolarAngle = MOUNTAIN_MAX_POLAR;
  }

  function applyFocusOrbitLimits() {
    if (!controls) return;
    const dist = focusCameraDistance(_worldBox);
    controls.minDistance = dist * 0.55;
    controls.maxDistance = dist * 1.3;
    controls.minPolarAngle = MOUNTAIN_MIN_POLAR;
    controls.maxPolarAngle = MOUNTAIN_MAX_POLAR;
  }

  /**
   * Mantiene la camera sopra la linea neve e sotto il limite polare.
   * @param {{ pivot?: THREE.Vector3; clampCenter?: boolean }} [options]
   */
  function clampCameraAboveSnow(options = {}) {
    if (!camera || !controls || cameraFloorY == null) return;

    const pivot = options.pivot ?? controls.target;

    _camOffset.subVectors(camera.position, pivot);
    const dist = _camOffset.length();
    if (dist > 1e-4) {
      _camSpherical.setFromVector3(_camOffset);
      let changed = false;

      if (_camSpherical.phi > MOUNTAIN_MAX_POLAR) {
        _camSpherical.phi = MOUNTAIN_MAX_POLAR;
        changed = true;
      }
      if (_camSpherical.phi < MOUNTAIN_MIN_POLAR) {
        _camSpherical.phi = MOUNTAIN_MIN_POLAR;
        changed = true;
      }

      if (changed) {
        _camOffset.setFromSpherical(_camSpherical);
        camera.position.copy(pivot).add(_camOffset);
      }
    }

    if (options.clampCenter && homeOrbitConfig) {
      _camOffset.subVectors(camera.position, homeOrbitConfig.center);
      const centerDist = _camOffset.length();
      if (centerDist > 1e-4) {
        _centerSpherical.setFromVector3(_camOffset);
        let centerChanged = false;

        if (_centerSpherical.phi > MOUNTAIN_MAX_POLAR) {
          _centerSpherical.phi = MOUNTAIN_MAX_POLAR;
          centerChanged = true;
        }
        if (_centerSpherical.phi < MOUNTAIN_MIN_POLAR) {
          _centerSpherical.phi = MOUNTAIN_MIN_POLAR;
          centerChanged = true;
        }

        if (centerChanged) {
          _camOffset.setFromSpherical(_centerSpherical);
          camera.position.copy(homeOrbitConfig.center).add(_camOffset);
        }
      }
    }

    if (camera.position.y < cameraFloorY) {
      camera.position.y = cameraFloorY;
    }

    camera.lookAt(controls.target);
  }

  /** @returns {{ cam: THREE.Vector3; target: THREE.Vector3 }} */
  function getHeroCameraPose() {
    if (heroPoseStored) {
      return {
        cam: _storedHeroCam.clone(),
        target: _storedHeroTarget.clone()
      };
    }

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
    const panCam = new THREE.Vector3();
    const panTarget = new THREE.Vector3();
    let toZoom = ABOUT_HERO_ZOOM;
    const toFocus = hotspot != null;

    if (hotspot) {
      const markerPos = getHotspotMarkerPosition(hotspot);
      const focusPoint = getHotspotFocusPoint(hotspot);
      if (!markerPos || !focusPoint) return;

      toTarget = focusPoint.clone();
      toCam = computeFocusCameraPosition(markerPos, focusPoint, homeOrbitConfig.center, _worldBox);
      if (snowMountainModel) {
        toCam = clampFocusCameraPosition(markerPos, toCam, snowMountainModel, raycaster);
      }

      const savedCam = camera.position.clone();
      const savedTarget = controls.target.clone();
      _tmpTarget.copy(toTarget);
      camera.position.copy(toCam);
      camera.lookAt(_tmpTarget);
      panFocusToViewportX(camera, _tmpTarget, focusPoint);
      panCam.copy(camera.position).sub(toCam);
      panTarget.copy(_tmpTarget).sub(toTarget);
      camera.position.copy(savedCam);
      controls.target.copy(savedTarget);

      toZoom = FOCUS_CAMERA_ZOOM;
    } else {
      const hero = getHeroCameraPose();
      toCam = hero.cam;
      toTarget = hero.target;
      panCam.copy(storedFocusPan.cam);
      panTarget.copy(storedFocusPan.target);
      // fromCam/fromTarget includono già il pan del focus — usa la pose base per l'interp.
      fromCam.sub(panCam);
      fromTarget.sub(panTarget);
    }

    transitionActive = true;
    resetOrbitControlDeltas(controls);
    controls.enabled = false;

    cameraTransition = {
      fromCam,
      fromTarget,
      fromZoom,
      toCam,
      toTarget,
      panCam,
      panTarget,
      toZoom,
      startTime: performance.now(),
      duration: toFocus ? FOCUS_TRANSITION_MS : HERO_TRANSITION_MS,
      toFocus
    };
  }

  function updateCameraTransition() {
    if (!cameraTransition || !camera || !controls) return;

    const rawT = Math.min(
      (performance.now() - cameraTransition.startTime) / cameraTransition.duration,
      1
    );

    applyCameraTransitionPose(rawT);
    updateMarkerScales();

    if (rawT >= 1) {
      finishCameraTransition();
    }
  }

  function updateMarkerSelection() {
    for (const entry of markers) {
      const active = selectedHotspot?.id === entry.hotspot.id;
      applyMarkerMaterial(entry.object, active);
    }
  }

  function updateMarkerScales() {
    for (const entry of markers) {
      const active = selectedHotspot?.id === entry.hotspot.id;
      const targetScale = active ? entry.baseScale * 1.22 : entry.baseScale;
      const nextScale = THREE.MathUtils.lerp(entry.object.scale.x, targetScale, 0.1);
      entry.object.scale.setScalar(nextScale);
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
    const useMobileLayout = isAboutMobileLayout();

    ABOUT_HOTSPOT_PATH.forEach((hotspot) => {
      const placement = getHotspotPlacement(hotspot, useMobileLayout);
      const worldPos = hotspotSnowPosition(
        worldBox,
        snowMountainModel,
        { ...hotspot, ...placement },
        raycaster
      );
      positions.push(worldPos);
    });

    enforceHotspotSeparation(
      positions,
      useMobileLayout ? MIN_HOTSPOT_SPACING * 0.85 : MIN_HOTSPOT_SPACING
    );

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

    const nextMobileLayout = isAboutMobileLayout();
    if (nextMobileLayout !== mobileLayout && snowMountainModel) {
      mobileLayout = nextMobileLayout;
      buildMarkers(_worldBox);
    } else {
      mobileLayout = nextMobileLayout;
    }
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
      updateCameraTransition();
    } else {
      clampCameraAboveSnow();
      updateMarkerScales();
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
        homeOrbitConfig.startAngle += ABOUT_HERO_ANGLE_OFFSET;
        cameraFloorY = snowField.y - 0.2;
        mobileLayout = isAboutMobileLayout();

        try {
          await buildMarkers(_worldBox);
        } catch (markerErr) {
          console.error('[ExplorableMountainScene] creazione marker fallita:', markerErr);
        }

        applyHomeHeroCamera(camera, homeOrbitConfig, _heroLookAt);
        controls.target.copy(_heroLookAt);
        camera.zoom = ABOUT_HERO_ZOOM;
        camera.updateProjectionMatrix();
        applyMountainOrbitLimits();
        setupOrbitPolarLimits();
        controls.update();
        _storedHeroCam.copy(camera.position);
        _storedHeroTarget.copy(_heroLookAt);
        heroPoseStored = true;
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
