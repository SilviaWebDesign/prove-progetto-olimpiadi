<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import gsap from 'gsap';
  import { ScrollTrigger } from 'gsap/ScrollTrigger';
  import Lenis from 'lenis';

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
    { id: 4, body: 'Il villaggio olimpico di Milano sarà poi convertito in alloggi per studenti universitari.', liked: false },
    { id: 5, body: 'Le piste da ghiaccio temporanee verranno smontate dopo i Giochi, senza strutture inutilizzate.', liked: false },
  ]);

  function toggleLike(id: number) {
    cards = cards.map((c) => (c.id === id ? { ...c, liked: !c.liked } : c));
  }

  const anyLiked = $derived(cards.some(c => c.liked));

  function goToNextTopic() {
    // stub — da collegare al prossimo argomento (2/3)
    console.log('goToNextTopic');
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

  // ── Setup ────────────────────────────────────────────────────────────────
  onMount(() => {
    if (!browser || !sceneEl) return;

    // Prevent browser scroll-restoration jank; we sync manually after init.
    history.scrollRestoration = 'manual';

    gsap.registerPlugin(ScrollTrigger);

    // ── A. Lenis smooth scroll ─────────────────────────────────────────────
    const lenis = new Lenis({ smoothWheel: true, lerp: 0.08 });
    lenis.on('scroll', ScrollTrigger.update);
    const lenisRaf = (t: number) => lenis.raf(t * 1000);
    gsap.ticker.add(lenisRaf);
    gsap.ticker.lagSmoothing(0);

    // ── B. Title refs ──────────────────────────────────────────────────────
    const titleEl = sceneEl.querySelector<SVGSVGElement>('.hero-title')!;
    const textEl  = titleEl.querySelector<SVGTextElement>('.hero-title__text')!;

    // ── C. Explicit initial states — no flash on mid-scroll reload ─────────
    gsap.set(titleEl,          { opacity: 0, scaleY: 1, yPercent: 0, transformOrigin: 'bottom center' });
    gsap.set('.layer--frost',  { autoAlpha: 1 });
    gsap.set('.phrase',        { opacity: 0, y: 30 });
    gsap.set('.stage__text',   { opacity: 0, x: -30 });
    gsap.set('.stage__right',  { opacity: 0, x: 30 });
    gsap.set('.stage__cta',    { opacity: 0 });

    // Soft fade-in of title only when starting from top.
    if (window.scrollY < window.innerHeight * 0.15) {
      gsap.to(titleEl, { opacity: 1, duration: 0.4, ease: 'power2.out', delay: 0.1 });
    }

    // ── D. Animations ──────────────────────────────────────────────────────
    const ctx = gsap.context(() => {

      // Hero scroll trigger: ~150vh → titolo, frost e frase coreografati.
      const heroTl = gsap.timeline({
        scrollTrigger: {
          trigger: sceneEl,
          start:   'top top',
          end:     () => `+=${window.innerHeight * 1.5}`,
          scrub:   1.2,
          onEnter: () => { showSectionLabel = true; },
        },
      });

      // Titolo: stretch verso l'alto e svanisce (0–25%)
      heroTl.fromTo(titleEl,
        { scaleY: 1, yPercent: 0, opacity: 1, immediateRender: false },
        { scaleY: 2.2, yPercent: -120, opacity: 0, ease: 'power3.inOut', duration: 0.25 },
        0
      );
      // Frost: dissolve sovrapposto, leggermente più lungo (0–30%)
      heroTl.to('.layer--frost', { autoAlpha: 0, ease: 'power2.inOut', duration: 0.30 }, 0);
      // Frase: fade-in morbido (20–40%)
      heroTl.fromTo('.phrase',
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, ease: 'power2.out', duration: 0.20 },
        0.20
      );
      // Frase: esce (62–77%)
      heroTl.to('.phrase', { opacity: 0, y: -20, ease: 'power2.in', duration: 0.15 }, 0.62);

      // ── Trigger 3D: separato, inizia a 185vh ──────────────────────────────
      const proxy = { rot: 0, scale: 1, appear: 0 };

      const threeTl = gsap.timeline({
        scrollTrigger: {
          trigger:           sceneEl,
          start:             () => `top+=${window.innerHeight * 1.85}`,
          end:               'bottom bottom',
          scrub:             1.2,
          onComplete:        () => { scene3d?.settle(); },
          onReverseComplete: () => { scene3d?.unsettle(); },
        },
      });

      threeTl.fromTo(proxy, { appear: 0 }, {
        appear: 1, duration: 0.12,
        onUpdate: () => scene3d?.setOpacity(proxy.appear),
      }, 0);

      threeTl.to(proxy, {
        rot: Math.PI * 2, ease: 'none', duration: 0.46,
        onUpdate: () => scene3d?.setRotationY(proxy.rot),
      }, 0.06);

      // Scala finale 0.56
      threeTl.to(proxy, {
        scale: 0.56, ease: 'power2.inOut', duration: 0.28,
        onUpdate: () => scene3d?.setScale(proxy.scale),
      }, 0.46);

      threeTl.fromTo('.stage__text',
        { opacity: 0, x: -30 },
        { opacity: 1, x: 0, ease: 'power2.out', duration: 0.12 },
        0.74
      );

      // Colonna destra (heading + card) e CTA appaiono insieme
      threeTl.fromTo('.stage__right',
        { opacity: 0, x: 30 },
        { opacity: 1, x: 0, ease: 'power2.out', duration: 0.12 },
        0.77
      );

      threeTl.fromTo('.stage__cta',
        { opacity: 0 },
        { opacity: 1, ease: 'power2.out', duration: 0.12 },
        0.77
      );

    }, sceneEl);

    // ── E. Dopo fonts + immagine bg: viewBox, sync Lenis, refresh ──────────
    const bgImg = new Image();
    bgImg.src = '/images/sfondo-infrastrutture.jpg';
    const bgLoaded = new Promise<void>(resolve => {
      bgImg.onload = bgImg.onerror = () => resolve();
    });

    Promise.all([document.fonts.ready, bgLoaded]).then(() => {
      const bb = textEl.getBBox();
      titleEl.setAttribute('viewBox', `${bb.x} ${bb.y} ${bb.width} ${bb.height}`);
      // Sincronizza Lenis alla posizione corrente (gestisce reload a metà pagina).
      lenis.scrollTo(window.scrollY, { immediate: true });
      requestAnimationFrame(() => ScrollTrigger.refresh());
    });

    return () => {
      ctx.revert();
      gsap.ticker.remove(lenisRaf);
      lenis.destroy();
    };
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
     SCROLLYTELLING — 520vh
     .scene__viewport è sticky: rimane a top:0 per tutto lo scroll.
     ═════════════════════════════════════════════════════════════════════════ -->
<section class="scene" bind:this={sceneEl}>
  <div class="scene__viewport">

    <!-- Layer frost -->
    <div class="layer layer--frost">
      <FrostCanvas src="/images/frost-infrastrutture.jpg" />
    </div>

    <!-- Layer bg: sfondo al 28% -->
    <div class="layer layer--bg" aria-hidden="true"></div>

    <!-- Titolone edge-to-edge -->
    <svg class="hero-title" width="100%"
         preserveAspectRatio="xMidYMax meet" role="img" aria-label="INFRASTRUTTURE"
         focusable="false">
      <text class="hero-title__text" x="0" y="0">INFRASTRUTTURE</text>
    </svg>

    <!-- Frase -->
    <div class="phrase-container">
      <p class="phrase">
        Le Olimpiadi prendono forma attraverso cantieri, impianti e collegamenti
        tra territori. Queste opere possono essere lette come investimenti utili
        o come interventi costosi, il cui valore dipende da cosa resterà dopo
        l'evento.
      </p>
    </div>

    <!-- Stage: 3D + testo + colonna destra -->
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

      <!-- Colonna destra: heading + card -->
      <div class="stage__right">
        <p class="stage__right-heading">Metti like alle opinioni con cui sei d'accordo</p>
        <CardStack {cards} onToggleLike={toggleLike} />
      </div>

    </div>

    <!-- CTA in basso al centro, attiva solo con almeno un like -->
    <div class="stage__cta">
      <div
        class="stage__cta-content"
        class:active={anyLiked}
        role="button"
        tabindex={anyLiked ? 0 : -1}
        aria-disabled={!anyLiked}
        onclick={() => { if (anyLiked) goToNextTopic(); }}
        onkeydown={(e) => { if (anyLiked && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); goToNextTopic(); } }}
      >
        <span class="cta-label">Clicca per continuare</span>
        <svg class="cta-chevron" viewBox="58 37 41 20" aria-hidden="true" fill="none">
          <path d="M60 40L78.5 54L95 40" stroke="#161A1F" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
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
    height: 520vh;
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

  /* ── Titolone a filo col fondo ───────────────────────────────────────────── */
  .hero-title {
    display: block;
    position: absolute;
    z-index: 3;
    left: 0;
    right: 0;
    bottom: 0;
    width: 100%;
    overflow: visible;
    transform-origin: bottom center;
    pointer-events: none;
    user-select: none;
    will-change: transform, opacity;
    opacity: 0;
  }

  .hero-title__text {
    font-family: 'PP Formula Condensed', sans-serif;
    font-weight: 700;
    font-variation-settings: 'wght' 700;
    fill: var(--color-text-primary, #16181D);
  }

  /* ── Frase ───────────────────────────────────────────────────────────────── */
  .phrase-container {
    position: absolute;
    inset: 0;
    z-index: 4;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
  }

  .phrase {
    width: min(1349px, 90vw);
    text-align: center;
    font-family: 'Supreme Variable', sans-serif;
    font-weight: 700;
    font-size: clamp(34px, 4.5vw, 68px);
    line-height: 1.1;
    color: var(--color-text-primary, #16181D);
    opacity: 0;
    pointer-events: none;
  }

  /* ══════════════════════════════════════════════════════════════════════════
     STAGE — griglia 3D
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

  /* Colonna destra: heading + card impilati */
  .stage__right {
    grid-column: 3;
    justify-self: end;
    z-index: 2;
    opacity: 0;
    will-change: opacity, transform;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .stage__right-heading {
    font-family: 'Supreme Variable', sans-serif;
    font-weight: 700;
    font-size: clamp(16px, 1.3vw, 21px);
    line-height: 1.25;
    color: #161A1F;
    max-width: 356px;
  }

  /* ── CTA in basso al centro ──────────────────────────────────────────────── */
  .stage__cta {
    position: absolute;
    bottom: 28px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 10;
    pointer-events: none; /* GSAP gestisce opacity; inner gestisce i click */
    opacity: 0;           /* stato iniziale in CSS, GSAP porta a 1 nello stato finale */
  }

  .stage__cta-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    opacity: 0.35;
    pointer-events: none;
    cursor: default;
    transition: opacity 300ms ease;
  }

  .stage__cta-content.active {
    opacity: 1;
    pointer-events: auto;
    cursor: pointer;
  }

  .cta-label {
    font-family: 'Supreme Variable', sans-serif;
    font-weight: 700;
    font-size: 13px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #161A1F;
    white-space: nowrap;
  }

  .cta-chevron {
    display: block;
    width: 38px;
    height: 19px;
  }

  .stage__cta-content.active .cta-chevron {
    animation: chevron-bounce 1.4s ease-in-out infinite;
  }

  @keyframes chevron-bounce {
    0%, 100% { transform: translateY(0); }
    50%       { transform: translateY(5px); }
  }
</style>
