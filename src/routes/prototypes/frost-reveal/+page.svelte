<script>
  // ─── Customize the effect here ────────────────────────────────────────────
  //
  // IMAGE: replace with your own URL or a local path like '/my-photo.jpg'
  const IMAGE = 'https://picsum.photos/seed/frost-reveal/1200/700';

  // ── Scraping brush ────────────────────────────────────────────────────────
  const BRUSH_SIZE       = 48;   // px  — radius of the soft reveal area     (↑ = bigger swipe)
  const BRUSH_HARDNESS   = 0.11; // 0–1 — center erase strength per pass     (↓ = softer/more gradual)
  const EDGE_SHARD_COUNT = 22;   // int — angular fragment count at edge      (↑ = more fractured)
  const EDGE_SOFTNESS    = 0.38; // 0–1 — where edge irregularity begins      (↓ = earlier breakup)

  // ── Snow powder ───────────────────────────────────────────────────────────
  const POWDER_DENSITY = 52;    // int — dust particles per interpolated step (↑ = more snowy)
  const POWDER_SPREAD  = 3.1;   // ×   — how far beyond brush powder scatters (↑ = wider / more melt)
  const POWDER_OPACITY = 0.10;  // 0–1 — max alpha per powder particle        (↑ = more visible)

  // ── Snowflake crystals ────────────────────────────────────────────────────
  const SNOWFLAKE_DENSITY  = 0.22; // 0–1 — probability of snowflake per step  (↑ = more snowy)
  const SNOWFLAKE_MIN_SIZE = 3;    // px  — smallest snowflake radius
  const SNOWFLAKE_MAX_SIZE = 15;   // px  — largest snowflake radius            (↑ = more crystalline)
  const SNOWFLAKE_OPACITY  = 0.48; // 0–1 — icy-mark visibility                 (↑ = more visible)

  // ── Crystal cracks ────────────────────────────────────────────────────────
  const CRACK_DENSITY          = 2;    // int — cracks per step                  (↑ = more cracked)
  const CRACK_OPACITY          = 0.15; // 0–1 — crack erase strength             (↓ = more subtle)
  const CRYSTAL_BRANCH_OPACITY = 0.40; // 0–1 — branch opacity as fraction of crack opacity

  // ── Frost appearance ──────────────────────────────────────────────────────
  const FROST_OPACITY  = 0.9;   // 0–1 — white/blue cloud overlay strength   (↑ = more opaque)
  const GRAIN_OPACITY  = 0.26;  // 0–1 — noise grain tile intensity           (↑ = more gritty)
  const SCRATCH_OPACITY = 0.14; // 0–1 — static diagonal ice-line opacity     (↑ = more scratched)
  const BLUR_AMOUNT    = 18;    // px  — image blur on canvas                  (↑ = hazier frost)

  // ── Interaction mode ──────────────────────────────────────────────────────
  // true  → must hold mouse/pointer button to scrape (default, more intentional)
  // false → scraping happens on hover, no click needed
  const SCRAPE_ONLY_ON_POINTER_DOWN = false;

  // ── Brush angularity ──────────────────────────────────────────────────────
  const BRUSH_SQUARENESS      = 0.72; // 0 = circular dist, 1 = square/diamond dist at edge
  const ANGULAR_FRAGMENT_SIZE = 0.09; // × BRUSH_SIZE — controls edge fragment radius (↑ = bigger shards)

  // ── Edge snowflakes ───────────────────────────────────────────────────────
  const SNOWFLAKE_EDGE_AMOUNT = 0.18; // 0–1 — probability of small snowflake at brush edge per step

  // ── Automatic melt spreading ──────────────────────────────────────────────
  const MELT_SPREAD            = 4.0;  // × BRUSH_SIZE — max radius of melt fragment scatter
  const MELT_OPACITY           = 0.05; // 0–1 — max alpha per melt fragment (↑ = more melt)
  const MELT_FRAGMENT_COUNT    = 24;   // int — secondary dissolve fragments per step
  const MELT_RADIUS_MULTIPLIER = 1.8;  // × BRUSH_SIZE — inner edge of the melt zone

  // ── Automatic side defrost (post-cursor lateral trail dissolve) ──────────
  const ENABLE_AUTO_SIDE_DEFROST    = true;
  const AUTO_DEFROST_DELAY          = 100;  // ms  — pause before defrost begins after cursor passes
  const AUTO_DEFROST_LIFETIME       = 1400; // ms  — total duration each defrost point stays active
  const AUTO_DEFROST_STRENGTH       = 0.10; // 0–1 — erase alpha per fragment (↑ = stronger dissolve)
  const AUTO_DEFROST_SIDE_OFFSET    = 26;   // px  — inner edge of defrost band from path center
  const AUTO_DEFROST_SPREAD         = 34;   // px  — width of the defrost band on each side (↑ = wider)
  const AUTO_DEFROST_FRAGMENT_COUNT = 12;   // int — eraser fragments per active point per frame (↑ = denser)
  const AUTO_DEFROST_ALONG_SCATTER  = 1.0;  // × BRUSH_SIZE — scatter along motion axis
  const AUTO_DEFROST_POINT_SPACING  = 10;   // px  — min gap between stored defrost points
  const AUTO_DEFROST_MAX_POINTS     = 80;   // int — safety cap on defrost point queue

  // ── Initial frost texture (before any interaction) ────────────────────────
  const INITIAL_SNOWFLAKE_DENSITY = 40;   // int — snowflakes embedded in fresh frost (↑ = more crystals)
  const INITIAL_SPECKLE_DENSITY   = 600;  // int — icy speckles on fresh frost surface (↑ = more snowy)
  const INITIAL_CRYSTAL_OPACITY   = 0.55; // 0–1 — visibility of embedded frost details (↑ = more visible)
  // ──────────────────────────────────────────────────────────────────────────

  let wrapper;
  let canvas;
  let ctx   = null;
  let imgEl = null;
  let cssW  = 0;
  let cssH  = 0;

  let isPointerDown = false;
  let lastX         = undefined;
  let lastY         = undefined;

  let trailPoints = [];      // active side-melt trail points
  let lastTrailX  = undefined;
  let lastTrailY  = undefined;
  let rafId       = null;    // requestAnimationFrame handle for side melt loop

  // ─── Canvas setup on mount ────────────────────────────────────────────────

  $effect(() => {
    if (!canvas || !wrapper) return;

    const dpr  = window.devicePixelRatio || 1;
    const rect = wrapper.getBoundingClientRect();
    cssW = rect.width;
    cssH = rect.height;

    // Set internal canvas pixel resolution at device DPR
    canvas.width  = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);

    ctx = canvas.getContext('2d');
    // Scale once so all drawing uses CSS pixel coordinates everywhere
    ctx.scale(dpr, dpr);

    // Load source image (needs crossOrigin for canvas API to read pixels)
    const img     = new Image();
    img.crossOrigin = 'anonymous';
    img.onload    = () => { imgEl = img; drawFrost(); };
    img.src       = IMAGE;
  });

  // ─────────────────────────────────────────────────────────────────────────
  // FROST DRAWING
  // The canvas starts fully painted with the frosted ice surface.
  // Scraping erases pixels from this canvas (destination-out),
  // revealing the sharp <img> element that sits underneath it.
  // ─────────────────────────────────────────────────────────────────────────

  function drawFrost() {
    if (!ctx || !imgEl) return;
    const w = cssW;
    const h = cssH;

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, w, h);

    drawBlurredImage(w, h);        // A: blurred, desaturated image
    drawFrostColor(w, h);          // B: uneven white/blue cloud patches
    drawGrain(w, h);               // C: Perlin-like noise grain texture
    drawStaticScratches(w, h);     // D: thin diagonal ice-line marks
    drawInitialFrostDetails(w, h); // E: embedded snowflakes, speckles, crystal branches
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

  function onPointerDown(e) {
    // Ignore anything except primary button (left click / first touch)
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    isPointerDown = true;
    const { x, y } = getCoords(e);
    lastX = x;
    lastY = y;
    doScrape(x, y, x, y); // draw an immediate mark at click point
  }

  function onPointerMove(e) {
    const { x, y } = getCoords(e);
    if (SCRAPE_ONLY_ON_POINTER_DOWN && !isPointerDown) {
      lastX = x;
      lastY = y;
      return;
    }
    if (lastX !== undefined) {
      doScrape(x, y, lastX, lastY);
      if (ENABLE_AUTO_SIDE_DEFROST) addAutoDefrostPoint(x, y, lastX, lastY);
    }
    lastX = x;
    lastY = y;
  }

  function onPointerUp() {
    isPointerDown = false;
  }

  function onPointerLeave() {
    isPointerDown = false;
    lastX      = undefined;
    lastY      = undefined;
    lastTrailX = undefined; // reset so re-entry creates a clean direction vector
    lastTrailY = undefined;
  }

  // ═════════════════════════════════════════════════════════════════════════
  // SCRAPING — layered soft brush system
  //
  // Each pointer step runs four passes in order:
  //   1. destination-out  drawSoftReveal     — soft radial gradient erase
  //   2. destination-out  drawPowderParticles — speckled edge dust
  //   3. destination-out  drawCrystalCrack    — thin angular fracture lines
  //   4. source-over      drawSnowflake        — icy-blue crystal marks
  //
  // Snowflakes switch to source-over so they appear as visible ice-crystal
  // decorations rather than plain holes. They paint icy blue-white strokes
  // on top of whatever is on the canvas (frost OR already-revealed image).
  // Subsequent destination-out passes can erase them if the user scrapes again.
  // ═════════════════════════════════════════════════════════════════════════

  function doScrape(x, y, px, py) {
    if (!ctx) return;

    const dx         = x - px;
    const dy         = y - py;
    const dist       = Math.sqrt(dx * dx + dy * dy);
    const moveAngle  = Math.atan2(dy, dx); // direction of pointer travel

    // Dense-enough interpolation so fast drags leave no bare gaps
    const stepSize = Math.max(BRUSH_SIZE * 0.2, 1);
    const steps    = Math.max(1, Math.ceil(dist / stepSize));

    for (let s = 1; s <= steps; s++) {
      const t  = s / steps;
      const ix = px + dx * t;
      const iy = py + dy * t;

      // ── Erase passes ───────────────────────────────────────────────────
      ctx.globalCompositeOperation = 'destination-out';

      // ① Soft main reveal — low-opacity radial gradient, accumulates with drag
      drawSoftReveal(ix, iy);

      // ② Powder particles — tiny dots scattered at and beyond the brush edge
      drawPowderParticles(ix, iy);

      // ② b — Melt spread: very subtle secondary dissolve in a wider halo
      drawMeltSpread(ix, iy);

      // ③ Crystal cracks — straight angular fractures (30°/45°/60° branches)
      for (let c = 0; c < CRACK_DENSITY; c++) {
        // Mix: some cracks align with motion (feels like ice splitting along drag),
        // others are fully random (crystalline chaos)
        const crackAngle = Math.random() < 0.35
          ? moveAngle + (Math.random() - 0.5) * 1.0
          : Math.random() * Math.PI * 2;
        drawCrystalCrack(
          ix + (Math.random() - 0.5) * BRUSH_SIZE * 0.8,
          iy + (Math.random() - 0.5) * BRUSH_SIZE * 0.8,
          crackAngle,
          BRUSH_SIZE * (0.35 + Math.random() * 0.8),
          CRACK_OPACITY * (0.8 + Math.random() * 0.4)
        );
      }

      // ── Decorative pass ────────────────────────────────────────────────
      ctx.globalCompositeOperation = 'source-over';

      // ④ Snowflake crystal marks — icy blue-white, embedded in surface
      //    Drawn AFTER the erase so they appear on cleared AND frosted areas.
      if (Math.random() < SNOWFLAKE_DENSITY) {
        const sAngle  = Math.random() * Math.PI * 2;
        const sDist   = BRUSH_SIZE * (0.15 + Math.random() * 0.85);
        const sRadius = SNOWFLAKE_MIN_SIZE + Math.random() * (SNOWFLAKE_MAX_SIZE - SNOWFLAKE_MIN_SIZE);
        drawSnowflake(
          ix + Math.cos(sAngle) * sDist,
          iy + Math.sin(sAngle) * sDist,
          sRadius,
          Math.random() * Math.PI,
          SNOWFLAKE_OPACITY * (0.55 + Math.random() * 0.45)
        );
      }

      // ④ b — Edge snowflakes: small delicate flakes at the outer brush boundary
      if (Math.random() < SNOWFLAKE_EDGE_AMOUNT) {
        const eAngle  = Math.random() * Math.PI * 2;
        const eDist   = BRUSH_SIZE * (0.9 + Math.random() * 0.55);
        const eRadius = SNOWFLAKE_MIN_SIZE * 0.5 + Math.random() * (SNOWFLAKE_MAX_SIZE * 0.45);
        drawSnowflake(
          ix + Math.cos(eAngle) * eDist,
          iy + Math.sin(eAngle) * eDist,
          eRadius,
          Math.random() * Math.PI,
          SNOWFLAKE_OPACITY * (0.28 + Math.random() * 0.38)
        );
      }
    }

    // Always end in a clean state
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
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

  // ── Pass ①: Soft radial reveal ───────────────────────────────────────────
  //
  // A radial gradient whose alpha drops from BRUSH_HARDNESS at the centre to
  // zero at the edge. One drag pass removes ~22% of frost at the centre;
  // multiple overlapping passes accumulate to full reveal.
  // The edge-shard fragments break the circular symmetry into a fractured border.
  function drawSoftReveal(cx, cy) {
    const r = BRUSH_SIZE;

    // Soft gradient core — outer radius extended to r * 1.2 for a faint melt/spreading tail
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 1.2);
    g.addColorStop(0,    `rgba(0,0,0,${BRUSH_HARDNESS})`);
    g.addColorStop(0.42, `rgba(0,0,0,${BRUSH_HARDNESS * 0.58})`);
    g.addColorStop(0.72, `rgba(0,0,0,${BRUSH_HARDNESS * 0.26})`);
    g.addColorStop(0.83, `rgba(0,0,0,${BRUSH_HARDNESS * 0.10})`);
    g.addColorStop(1,    'rgba(0,0,0,0)');

    ctx.save();
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Angular edge shards — BRUSH_SQUARENESS blends square/diamond distribution
    // with the old circular one, making the footprint feel fractured, not round.
    for (let i = 0; i < EDGE_SHARD_COUNT; i++) {
      let ex, ey;
      if (Math.random() < BRUSH_SQUARENESS) {
        // Square/diamond distribution: uniform random in [-r*1.1, r*1.1]²
        const sqx    = (Math.random() * 2 - 1) * r * 1.1;
        const sqy    = (Math.random() * 2 - 1) * r * 1.1;
        const sqDist = Math.sqrt(sqx * sqx + sqy * sqy);
        if (sqDist < r * EDGE_SOFTNESS) continue; // skip inner zone
        ex = cx + sqx;
        ey = cy + sqy;
      } else {
        // Fallback circular ring
        const angle = Math.random() * Math.PI * 2;
        const dist  = r * (EDGE_SOFTNESS + Math.random() * (1.2 - EDGE_SOFTNESS));
        ex = cx + Math.cos(angle) * dist;
        ey = cy + Math.sin(angle) * dist;
      }
      const er = r * (ANGULAR_FRAGMENT_SIZE * 0.5 + Math.random() * ANGULAR_FRAGMENT_SIZE);
      drawAngularFragment(ex, ey, er * 1.6, Math.random() * Math.PI, 0.04 + Math.random() * 0.14);
    }
  }

  // ── Pass ②: Powder particles ─────────────────────────────────────────────
  //
  // Many tiny low-opacity dots spread from the brush edge outward.
  // Their very low alpha means they erase only a whisper of frost each pass,
  // creating the look of fine snow dust disturbed by the scraping motion.
  // They accumulate with repeated strokes, so well-scraped paths develop
  // a faint speckling beyond the clean reveal area.
  function drawPowderParticles(cx, cy) {
    for (let i = 0; i < POWDER_DENSITY; i++) {
      const angle  = Math.random() * Math.PI * 2;
      const dist   = BRUSH_SIZE * (0.45 + Math.random() * POWDER_SPREAD);
      const px     = cx + Math.cos(angle) * dist;
      const py     = cy + Math.sin(angle) * dist;
      const radius = 0.3 + Math.random() * 1.8;
      const alpha  = Math.random() * POWDER_OPACITY;

      if (Math.random() < 0.80) {
        // Angular fragment — fractured, not circular
        drawAngularFragment(px, py, radius * 1.4, Math.random() * Math.PI, alpha);
      } else {
        // Remaining 20%: tiny round dot for variety
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle   = 'rgba(0,0,0,1)';
        ctx.beginPath();
        ctx.arc(px, py, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  // ── Melt spreading (destination-out) ────────────────────────────────────
  //
  // A thin ring of very low-opacity angular fragments placed well beyond the
  // main brush area. Each single pass contributes almost nothing; after the
  // cursor lingers or crosses repeatedly the surrounding frost gradually thins.
  // Result: the trail looks like nearby ice is sublimating, not like a glow.
  function drawMeltSpread(cx, cy) {
    for (let i = 0; i < MELT_FRAGMENT_COUNT; i++) {
      const angle = Math.random() * Math.PI * 2;
      // Melt zone sits between MELT_RADIUS_MULTIPLIER and MELT_SPREAD × brush
      const dist  = BRUSH_SIZE * (MELT_RADIUS_MULTIPLIER + Math.random() * (MELT_SPREAD - MELT_RADIUS_MULTIPLIER));
      const mx    = cx + Math.cos(angle) * dist;
      const my    = cy + Math.sin(angle) * dist;
      const sz    = BRUSH_SIZE * (0.02 + Math.random() * 0.05);
      drawAngularFragment(mx, my, sz, Math.random() * Math.PI, Math.random() * MELT_OPACITY);
    }
  }

  // ── Pass ③: Crystal crack ────────────────────────────────────────────────
  //
  // A straight line (straight = crystalline, not organic bezier) with one
  // optional branch at a crystallographic angle: 30°, 45°, or 60° exactly.
  // The low CRACK_OPACITY means single cracks are barely visible; they
  // compound visually when multiple cracks cross in well-scraped areas.
  function drawCrystalCrack(cx, cy, angle, length, opacity) {
    const endX = cx + Math.cos(angle) * length;
    const endY = cy + Math.sin(angle) * length;

    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.strokeStyle = 'rgba(0,0,0,1)';
    ctx.lineWidth   = 0.4 + Math.random() * 0.8;
    ctx.lineCap     = 'round';

    // Main fracture line
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    // Crystallographic branch (snaps to 30 / 45 / 60 degrees)
    if (Math.random() < 0.55) {
      const snapDeg    = [30, 45, 60][Math.floor(Math.random() * 3)];
      const branchSign = Math.random() < 0.5 ? 1 : -1;
      const branchAng  = angle + snapDeg * Math.PI / 180 * branchSign;
      const bFrac      = 0.3 + Math.random() * 0.4;  // where along parent crack
      const branchLen  = length * (0.25 + Math.random() * 0.3);

      const bx = cx + Math.cos(angle) * length * bFrac;
      const by = cy + Math.sin(angle) * length * bFrac;

      ctx.lineWidth   *= 0.5;
      ctx.globalAlpha  = opacity * CRYSTAL_BRANCH_OPACITY;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + Math.cos(branchAng) * branchLen, by + Math.sin(branchAng) * branchLen);
      ctx.stroke();
    }

    ctx.restore();
  }

  // ── Pass ④: Snowflake crystal mark ──────────────────────────────────────
  //
  // Drawn in source-over mode with an icy blue-white colour so it appears
  // as a visible ice-crystal mark on the surface — not a hole.
  //
  //   • 6 radial arms from the centre
  //   • 1–2 pairs of side branches per arm at 55°–70° (natural snowflake geometry)
  //   • Small tip split at the end of each arm
  //   • Line width and branch length taper toward the tips
  //   • Arm count, branch count, size, rotation and opacity all vary per flake
  //
  // Calling signature: drawSnowflake(cx, cy, radius, rotation, opacity)
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
  // AUTOMATIC SIDE DEFROST
  //
  // As the cursor moves, each position is stored as a defrost point.
  // A requestAnimationFrame loop processes these points and, after a short
  // delay, draws angular eraser fragments in a DEFINED BAND on BOTH SIDES
  // of the trail — perpendicular to the direction of movement.
  //
  // Key difference from a larger brush:
  //   – Fragments are placed OFFSET from the center (innerEdge…outerEdge),
  //     so they only hit frost ADJACENT to the trail, not under the cursor.
  //   – The band expands slightly outward over the point's lifetime.
  //   – It continues running for ~1.4 s even after the cursor has moved away.
  //
  // The loop stops automatically when all defrost points have expired.
  // ═════════════════════════════════════════════════════════════════════════

  function addAutoDefrostPoint(x, y, prevX, prevY) {
    // Throttle: only store a point if cursor moved far enough from the last one
    if (lastTrailX !== undefined) {
      const dtx = x - lastTrailX;
      const dty = y - lastTrailY;
      if (dtx * dtx + dty * dty < AUTO_DEFROST_POINT_SPACING * AUTO_DEFROST_POINT_SPACING) return;
    }

    const dx  = x - prevX;
    const dy  = y - prevY;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 0.5) return;

    const tx = dx / len; // normalised tangent along motion
    const ty = dy / len;

    if (trailPoints.length >= AUTO_DEFROST_MAX_POINTS) trailPoints.shift();

    trailPoints.push({
      x, y,
      tx,  ty,
      px: -ty, py: tx,   // perpendicular = left/right of motion direction
      timestamp: performance.now()
    });

    lastTrailX = x;
    lastTrailY = y;

    startAutoDefrostLoop();
  }

  function startAutoDefrostLoop() {
    if (rafId !== null) return;
    rafId = requestAnimationFrame(autoDefrostFrame);
  }

  function autoDefrostFrame(timestamp) {
    trailPoints = trailPoints.filter(p => timestamp - p.timestamp < AUTO_DEFROST_LIFETIME);

    if (trailPoints.length === 0) {
      rafId = null;
      return;
    }

    if (ctx) {
      ctx.globalCompositeOperation = 'destination-out';

      for (const p of trailPoints) {
        const age = timestamp - p.timestamp;
        if (age < AUTO_DEFROST_DELAY) continue;

        const effectAge      = age - AUTO_DEFROST_DELAY;
        const effectDuration = AUTO_DEFROST_LIFETIME - AUTO_DEFROST_DELAY;
        const progress       = Math.min(effectAge / effectDuration, 1);

        drawAutoSideDefrost(p, progress);
      }

      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
    }

    rafId = requestAnimationFrame(autoDefrostFrame);
  }

  // Draws one frame of defrost for one trail point.
  //
  // Fragments are placed in a BAND offset from the path center:
  //   innerEdge … outerEdge on BOTH sides (left and right of motion).
  // The band shifts outward slowly as progress increases, so the defrost
  // starts right at the trail edge and creeps further out over time.
  function drawAutoSideDefrost(point, progress) {
    // Bell-curve envelope — smooth fade in and out, no hard start or stop
    const fade = Math.sin(progress * Math.PI);

    // Band positions shift outward as the effect matures
    const innerEdge = AUTO_DEFROST_SIDE_OFFSET * (0.7 + progress * 0.5);
    const outerEdge = innerEdge + AUTO_DEFROST_SPREAD * (0.4 + progress * 0.6);

    for (let i = 0; i < AUTO_DEFROST_FRAGMENT_COUNT; i++) {
      const side = Math.random() < 0.5 ? 1 : -1;

      // Lateral: uniformly in [innerEdge … outerEdge] on the chosen side
      const lateralDist = (innerEdge + Math.random() * (outerEdge - innerEdge)) * side;

      // Longitudinal: scatter along the motion axis so it reads as a trail
      const alongDist = (Math.random() - 0.5) * BRUSH_SIZE * AUTO_DEFROST_ALONG_SCATTER;

      const fx = point.x + point.px * lateralDist + point.tx * alongDist;
      const fy = point.y + point.py * lateralDist + point.ty * alongDist;

      // Fragments are 3–10 px — large enough to be clearly visible
      const sz      = BRUSH_SIZE * (0.07 + Math.random() * 0.13);
      const opacity = fade * AUTO_DEFROST_STRENGTH * (0.35 + Math.random() * 0.65);

      drawAngularFragment(fx, fy, sz, Math.random() * Math.PI, opacity);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RESET
  // ─────────────────────────────────────────────────────────────────────────

  function resetFrost() {
    isPointerDown = false;
    lastX         = undefined;
    lastY         = undefined;
    trailPoints   = [];
    lastTrailX    = undefined;
    lastTrailY    = undefined;
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

    <!-- Layer 2: Frost canvas — scraped away by pointer interaction -->
    <canvas
      bind:this={canvas}
      onpointerdown={onPointerDown}
      onpointermove={onPointerMove}
      onpointerup={onPointerUp}
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
