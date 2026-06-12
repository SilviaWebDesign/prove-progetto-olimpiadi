<script lang="ts">
  // ─── Props ───────────────────────────────────────────────────────────────
  interface Props { src: string; }
  let { src }: Props = $props();

  // ─── Config — identico al prototipo frost-reveal ─────────────────────────
  const FROST_OPACITY            = 1.0;
  const FROST_VEIL_OPACITY       = 0.42;
  const GRAIN_OPACITY            = 0.30;
  const SCRATCH_OPACITY          = 0.16;
  const BLUR_AMOUNT              = 23;
  const INITIAL_SNOWFLAKE_DENSITY = 40;
  const INITIAL_SPECKLE_DENSITY   = 600;
  const INITIAL_CRYSTAL_OPACITY   = 0.55;
  const REVEAL_RADIUS            = 120;
  const REVEAL_LIFETIME          = 1600;
  const REVEAL_POINT_SPACING     = 6;
  const REVEAL_EDGE_SOFTNESS     = 0.38;
  const REVEAL_SHARD_COUNT       = 20;
  const REVEAL_SNOWFLAKE_CHANCE  = 0.06;
  const MAX_REVEAL_STRENGTH      = 0.55;
  const STATIONARY_DEFROST_DELAY = 500;
  const STATIONARY_DEFROST_RATE  = 0.007;
  const MAX_STATIONARY_STRENGTH  = 0.70;

  // ─── DOM refs ($state → tracciati da $effect) ────────────────────────────
  let wrapper = $state<HTMLDivElement | null>(null);
  let canvas  = $state<HTMLCanvasElement | null>(null);

  // ─── Variabili interne (non reattive) ────────────────────────────────────
  let ctx: CanvasRenderingContext2D | null        = null;
  let imgEl: HTMLImageElement | null             = null;
  let cssW = 0;
  let cssH = 0;
  let frostedCanvas: HTMLCanvasElement | null    = null;
  let frostedCtx: CanvasRenderingContext2D | null = null;
  let revealCanvas: HTMLCanvasElement | null     = null;
  let revealCtx: CanvasRenderingContext2D | null  = null;

  interface Shard { angle: number; dist: number; rot: number; alpha: number; pts: [number,number][]; }
  interface RevealPoint { x: number; y: number; timestamp: number; shards: Shard[]; }
  let revealPoints: RevealPoint[] = [];
  let lastRevealX: number | undefined;
  let lastRevealY: number | undefined;
  let animRafId: number | null = null;
  let stationaryAccum = 0;
  let lastMoveTime    = 0;
  let cursorX: number | undefined;
  let cursorY: number | undefined;
  let cursorInside    = false;

  // ─── Setup su mount ──────────────────────────────────────────────────────
  $effect(() => {
    if (!canvas || !wrapper) return;

    const dpr  = window.devicePixelRatio || 1;
    const rect = wrapper.getBoundingClientRect();
    cssW = rect.width;
    cssH = rect.height;

    canvas.width  = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);

    ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);

    frostedCanvas        = document.createElement('canvas');
    frostedCanvas.width  = Math.round(cssW * dpr);
    frostedCanvas.height = Math.round(cssH * dpr);
    frostedCtx           = frostedCanvas.getContext('2d')!;
    frostedCtx.scale(dpr, dpr);

    revealCanvas        = document.createElement('canvas');
    revealCanvas.width  = Math.round(cssW * dpr);
    revealCanvas.height = Math.round(cssH * dpr);
    revealCtx           = revealCanvas.getContext('2d')!;
    revealCtx.scale(dpr, dpr);

    const img       = new Image();
    img.crossOrigin = 'anonymous';
    img.onload      = () => { imgEl = img; drawFrost(); };
    img.src         = src;

    return () => {
      if (animRafId !== null) { cancelAnimationFrame(animRafId); animRafId = null; }
      ctx = null; imgEl = null; frostedCanvas = null; frostedCtx = null;
      revealCanvas = null; revealCtx = null; revealPoints = [];
    };
  });

  // ─── FROST DRAWING ────────────────────────────────────────────────────────
  function drawFrost() {
    if (!frostedCtx || !imgEl) return;
    const w = cssW;
    const h = cssH;
    const mainCtx = ctx;
    ctx = frostedCtx;
    ctx!.globalCompositeOperation = 'source-over';
    ctx!.globalAlpha = 1;
    ctx!.clearRect(0, 0, w, h);
    drawBlurredImage(w, h);
    drawFrostColor(w, h);
    drawGrain(w, h);
    drawStaticScratches(w, h);
    drawInitialFrostDetails(w, h);
    drawFrostVeil(w, h);
    ctx = mainCtx;
    renderCurrentState();
  }

  /** Allinea il disegno canvas a object-fit: cover + object-position: center dell'img .sharp */
  function drawImageCover(img: HTMLImageElement, w: number, h: number, bleed = 0) {
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    if (!iw || !ih) return;

    const scale = Math.max(w / iw, h / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    const dx = (w - dw) / 2 - bleed;
    const dy = (h - dh) / 2 - bleed;

    ctx!.drawImage(img, dx, dy, dw + bleed * 2, dh + bleed * 2);
  }

  function drawBlurredImage(w: number, h: number) {
    const bleed = BLUR_AMOUNT * 2;
    ctx!.save();
    ctx!.filter = `blur(${BLUR_AMOUNT}px) brightness(1.15) saturate(0.55) contrast(1.08)`;
    drawImageCover(imgEl!, w, h, bleed);
    ctx!.filter = 'none';
    ctx!.restore();
  }

  function drawFrostColor(w: number, h: number) {
    ctx!.save();
    ctx!.globalAlpha = FROST_OPACITY;
    const patches: [number,number,number,string,number,number][] = [
      [0.12, 0.18, 0.70, '218,238,255', 0.78, 0.48],
      [0.88, 0.82, 0.60, '205,230,255', 0.72, 0.42],
      [0.65, 0.44, 0.42, '230,245,255', 0.58, 0.00],
      [0.50, 0.88, 0.60, '200,225,252', 0.48, 0.00],
    ];
    for (const [cx, cy, r, rgb, a0, a1] of patches) {
      const g = ctx!.createRadialGradient(w * cx, h * cy, 0, w * cx, h * cy, w * r);
      g.addColorStop(0, `rgba(${rgb},${a0})`);
      if (a1 > 0) g.addColorStop(0.45, `rgba(${rgb},${a1})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx!.fillStyle = g;
      ctx!.fillRect(0, 0, w, h);
    }
    ctx!.globalAlpha = FROST_VEIL_OPACITY;
    ctx!.fillStyle   = 'rgba(215,235,255,1)';
    ctx!.fillRect(0, 0, w, h);
    ctx!.restore();
  }

  function drawFrostVeil(w: number, h: number) {
    ctx!.save();
    ctx!.globalAlpha = 0.22;
    ctx!.fillStyle   = 'rgba(248, 252, 255, 1)';
    ctx!.fillRect(0, 0, w, h);
    ctx!.restore();
  }

  function drawGrain(w: number, h: number) {
    const S = 200;
    const off  = document.createElement('canvas');
    off.width  = S;
    off.height = S;
    const gctx = off.getContext('2d')!;
    const data = gctx.createImageData(S, S);
    const d    = data.data;
    for (let i = 0; i < d.length; i += 4) {
      if (Math.random() < 0.4) {
        const v   = 180 + Math.floor(Math.random() * 75);
        d[i]     = v;
        d[i + 1] = v;
        d[i + 2] = Math.min(255, v + 25);
        d[i + 3] = Math.floor(Math.random() * 38);
      }
    }
    gctx.putImageData(data, 0, 0);
    ctx!.save();
    ctx!.globalAlpha = GRAIN_OPACITY;
    ctx!.globalCompositeOperation = 'overlay';
    ctx!.fillStyle   = ctx!.createPattern(off, 'repeat')!;
    ctx!.fillRect(0, 0, w, h);
    ctx!.restore();
  }

  function drawStaticScratches(w: number, h: number) {
    const diag = Math.sqrt(w * w + h * h);
    ctx!.save();
    ctx!.globalAlpha = SCRATCH_OPACITY;
    ctx!.lineCap     = 'round';
    const families: [number,number,number,number][] = [
      [22, 6, 0.30, 0.8], [71, 10, 0.25, 0.5], [168, 18, 0.20, 0.4],
    ];
    for (const [deg, spacing, prob, maxW] of families) {
      const angle = (deg * Math.PI) / 180;
      const perp  = angle + Math.PI / 2;
      for (let pos = -diag; pos < diag; pos += spacing) {
        if (Math.random() > prob) continue;
        const ox = w / 2 + Math.cos(perp) * pos;
        const oy = h / 2 + Math.sin(perp) * pos;
        ctx!.beginPath();
        ctx!.lineWidth   = 0.2 + Math.random() * maxW;
        ctx!.strokeStyle = `rgba(255,255,255,${0.2 + Math.random() * 0.5})`;
        ctx!.moveTo(ox - Math.cos(angle) * diag, oy - Math.sin(angle) * diag);
        ctx!.lineTo(ox + Math.cos(angle) * diag, oy + Math.sin(angle) * diag);
        ctx!.stroke();
      }
    }
    ctx!.restore();
  }

  function drawInitialFrostDetails(w: number, h: number) {
    ctx!.save();
    ctx!.globalCompositeOperation = 'source-over';
    for (let i = 0; i < INITIAL_SPECKLE_DENSITY; i++) {
      const x     = Math.random() * w;
      const y     = Math.random() * h;
      const size  = 0.5 + Math.random() * 3.2;
      const alpha = (0.08 + Math.random() * 0.40) * INITIAL_CRYSTAL_OPACITY;
      ctx!.globalAlpha = alpha;
      ctx!.fillStyle   = `rgba(${220 + Math.floor(Math.random() * 30)}, ${238 + Math.floor(Math.random() * 17)}, 255, 1)`;
      ctx!.save();
      ctx!.translate(x, y);
      ctx!.rotate(Math.random() * Math.PI);
      if (Math.random() < 0.55) {
        const hw = size * 0.12, hl = size * 0.88;
        ctx!.fillRect(-hw, -hl, hw * 2, hl * 2);
      } else {
        ctx!.beginPath();
        const pts = 3 + Math.floor(Math.random() * 3);
        for (let j = 0; j < pts; j++) {
          const a = (j / pts) * Math.PI * 2 + (Math.random() - 0.5) * 0.6;
          const d = size * (0.38 + Math.random() * 0.52);
          j === 0 ? ctx!.moveTo(Math.cos(a) * d, Math.sin(a) * d)
                  : ctx!.lineTo(Math.cos(a) * d, Math.sin(a) * d);
        }
        ctx!.closePath();
        ctx!.fill();
      }
      ctx!.restore();
    }
    ctx!.strokeStyle = 'rgba(210, 235, 255, 1)';
    ctx!.lineCap     = 'round';
    const branchCount = Math.floor(w * 0.18);
    for (let i = 0; i < branchCount; i++) {
      const x     = Math.random() * w;
      const y     = Math.random() * h;
      const angle = Math.random() * Math.PI * 2;
      const len   = 10 + Math.random() * 65;
      const alpha = (0.03 + Math.random() * 0.11) * INITIAL_CRYSTAL_OPACITY;
      ctx!.globalAlpha = alpha;
      ctx!.lineWidth   = 0.2 + Math.random() * 0.65;
      ctx!.beginPath();
      ctx!.moveTo(x, y);
      ctx!.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
      ctx!.stroke();
      if (Math.random() < 0.52) {
        const snapDeg = [30, 45, 60][Math.floor(Math.random() * 3)];
        const bSign   = Math.random() < 0.5 ? 1 : -1;
        const bAngle  = angle + snapDeg * Math.PI / 180 * bSign;
        const bFrac   = 0.30 + Math.random() * 0.40;
        const bLen    = len * (0.25 + Math.random() * 0.30);
        const bx      = x + Math.cos(angle) * len * bFrac;
        const by      = y + Math.sin(angle) * len * bFrac;
        ctx!.globalAlpha = alpha * 0.55;
        ctx!.lineWidth  *= 0.5;
        ctx!.beginPath();
        ctx!.moveTo(bx, by);
        ctx!.lineTo(bx + Math.cos(bAngle) * bLen, by + Math.sin(bAngle) * bLen);
        ctx!.stroke();
      }
    }
    for (let i = 0; i < INITIAL_SNOWFLAKE_DENSITY; i++) {
      const x       = Math.random() * w;
      const y       = Math.random() * h;
      const radius  = 3 + Math.random() * 22;
      const opacity = (0.07 + Math.random() * 0.30) * INITIAL_CRYSTAL_OPACITY;
      drawSnowflake(x, y, radius, Math.random() * Math.PI, opacity);
    }
    ctx!.restore();
  }

  // ─── POINTER INTERACTION ─────────────────────────────────────────────────
  function getCoords(e: PointerEvent) {
    const rect = wrapper!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function onPointerMove(e: PointerEvent) {
    const { x, y } = getCoords(e);
    cursorX      = x;
    cursorY      = y;
    cursorInside = true;
    lastMoveTime = performance.now();
    stationaryAccum = 0;
    addRevealPoint(x, y);
    lastRevealX = x;
    lastRevealY = y;
  }

  function onPointerLeave() {
    cursorInside = false;
    lastRevealX  = undefined;
    lastRevealY  = undefined;
  }

  function drawSnowflake(cx: number, cy: number, radius: number, rotation: number, opacity: number) {
    const ARMS = 6;
    ctx!.save();
    ctx!.translate(cx, cy);
    ctx!.rotate(rotation);
    ctx!.strokeStyle = 'rgba(205, 232, 255, 1)';
    ctx!.lineCap     = 'round';
    for (let a = 0; a < ARMS; a++) {
      ctx!.save();
      ctx!.rotate((a / ARMS) * Math.PI * 2);
      const mainW = 0.28 + Math.random() * 0.48;
      ctx!.lineWidth   = mainW;
      ctx!.globalAlpha = opacity;
      ctx!.beginPath();
      ctx!.moveTo(0, 0);
      ctx!.lineTo(0, -radius);
      ctx!.stroke();
      ctx!.lineWidth   = mainW * 0.5;
      ctx!.globalAlpha = opacity * 0.85;
      ctx!.beginPath();
      ctx!.moveTo(0, -radius);
      ctx!.lineTo(-radius * 0.18, -radius * 0.82);
      ctx!.stroke();
      ctx!.beginPath();
      ctx!.moveTo(0, -radius);
      ctx!.lineTo( radius * 0.18, -radius * 0.82);
      ctx!.stroke();
      const numPairs = 1 + Math.floor(Math.random() * 2);
      for (let p = 1; p <= numPairs; p++) {
        const frac  = p / (numPairs + 1);
        const bY    = -radius * frac;
        const bLen  = radius * (0.28 - frac * 0.07) * (0.82 + Math.random() * 0.36);
        const bDeg  = (55 + Math.random() * 15) * Math.PI / 180;
        ctx!.lineWidth   = mainW * (0.80 - frac * 0.22);
        ctx!.globalAlpha = opacity * (0.75 + Math.random() * 0.25);
        ctx!.beginPath();
        ctx!.moveTo(0, bY);
        ctx!.lineTo(-Math.sin(bDeg) * bLen, bY - Math.cos(bDeg) * bLen);
        ctx!.stroke();
        ctx!.beginPath();
        ctx!.moveTo(0, bY);
        ctx!.lineTo( Math.sin(bDeg) * bLen, bY - Math.cos(bDeg) * bLen);
        ctx!.stroke();
      }
      ctx!.restore();
    }
    ctx!.restore();
  }

  // ─── REVEAL MASK ─────────────────────────────────────────────────────────
  function addRevealPoint(x: number, y: number) {
    if (lastRevealX !== undefined) {
      const dx = x - lastRevealX;
      const dy = y - (lastRevealY ?? 0);
      if (dx * dx + dy * dy < REVEAL_POINT_SPACING * REVEAL_POINT_SPACING) return;
    }
    const shards: Shard[] = [];
    for (let i = 0; i < REVEAL_SHARD_COUNT; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist  = REVEAL_RADIUS * (REVEAL_EDGE_SOFTNESS + Math.random() * (1.25 - REVEAL_EDGE_SOFTNESS));
      const size  = REVEAL_RADIUS * (0.04 + Math.random() * 0.09) * 1.6;
      const rot   = Math.random() * Math.PI;
      const alpha = 0.04 + Math.random() * 0.18;
      const sel   = Math.random();
      const pts: [number,number][] = [];
      if (sel < 0.30) {
        for (let j = 0; j < 4; j++) {
          const a = (j / 4) * Math.PI * 2 + Math.PI / 4 + (Math.random() - 0.5) * 0.7;
          const d = size * (0.4 + Math.random() * 0.6);
          pts.push([Math.cos(a) * d, Math.sin(a) * d]);
        }
      } else if (sel < 0.55) {
        for (let j = 0; j < 3; j++) {
          const a = (j / 3) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
          const d = size * (0.45 + Math.random() * 0.55);
          pts.push([Math.cos(a) * d, Math.sin(a) * d]);
        }
      } else {
        const hw = size * (0.05 + Math.random() * 0.10);
        const hl = size * (0.55 + Math.random() * 0.65);
        const sk = (Math.random() - 0.5) * hw * 1.5;
        pts.push([-hw + sk, -hl], [hw + sk, -hl], [hw - sk, hl], [-hw - sk, hl]);
      }
      shards.push({ angle, dist, rot, alpha, pts });
    }
    revealPoints.push({ x, y, timestamp: performance.now(), shards });
    startAnimLoop();
  }

  function startAnimLoop() {
    if (animRafId !== null) return;
    animRafId = requestAnimationFrame(revealFrame);
  }

  function revealFrame(timestamp: number) {
    revealPoints = revealPoints.filter(p => timestamp - p.timestamp < REVEAL_LIFETIME);
    if (cursorInside && lastMoveTime && timestamp - lastMoveTime > STATIONARY_DEFROST_DELAY) {
      stationaryAccum = Math.min(MAX_STATIONARY_STRENGTH, stationaryAccum + STATIONARY_DEFROST_RATE);
    } else if (!cursorInside) {
      stationaryAccum = Math.max(0, stationaryAccum - STATIONARY_DEFROST_RATE * 3);
    }
    renderCurrentState(timestamp);
    if (revealPoints.length === 0 && stationaryAccum <= 0 && !cursorInside) {
      animRafId = null;
      return;
    }
    animRafId = requestAnimationFrame(revealFrame);
  }

  function renderCurrentState(timestamp = performance.now()) {
    if (!ctx || !frostedCanvas || !revealCanvas) return;
    const w = cssW;
    const h = cssH;
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(frostedCanvas, 0, 0, w, h);
    const hasReveal = revealPoints.length > 0 || stationaryAccum > 0;
    if (!hasReveal) return;

    revealCtx!.globalCompositeOperation = 'source-over';
    revealCtx!.globalAlpha = 1;
    revealCtx!.clearRect(0, 0, w, h);
    const mainCtx = ctx;
    ctx = revealCtx!;
    for (const p of revealPoints) {
      const age = timestamp - p.timestamp;
      drawRevealShape(p.x, p.y, Math.max(0, 1 - age / REVEAL_LIFETIME), p.shards);
    }
    if (stationaryAccum > 0 && cursorX !== undefined) {
      drawRevealShape(cursorX, cursorY!, stationaryAccum, []);
    }
    ctx = mainCtx;

    ctx.globalCompositeOperation = 'destination-out';
    ctx.globalAlpha = MAX_REVEAL_STRENGTH;
    ctx.drawImage(revealCanvas, 0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    for (const p of revealPoints) {
      const age = timestamp - p.timestamp;
      drawRevealEdgeTexture(p.x, p.y, Math.max(0, 1 - age / REVEAL_LIFETIME));
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }

  function drawRevealShape(cx: number, cy: number, fadeStrength: number, shards: Shard[]) {
    const r = REVEAL_RADIUS;
    ctx!.save();
    const g = ctx!.createRadialGradient(cx, cy, 0, cx, cy, r * 1.1);
    g.addColorStop(0,    'rgba(0,0,0,1)');
    g.addColorStop(0.40, 'rgba(0,0,0,0.88)');
    g.addColorStop(0.68, 'rgba(0,0,0,0.44)');
    g.addColorStop(0.85, 'rgba(0,0,0,0.12)');
    g.addColorStop(1,    'rgba(0,0,0,0)');
    ctx!.globalAlpha = fadeStrength;
    ctx!.fillStyle   = g;
    ctx!.beginPath();
    ctx!.arc(cx, cy, r * 1.1, 0, Math.PI * 2);
    ctx!.fill();
    const SIDES = 12;
    ctx!.beginPath();
    for (let i = 0; i < SIDES; i++) {
      const angle  = (i / SIDES) * Math.PI * 2;
      const jitter = Math.sin(cx * 0.37 + cy * 0.19 + angle * 2.7) * 0.20;
      const dist   = r * (0.82 + jitter + 0.18);
      const px     = cx + Math.cos(angle) * dist;
      const py     = cy + Math.sin(angle) * dist;
      i === 0 ? ctx!.moveTo(px, py) : ctx!.lineTo(px, py);
    }
    ctx!.closePath();
    ctx!.fillStyle   = 'rgba(0,0,0,1)';
    ctx!.globalAlpha = fadeStrength * 0.38;
    ctx!.fill();
    ctx!.fillStyle = 'rgba(0,0,0,1)';
    for (const s of shards) {
      const ex = cx + Math.cos(s.angle) * s.dist;
      const ey = cy + Math.sin(s.angle) * s.dist;
      ctx!.save();
      ctx!.translate(ex, ey);
      ctx!.rotate(s.rot);
      ctx!.globalAlpha = s.alpha * fadeStrength;
      ctx!.beginPath();
      s.pts.forEach(([px, py], idx) => {
        idx === 0 ? ctx!.moveTo(px, py) : ctx!.lineTo(px, py);
      });
      ctx!.closePath();
      ctx!.fill();
      ctx!.restore();
    }
    ctx!.restore();
  }

  function drawRevealEdgeTexture(cx: number, cy: number, fadeStrength: number) {
    if (Math.random() > REVEAL_SNOWFLAKE_CHANCE * fadeStrength * 4) return;
    const angle = Math.random() * Math.PI * 2;
    const dist  = REVEAL_RADIUS * (0.75 + Math.random() * 0.55);
    drawSnowflake(
      cx + Math.cos(angle) * dist,
      cy + Math.sin(angle) * dist,
      2 + Math.random() * 8,
      Math.random() * Math.PI,
      0.22 * fadeStrength
    );
  }
</script>

<!--
  Struttura identica al prototipo:
    1. .sharp  — foto nitida B/N, sempre visibile sotto
    2. canvas  — frost dipinto sopra; destination-out rivela la foto
-->
<div class="frost-wrap" bind:this={wrapper} aria-hidden="true">
  <img class="sharp" {src} alt="" draggable="false" />
  <canvas
    bind:this={canvas}
    onpointermove={onPointerMove}
    onpointerleave={onPointerLeave}
    oncontextmenu={(e) => e.preventDefault()}
  ></canvas>
</div>

<style>
  .frost-wrap {
    position: absolute;
    inset: 0;
    overflow: hidden;
  }

  .sharp {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
    pointer-events: none;
    user-select: none;
    filter: grayscale(1);
    display: block;
  }

  canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    cursor: crosshair;
    touch-action: none;
  }
</style>
