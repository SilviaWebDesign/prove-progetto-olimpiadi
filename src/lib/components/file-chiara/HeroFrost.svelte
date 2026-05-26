<script>
  import { onMount } from 'svelte';

  /** @type {{ src: string, refreezeMs?: number }} */
  let { src, refreezeMs = 4000 } = $props();

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
    const frostCtx = frostCanvas.getContext('2d', { alpha: true });
    const meltCtx = meltCanvas.getContext('2d', { alpha: true });
    if (!frostCtx || !meltCtx) return;

    const photo = new Image();
    photo.decoding = 'async';
    photo.src = src;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let brushRadius = 44;
    let photoReady = false;
    let reducedMotion = false;
    let running = true;
    let hasMelt = false;

    /** Alpha melt → 0 in ~refreezeMs (60fps) */
    const refreezeFrames = Math.max(90, (refreezeMs / 1000) * 60);
    const refreezeGrowth = 1 - Math.pow(0.015, 1 / refreezeFrames);

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    function updateMotionPreference() {
      reducedMotion = motionQuery.matches;
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

      const scale = Math.max(w / iw, h / ih);
      const sw = iw * scale;
      const sh = ih * scale;
      const sx = (w - sw) / 2;
      const sy = (h - sh) / 2;
      fctx.drawImage(img, sx, sy, sw, sh);
    }

    /**
     * Ramo dendritico — pattern brina su vetro
     * @param {CanvasRenderingContext2D} fctx
     */
    function drawDendriteBranch(
      fctx,
      x,
      y,
      angle,
      len,
      depth,
      lineW,
      hue
    ) {
      if (depth <= 0 || len < 1.5) return;

      const ex = x + Math.cos(angle) * len;
      const ey = y + Math.sin(angle) * len;
      const alpha = 0.12 + depth * 0.11;

      fctx.strokeStyle = `rgba(${hue}, ${alpha})`;
      fctx.lineWidth = lineW;
      fctx.lineCap = 'round';
      fctx.beginPath();
      fctx.moveTo(x, y);
      fctx.lineTo(ex, ey);
      fctx.stroke();

      if (depth > 1 && Math.random() > 0.15) {
        const forks = 2 + (Math.random() > 0.55 ? 1 : 0);
        for (let i = 0; i < forks; i++) {
          const spread = 0.35 + Math.random() * 0.55;
          const dir = i === 0 ? 1 : -1;
          drawDendriteBranch(
            fctx,
            ex,
            ey,
            angle + dir * spread,
            len * (0.5 + Math.random() * 0.28),
            depth - 1,
            lineW * 0.62,
            hue
          );
        }
      }
    }

    /**
     * @param {CanvasRenderingContext2D} fctx
     * @param {number} w
     * @param {number} h
     */
    function drawDendriticIce(fctx, w, h) {
      const seeds = [
        [0, 0],
        [w, 0],
        [0, h],
        [w, h],
        [w * 0.5, 0],
        [w * 0.25, 0],
        [w * 0.75, 0],
        [0, h * 0.4],
        [w, h * 0.35]
      ];

      fctx.save();
      fctx.globalCompositeOperation = 'lighter';
      fctx.shadowColor = 'rgba(200, 235, 255, 0.85)';
      fctx.shadowBlur = 3;

      for (const [sx, sy] of seeds) {
        const arms = 38 + Math.floor(Math.random() * 22);
        for (let i = 0; i < arms; i++) {
          const angle =
            Math.atan2(h * 0.5 - sy, w * 0.5 - sx) +
            (Math.random() - 0.5) * 1.6;
          const len = 40 + Math.random() * Math.min(w, h) * 0.42;
          const hue =
            Math.random() > 0.5
              ? '255, 255, 255'
              : '210, 235, 255';
          drawDendriteBranch(fctx, sx, sy, angle, len, 5, 1.4 + Math.random(), hue);
        }
      }

      fctx.restore();
    }

    /**
     * @param {CanvasRenderingContext2D} fctx
     * @param {number} w
     * @param {number} h
     */
    function drawIceSparkles(fctx, w, h) {
      const count = Math.floor((w * h) / 5000);
      fctx.save();
      fctx.globalCompositeOperation = 'lighter';

      for (let i = 0; i < count; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        const r = 0.5 + Math.random() * 2.2;
        fctx.fillStyle = `rgba(255, 255, 255, ${0.25 + Math.random() * 0.55})`;
        fctx.beginPath();
        fctx.arc(x, y, r, 0, Math.PI * 2);
        fctx.fill();
      }

      fctx.restore();
    }

    function drawFrostBase() {
      if (!photoReady) return;

      const w = frostCanvas.width;
      const h = frostCanvas.height;
      frostCtx.clearRect(0, 0, w, h);

      /* 1 — foto sfocata dietro il ghiaccio (come vetro ghiacciato) */
      frostCtx.save();
      frostCtx.filter = 'blur(22px) brightness(1.14) saturate(0.75) contrast(1.05)';
      drawImageCover(frostCtx, photo, w, h);
      frostCtx.restore();

      /* 2 — velo glaciale denso, semi-opaco */
      const iceVeil = frostCtx.createLinearGradient(0, 0, w, h);
      iceVeil.addColorStop(0, 'rgba(165, 200, 230, 0.72)');
      iceVeil.addColorStop(0.4, 'rgba(215, 238, 255, 0.68)');
      iceVeil.addColorStop(1, 'rgba(175, 210, 240, 0.74)');
      frostCtx.fillStyle = iceVeil;
      frostCtx.fillRect(0, 0, w, h);

      /* 3 — riflessi speculari del ghiaccio */
      const glare = frostCtx.createLinearGradient(0, 0, w * 0.6, h * 0.5);
      glare.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
      glare.addColorStop(0.25, 'rgba(255, 255, 255, 0.12)');
      glare.addColorStop(0.6, 'rgba(255, 255, 255, 0)');
      frostCtx.fillStyle = glare;
      frostCtx.fillRect(0, 0, w, h);

      const rim = frostCtx.createRadialGradient(
        w / 2,
        h / 2,
        Math.min(w, h) * 0.12,
        w / 2,
        h / 2,
        Math.max(w, h) * 0.85
      );
      rim.addColorStop(0, 'rgba(255, 255, 255, 0.02)');
      rim.addColorStop(0.7, 'rgba(130, 175, 215, 0.08)');
      rim.addColorStop(1, 'rgba(100, 155, 210, 0.38)');
      frostCtx.fillStyle = rim;
      frostCtx.fillRect(0, 0, w, h);

      /* 4 — cristalli dendritici (brina) */
      drawDendriticIce(frostCtx, w, h);

      /* 5 — grana ghiaccio + brillii */
      drawIceSparkles(frostCtx, w, h);

      /* 6 — patina bianca finale */
      frostCtx.fillStyle = 'rgba(248, 252, 255, 0.22)';
      frostCtx.fillRect(0, 0, w, h);
    }

    function resetMeltMask() {
      meltCtx.clearRect(0, 0, meltCanvas.width, meltCanvas.height);
    }

    function resize() {
      const rect = root.getBoundingClientRect();
      width = Math.max(1, Math.floor(rect.width));
      height = Math.max(1, Math.floor(rect.height));
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      brushRadius = Math.max(36, Math.min(52, width * 0.026));

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

      drawFrostBase();
      resetMeltMask();
      composite();
    }

    function composite() {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(frostCanvas, 0, 0);
      ctx.globalCompositeOperation = 'destination-out';
      ctx.drawImage(meltCanvas, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
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
        return true;
      }

      if (changed) {
        meltCtx.putImageData(imageData, 0, 0);
      }

      return changed;
    }

    function paintMelt(x, y) {
      const px = x * dpr;
      const py = y * dpr;
      const r = brushRadius * dpr;

      const gradient = meltCtx.createRadialGradient(px, py, 0, px, py, r);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
      gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.85)');
      gradient.addColorStop(0.45, 'rgba(255, 255, 255, 0.25)');
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

      meltCtx.globalCompositeOperation = 'source-over';
      meltCtx.fillStyle = gradient;
      meltCtx.beginPath();
      meltCtx.arc(px, py, r, 0, Math.PI * 2);
      meltCtx.fill();
      hasMelt = true;
    }

    /** @param {PointerEvent} event */
    function handlePointerMove(event) {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      if (x < 0 || y < 0 || x > rect.width || y > rect.height) return;

      paintMelt(x, y);
      composite();
      ensureLoop();
    }

    function tick() {
      if (!running) return;

      if (!reducedMotion && hasMelt) {
        regrowMeltMask();
        composite();
        rafId = requestAnimationFrame(tick);
      } else {
        rafId = null;
      }
    }

    function startLoop() {
      if (rafId !== null || reducedMotion) return;
      rafId = requestAnimationFrame(tick);
    }

    function ensureLoop() {
      if (!reducedMotion && rafId === null) {
        startLoop();
      }
    }

    function stopLoop() {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
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

    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerdown', handlePointerMove);
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      running = false;
      stopLoop();
      resizeObserver.disconnect();
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerdown', handlePointerMove);
      canvas.removeEventListener('touchmove', handleTouchMove);
      motionQuery.removeEventListener('change', updateMotionPreference);
    };
  });
</script>

<div class="hero-frost" bind:this={rootEl} aria-hidden="true">
  <!-- Foto nitida: visibile dove il ghiaccio si scioglie -->
  <img class="hero-frost-img" {src} alt="" />
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
    object-position: center;
    display: block;
  }

  .hero-frost-canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    touch-action: none;
    cursor: crosshair;
  }
</style>
