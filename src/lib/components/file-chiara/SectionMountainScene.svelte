<script>
  import { onMount } from 'svelte';
  import * as THREE from 'three';
  import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

  const CAMERA_Z_START = 8.0;
  const CAMERA_Z_END = -0.6;
  const CAMERA_ZOOM_START = 1;
  const CAMERA_ZOOM_END = 1.35;
  const smogColor = '#ffffff';

  /** @type {{ progress?: number, visible?: boolean }} */
  let { progress = 0, visible = true } = $props();

  let container;
  let renderer, scene, camera, sceneFog;
  let animationFrameId;
  let snowMountainModel;

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

  onMount(() => {
    scene = new THREE.Scene();
    sceneFog = new THREE.FogExp2(smogColor, 0.045);
    scene.fog = sceneFog;

    camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 500);
    camera.position.set(0, 0, CAMERA_Z_START);
    camera.rotation.set(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 2.0);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xeaeff5, 2.5);
    directionalLight.position.set(5, 10, 7);
    scene.add(directionalLight);

    const loader = new GLTFLoader();
    loader.load('/oggetti/snow_mountain.glb', (gltf) => {
      snowMountainModel = gltf.scene;
      const box = new THREE.Box3().setFromObject(snowMountainModel);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const desiredSize = 45.0;
      const scaleFactor = desiredSize / Math.max(size.x, size.y, size.z);
      snowMountainModel.scale.set(scaleFactor, scaleFactor, scaleFactor);
      snowMountainModel.position.x = -center.x * scaleFactor - 2.5;
      snowMountainModel.position.y = -center.y * scaleFactor - 1.5;
      snowMountainModel.position.z = -center.z * scaleFactor - 10.5;
      scene.add(snowMountainModel);
    });

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const tZoom = easeInOutCubic(clamp(progress, 0, 1));
      camera.position.set(0, 0, lerp(CAMERA_Z_START, CAMERA_Z_END, tZoom));
      camera.rotation.set(0, 0, 0);
      camera.zoom = lerp(CAMERA_ZOOM_START, CAMERA_ZOOM_END, tZoom);
      camera.updateProjectionMatrix();

      if (sceneFog) sceneFog.density = 0.045;
      if (snowMountainModel) snowMountainModel.visible = visible;

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container || !camera || !renderer) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      renderer.dispose();
    };
  });
</script>

<div class="three-canvas" bind:this={container}></div>

<style>
  .three-canvas {
    width: 100%;
    height: 100%;
  }
</style>
