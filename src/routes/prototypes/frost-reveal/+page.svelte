<script>
  // ─── Customize the effect here ────────────────────────────────────────────
  //
  // IMAGE: replace with your own URL or a local path like '/my-photo.jpg'
  const IMAGE = 'https://picsum.photos/seed/frost-reveal/1200/700';

  // ── Frost appearance ──────────────────────────────────────────────────────
  const FROST_OPACITY   = 0.9;
  const GRAIN_OPACITY   = 0.26;
  const SCRATCH_OPACITY = 0.14;
  const BLUR_AMOUNT     = 18;

  // ── Initial frost texture ─────────────────────────────────────────────────
  const INITIAL_SNOWFLAKE_DENSITY = 40;
  const INITIAL_SPECKLE_DENSITY   = 600;
  const INITIAL_CRYSTAL_OPACITY   = 0.55;

  // ── Temporary reveal mask ─────────────────────────────────────────────────
  // The cursor punches a temporary hole in the frost that fades out over
  // REVEAL_LIFETIME ms. No restoration painting needed — frost recomposes
  // automatically as the reveal mask fades.
  const REVEAL_RADIUS           = 72;   // px  — radius of the reveal hole
  const REVEAL_LIFETIME         = 1600; // ms  — how long each reveal point stays active
  const REVEAL_POINT_SPACING    = 6;    // px  — min distance between stored points
  const REVEAL_EDGE_SOFTNESS    = 0.38; // 0–1 — inner edge of the shard scatter zone
  const REVEAL_SHARD_COUNT      = 20;   // int — pre-generated angular fragments per point
  const REVEAL_SNOWFLAKE_CHANCE = 0.06; // 0–1 — probability of icy snowflake at edge
  // ──────────────────────────────────────────────────────────────────────────

  let wrapper;
  let canvas;
  let ctx        = null;
  let imgEl      = null;
  let cssW       = 0;
  let cssH       = 0;

  let frostedCanvas = null;  // offscreen permanent frost layer — drawn once, never erased
  let frostedCtx    = null;

  let revealPoints = [];     // active temporary reveal points
  let lastRevealX  = undefined;
  let lastRevealY  = undefined;
  let animRafId    = null;

  // ─── Canvas setup on mount ────────────────────────────────────────────────

  $effect(() => {
    if (!canvas || !wrapper) return;

    const dpr  = window.devicePixelRatio || 1;
    const rect = wrapper.getBoundingClientRect();
    cssW = rect.width;
    cssH = rect.height;

    canvas.width  = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);

    ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    // Offscreen permanent frost canvas — painted once, never erased or modified
    frostedCanvas        = document.createElement('canvas');
    frostedCanvas.width  = Math.round(cssW * dpr);
    frostedCanvas.height = Math.round(cssH * dpr);
    frostedCtx           = frostedCanvas.getContext('2d');
    frostedCtx.scale(dpr, dpr);

    const img       = new Image();
    img.crossOrigin = 'anonymous';
    img.onload      = () => { imgEl = img; drawFrost(); };
    img.src         = IMAGE;
  });

  // ─────────────────────────────────────────────────────────────────────────
  // FROST DRAWING
  // All sub-functions draw to the permanent offscreen frostedCanvas.
  // The main canvas is rebuilt every frame by stamping frostedCanvas then
  // punching temporary holes with destination-out for active reveal points.
  // ─────────────────────────────────────────────────────────────────────────

  function drawFrost() {
    if (!frostedCtx || !imgEl) return;
    const w = cssW;
    const h = cssH;

    // Temporarily route all sub-function drawing to the offscreen frost canvas
    const mainCtx = ctx;
    ctx = frostedCtx;

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, w, h);

    drawBlurredImage(w, h);        // A: blurred, desaturated image
    drawFrostColor(w, h);          // B: uneven white/blue cloud patches
    drawGrain(w, h);               // C: Perlin-like noise grain texture
    drawStaticScratches(w, h);     // D: thin diagonal ice-line marks
    drawInitialFrostDetails(w, h); // E: embedded snowflakes, speckles, crystal branches

    ctx = mainCtx;

    renderCurrentState();
  }

  // Sub-layer A ─────────────────────────────────────────────────────────────
  // Blurred image — the soft, hazed base that reads as "something frozen in ice"
  // Drawing oversized with negative offset so the blur has real pixels at edges.
  function drawBlurredImage(w, h) {
    const bleed = BLUR_AMOUNT * 2;
    ctx.save();
    ctx.filter = `blur(${BLUR_AMOUNT}px) brightness(1.15) saturate(0.55) contrast(1.08)`;
    ctx.drawImage(imgEl, -bleed, -bleed, w + bleed * 2, h + bleed * 2);
    ctx.filter = 'none';
    ctx.restore();
  }

  // Sub-layer B ─────────────────────────────────────────────────────────────
  // Frost color overlay — multiple radial patches at different positions/sizes.
  // Real ice is never flat white; these uneven clouds are the key visual cue.
  function drawFrostColor(w, h) {
    ctx.save();
    ctx.globalAlpha = FROST_OPACITY;

    // Each patch: [centre-x%, centre-y%, radius%, rgb, alpha-peak, alpha-mid]
    const patches = [
      [0.12, 0.18, 0.70, '218,238,255', 0.60, 0.30],
      [0.88, 0.82, 0.60, '205,230,255', 0.55, 0.28],
      [0.65, 0.44, 0.42, '230,245,255', 0.40, 0.00],
      [0.50, 0.88, 0.60, '200,225,252', 0.30, 0.00],
    ];

    for (const [cx, cy, r, rgb, a0, a1] of patches) {
      const g = ctx.createRadialGradient(w * cx, h * cy, 0, w * cx, h * cy, w * r);
      g.addColorStop(0,    `rgba(${rgb},${a0})`);
      if (a1 > 0) g.addColorStop(0.45, `rgba(${rgb},${a1})`);
      g.addColorStop(1,    'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }

    // Uniform base ice floor
    ctx.globalAlpha = FROST_OPACITY * 0.22;
    ctx.fillStyle   = 'rgba(215,235,255,1)';
    ctx.fillRect(0, 0, w, h);

    ctx.restore();
  }

  // Sub-layer C ─────────────────────────────────────────────────────────────
  // Ice grain — a 200×200 noise tile generated from random pixels and tiled.
  // overlay blend mode bakes the grain into the frost beneath it.
  function drawGrain(w, h) {
    const S = 200;
    const off  = document.createElement('canvas');
    off.width  = S;
    off.height = S;
    const gctx = off.getContext('2d');
    const data = gctx.createImageData(S, S);
    const d    = data.data;

    for (let i = 0; i < d.length; i += 4) {
      if (Math.random() < 0.4) {
        const v   = 180 + Math.floor(Math.random() * 75);
        d[i]     = v;
        d[i + 1] = v;
        d[i + 2] = Math.min(255, v + 25); // slight blue cast
        d[i + 3] = Math.floor(Math.random() * 38);
      }
    }
    gctx.putImageData(data, 0, 0);

    ctx.save();
    ctx.globalAlpha = GRAIN_OPACITY;
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle   = ctx.createPattern(off, 'repeat');
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  // Sub-layer D ─────────────────────────────────────────────────────────────
  // Static ice scratches — thin lines at three angle families.
  // Uses perpendicular-offset sweep so lines span the full canvas at any angle.
  function drawStaticScratches(w, h) {
    const diag = Math.sqrt(w * w + h * h);

    ctx.save();
    ctx.globalAlpha = SCRATCH_OPACITY;
    ctx.lineCap     = 'round';

    // [angle-deg, perp-spacing-px, draw-probability, max-lineWidth]
    const families = [[22, 6, 0.30, 0.8], [71, 10, 0.25, 0.5], [168, 18, 0.20, 0.4]];

    for (const [deg, spacing, prob, maxW] of families) {
      const angle = (deg * Math.PI) / 180;
      const perp  = angle + Math.PI / 2;
      for (let pos = -diag; pos < diag; pos += spacing) {
        if (Math.random() > prob) continue;
        const ox = w / 2 + Math.cos(perp) * pos;
        const oy = h / 2 + Math.sin(perp) * pos;
        ctx.beginPath();
        ctx.lineWidth   = 0.2 + Math.random() * maxW;
        ctx.strokeStyle = `rgba(255,255,255,${0.2 + Math.random() * 0.5})`;
        ctx.moveTo(ox - Math.cos(angle) * diag, oy - Math.sin(angle) * diag);
        ctx.lineTo(ox + Math.cos(angle) * diag, oy + Math.sin(angle) * diag);
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  // Sub-layer E ─────────────────────────────────────────────────────────────
  // Initial frost details — embedded snowflakes, icy speckles, and crystal
  // branches rendered on the freshly-painted canvas before any interaction.
  // All drawn in source-over with white/blue-icy tones so they read as frost
  // sitting on the surface, not as holes.
  function drawInitialFrostDetails(w, h) {
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';

    // ── Fine icy speckles ──────────────────────────────────────────────────
    // Tiny angular fragments scattered across the surface. Mix of thin slivers
    // and small polygons to mimic individual ice crystals / powder grains.
    for (let i = 0; i < INITIAL_SPECKLE_DENSITY; i++) {
      const x     = Math.random() * w;
      const y     = Math.random() * h;
      const size  = 0.5 + Math.random() * 3.2;
      const alpha = (0.08 + Math.random() * 0.40) * INITIAL_CRYSTAL_OPACITY;
      ctx.globalAlpha = alpha;
      ctx.fillStyle   = `rgba(${220 + Math.floor(Math.random() * 30)}, ${238 + Math.floor(Math.random() * 17)}, 255, 1)`;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.random() * Math.PI);
      if (Math.random() < 0.55) {
        // Thin sliver
        const hw = size * 0.12, hl = size * 0.88;
        ctx.fillRect(-hw, -hl, hw * 2, hl * 2);
      } else {
        // Small polygon (3–5 sides)
        ctx.beginPath();
        const pts = 3 + Math.floor(Math.random() * 3);
        for (let j = 0; j < pts; j++) {
          const a = (j / pts) * Math.PI * 2 + (Math.random() - 0.5) * 0.6;
          const d = size * (0.38 + Math.random() * 0.52);
          j === 0 ? ctx.moveTo(Math.cos(a) * d, Math.sin(a) * d)
                  : ctx.lineTo(Math.cos(a) * d, Math.sin(a) * d);
        }
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }

    // ── Faint crystal branches ─────────────────────────────────────────────
    // Fine white/silver lines that sprawl in crystallographic directions —
    // straight segments with one branch at 30°/45°/60°.
    ctx.strokeStyle = 'rgba(210, 235, 255, 1)';
    ctx.lineCap     = 'round';
    const branchCount = Math.floor(w * 0.18);
    for (let i = 0; i < branchCount; i++) {
      const x     = Math.random() * w;
      const y     = Math.random() * h;
      const angle = Math.random() * Math.PI * 2;
      const len   = 10 + Math.random() * 65;
      const alpha = (0.03 + Math.random() * 0.11) * INITIAL_CRYSTAL_OPACITY;

      ctx.globalAlpha = alpha;
      ctx.lineWidth   = 0.2 + Math.random() * 0.65;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
      ctx.stroke();

      if (Math.random() < 0.52) {
        const snapDeg = [30, 45, 60][Math.floor(Math.random() * 3)];
        const bSign   = Math.random() < 0.5 ? 1 : -1;
        const bAngle  = angle + snapDeg * Math.PI / 180 * bSign;
        const bFrac   = 0.30 + Math.random() * 0.40;
        const bLen    = len * (0.25 + Math.random() * 0.30);
        const bx      = x + Math.cos(angle) * len * bFrac;
        const by      = y + Math.sin(angle) * len * bFrac;

        ctx.globalAlpha = alpha * 0.55;
        ctx.lineWidth  *= 0.5;
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(bx + Math.cos(bAngle) * bLen, by + Math.sin(bAngle) * bLen);
        ctx.stroke();
      }
    }

    // ── Embedded snowflakes ────────────────────────────────────────────────
    // Procedural 6-arm snowflakes scattered at varied sizes and rotations.
    // Reuses drawSnowflake() so the color (icy blue-white) is consistent.
    for (let i = 0; i < INITIAL_SNOWFLAKE_DENSITY; i++) {
      const x      = Math.random() * w;
      const y      = Math.random() * h;
      const radius = 3 + Math.random() * 22;
      const opacity = (0.07 + Math.random() * 0.30) * INITIAL_CRYSTAL_OPACITY;
      drawSnowflake(x, y, radius, Math.random() * Math.PI, opacity);
    }

    ctx.restore();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // POINTER INTERACTION
  // ─────────────────────────────────────────────────────────────────────────

  function getCoords(e) {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function onPointerMove(e) {
    const { x, y } = getCoords(e);
    addRevealPoint(x, y);
    lastRevealX = x;
    lastRevealY = y;
  }

  function onPointerLeave() {
    lastRevealX = undefined;
    lastRevealY = undefined;
  }

  // ── Angular fragment helper ──────────────────────────────────────────────
  //
  // Draws a small irregular polygon — four archetypes randomly chosen:
  //   diamond quad (30%) · triangle (25%) · sliver (20%) · crystalline star (25%)
  // All inherit the current compositeOperation and fillStyle.
  // Never a circle — the goal is fractured, icy angularity.
  function drawAngularFragment(cx, cy, size, rotation, opacity) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation);
    ctx.globalAlpha = opacity;
    ctx.fillStyle   = 'rgba(0,0,0,1)';
    ctx.beginPath();

    const r = Math.random();
    if (r < 0.30) {
      // Diamond-biased quadrilateral — 45° base rotation gives square/diamond look
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4 + (Math.random() - 0.5) * 0.7;
        const d = size * (0.4 + Math.random() * 0.6);
        i === 0
          ? ctx.moveTo(Math.cos(a) * d, Math.sin(a) * d)
          : ctx.lineTo(Math.cos(a) * d, Math.sin(a) * d);
      }
    } else if (r < 0.55) {
      // Triangle with angular jitter
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
        const d = size * (0.45 + Math.random() * 0.55);
        i === 0
          ? ctx.moveTo(Math.cos(a) * d, Math.sin(a) * d)
          : ctx.lineTo(Math.cos(a) * d, Math.sin(a) * d);
      }
    } else if (r < 0.75) {
      // Sliver — thin elongated shard with slight skew
      const hw   = size * (0.05 + Math.random() * 0.10);
      const hl   = size * (0.55 + Math.random() * 0.65);
      const skew = (Math.random() - 0.5) * hw * 1.5;
      ctx.moveTo(-hw + skew, -hl);
      ctx.lineTo( hw + skew, -hl);
      ctx.lineTo( hw - skew,  hl);
      ctx.lineTo(-hw - skew,  hl);
    } else {
      // Crystalline star — 4 or 5-pointed snow shard with deep inner notches
      const pts = 4 + Math.floor(Math.random() * 2);
      for (let i = 0; i < pts * 2; i++) {
        const a = (i / (pts * 2)) * Math.PI * 2;
        const d = i % 2 === 0
          ? size * (0.55 + Math.random() * 0.30) // outer point
          : size * (0.10 + Math.random() * 0.15); // inner notch
        i === 0
          ? ctx.moveTo(Math.cos(a) * d, Math.sin(a) * d)
          : ctx.lineTo(Math.cos(a) * d, Math.sin(a) * d);
      }
    }

    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // ── Snowflake crystal mark ────────────────────────────────────────────────
  //
  // Icy blue-white 6-arm snowflake with tip splits and side branch pairs.
  // Used both in the initial frost texture and as edge decoration at the reveal boundary.
  function drawSnowflake(cx, cy, radius, rotation, opacity) {
    const ARMS = 6;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation);
    // Icy blue-white — visible on both revealed image and frosted canvas
    ctx.strokeStyle = `rgba(205, 232, 255, 1)`;
    ctx.lineCap     = 'round';

    for (let a = 0; a < ARMS; a++) {
      ctx.save();
      ctx.rotate((a / ARMS) * Math.PI * 2);

      const mainW = 0.28 + Math.random() * 0.48;

      // ─ Main arm: centre → tip ─────────────────────
      ctx.lineWidth   = mainW;
      ctx.globalAlpha = opacity;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -radius);
      ctx.stroke();

      // ─ Tip split: small V at the end ──────────────
      ctx.lineWidth   = mainW * 0.5;
      ctx.globalAlpha = opacity * 0.85;
      ctx.beginPath();
      ctx.moveTo(0, -radius);
      ctx.lineTo(-radius * 0.18, -radius * 0.82);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -radius);
      ctx.lineTo( radius * 0.18, -radius * 0.82);
      ctx.stroke();

      // ─ Side branch pairs ──────────────────────────
      //   Branch angle 55°–70° from arm axis gives natural snowflake look.
      //   Branches taper in both thickness and length toward the tip.
      const numPairs = 1 + Math.floor(Math.random() * 2); // 1 or 2 pairs
      for (let p = 1; p <= numPairs; p++) {
        const frac  = p / (numPairs + 1);                   // 0…1 along the arm
        const bY    = -radius * frac;                        // y-position on arm (negative = toward tip)
        const bLen  = radius * (0.28 - frac * 0.07) * (0.82 + Math.random() * 0.36);
        const bDeg  = (55 + Math.random() * 15) * Math.PI / 180; // 55°–70° from arm

        ctx.lineWidth   = mainW * (0.80 - frac * 0.22);
        ctx.globalAlpha = opacity * (0.75 + Math.random() * 0.25);

        // Left branch  (−x side)
        ctx.beginPath();
        ctx.moveTo(0, bY);
        ctx.lineTo(-Math.sin(bDeg) * bLen, bY - Math.cos(bDeg) * bLen);
        ctx.stroke();

        // Right branch (+x side)
        ctx.beginPath();
        ctx.moveTo(0, bY);
        ctx.lineTo( Math.sin(bDeg) * bLen, bY - Math.cos(bDeg) * bLen);
        ctx.stroke();
      }

      ctx.restore();
    }

    ctx.restore();
  }

  // ═════════════════════════════════════════════════════════════════════════
  // TEMPORARY REVEAL MASK
  //
  // Every pointer move stores a reveal point {x, y, timestamp, shards}.
  // A rAF loop runs as long as points are active:
  //   1. Clear the main canvas and stamp the permanent frostedCanvas
  //   2. destination-out: punch holes at each point, fading with age
  //   3. source-over: draw icy snowflake decorations at the reveal edge
  //
  // When all points expire the loop stops. Frost recomposes automatically
  // because the holes simply disappear — no restoration painting needed.
  // ═════════════════════════════════════════════════════════════════════════

  function addRevealPoint(x, y) {
    if (lastRevealX !== undefined) {
      const dx = x - lastRevealX;
      const dy = y - lastRevealY;
      if (dx * dx + dy * dy < REVEAL_POINT_SPACING * REVEAL_POINT_SPACING) return;
    }

    // Pre-generate stable shard vertices — avoids per-frame Math.random() flicker
    const shards = [];
    for (let i = 0; i < REVEAL_SHARD_COUNT; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist  = REVEAL_RADIUS * (REVEAL_EDGE_SOFTNESS + Math.random() * (1.25 - REVEAL_EDGE_SOFTNESS));
      const size  = REVEAL_RADIUS * (0.04 + Math.random() * 0.09) * 1.6;
      const rot   = Math.random() * Math.PI;
      const alpha = 0.04 + Math.random() * 0.18;
      const sel   = Math.random();
      const pts   = [];
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

  function revealFrame(timestamp) {
    revealPoints = revealPoints.filter(p => timestamp - p.timestamp < REVEAL_LIFETIME);
    renderCurrentState(timestamp);
    if (revealPoints.length === 0) {
      animRafId = null;
      return;
    }
    animRafId = requestAnimationFrame(revealFrame);
  }

  function renderCurrentState(timestamp = performance.now()) {
    if (!ctx || !frostedCanvas) return;
    const w = cssW;
    const h = cssH;

    // 1. Clear and stamp the permanent frost layer
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(frostedCanvas, 0, 0, w, h);

    if (revealPoints.length === 0) return;

    // 2. Punch holes using destination-out, fading with age
    ctx.globalCompositeOperation = 'destination-out';
    for (const p of revealPoints) {
      const age         = timestamp - p.timestamp;
      const fadeStrength = Math.max(0, 1 - age / REVEAL_LIFETIME);
      drawRevealShape(p.x, p.y, fadeStrength, p.shards);
    }

    // 3. Icy edge decorations in source-over
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    for (const p of revealPoints) {
      const age         = timestamp - p.timestamp;
      const fadeStrength = Math.max(0, 1 - age / REVEAL_LIFETIME);
      drawRevealEdgeTexture(p.x, p.y, fadeStrength);
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }

  // Draws the reveal hole for one point.
  // Uses a soft radial gradient (smooth inner area) + deterministic sin-jittered
  // polygon (non-circular edge) + pre-generated shards (stable, no flicker).
  function drawRevealShape(cx, cy, fadeStrength, shards) {
    const r = REVEAL_RADIUS;

    ctx.save();

    // Soft radial gradient — smooth inner reveal
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 1.1);
    g.addColorStop(0,    'rgba(0,0,0,1)');
    g.addColorStop(0.40, 'rgba(0,0,0,0.88)');
    g.addColorStop(0.68, 'rgba(0,0,0,0.44)');
    g.addColorStop(0.85, 'rgba(0,0,0,0.12)');
    g.addColorStop(1,    'rgba(0,0,0,0)');

    ctx.globalAlpha = fadeStrength;
    ctx.fillStyle   = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.1, 0, Math.PI * 2);
    ctx.fill();

    // Deterministic irregular border — sin-jitter gives stable non-circular shape
    const SIDES = 12;
    ctx.beginPath();
    for (let i = 0; i < SIDES; i++) {
      const angle  = (i / SIDES) * Math.PI * 2;
      const jitter = Math.sin(cx * 0.37 + cy * 0.19 + angle * 2.7) * 0.20;
      const dist   = r * (0.82 + jitter + 0.18);
      const px     = cx + Math.cos(angle) * dist;
      const py     = cy + Math.sin(angle) * dist;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle   = 'rgba(0,0,0,1)';
    ctx.globalAlpha = fadeStrength * 0.38;
    ctx.fill();

    // Pre-generated edge shards — stable, no per-frame flicker
    ctx.fillStyle = 'rgba(0,0,0,1)';
    for (const s of shards) {
      const ex = cx + Math.cos(s.angle) * s.dist;
      const ey = cy + Math.sin(s.angle) * s.dist;
      ctx.save();
      ctx.translate(ex, ey);
      ctx.rotate(s.rot);
      ctx.globalAlpha = s.alpha * fadeStrength;
      ctx.beginPath();
      s.pts.forEach(([px, py], idx) => {
        idx === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      });
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  }

  // Draws occasional icy snowflake decorations at the reveal boundary.
  function drawRevealEdgeTexture(cx, cy, fadeStrength) {
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

  // ─────────────────────────────────────────────────────────────────────────
  // RESET
  // ─────────────────────────────────────────────────────────────────────────

  function resetFrost() {
    revealPoints = [];
    lastRevealX  = undefined;
    lastRevealY  = undefined;
    drawFrost();
  }
</script>

<svelte:head>
  <title>Frost Reveal — Prototype</title>
</svelte:head>

<div class="page">
  <h1>Frost reveal prototype</h1>
  <p class="hint">Move over the frost to reveal the image.</p>

  <!--
    Layer structure (bottom → top):
      1. .sharp  — the clean, sharp source image. Never touched.
      2. canvas  — starts fully painted with the frosted ice surface.
                   User scrapes pixels away with destination-out compositing.
                   Where canvas alpha = 0, the sharp image shows through.
  -->
  <div class="wrapper" bind:this={wrapper}>

    <!-- Layer 1: Sharp base image — always fully visible beneath -->
    <img
      class="sharp"
      src={IMAGE}
      alt="Sharp base layer"
      draggable="false"
    />

    <!-- Layer 2: Frost canvas — hover reveals, releases to recompose -->
    <canvas
      bind:this={canvas}
      onpointermove={onPointerMove}
      onpointerleave={onPointerLeave}
      oncontextmenu={(e) => e.preventDefault()}
    ></canvas>

  </div>

  <button class="reset-btn" onclick={resetFrost}>Reset frost</button>
</div>

<style>
  /* ── Page shell ──────────────────────────────────── */
  .page {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1.25rem;
    background: #0d0d0f;
    font-family: system-ui, -apple-system, sans-serif;
    color: #e6e6e6;
    padding: 2rem;
  }

  h1 {
    font-size: clamp(1.2rem, 3vw, 1.75rem);
    font-weight: 600;
    letter-spacing: -0.025em;
    margin: 0;
  }

  .hint {
    font-size: 0.875rem;
    color: #777;
    margin: 0;
  }

  /* ── Image container ─────────────────────────────── */
  .wrapper {
    position: relative;
    width: min(90vw, 960px);
    aspect-ratio: 16 / 9;
    border-radius: 18px;
    overflow: hidden;
    box-shadow:
      0 2px 4px rgba(0, 0, 0, 0.4),
      0 12px 40px rgba(0, 0, 0, 0.55),
      0 32px 80px rgba(0, 0, 0, 0.4);
  }

  /* ── Layer 1: Sharp base image ───────────────────── */
  .sharp {
    position: absolute;
    inset: 0;
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    pointer-events: none;
    user-select: none;
  }

  /* ── Layer 2: Frost canvas ───────────────────────── */
  canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    /* Crosshair — no glowing circle, no custom cursor shape */
    cursor: crosshair;
    /* Suppress browser scroll/zoom on touch so all pointer events reach canvas */
    touch-action: none;
  }

  /* ── Reset button ────────────────────────────────── */
  .reset-btn {
    padding: 0.45rem 1.2rem;
    background: rgba(255, 255, 255, 0.07);
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 8px;
    color: #bbb;
    font-size: 0.82rem;
    letter-spacing: 0.01em;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
  }

  .reset-btn:hover {
    background: rgba(255, 255, 255, 0.14);
    color: #fff;
  }
</style>
