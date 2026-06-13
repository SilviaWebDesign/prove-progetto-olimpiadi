<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import * as THREE from 'three';
  import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
  import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
  import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

  export interface Scene3DApi {
    setRotationY: (rad: number) => void;
    setScale: (factor: number) => void;
    setOpacity: (val: number) => void;
    settle: () => void;
    unsettle: () => void;
  }

  interface Props {
    api?: Scene3DApi;
    modelSrc: string;
  }

  let { api = $bindable(), modelSrc }: Props = $props();

  let wrapperEl = $state<HTMLDivElement | null>(null);
  let canvasEl = $state<HTMLCanvasElement | null>(null);

  let renderer: THREE.WebGLRenderer | null = null;
  let scene: THREE.Scene | null = null;
  let camera: THREE.PerspectiveCamera | null = null;
  let modelGroup: THREE.Group | null = null;
  let materials: THREE.MeshPhysicalMaterial[] = [];
  let baseScale = 1;

  let rafId: number | null = null;
  let spinner: THREE.Group | null = null;

  const clock = new THREE.Clock();
  const IDLE_RAD_S = THREE.MathUtils.degToRad(7);

  onMount(() => {
    if (!canvasEl || !wrapperEl) return;

    api = {
      setRotationY: (rad) => {
        if (modelGroup) modelGroup.rotation.y = rad;
      },
      setScale: (f) => {
        if (modelGroup) modelGroup.scale.setScalar(baseScale * f);
      },
      setOpacity: (val) => {
        materials.forEach((m) => {
          m.opacity = val;
        });
      },
      settle: () => {},
      unsettle: () => {}
    };

    initThree();
    startLoop();

    if ('requestIdleCallback' in window) {
      (window as Window & typeof globalThis & { requestIdleCallback: (cb: () => void) => void })
        .requestIdleCallback(loadModel);
    } else {
      setTimeout(loadModel, 100);
    }

    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
    };
  });

  onDestroy(() => {
    stopLoop();
    scene?.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.geometry?.dispose();
      const mats = Array.isArray(mesh.material)
        ? (mesh.material as THREE.Material[])
        : [mesh.material as THREE.Material];
      mats.forEach((m) => m.dispose());
    });
    renderer?.dispose();
    scene = null;
    renderer = null;
    camera = null;
    modelGroup = null;
    spinner = null;
    materials = [];
  });

  function initThree() {
    if (!canvasEl || !wrapperEl) return;

    renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    scene = new THREE.Scene();

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    const w = wrapperEl.clientWidth || window.innerWidth;
    const h = wrapperEl.clientHeight || window.innerHeight;
    camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    camera.position.set(0, 0, 6);
    renderer.setSize(w, h);

    const key = new THREE.DirectionalLight(0xffffff, 3.5);
    key.position.set(5, 10, 7);
    scene.add(key);

    const fill = new THREE.DirectionalLight(0xffffff, 1.5);
    fill.position.set(-5, 2, -5);
    scene.add(fill);
  }

  function loadModel() {
    const draco = new DRACOLoader();
    draco.setDecoderPath('/draco/');
    const loader = new GLTFLoader();
    loader.setDRACOLoader(draco);

    loader.load(
      modelSrc,
      (gltf) => {
        if (!scene || !camera) return;

        const box = new THREE.Box3().setFromObject(gltf.scene);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        gltf.scene.position.sub(center);

        const fov = camera.fov * (Math.PI / 180);
        const dist = camera.position.z;
        const visibleH = 2 * Math.tan(fov / 2) * dist;
        const maxDim = Math.max(size.x, size.y, size.z);
        baseScale = (visibleH * 0.9) / maxDim;

        const group = new THREE.Group();
        group.add(gltf.scene);
        group.scale.setScalar(baseScale);

        materials = [];
        group.traverse((node) => {
          const mesh = node as THREE.Mesh;
          if (!mesh.isMesh) return;
          mesh.geometry.computeVertexNormals();
          const chrome = new THREE.MeshPhysicalMaterial({
            color: 0x181818,
            metalness: 1.0,
            roughness: 0.015,
            envMapIntensity: 5.0,
            clearcoat: 1.0,
            clearcoatRoughness: 0.01,
            transparent: true,
            opacity: 0
          });
          mesh.material = chrome;
          materials.push(chrome);
        });

        modelGroup = group;
        spinner = new THREE.Group();
        spinner.add(group);
        scene.add(spinner);
        draco.dispose();
      },
      undefined,
      (err) => console.error('[Scene3D] load error:', err)
    );
  }

  function startLoop() {
    if (rafId !== null) return;
    rafId = requestAnimationFrame(tick);
  }

  function stopLoop() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function tick() {
    rafId = requestAnimationFrame(tick);
    if (!renderer || !scene || !camera) return;
    const dt = clock.getDelta();
    if (spinner) spinner.rotation.y += IDLE_RAD_S * dt;
    renderer.render(scene, camera);
  }

  function onResize() {
    if (!renderer || !camera || !wrapperEl) return;
    const w = wrapperEl.clientWidth;
    const h = wrapperEl.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
</script>

<div class="scene-wrapper" bind:this={wrapperEl}>
  <canvas bind:this={canvasEl}></canvas>
</div>

<style>
  .scene-wrapper {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  canvas {
    display: block;
    width: 100%;
    height: 100%;
  }
</style>
