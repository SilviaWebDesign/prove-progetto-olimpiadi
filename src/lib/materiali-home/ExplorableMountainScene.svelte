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
    homeOrbitDistanceLimits,
    setupMountainRenderMaterials,
    applyHomeHeroCamera,
    HOME_CAM_Y_LOW,
    HOME_CAMERA_Z_START,
    HOME_HERO_ZOOM,
    HOME_LOOK_AT_Y_OFFSET
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
    panFocusToViewport,
    FOCUS_VIEWPORT_X,
    FOCUS_VIEWPORT_Y,
    FOCUS_VIEWPORT_X_MOBILE,
    FOCUS_VIEWPORT_Y_MOBILE,
    FOCUS_CAMERA_Y_LIFT_MOBILE,
    sampleSmoothCameraTransition,
    sampleUnfocusTransition,
    getHotspotPlacement,
    isAboutMobileLayout,
    isAboutPanelMobileLayout
  } from './aboutHotspots.js';
  import {
    createMarkerParticleSphere,
    applyMarkerMaterial,
    disposeMarkerGeometries,
    updateMarkerParticlePulse,
    updateMarkerParticleScatter,
    resetMarkerParticleScatter
  } from './aboutMarkerModels.js';

  const FOCUS_CAMERA_ZOOM = 1.08;
  /** Su mobile: quasi nessuno zoom aggiuntivo al focus. */
  const FOCUS_CAMERA_ZOOM_MOBILE = 0.99;
  const FOCUS_TRANSITION_MS = 1800;
  /** Transizione tra sfere già in focus: più breve e reattiva. */
  const FOCUS_HOP_TRANSITION_MS = 1700;
  const HERO_TRANSITION_MS = 1400;
  /** Vista iniziale about: lato opposto rispetto alla home. */
  const ABOUT_HERO_ANGLE_OFFSET = Math.PI;
  /** Zoom hero about (invariato). */
  const ABOUT_HERO_ZOOM = HOME_HERO_ZOOM * 0.82;
  /**
   * Angolo polare hero about mobile (radianti): più basso = vista più dall'alto.
   * ~0.2 ≈ vista zenitale; ~0.55 ≈ obliqua; ~1.12 ≈ laterale.
   */
  const ABOUT_HERO_POLAR_MOBILE = 0.2;
  const ABOUT_HERO_POLAR_MAX = 0.32;
  const ABOUT_HERO_YAW_MOBILE = 0.12;
  /** Zoom più largo per la vista zenitale mobile. */
  const ABOUT_HERO_ZOOM_MOBILE = ABOUT_HERO_ZOOM * 0.72;

  const HOVER_MARKER_SCALE = 1.14;
  const HOVER_SCALE_LERP = 0.28;
  const MARKER_SCALE_LERP = 0.14;
  const ACTIVE_MARKER_SCALE = 1.22;
  /** Sfere più grandi su mobile per facilitare il tap. */
  const MOBILE_MARKER_BASE_SCALE = 1.55;
  const MARKER_FLOAT_AMPLITUDE = 0.24;
  const MARKER_FLOAT_SPEED = 0.42;
  const FOCUS_FLOAT_SPEED = 0.15;
  const FOCUS_MOTION_PHASE_SCALE = 0.32;

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

  /** Easing più rapido per i passaggi tra sfere. */
  function easeOutCubic(t) {
    const x = THREE.MathUtils.clamp(t, 0, 1);
    return 1 - (1 - x) ** 3;
  }

  const _tmpTarget = new THREE.Vector3();

  const smogColor = '#ffffff';
  const MOUNTAIN_BLUR_MAX = 2.4;
  const MOUNTAIN_BLUR_LERP = 0.1;
  /** Quanto la montagna si schiarisce al focus (mantenendo contrasto visibile). */
  const MOUNTAIN_FOCUS_WHITE_MAX = 0.38;
  const MOUNTAIN_FOCUS_FOG_BASE = 0.028;
  const MOUNTAIN_FOCUS_FOG_BOOST = 0.022;

  /** @type {THREE.WebGLRenderTarget | undefined} */
  let mountainBlurRT;
  /** @type {THREE.Scene | undefined} */
  let mountainBlurScene;
  /** @type {THREE.OrthographicCamera | undefined} */
  let mountainBlurCamera;
  /** @type {THREE.ShaderMaterial | undefined} */
  let mountainBlurMaterial;
  let mountainBlurCurrent = 0;
  const _mountainWhite = new THREE.Color(0xf4f6f8);
  /** @type {Map<THREE.Material, THREE.Color>} */
  const mountainBaseColors = new Map();

  /** @type {{ selectedHotspot?: import('./aboutHotspots.js').AboutHotspot | null; hoveredHotspot?: import('./aboutHotspots.js').AboutHotspot | null }} */
  let { selectedHotspot = $bindable(null), hoveredHotspot = $bindable(null) } = $props();

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
  /** Min polare about: consente inclinazione più dall'alto rispetto alla home. */
  const MOUNTAIN_MIN_POLAR = 0.15;
  const MOUNTAIN_MAX_POLAR = Math.PI / 2 - 0.1;
  const _refCam = new THREE.Vector3();
  const _refTarget = new THREE.Vector3();
  const _heroProj = new THREE.Vector3();
  let focusParticleHover = false;
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
  let panelMobileLayout = false;

  function isAboutMobileHeroView() {
    return isAboutPanelMobileLayout();
  }

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

  /** Montagna opaca: occlusione corretta delle sfere dietro il mesh. */
  function configureAboutMountainMaterials(object) {
    object.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const mat of mats) {
        if (!mat) continue;
        mat.transparent = false;
        mat.opacity = 1;
        mat.depthWrite = true;
        mat.depthTest = true;
        mat.needsUpdate = true;
      }
    });
  }

  /** @param {THREE.Object3D} object */
  function cacheMountainBaseColors(object) {
    mountainBaseColors.clear();
    object.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const mat of mats) {
        if (mat?.color) mountainBaseColors.set(mat, mat.color.clone());
      }
    });
  }

  /** @param {number} amount 0–1 */
  function applyMountainFocusLook(amount) {
    const whiteMix = THREE.MathUtils.clamp(amount, 0, 1) * MOUNTAIN_FOCUS_WHITE_MAX;
    for (const [mat, base] of mountainBaseColors) {
      mat.color.copy(base).lerp(_mountainWhite, whiteMix);
    }
    if (sceneFog) {
      sceneFog.density = MOUNTAIN_FOCUS_FOG_BASE + amount * MOUNTAIN_FOCUS_FOG_BOOST;
    }
    if (mountainBlurMaterial) {
      mountainBlurMaterial.uniforms.whitenAmount.value = whiteMix;
    }
  }

  /** @param {boolean} enabled */
  function setMountainColorWrite(enabled) {
    if (!snowMountainModel) return;
    snowMountainModel.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const mat of mats) {
        if (mat) mat.colorWrite = enabled;
      }
    });
  }

  /** @param {number} w @param {number} h */
  function initMountainBlur(w, h) {
    disposeMountainBlur();
    const dpr = renderer?.getPixelRatio() ?? 1;
    const rw = Math.max(1, Math.round(w * dpr));
    const rh = Math.max(1, Math.round(h * dpr));

    mountainBlurRT = new THREE.WebGLRenderTarget(rw, rh);
    mountainBlurScene = new THREE.Scene();
    mountainBlurCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    mountainBlurMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: mountainBlurRT.texture },
        resolution: { value: new THREE.Vector2(rw, rh) },
        blurRadius: { value: 0 },
        whitenAmount: { value: 0 }
      },
      vertexShader: /* glsl */`
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: /* glsl */`
        uniform sampler2D tDiffuse;
        uniform vec2 resolution;
        uniform float blurRadius;
        uniform float whitenAmount;
        varying vec2 vUv;

        void main() {
          vec4 color;
          if (blurRadius < 0.01) {
            color = texture2D(tDiffuse, vUv);
          } else {
            color = vec4(0.0);
            float total = 0.0;
            vec2 px = blurRadius / resolution;
            for (float x = -2.0; x <= 2.0; x += 1.0) {
              for (float y = -2.0; y <= 2.0; y += 1.0) {
                float weight = 1.0 - length(vec2(x, y)) * 0.14;
                color += texture2D(tDiffuse, vUv + vec2(x, y) * px) * weight;
                total += weight;
              }
            }
            color /= total;
          }
          color.rgb = mix(color.rgb, vec3(1.0), whitenAmount * smoothstep(0.98, 0.82, 1.0 - dot(color.rgb, vec3(0.299, 0.587, 0.114))));
          gl_FragColor = color;
        }
      `,
      depthTest: false,
      depthWrite: false,
    });

    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mountainBlurMaterial);
    mountainBlurScene.add(quad);
  }

  function disposeMountainBlur() {
    mountainBlurRT?.dispose();
    mountainBlurMaterial?.dispose();
    mountainBlurRT = undefined;
    mountainBlurScene = undefined;
    mountainBlurCamera = undefined;
    mountainBlurMaterial = undefined;
    mountainBlurCurrent = 0;
  }

  function updateMountainBlur() {
    if (!mountainBlurMaterial) return;
    const target = selectedHotspot ? MOUNTAIN_BLUR_MAX : 0;
    mountainBlurCurrent += (target - mountainBlurCurrent) * MOUNTAIN_BLUR_LERP;
    mountainBlurMaterial.uniforms.blurRadius.value = mountainBlurCurrent;
    const focusAmount = MOUNTAIN_BLUR_MAX > 0 ? mountainBlurCurrent / MOUNTAIN_BLUR_MAX : 0;
    applyMountainFocusLook(focusAmount);
  }

  function renderScene() {
    if (!renderer || !scene || !camera) return;

    updateMountainBlur();

    const useBlur =
      !transitionActive &&
      mountainBlurCurrent > 0.05 &&
      mountainBlurRT &&
      mountainBlurScene &&
      mountainBlurCamera &&
      snowMountainModel &&
      markerGroup;

    if (!useBlur) {
      renderer.setRenderTarget(null);
      renderer.render(scene, camera);
      return;
    }

    const markersWereVisible = markerGroup.visible;
    markerGroup.visible = false;

    renderer.setRenderTarget(mountainBlurRT);
    renderer.setClearColor(0xffffff, 1);
    renderer.clear();
    renderer.render(scene, camera);

    renderer.setRenderTarget(null);
    renderer.setClearColor(0xffffff, 1);
    renderer.clear();
    renderer.render(mountainBlurScene, mountainBlurCamera);

    markerGroup.visible = markersWereVisible;
    setMountainColorWrite(false);

    const prevAutoClear = renderer.autoClear;
    renderer.autoClear = false;

    markerGroup.visible = false;
    renderer.clearDepth();
    renderer.render(scene, camera);

    markerGroup.visible = markersWereVisible;
    snowMountainModel.visible = false;
    renderer.render(scene, camera);

    snowMountainModel.visible = true;
    setMountainColorWrite(true);
    renderer.render(scene, camera);
    renderer.autoClear = prevAutoClear;
  }

  /**
   * Pose hero about: mobile zenitale; desktop come hero home (lato opposto).
   * @param {THREE.PerspectiveCamera} cam
   * @param {ReturnType<typeof buildHomeOrbitConfig>} orbitConfig
   * @param {THREE.Vector3} targetOut
   */
  function applyAboutHeroCamera(cam, orbitConfig, targetOut, mobile = isAboutMobileHeroView()) {
    const angle = orbitConfig.startAngle;

    if (mobile) {
      const lookAt = targetOut.copy(orbitConfig.center);

      _refTarget.copy(orbitConfig.center).add(new THREE.Vector3(0, HOME_LOOK_AT_Y_OFFSET, 0));
      _refCam.set(
        orbitConfig.center.x + Math.sin(angle) * orbitConfig.radius,
        orbitConfig.orbitY,
        orbitConfig.center.z + Math.cos(angle) * orbitConfig.radius
      );
      const distance = _refCam.distanceTo(_refTarget);

      _camSpherical.radius = distance;
      _camSpherical.phi = ABOUT_HERO_POLAR_MOBILE;
      _camSpherical.theta = angle + ABOUT_HERO_YAW_MOBILE;
      _camOffset.setFromSpherical(_camSpherical);
      cam.position.copy(lookAt).add(_camOffset);

      cam.zoom = ABOUT_HERO_ZOOM_MOBILE;
      cam.updateProjectionMatrix();
      cam.up.set(0, 1, 0);
      cam.lookAt(lookAt);
      return lookAt;
    }

    return applyHomeHeroCamera(cam, orbitConfig, targetOut);
  }

  function fitHeroCameraToMarkers(markerPoints, padding = 0.1) {
    if (!camera || !controls || markerPoints.length === 0) return;

    const ndcPad = padding * 2;
    const boundsMin = -1 + ndcPad;
    const boundsMax = 1 - ndcPad;
    const baseZoom = ABOUT_HERO_ZOOM_MOBILE;
    const minZoom = baseZoom * 0.5;

    for (let iter = 0; iter < 14; iter++) {
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;

      for (const point of markerPoints) {
        _heroProj.copy(point).project(camera);
        minX = Math.min(minX, _heroProj.x);
        maxX = Math.max(maxX, _heroProj.x);
        minY = Math.min(minY, _heroProj.y);
        maxY = Math.max(maxY, _heroProj.y);
      }

      const inside =
        minX >= boundsMin &&
        maxX <= boundsMax &&
        minY >= boundsMin &&
        maxY <= boundsMax;
      if (inside) break;

      const centerX = (minX + maxX) * 0.5;
      const centerY = (minY + maxY) * 0.5;
      const spanX = Math.max(maxX - minX, 0.001);
      const spanY = Math.max(maxY - minY, 0.001);
      const availX = boundsMax - boundsMin;
      const availY = boundsMax - boundsMin;
      const zoomScale = Math.min(availX / spanX, availY / spanY, 1);

      if (zoomScale < 0.98) {
        camera.zoom = Math.max(minZoom, camera.zoom * zoomScale * 0.96);
        camera.updateProjectionMatrix();
      }

      _camOffset.subVectors(camera.position, controls.target);
      _camSpherical.setFromVector3(_camOffset);
      _camSpherical.theta -= centerX * 0.22;
      _camSpherical.phi = THREE.MathUtils.clamp(
        _camSpherical.phi - centerY * 0.05,
        MOUNTAIN_MIN_POLAR,
        ABOUT_HERO_POLAR_MAX
      );
      _camOffset.setFromSpherical(_camSpherical);
      camera.position.copy(controls.target).add(_camOffset);
      camera.lookAt(controls.target);
    }
  }

  function refreshAboutHeroCameraPose() {
    if (!camera || !controls || !homeOrbitConfig) return;

    const mobileHero = isAboutMobileHeroView();
    applyAboutHeroCamera(camera, homeOrbitConfig, _heroLookAt, mobileHero);
    controls.target.copy(_heroLookAt);

    const markerPoints = markers.map((entry) => getMarkerFocusPoint(entry.object));
    if (mobileHero && markerPoints.length > 0) {
      fitHeroCameraToMarkers(markerPoints, 0.12);
    }

    _storedHeroCam.copy(camera.position);
    _storedHeroTarget.copy(controls.target);
    heroPoseStored = true;
    resetOrbitControlDeltas(controls);
    controls.update();
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

    const eased = cameraTransition.betweenFocuses ? easeOutCubic(t) : smoothstep(t);
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
    const betweenFocuses = cameraTransition.betweenFocuses === true;
    const { cam, target } =
      homeOrbitConfig && (unfocusing || betweenFocuses)
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
      refreshAboutHeroCameraPose();
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

    if (toFocus || !heroPoseStored) {
      syncControlsToCameraPose();
    }
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
    const dist = focusCameraDistance(_worldBox, isAboutPanelMobileLayout());
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

    const mobileHero = isAboutMobileHeroView();
    const angle = homeOrbitConfig.startAngle;

    if (mobileHero) {
      const lookAt = _heroLookAt.clone().copy(homeOrbitConfig.center);
      _refTarget.copy(homeOrbitConfig.center).add(new THREE.Vector3(0, HOME_LOOK_AT_Y_OFFSET, 0));
      _refCam.set(
        homeOrbitConfig.center.x + Math.sin(angle) * homeOrbitConfig.radius,
        homeOrbitConfig.orbitY,
        homeOrbitConfig.center.z + Math.cos(angle) * homeOrbitConfig.radius
      );
      const distance = _refCam.distanceTo(_refTarget);
      _camSpherical.radius = distance;
      _camSpherical.phi = ABOUT_HERO_POLAR_MOBILE;
      _camSpherical.theta = angle + ABOUT_HERO_YAW_MOBILE;
      _camOffset.setFromSpherical(_camSpherical);
      return {
        cam: lookAt.clone().add(_camOffset),
        target: lookAt
      };
    }

    const cam = new THREE.Vector3(
      homeOrbitConfig.center.x + Math.sin(angle) * homeOrbitConfig.radius,
      homeOrbitConfig.orbitY,
      homeOrbitConfig.center.z + Math.cos(angle) * homeOrbitConfig.radius
    );
    const target = _heroLookAt
      .clone()
      .copy(homeOrbitConfig.center)
      .add(new THREE.Vector3(0, HOME_LOOK_AT_Y_OFFSET, 0));
    return { cam, target };
  }

  /** @param {import('./aboutHotspots.js').AboutHotspot | null} hotspot */
  function getHotspotMarkerEntry(hotspot) {
    return markers.find((m) => m.hotspot.id === hotspot?.id) ?? null;
  }

  /** @param {number} clientX @param {number} clientY @param {ReturnType<typeof getHotspotMarkerEntry>} entry */
  function updateFocusParticleHover(clientX, clientY, entry) {
    if (!entry || !camera || !renderer) return;

    setPointerFromClient(clientX, clientY);
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObject(entry.object, true);

    focusParticleHover = hits.length > 0;
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

  function hasStoredFocusPan() {
    return storedFocusPan.cam.lengthSq() > 1e-6 || storedFocusPan.target.lengthSq() > 1e-6;
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
    let toZoom = isAboutMobileHeroView() ? ABOUT_HERO_ZOOM_MOBILE : HOME_HERO_ZOOM;
    const toFocus = hotspot != null;
    const betweenFocuses = toFocus && hasStoredFocusPan();

    if (hotspot) {
      const markerPos = getHotspotMarkerPosition(hotspot);
      const focusPoint = getHotspotFocusPoint(hotspot);
      if (!markerPos || !focusPoint) return;

      if (betweenFocuses) {
        fromCam.sub(storedFocusPan.cam);
        fromTarget.sub(storedFocusPan.target);
      }

      const mobileFocus = isAboutPanelMobileLayout();
      toTarget = focusPoint.clone();
      toCam = computeFocusCameraPosition(
        markerPos,
        focusPoint,
        homeOrbitConfig.center,
        _worldBox,
        mobileFocus
      );
      if (snowMountainModel) {
        toCam = clampFocusCameraPosition(markerPos, toCam, snowMountainModel, raycaster);
      }

      if (mobileFocus) {
        toCam.y += (_worldBox.max.y - _worldBox.min.y) * FOCUS_CAMERA_Y_LIFT_MOBILE;
      }

      const savedCam = camera.position.clone();
      const savedTarget = controls.target.clone();
      _tmpTarget.copy(toTarget);
      camera.position.copy(toCam);
      camera.lookAt(_tmpTarget);
      if (mobileFocus) {
        panFocusToViewport(
          camera,
          _tmpTarget,
          focusPoint,
          FOCUS_VIEWPORT_X_MOBILE,
          FOCUS_VIEWPORT_Y_MOBILE
        );
      } else {
        panFocusToViewport(
          camera,
          _tmpTarget,
          focusPoint,
          FOCUS_VIEWPORT_X,
          FOCUS_VIEWPORT_Y
        );
      }
      panCam.copy(camera.position).sub(toCam);
      panTarget.copy(_tmpTarget).sub(toTarget);
      camera.position.copy(savedCam);
      controls.target.copy(savedTarget);

      toZoom = mobileFocus ? FOCUS_CAMERA_ZOOM_MOBILE : FOCUS_CAMERA_ZOOM;
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
      duration: toFocus
        ? betweenFocuses
          ? FOCUS_HOP_TRANSITION_MS
          : FOCUS_TRANSITION_MS
        : HERO_TRANSITION_MS,
      toFocus,
      betweenFocuses
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
      const hovered =
        !isAboutPanelMobileLayout() && hoveredHotspot?.id === entry.hotspot.id;
      let targetScale = entry.baseScale;

      if (active) targetScale = entry.baseScale * ACTIVE_MARKER_SCALE;
      else if (hovered) targetScale = entry.baseScale * HOVER_MARKER_SCALE;

      const scaleLerp = active ? MARKER_SCALE_LERP : HOVER_SCALE_LERP;
      const nextScale = THREE.MathUtils.lerp(entry.object.scale.x, targetScale, scaleLerp);
      entry.object.scale.setScalar(nextScale);
    }
  }

  /** @param {THREE.Object3D} root @param {number} elapsedSeconds @param {boolean} [active] */
  function updateMarkerBob(root, elapsedSeconds, active = false) {
    const baseY = root.userData.baseY;
    if (baseY == null) return;

    const speed = active ? FOCUS_FLOAT_SPEED : MARKER_FLOAT_SPEED;
    const floatY = Math.sin(elapsedSeconds * Math.PI * 2 * speed) * MARKER_FLOAT_AMPLITUDE;
    root.position.y = baseY + floatY;
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
      root.userData.baseY = positions[index].y;
      root.userData.hotspot = hotspot;
      markerGroup.add(root);
      const baseScale = useMobileLayout ? MOBILE_MARKER_BASE_SCALE : 1;
      root.scale.setScalar(baseScale);
      markers.push({ object: root, model, hotspot, baseScale, spinSpeed: 0 });
    }

    updateMarkerSelection();
  }

  /** @param {PointerEvent} event */
  function onPointerDown(event) {
    pointerDownX = event.clientX;
    pointerDownY = event.clientY;
  }

  /** @param {number} clientX @param {number} clientY */
  function setPointerFromClient(clientX, clientY) {
    if (!renderer) return;
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  }

  /** @param {number} clientX @param {number} clientY */
  function pickHotspotAtClient(clientX, clientY) {
    if (!renderer || !camera || !markerGroup || transitionActive) return null;

    setPointerFromClient(clientX, clientY);
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(markerGroup.children, true);
    if (!hits.length) return null;

    return hotspotFromObject(hits[0].object);
  }

  /** @param {import('./aboutHotspots.js').AboutHotspot | null} hotspot */
  function updateCanvasCursor(hotspot) {
    if (!container) return;
    container.style.cursor = hotspot ? 'pointer' : 'grab';
  }

  /** @param {PointerEvent} event */
  function onPointerMove(event) {
    if (!renderer || !markerGroup || transitionActive) return;

    if (isAboutPanelMobileLayout()) {
      if (hoveredHotspot) hoveredHotspot = null;
      focusParticleHover = false;
      for (const entry of markers) {
        resetMarkerParticleScatter(entry.model);
      }
      updateCanvasCursor(null);
      return;
    }

    if (selectedHotspot) {
      const entry = getHotspotMarkerEntry(selectedHotspot);
      updateFocusParticleHover(event.clientX, event.clientY, entry);
      return;
    }

    focusParticleHover = false;
    for (const entry of markers) {
      resetMarkerParticleScatter(entry.model);
    }

    const hotspot = pickHotspotAtClient(event.clientX, event.clientY);
    if ((hotspot?.id ?? null) !== (hoveredHotspot?.id ?? null)) {
      hoveredHotspot = hotspot;
    }
    updateCanvasCursor(hotspot);
  }

  function onPointerLeave() {
    hoveredHotspot = null;
    focusParticleHover = false;
    for (const entry of markers) {
      resetMarkerParticleScatter(entry.model);
    }
    updateCanvasCursor(null);
  }

  /** @param {PointerEvent} event */
  function onPointerClick(event) {
    if (!renderer || !camera || !markerGroup) return;

    const dx = event.clientX - pointerDownX;
    const dy = event.clientY - pointerDownY;
    if (dx * dx + dy * dy > 36) return;

    const hotspot = pickHotspotAtClient(event.clientX, event.clientY);
    if (hotspot) selectedHotspot = hotspot;
  }

  function dismissFocusByCameraMove() {
    if (!selectedHotspot || transitionActive) return;
    selectedHotspot = null;
  }

  function onOrbitControlStart() {
    dismissFocusByCameraMove();
  }

  /** @param {WheelEvent} _event */
  function onCanvasWheelWhileFocused(_event) {
    dismissFocusByCameraMove();
  }

  function resizeRenderer() {
    if (!container || !camera || !renderer) return;
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (w <= 0 || h <= 0) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    initMountainBlur(w, h);

    const nextMobileLayout = isAboutMobileLayout();
    const nextPanelMobile = isAboutPanelMobileLayout();
    const mobileLayoutChanged = nextMobileLayout !== mobileLayout;
    const panelMobileChanged = nextPanelMobile !== panelMobileLayout;

    if (mobileLayoutChanged && snowMountainModel) {
      mobileLayout = nextMobileLayout;
      buildMarkers(_worldBox);
    } else {
      mobileLayout = nextMobileLayout;
    }

    panelMobileLayout = nextPanelMobile;

    if (!selectedHotspot && controls && snowMountainModel && (mobileLayoutChanged || panelMobileChanged || isAboutMobileHeroView())) {
      refreshAboutHeroCameraPose();
    }

    if (isAboutPanelMobileLayout()) {
      hoveredHotspot = null;
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
      const phase = now * 0.001 + entry.hotspot.azimuth * 4;
      const motionPhase = active ? phase * FOCUS_MOTION_PHASE_SCALE : phase;

      updateMarkerParticlePulse(entry.model, motionPhase, active);

      if (active) {
        updateMarkerParticleScatter(entry.model, phase, focusParticleHover ? 1 : 0, true);
      } else {
        resetMarkerParticleScatter(entry.model);
      }

      updateMarkerBob(entry.object, phase, active);
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

    renderScene();
  }

  function teardown() {
    initGeneration += 1;
    cancelAnimationFrame(animationFrameId);
    window.removeEventListener('resize', resizeRenderer);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    renderer?.domElement.removeEventListener('pointerdown', onPointerDown);
    renderer?.domElement.removeEventListener('pointermove', onPointerMove);
    renderer?.domElement.removeEventListener('pointerleave', onPointerLeave);
    renderer?.domElement.removeEventListener('pointerup', onPointerClick);
    renderer?.domElement.removeEventListener('wheel', onCanvasWheelWhileFocused);
    controls?.removeEventListener('start', onOrbitControlStart);

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

    disposeMountainBlur();
    mountainBaseColors.clear();
    applyMountainFocusLook(0);

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
    heroPoseStored = false;
  }

  $effect(() => {
    const hotspot = selectedHotspot;
    if (hotspot) {
      hoveredHotspot = null;
      focusParticleHover = false;
    }
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
      controls.addEventListener('start', onOrbitControlStart);

      renderer.domElement.addEventListener('pointerdown', onPointerDown);
      renderer.domElement.addEventListener('pointermove', onPointerMove);
      renderer.domElement.addEventListener('pointerleave', onPointerLeave);
      renderer.domElement.addEventListener('pointerup', onPointerClick);
      renderer.domElement.addEventListener('wheel', onCanvasWheelWhileFocused, { passive: true });
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
        configureAboutMountainMaterials(snowMountainModel);
        cacheMountainBaseColors(snowMountainModel);
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
        panelMobileLayout = isAboutPanelMobileLayout();

        try {
          await buildMarkers(_worldBox);
        } catch (markerErr) {
          console.error('[ExplorableMountainScene] creazione marker fallita:', markerErr);
        }

        applyMountainOrbitLimits();
        setupOrbitPolarLimits();
        refreshAboutHeroCameraPose();
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
