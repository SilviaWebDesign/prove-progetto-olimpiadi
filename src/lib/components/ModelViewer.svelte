<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import * as THREE from 'three';
  import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
  import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
  import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
  import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

  interface Props { src: string | null }
  let { src }: Props = $props();

  let containerEl = $state<HTMLDivElement | null>(null);
  let canvasEl    = $state<HTMLCanvasElement | null>(null);

  let renderer: THREE.WebGLRenderer | null = null;
  let scene:    THREE.Scene | null = null;
  let camera:   THREE.PerspectiveCamera | null = null;
  let controls: OrbitControls | null = null;
  let rafId:    number | null = null;
  let ro:       ResizeObserver | null = null;

  onMount(() => {
    if (!containerEl || !canvasEl || !src) return;

    const w = containerEl.clientWidth;
    const h = containerEl.clientHeight;

    renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace    = THREE.SRGBColorSpace;
    renderer.toneMapping         = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.setSize(w, h);

    scene = new THREE.Scene();

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    camera.position.set(0, 0, 6);
    camera.lookAt(0, 0, 0);

    const key = new THREE.DirectionalLight(0xffffff, 3.5);
    key.position.set(5, 10, 7);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 1.5);
    fill.position.set(-5, 2, -5);
    scene.add(fill);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping   = true;
    controls.dampingFactor   = 0.05;
    controls.enableZoom      = false;
    controls.enablePan       = false;
    controls.autoRotate      = true;
    controls.autoRotateSpeed = 1.5;
    controls.target.set(0, 0, 0);

    const draco = new DRACOLoader();
    draco.setDecoderPath('/draco/');
    const loader = new GLTFLoader();
    loader.setDRACOLoader(draco);

    loader.load(src, (gltf) => {
      if (!scene || !camera) return;

      const box    = new THREE.Box3().setFromObject(gltf.scene);
      const center = box.getCenter(new THREE.Vector3());
      const size   = box.getSize(new THREE.Vector3());
      gltf.scene.position.sub(center);

      const fov      = camera.fov * (Math.PI / 180);
      const dist     = camera.position.z;
      const visibleH = 2 * Math.tan(fov / 2) * dist;
      const maxDim   = Math.max(size.x, size.y, size.z);
      const scale    = (visibleH * 0.72) / maxDim;

      const group = new THREE.Group();
      group.add(gltf.scene);
      group.scale.setScalar(scale);

      group.traverse((node) => {
        const mesh = node as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.geometry.computeVertexNormals();
        mesh.material = new THREE.MeshPhysicalMaterial({
          color:              0x181818,
          metalness:          1.0,
          roughness:          0.015,
          envMapIntensity:    5.0,
          clearcoat:          1.0,
          clearcoatRoughness: 0.01,
        });
      });

      scene.add(group);
      draco.dispose();
    });

    function loop() {
      rafId = requestAnimationFrame(loop);
      controls?.update();
      if (renderer && scene && camera) renderer.render(scene, camera);
    }
    loop();

    ro = new ResizeObserver(() => {
      if (!containerEl || !renderer || !camera) return;
      const w = containerEl.clientWidth;
      const h = containerEl.clientHeight;
      renderer!.setSize(w, h);
      camera!.aspect = w / h;
      camera!.updateProjectionMatrix();
    });
    ro.observe(containerEl);

    return cleanup;
  });

  function cleanup() {
    if (rafId !== null) cancelAnimationFrame(rafId);
    ro?.disconnect();
    controls?.dispose();
    renderer?.dispose();
    renderer = null; scene = null; camera = null; controls = null; rafId = null; ro = null;
  }

  onDestroy(cleanup);
</script>

<div class="model-viewer" bind:this={containerEl}>
  {#if src}
    <canvas bind:this={canvasEl}></canvas>
  {:else}
    <div class="placeholder"></div>
  {/if}
</div>

<style>
  .model-viewer {
    width: 100%;
    height: 100%;
    position: relative;
  }

  canvas {
    display: block;
    width: 100%;
    height: 100%;
  }

  .placeholder {
    width: 100%;
    height: 100%;
    background: #e8e8e8;
    border-radius: 4px;
  }
</style>
