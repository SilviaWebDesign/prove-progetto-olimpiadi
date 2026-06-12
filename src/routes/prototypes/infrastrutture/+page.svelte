<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import gsap from 'gsap';
  import { ScrollTrigger } from 'gsap/ScrollTrigger';

  import HeroFrost from '$lib/components/file-chiara/HeroFrost.svelte';
  import TextBlock from './TextBlock.svelte';
  import CardStack from './CardStack.svelte';
  import Scene3D from './Scene3D.svelte';

  import './tokens.css';

  gsap.registerPlugin(ScrollTrigger);

  /* ── Stato like per le card ─────────────────────────────────────────────── */
  interface CardData {
    id: number;
    text: string;
    liked: boolean;
  }

  let cards = $state<CardData[]>([
    {
      id: 0,
      text: 'Lo Stadio di San Siro sarà completamente ristrutturato per ospitare le cerimonie olimpiche.',
      liked: false
    },
    {
      id: 1,
      text: "L'Unipol Forum di Assago è già pronto e non richiede interventi strutturali rilevanti.",
      liked: false
    },
    {
      id: 2,
      text: 'Rho Fiera viene adattata come hub logistico e media center per l\'intera manifestazione.',
      liked: false
    },
    {
      id: 3,
      text: 'Circa il 90% delle sedi di gara rientra in una logica di riuso o utilizzo di strutture temporanee.',
      liked: false
    }
  ]);

  function toggleLike(id: number) {
    cards = cards.map((c) => (c.id === id ? { ...c, liked: !c.liked } : c));
  }

  /* ── Visibilità label sezione in header ─────────────────────────────────── */
  let showSectionLabel = $state(false);

  /* ── Refs DOM ───────────────────────────────────────────────────────────── */
  let heroSectionEl  = $state<HTMLElement | null>(null);
  let titleEl        = $state<HTMLElement | null>(null);
  let frostOverlayEl = $state<HTMLElement | null>(null);
  let phraseEl       = $state<HTMLElement | null>(null);
  let contentRowEl   = $state<HTMLElement | null>(null);

  /* ── Testo blocco sinistro ──────────────────────────────────────────────── */
  const textBlockBody =
    `Milano-Cortina 2026 è stata progettata intorno a un uso esteso di sedi già esistenti o temporanee, al fine di non lasciare “cattedrali nel deserto”, come spesso accade. Secondo la comunicazione ufficiale, circa il 90% delle sedi di gara rientra in questa logica di riuso. Alcuni degli esempi sono lo stadio di San Siro, l’Unipol Forum, e Rho Fiera.`;

  /* ── GSAP context per cleanup ───────────────────────────────────────────── */
  let ctx: ReturnType<typeof gsap.context> | null = null;

  onMount(() => {
    if (!heroSectionEl || !titleEl || !phraseEl || !frostOverlayEl) return;

    ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: heroSectionEl,
          start: 'top top',
          end: '+=280%',
          pin: true,
          scrub: 1.2,
          onEnter: () => {
            showSectionLabel = true;
          }
        }
      });

      /* 0 → 0.25 — il frost svanisce mentre inizia lo stretch */
      tl.to(
        frostOverlayEl,
        {
          opacity: 0,
          duration: 0.25,
          ease: 'power1.in'
        },
        0
      );

      /* 0 → 1 — titolo si estende verso l'alto */
      tl.to(
        titleEl,
        {
          scaleY: 3.2,
          fontVariationSettings: '"wght" 900',
          ease: 'none',
          duration: 1
        },
        0
      );

      /* 0.25 → 0.65 — fade-in frase */
      tl.fromTo(
        phraseEl,
        { opacity: 0, y: 32 },
        {
          opacity: 1,
          y: 0,
          ease: 'power2.out',
          duration: 0.4
        },
        0.25
      );

      /* 0.72 → 1 — fade-out frase */
      tl.to(
        phraseEl,
        {
          opacity: 0,
          y: -24,
          ease: 'power2.in',
          duration: 0.28
        },
        0.72
      );
    });
  });

  onDestroy(() => {
    ctx?.revert();
  });

  /* ── Callback fine animazione 3D: mostra testo + card ───────────────────── */
  function handleIntroComplete() {
    if (!contentRowEl) return;
    gsap.fromTo(
      contentRowEl,
      { opacity: 0, y: 40 },
      {
        opacity: 1,
        y: 0,
        duration: 0.7,
        ease: 'power2.out'
      }
    );
  }
</script>

<svelte:head>
  <title>Infrastrutture — Prototipo Scrollytelling</title>
</svelte:head>

<!-- ── Header fisso ─────────────────────────────────────────────────────── -->
<header class="site-header">
  <span class="header-brand">QUANTE FACCE HA UNA MEDAGLIA?</span>

  <span class="header-section" class:visible={showSectionLabel}>INFRASTRUTTURE</span>

  <button class="hamburger" aria-label="Menu" tabindex="-1">
    <span></span>
    <span></span>
    <span></span>
  </button>
