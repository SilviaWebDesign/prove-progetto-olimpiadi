<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import gsap from 'gsap';
  import { ScrollTrigger } from 'gsap/ScrollTrigger';

  import HeroFrost from '$lib/components/file-chiara/HeroFrost.svelte';
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

  // ── GSAP: una timeline scrubbed, niente pin ───────────────────────────────
  onMount(() => {
    if (!browser || !sceneEl) return;

    gsap.registerPlugin(ScrollTrigger);

    // Set the title horizontal centering via GSAP so xPercent stays correct
    // even when other transform components are animated
    gsap.set('.hero-title', { xPercent: -50 });

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sceneEl,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 1,
          onEnter: () => { showSectionLabel = true; },
        },
      });

      // ── FASE A (0 → 0.20): titolo si stretcha verso l'alto ───────────────
      tl.fromTo(
        '.hero-title',
        { scaleY: 1 },
        { scaleY: 1.6, ease: 'none', duration: 0.20 },
        0
      );

      // ── FASE B (0.20 → 0.42): titolo esce, frase entra (crossfade sfalsato)
      tl.to('.hero-title', { opacity: 0, yPercent: -40, duration: 0.12 }, 0.20);
      tl.fromTo('.phrase', { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.16, ease: 'power2.out' }, 0.26);

      // ── FASE C (0.45 → 0.57): frase esce, frost dissolve, sfondo bianco ──
      tl.to('.phrase',      { opacity: 0, y: -40,  duration: 0.12 }, 0.45);
      tl.to('.layer--frost', { autoAlpha: 0,        duration: 0.12 }, 0.45);
      tl.to('.layer--bg',   { opacity: 1,           duration: 0.12 }, 0.45);

      // ── FASE D (0.55 → 1.01): 3D grande → ruota → rimpicciolisce → testo/card
      const proxy = { rot: 0, scale: 1, appear: 0 };

      tl.fromTo(proxy, { appear: 0 }, {
        appear: 1, duration: 0.08,
        onUpdate: () => scene3d?.setOpacity(proxy.appear),
      }, 0.55);

      tl.to(proxy, {
        rot: Math.PI * 2, ease: 'none', duration: 0.30,
        onUpdate: () => scene3d?.setRotationY(proxy.rot),
      }, 0.58);

      tl.to(proxy, {
        scale: 0.42, ease: 'power2.inOut', duration: 0.18,
        onUpdate: () => scene3d?.setScale(proxy.scale),
      }, 0.80);

      tl.fromTo('.stage__text',
        { opacity: 0, x: -30 },
        { opacity: 1, x: 0, duration: 0.15, ease: 'power2.out' },
        0.84
      );

      tl.fromTo('.stage__cards',
        { opacity: 0, x: 30 },
        { opacity: 1, x: 0, duration: 0.15, ease: 'power2.out' },
        0.86
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
     SEZIONE SCROLLYTELLING
     400 vh di altezza → 300 vh di distanza scroll per guidare la timeline.
     Il viewport è sticky (top: 0, height: 100vh): il frost non rompe mai
     perché non ci sono transform/pin esterni che creano stacking context.
     ═════════════════════════════════════════════════════════════════════════ -->
<section class="scene" bind:this={sceneEl}>
  <div class="scene__viewport">

    <!-- Layer frost: sfondo interattivo, scompare in fase C (autoAlpha 0) -->
    <div class="layer layer--frost">
      <HeroFrost src="/images/snow-bg.jpg" refreezeMs={3500} />
    </div>

    <!-- Layer bg bianco: opacity 0 → 1 in fase C -->
    <div class="layer layer--bg" aria-hidden="true"></div>

    <!-- Titolone: si stretcha in fase A, esce in fase B -->
    <h1 class="hero-title">INFRASTRUTTURE</h1>

    <!-- Frase: entra in fase B, esce in fase C -->
    <p class="phrase">
      Le Olimpiadi prendono forma attraverso cantieri, impianti e
      collegamenti tra territori — opere che possono essere lette come
      investimenti utili o come interventi costosi, il cui valore dipende da
      cosa resterà dopo l'evento.
    </p>

    <!-- Stage: griglia testo | canvas 3D | card (visibile in fase D) -->
    <div class="stage">

      <div class="stage__text">
        <TextBlock
          counter="1 / 3"
          title="Riuso delle sedi"
          body={textBlockBody}
          source="FONTE"
        />
      </div>

      <!-- Canvas a tutto schermo: il modello scala da grande (scale=1) a piccolo (scale=0.42) -->
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
     ARCHITETTURA SCROLLYTELLING
     .scene fornisce la distanza di scroll (400vh).
     .scene__viewport è sticky: rimane a top:0 per tutto lo scroll.
     Niente pin = niente transform sull'antenato = frost intatto.
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

  /* Tutti i layer sono assoluti, coprono l'intero viewport sticky */
  .layer {
    position: absolute;
    inset: 0;
  }

  /* Frost sopra tutto tranne hero-title e phrase */
  .layer--frost {
    z-index: 2;
  }

  /* Sfondo bianco: passa da opacity 0 a 1 in fase C */
  .layer--bg {
    z-index: 1;
    background: #FFFFFF;
    opacity: 0;
  }

  /* ── Titolone ─────────────────────────────────────────────────────────────── */
  /* xPercent: -50 gestito da GSAP in onMount per mantenere la percentuale corretta */
  .hero-title {
    position: absolute;
    z-index: 3;
    left: 50%;
    bottom: 6vh;
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

  /* ── Frase centrata ───────────────────────────────────────────────────────── */
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
     STAGE — griglia finale (fase D)
     Il canvas Three.js è position: absolute inset:0 → a tutto schermo.
     Testo (col 1) e card (col 3) sono grid items con z-index esplicito
     così appaiono sopra il canvas.
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

  /* Canvas Three.js: fuori dal flusso del grid, copre l'intero stage */
  .stage__canvas {
    position: absolute;
    inset: 0;
    z-index: 1;
    pointer-events: none;
  }

  /* Testo sx — grid column 1, sopra il canvas */
  .stage__text {
    grid-column: 1;
    justify-self: start;
    z-index: 2;
    opacity: 0;
    will-change: opacity, transform;
  }

  /* Card dx — grid column 3, sopra il canvas */
  .stage__cards {
    grid-column: 3;
    justify-self: end;
    z-index: 2;
    opacity: 0;
    will-change: opacity, transform;
  }
</style>
