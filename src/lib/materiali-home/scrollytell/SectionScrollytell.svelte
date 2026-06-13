<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import gsap from 'gsap';
  import { ScrollTrigger } from 'gsap/ScrollTrigger';
  import Lenis from 'lenis';

  import FrostCanvas from '$lib/components/FrostCanvas.svelte';
  import SectionHeroTitle from '$lib/materiali-home/SectionHeroTitle.svelte';
  import TextBlock from './TextBlock.svelte';
  import CardStack from './CardStack.svelte';
  import Scene3D from './Scene3D.svelte';
  import type { Scene3DApi } from './Scene3D.svelte';

  import './tokens.css';

  interface CardData {
    id: number;
    body: string;
    liked: boolean;
  }

  interface ScrollytellConfig {
    pageTitle: string;
    heroTitle: string;
    heroTitleStyle?: 'svg' | 'section';
    heroAriaLabel: string;
    frostSrc: string;
    bgSrc: string;
    phrase: string;
    topicCounter: string;
    factTitle: string;
    factBody: string;
    factSource: string;
    modelSrc: string;
    sectionId: 'infrastructure' | 'sport' | 'sustainability';
    cards: CardData[];
  }

  interface Props {
    config: ScrollytellConfig;
  }

  let { config }: Props = $props();

  let cards = $state<CardData[]>(config.cards.map((c) => ({ ...c })));

  function toggleLike(id: number) {
    cards = cards.map((c) => (c.id === id ? { ...c, liked: !c.liked } : c));
  }

  const anyLiked = $derived(cards.some((c) => c.liked));

  function goToNextTopic() {
    console.log('goToNextTopic');
  }

  let sceneEl = $state<HTMLElement | null>(null);
  let scene3d = $state<Scene3DApi | undefined>(undefined);

  onMount(() => {
    if (!browser || !sceneEl) return;

    history.scrollRestoration = 'manual';
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });

    gsap.registerPlugin(ScrollTrigger);

    const lenis = new Lenis({ smoothWheel: true, lerp: 0.08 });
    lenis.on('scroll', ScrollTrigger.update);
    const lenisRaf = (t: number) => lenis.raf(t * 1000);
    gsap.ticker.add(lenisRaf);
    gsap.ticker.lagSmoothing(0);

    const titleEl = sceneEl.querySelector<HTMLElement>('.hero-title')!;
    const textEl = titleEl.querySelector<SVGTextElement>('.hero-title__text');

    gsap.set(titleEl, { opacity: 0, scaleY: 1, yPercent: 0, transformOrigin: 'bottom center' });
    gsap.set('.layer--frost', { autoAlpha: 1 });
    gsap.set('.phrase', { opacity: 0, y: 30 });
    gsap.set('.stage__text', { opacity: 0, x: -30 });
    gsap.set('.stage__right', { opacity: 0, x: 30 });
    gsap.set('.stage__cta', { opacity: 0 });

    if (window.scrollY < window.innerHeight * 0.15) {
      gsap.to(titleEl, { opacity: 1, duration: 0.4, ease: 'power2.out', delay: 0.1 });
    }

    const ctx = gsap.context(() => {
      const heroTl = gsap.timeline({
        scrollTrigger: {
          trigger: sceneEl,
          start: 'top top',
          end: () => `+=${window.innerHeight * 1.5}`,
          scrub: 1.2
        }
      });

      heroTl.fromTo(
        titleEl,
        { scaleY: 1, yPercent: 0, opacity: 1, immediateRender: false },
        { scaleY: 2.2, yPercent: -120, opacity: 0, ease: 'power3.inOut', duration: 0.25 },
        0
      );
      heroTl.to('.layer--frost', { autoAlpha: 0, ease: 'power2.inOut', duration: 0.3 }, 0);
      heroTl.fromTo(
        '.phrase',
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, ease: 'power2.out', duration: 0.2 },
        0.2
      );
      heroTl.to('.phrase', { opacity: 0, y: -20, ease: 'power2.in', duration: 0.15 }, 0.62);

      const proxy = { rot: 0, scale: 1, appear: 0 };

      const threeTl = gsap.timeline({
        scrollTrigger: {
          trigger: sceneEl,
          start: () => `top+=${window.innerHeight * 1.85}`,
          end: 'bottom bottom',
          scrub: 1.2
        }
      });

      threeTl.fromTo(
        proxy,
        { appear: 0 },
        {
          appear: 1,
          duration: 0.12,
          onUpdate: () => scene3d?.setOpacity(proxy.appear)
        },
        0
      );

      threeTl.to(
        proxy,
        {
          rot: Math.PI * 2,
          ease: 'none',
          duration: 0.46,
          onUpdate: () => scene3d?.setRotationY(proxy.rot)
        },
        0.06
      );

      threeTl.to(
        proxy,
        {
          scale: 0.56,
          ease: 'power2.inOut',
          duration: 0.28,
          onUpdate: () => scene3d?.setScale(proxy.scale)
        },
        0.46
      );

      threeTl.fromTo(
        '.stage__text',
        { opacity: 0, x: -30 },
        { opacity: 1, x: 0, ease: 'power2.out', duration: 0.12 },
        0.74
      );

      threeTl.fromTo(
        '.stage__right',
        { opacity: 0, x: 30 },
        { opacity: 1, x: 0, ease: 'power2.out', duration: 0.12 },
        0.77
      );

      threeTl.fromTo(
        '.stage__cta',
        { opacity: 0 },
        { opacity: 1, ease: 'power2.out', duration: 0.12 },
        0.77
      );
    }, sceneEl);

    const bgImg = new Image();
    bgImg.src = config.bgSrc;
    const bgLoaded = new Promise<void>((resolve) => {
      bgImg.onload = bgImg.onerror = () => resolve();
    });

    Promise.all([document.fonts.ready, bgLoaded]).then(() => {
      if (textEl && titleEl instanceof SVGSVGElement) {
        const bb = textEl.getBBox();
        titleEl.setAttribute('viewBox', `${bb.x} ${bb.y} ${bb.width} ${bb.height}`);
      }
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
  <title>{config.pageTitle}</title>
</svelte:head>

<section class="scene" bind:this={sceneEl}>
  <div class="scene__viewport">
    <div class="layer layer--frost">
      <FrostCanvas src={config.frostSrc} />
    </div>

    <div
      class="layer layer--bg"
      style="background-image: url('{config.bgSrc}')"
      aria-hidden="true"
    ></div>

    {#if config.heroTitleStyle === 'section'}
      <div class="hero-title hero-title--section" role="img" aria-label={config.heroAriaLabel}>
        <SectionHeroTitle title={config.heroTitle} />
      </div>
    {:else}
      <svg
        class="hero-title"
        width="100%"
        preserveAspectRatio="xMidYMax meet"
        role="img"
        aria-label={config.heroAriaLabel}
        focusable="false"
      >
        <text class="hero-title__text" x="0" y="0">{config.heroTitle}</text>
      </svg>
    {/if}

    <div class="phrase-container">
      <p class="phrase">{config.phrase}</p>
    </div>

    <div class="stage">
      <div class="stage__text">
        <TextBlock
          counter={config.topicCounter}
          title={config.factTitle}
          body={config.factBody}
          source={config.factSource}
        />
      </div>

      <div class="stage__canvas">
        <Scene3D bind:api={scene3d} modelSrc={config.modelSrc} />
      </div>

      <div class="stage__right">
        <p class="stage__right-heading">Metti like alle opinioni con cui sei d'accordo</p>
        <CardStack {cards} sectionId={config.sectionId} onToggleLike={toggleLike} />
      </div>
    </div>

    <div class="stage__cta">
      <div
        class="stage__cta-content"
        class:active={anyLiked}
        role="button"
        tabindex={anyLiked ? 0 : -1}
        aria-disabled={!anyLiked}
        onclick={() => {
          if (anyLiked) goToNextTopic();
        }}
        onkeydown={(e) => {
          if (anyLiked && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            goToNextTopic();
          }
        }}
      >
        <span class="cta-label">Clicca per continuare</span>
        <svg class="cta-chevron" viewBox="58 37 41 20" aria-hidden="true" fill="none">
          <path
            d="M60 40L78.5 54L95 40"
            stroke="#161A1F"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </div>
    </div>
  </div>
</section>

<style>
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

  :global(*, *::before, *::after) {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
  :global(body) {
    background: var(--color-bg, #ffffff);
    color: var(--color-text-primary, #000000);
    overflow-x: hidden;
  }

  .scene {
    height: 520vh;
    position: relative;
  }

  .scene__viewport {
    position: sticky;
    top: 0;
    height: 100vh;
    overflow: hidden;
    background: #ffffff;
  }

  .layer {
    position: absolute;
    inset: 0;
  }

  .layer--frost {
    z-index: 2;
  }

  .layer--frost :global(.frost-wrap) {
    inset: 0;
  }

  .layer--bg {
    z-index: 1;
    background-size: cover;
    background-position: center center;
    opacity: 0.28;
  }

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

  .hero-title--section {
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    align-items: center;
    inset: 0;
    height: 100%;
    overflow: hidden;
  }

  .hero-title__text {
    font-family: 'PP Formula Condensed', sans-serif;
    font-weight: 700;
    font-variation-settings: 'wght' 700;
    fill: var(--color-text-primary, #000000);
  }

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
    color: var(--color-text-primary, #000000);
    opacity: 0;
    pointer-events: none;
  }

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
    color: #000000;
    max-width: 356px;
  }

  .stage__cta {
    position: absolute;
    bottom: 28px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 10;
    pointer-events: none;
    opacity: 0;
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
    color: #000000;
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
    0%,
    100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(5px);
    }
  }
</style>
