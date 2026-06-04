<script>
  import { onMount } from 'svelte';
  import SectionMountainScene from './SectionMountainScene.svelte';
  import OrbitCardsLayer from './OrbitCardsLayer.svelte';
  import FactMainStage from './FactMainStage.svelte';
  import CardModel from './CardModel.svelte';
  import SectionHeroTitle from './SectionHeroTitle.svelte';
  import HeroFrost from './HeroFrost.svelte';
  import { sections } from './sections.js';
  import { stageOpacity, clamp, remap } from './scrollStages.js';
  import {
    getFactDockT,
    isFactActive as isFactSegmentActive,
    dockUiOpacity
  } from './sustainabilityDock.js';

  const section = sections.sustainability;

  const HERO_END = 0.12;
  const INTRO = { in: 0.12, inEnd: 0.16, out: 0.24, outEnd: 0.28 };
  const ORBIT = { start: 0.28, end: 0.4 };
  const FACT_SEGMENTS = [
    { start: 0.4, end: 0.56 },
    { start: 0.56, end: 0.72 },
    { start: 0.72, end: 0.88 }
  ];
  const CLOSURE = { in: 0.88, inEnd: 0.92 };

  const SCROLLER_VH = 10;

  let scrollProgress = $state(0);
  /** @type {HTMLDivElement | undefined} */
  let container = $state(undefined);
  let reducedMotion = $state(false);
  /** @type {Record<string, Set<string>>} */
  let likedByFact = $state({});
  let scrollGateMessage = $state(false);
  let isClamping = false;

  let introOpacity = $derived(
    stageOpacity(scrollProgress, INTRO.in, INTRO.inEnd, INTRO.out, INTRO.outEnd)
  );

  let mountainProgress = $derived(clamp(remap(scrollProgress, HERO_END, 0.88), 0, 1));

  let mountainsVisible = $derived(scrollProgress >= HERO_END - 0.02 && scrollProgress < 0.9);

  let heroOpacity = $derived(Math.max(0, 1 - scrollProgress / HERO_END));

  let closureOpacity = $derived(
    stageOpacity(scrollProgress, CLOSURE.in, CLOSURE.inEnd, 0.98, 1)
  );

  let activeFactIndex = $derived.by(() => {
    for (let i = FACT_SEGMENTS.length - 1; i >= 0; i--) {
      if (scrollProgress >= FACT_SEGMENTS[i].start) return i;
    }
    return -1;
  });

  let activeDockT = $derived(
    activeFactIndex >= 0 ? getFactDockT(scrollProgress, FACT_SEGMENTS, activeFactIndex) : 0
  );

  let showFactMain = $derived(
    activeFactIndex >= 0 &&
      isFactSegmentActive(scrollProgress, FACT_SEGMENTS, activeFactIndex) &&
      activeDockT >= 0.42
  );

  let factMainOpacity = $derived(dockUiOpacity(activeDockT));

  /** @param {string} factId */
  function likedCount(factId) {
    return likedByFact[factId]?.size ?? 0;
  }

  /** @param {number} factIndex */
  function factUnlocked(factIndex) {
    if (factIndex === 0) return true;
    const prevId = section.facts[factIndex - 1]?.id;
    return prevId ? likedCount(prevId) > 0 : false;
  }

  function maxScrollProgress() {
    for (let i = 0; i < FACT_SEGMENTS.length; i++) {
      const seg = FACT_SEGMENTS[i];
      const factId = section.facts[i]?.id;
      if (!factId) continue;

      if (!factUnlocked(i)) {
        return seg.start - 0.001;
      }

      const inSegment = scrollProgress >= seg.start;
      const dock = getFactDockT(scrollProgress, FACT_SEGMENTS, i);
      const needsLike = inSegment && dock > 0.55 && likedCount(factId) === 0;

      if (needsLike) {
        return seg.start + (seg.end - seg.start) * 0.82;
      }

      if (likedCount(factId) === 0 && scrollProgress > seg.start + (seg.end - seg.start) * 0.82) {
        return seg.start + (seg.end - seg.start) * 0.82;
      }
    }
    return 1;
  }

  function handleScroll() {
    if (!container || isClamping) return;
    const scrollTop = window.scrollY;
    const docHeight = container.scrollHeight - window.innerHeight;
    if (docHeight <= 0) return;

    let progress = scrollTop / docHeight;
    const cap = maxScrollProgress();

    if (progress > cap + 0.002) {
      isClamping = true;
      scrollGateMessage = cap < 0.88;
      window.scrollTo({ top: cap * docHeight, behavior: 'auto' });
      progress = cap;
      requestAnimationFrame(() => {
        isClamping = false;
      });
    } else {
      scrollGateMessage = cap < 1 && progress > cap - 0.04 && maxScrollProgress() < 1;
    }

    scrollProgress = progress;
  }

  /** @param {string} factId @param {string} opinionId */
  function toggleLike(factId, opinionId) {
    const current = likedByFact[factId] ?? new Set();
    const next = new Set(current);
    if (next.has(opinionId)) next.delete(opinionId);
    else next.add(opinionId);
    likedByFact = { ...likedByFact, [factId]: next };
    scrollGateMessage = false;
    requestAnimationFrame(handleScroll);
  }

  let modelActive = $derived(
    scrollProgress >= ORBIT.start - 0.02 && scrollProgress < FACT_SEGMENTS[2].end + 0.02
  );

  onMount(() => {
    reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.documentElement.classList.add('section-route');
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.documentElement.classList.remove('section-route');
    };
  });
