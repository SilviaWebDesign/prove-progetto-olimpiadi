<script>
  import { onMount } from 'svelte';

  /** @type {{ src?: string, refreezeMs?: number }} */
  let { src, refreezeMs = 4000 } = $props();
  const DEFAULT_FROST_BG = '/sections/hero-feature.jpg';
  const heroImageSrc = src || DEFAULT_FROST_BG;
  const HERO_IMAGE_ZOOM = 1.18;
  const HERO_FOCUS_X = 0.5;
  const HERO_FOCUS_Y = 0.44;

  let rootEl = $state(null);
  let canvasEl = $state(null);

  /** @type {number | null} */
  let rafId = null;

  onMount(() => {
    const root = rootEl;
    const canvas = canvasEl;
    if (!root || !canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const frostCanvas = document.createElement('canvas');
    const meltCanvas = document.createElement('canvas');
    const crackCanvas = document.createElement('canvas');
    const frostCtx = frostCanvas.getContext('2d', { alpha: true });
    const meltCtx = meltCanvas.getContext('2d', { alpha: true });
    const crackCtx = crackCanvas.getContext('2d', { alpha: true });
    if (!frostCtx || !meltCtx || !crackCtx) return;

    // ── Scraping brush ────────────────────────────────
    const BRUSH_SIZE = 28; // px
    const SCRATCH_DENSITY = 8; // int
    const CRACK_DENSITY = 4; // int
    const PARTICLE_DENSITY = 5; // int
    const SNOWFLAKE_AMOUNT = 3; // 0-10 per 100px
    const EDGE_ROUGHNESS = 0.62; // 0-1

    // ── Frost appearance ──────────────────────────────
    const FROST_OPACITY = 0.9; // 0-1
    const GRAIN_OPACITY = 0.22; // 0-1
    const SCRATCH_OPACITY = 0.14; // 0-1
    const BLUR_AMOUNT = 18; // px

    const photo = new Image();
    photo.decoding = 'async';
    photo.src = heroImageSrc;
    photo.onerror = () => {
      if (photo.src.endsWith(DEFAULT_FROST_BG)) return;
      photo.src = DEFAULT_FROST_BG;
    };

    let width = 0;
    let height = 0;
    let dpr = 1;
    let brushRadius = BRUSH_SIZE;
    let photoReady = false;
    let reducedMotion = false;
    let running = true;
    let hasMelt = false;
    let hasCrack = false;
    let crackEnergy = 0;
    let shimmerPhase = 0;
    let idleRafId = null;
    let lastPointerX = null;
    let lastPointerY = null;
    let snowflakeCarry = 0;

    /** PRNG deterministico — texture stabile al resize */
    function createRng(seed) {
      let s = seed >>> 0;
      return () => {
        s = (s + 0x6d2b79f5) | 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }

    /** Alpha melt → 0 in ~refreezeMs (60fps) */
    const refreezeFrames = Math.max(90, (refreezeMs / 1000) * 60);
    const refreezeGrowth = 1 - Math.pow(0.015, 1 / refreezeFrames);

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    function updateMotionPreference() {
      reducedMotion = motionQuery.matches;
      if (reducedMotion) {
        stopMeltLoop();
        stopIdleLoop();
      } else if (running) {
        if (hasMelt || hasCrack) startMeltLoop();
        else startIdleLoop();
      }
    }

    updateMotionPreference();
    motionQuery.addEventListener('change', updateMotionPreference);

    /**
     * @param {CanvasRenderingContext2D} fctx
     * @param {HTMLImageElement} img
     * @param {number} w
     * @param {number} h
     */
    function drawImageCover(fctx, img, w, h) {
      const iw = img.naturalWidth;
      const ih = img.naturalHeight;
      if (!iw || !ih) return;

      const scale = Math.max(w / iw, h / ih) * HERO_IMAGE_ZOOM;
      const sw = iw * scale;
      const sh = ih * scale;
      const sx = (w - sw) * HERO_FOCUS_X;
      const sy = (h - sh) * HERO_FOCUS_Y;
      fctx.drawImage(img, sx, sy, sw, sh);
    }

    /**
     * Bokeh glaciale — alone morbidi, look editoriale
     * @param {CanvasRenderingContext2D} fctx
     * @param {() => number} rnd
     */
    function drawGlacialBokeh(fctx, w, h, rnd) {
      const count = Math.floor((w * h) / 38000) + 14;
      fctx.save();
      fctx.globalCompositeOperation = 'screen';

      for (let i = 0; i < count; i++) {
        const cx = rnd() * w;
        const cy = rnd() * h;
        const r = 12 + rnd() * Math.min(w, h) * 0.09;
        const bloom = fctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r);
        bloom.addColorStop(0, `rgba(255, 255, 255, ${0.08 + rnd() * 0.12})`);
        bloom.addColorStop(0.45, `rgba(160, 220, 255, ${0.04 + rnd() * 0.06})`);
        bloom.addColorStop(1, 'rgba(100, 180, 255, 0)');
        fctx.fillStyle = bloom;
        fctx.beginPath();
        fctx.arc(cx, cy, r, 0, Math.PI * 2);
        fctx.fill();
      }

      fctx.restore();
    }

    /**
     * Cristallo stilizzato a 6 punte
     * @param {CanvasRenderingContext2D} fctx
     */
    function drawSnowGlyph(fctx, cx, cy, size, alpha, rotation) {
      fctx.save();
      fctx.translate(cx, cy);
      fctx.rotate(rotation);
      fctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
      fctx.lineWidth = Math.max(0.5, size * 0.08);
      fctx.lineCap = 'round';

      for (let i = 0; i < 6; i++) {
        fctx.save();
        fctx.rotate((Math.PI / 3) * i);
        fctx.beginPath();
        fctx.moveTo(0, 0);
        fctx.lineTo(0, -size);
        fctx.stroke();
        fctx.beginPath();
        fctx.moveTo(0, -size * 0.55);
        fctx.lineTo(size * 0.22, -size * 0.72);
        fctx.moveTo(0, -size * 0.55);
        fctx.lineTo(-size * 0.22, -size * 0.72);
        fctx.stroke();
        fctx.restore();
      }

      fctx.restore();
    }

    /**
     * @param {CanvasRenderingContext2D} fctx
     * @param {() => number} rnd
     */
    function drawIceCrystals(fctx, w, h, rnd) {
      const count = Math.floor((w * h) / 52000) + 18;
      fctx.save();
      fctx.globalCompositeOperation = 'lighter';

      for (let i = 0; i < count; i++) {
        const cx = rnd() * w;
        const cy = rnd() * h;
        const size = 3 + rnd() * 11;
        drawSnowGlyph(fctx, cx, cy, size, 0.12 + rnd() * 0.28, rnd() * Math.PI);
      }

      fctx.restore();
    }

    /**
     * Fascio di luce da ghiacciaio — diagonale drammatica
     * @param {CanvasRenderingContext2D} fctx
     */
    function drawGlacierBeam(fctx, w, h) {
      fctx.save();
      fctx.globalCompositeOperation = 'lighter';

      const beam = fctx.createLinearGradient(-w * 0.15, -h * 0.1, w * 0.95, h * 0.75);
      beam.addColorStop(0, 'rgba(255, 255, 255, 0)');
      beam.addColorStop(0.32, 'rgba(255, 255, 255, 0.55)');
      beam.addColorStop(0.48, 'rgba(190, 235, 255, 0.28)');
      beam.addColorStop(0.62, 'rgba(140, 200, 255, 0.06)');
      beam.addColorStop(1, 'rgba(255, 255, 255, 0)');
      fctx.fillStyle = beam;
      fctx.fillRect(0, 0, w, h);

      const coolWash = fctx.createRadialGradient(w * 0.12, h * 0.08, 0, w * 0.35, h * 0.35, Math.max(w, h) * 0.55);
      coolWash.addColorStop(0, 'rgba(200, 240, 255, 0.35)');
      coolWash.addColorStop(1, 'rgba(100, 170, 230, 0)');
      fctx.fillStyle = coolWash;
      fctx.fillRect(0, 0, w, h);

      fctx.restore();
    }

    /**
     * Perle di condensa — anelli grafici minimal
     * @param {CanvasRenderingContext2D} fctx
     * @param {() => number} rnd
     */
    function drawCondensationBeads(fctx, w, h, rnd) {
      const count = Math.floor((w * h) / 14000) + 8;
      fctx.save();
      fctx.globalCompositeOperation = 'lighter';

      for (let i = 0; i < count; i++) {
        const cx = rnd() * w;
        const cy = rnd() * h;
        const r = 2.5 + rnd() * 6;
        const alpha = 0.35 + rnd() * 0.4;

        const bead = fctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, 0, cx, cy, r * 1.4);
        bead.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
        bead.addColorStop(0.35, `rgba(200, 235, 255, ${alpha * 0.5})`);
        bead.addColorStop(0.7, `rgba(120, 190, 245, ${alpha * 0.15})`);
        bead.addColorStop(1, 'rgba(80, 150, 220, 0)');
        fctx.fillStyle = bead;
        fctx.beginPath();
        fctx.arc(cx, cy, r, 0, Math.PI * 2);
        fctx.fill();

        fctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.7})`;
        fctx.lineWidth = 0.7;
        fctx.beginPath();
        fctx.arc(cx, cy, r * 0.72, 0, Math.PI * 2);
        fctx.stroke();
      }

      fctx.restore();
    }

    /**
     * Bordo prisma — alone ciano/magenta ai margini
     * @param {CanvasRenderingContext2D} fctx
     */
    function drawPrismEdge(fctx, w, h) {
      fctx.save();
      fctx.globalCompositeOperation = 'screen';

      const vignette = fctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.28, w / 2, h / 2, Math.max(w, h) * 0.95);
      vignette.addColorStop(0, 'rgba(255, 255, 255, 0)');
      vignette.addColorStop(0.75, 'rgba(90, 170, 240, 0.06)');
      vignette.addColorStop(1, 'rgba(55, 130, 220, 0.38)');
      fctx.fillStyle = vignette;
      fctx.fillRect(0, 0, w, h);

      fctx.globalAlpha = 0.22;
      fctx.fillStyle = 'rgba(120, 200, 255, 0.5)';
      fctx.fillRect(-4, 0, 10, h);
      fctx.fillStyle = 'rgba(200, 160, 255, 0.35)';
      fctx.fillRect(w - 6, 0, 10, h);

      fctx.restore();
    }

    /**
     * Grana fine per texture vetro
     * @param {CanvasRenderingContext2D} fctx
     * @param {() => number} rnd
     */
    function drawGlassGrain(fctx, w, h, rnd) {
      const grainCanvas = document.createElement('canvas');
      const gw = Math.max(1, Math.floor(w / 5));
      const gh = Math.max(1, Math.floor(h / 5));
      grainCanvas.width = gw;
      grainCanvas.height = gh;
      const gctx = grainCanvas.getContext('2d');
      if (!gctx) return;

      const imageData = gctx.createImageData(gw, gh);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const n = rnd();
        data[i] = 200 + Math.floor(n * 40);
        data[i + 1] = 230 + Math.floor(n * 25);
        data[i + 2] = 255;
        data[i + 3] = Math.floor(10 + n * 18);
      }

      gctx.putImageData(imageData, 0, 0);
      fctx.save();
      fctx.globalCompositeOperation = 'soft-light';
      fctx.globalAlpha = GRAIN_OPACITY;
      fctx.drawImage(grainCanvas, 0, 0, w, h);
      fctx.restore();
    }

    /**
     * Graffi statici diagonali sulla lastra
     * @param {CanvasRenderingContext2D} fctx
     * @param {() => number} rnd
     */
    function drawStaticScratches(fctx, w, h, rnd) {
      const count = Math.max(10, Math.floor((w * h) / 80000) * SCRATCH_DENSITY);
      fctx.save();
      fctx.globalCompositeOperation = 'screen';
      fctx.strokeStyle = `rgba(230, 245, 255, ${Math.min(1, SCRATCH_OPACITY * 2.2)})`;
      fctx.lineCap = 'round';

      for (let i = 0; i < count; i++) {
        const x = rnd() * w;
        const y = rnd() * h;
        const len = 18 + rnd() * 55;
        const angle = -0.8 + (rnd() - 0.5) * 0.4;
        fctx.lineWidth = 0.35 + rnd() * 0.8;
        fctx.beginPath();
        fctx.moveTo(x, y);
        fctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
        fctx.stroke();
      }

      fctx.restore();
    }

    function drawFrostBase() {
      if (!photoReady) return;

      const w = frostCanvas.width;
      const h = frostCanvas.height;
      const rnd = createRng(w * 9973 + h * 7919);
      frostCtx.clearRect(0, 0, w, h);

      /* 1 — foto dietro vetro ghiacciato */
      frostCtx.save();
      frostCtx.filter = `blur(${BLUR_AMOUNT}px) brightness(1.05) saturate(0.65) contrast(1.04)`;
      drawImageCover(frostCtx, photo, w, h);
      frostCtx.restore();

      /* 2 — lastra: blu profondo → ghiaccio perlaceo */
      const slab = frostCtx.createLinearGradient(0, 0, w, h);
      slab.addColorStop(0, `rgba(55, 120, 195, ${0.62 * FROST_OPACITY})`);
      slab.addColorStop(0.45, `rgba(150, 205, 245, ${0.5 * FROST_OPACITY})`);
      slab.addColorStop(1, `rgba(70, 145, 210, ${0.58 * FROST_OPACITY})`);
      frostCtx.fillStyle = slab;
      frostCtx.fillRect(0, 0, w, h);

      /* 3 — velo perlaceo centrale */
      const pearl = frostCtx.createRadialGradient(
        w * 0.42,
        h * 0.38,
        0,
        w * 0.5,
        h * 0.5,
        Math.max(w, h) * 0.72
      );
      pearl.addColorStop(0, `rgba(255, 255, 255, ${0.28 * FROST_OPACITY})`);
      pearl.addColorStop(0.5, `rgba(220, 245, 255, ${0.1 * FROST_OPACITY})`);
      pearl.addColorStop(1, `rgba(100, 170, 230, ${0.05 * FROST_OPACITY})`);
      frostCtx.fillStyle = pearl;
      frostCtx.fillRect(0, 0, w, h);

      drawGlassGrain(frostCtx, w, h, rnd);
      drawStaticScratches(frostCtx, w, h, rnd);
      drawGlacialBokeh(frostCtx, w, h, rnd);
      drawGlacierBeam(frostCtx, w, h);
      drawIceCrystals(frostCtx, w, h, rnd);
      drawCondensationBeads(frostCtx, w, h, rnd);
      drawPrismEdge(frostCtx, w, h);
    }

    function resetMeltMask() {
      meltCtx.clearRect(0, 0, meltCanvas.width, meltCanvas.height);
    }

    function resetCrackMask() {
      crackCtx.clearRect(0, 0, crackCanvas.width, crackCanvas.height);
      hasCrack = false;
      crackEnergy = 0;
      snowflakeCarry = 0;
    }

    function resize() {
      const rect = root.getBoundingClientRect();
      width = Math.max(1, Math.floor(rect.width));
      height = Math.max(1, Math.floor(rect.height));
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      brushRadius = BRUSH_SIZE;

      const pixelW = Math.floor(width * dpr);
      const pixelH = Math.floor(height * dpr);

      canvas.width = pixelW;
      canvas.height = pixelH;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      frostCanvas.width = pixelW;
      frostCanvas.height = pixelH;
      meltCanvas.width = pixelW;
      meltCanvas.height = pixelH;
      crackCanvas.width = pixelW;
      crackCanvas.height = pixelH;

      drawFrostBase();
      resetMeltMask();
      resetCrackMask();
      composite();
    }

    function drawShimmer() {
      if (reducedMotion) return;

      shimmerPhase += 0.012;
      const w = canvas.width;
      const h = canvas.height;
      const x = w * (0.38 + Math.sin(shimmerPhase) * 0.22);
      const y = h * (0.28 + Math.cos(shimmerPhase * 0.85) * 0.18);
      const r = Math.max(w, h) * 0.38;

      ctx.save();
      ctx.globalCompositeOperation = 'soft-light';
      const glow = ctx.createRadialGradient(x, y, 0, x, y, r);
      glow.addColorStop(0, 'rgba(255, 255, 255, 0.14)');
      glow.addColorStop(0.4, 'rgba(180, 230, 255, 0.06)');
      glow.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }

    function composite() {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(frostCanvas, 0, 0);
      ctx.globalCompositeOperation = 'destination-out';
      ctx.drawImage(meltCanvas, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(crackCanvas, 0, 0);
      drawShimmer();
    }

    function regrowMeltMask() {
      if (!hasMelt) return false;

      const imageData = meltCtx.getImageData(0, 0, meltCanvas.width, meltCanvas.height);
      const data = imageData.data;
      let changed = false;
      let stillMelted = false;

      for (let i = 3; i < data.length; i += 4) {
        const alpha = data[i];
        if (alpha <= 1) continue;

        stillMelted = true;
        const next = alpha - alpha * refreezeGrowth;
        data[i] = next > 254 ? 255 : next;
        changed = true;
      }

      if (!stillMelted) {
        hasMelt = false;
        resetMeltMask();
        if (!hasCrack) stopMeltLoop();
        return true;
      }

      if (changed) {
        meltCtx.putImageData(imageData, 0, 0);
      }

      return changed;
    }

    const STEP_SPACING = Math.max(3, BRUSH_SIZE * 0.28);

    /**
     * Frammento irregolare che apre un buco nel ghiaccio
     * @param {() => number} rnd
     */
    function carveJaggedShard(px, py, shardSize, rotation, rnd) {
      const verts = 5 + Math.floor(rnd() * 4);
      const rough = 0.35 + EDGE_ROUGHNESS * 0.85;

      meltCtx.save();
      meltCtx.translate(px, py);
      meltCtx.rotate(rotation);
      meltCtx.beginPath();

      for (let i = 0; i < verts; i++) {
        const t = i / verts;
        const a = t * Math.PI * 2 + (rnd() - 0.5) * rough;
        const rr = shardSize * (0.5 + rnd() * 0.55);
        const vx = Math.cos(a) * rr;
        const vy = Math.sin(a) * rr;
        if (i === 0) meltCtx.moveTo(vx, vy);
        else meltCtx.lineTo(vx, vy);
      }

      meltCtx.closePath();
      meltCtx.fillStyle = 'rgba(255, 255, 255, 1)';
      meltCtx.fill();
      meltCtx.restore();

      crackCtx.save();
      crackCtx.globalCompositeOperation = 'lighter';
      crackCtx.translate(px, py);
      crackCtx.rotate(rotation);
      crackCtx.strokeStyle = `rgba(240, 250, 255, ${0.4 + rnd() * 0.35})`;
      crackCtx.lineWidth = 0.8;
      crackCtx.beginPath();
      for (let i = 0; i < verts; i++) {
        const t = i / verts;
        const a = t * Math.PI * 2 + (rnd() - 0.5) * rough;
        const rr = shardSize * (0.5 + rnd() * 0.55);
        const vx = Math.cos(a) * rr;
        const vy = Math.sin(a) * rr;
        if (i === 0) crackCtx.moveTo(vx, vy);
        else crackCtx.lineTo(vx, vy);
      }
      crackCtx.closePath();
      crackCtx.stroke();
      crackCtx.restore();
    }

    function spawnScrapeParticles(px, py, radius, rnd) {
      const count = Math.max(1, PARTICLE_DENSITY);
      crackCtx.save();
      crackCtx.globalCompositeOperation = 'lighter';

      for (let i = 0; i < count; i++) {
        const a = rnd() * Math.PI * 2;
        const d = radius * (0.35 + rnd() * 0.9);
        const x = px + Math.cos(a) * d;
        const y = py + Math.sin(a) * d;
        const r = 0.6 + rnd() * 1.9;
        crackCtx.fillStyle = `rgba(235, 248, 255, ${0.24 + rnd() * 0.35})`;
        crackCtx.beginPath();
        crackCtx.arc(x, y, r, 0, Math.PI * 2);
        crackCtx.fill();
      }

      crackCtx.restore();
    }

    function spawnSnowflake(px, py, radius, rnd) {
      const size = 2.5 + rnd() * 4.8;
      const x = px + (rnd() - 0.5) * radius * 2.2;
      const y = py + (rnd() - 0.5) * radius * 2.2;
      const rotation = rnd() * Math.PI;
      drawSnowGlyph(crackCtx, x, y, size, 0.28 + rnd() * 0.28, rotation);
    }

    /**
     * Percorso frattura irregolare — taglia la maschera del ghiaccio
     * @returns {{ x: number, y: number }[]}
     */
    function buildCrackPath(x, y, angle, length, rnd, steps = 0) {
      const count = steps || Math.max(5, Math.floor(length / 8));
      const points = [{ x, y }];
      let cx = x;
      let cy = y;
      let dir = angle;
      const stepLen = length / count;

      for (let i = 1; i <= count; i++) {
        const t = i / count;
        dir += (rnd() - 0.5) * 0.32 * (0.35 + EDGE_ROUGHNESS) * (1 - t * 0.45);
        const jitter = (rnd() - 0.5) * stepLen * (0.12 + EDGE_ROUGHNESS * 0.22);
        cx += Math.cos(dir) * stepLen + Math.cos(dir + Math.PI / 2) * jitter;
        cy += Math.sin(dir) * stepLen + Math.sin(dir + Math.PI / 2) * jitter;
        points.push({ x: cx, y: cy });
      }

      return points;
    }

    /**
     * Incide la crepa nella melt mask e aggiunge alone chiaro al bordo
     * @param {{ x: number, y: number }[]} points
     */
    function carveCrackBranch(points, width, alpha, rnd) {
      if (points.length < 2) return;

      const taper = (i) => {
        const t = i / (points.length - 1);
        return width * (1.1 - t * 0.82);
      };

      /* buco vero: le linee entrano nella mask di scioglimento */
      meltCtx.save();
      meltCtx.globalCompositeOperation = 'source-over';
      meltCtx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
      meltCtx.lineCap = 'round';
      meltCtx.lineJoin = 'round';

      for (let i = 1; i < points.length; i++) {
        meltCtx.lineWidth = Math.max(0.55, taper(i));
        meltCtx.beginPath();
        meltCtx.moveTo(points[i - 1].x, points[i - 1].y);
        meltCtx.lineTo(points[i].x, points[i].y);
        meltCtx.stroke();
      }
      meltCtx.restore();

      /* bordo brillante della crepa (non scuro) */
      crackCtx.save();
      crackCtx.globalCompositeOperation = 'lighter';
      crackCtx.strokeStyle = `rgba(230, 246, 255, ${alpha * (0.3 + rnd() * 0.25)})`;
      crackCtx.lineCap = 'round';
      crackCtx.lineJoin = 'round';

      for (let i = 1; i < points.length; i++) {
        crackCtx.lineWidth = Math.max(0.25, taper(i) * 0.55);
        crackCtx.beginPath();
        crackCtx.moveTo(points[i - 1].x - 0.25, points[i - 1].y - 0.25);
        crackCtx.lineTo(points[i].x - 0.25, points[i].y - 0.25);
        crackCtx.stroke();
      }
      crackCtx.restore();
    }

    /**
     * Ramo principale + diramazioni secondarie
     * @param {() => number} rnd
     */
    function growCrack(x, y, angle, length, depth, width, alpha, rnd) {
      const points = buildCrackPath(x, y, angle, length, rnd);
      carveCrackBranch(points, width, alpha, rnd);

      if (depth <= 0 || points.length < 4) return;

      const branchCount = rnd() > 0.6 ? 2 : 1;
      for (let b = 0; b < branchCount; b++) {
        const idx = 2 + Math.floor(rnd() * (points.length - 3));
        const origin = points[idx];
        const parent = points[Math.max(0, idx - 1)];
        const parentDir = Math.atan2(origin.y - parent.y, origin.x - parent.x);
        const branchAngle =
          parentDir + (rnd() > 0.5 ? 1 : -1) * (0.3 + rnd() * 0.52);
        const branchLen = length * (0.24 + rnd() * 0.3);

        if (branchLen > 7) {
          growCrack(
            origin.x,
            origin.y,
            branchAngle,
            branchLen,
            depth - 1,
            width * 0.62,
            alpha * 0.78,
            rnd
          );
        }
      }
    }

    /**
     * Un passo di scraping (config: densità per step interpolato)
     * @param {number} cssX
     * @param {number} cssY
     * @param {number} moveAngle
     */
    function scrapeAtPoint(cssX, cssY, moveAngle) {
      const px = cssX * dpr;
      const py = cssY * dpr;
      const radius = BRUSH_SIZE * dpr;
      const rnd = createRng(
        Math.floor(px * 12.9898 + py * 78.233) ^ Math.floor(Math.random() * 1e6)
      );

      /* nucleo del graffio — buco che mostra lo sfondo */
      meltCtx.save();
      meltCtx.globalCompositeOperation = 'source-over';
      meltCtx.translate(px, py);
      meltCtx.rotate(moveAngle);
      meltCtx.fillStyle = 'rgba(255, 255, 255, 1)';
      meltCtx.beginPath();
      meltCtx.ellipse(0, 0, radius * 0.52, radius * 0.38, 0, 0, Math.PI * 2);
      meltCtx.fill();
      meltCtx.restore();

      /* frammenti frastagliati (SCRATCH_DENSITY per step) */
      for (let i = 0; i < SCRATCH_DENSITY; i++) {
        const a = rnd() * Math.PI * 2;
        const dist = radius * (0.15 + rnd() * 0.75);
        const sx = px + Math.cos(a) * dist;
        const sy = py + Math.sin(a) * dist;
        const shardSize = radius * (0.22 + rnd() * 0.38);
        carveJaggedShard(sx, sy, shardSize, moveAngle + (rnd() - 0.5) * 1.4, rnd);
      }

      /* crepe ramificate (CRACK_DENSITY per step) */
      for (let i = 0; i < CRACK_DENSITY; i++) {
        const angle = moveAngle + (rnd() - 0.5) * Math.PI * 1.2;
        const len = radius * (0.65 + rnd() * 1.05);
        growCrack(px, py, angle, len, 1, 0.65 + rnd() * 0.5, 0.5 + rnd() * 0.35, rnd);
      }

      /* bordo luminoso del buco */
      crackCtx.save();
      crackCtx.strokeStyle = 'rgba(230, 248, 255, 0.45)';
      crackCtx.lineWidth = 1;
      crackCtx.beginPath();
      crackCtx.ellipse(px, py, radius * 0.5, radius * 0.36, moveAngle, 0, Math.PI * 2);
      crackCtx.stroke();
      crackCtx.restore();

      spawnScrapeParticles(px, py, radius, rnd);
      hasMelt = true;
      hasCrack = true;
      crackEnergy = Math.min(1, crackEnergy + 0.12);
    }

    /**
     * Interpola lungo il drag così non restano spazi vuoti
     */
    function scrapeSegment(x0, y0, x1, y1) {
      const dx = x1 - x0;
      const dy = y1 - y0;
      const dist = Math.hypot(dx, dy);
      const moveAngle = dist > 0.001 ? Math.atan2(dy, dx) : 0;
      const steps = Math.max(1, Math.ceil(dist / STEP_SPACING));

      for (let i = 0; i <= steps; i++) {
        const t = steps === 0 ? 0 : i / steps;
        scrapeAtPoint(x0 + dx * t, y0 + dy * t, moveAngle);
      }

      const flakesPerStep = (SNOWFLAKE_AMOUNT / 100) * dist;
      snowflakeCarry += flakesPerStep;
      const rnd = createRng(
        Math.floor(x1 * 103.7 + y1 * 79.2 + dist * 11.3) ^
          Math.floor(Math.random() * 1e6)
      );
      while (snowflakeCarry >= 1) {
        spawnSnowflake(x1 * dpr, y1 * dpr, BRUSH_SIZE * dpr, rnd);
        snowflakeCarry -= 1;
      }
    }

    function decayCracks() {
      if (!hasCrack) return;

      crackEnergy *= 0.965;
      crackCtx.save();
      crackCtx.globalCompositeOperation = 'destination-out';
      crackCtx.fillStyle = `rgba(0, 0, 0, ${0.025 + (1 - crackEnergy) * 0.08})`;
      crackCtx.fillRect(0, 0, crackCanvas.width, crackCanvas.height);
      crackCtx.restore();

      if (crackEnergy < 0.03) {
        resetCrackMask();
      }
    }

    /** @param {PointerEvent} event */
    function handlePointerMove(event) {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      if (x < 0 || y < 0 || x > rect.width || y > rect.height) return;

      if (lastPointerX !== null && lastPointerY !== null) {
        scrapeSegment(lastPointerX, lastPointerY, x, y);
      } else {
        scrapeAtPoint(x, y, 0);
      }
      lastPointerX = x;
      lastPointerY = y;
      composite();
      ensureLoop();
    }

    function tick() {
      if (!running) return;

      if (!reducedMotion && hasMelt) {
        regrowMeltMask();
      }
      if (!reducedMotion && hasCrack) {
        decayCracks();
      }

      composite();
      rafId = requestAnimationFrame(tick);
    }

    function idleTick() {
      if (!running || reducedMotion) return;
      composite();
      idleRafId = requestAnimationFrame(idleTick);
    }

    function startMeltLoop() {
      if (rafId !== null || reducedMotion) return;
      stopIdleLoop();
      rafId = requestAnimationFrame(tick);
    }

    function ensureLoop() {
      if (!reducedMotion) {
        if (hasMelt || hasCrack) startMeltLoop();
        else startIdleLoop();
      }
    }

    function stopMeltLoop() {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      if (!reducedMotion && running) startIdleLoop();
    }

    function startIdleLoop() {
      if (idleRafId !== null || reducedMotion || rafId !== null) return;
      idleRafId = requestAnimationFrame(idleTick);
    }

    function stopIdleLoop() {
      if (idleRafId !== null) {
        cancelAnimationFrame(idleRafId);
        idleRafId = null;
      }
    }

    photo.onload = () => {
      photoReady = true;
      drawFrostBase();
      composite();
    };

    const resizeObserver = new ResizeObserver(() => resize());
    resizeObserver.observe(root);
    resize();
    startIdleLoop();

    /** @param {TouchEvent} event */
    function handleTouchMove(event) {
      if (event.touches.length === 0) return;
      event.preventDefault();
      const touch = event.touches[0];
      handlePointerMove(
        new PointerEvent('pointermove', {
          clientX: touch.clientX,
          clientY: touch.clientY,
          bubbles: true
        })
      );
    }

    function resetPointerTrail() {
      lastPointerX = null;
      lastPointerY = null;
    }

    /** @param {PointerEvent} event */
    function handlePointerDown(event) {
      if (canvas.setPointerCapture) {
        try {
          canvas.setPointerCapture(event.pointerId);
        } catch {
          /* ignore */
        }
      }
      handlePointerMove(event);
    }

    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointerup', resetPointerTrail);
    canvas.addEventListener('pointerleave', resetPointerTrail);
    canvas.addEventListener('pointercancel', resetPointerTrail);
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      running = false;
      stopMeltLoop();
      stopIdleLoop();
      resizeObserver.disconnect();
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointerup', resetPointerTrail);
      canvas.removeEventListener('pointerleave', resetPointerTrail);
      canvas.removeEventListener('pointercancel', resetPointerTrail);
      canvas.removeEventListener('touchmove', handleTouchMove);
      motionQuery.removeEventListener('change', updateMotionPreference);
    };
  });
</script>

<div class="hero-frost" bind:this={rootEl} aria-hidden="true">
  <!-- Foto nitida: visibile dove il ghiaccio si scioglie -->
  <img class="hero-frost-img" src={heroImageSrc} alt="" />
  <canvas class="hero-frost-canvas" bind:this={canvasEl}></canvas>
</div>

<style>
  .hero-frost {
    position: absolute;
    inset: 0;
    z-index: 0;
    overflow: hidden;
  }

  .hero-frost-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: 50% 44%;
    display: block;
    transform: scale(1.18);
    transform-origin: 50% 44%;
  }

  .hero-frost-canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    touch-action: none;
    cursor: grab;
  }

  .hero-frost-canvas:active {
    cursor: grabbing;
  }
</style>