</header>

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- SEZIONE HERO + PINNED                                                   -->
<!-- Una sola sezione pinnata:                                               -->
<!--   1a) Frost reveal visibile, titolo in basso                            -->
<!--   1b) Scroll → frost svanisce, titolo si estende verso l'alto           -->
<!--   1c) Frase fa fade-in poi fade-out                                     -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->
<section class="hero-section" bind:this={heroSectionEl}>

  <!-- Sfondo montagna sempre presente sotto il frost -->
  <div class="bg-mountain" aria-hidden="true">
    <img src="/images/snow-bg.jpg" alt="" />
  </div>

  <!-- Frost reveal — si dissolve all'inizio dello scroll -->
  <div class="frost-overlay" bind:this={frostOverlayEl}>
    <HeroFrost src="/images/snow-bg.jpg" refreezeMs={3500} />
  </div>

  <!-- Titolone — transform-origin bottom center per stretch verso l'alto -->
  <h1 class="hero-title" bind:this={titleEl}>INFRASTRUTTURE</h1>

  <!-- Frase lunga — fade-in/out scrubbed -->
  <div class="phrase-box" bind:this={phraseEl} aria-hidden="true">
    <p class="phrase-text">
      Le Olimpiadi prendono forma attraverso cantieri, impianti e collegamenti
      tra territori. Queste opere possono essere lette come investimenti utili
      o come interventi costosi, il cui valore dipende da cosa resterà dopo
      l'evento.
    </p>
  </div>

</section>

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- SEZIONE 3D — automatica, parte all'ingresso in view                     -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->
<section class="scene-section">

  <!-- Sfondo montagna a bassa opacità -->
  <div class="bg-mountain" aria-hidden="true">
    <img src="/images/snow-bg.jpg" alt="" />
  </div>

  <!-- Canvas Three.js: prende quasi tutto lo schermo -->
  <div class="scene-canvas-wrapper">
    <Scene3D onIntroComplete={handleIntroComplete} />
  </div>

  <!-- Testo + card: opacity 0 al mount, GSAP anima a 1 dopo intro 3D -->
  <div class="content-row" bind:this={contentRowEl} style="opacity: 0;">
    <TextBlock
      counter="1 / 3"
      title="Riuso delle sedi"
      body={textBlockBody}
      source="FONTE"
    />

    <CardStack {cards} onToggleLike={toggleLike} />
  </div>

</section>

<style>
  /* ── Reset + base ───────────────────────────────────────────────────────── */
  :global(*, *::before, *::after) {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  :global(body) {
    background: var(--color-bg, #F4F4F2);
    color: var(--color-text-primary, #000000);
    overflow-x: hidden;
  }

  /* ── Header ─────────────────────────────────────────────────────────────── */
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
    background: rgba(244, 244, 242, 0.88);
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
    color: var(--color-text-primary, #000000);
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
    background: var(--color-text-primary, #000000);
    border-radius: 2px;
  }

  /* ── Hero section (frost + pinned) ─────────────────────────────────────── */
  .hero-section {
    position: relative;
    width: 100%;
    height: 100vh;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    padding-bottom: clamp(32px, 4.8vw, 64px);
    overflow: hidden;
  }

  .bg-mountain {
    position: absolute;
    inset: 0;
    z-index: 0;
  }

  .bg-mountain img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    opacity: 0.1;
    filter: grayscale(0.3) brightness(1.1);
    pointer-events: none;
    user-select: none;
  }

  .frost-overlay {
    position: absolute;
    inset: 0;
    z-index: 1;
  }

  /* Il componente HeroFrost posiziona gli elementi in absolute inset: 0 al suo interno */
  .frost-overlay :global(.hero-frost) {
    position: absolute;
    inset: 0;
  }

  .hero-title {
    position: relative;
    z-index: 2;
    font-family: 'PP Formula Condensed', sans-serif;
    font-size: clamp(80px, 19.3vw, 260px);
    font-weight: 800;
    font-variation-settings: 'wght' 800;
    letter-spacing: -0.02em;
    text-transform: uppercase;
    color: var(--color-text-primary, #000000);
    line-height: 0.88;
    text-align: center;
    transform-origin: bottom center;
    will-change: transform, font-variation-settings;
    /* evita che il titolo riceva eventi mouse: il frost deve rispondere al pointer */
    pointer-events: none;
    user-select: none;
  }

  .phrase-box {
    position: absolute;
    z-index: 3;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: clamp(320px, 74.9vw, 1010px);
    max-width: 90vw;
    /* opacity gestita da GSAP */
    opacity: 0;
    pointer-events: none;
  }

  .phrase-text {
    font-family: 'Supreme Variable', sans-serif;
    font-size: clamp(22px, 5.04vw, 68px);
    font-weight: 700;
    line-height: 1.22;
    color: var(--color-text-primary, #000000);
    text-align: center;
  }

  /* ── Sezione 3D ─────────────────────────────────────────────────────────── */
  .scene-section {
    position: relative;
    width: 100%;
    min-height: 110vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding-top: 52px; /* header height */
    overflow: hidden;
  }

  .scene-canvas-wrapper {
    position: relative;
    z-index: 1;
    width: 100%;
    height: clamp(380px, 60vh, 720px);
  }

  .content-row {
    position: relative;
    z-index: 2;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    gap: clamp(32px, 5.9vw, 80px);
    padding: clamp(24px, 3.6vw, 56px) clamp(16px, 4vw, 80px) clamp(48px, 6vw, 96px);
    width: 100%;
    max-width: clamp(700px, 90vw, 1349px);
    margin: 0 auto;
    will-change: opacity, transform;
  }
</style>
