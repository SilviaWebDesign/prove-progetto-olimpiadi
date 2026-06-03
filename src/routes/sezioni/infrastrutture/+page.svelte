<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import gsap from 'gsap';
  import { ScrollTrigger } from 'gsap/ScrollTrigger';

  import FrostCanvas from '$lib/components/FrostCanvas.svelte';
  import TextBlock from './TextBlock.svelte';
  import CardStack from './CardStack.svelte';
  import Scene3D from './Scene3D.svelte';
  import type { Scene3DApi } from './Scene3D.svelte';

  import './tokens.css';

  // ── Card state ────────────────────────────────────────────────────────────
  interface CardData { id: number; body: string; liked: boolean; }

  let cards = $state<CardData[]>([
    { id: 0, body: 'Lo Stadio di San Siro sarà completamente ristrutturato per ospitare le cerimonie olimpiche.', liked: false },
    { id: 1, body: "L'Unipol Forum di Assago è già pronto e non richiede interventi strutturali rilevanti.", liked: false },
    { id: 2, body: "Rho Fiera viene adattata come hub logistico e media center per l'intera manifestazione.", liked: false },
    { id: 3, body: 'Circa il 90% delle sedi di gara rientra in una logica di riuso o utilizzo di strutture temporanee.', liked: false },
  ]);

  function toggleLike(id: number) {
    cards = cards.map((c) => (c.id === id ? { ...c, liked: !c.liked } : c));
  }

  // ── Text block content ────────────────────────────────────────────────────
  const textBlockBody =
    'Milano-Cortina 2026 è stata progettata intorno a un uso esteso di sedi già esistenti o ' +
    'temporanee, al fine di non lasciare "cattedrali nel deserto", come spesso accade. Secondo ' +
    'la comunicazione ufficiale, circa il 90% delle sedi di gara rientra in questa logica di ' +
    "riuso. Alcuni degli esempi sono lo stadio di San Siro, l'Unipol Forum, e Rho Fiera.";

  // ── DOM refs ──────────────────────────────────────────────────────────────
  let sceneEl = $state<HTMLElement | null>(null);

  // ── Scene3D API (bindable) ───────────────────────────────────────────────
  let scene3d = $state<Scene3DApi | undefined>(undefined);

  // ── Header label ─────────────────────────────────────────────────────────
  let showSectionLabel = $state(false);

  // ── GSAP ─────────────────────────────────────────────────────────────────
  onMount(() => {
    if (!browser || !sceneEl) return;

    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      // ── 1. Adatta il titolo all'intera larghezza del viewport ───────────
      const titleEl = sceneEl!.querySelector<HTMLElement>('.hero-title')!;
      const vw = window.innerWidth;
      const naturalW = titleEl.offsetWidth;
      if (naturalW > 0) {
        const curSize = parseFloat(getComputedStyle(titleEl).fontSize);
        gsap.set(titleEl, { fontSize: curSize * ((vw * 0.98) / naturalW) });
      }

      // ── 2. Timeline hero — AUTOMATICA: solo l'ingresso bouncy ───────────
      const heroTl = gsap.timeline({ defaults: { transformOrigin: 'bottom center' } });

      heroTl.fromTo(titleEl,
        { scaleY: 0.06, opacity: 0 },
        { scaleY: 1, opacity: 1, duration: 1.0, ease: 'elastic.out(1,0.5)' }
      );

      // ── 3. Scroll timeline — scrubbed, niente pin ────────────────────────
      //
      //  0.00 → 0.12 : titolo si stretcha verso l'alto e svanisce
      //  0.00 → 0.12 : frost svanisce in parallelo con il titolo
      //  0.10 → 0.22 : frase fa fade-in soft
      //  0.22 → 0.36 : frase esce
      //  0.28 → fine : scena 3D (posizioni originali invariate)
      //
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sceneEl,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 1,
          onEnter:   () => { showSectionLabel = true; },
          onComplete: () => { scene3d?.startIdleSpin(); },
        },
      });

      // Titolo stretch + uscita (scrubbed)
      tl.fromTo(titleEl,
        { scaleY: 1, yPercent: 0, opacity: 1 },
        { scaleY: 2.2, yPercent: -120, opacity: 0, ease: 'power3.in', duration: 0.12 },
        0
      );

      // Frost svanisce assieme al titolo
      tl.to('.layer--frost', { autoAlpha: 0, duration: 0.12 }, 0);

      // Frase compare dopo che il titolo ha cominciato a salire
      tl.fromTo('.phrase',
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, ease: 'power2.out', duration: 0.12 },
        0.10
      );

      // Frase esce per dare spazio alla scena 3D
      tl.to('.phrase', { opacity: 0, y: -40, duration: 0.14 }, 0.22);

      // ↓↓ Scena 3D — posizioni originali invariate ↓↓
      const proxy = { rot: 0, scale: 1, appear: 0 };

      tl.fromTo(proxy, { appear: 0 }, {
        appear: 1, duration: 0.08,
        onUpdate: () => scene3d?.setOpacity(proxy.appear),
      }, 0.28);

      tl.to(proxy, {
        rot: Math.PI * 2, ease: 'none', duration: 0.30,
        onUpdate: () => scene3d?.setRotationY(proxy.rot),
      }, 0.32);

      // Scala finale +1/3 rispetto all'originale (0.42 × 1.33 ≈ 0.56)
      tl.to(proxy, {
        scale: 0.56, ease: 'power2.inOut', duration: 0.18,
        onUpdate: () => scene3d?.setScale(proxy.scale),
      }, 0.58);

      tl.fromTo('.stage__text',
        { opacity: 0, x: -30 },
        { opacity: 1, x: 0, duration: 0.15, ease: 'power2.out' },
        0.76
      );

      tl.fromTo('.stage__cards',
        { opacity: 0, x: 30 },
        { opacity: 1, x: 0, duration: 0.15, ease: 'power2.out' },
        0.78
      );
    }, sceneEl);

    return () => ctx.revert();
  });
