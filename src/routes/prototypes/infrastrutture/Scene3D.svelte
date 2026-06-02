<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import * as THREE from 'three';
  import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
  import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
  import gsap from 'gsap';

  interface Props {
    /** Chiamata da GSAP quando l'oggetto è pronto (fine animazione intro) */
    onIntroComplete?: () => void;
  }

  let { onIntroComplete }: Props = $props();

  /* ── Refs DOM ───────────────────────────────────────────────────────────── */
  let wrapperEl = $state<HTMLElement | null>(null);
  let canvasEl  = $state<HTMLCanvasElement | null>(null);

  /* ── Three.js state ─────────────────────────────────────────────────────── */
  let renderer: THREE.WebGLRenderer | null = null;
  let scene: THREE.Scene | null = null;
  let camera: THREE.PerspectiveCamera | null = null;
  let model: THREE.Group | null = null;
  let rafId: number | null = null;
  let isRunning = false;
  let introPlayed = false;

  /* ── IntersectionObserver ─────────────────────────────────────────────── */
  let observer: IntersectionObserver | null = null;

  onMount(() => {
    if (!canvasEl || !wrapperEl) return;

    initThree();

    observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting) {
          startLoop();
          if (!introPlayed) {
            introPlayed = true;
            // piccolo delay per assicurarsi che il primo frame sia renderizzato
            setTimeout(playIntro, 200);
          }
        } else {
          pauseLoop();
        }
      },
      { threshold: 0.2 }
    );

    observer.observe(wrapperEl);
  });

  onDestroy(() => {
    pauseLoop();
    observer?.disconnect();
    renderer?.dispose();
    scene?.clear();
  });

  /* ──────────────────────────────────────────────────────────────────────── */
  /* INIT THREE                                                                */
  /* ──────────────────────────────────────────────────────────────────────── */

  function initThree() {
    if (!canvasEl || !wrapperEl) return;

    /* Renderer */
    renderer = new THREE.WebGLRenderer({
      canvas: canvasEl,
      antialias: true,
      alpha: true
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = false;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    updateSize();

    /* Scene */
    scene = new THREE.Scene();

    /* Camera */
    const { width, height } = canvasEl.getBoundingClientRect();
    camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 5);

    /* Luci studio neutre */
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);

    const key = new THREE.DirectionalLight(0xffffff, 1.4);
    key.position.set(5, 8, 5);
    scene.add(key);

    const fill = new THREE.DirectionalLight(0xd0e8ff, 0.6);
    fill.position.set(-4, 2, 3);
    scene.add(fill);

    const rim = new THREE.DirectionalLight(0xfff0e0, 0.4);
    rim.position.set(0, -3, -5);
    scene.add(rim);

    /* Carica GLB */
    loadModel();

    /* Resize */
    window.addEventListener('resize', updateSize);
  }

  function updateSize() {
    if (!renderer || !camera || !wrapperEl) return;
    const w = wrapperEl.clientWidth;
    const h = wrapperEl.clientHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function loadModel() {
    const draco = new DRACOLoader();
    draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');

    const loader = new GLTFLoader();
    loader.setDRACOLoader(draco);

    loader.load(
      '/oggetti/infrastrutture.glb',
      (gltf) => {
        if (!scene) return;
        model = gltf.scene;

        /* Centra e scala per riempire quasi tutto il viewport */
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 2.8 / maxDim;

        model.position.sub(center.multiplyScalar(scale));
        model.scale.setScalar(scale);
        model.position.y -= 0.1;

        /* Parte invisibile: fade-in gestito da playIntro */
        model.traverse((node) => {
          if ((node as THREE.Mesh).isMesh) {
            const mesh = node as THREE.Mesh;
            const mats = Array.isArray(mesh.material)
              ? (mesh.material as THREE.Material[])
              : [mesh.material as THREE.Material];
            mats.forEach((m) => {
              m.transparent = true;
              (m as THREE.MeshStandardMaterial).opacity = 0;
            });
          }
        });

        scene.add(model);
        draco.dispose();
      },
      undefined,
      (err) => console.error('[Scene3D] GLB load error:', err)
    );
  }

  /* ──────────────────────────────────────────────────────────────────────── */
  /* RENDER LOOP                                                               */
  /* ──────────────────────────────────────────────────────────────────────── */

  function startLoop() {
    if (isRunning) return;
    isRunning = true;
    rafId = requestAnimationFrame(tick);
  }

  function pauseLoop() {
    isRunning = false;
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function tick() {
    if (!isRunning || !renderer || !scene || !camera) return;
    renderer.render(scene, camera);
    rafId = requestAnimationFrame(tick);
  }

  /* ──────────────────────────────────────────────────────────────────────── */
  /* TIMELINE INTRO GSAP                                                       */
  /* a. fade-in oggetto                                                        */
  /* b. rotazione elegante attorno a Y (una rivoluzione)                      */
  /* c. scale-down + spostamento, poi chiama onIntroComplete                  */
  /* ──────────────────────────────────────────────────────────────────────── */

  function playIntro() {
    if (!model) {
      /* Riprova tra poco se il modello non è ancora caricato */
      setTimeout(playIntro, 300);
      return;
    }

    const tl = gsap.timeline({
      onComplete: () => onIntroComplete?.()
    });

    /* Raccoglie tutti i materiali per animare opacity */
    const mats: THREE.Material[] = [];
    model.traverse((node) => {
      if ((node as THREE.Mesh).isMesh) {
        const mesh = node as THREE.Mesh;
        const ms = Array.isArray(mesh.material)
          ? (mesh.material as THREE.Material[])
          : [mesh.material as THREE.Material];
        mats.push(...ms);
      }
    });

    /* a) Fade-in via proxy (Three.js materials non si re-renderano da soli) */
    const proxy = { opacity: 0 };
    tl.to(
      proxy,
      {
        opacity: 1,
        duration: 0.8,
        ease: 'power2.out',
        onUpdate() {
          mats.forEach((m) => {
            (m as THREE.MeshStandardMaterial).opacity = proxy.opacity;
          });
        }
      },
      0
    );

    /* b) Rotazione attorno a Y — una rivoluzione completa */
    tl.to(
      model.rotation,
      {
        y: model.rotation.y + Math.PI * 2,
        duration: 2.4,
        ease: 'power3.inOut'
      },
      0.3
    );

    /* c) Scale-down + sposta a sinistra verso fine rotazione */
    tl.to(
      model.scale,
      {
        x: 0.55,
        y: 0.55,
        z: 0.55,
        duration: 0.8,
        ease: 'power2.inOut'
      },
      2.4
    );

    tl.to(
      model.position,
      {
        x: -1.4,
        duration: 0.8,
        ease: 'power2.inOut'
      },
      2.4
    );
  }
</script>

<div class="scene-wrapper" bind:this={wrapperEl}>
  <canvas bind:this={canvasEl}></canvas>
</div>

<style>
  .scene-wrapper {
    width: 100%;
    height: 100%;
    position: relative;
  }

  canvas {
    display: block;
    width: 100%;
    height: 100%;
  }
</style>
