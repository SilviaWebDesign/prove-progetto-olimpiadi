<script>
  import { onMount, tick } from 'svelte';
  import { browser } from '$app/environment';
  import * as THREE from 'three';
  import {
    fitMountainModel,
    preloadMountainGltf,
    waitForContainerSize
  } from './mountainGltf.js';

  const CAMERA_Z_START = 7.8;
  const CAMERA_Z_END = -0.6;
  const CAMERA_Y_START = -2.9;
  const CAMERA_ZOOM_START = 1;
  const CAMERA_ZOOM_END = 1.4;
  const smogColor = '#ffffff';

  /** @type {{ progress?: number, visible?: boolean }} */
  let { progress = 0, visible = true } = $props();

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

  /** @param {number} value @param {number} min @param {number} max */
  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  /** @param {number} a @param {number} b @param {number} t */
  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  /** @param {number} t */
  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
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

    const tZoom = easeInOutCubic(clamp(progress, 0, 1));
    camera.position.set(0, CAMERA_Y_START, lerp(CAMERA_Z_START, CAMERA_Z_END, tZoom));
    camera.rotation.set(0, 0, 0);
    camera.zoom = lerp(CAMERA_ZOOM_START, CAMERA_ZOOM_END, tZoom);
    camera.updateProjectionMatrix();

    if (sceneFog) sceneFog.density = 0.045;
    if (snowMountainModel) snowMountainModel.visible = visible;

    renderer.render(scene, camera);
  }

  function teardown() {
    initGeneration += 1;
    cancelAnimationFrame(animationFrameId);
    window.removeEventListener('resize', resizeRenderer);

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

      camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 500);
      camera.position.set(0, CAMERA_Y_START, CAMERA_Z_START);
      camera.rotation.set(0, 0, 0);

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
        fitMountainModel(snowMountainModel);
        scene.add(snowMountainModel);
        resizeRenderer();
      } catch (err) {
        console.error('[SectionMountainScene] caricamento montagna fallito:', err);
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
  }
</style>
