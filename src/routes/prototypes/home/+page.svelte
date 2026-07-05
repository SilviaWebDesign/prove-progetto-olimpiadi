<script>
  import ThreeScene from '../../../lib/materiali-home/ThreeScene.svelte';
  import CardsStage from '../../../lib/materiali-home/CardsStage.svelte';
  import Navbar from '../../../lib/materiali-home/Navbar.svelte';
  import { browser } from '$app/environment';
  import { onMount, tick } from 'svelte';
  import { afterNavigate } from '$app/navigation';
  import {
    clamp,
    easeOutCubic,
    rangeProgress,
    HOME_SNOW_DIVE_START,
    SNOW_ZONE_SCROLL,
    HOME_CARDS_START,
    HOME_CARDS_END,
    stageMoxyOpacity
  } from '../../../lib/materiali-home/scrollStages.js';
  import { homeScrollProgress } from '../../../lib/materiali-home/homeScrollProgress.js';
  import { overlayVisible } from '$lib/stores/pageTransition';

  let scrollProgress = $state(0);
  /** @type {HTMLDivElement | undefined} */
  let container;
  let heroEntered = $state(false);

  /**
   * Fade in only — resta visibile fino alla fine dello scroll.
   * @param {number} progress @param {number} fadeInStart @param {number} fadeInEnd
   */
  function stageOpacityIn(progress, fadeInStart, fadeInEnd) {
    if (progress < fadeInStart) return 0;
    if (progress < fadeInEnd) return easeOutCubic(rangeProgress(progress, fadeInStart, fadeInEnd));
    return 1;
  }

  /**
   * Testi narrativi con pause tra un blocco e l'altro (nessuna sovrapposizione).
   * Ogni blocco: fade in → visibile → fade out → scroll vuoto prima del successivo.
   */
  const TEXT1 = { in: 0.06, inEnd: 0.11, out: 0.13, outEnd: 0.18 };
  const TEXT2 = { in: 0.28, inEnd: 0.33, out: 0.35, outEnd: 0.40 };
  /** Compare solo dopo sfondo bianco pieno (SNOW_ZONE_SCROLL ≈ 0.54) */
  const TEXT3 = { in: 0.58, inEnd: 0.68, out: 0.70, outEnd: 0.80 };
  const CARDS = { in: 0.90, inEnd: 0.95 };

  const TEXT1_LINES = [
    'La realtà non è unica',
    'e oggettiva, dipende',
    'dai fatti che osservi e dal',
    'punto di vista che scegli.'
  ];
  const TEXT2_LINES = [
    'Attraversa il percorso',
    'tra sostenibilità, sport',
    'e infrastrutture, e prendi',
    'posizione davanti',
    'alle informazioni.'
  ];
  const TEXT3_LINES = [
    'Le tue scelte',
    'plasmeranno la realtà di',
    'Milano-Cortina 2026.'
  ];

  let text1Opacity = $derived(
    stageMoxyOpacity(scrollProgress, TEXT1.in, TEXT1.inEnd, TEXT1.out, TEXT1.outEnd)
  );
  let text2Opacity = $derived(
    stageMoxyOpacity(scrollProgress, TEXT2.in, TEXT2.inEnd, TEXT2.out, TEXT2.outEnd)
  );
  let text3Opacity = $derived(
    stageMoxyOpacity(scrollProgress, TEXT3.in, TEXT3.inEnd, TEXT3.out, TEXT3.outEnd)
  );

  let cardsOpacity = $derived(stageOpacityIn(scrollProgress, CARDS.in, CARDS.inEnd));
  let cardsInteractive = $derived(cardsOpacity > 0.05);

  let snowWhiteOpacity = $derived.by(() => {
    const snowIn = easeOutCubic(
      rangeProgress(scrollProgress, HOME_SNOW_DIVE_START, SNOW_ZONE_SCROLL)
    );
    const fadeBeforeCards = easeOutCubic(
      rangeProgress(scrollProgress, HOME_CARDS_START - 0.05, HOME_CARDS_START)
    );
    return snowIn * (1 - fadeBeforeCards);
  });

  let heroScrollFade = $derived(Math.max(0, 1 - easeOutCubic(clamp(scrollProgress * 3.8, 0, 1))));

  function docScrollHeight() {
    if (!container) return 0;
    return Math.max(container.scrollHeight - window.innerHeight, 0);
  }

  function readScrollProgress() {
    const docHeight = docScrollHeight();
    if (docHeight <= 0) return 0;
    return clamp(window.scrollY / docHeight, 0, 1);
  }

  const CARDS_TARGET_PROGRESS = 0.95;

  function scrollToSezioni() {
    const scrollMax = Math.max(document.documentElement.scrollHeight - window.innerHeight, 0);
    if (scrollMax > 0) {
      window.scrollTo({ top: scrollMax * CARDS_TARGET_PROGRESS, behavior: 'instant' });
    }
  }

  afterNavigate(({ to }) => {
    if (to?.url.pathname === '/prototypes/home' || to?.url.pathname === '/prototypes/home/') {
      overlayVisible.set(false);
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }
    if (to?.url.hash === '#sezioni') scrollToSezioni();
  });

  let scrollTicking = false;

  function scheduleScrollUpdate() {
    homeScrollProgress.value = readScrollProgress();

    if (scrollTicking) return;
    scrollTicking = true;
    requestAnimationFrame(() => {
      scrollTicking = false;
      scrollProgress = homeScrollProgress.value;
    });
  }

  
  $effect(() => {
    if (typeof document === 'undefined') return;
    document.body.classList.toggle('cards-phase', scrollProgress >= CARDS.in);
  });

  onMount(() => {
    overlayVisible.set(false);
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';

    if (window.location.hash === '#sezioni') {
      scrollToSezioni();
    }

    const p = readScrollProgress();
    homeScrollProgress.value = p;
    scrollProgress = p;

    window.addEventListener('scroll', scheduleScrollUpdate, { passive: true });
    window.addEventListener('resize', scheduleScrollUpdate, { passive: true });
    tick().then(() => {
      heroEntered = true;
    });
    return () => {
      window.removeEventListener('scroll', scheduleScrollUpdate);
      window.removeEventListener('resize', scheduleScrollUpdate);
      document.body.classList.remove('cards-phase');
    };
  });
