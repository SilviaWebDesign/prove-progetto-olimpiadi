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
    hotspotSurfacePosition,
    hotspotHorizontalDirection,
    ensureCardNearMountain,
    enforceHotspotSeparation,
    snapPositionToMountainSurface,
    computeFocusCameraPosition,
    clampFocusCameraPosition,
    focusCameraDistance,
    sampleOrbitFocusTransition
  } from './aboutHotspots.js';

  const FOCUS_CAMERA_ZOOM = 1.45;
  const CAMERA_TRANSITION_MS = 900;

  const smogColor = '#ffffff';
  const MARKER_RADIUS = 0.36;
  const MARKER_COLOR = 0x8a8d94;
  const MARKER_COLOR_ACTIVE = 0x6d7078;

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
   *   mesh: THREE.Mesh;
   *   hotspot: import('./aboutHotspots.js').AboutHotspot;
   *   baseScale: number;
   * }[]}
   */
  let markers = [];

  const _worldBox = new THREE.Box3();
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let pointerDownX = 0;
  let pointerDownY = 0;
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

  const markerGeometry = new THREE.SphereGeometry(MARKER_RADIUS, 20, 20);

  /** @param {boolean} [active] */
  function createMarkerMaterial(active = false) {
    return new THREE.MeshStandardMaterial({
      color: active ? MARKER_COLOR_ACTIVE : MARKER_COLOR,
      metalness: 0.92,
      roughness: 0.28,
      fog: true
    });
  }

  function applyMountainOrbitLimits() {
    if (!controls || !homeOrbitConfig) return;
    const limits = homeOrbitDistanceLimits(homeOrbitConfig);
    controls.minDistance = limits.min;
    controls.maxDistance = limits.max;
    controls.target.copy(_heroLookAt);
  }

  /** Imposta limiti verticali ampi (solo init e dopo transizioni). */
  function setupOrbitPolarLimits() {
    if (!controls || !camera || !controls.target) return;

    controls.minPolarAngle = 0.25;
    controls.maxPolarAngle = Math.PI / 2 + 0.62;
  }

  function applyFocusOrbitLimits() {
    if (!controls) return;
    const dist = focusCameraDistance(_worldBox);
    controls.minDistance = dist * 0.55;
    controls.maxDistance = dist * 1.3;
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
  function getHotspotMarkerPosition(hotspot) {
    const entry = markers.find((m) => m.hotspot.id === hotspot?.id);
    return entry?.mesh.position.clone() ?? null;
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
      const markerPos = getHotspotMarkerPosition(hotspot);
      if (!markerPos) return;

      toTarget = markerPos;
      toCam = computeFocusCameraPosition(markerPos, homeOrbitConfig.center, _worldBox);
      if (snowMountainModel) {
        toCam = clampFocusCameraPosition(markerPos, toCam, snowMountainModel, raycaster);
      }
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
      entry.mesh.material.color.setHex(active ? MARKER_COLOR_ACTIVE : MARKER_COLOR);
      entry.mesh.scale.setScalar(active ? entry.baseScale * 1.28 : entry.baseScale);
    }
  }

  /** @param {THREE.Box3} worldBox */
  function buildMarkers(worldBox) {
    if (!scene || !markerGroup || !snowMountainModel) return;

    for (const entry of markers) {
      markerGroup.remove(entry.mesh);
      entry.mesh.material.dispose();
    }
    markers = [];

    /** @type {THREE.Vector3[]} */
    const positions = [];

    ABOUT_HOTSPOT_PATH.forEach((hotspot) => {
      let worldPos = hotspotSurfacePosition(worldBox, snowMountainModel, hotspot, raycaster);
      worldPos = ensureCardNearMountain(
        worldPos,
        worldBox,
        snowMountainModel,
        hotspotHorizontalDirection(hotspot.azimuth),
        raycaster
      );
      positions.push(worldPos);
    });

    enforceHotspotSeparation(positions);

    for (let i = 0; i < positions.length; i++) {
      positions[i] = snapPositionToMountainSurface(
        positions[i],
        worldBox,
        snowMountainModel,
        raycaster
      );
    }

    ABOUT_HOTSPOT_PATH.forEach((hotspot, index) => {
      const mesh = new THREE.Mesh(markerGeometry, createMarkerMaterial());
      mesh.position.copy(positions[index]);
      mesh.userData.hotspot = hotspot;
      markerGroup.add(mesh);
      markers.push({ mesh, hotspot, baseScale: 1 });
    });

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
    const hits = raycaster.intersectObjects(markerGroup.children, false);
    if (!hits.length) return;

    const hotspot = hits[0].object.userData.hotspot;
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

    if (controls && cameraReady) {
      controls.enabled = !transitionActive;
    }

    if (cameraTransition) {
      updateCameraTransition(performance.now());
    } else {
      controls?.update();
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
      markerGroup?.remove(entry.mesh);
      entry.mesh.material.dispose();
    }
    markers = [];
    markerGeometry.dispose();

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

      sceneFog = new THREE.FogExp2(smogColor, 0.045);
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
        buildMarkers(_worldBox);

        applyHomeHeroCamera(camera, homeOrbitConfig, _heroLookAt);
        controls.target.copy(_heroLookAt);
        applyMountainOrbitLimits();
        setupOrbitPolarLimits();
        controls.update();
        cameraReady = true;
        controls.enabled = true;
        lastSelectedHotspotId = selectedHotspot?.id ?? null;

        resizeRenderer();
        animate();
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