</script>

<svelte:head>
  <title>Infrastrutture — Quante facce ha una medaglia?</title>
</svelte:head>

<!-- ── Header fisso ────────────────────────────────────────────────────────── -->
<header class="site-header">
  <span class="header-brand">QUANTE FACCE HA UNA MEDAGLIA?</span>
  <span class="header-section" class:visible={showSectionLabel}>INFRASTRUTTURE</span>
  <button class="hamburger" aria-label="Menu" tabindex="-1" aria-hidden="true">
    <span></span><span></span><span></span>
  </button>
</header>

<!-- ════════════════════════════════════════════════════════════════════════════
     SCROLLYTELLING — 400vh
     .scene__viewport è sticky: rimane a top:0 per tutto lo scroll.
     Niente pin GSAP = niente transform sull'antenato = frost intatto.
     ═════════════════════════════════════════════════════════════════════════ -->
<section class="scene" bind:this={sceneEl}>
  <div class="scene__viewport">

    <!-- Layer frost: vetro smerigliato con reveal su foto infrastrutture -->
    <div class="layer layer--frost">
      <FrostCanvas src="/images/frost-infrastrutture.jpg" />
    </div>

    <!-- Layer bg: sfondo-infrastrutture.jpg al 28%, sempre visibile sotto il frost -->
    <div class="layer layer--bg" aria-hidden="true"></div>

    <!-- Titolone: fit edge-to-edge, bouncy in, stretch up e fuori -->
    <h1 class="hero-title">INFRASTRUTTURE</h1>

    <!-- Frase: compare automaticamente dopo il titolo, esce con lo scroll -->
    <p class="phrase">
      Le Olimpiadi prendono forma attraverso cantieri, impianti e collegamenti
      tra territori. Queste opere possono essere lette come investimenti utili
      o come interventi costosi, il cui valore dipende da cosa resterà dopo
      l'evento.
    </p>

    <!-- Stage: 3D + testo + card (visibili nella parte scrollata) -->
    <div class="stage">

      <div class="stage__text">
        <TextBlock
          counter="1 / 3"
          title="Riuso delle sedi"
          body={textBlockBody}
          source="FONTE"
        />
      </div>

      <div class="stage__canvas">
        <Scene3D bind:api={scene3d} />
      </div>

      <div class="stage__cards">
        <CardStack {cards} onToggleLike={toggleLike} />
      </div>

    </div>
  </div>
</section>

