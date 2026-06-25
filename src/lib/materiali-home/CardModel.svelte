<script>
  import { onMount } from 'svelte';
  import * as THREE from 'three';
  import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
  /** @type {{ src: string, label: string, active?: boolean, hovered?: boolean, showLabel?: boolean }} */
  let { src, label, active = false, hovered = false, showLabel = true } = $props();

  const MODEL_ROTATION_SPEED = 0.35;
  const TORCH_LIGHT_ORBIT_SPEED = 0.4;

  const CARD_METALLIC_MATERIAL = new THREE.MeshStandardMaterial({
    color: 0x8a8d94,
    metalness: 0.92,
    roughness: 0.28
  });
  const TORCH_SRC = '/oggetti/torcia.glb';
  const TITLE_FONT_FAMILY = 'PP Formula Condensed';
  const LABEL_WIDTH_RATIO = 0.82;
  const LABEL_HEIGHT_RATIO = 0.22;

  const CARD_OBJECT_SIZE = 2.4;
  const CARD_CAMERA_Z = 3.6;
  const ICE_SKATE_OBJECT_SIZE = 1.75;

  /** @type {Record<string, { desiredSize?: number, cameraZ?: number, offsetY?: number, rotationX?: number, rotationY?: number, rotationZ?: number }>} */
  const MODEL_CONFIG = {
    '/oggetti/sport.glb': { desiredSize: ICE_SKATE_OBJECT_SIZE },
    '/oggetti/ice_skate.glb': { desiredSize: ICE_SKATE_OBJECT_SIZE }
  };

  /** @param {string} path */
  function getConfig(path) {
    return {
      desiredSize: CARD_OBJECT_SIZE,
      cameraZ: CARD_CAMERA_Z,
      ...MODEL_CONFIG[path]
    };
  }

  /** @param {THREE.Object3D} object @param {number} desiredSize */
  function fitModel(object, desiredSize) {
    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const scaleFactor = desiredSize / Math.max(size.x, size.y, size.z);
    object.scale.setScalar(scaleFactor);
    object.position.set(
      -center.x * scaleFactor,
      -center.y * scaleFactor,
      -center.z * scaleFactor
    );
    object.updateMatrixWorld(true);

    const fittedBox = new THREE.Box3().setFromObject(object);
    const fittedCenter = fittedBox.getCenter(new THREE.Vector3());
    object.position.sub(fittedCenter);
    return scaleFactor;
  }

  /** @param {THREE.Material | THREE.Material[]} material */
  function disposeMaterial(material) {
    const materials = Array.isArray(material) ? material : [material];
    for (const mat of materials) {
      if (!mat) continue;
      for (const key of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap']) {
        const tex = /** @type {Record<string, THREE.Texture | undefined>} */ (/** @type {unknown} */ (mat))[key];
        tex?.dispose?.();
      }
      mat.dispose();
    }
  }

  /** @param {THREE.Object3D} object */
  function applyMetallicGrayMaterial(object) {
    object.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      const mesh = child;
      if (mesh.geometry?.attributes?.color) {
        mesh.geometry.deleteAttribute('color');
      }
      disposeMaterial(mesh.material);
      mesh.material = CARD_METALLIC_MATERIAL;
    });
  }

  /** @param {THREE.Scene} targetScene */
  function addCardLighting(targetScene) {
    targetScene.add(new THREE.AmbientLight(0xe8eaef, 1.4));
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.8);
    keyLight.position.set(5, 10, 7);
    targetScene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0xc5cad4, 1.6);
    fillLight.position.set(-6, 4, -5);
    targetScene.add(fillLight);
    const rimLight = new THREE.DirectionalLight(0xf5f7fa, 1.2);
    rimLight.position.set(0, 2, -8);
    targetScene.add(rimLight);
  }

  async function ensureTitleFont() {
    if (!document.fonts?.load) return;
    await document.fonts.load(`900 64px "${TITLE_FONT_FAMILY}"`);
    await document.fonts.ready;
  }

  /** @param {THREE.PerspectiveCamera} cam */
  function getLabelBounds(cam) {
    const vFov = (cam.fov * Math.PI) / 180;
    const dist = cam.position.z;
    const visibleH = 2 * dist * Math.tan(vFov / 2);
    const visibleW = visibleH * cam.aspect;
    return {
      maxWidth: visibleW * LABEL_WIDTH_RATIO,
      maxHeight: visibleH * LABEL_HEIGHT_RATIO
    };
  }

  /** @param {THREE.Mesh} mesh */
  function disposeLabelMesh(mesh) {
    mesh.geometry.dispose();
    const mat = mesh.material;
    if (!Array.isArray(mat)) {
      /** @type {THREE.MeshStandardMaterial} */ (mat).map?.dispose();
      mat.dispose();
    }
  }

  /**
   * @param {string} text
   * @param {{ maxWidth: number, maxHeight: number }} bounds
   */
  function createLabelPlane(text, bounds) {
    const displayText = text.toUpperCase();
    const { maxWidth, maxHeight } = bounds;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    /** @param {number} size */
    const fontFor = (size) => `900 ${size}px "${TITLE_FONT_FAMILY}", sans-serif`;

    let chosen = null;

    for (let fontSize = 128; fontSize >= 28; fontSize -= 2) {
      const font = fontFor(fontSize);
      const measureCanvas = document.createElement('canvas');
      const measureCtx = measureCanvas.getContext('2d');
      if (!measureCtx) throw new Error('Canvas non supportato');

      measureCtx.font = font;
      const metrics = measureCtx.measureText(displayText);
      const ascent = metrics.actualBoundingBoxAscent || fontSize * 0.92;
      const descent = metrics.actualBoundingBoxDescent || fontSize * 0.24;
      const padX = Math.ceil(fontSize * 0.12);
      const padY = Math.ceil(fontSize * 0.22);
      const textW = metrics.width;
      const textH = Math.max(ascent + descent, fontSize * 1.12);
      const logicalW = textW + padX * 2;
      const logicalH = textH + padY * 2;
      const drawY = padY + ascent;

      let planeWidth = logicalW;
      let planeHeight = logicalH;
      const scale = Math.min(maxWidth / planeWidth, maxHeight / planeHeight);
      planeWidth *= scale;
      planeHeight *= scale;

      if (scale > 0 && planeWidth <= maxWidth && planeHeight <= maxHeight) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas non supportato');

        canvas.width = Math.ceil(logicalW * dpr);
        canvas.height = Math.ceil(logicalH * dpr);
        ctx.scale(dpr, dpr);
        ctx.font = font;
        ctx.fillStyle = '#000000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(displayText, logicalW / 2, drawY);

        chosen = { canvas, planeWidth, planeHeight };
        break;
      }
    }

    if (!chosen) {
      throw new Error(`Impossibile adattare l'etichetta: ${text}`);
    }

    const texture = new THREE.CanvasTexture(chosen.canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;

    const geometry = new THREE.PlaneGeometry(chosen.planeWidth, chosen.planeHeight);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.renderOrder = 10;
    return mesh;
  }

  /** @type {HTMLDivElement | undefined} */
  let container;
  /** @type {THREE.WebGLRenderer | undefined} */
  let renderer;
  /** @type {THREE.Scene | undefined} */
  let scene;
  /** @type {THREE.PerspectiveCamera | undefined} */
  let camera;
  /** @type {THREE.Group | undefined} */
  let modelRoot;
  /** @type {THREE.Mesh | undefined} */
  let labelMesh;
  /** @type {THREE.Group | undefined} */
  let torchLightOrbit;
  let animationFrameId = 0;
  /** @type {ResizeObserver | undefined} */
  let resizeObserver;
  let motionReduced = $state(false);

  const animState = {
    hovered: false,
    active: false,
    motionReduced: false
  };

  $effect(() => {
    animState.hovered = hovered;
  });

  $effect(() => {
    animState.active = active;
  });

  $effect(() => {
    animState.motionReduced = motionReduced;
  });

  onMount(() => {
    motionReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const config = getConfig(src);
    const isTorch = src === TORCH_SRC;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 0, config.cameraZ);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.sortObjects = true;
    container.appendChild(renderer.domElement);

    if (isTorch) {
      scene.add(new THREE.AmbientLight(0xe8eaef, 0.5));

      torchLightOrbit = new THREE.Group();
      scene.add(torchLightOrbit);

      const lightRadius = 2.3;

      const keyLight = new THREE.PointLight(0xffffff, 110, 16);
      keyLight.position.set(lightRadius, 1.15, 0);
      torchLightOrbit.add(keyLight);

      const rimLight = new THREE.PointLight(0xd4d8e0, 65, 14);
      rimLight.position.set(-lightRadius * 0.7, 0.55, lightRadius * 0.75);
      torchLightOrbit.add(rimLight);

      const fillLight = new THREE.PointLight(0xf2f4f8, 40, 12);
      fillLight.position.set(0, -0.35, -lightRadius);
      torchLightOrbit.add(fillLight);
    } else {
      addCardLighting(scene);
    }

    modelRoot = new THREE.Group();
    scene.add(modelRoot);

    let labelMountId = 0;

    const mountLabel = async () => {
      if (!showLabel || !camera || !scene) return;

      const mountId = ++labelMountId;
      await ensureTitleFont();
      if (mountId !== labelMountId || !camera || !scene) return;

      const bounds = getLabelBounds(camera);
      const nextLabel = createLabelPlane(label, bounds);

      if (labelMesh) {
        scene.remove(labelMesh);
        disposeLabelMesh(labelMesh);
      }

      labelMesh = nextLabel;
      labelMesh.position.set(0, 0.08, 0);
      labelMesh.lookAt(camera.position);
      scene.add(labelMesh);
    };

    const loader = new GLTFLoader();
    loader.load(src, (gltf) => {
      if (!modelRoot) return;
      const model = gltf.scene;
      fitModel(model, config.desiredSize);
      if (config.offsetY) model.position.y += config.offsetY;
      if (config.rotationX) model.rotation.x = config.rotationX;
      if (config.rotationY) model.rotation.y = config.rotationY;
      if (config.rotationZ) model.rotation.z = config.rotationZ;
      applyMetallicGrayMaterial(model);
      modelRoot.add(model);
    });

    const updateLayout = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      void mountLabel();
    };

    resizeObserver = new ResizeObserver(updateLayout);
    resizeObserver.observe(container);
    updateLayout();

    let modelRotationY = 0;
    let torchRotationY = 0;
    let lastAnimTime = performance.now();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      if (!renderer || !scene || !camera || !animState.active) return;

      const now = performance.now();
      const dt = (now - lastAnimTime) / 1000;
      lastAnimTime = now;

      if (!animState.motionReduced && !animState.hovered) {
        modelRotationY += MODEL_ROTATION_SPEED * dt;
        if (torchLightOrbit) {
          torchRotationY += TORCH_LIGHT_ORBIT_SPEED * dt;
        }
      }

      if (modelRoot) {
        modelRoot.rotation.y = modelRotationY;
      }
      if (torchLightOrbit) {
        torchLightOrbit.rotation.y = torchRotationY;
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      labelMountId += 1;
      resizeObserver?.disconnect();
      cancelAnimationFrame(animationFrameId);
      if (labelMesh && scene) {
        scene.remove(labelMesh);
        disposeLabelMesh(labelMesh);
        labelMesh = undefined;
      }
      renderer?.dispose();
      if (renderer?.domElement?.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  });
</script>

<div class="card-model" bind:this={container} aria-hidden="true"></div>

<style>
  .card-model {
    position: relative;
    width: 100%;
    height: 100%;
    display: block;
    pointer-events: none;
    overflow: visible;
  }

  .card-model :global(canvas) {
    display: block;
    width: 100% !important;
    height: 100% !important;
  }
</style>