</script>

<div class="organimo-wrapper" bind:this={container}>
  <div class="webgl-bg">
    {#if browser}
      <ThreeScene snowZoneAt={SNOW_ZONE_SCROLL} />
    {/if}
    <div
      class="snow-white-layer"
      style="opacity: {snowWhiteOpacity}"
      aria-hidden={snowWhiteOpacity < 0.05}
    ></div>
  </div>

  <div class="scroller">
    <section
      class="stage homepage-hero"
      class:hero-entered={heroEntered}
      style="opacity: {heroScrollFade}; pointer-events: {scrollProgress > 0.12 ? 'none' : 'auto'};"
      aria-hidden={heroScrollFade < 0.05}
    >
      <div class="hero-lower">
        <div class="hero-title-stack">
          <p class="brand-tag hero-reveal" style="--reveal-delay: 0ms">Milano-Cortina 2026</p>
          <h1 class="main-title">
            <span class="title-line hero-reveal" style="--reveal-delay: 120ms">Quante facce ha</span>
            <span class="title-line hero-reveal" style="--reveal-delay: 260ms">una medaglia?</span>
          </h1>
        </div>
        <div class="scroll-hint hero-reveal" style="--reveal-delay: 480ms">
          <span class="scroll-hint__label">Continua</span>
          <svg class="scroll-hint__chevron" viewBox="0 0 21 9" aria-hidden="true" fill="none">
            <path d="M1 1.35L10.5 7.65L20 1.35" stroke="#161A1F" stroke-width="1.5"
                  stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
      </div>
    </section>

    <section
      class="stage center-stage"
      class:stage-visible={text1Opacity > 0.02}
      style="opacity: {text1Opacity}; pointer-events: {text1Opacity > 0.1 ? 'auto' : 'none'};"
      aria-hidden={text1Opacity < 0.05}
    >
      <div class="split-lines-container">
        {#each TEXT1_LINES as line}
          <h2 class="narrative-line">{line}</h2>
        {/each}
      </div>
    </section>

    <section
      class="stage center-stage"
      class:stage-visible={text2Opacity > 0.02}
      style="opacity: {text2Opacity}; pointer-events: {text2Opacity > 0.1 ? 'auto' : 'none'};"
      aria-hidden={text2Opacity < 0.05}
    >
      <div class="split-lines-container">
        {#each TEXT2_LINES as line}
          <h3 class="narrative-line">{line}</h3>
        {/each}
      </div>
    </section>

    <section
      class="stage center-stage center-stage--viewport"
      class:stage-visible={text3Opacity > 0.02}
      style="opacity: {text3Opacity}; pointer-events: {text3Opacity > 0.1 ? 'auto' : 'none'};"
      aria-hidden={text3Opacity < 0.05}
    >
      <div class="split-lines-container">
        {#each TEXT3_LINES as line}
          <h3 class="narrative-line">{line}</h3>
        {/each}
      </div>
    </section>

    <section
      class="stage cards-stage"
      class:stage-visible={cardsOpacity > 0.02}
      style="opacity: {cardsOpacity}; pointer-events: {cardsInteractive ? 'auto' : 'none'};"
      aria-hidden={cardsOpacity < 0.05}
    >
      <CardsStage active={cardsOpacity > 0.05} />
    </section>

    <div class="space-padding"></div>
  </div>
</div>

<Navbar revealAtCards />

<style>
  :global(body) {
    overflow-x: hidden;
    overflow-y: auto;
  }

  .organimo-wrapper {
    position: relative;
    width: 100%;
    --home-navbar-height: 64px;
    --page-padding-x: clamp(24px, 5.23vw, 79px);
    --hero-pad-top: 110px;
    --hero-pad-bottom: 52px;
    --hero-pad-x: 20px;
    /* spazio sotto il titolo = hint scroll (allinea i testi narrativi) */
    --hero-text-lift: 5.25rem;
    /* Tipografia home — allineata a Figma (node 2:118) */
    --home-title-leading: 1;
    --home-title-tracking: 0;
    --home-title-line-gap: 0;
    --home-brand-leading: 1.3;
    --home-brand-tracking: 0;
    --home-narrative-size: clamp(1.55rem, 3.8vw, 2.9rem);
    --home-narrative-leading: 1.2;
    --home-narrative-tracking: 0;
    --home-narrative-gap: 0;
    --home-title-size: clamp(3.85rem, 11vw, 7rem);
    --home-brand-size: 1rem;
  }

  .webgl-bg {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: 1;
    pointer-events: none;
    background: #ffffff;
  }

  .snow-white-layer {
    position: absolute;
    inset: 0;
    z-index: 2;
    background: #ffffff;
    opacity: 0;
    pointer-events: none;
  }

  .scroller {
    position: relative;
    z-index: 2;
    font-family: 'Supreme Variable', sans-serif;
  }

  /* 基础全屏容器，让所有文本层层叠在中央 */
  .stage {
    position: fixed;
    top: 0; left: 0;
    width: 100vw; height: 100vh;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    visibility: hidden;
  }

  .stage.stage-visible,
  .stage.homepage-hero {
    visibility: visible;
  }

  /* Hero: brand in alto, titolo in basso (vette libere al centro) */
  .homepage-hero {
    position: relative;
    justify-content: flex-start;
    padding: var(--hero-pad-top) var(--hero-pad-x) var(--hero-pad-bottom);
  }

  .hero-lower {
    margin-top: auto;
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.75rem;
    padding-bottom: 0.25rem;
  }

  .hero-title-stack {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 1rem;
  }

  /* Testi narrativi alla stessa altezza del titolo hero */
  .center-stage {
    justify-content: flex-start;
    padding: var(--hero-pad-top) 40px var(--hero-pad-bottom);
  }

  .center-stage .split-lines-container {
    margin-top: auto;
    margin-bottom: var(--hero-text-lift);
    width: 100%;
  }

  .center-stage--viewport {
    justify-content: center;
    padding-top: 0;
    padding-bottom: 0;
  }

  .center-stage--viewport .split-lines-container {
    margin-top: 0;
    margin-bottom: 0;
  }

  .cards-stage {
    justify-content: stretch;
    align-items: stretch;
    padding: 0;
    top: var(--home-navbar-height, 64px);
    height: calc(100vh - var(--home-navbar-height, 64px));
    z-index: 3;
    text-align: left;
    pointer-events: none;
  }

  .cards-stage :global(.cards-stage-inner) {
    pointer-events: auto;
    padding-top: calc(110px - var(--home-navbar-height, 64px));
    padding-left: var(--page-padding-x);
    padding-right: var(--page-padding-x);
  }

  .brand-tag {
    font-family: 'Supreme Variable', sans-serif;
    font-size: var(--home-brand-size);
    font-weight: 700;
    letter-spacing: var(--home-brand-tracking);
    line-height: var(--home-brand-leading);
    font-kerning: normal;
    font-feature-settings: 'kern' 1, 'liga' 1;
    text-transform: none;
    color: #000000;
    margin: 0;
  }

  @media (min-width: 769px) {
    .hero-title-stack {
      gap: 0.55rem;
    }

    .brand-tag {
      font-size: 1.35rem;
    }

    .main-title {
      --home-title-size: clamp(5.5rem, 9.5vw, 7.75rem);
    }

    .narrative-line {
      --home-narrative-size: clamp(2.35rem, 3.6vw, 3.1rem);
    }
  }

  .main-title {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--home-title-line-gap);
    font-family: 'PP Formula Condensed', var(--font-title);
    font-size: var(--home-title-size);
    font-weight: 900;
    font-variation-settings: 'wght' 900;
    font-stretch: condensed;
    font-kerning: normal;
    font-feature-settings: 'kern' 1;
    text-transform: uppercase;
    letter-spacing: var(--home-title-tracking);
    line-height: var(--home-title-leading);
    text-rendering: optimizeLegibility;
    margin: 0;
    padding: 0.04em 0 0;
    color: #000000;
  }

  .title-line {
    display: block;
    margin: 0;
    padding: 0;
  }

  .scroll-hint {
    font-family: 'Supreme Variable', sans-serif;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    padding: 0 14px;
  }

  .scroll-hint__label {
    font-size: 12px;
    font-weight: 700;
    line-height: 1.1;
    text-align: center;
    color: #161A1F;
  }

  .scroll-hint__chevron {
    display: block;
    width: 21px;
    height: 9px;
    animation: chevron-bounce 1.4s ease-in-out infinite;
  }

  @keyframes chevron-bounce {
    0%, 100% { transform: translateY(0); }
    50%       { transform: translateY(5px); }
  }

  .split-lines-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--home-narrative-gap);
    max-width: 1200px;
    text-transform: none;
  }

  .narrative-line {
    font-family: 'Supreme Variable', sans-serif;
    font-size: var(--home-narrative-size);
    font-weight: 700;
    font-kerning: normal;
    font-feature-settings: 'kern' 1, 'liga' 1;
    letter-spacing: var(--home-narrative-tracking);
    line-height: var(--home-narrative-leading);
    text-rendering: optimizeLegibility;
    margin: 0;
    padding: 0;
    color: #000000;
  }

  /* Hero — solo fade-in al caricamento */
  .hero-reveal {
    opacity: 0;
  }

  .homepage-hero.hero-entered .hero-reveal {
    animation: heroFadeIn 1.1s ease-out forwards;
    animation-delay: var(--reveal-delay, 0ms);
  }

  @keyframes heroFadeIn {
    to {
      opacity: 1;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .hero-reveal {
      opacity: 1;
    }

    .homepage-hero.hero-entered .hero-reveal {
      animation: none;
    }
  }

  .space-padding {
    height: 1300vh; /* più scroll = più pausa tra le fasi */
  }

  @media (max-width: 768px) {
    .organimo-wrapper {
      --hero-pad-top: 96px;
      --hero-pad-bottom: 40px;
      --hero-pad-x: 16px;
      --hero-text-lift: 4.5rem;
      --home-navbar-height: 30px;
      --page-padding-x: 28px;
      --home-title-leading: 1;
      --home-title-tracking: 0;
      --home-title-line-gap: 0;
      --home-brand-tracking: 0;
      --home-narrative-leading: 1.2;
      --home-narrative-gap: 0;
    }

    .center-stage {
      padding-left: 16px;
      padding-right: 16px;
    }

    .hero-lower {
      gap: 1.25rem;
    }

    .hero-title-stack {
      gap: 0.85rem;
    }

    .brand-tag {
      font-size: 1.1rem;
    }

    .main-title {
      --home-title-size: 3.85rem;
    }

    .narrative-line {
      --home-narrative-size: 1.5rem;
    }

    .split-lines-container {
      max-width: 278px;
    }

    .cards-stage :global(.cards-stage-inner) {
      padding-top: 10px;
    }
  }
</style>