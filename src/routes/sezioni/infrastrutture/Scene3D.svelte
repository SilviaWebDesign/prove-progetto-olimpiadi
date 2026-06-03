<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import * as THREE from 'three';
  import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
  import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

  export interface Scene3DApi {
    setRotationY: (rad: number) => void;
    setScale: (factor: number) => void;
    setOpacity: (val: number) => void;
    startIdleSpin: () => void;
  }

  interface Props {
    api?: Scene3DApi;
  }

  let { api = $bindable() }: Props = $props();

  let wrapperEl = $state<HTMLDivElement | null>(null);
  let canvasEl  = $state<HTMLCanvasElement | null>(null);

  let renderer: THREE.WebGLRenderer | null = null;
  let scene: THREE.Scene | null = null;
  let camera: THREE.PerspectiveCamera | null = null;
  let modelGroup: THREE.Group | null = null;
  let materials: THREE.MeshStandardMaterial[] = [];
  let baseScale = 1;

  let rafId: number | null = null;
  let inView = false;
  let observer: IntersectionObserver | null = null;
  let idleSpinActive = false;

  onMount(() => {
    if (!canvasEl || !wrapperEl) return;

    // Expose API immediately — methods are safe no-ops until the model loads
    api = {
      setRotationY:  (rad) => { if (modelGroup) modelGroup.rotation.y = rad; },
      setScale:      (f)   => { if (modelGroup) modelGroup.scale.setScalar(baseScale * f); },
      setOpacity:    (val) => { materials.forEach((m) => { m.opacity = val; }); },
      startIdleSpin: ()    => { idleSpinActive = true; },
    };

    initThree();

    // Pause / resume RAF when the canvas leaves / enters the viewport
    observer = new IntersectionObserver(
      (entries) => {
        inView = entries[0].isIntersecting;
        inView ? startLoop() : stopLoop();
      },
      { threshold: 0.05 }
    );
    observer.observe(wrapperEl);

    // Lazy-load the model after the first paint so it never blocks LCP
    if ('requestIdleCallback' in window) {
      (window as Window & typeof globalThis & { requestIdleCallback: (cb: () => void) => void })
        .requestIdleCallback(loadModel);
    } else {
      setTimeout(loadModel, 100);
    }

    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); };
  });

  onDestroy(() => {
    stopLoop();
    observer?.disconnect();

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
    materials = [];
  });

  function initThree() {
    if (!canvasEl || !wrapperEl) return;

    renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    scene = new THREE.Scene();

    const w = wrapperEl.clientWidth  || window.innerWidth;
    const h = wrapperEl.clientHeight || window.innerHeight;
    camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    camera.position.set(0, 0, 6);
    renderer.setSize(w, h);

    // Studio lights: key + fill + rim
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));

    const key = new THREE.DirectionalLight(0xffffff, 1.4);
    key.position.set(5, 8, 5);
    scene.add(key);

    const fill = new THREE.DirectionalLight(0xd0e8ff, 0.6);
    fill.position.set(-4, 2, 3);
    scene.add(fill);

    const rim = new THREE.DirectionalLight(0xfff0e0, 0.4);
    rim.position.set(0, -3, -5);
    scene.add(rim);
  }

  function loadModel() {
    const draco = new DRACOLoader();
    draco.setDecoderPath('/draco/');

    const loader = new GLTFLoader();
    loader.setDRACOLoader(draco);

    loader.load(
      '/oggetti/infrastrutture.glb',
      (gltf) => {
        if (!scene || !camera) return;

        // Center the model at the world origin
        const box    = new THREE.Box3().setFromObject(gltf.scene);
        const center = box.getCenter(new THREE.Vector3());
        const size   = box.getSize(new THREE.Vector3());
        gltf.scene.position.sub(center);

        // baseScale: at scale=1 the model fills ~90 % of the frustum height
        const fov      = camera.fov * (Math.PI / 180);
        const dist     = camera.position.z;
        const visibleH = 2 * Math.tan(fov / 2) * dist;
        const maxDim   = Math.max(size.x, size.y, size.z);
        baseScale      = (visibleH * 0.9) / maxDim;

        const group = new THREE.Group();
        group.add(gltf.scene);
        group.scale.setScalar(baseScale);

        // Collect materials and start fully transparent
        materials = [];
        group.traverse((node) => {
          const mesh = node as THREE.Mesh;
          if (!mesh.isMesh) return;
          const mats = Array.isArray(mesh.material)
            ? (mesh.material as THREE.MeshStandardMaterial[])
            : [mesh.material as THREE.MeshStandardMaterial];
          mats.forEach((m) => {
            m.transparent = true;
            m.opacity = 0;
            materials.push(m);
          });
        });

        modelGroup = group;
        scene.add(group);
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
    if (!inView || !renderer || !scene || !camera) { rafId = null; return; }
    if (idleSpinActive && modelGroup) {
      modelGroup.rotation.y += 0.008; // ~30°/s at 60 fps
    }
    renderer.render(scene, camera);
    rafId = requestAnimationFrame(tick);
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
