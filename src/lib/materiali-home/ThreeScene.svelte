<script>
  import { onMount, tick } from 'svelte';
  import { browser } from '$app/environment';
  import * as THREE from 'three';
  import {
    fitMountainModel,
    preloadMountainGltf,
    waitForContainerSize
  } from './mountainGltf.js';
  import {
    HOME_ORBIT_END,
    HOME_SNOW_DIVE_START,
    HOME_CARDS_START,
    HOME_CARDS_END,
    SNOW_ZONE_SCROLL
  } from './scrollStages.js';
  import { homeScrollProgress } from './homeScrollProgress.js';

  /** Offset Y rispetto all’inquadratura originale (camera più bassa) */
  const CAM_Y_LOW = -2.9;
  /** Rotazione orizzontale della vista top-down (90°) */
  const TOP_DOWN_YAW = Math.PI / 2;
  const smogColor = '#ffffff';

  let { snowZoneAt = SNOW_ZONE_SCROLL } = $props();

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
  let animationFrameId = 0;
  /** @type {THREE.Object3D | undefined} */
  let snowMountainModel;
  let initGeneration = 0;

  /** @type {{
   *   center: THREE.Vector3;
   *   snowField: THREE.Vector3;
   *   startAngle: number;
   *   orbitY: number;
   *   radius: number;
   *   topDownHeight: number;
   * } | null} */
  let orbitConfig = null;
  const _camPos = new THREE.Vector3();
  const _lookAt = new THREE.Vector3();
  const _orbitEndPos = new THREE.Vector3();
  const _orbitEndLookAt = new THREE.Vector3();
  const _snowApproachPos = new THREE.Vector3();
  const _snowApproachLookAt = new THREE.Vector3();
  const _snowCamPos = new THREE.Vector3();
  const _snowLookAt = new THREE.Vector3();
  const _snowDir = new THREE.Vector3();
  const _whiteColor = new THREE.Color(0xffffff);
  /** @type {{ material: THREE.Material, originalColor: THREE.Color }[]} */
  let mountainMaterials = [];

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function smoothstep(edge0, edge1, x) {
    const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
  }

  function easeInOutQuint(t) {
    return t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2;
  }

  /** Più alto = rotazione più lenta nelle fasi centrali dello scroll */
  const ORBIT_EASE_POWER = 1.45;

  /** Giro completo intorno alla montagna */
  const ORBIT_ARC = Math.PI * 2;

  function zoomAt(scroll) {
    const orbitU = clamp(scroll / Math.max(HOME_ORBIT_END, 0.01), 0, 1);
    const orbitZoom = easeInOutCubic(orbitU) * 0.85;
    const snowU = smoothstep(HOME_SNOW_DIVE_START, snowZoneAt, scroll);
    const snowZoom = easeInOutCubic(snowU) * 2.15;
    const deepSnowBoost = easeInOutCubic(smoothstep(0.55, 1, snowU)) * 0.85;
    return 1.2 + orbitZoom + snowZoom + deepSnowBoost;
  }

  /**
   * @param {number} angle
   * @param {number} radius
   * @param {typeof orbitConfig} cfg
   * @param {THREE.Vector3} target
   */
  function positionOnOrbit(angle, radius, cfg, target) {
    target.set(
      cfg.center.x + Math.sin(angle) * radius,
      cfg.orbitY,
      cfg.center.z + Math.cos(angle) * radius
    );
  }

  /**
   * Orbita completa, poi immersione verso il campo neve del modello.
   * @param {number} scroll
   */
  function sampleCameraAt(scroll) {
    const cfg = orbitConfig;
    if (!cfg) return false;

    const orbitSpan = Math.max(HOME_ORBIT_END, 0.01);
    const endAngle = cfg.startAngle + ORBIT_ARC;

    if (scroll <= HOME_SNOW_DIVE_START) {
      const rawT = clamp(scroll / orbitSpan, 0, 1);
      const orbitT = easeInOutQuint(Math.pow(rawT, ORBIT_EASE_POWER));
      const angle = cfg.startAngle + ORBIT_ARC * orbitT;
      positionOnOrbit(angle, cfg.radius, cfg, _camPos);
      _lookAt.copy(cfg.center).add(new THREE.Vector3(0, 2.2, 0));
      return true;
    }

    positionOnOrbit(endAngle, cfg.radius, cfg, _orbitEndPos);
    _orbitEndLookAt.copy(cfg.center).add(new THREE.Vector3(0, 2.2, 0));

    /* Verso il centro neve: direzione fine orbita → centro campo */
    _snowDir.set(
      cfg.snowField.x - _orbitEndPos.x,
      0,
      cfg.snowField.z - _orbitEndPos.z
    );
    if (_snowDir.lengthSq() < 0.01) {
      _snowDir.set(cfg.snowField.x - cfg.center.x, 0, cfg.snowField.z - cfg.center.z);
    }
    if (_snowDir.lengthSq() < 0.01) {
      _snowDir.set(0, 0, -1);
    } else {
      _snowDir.normalize();
    }

    /* Avvicinamento al centro (ancora fuori) */
    _snowApproachPos.copy(cfg.snowField).addScaledVector(_snowDir, -6.5);
    _snowApproachPos.y = cfg.snowField.y + 4.2;
    _snowApproachLookAt.copy(cfg.snowField);

    /* Immersione nel centro del volume neve */
    _snowCamPos.copy(cfg.snowField);
    _snowCamPos.y += 0.4;

    _snowLookAt.copy(_snowCamPos).addScaledVector(_snowDir, 10);
    _snowLookAt.y -= 0.2;

    const snowT = smoothstep(HOME_SNOW_DIVE_START, snowZoneAt, scroll);
    const eased = easeInOutCubic(snowT);

    if (eased < 0.42) {
      const t = eased / 0.42;
      const te = easeInOutCubic(t);
      _camPos.lerpVectors(_orbitEndPos, _snowApproachPos, te);
      _lookAt.lerpVectors(_orbitEndLookAt, _snowApproachLookAt, te);
    } else {
      const t = (eased - 0.42) / 0.58;
      const te = easeInOutCubic(t);
      _camPos.lerpVectors(_snowApproachPos, _snowCamPos, te);
      _lookAt.lerpVectors(_snowApproachLookAt, _snowLookAt, te);
    }

    return true;
  }

  /** @param {number} scroll */
  function applySnowWhiteout(scroll) {
    const whiteT = smoothstep(HOME_SNOW_DIVE_START, snowZoneAt, scroll);
    const insideT = smoothstep(0.38, 0.92, whiteT);
    if (!snowMountainModel) return;

    snowMountainModel.visible = insideT < 0.97;
    if (!snowMountainModel.visible) return;

    const meshOpacity = 1 - insideT * 0.96;
    for (const { material, originalColor } of mountainMaterials) {
      if ('color' in material && material.color instanceof THREE.Color) {
        material.color.copy(originalColor).lerp(_whiteColor, insideT * 0.9);
      }
      material.opacity = meshOpacity;
    }
  }

  /**
   * Vista dall'alto verso il basso — fase cards.
   * @param {number} cardsT 0→1
   */
  function sampleTopDownCamera(cardsT) {
    const cfg = orbitConfig;
    if (!cfg) return false;

    const eased = easeInOutCubic(clamp(cardsT, 0, 1));
    const height = cfg.topDownHeight * lerp(1.12, 1, eased);

    _camPos.set(cfg.center.x, cfg.center.y + height, cfg.center.z);
    _lookAt.copy(cfg.center);

    return true;
  }

  /**
   * @param {THREE.Vector3} mountainCenter
   * @param {THREE.Vector3} snowField
   * @param {number} orbitRadius
   * @param {number} topDownHeight
   */
  function buildOrbitConfig(mountainCenter, snowField, orbitRadius, topDownHeight) {
    const c = mountainCenter;
    const startCam = new THREE.Vector3(0, CAM_Y_LOW, 7.8);
    const dx = startCam.x - c.x;
    const dz = startCam.z - c.z;
    const startAngle = Math.atan2(dx, dz);
    const heroRadius = Math.hypot(dx, dz);

    orbitConfig = {
      center: c.clone(),
      snowField: snowField.clone(),
      startAngle,
      orbitY: c.y + CAM_Y_LOW + 1.1,
      radius: Math.max(orbitRadius, heroRadius, 12) * 0.82,
      topDownHeight
    };
  }

  /** @param {THREE.Object3D} object */
  function setupMountainMaterials(object) {
    mountainMaterials = [];
    object.traverse((o) => {
      if (!o.isMesh) return;
      const mesh = /** @type {THREE.Mesh} */ (o);
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const cloned = materials.map((mat) => {
        const material = mat.clone();
        material.transparent = true;
        material.fog = true;
        material.side = THREE.FrontSide;
        const color =
          'color' in material && material.color instanceof THREE.Color
            ? material.color.clone()
            : new THREE.Color(0xffffff);
        mountainMaterials.push({ material, originalColor: color });
        return material;
      });
      mesh.material = cloned.length === 1 ? cloned[0] : cloned;
    });
  }

  /** Montagna visibile solo prima della zona neve (niente fade sul mesh). */
  function setMountainVisible(visible) {
    if (!snowMountainModel) return;
    snowMountainModel.visible = visible;
    if (!visible) return;
    for (const { material, originalColor } of mountainMaterials) {
      if ('color' in material && material.color instanceof THREE.Color) {
        material.color.copy(originalColor);
      }
      material.opacity = 1;
    }
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

  function animate() {
    if (!renderer || !scene || !camera) return;

    animationFrameId = requestAnimationFrame(animate);

    const progress = homeScrollProgress.value;
    const inSnowGap = progress >= snowZoneAt && progress < HOME_CARDS_START;
    const inCardsPhase = progress >= HOME_CARDS_START;

    container?.classList.toggle('--snow-zone', inSnowGap);
    container?.classList.toggle('--cards-zone', inCardsPhase);

    if (inSnowGap) {
      if (snowMountainModel) snowMountainModel.visible = false;
      if (renderer.domElement) {
        renderer.domElement.style.visibility = 'hidden';
        renderer.domElement.style.opacity = '0';
      }
      return;
    }

    if (inCardsPhase) {
      const cardsT = smoothstep(HOME_CARDS_START, HOME_CARDS_END, progress);

      if (renderer.domElement) {
        renderer.domElement.style.visibility = 'visible';
        renderer.domElement.style.opacity = String(cardsT);
      }

      setMountainVisible(true);

      if (sampleTopDownCamera(cardsT)) {
        camera.position.copy(_camPos);
        camera.up.set(Math.cos(TOP_DOWN_YAW), 0, Math.sin(TOP_DOWN_YAW));
        camera.lookAt(_lookAt);
      }

      camera.zoom = lerp(1.05, 1.28, easeInOutCubic(cardsT));
      camera.updateProjectionMatrix();

      if (sceneFog) {
        sceneFog.density = lerp(0.03, 0.022, cardsT);
        sceneFog.color.setRGB(1, 1, 1);
      }

      renderer.setClearColor(0xffffff, 1);
      renderer.render(scene, camera);
      return;
    }

    if (renderer.domElement) {
      renderer.domElement.style.visibility = 'visible';
      renderer.domElement.style.opacity = '1';
    }

    const scroll = clamp(progress, 0, snowZoneAt);

    if (sampleCameraAt(scroll)) {
      camera.position.copy(_camPos);
      camera.up.set(0, 1, 0);
      camera.lookAt(_lookAt);
    } else {
      camera.position.set(0, CAM_Y_LOW, 7.8);
      camera.up.set(0, 1, 0);
      camera.lookAt(0, 0, 0);
    }

    camera.zoom = zoomAt(scroll);
    camera.updateProjectionMatrix();

    const whiteT = smoothstep(HOME_SNOW_DIVE_START, snowZoneAt, scroll);
    const insideFog = smoothstep(0.35, 1, whiteT);
    if (sceneFog) {
      sceneFog.density = lerp(0.045, 0.38, insideFog);
      sceneFog.color.setRGB(1, 1, 1);
    }

    if (whiteT > 0.02) {
      applySnowWhiteout(scroll);
    } else {
      setMountainVisible(true);
    }

    renderer.setClearColor(0xffffff, 1);
    renderer.render(scene, camera);
  }

  function teardown() {
    initGeneration += 1;
    cancelAnimationFrame(animationFrameId);
    window.removeEventListener('resize', resizeRenderer);

    if (snowMountainModel && scene) {
      scene.remove(snowMountainModel);
      snowMountainModel.traverse((o) => {
        if (!o.isMesh) return;
        const mesh = /** @type {THREE.Mesh} */ (o);
        mesh.geometry?.dispose();
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach((m) => m.dispose());
      });
      snowMountainModel = undefined;
    }

    mountainMaterials = [];
    orbitConfig = null;
    if (renderer) {
      renderer.dispose();
      renderer.domElement.remove();
      renderer = undefined;
    }

    scene = undefined;
    camera = undefined;
    sceneFog = undefined;
  }

  onMount(() => {
    if (!browser) return;

    const gen = ++initGeneration;
    (async () => {
      await tick();
      await waitForContainerSize(container);
      if (gen !== initGeneration || !container) return;

      scene = new THREE.Scene();
      sceneFog = new THREE.FogExp2(smogColor, 0.045);
      scene.fog = sceneFog;

      const w = Math.max(container.clientWidth, 1);
      const h = Math.max(container.clientHeight, 1);

      camera = new THREE.PerspectiveCamera(44, w / h, 0.1, 500);
      camera.position.set(0, CAM_Y_LOW, 7.8);

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(w, h);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      container.appendChild(renderer.domElement);

      scene.add(new THREE.AmbientLight(0xffffff, 2.0));
      const directionalLight = new THREE.DirectionalLight(0xeaeff5, 2.5);
      directionalLight.position.set(5, 10, 7);
      scene.add(directionalLight);

      animate();
      window.addEventListener('resize', resizeRenderer);

      try {
        const gltf = await preloadMountainGltf();
        if (gen !== initGeneration || !scene) return;

        snowMountainModel = gltf.scene.clone(true);
        const { mountainCenter, snowField, orbitRadius, topDownHeight } =
          fitMountainModel(snowMountainModel);
        buildOrbitConfig(mountainCenter, snowField, orbitRadius, topDownHeight);
        setupMountainMaterials(snowMountainModel);
        scene.add(snowMountainModel);
        resizeRenderer();
      } catch (err) {
        console.error('[ThreeScene] caricamento montagna fallito:', err);
      }
    })();

    return teardown;
  });
</script>

<div class="three-canvas" bind:this={container}></div>

<style>
  .three-canvas {
    width: 100%;
    height: 100%;
    background: #ffffff;
  }

  .three-canvas.--snow-zone {
    background: #ffffff;
  }

  .three-canvas.--snow-zone :global(canvas) {
    visibility: hidden !important;
    pointer-events: none;
  }

  .three-canvas.--cards-zone :global(canvas) {
    pointer-events: none;
  }
</style>
