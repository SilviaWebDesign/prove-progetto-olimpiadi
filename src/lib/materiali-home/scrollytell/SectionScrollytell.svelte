<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { fade } from 'svelte/transition';
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';
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
  import { visitedSections, allSectionsCompleted } from '$lib/stores/visitedSections';
  import { overlayVisible } from '$lib/stores/pageTransition';

  interface CardData { id: number; body: string; liked: boolean; }
  interface TopicData { counter: string; title: string; body: string; source?: string; comments: string[]; }

  interface ScrollytellConfig {
    pageTitle: string;
    heroTitle: string;
    heroTitleStyle?: 'svg' | 'section';
    heroAriaLabel: string;
    frostSrc: string;
    bgSrc: string;
    phrase: string;
    modelSrc: string;
    resultPaths: string[];
    sectionId: 'infrastructure' | 'sport' | 'sustainability';
    topics: TopicData[];
  }

  interface Props { config: ScrollytellConfig; }
  let { config }: Props = $props();

  const topics    = $derived(config.topics);
  const lastTopic = $derived(config.topics.length - 1);

  let currentTopic    = $state(0);
  let topicLikes      = $state<boolean[][]>(config.topics.map(t => t.comments.map(() => false)));
  let isTransitioning = $state(false);

  type PagePhase = 'intro' | 'topics' | 'feedback';
  let phase = $state<PagePhase>('intro');

  const cards: CardData[] = $derived(
    topics[currentTopic].comments.map((body, i) => ({
      id: i,
      body,
      liked: topicLikes[currentTopic][i],
    }))
  );

  function toggleLike(id: number) {
    topicLikes = topicLikes.map((tl, ti) =>
      ti === currentTopic ? tl.map((l, li) => li === id ? !l : l) : tl
    );
    scene3d?.pulse();
  }

  const anyLiked = $derived(topicLikes[currentTopic].some(l => l));

  const ctaLabel = $derived(
    currentTopic === lastTopic && anyLiked
      ? 'Scopri il tuo risultato'
      : 'Continua'
  );

  const nextSectionRoute: Record<string, string> = {
    sustainability: '/sezioni/sport',
    sport: '/sezioni/infrastrutture',
    infrastructure: '/sezioni/sostenibilita',
  };

  async function goToNextSection() {
    const route = nextSectionRoute[config.sectionId];
    if (!route || isTransitioning) return;
    isTransitioning = true;
    overlayVisible.set(true);
    await new Promise<void>(r => setTimeout(r, 400));
    goto(route);
  }

  async function navigateToResults() {
    if (isTransitioning) return;
    isTransitioning = true;
    overlayVisible.set(true);
    await new Promise<void>(r => setTimeout(r, 400));
    goto('/risultati');
  }

  function computeResult(): string {
    let totalPositive = 0, totalNegative = 0;
    for (const tl of topicLikes) {
      totalPositive += tl.slice(0, 3).filter(Boolean).length;
      totalNegative += tl.slice(3, 6).filter(Boolean).length;
    }
    const [pos, neg, piuPos, piuNeg, neutro] = config.resultPaths;
    if (totalPositive > 0 && totalNegative === 0) return pos;
    if (totalNegative > 0 && totalPositive === 0) return neg;
    if (totalPositive > totalNegative)            return piuPos;
    if (totalNegative > totalPositive)            return piuNeg;
    return neutro;
  }

  async function exitFeedbackPhase() {
    if (phase !== 'feedback' || isTransitioning) return;
    isTransitioning = true;

    const OUT = 0.35;
    gsap.to('.feedback-text',       { opacity: 0, duration: OUT });
    gsap.to('.feedback-bottom-cta', { opacity: 0, duration: OUT });
    await new Promise<void>(r => setTimeout(r, OUT * 1000));

    gsap.to('.layer--bg', { filter: 'none', duration: 0.6, ease: 'power2.inOut' });
    scene3d?.returnToParticles();
    phase = 'topics';
    await tick();

    gsap.fromTo('.stage__text',  { opacity: 0, y:  8 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.inOut' });
    gsap.fromTo('.stage__right', { opacity: 0, x: -8 }, { opacity: 1, x: 0, duration: 0.5, ease: 'power3.inOut', delay: 0.04 });
    gsap.to('.stage__cta', { opacity: 1, duration: 0.3, delay: 0.1 });
    isTransitioning = false;
  }

  async function enterFeedbackPhase() {
    if (phase !== 'topics' || isTransitioning || !anyLiked) return;
    isTransitioning = true;

    const OUT = 0.50;
    const outTl = gsap.timeline();
    outTl.to('.stage__text',  { opacity: 0, y: -8, duration: OUT, ease: 'power3.inOut' }, 0);
    outTl.to('.stage__right', { opacity: 0, x:  8, duration: OUT, ease: 'power3.inOut' }, 0);
    outTl.to('.stage__cta',   { opacity: 0, duration: OUT * 0.6, ease: 'power2.inOut' }, 0);

    await new Promise<void>(r => setTimeout(r, OUT * 1000));
    outTl.kill();

    const resultModelPath = computeResult();
    visitedSections.markCompleted(config.sectionId, resultModelPath);
    gsap.to('.layer--bg', { filter: 'blur(12px)', duration: 0.8, ease: 'power2.inOut' });

    scene3d?.morphToResult(resultModelPath, () => {
      phase = 'feedback';
      isTransitioning = false;
      tick().then(() => {
        gsap.fromTo('.feedback-text',       { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'power2.out' });
        gsap.fromTo('.feedback-bottom-cta', { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'power2.out', delay: 0.2 });
      });
    });
  }

  async function goNext() {
    if (!anyLiked || isTransitioning) return;
    if (currentTopic === lastTopic) { enterFeedbackPhase(); return; }

    scene3d?.resetPulse();
    isTransitioning = true;
    const OUT  = 0.50;
    const CROSS = OUT * 0.88;

    const outTl = gsap.timeline();
    outTl.to('.stage__text',  { opacity: 0, y: -8, duration: OUT, ease: 'power3.inOut' }, 0);
    outTl.to('.stage__right', { opacity: 0, x:  8, duration: OUT, ease: 'power3.inOut' }, 0);

    await new Promise<void>(r => setTimeout(r, CROSS * 1000));
    outTl.kill();

    currentTopic++;
    await tick();

    gsap.set('.stage__text',  { y:  8, opacity: 0 });
    gsap.set('.stage__right', { x: -8, opacity: 0 });

    gsap.timeline({ onComplete: () => { isTransitioning = false; } })
      .to('.stage__text',  { opacity: 1, y: 0, duration: 0.60, ease: 'power3.inOut' }, 0)
      .to('.stage__right', { opacity: 1, x: 0, duration: 0.60, ease: 'power3.inOut' }, 0.04);
  }

  async function goPrev() {
    if (isTransitioning || currentTopic === 0) return;

    scene3d?.resetPulse();
    isTransitioning = true;
    const OUT  = 0.50;
    const CROSS = OUT * 0.88;

    const outTl = gsap.timeline();
    outTl.to('.stage__text',  { opacity: 0, y:  8, duration: OUT, ease: 'power3.inOut' }, 0);
    outTl.to('.stage__right', { opacity: 0, x: -8, duration: OUT, ease: 'power3.inOut' }, 0);

    await new Promise<void>(r => setTimeout(r, CROSS * 1000));
    outTl.kill();

    currentTopic--;
    await tick();

    gsap.set('.stage__text',  { y: -8, opacity: 0 });
    gsap.set('.stage__right', { x:  8, opacity: 0 });

    gsap.timeline({ onComplete: () => { isTransitioning = false; } })
      .to('.stage__text',  { opacity: 1, y: 0, duration: 0.60, ease: 'power3.inOut' }, 0)
      .to('.stage__right', { opacity: 1, x: 0, duration: 0.60, ease: 'power3.inOut' }, 0.04);
  }

  // ── DOM refs ──────────────────────────────────────────────────────────────
  let sceneEl = $state<HTMLElement | null>(null);
  let scene3d = $state<Scene3DApi | undefined>(undefined);

  // ── Model loaded signal ───────────────────────────────────────────────────
  let resolveModelLoaded: () => void = () => {};
  const modelLoadedPromise = new Promise<void>(resolve => { resolveModelLoaded = resolve; });

  // ── Topics-mode scroll interception ──────────────────────────────────────
  let topicsMode = false;
  let lenisRef: { stop: () => void; start: () => void } | null = null;
  let feedbackScrollAccum = 0;
  let feedbackScrollResetTimer: ReturnType<typeof setTimeout> | null = null;
  const FEEDBACK_SCROLL_THRESHOLD = 450;
  const FEEDBACK_SCROLL_RESET_MS  = 700;

  function enterTopicsMode() {
    if (topicsMode) return;
    topicsMode = true;
    phase = 'topics';
    lenisRef?.stop();
    window.addEventListener('wheel', onTopicsWheel, { passive: false, capture: true });
  }

  function exitTopicsMode() {
    if (!topicsMode) return;
    topicsMode = false;
    window.removeEventListener('wheel', onTopicsWheel, { capture: true } as EventListenerOptions);
    lenisRef?.start();
  }

  function clearFeedbackScroll() {
    feedbackScrollAccum = 0;
    if (feedbackScrollResetTimer) { clearTimeout(feedbackScrollResetTimer); feedbackScrollResetTimer = null; }
  }

  function onTopicsWheel(e: WheelEvent) {
    if (phase === 'feedback') {
      e.preventDefault();
      if (e.deltaY < 0 && !isTransitioning) {
        clearFeedbackScroll();
        exitFeedbackPhase();
      }
      if (e.deltaY > 0 && !isTransitioning) {
        feedbackScrollAccum += e.deltaY;
        if (feedbackScrollResetTimer) clearTimeout(feedbackScrollResetTimer);
        feedbackScrollResetTimer = setTimeout(() => { feedbackScrollAccum = 0; feedbackScrollResetTimer = null; }, FEEDBACK_SCROLL_RESET_MS);
        if (feedbackScrollAccum >= FEEDBACK_SCROLL_THRESHOLD) {
          clearFeedbackScroll();
          if ($allSectionsCompleted) navigateToResults();
          else goToNextSection();
        }
      }
      return;
    }

    const goingDown = e.deltaY > 0;

    if (!goingDown && currentTopic === 0) {
      exitTopicsMode();
      return;
    }

    e.preventDefault();
    if (isTransitioning) return;

    if (goingDown) {
      if (currentTopic === lastTopic) {
        if (anyLiked) enterFeedbackPhase();
      } else if (anyLiked) {
        goNext();
      }
    } else {
      goPrev();
    }
  }

  // ── Setup ────────────────────────────────────────────────────────────────
  onMount(() => {
    if (!browser || !sceneEl) return;

    if ($overlayVisible) setTimeout(() => overlayVisible.set(false), 60);

    history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);

    gsap.registerPlugin(ScrollTrigger);

    const lenis = new Lenis({ smoothWheel: true, lerp: 0.08 });
    lenis.scrollTo(0, { immediate: true });
    lenisRef = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    const lenisRaf = (t: number) => lenis.raf(t * 1000);
    gsap.ticker.add(lenisRaf);
    gsap.ticker.lagSmoothing(0);

    const titleEl = sceneEl.querySelector<HTMLElement>('.hero-title')!;
    const textEl  = titleEl.querySelector<SVGTextElement>('.hero-title__text');

    gsap.set(titleEl,         { scaleY: 1, yPercent: 0, transformOrigin: 'bottom center' });
    gsap.set('.phrase',       { y: 30, autoAlpha: 0 });
    gsap.set('.stage__text',  { x: -30 });
    gsap.set('.stage__right', { x:  30 });

    const ctx = gsap.context(() => {

      const heroTl = gsap.timeline({
        scrollTrigger: {
          trigger: sceneEl,
          start:   'top top',
          end:     () => `+=${window.innerHeight * 1.5}`,
          scrub:   1.2,
        },
      });

      heroTl.fromTo(titleEl,
        { scaleY: 1, yPercent: 0, opacity: 1, immediateRender: false },
        { scaleY: 2.2, yPercent: -120, opacity: 0, ease: 'power3.inOut', duration: 0.25 },
        0
      );
      heroTl.fromTo('.layer--frost',
        { autoAlpha: 1 },
        { autoAlpha: 0, ease: 'power2.inOut', duration: 0.30 },
        0
      );
      heroTl.fromTo('.phrase',
        { autoAlpha: 0, y: 30 },
        { autoAlpha: 1, y: 0, ease: 'power2.out', duration: 0.20 },
        0.20
      );
      heroTl.to('.phrase', { autoAlpha: 0, y: -20, ease: 'power2.in', duration: 0.15 }, 0.62);

      const proxy = { rot: 0, scale: 1, appear: 0 };

      const threeTl = gsap.timeline({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        scrollTrigger: {
          trigger:           sceneEl,
          start:             () => `top+=${window.innerHeight * 1.85}`,
          end:               'bottom bottom',
          scrub:             1.2,
          onUpdate:          (self: { progress: number }) => { if (self.progress >= 0.999) { scene3d?.settle(); enterTopicsMode(); } },
          onReverseComplete: () => { scene3d?.unsettle(); exitTopicsMode(); },
        } as any,
      });

      threeTl.fromTo(proxy, { appear: 0 }, {
        appear: 1, duration: 0.12,
        onUpdate: () => scene3d?.setOpacity(proxy.appear),
      }, 0);

      threeTl.to(proxy, {
        rot: Math.PI * 2, ease: 'none', duration: 0.46,
        onUpdate: () => scene3d?.setRotationY(proxy.rot),
      }, 0.06);

      threeTl.to(proxy, {
        scale: 0.56, ease: 'power2.inOut', duration: 0.28,
        onUpdate: () => scene3d?.setScale(proxy.scale),
      }, 0.46);

      threeTl.fromTo('.stage__text',
        { opacity: 0, x: -30 },
        { opacity: 1, x: 0, ease: 'power2.out', duration: 0.12 },
        0.74
      );

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

    // ── Fonts ready → viewBox (SVG) + titolo visibile ─────────────────────
    document.fonts.ready.then(() => {
      if (titleEl instanceof SVGSVGElement && textEl) {
        const bb   = textEl.getBBox();
        const svgW = titleEl.getBoundingClientRect().width || window.innerWidth;
        const capH = -bb.y;
        const svgH = svgW * capH / bb.width;
        titleEl.setAttribute('height', String(Math.ceil(svgH)));
        titleEl.setAttribute('viewBox', `${bb.x} ${bb.y} ${bb.width} ${capH}`);
      }
      if (window.scrollY < window.innerHeight * 0.15) {
        gsap.to(titleEl, { opacity: 1, duration: 0.12, ease: 'none' });
      }
    });

    // ── Tutte le risorse → refresh ScrollTrigger + preload result models ──
    const bgImg = new Image();
    bgImg.src = config.bgSrc;
    const bgLoaded = new Promise<void>(resolve => {
      bgImg.onload = bgImg.onerror = () => resolve();
    });
    const windowLoaded = new Promise<void>(resolve => {
      if (document.readyState === 'complete') resolve();
      else window.addEventListener('load', () => resolve(), { once: true });
    });
    Promise.all([bgLoaded, windowLoaded, modelLoadedPromise]).then(() => {
      ScrollTrigger.refresh();
      requestAnimationFrame(() => requestAnimationFrame(() => ScrollTrigger.refresh()));
      if ('requestIdleCallback' in window) {
        (window as Window & { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => void })
          .requestIdleCallback(() => scene3d?.preloadResultModels(), { timeout: 1000 });
      } else {
        setTimeout(() => scene3d?.preloadResultModels(), 2000);
      }
    });

    return () => {
      exitTopicsMode();
      lenisRef = null;
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

    <!-- Layer frost -->
    <div class="layer layer--frost">
      <FrostCanvas src={config.frostSrc} />
    </div>

    <!-- Layer bg -->
    <div
      class="layer layer--bg"
      style="background-image: url('{config.bgSrc}')"
      aria-hidden="true"
    ></div>

    <!-- Titolone -->
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

    <!-- Frase -->
    <div class="phrase-container">
      <p class="phrase">{config.phrase}</p>
    </div>

    <!-- Layer 3D: canvas full-viewport, dietro la griglia -->
    <Scene3D
      bind:api={scene3d}
      modelSrc={config.modelSrc}
      resultPaths={config.resultPaths}
      onModelLoaded={() => resolveModelLoaded()}
      orbitEnabled={phase === 'feedback'}
    />

    <!-- Stage: testo a sx + card a dx -->
    <div class="stage">

      <div class="stage__text">
        <TextBlock
          counter={topics[currentTopic].counter}
          title={topics[currentTopic].title}
          body={topics[currentTopic].body}
          source={topics[currentTopic].source ?? ''}
        />
      </div>

      <!-- colonna centrale vuota: spazio visivo per il modello 3D -->
      <div aria-hidden="true"></div>

      <!-- Colonna destra: heading + card -->
      <div class="stage__right" class:no-pointer={phase === 'feedback'}>
        <p class="stage__right-heading">Metti like alle opinioni con cui sei d'accordo</p>
        <CardStack {cards} sectionId={config.sectionId} onToggleLike={toggleLike} />
      </div>

    </div>

    <!-- CTA in basso al centro -->
    <div class="stage__cta">
      <div
        class="stage__cta-content"
        class:active={anyLiked && !isTransitioning}
        role="button"
        tabindex={anyLiked && !isTransitioning ? 0 : -1}
        aria-disabled={!anyLiked || isTransitioning}
        onclick={() => { if (anyLiked && !isTransitioning) goNext(); }}
        onkeydown={(e) => { if (anyLiked && !isTransitioning && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); goNext(); } }}
      >
        {#key ctaLabel}
          <span class="cta-label"
            in:fade={{ duration: 150, delay: 150 }}
            out:fade={{ duration: 150 }}>
            {ctaLabel}
          </span>
        {/key}
        <svg class="cta-chevron" viewBox="58 37 41 20" aria-hidden="true" fill="none">
          <path d="M60 40L78.5 54L95 40" stroke="#161A1F" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
    </div>

    <!-- Overlay fase feedback -->
    {#if phase === 'feedback'}
      <p class="feedback-text" style="opacity: 0">
        Questa è la realtà,<br>plasmata dalla tua opinione
      </p>
      <div
        class="feedback-bottom-cta"
        style="opacity: 0"
        role="button"
        tabindex="0"
        onclick={() => { $allSectionsCompleted ? navigateToResults() : goToNextSection(); }}
        onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $allSectionsCompleted ? navigateToResults() : goToNextSection(); } }}
      >
        <span class="cta-label">
          {$allSectionsCompleted ? 'Scopri i tuoi risultati' : 'Passa al prossimo argomento'}
        </span>
        <svg class="cta-chevron" viewBox="58 37 41 20" aria-hidden="true" fill="none">
          <path d="M60 40L78.5 54L95 40" stroke="#161A1F" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
    {/if}

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
    overflow: hidden;
  }

  .layer--bg {
    z-index: 0;
    background-size: cover;
    background-position: center;
    opacity: 0.28;
    pointer-events: none;
  }

  /* ── Titolone SVG ──────────────────────────────────────────────────────── */
  .hero-title {
    display: block;
    position: absolute;
    z-index: 3;
    left: 0;
    right: 0;
    bottom: 0;
    width: 100%;
    line-height: 0;
    margin: 0;
    padding: 0;
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
    fill: var(--color-text-primary, #000000);
  }

  /* ── Titolone section-style ───────────────────────────────────────────── */
  .hero-title--section {
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    align-items: center;
    inset: 0;
    height: 100%;
    overflow: hidden;
  }

  /* ── Frase ───────────────────────────────────────────────────────────── */
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

  /* ── Stage ──────────────────────────────────────────────────────────── */
  .stage {
    position: absolute;
    inset: 0;
    z-index: 1;
    display: grid;
    grid-template-columns: 1fr 1.2fr 1fr;
    grid-template-rows: 1fr;
    align-items: center;
    padding: 0 6vw;
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
    pointer-events: auto;
  }

  .stage__right.no-pointer {
    pointer-events: none;
  }

  .stage__right-heading {
    font-family: 'Supreme Variable', sans-serif;
    font-weight: 700;
    font-size: 16px;
    line-height: 1.25;
    color: #161A1F;
    white-space: nowrap;
  }

  /* ── CTA ─────────────────────────────────────────────────────────────── */
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

  /* ── Overlay feedback ────────────────────────────────────────────────── */
  .feedback-text {
    position: absolute;
    bottom: 110px;
    left: 0;
    right: 0;
    z-index: 10;
    text-align: center;
    font-family: 'Supreme Variable', sans-serif;
    font-weight: 400;
    font-size: 28px;
    color: #16181D;
    pointer-events: none;
    padding: 0 clamp(16px, 4vw, 48px);
  }

  .feedback-bottom-cta {
    position: absolute;
    bottom: 28px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 10;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    pointer-events: auto;
    white-space: nowrap;
  }

  .feedback-bottom-cta .cta-chevron {
    animation: chevron-bounce 1.4s ease-in-out infinite;
  }
</style>