</script>

<div class="journey" bind:this={container}>
  <div class="journey-bg mountains-bg" style="opacity: {mountainsVisible ? 1 : 0};">
    <SectionMountainScene progress={mountainProgress} visible={mountainsVisible} />
  </div>

  <section
    class="journey-stage hero-cover"
    style="opacity: {heroOpacity}; pointer-events: {heroOpacity > 0.1 ? 'auto' : 'none'};"
    aria-hidden={heroOpacity < 0.1}
  >
    <div class="hero-visual">
      <HeroFrost src={section.hero.background} />
      <SectionHeroTitle title={section.heroTitle} />
    </div>
  </section>

  <section
    class="journey-stage intro-stage"
    style="opacity: {introOpacity}; pointer-events: {introOpacity > 0.1 ? 'auto' : 'none'};"
    aria-hidden={introOpacity < 0.1}
  >
    <p class="intro-claim">{section.introClaim}</p>
  </section>

  <OrbitCardsLayer
    facts={section.facts}
    modelSrc={section.modelSrc}
    {scrollProgress}
    orbitStart={ORBIT.start}
    orbitEnd={ORBIT.end}
    factSegments={FACT_SEGMENTS}
    {modelActive}
    reducedMotion={reducedMotion}
  />

  {#if showFactMain && activeFactIndex >= 0}
    {@const fact = section.facts[activeFactIndex]}
    {@const opinions = section.opinionsByFact[activeFactIndex] ?? []}
    <FactMainStage
      {fact}
      {opinions}
      opacity={factMainOpacity}
      likedIds={likedByFact[fact.id] ?? new Set()}
      onToggleLike={(id) => toggleLike(fact.id, id)}
      showGateHint={scrollGateMessage && likedCount(fact.id) === 0}
      factIndex={activeFactIndex}
    />
  {/if}

  <section
    class="journey-stage closure-stage"
    style="opacity: {closureOpacity}; pointer-events: {closureOpacity > 0.1 ? 'auto' : 'none'};"
    aria-hidden={closureOpacity < 0.1}
  >
    <div class="closure-overlay" aria-hidden="true"></div>
    <div class="closure-model">
      <CardModel src={section.modelSrc} label="" active={closureOpacity > 0.2} showLabel={false} />
    </div>
    <p class="closure-title">{section.closure.title}</p>
    <p class="closure-hint">{section.closure.hint}</p>
  </section>

  <div class="scroller" style="height: {SCROLLER_VH * 100}vh;" aria-hidden="true"></div>
</div>

<style>
  .journey {
    position: relative;
    width: 100%;
    min-height: 100vh;
    background: #f9f9fa;
  }

  .journey-bg {
    position: fixed;
    inset: 0;
    z-index: 1;
    pointer-events: none;
    transition: opacity 0.45s ease;
  }

  .journey-stage {
    position: fixed;
    inset: 0;
    z-index: 4;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    transition: opacity 0.4s ease;
    pointer-events: none;
  }

  .hero-cover {
    z-index: 6;
    padding: 0;
  }

  .hero-visual {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    align-items: center;
  }

  .intro-stage {
    z-index: 7;
    padding: clamp(100px, 12vh, 140px) clamp(24px, 5vw, 80px);
    justify-content: center;
  }

  .intro-claim {
    max-width: min(1349px, 100%);
    margin: 0;
    font-family: 'Supreme Variable', sans-serif;
    font-size: clamp(1.75rem, 5vw, 68px);
    font-weight: 700;
    line-height: 1.1;
    text-align: left;
    color: #161a1f;
  }

  .closure-stage {
    z-index: 15;
    justify-content: flex-end;
    padding-bottom: clamp(48px, 8vh, 96px);
    text-align: center;
  }

  .closure-overlay {
    position: absolute;
    inset: 0;
    top: 87px;
    background: linear-gradient(
      180deg,
      rgba(249, 249, 250, 0.92) 0%,
      rgba(255, 255, 255, 0.96) 45%,
      #ffffff 100%
    );
  }

  .closure-model {
    position: absolute;
    left: 50%;
    top: 42%;
    width: min(362px, 50vw);
    height: min(496px, 55vh);
    transform: translate(-50%, -50%);
    z-index: 1;
    pointer-events: none;
  }

  .closure-title {
    position: relative;
    z-index: 2;
    max-width: 766px;
    margin: 0 auto 1rem;
    padding: 0 24px;
    font-family: 'Supreme Variable', sans-serif;
    font-size: clamp(1.25rem, 2.5vw, 38px);
    font-weight: 700;
    line-height: 1.2;
    color: #161a1f;
  }

  .closure-hint {
    position: relative;
    z-index: 2;
    margin: 0;
    font-family: 'Supreme Variable', sans-serif;
    font-size: 0.9rem;
    font-weight: 700;
    color: #161a1f;
    opacity: 0.7;
  }

  .scroller {
    position: relative;
    z-index: 0;
    pointer-events: none;
  }

  @media (max-width: 900px) {
    .intro-claim {
      text-align: center;
    }
  }
</style>