<style>
  /* ── @font-face ──────────────────────────────────────────────────────────── */
  @font-face {
    font-family: 'PP Formula Condensed';
    src: url('/fonts/PPFormula-Condensed-Variable.ttf') format('truetype');
    font-weight: 100 900;
    font-style: normal;
    font-display: swap;
  }
  @font-face {
    font-family: 'Supreme Variable';
    src: url('/fonts/Supreme-Variable.ttf') format('truetype');
    font-weight: 100 900;
    font-style: normal;
    font-display: swap;
  }

  /* ── Reset + base ─────────────────────────────────────────────────────────── */
  :global(*, *::before, *::after) {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
  :global(body) {
    background: var(--color-bg, #FFFFFF);
    color: var(--color-text-primary, #16181D);
    overflow-x: hidden;
  }

  /* ── Header ──────────────────────────────────────────────────────────────── */
  .site-header {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 200;
    height: 52px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 clamp(16px, 2.4vw, 32px);
    background: rgba(255, 255, 255, 0.88);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    border-bottom: 1px solid rgba(22, 24, 29, 0.1);
  }

  .header-brand {
    font-family: 'PP Formula Condensed', sans-serif;
    font-size: clamp(9px, 0.82vw, 11px);
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--color-text-primary, #16181D);
  }

  .header-section {
    font-family: 'PP Formula Condensed', sans-serif;
    font-size: clamp(10px, 0.89vw, 12px);
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--color-section-infrastructure, #FF834C);
    opacity: 0;
    transform: translateY(6px);
    transition:
      opacity 0.5s cubic-bezier(0.25, 1, 0.5, 1),
      transform 0.5s cubic-bezier(0.25, 1, 0.5, 1);
    pointer-events: none;
  }
  .header-section.visible {
    opacity: 1;
    transform: translateY(0);
  }

  .hamburger {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 4px;
    width: 32px;
    height: 32px;
    background: none;
    border: none;
    padding: 4px;
    cursor: pointer;
  }
  .hamburger span {
    display: block;
    width: 100%;
    height: 1.5px;
    background: var(--color-text-primary, #16181D);
    border-radius: 2px;
  }

  /* ══════════════════════════════════════════════════════════════════════════
     SCROLLYTELLING
     ═══════════════════════════════════════════════════════════════════════ */

  .scene {
    height: 400vh;
    position: relative;
  }

  .scene__viewport {
    position: sticky;
    top: 0;
    height: 100vh;
    overflow: hidden;
    background: #FFFFFF;
  }

  .layer {
    position: absolute;
    inset: 0;
  }

  .layer--frost {
    z-index: 2;
  }

  .layer--bg {
    z-index: 1;
    background-image: url('/images/sfondo-infrastrutture.jpg');
    background-size: cover;
    background-position: center;
    opacity: 0.28;
  }

  /* ── Titolone edge-to-edge ───────────────────────────────────────────────── */
  /* font-size iniziale abbondante; JS lo corregge per riempire ~98vw */
  .hero-title {
    position: absolute;
    z-index: 3;
    left: 0;
    right: 0;
    bottom: 6vh;
    width: 100%;
    text-align: center;
    transform-origin: bottom center;
    font-family: 'PP Formula Condensed', sans-serif;
    font-size: clamp(120px, 18vw, 260px);
    font-weight: 700;
    line-height: 1;
    color: var(--color-text-primary, #16181D);
    white-space: nowrap;
    pointer-events: none;
    user-select: none;
    will-change: transform, opacity;
  }

  /* ── Frase ───────────────────────────────────────────────────────────────── */
  .phrase {
    position: absolute;
    z-index: 4;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: min(1349px, 90vw);
    text-align: center;
    font-family: 'Supreme Variable', sans-serif;
    font-weight: 700;
    font-size: clamp(34px, 4.5vw, 68px);
    line-height: 1.15;
    color: var(--color-text-primary, #16181D);
    opacity: 0;
    pointer-events: none;
  }

  /* ══════════════════════════════════════════════════════════════════════════
     STAGE — griglia 3D (fase scroll)
     ═══════════════════════════════════════════════════════════════════════ */

  .stage {
    position: absolute;
    inset: 0;
    z-index: 1;
    display: grid;
    grid-template-columns: 1fr 1.2fr 1fr;
    align-items: center;
    padding: 0 6vw;
  }

  .stage__canvas {
    position: absolute;
    inset: 0;
    z-index: 1;
    pointer-events: none;
  }

  .stage__text {
    grid-column: 1;
    justify-self: start;
    z-index: 2;
    opacity: 0;
    will-change: opacity, transform;
  }

  .stage__cards {
    grid-column: 3;
    justify-self: end;
    z-index: 2;
    opacity: 0;
    will-change: opacity, transform;
  }
</style>
