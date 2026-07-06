<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { browser } from '$app/environment';
  import gsap from 'gsap';
  import { ScrollTrigger } from 'gsap/ScrollTrigger';
  import Lenis from 'lenis';

  import FrostCanvas from '$lib/components/FrostCanvas.svelte';
  import SectionHeroTitle from '$lib/materiali-home/SectionHeroTitle.svelte';
  import TextBlock from './TextBlock.svelte';
  import CardStack from './CardStack.svelte';
  import type { CardStackApi } from './CardStack.svelte';
  import Scene3D from './Scene3D.svelte';
  import type { Scene3DApi, MobileFitOptions } from './Scene3D.svelte';

  import './tokens.css';
  import { visitedSections, allSectionsCompleted } from '$lib/stores/visitedSections';
  import { overlayVisible } from '$lib/stores/pageTransition';
  import {
    FEEDBACK_HEADING,
    computeResultKey,
    computeResultPath,
    getFeedbackBody,
    shuffleCommentOrder,
  } from './scrollytellConfig.js';

  // ── Mobile detection ───────────────────────────────────────────────────────
  let isMobile = $state(false);

  interface CardData { id: number; body: string; liked: boolean; }
  interface TopicData { title: string; body: string; source?: string; comments: string[]; }

  interface ScrollytellConfig {
    pageTitle: string;
    heroTitle: string;
    heroTitleStyle?: 'svg' | 'section';
    heroTitleLayout?: 'center' | 'spread';
    heroAriaLabel: string;
    frostSrc: string;
    bgSrc: string;
    bgPosition?: string;
    phrase: string;
    phraseLines?: string[];
    modelSrc: string;
    resultPaths: string[];
    sectionId: 'infrastructure' | 'sport' | 'sustainability';
    topics: TopicData[];
  }

  interface Props { config: ScrollytellConfig; }
  let { config }: Props = $props();

  const topics    = $derived(config.topics);
  const lastTopic = $derived(config.topics.length - 1);
  const commentOrder = config.topics.map((t) => shuffleCommentOrder(t.comments.length));

  let currentTopic    = $state(0);
  let topicLikes      = $state<boolean[][]>(config.topics.map(t => t.comments.map(() => false)));
  let isTransitioning = $state(false);
  let mobileCardsVisible = $state(false);
  let mobileTopicsScrollComplete = $state(false);

  type PagePhase = 'intro' | 'topics' | 'feedback';
  let phase = $state<PagePhase>('intro');
  let currentResultPath = $state<string>('');
  let currentResultKey = $state<'positivo' | 'negativo' | 'piu-positivo' | 'piu-negativo' | 'neutro'>('neutro');

  const cards: CardData[] = $derived(
    commentOrder[currentTopic].map((commentIdx) => ({
      id: commentIdx,
      body: topics[currentTopic].comments[commentIdx],
      liked: topicLikes[currentTopic][commentIdx],
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
      : 'CONTINUA'
  );

  const ctaActive = $derived(
    !isTransitioning &&
    phase === 'topics' &&
    (isMobile
      ? (!mobileCardsVisible || anyLiked)
      : anyLiked)
  );

  function handleCtaClick() {
    handleTopicsForwardNavigation();
  }

  function handleTopicsForwardNavigation() {
    if (!ctaActive || isTransitioning) return;
    if (isMobile && !mobileCardsVisible) {
      void mobileShowCards().then(() => setTimeout(() => updateTopicsModelFit({ relayout: true }), 450));
      return;
    }
    goNext();
  }

  function handleTopicsBackwardNavigation() {
    if (phase !== 'topics' || isTransitioning || cardsScrollAnimating) return;
    if (isMobile && mobileCardsVisible) {
      void mobileHideCards().then(() => setTimeout(() => updateTopicsModelFit({ relayout: true }), 450));
      return;
    }
    if (currentTopic > 0) goPrev();
  }

  function cardsScrollAtBottom(): boolean {
    const el = cardsScrollRef;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 8;
  }

  function cardsScrollAtTop(): boolean {
    const el = cardsScrollRef;
    if (!el) return true;
    return el.scrollTop < 8;
  }

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
    window.location.href = route;
  }

  async function navigateToResults() {
    if (isTransitioning) return;
    isTransitioning = true;
    overlayVisible.set(true);
    await new Promise<void>(r => setTimeout(r, 400));
    window.location.href = '/risultati';
  }

  function computeResult(): string {
    return computeResultPath(config.sectionId, topicLikes);
  }

  function getResultLabel(): string {
    return getFeedbackBody(config.sectionId, currentResultKey);
  }

  function keepLastWordsTogether(text: string): string {
    return text.replace(/(\S+)\s+(\S+)\s*$/, '$1\u00A0$2');
  }

  async function exitFeedbackPhase() {
    if (phase !== 'feedback' || isTransitioning) return;
    isTransitioning = true;

    const OUT = 0.35;
    gsap.to('.feedback-top',        { opacity: 0, duration: OUT });
    gsap.to('.feedback-subtitle',   { opacity: 0, duration: OUT });
    gsap.to('.feedback-bottom-cta', { opacity: 0, duration: OUT });
    await new Promise<void>(r => setTimeout(r, OUT * 1000));

    gsap.to('.layer--bg', { filter: 'none', duration: 0.6, ease: 'power2.inOut' });
    scene3d?.returnToParticles();
    phase = 'topics';
    await tick();

    gsap.fromTo('.stage__text',  { opacity: 0, y:  8 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.inOut' });
    gsap.fromTo('.stage__right-heading', { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'power3.inOut', delay: 0.04 });
    await tick();
    if (isMobile) {
      // Riparte sempre in modalità estesa (no cards): l'utente la rende compatta
      // col tap o con lo scroll gesture, vedi toggleMobileCardsPanel/mobilePreventScroll
      updateTopicsModelFit({ relayout: true });
      setTimeout(() => updateTopicsModelFit({ relayout: true }), 450);
    } else {
      await cardStack?.animateIn();
    }
    gsap.to('.stage__cta', { opacity: 1, duration: 0.3, delay: 0.1 });
    isTransitioning = false;
  }

  async function enterFeedbackPhase() {
    if (phase !== 'topics' || isTransitioning || !anyLiked) return;
    isTransitioning = true;
    topicsMobileLayoutLocked = false;
    scene3d?.clearMobileFit();

    const OUT = 0.50;
    const outTl = gsap.timeline();
    outTl.to('.stage__text',  { opacity: 0, y: -8, duration: OUT, ease: 'power3.inOut' }, 0);
    outTl.to('.stage__right-heading', { opacity: 0, duration: OUT * 0.6, ease: 'power3.inOut' }, 0);
    outTl.to('.stage__cta',   { opacity: 0, duration: OUT * 0.6, ease: 'power2.inOut' }, 0);
    await cardStack?.animateOut();

    await new Promise<void>(r => setTimeout(r, OUT * 200));
    outTl.kill();

    if (isMobile) {
      mobileCardsVisible = false;
      mobileScrollRatio = 0;
    }

    const resultModelPath = computeResult();
    currentResultPath = resultModelPath;
    currentResultKey = computeResultKey(topicLikes);
    visitedSections.markCompleted(config.sectionId, resultModelPath);
    gsap.to('.layer--bg', { filter: 'blur(12px)', duration: 0.8, ease: 'power2.inOut' });

    scene3d?.morphToResult(resultModelPath, () => {
      phase = 'feedback';
      isTransitioning = false;
      tick().then(() => {
        updateFeedbackModelFit();
        requestAnimationFrame(() => updateFeedbackModelFit());
        requestAnimationFrame(() => requestAnimationFrame(() => updateFeedbackModelFit()));
        setTimeout(updateFeedbackModelFit, 550);
        gsap.fromTo('.feedback-top',        { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'power2.out' });
        gsap.fromTo('.feedback-subtitle',   { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'power2.out', delay: 0.15 });
        gsap.fromTo('.feedback-bottom-cta', { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'power2.out', delay: 0.25 });
      });
    });
  }

  async function goNext() {
    if (!anyLiked || isTransitioning) return;
    if (currentTopic === lastTopic) { enterFeedbackPhase(); return; }

    scene3d?.resetPulse();
    isTransitioning = true;
    const OUT = 0.50;

    if (isMobile) {
      mobileCardsVisible = false; // CSS removes m-cards-visible → container hides
      mobileScrollRatio = 0;
      mobileTopicsScrollComplete = true;
      if (cardsScrollRef) cardsScrollRef.scrollTop = 0;
    }

    gsap.to('.stage__text', { opacity: 0, y: -8, duration: OUT, ease: 'power3.inOut' });
    await cardStack?.animateOut();

    currentTopic++;
    await tick();

    gsap.set('.stage__text', { y: 8, opacity: 0 });
    if (isMobile) {
      // Riparte sempre in modalità estesa (no cards): l'utente la rende compatta
      // col tap o con lo scroll gesture, vedi toggleMobileCardsPanel/mobilePreventScroll
      updateTopicsModelFit({ relayout: true });
      setTimeout(() => updateTopicsModelFit({ relayout: true }), 450);
    } else {
      await cardStack?.animateIn();
    }

    gsap.timeline({ onComplete: () => { isTransitioning = false; } })
      .to('.stage__text', { opacity: 1, y: 0, duration: 0.60, ease: 'power3.inOut' }, 0);
  }

  async function goPrev() {
    if (isTransitioning || currentTopic === 0) return;

    scene3d?.resetPulse();
    isTransitioning = true;
    const OUT = 0.50;

    if (isMobile) {
      mobileCardsVisible = false; // CSS removes m-cards-visible → container hides
      mobileScrollRatio = 0;
      mobileTopicsScrollComplete = true;
      if (cardsScrollRef) cardsScrollRef.scrollTop = 0;
    }

    gsap.to('.stage__text', { opacity: 0, y: 8, duration: OUT, ease: 'power3.inOut' });
    await cardStack?.animateOut();

    currentTopic--;
    await tick();

    gsap.set('.stage__text', { y: -8, opacity: 0 });
    if (isMobile) {
      // Riparte sempre in modalità estesa (no cards): l'utente la rende compatta
      // col tap o con lo scroll gesture, vedi toggleMobileCardsPanel/mobilePreventScroll
      updateTopicsModelFit({ relayout: true });
      setTimeout(() => updateTopicsModelFit({ relayout: true }), 450);
    } else {
      await cardStack?.animateIn();
    }

    gsap.timeline({ onComplete: () => { isTransitioning = false; } })
      .to('.stage__text', { opacity: 1, y: 0, duration: 0.60, ease: 'power3.inOut' }, 0);
  }

  // ── DOM refs ──────────────────────────────────────────────────────────────
  let sceneEl = $state<HTMLElement | null>(null);
  let scene3d = $state<Scene3DApi | undefined>(undefined);
  let cardStack = $state<CardStackApi | undefined>(undefined);
  let cardsIntroduced = false;
  let cardsScrollAnimating = false;

  // ── Mobile-specific state ─────────────────────────────────────────────────
  let cardsScrollRef = $state<HTMLElement | null>(null);
  let stageTextEl = $state<HTMLElement | null>(null);
  let feedbackTopEl = $state<HTMLElement | null>(null);
  let feedbackSubtitleEl = $state<HTMLElement | null>(null);
  let stageRightEl = $state<HTMLElement | null>(null);
  let mobileScrollRatio = $state(0);
  let mobileBrowserChromeBottom = $state(0);

  const MOBILE_BROWSER_CHROME_SCALE = 1;
  const MOBILE_BROWSER_CHROME_MAX = 96;

  function syncMobileBrowserChromeInset() {
    if (!isMobile || !browser) return;
    const vv = window.visualViewport;
    if (!vv) {
      mobileBrowserChromeBottom = 0;
      return;
    }
    const raw = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
    mobileBrowserChromeBottom = Math.min(
      MOBILE_BROWSER_CHROME_MAX,
      Math.round(raw * MOBILE_BROWSER_CHROME_SCALE),
    );

    void tick().then(() => {
      requestAnimationFrame(() => {
        if (phase === 'feedback') updateFeedbackModelFit();
      });
    });
  }

  // ── Model 3D: stessa distanza da testo sopra e card/CTA sotto (tutte le sezioni) ──
  const TOPICS_MODEL_MARGIN = 24;
  const TOPICS_CTA_RESERVE  = 100;
  const TOPICS_FIT_CENTER_BIAS = 0.5;
  /** Offset verticale pianta con testo del tema visibile (positivo = più in alto). */
  const PLANT_THEME_TEXT_Y_OFFSET_VH = -0.032;
  /** Offset verticale pianta con pannello commenti visibile (positivo = più in alto). */
  const PLANT_CARDS_Y_OFFSET_VH = 0.008;
  /** Con opinioni aperte: ancora la pianta più in basso nello spazio libero. */
  const PLANT_MOBILE_CARDS_CENTER_BIAS = 0.38;
  /** Allineato a --mobile-cards-bottom (senza chrome browser). */
  const MOBILE_CARDS_BOTTOM_BASE = 90;
  /** Gap extra tra testo e pianta quando le opinioni sono visibili. */
  const PLANT_MOBILE_CARDS_TEXT_GAP_PX = 20;
  const MOBILE_TOPICS_READY_PROGRESS = 0.97;
  /** Altezza viewport scroll commenti: 2 card visibili per volta. */
  const MOBILE_CARD_AVG_HEIGHT = 96;
  const MOBILE_CARD_STACK_GAP = 10;
  const MOBILE_CARDS_SCROLL_PADDING = 18;
  const MOBILE_VISIBLE_CARD_COUNT = 2;
  const MOBILE_CARDS_SCROLL_HEIGHT =
    MOBILE_VISIBLE_CARD_COUNT * MOBILE_CARD_AVG_HEIGHT +
    (MOBILE_VISIBLE_CARD_COUNT - 1) * MOBILE_CARD_STACK_GAP +
    MOBILE_CARDS_SCROLL_PADDING;

  /** Scala fissa del modello in fase argomenti (stessa per tutte le sezioni). */
  const TOPICS_SCALE_DESKTOP = 0.56;
  const TOPICS_SCALE_MOBILE = 0.44;
  /** Stesso rapporto del titolo compatto mobile (36px → 24px in m-compact). */
  const MOBILE_TOPIC_COMPACT_RATIO = 24 / 36;
  const MOBILE_TEXT_SCALE_DURATION = 0.4;
  /** Riduzione extra pianta con pannello commenti visibile. */
  const PLANT_CARDS_SCALE_MUL = 0.76;
  /** Scala base pianta su mobile (argomenti). */
  const PLANT_TOPICS_SCALE_MUL = 0.87;
  /** Riduzione extra pattini con pannello commenti visibile. */
  const SPORT_CARDS_SCALE_MUL = 0.74;
  /** Con commenti visibili: centro dello spazio bianco tra testo e card. */
  const MOBILE_CARDS_FIT_CENTER_BIAS = 0.42;
  /** Offset verticale pattini con testo del tema visibile (positivo = più in alto). */
  const SPORT_THEME_TEXT_Y_OFFSET_VH = -0.008;
  const SPORT_CARDS_Y_OFFSET_VH = 0.038;
  /** Centro verticale pattini con solo testo tema su mobile. */
  const SPORT_MOBILE_THEME_CENTER_BIAS = 0.52;
  const MOBILE_CARDS_TOP_MARGIN = 8;
  const topicsScaleTween = { value: TOPICS_SCALE_MOBILE };

  function topicsScaleMul(cardsMode = false): number {
    if (!isMobile) return TOPICS_SCALE_DESKTOP;
    let scale = TOPICS_SCALE_MOBILE;
    if (config.modelSrc === '/oggetti/pianta.glb') {
      scale *= PLANT_TOPICS_SCALE_MUL;
    }
    if (cardsMode) {
      scale *= MOBILE_TOPIC_COMPACT_RATIO;
      if (
        config.modelSrc === '/oggetti/sport.glb' ||
        config.modelSrc === '/oggetti/ice_skate.glb'
      ) {
        scale *= SPORT_CARDS_SCALE_MUL;
      }
      if (config.modelSrc === '/oggetti/pianta.glb') {
        scale *= PLANT_CARDS_SCALE_MUL;
      }
    }
    return scale;
  }

  function applyTopicsScale(animate = false) {
    if (!scene3d || phase === 'feedback') return;
    const target = topicsScaleMul(isMobile && mobileCardsVisible);
    gsap.killTweensOf(topicsScaleTween);
    if (animate && isMobile && phase === 'topics') {
      gsap.to(topicsScaleTween, {
        value: target,
        duration: MOBILE_TEXT_SCALE_DURATION,
        ease: 'power2.inOut',
        onUpdate: () => {
          scene3d?.setScale(topicsScaleTween.value);
          updateTopicsModelFit({ skipScale: true, relayout: true });
          scene3d?.snapMobileFit();
        },
        onComplete: () => {
          updateTopicsModelFit({ skipScale: true, relayout: true });
          scene3d?.snapMobileFit();
        },
      });
    } else {
      topicsScaleTween.value = target;
      scene3d.setScale(target);
    }
  }

  function topicsCardsActive(): boolean {
    return isMobile ? mobileCardsVisible : cardsIntroduced;
  }

  function isPlantModel(): boolean {
    return config.modelSrc === '/oggetti/pianta.glb';
  }

  function plantTopicsYOffset(cardsActive: boolean): number {
    if (config.modelSrc !== '/oggetti/pianta.glb' || phase !== 'topics') return 0;
    return cardsActive ? PLANT_CARDS_Y_OFFSET_VH : PLANT_THEME_TEXT_Y_OFFSET_VH;
  }

  function isSportModel(): boolean {
    return config.modelSrc === '/oggetti/sport.glb' || config.modelSrc === '/oggetti/ice_skate.glb';
  }

  function sportTopicsYOffset(cardsActive: boolean): number {
    if (phase !== 'topics' || !isMobile || !isSportModel()) return 0;
    return cardsActive ? SPORT_CARDS_Y_OFFSET_VH : SPORT_THEME_TEXT_Y_OFFSET_VH;
  }

  function topicsModelYOffset(cardsActive: boolean): number {
    return plantTopicsYOffset(cardsActive) + sportTopicsYOffset(cardsActive);
  }

  function topicsFitOptions(cardsActive: boolean): MobileFitOptions {
    if (isMobile && isPlantModel()) {
      return {
        centerBias: cardsActive
          ? PLANT_MOBILE_CARDS_CENTER_BIAS
          : TOPICS_FIT_CENTER_BIAS,
      };
    }
    if (isMobile && isSportModel()) {
      return {
        centerBias: cardsActive
          ? MOBILE_CARDS_FIT_CENTER_BIAS
          : SPORT_MOBILE_THEME_CENTER_BIAS,
      };
    }
    if (!isMobile || !cardsActive || !isSportModel()) {
      return { centerBias: TOPICS_FIT_CENTER_BIAS };
    }
    return { centerBias: MOBILE_CARDS_FIT_CENTER_BIAS };
  }

  function lockTopicsMobileLayout() {
    if (!isMobile || !scene3d || phase !== 'topics') return;
    scene3d.setMobileLayoutBlend(1);
    scene3d.snapMobileFit();
    scene3d.lockMobileFit();
  }

  const FEEDBACK_MODEL_MARGIN = 20;
  /** Centro verticale pattini nel feedback: più basso = più in alto nello spazio libero. */
  const SPORT_FEEDBACK_CENTER_BIAS = 0.32;

  function mobileTopicsViewportHeightPx(): number {
    const viewport = sceneEl?.querySelector<HTMLElement>('.scene__viewport');
    return viewport?.getBoundingClientRect().height ?? window.innerHeight;
  }

  function mobileFixedTopicsBottomBoundPx(cardsActive: boolean): number {
    const viewportHeight = mobileTopicsViewportHeightPx();
    if (!cardsActive) {
      return viewportHeight - TOPICS_CTA_RESERVE;
    }
    const headingReserve = 24;
    const panelTopGap = 8;
    return (
      viewportHeight -
      MOBILE_CARDS_BOTTOM_BASE -
      MOBILE_CARDS_SCROLL_HEIGHT -
      headingReserve -
      panelTopGap
    );
  }

  function mobileTopicsTopPx(textRect: DOMRect, cardsActive: boolean): number {
    if (isPlantModel() && cardsActive) {
      return textRect.bottom + PLANT_MOBILE_CARDS_TEXT_GAP_PX;
    }
    const topMargin =
      TOPICS_MODEL_MARGIN + (cardsActive && isSportModel() ? MOBILE_CARDS_TOP_MARGIN : 0);
    return textRect.bottom + topMargin;
  }

  let topicsMobileLayoutLocked = false;

  function updateFeedbackModelFit() {
    if (!scene3d || phase !== 'feedback' || !feedbackTopEl || !feedbackSubtitleEl) return;
    const topRect = feedbackTopEl.getBoundingClientRect();
    const subtitleRect = feedbackSubtitleEl.getBoundingClientRect();
    const centerBias =
      config.sectionId === 'sport' ? SPORT_FEEDBACK_CENTER_BIAS : 0.5;
    scene3d.setFeedbackFit(
      topRect.bottom + FEEDBACK_MODEL_MARGIN,
      subtitleRect.top - FEEDBACK_MODEL_MARGIN,
      { centerBias },
    );
    scene3d.realignFeedback();
  }

  function updateTopicsModelFit(options: { skipScale?: boolean; relayout?: boolean } = {}) {
    if (!scene3d || !stageTextEl || phase === 'feedback') return;

    const shouldRelayout =
      !isMobile || phase !== 'topics' || !topicsMobileLayoutLocked || options.relayout;
    if (!shouldRelayout) {
      if (!options.skipScale) applyTopicsScale(false);
      return;
    }

    const textRect = stageTextEl.getBoundingClientRect();
    const cardsRect = stageRightEl?.getBoundingClientRect();
    const cardsActive = topicsCardsActive();
    let topPx: number;
    let bottomPx: number;

    if (isMobile) {
      const bottomBoundPx = mobileFixedTopicsBottomBoundPx(cardsActive);
      topPx = mobileTopicsTopPx(textRect, cardsActive);
      bottomPx = bottomBoundPx - TOPICS_MODEL_MARGIN;
    } else if (cardsActive && cardsRect && cardsRect.height > 0) {
      const overlapTop = Math.max(textRect.top, cardsRect.top);
      const overlapBottom = Math.min(textRect.bottom, cardsRect.bottom);
      if (overlapBottom - overlapTop >= TOPICS_MODEL_MARGIN * 2 + 40) {
        topPx = overlapTop + TOPICS_MODEL_MARGIN;
        bottomPx = overlapBottom - TOPICS_MODEL_MARGIN;
      } else {
        topPx = Math.min(textRect.top, cardsRect.top) + TOPICS_MODEL_MARGIN;
        bottomPx = Math.max(textRect.bottom, cardsRect.bottom) - TOPICS_MODEL_MARGIN;
      }
    } else {
      topPx = textRect.bottom + TOPICS_MODEL_MARGIN;
      bottomPx = window.innerHeight - TOPICS_CTA_RESERVE - TOPICS_MODEL_MARGIN;
    }

    if (bottomPx - topPx < 48) {
      if (!cardsActive) {
        scene3d.setModelBaseYOffset(0);
        return;
      }
      bottomPx = topPx + 48;
    }

    scene3d.setModelBaseYOffset(topicsModelYOffset(cardsActive));
    scene3d.setMobileFit(topPx, bottomPx, topicsFitOptions(cardsActive));
    if (!options.skipScale) applyTopicsScale(false);
    syncTopicsMobileLayout(1);
    if (isMobile && phase === 'topics') {
      lockTopicsMobileLayout();
      topicsMobileLayoutLocked = true;
    }
  }

  $effect(() => {
    if (!stageTextEl || phase === 'feedback') return;
    const observer = new ResizeObserver(() => {
      if (isMobile && topicsMobileLayoutLocked) return;
      updateTopicsModelFit();
    });
    observer.observe(stageTextEl);
    return () => observer.disconnect();
  });

  $effect(() => {
    if (phase === 'feedback') return;
    currentTopic;
    mobileCardsVisible;
    cardsIntroduced;
    void tick().then(() => {
      updateTopicsModelFit({ relayout: true });
      setTimeout(() => updateTopicsModelFit({ relayout: true }), 450);
    });
  });

  $effect(() => {
    if (!stageRightEl || phase === 'feedback') return;
    const observer = new ResizeObserver(() => {
      if (isMobile && topicsMobileLayoutLocked) return;
      updateTopicsModelFit();
    });
    observer.observe(stageRightEl);
    return () => observer.disconnect();
  });

  $effect(() => {
    if (phase !== 'feedback' || !feedbackTopEl || !feedbackSubtitleEl) return;
    const observer = new ResizeObserver(() => updateFeedbackModelFit());
    observer.observe(feedbackTopEl);
    observer.observe(feedbackSubtitleEl);
    void tick().then(updateFeedbackModelFit);
    return () => observer.disconnect();
  });

  const PARTICLE_SCROLL_START = 0.58;
  const PARTICLE_SCROLL_END = 0.98;
  const MOBILE_CARDS_HIDE_PROGRESS = 0.975;
  /** Dopo questa soglia di morph particelle, il modello scende verso la posizione finale. */
  const MOBILE_LAYOUT_START = 0.55;

  function particleProgressFromScroll(scrollProgress: number): number {
    if (scrollProgress <= PARTICLE_SCROLL_START) return 0;
    return Math.min(1, (scrollProgress - PARTICLE_SCROLL_START) / (PARTICLE_SCROLL_END - PARTICLE_SCROLL_START));
  }

  function topicsLayoutBlendFromParticleT(particleT: number): number {
    if (particleT <= MOBILE_LAYOUT_START) return 0;
    return Math.min(1, (particleT - MOBILE_LAYOUT_START) / (1 - MOBILE_LAYOUT_START));
  }

  function currentTopicsLayoutBlend(particleT: number): number {
    if (isMobile && (phase === 'topics' || topicsMode)) return 1;
    if (!isMobile && cardsIntroduced) return 1;
    return topicsLayoutBlendFromParticleT(particleT);
  }

  function syncTopicsMobileLayout(particleT = 1) {
    if (!scene3d) return;
    if (isMobile && phase === 'topics') {
      scene3d.setMobileLayoutBlend(1);
      return;
    }
    scene3d.setMobileLayoutBlend(currentTopicsLayoutBlend(particleT));
    scene3d.snapMobileFit();
  }

  function updateTopicsScrollLayout(particleT: number) {
    if (!scene3d) return;
    if (isMobile && topicsMode) return;
    updateTopicsModelFit();
    syncTopicsMobileLayout(particleT);
  }

  function updateMobileCardsFromScroll(progress: number) {
    if (!isMobile || !topicsMode || cardsScrollAnimating) return;

    if (mobileCardsVisible && progress < MOBILE_CARDS_HIDE_PROGRESS) {
      void mobileHideCards().then(() => setTimeout(() => updateTopicsModelFit({ relayout: true }), 450));
    }
  }

  function updateMobileTopicsScrollComplete(progress: number, particleT: number) {
    if (!isMobile) return;
    if (topicsMode || phase === 'topics') {
      mobileTopicsScrollComplete = true;
      return;
    }
    mobileTopicsScrollComplete = progress >= MOBILE_TOPICS_READY_PROGRESS && particleT >= 1;
  }

  let topicsScrollLockY = 0;

  function lockMobileTopicsPageScroll() {
    if (!isMobile || !topicsMode) return;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const y = Math.min(topicsScrollLockY, maxScroll);
    if (Math.abs(window.scrollY - y) > 1) {
      window.scrollTo(0, y);
    }
  }

  // ── Model loaded signal ───────────────────────────────────────────────────
  let resolveModelLoaded: () => void = () => {};
  const modelLoadedPromise = new Promise<void>(resolve => { resolveModelLoaded = resolve; });

  // ── Mobile cards ──────────────────────────────────────────────────────────
  // Su mobile l'avanzamento tra argomenti è a bottone o swipe verso l'alto (scroll down).
  // Il toggle esteso/compatto del topic corrente resta disponibile via tap sul testo.
  async function mobileShowCards() {
    if (mobileCardsVisible || cardsScrollAnimating) return;
    cardsScrollAnimating = true;
    mobileCardsVisible = true; // CSS class m-cards-visible makes container visible
    await tick();
    applyTopicsScale(true);
    updateTopicsModelFit({ skipScale: true, relayout: true });
    await cardStack?.animateIn();
    cardsScrollAnimating = false;
  }

  // Reverse of mobileShowCards: torna alla modalità "solo modello" con testo
  // ampio, nascondendo il pannello commenti (senza avanzare argomento).
  async function mobileHideCards() {
    if (!mobileCardsVisible || cardsScrollAnimating) return;
    cardsScrollAnimating = true;
    await cardStack?.animateOut();
    mobileCardsVisible = false; // CSS removes m-cards-visible
    mobileScrollRatio = 0;
    if (cardsScrollRef) cardsScrollRef.scrollTop = 0;
    await tick();
    applyTopicsScale(true);
    updateTopicsModelFit({ skipScale: true, relayout: true });
    cardsScrollAnimating = false;
  }

  // Tap sul testo argomento: alterna la modalità testo ampio/solo-modello ↔
  // testo compatto/commenti visibili (m-compact segue mobileCardsVisible).
  function toggleMobileCardsPanel() {
    if (!isMobile || phase !== 'topics' || isTransitioning || cardsScrollAnimating) return;
    const action = mobileCardsVisible ? mobileHideCards() : mobileShowCards();
    action.then(() => setTimeout(() => updateTopicsModelFit({ relayout: true }), 450));
  }

  function onCardsScroll() {
    const el = cardsScrollRef;
    if (!el) return;
    const max = el.scrollHeight - el.clientHeight;
    mobileScrollRatio = max > 0 ? el.scrollTop / max : 0;
  }

  // Tap sul testo argomento (mobile): alternativa rapida per aprire/chiudere i commenti.
  let touchStartX = 0;
  let touchStartY = 0;
  let mobileBottomScrollTriggered = false;
  const MOBILE_TAP_THRESHOLD = 12;
  const MOBILE_SWIPE_THRESHOLD = 48;
  const MOBILE_BOTTOM_SCROLL_THRESHOLD = 36;

  function isPageScrollAtBottom(): boolean {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    return window.scrollY >= maxScroll - 6;
  }

  function mobileTouchStart(e: TouchEvent) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    mobileBottomScrollTriggered = false;
  }

  function mobileTouchMove(e: TouchEvent) {
    if (!isMobile || phase !== 'topics' || mobileCardsVisible || isTransitioning || cardsScrollAnimating) return;
    if (!isPageScrollAtBottom() || mobileBottomScrollTriggered) return;
    const dy = touchStartY - e.touches[0].clientY;
    if (dy > MOBILE_BOTTOM_SCROLL_THRESHOLD) {
      mobileBottomScrollTriggered = true;
      handleTopicsForwardNavigation();
    }
  }

  function mobileTouchEnd(e: TouchEvent) {
    if (isTransitioning || cardsScrollAnimating) return;

    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartX;
    const dy = touchStartY - touch.clientY;

    if (phase === 'feedback') return;

    if (phase !== 'topics') return;

    if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > MOBILE_SWIPE_THRESHOLD) {
      if (dy > 0) {
        if (mobileCardsVisible) {
          if (cardsScrollRef?.contains(e.target as Node) && !cardsScrollAtBottom()) return;
          handleTopicsForwardNavigation();
        } else {
          handleTopicsForwardNavigation();
        }
      } else if (dy < 0) {
        if (mobileCardsVisible) {
          if (cardsScrollRef?.contains(e.target as Node) && !cardsScrollAtTop()) return;
          handleTopicsBackwardNavigation();
        } else if (currentTopic > 0) {
          goPrev();
        }
      }
      return;
    }

    if (Math.hypot(dx, dy) > MOBILE_TAP_THRESHOLD) return;
    if (mobileCardsVisible && cardsScrollRef && cardsScrollRef.contains(e.target as Node)) return;
    if (!stageTextEl) return;

    const rect = stageTextEl.getBoundingClientRect();
    if (
      touch.clientX >= rect.left &&
      touch.clientX <= rect.right &&
      touch.clientY >= rect.top &&
      touch.clientY <= rect.bottom
    ) {
      toggleMobileCardsPanel();
    }
  }

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
    if (isMobile) {
      mobileTopicsScrollComplete = true;
      topicsScrollLockY = window.scrollY;
      window.addEventListener('scroll', lockMobileTopicsPageScroll, { passive: true });
      tick().then(() => {
        updateTopicsModelFit({ relayout: true });
        lockTopicsMobileLayout();
      });
      setTimeout(() => {
        updateTopicsModelFit({ relayout: true });
        lockTopicsMobileLayout();
      }, 450);
    } else {
      lenisRef?.stop();
      window.addEventListener('wheel', onTopicsWheel, { passive: false, capture: true });
      tick().then(updateTopicsModelFit);
      setTimeout(updateTopicsModelFit, 450);
    }
  }

  function maybeIntroduceCards() {
    if (isMobile) return;
    if (cardsIntroduced || cardsScrollAnimating) return;
    cardsScrollAnimating = true;
    cardsIntroduced = true;
    gsap.set('.stage__right', { opacity: 1 });
    void tick().then(async () => {
      await cardStack?.animateIn();
      updateTopicsModelFit();
      cardsScrollAnimating = false;
    });
  }

  function maybeResetCards() {
    if (!cardsIntroduced || cardsScrollAnimating) return;
    cardsScrollAnimating = true;
    void cardStack?.animateOut().then(() => {
      cardsIntroduced = false;
      gsap.set('.stage__right', { opacity: 0 });
      gsap.set('.stage__right-heading', { opacity: 0 });
      cardStack?.resetHidden();
      cardsScrollAnimating = false;
      updateTopicsModelFit();
    });
  }

  function exitTopicsMode() {
    if (!topicsMode) return;
    topicsMode = false;
    if (isMobile) {
      window.removeEventListener('scroll', lockMobileTopicsPageScroll);
      topicsMobileLayoutLocked = false;
      scene3d?.unlockMobileFit();
      mobileTopicsScrollComplete = false;
      if (mobileCardsVisible) {
        mobileCardsVisible = false;
        mobileScrollRatio = 0;
        if (cardsScrollRef) cardsScrollRef.scrollTop = 0;
        cardStack?.resetHidden();
      }
    } else {
      window.removeEventListener('wheel', onTopicsWheel, { capture: true } as EventListenerOptions);
      lenisRef?.start();
    }
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
  function onWindowResize() {
    updateTopicsModelFit({ relayout: isMobile && phase === 'topics' });
    updateFeedbackModelFit();
  }

  onMount(() => {
    isMobile = window.innerWidth < 768;

    if (!browser || !sceneEl) return;

    let teardown: (() => void) | undefined;

    void (async () => {
      if ($overlayVisible) setTimeout(() => overlayVisible.set(false), 60);

      history.scrollRestoration = 'manual';
      window.scrollTo(0, 0);

      await tick();

      if (!sceneEl) return;

      gsap.registerPlugin(ScrollTrigger);

      // Lenis only on desktop (mobile has native touch scroll for GSAP)
      let lenis: Lenis | null = null;
      let lenisRaf: ((t: number) => void) | null = null;

      gsap.ticker.lagSmoothing(0);

      if (!isMobile) {
        lenis = new Lenis({ smoothWheel: true, lerp: 0.08 });
        lenis.scrollTo(0, { immediate: true });
        lenisRef = lenis;
        lenis.on('scroll', ScrollTrigger.update);
        lenisRaf = (t: number) => lenis!.raf(t * 1000);
        gsap.ticker.add(lenisRaf);
      } else {
        syncMobileBrowserChromeInset();
        window.visualViewport?.addEventListener('resize', syncMobileBrowserChromeInset);
        window.visualViewport?.addEventListener('scroll', syncMobileBrowserChromeInset);
        window.addEventListener('resize', syncMobileBrowserChromeInset);
        document.addEventListener('touchstart', mobileTouchStart, { passive: true });
        document.addEventListener('touchmove', mobileTouchMove, { passive: true });
        document.addEventListener('touchend', mobileTouchEnd, { passive: true });
      }
      window.addEventListener('resize', onWindowResize);

      const titleEl = sceneEl.querySelector<HTMLElement>('.hero-title')!;
      const textEl  = titleEl.querySelector<SVGTextElement>('.hero-title__text');

      gsap.set(titleEl,         { scaleY: 1, yPercent: 0, transformOrigin: 'bottom center' });
      gsap.set('.phrase, .phrase--multiline', { y: 30, autoAlpha: 0 });
      gsap.set('.stage__text',  { x: -30 });
      // On mobile, CSS class controls .stage__right opacity (no GSAP inline style so CSS class can win)
      if (!isMobile) gsap.set('.stage__right', { opacity: 0 });
      gsap.set('.stage__right-heading', { opacity: 0 });

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
      heroTl.fromTo('.phrase, .phrase--multiline',
        { autoAlpha: 0, y: 30 },
        { autoAlpha: 1, y: 0, ease: 'power2.out', duration: 0.20 },
        0.20
      );
      heroTl.to('.phrase, .phrase--multiline', { autoAlpha: 0, y: -20, ease: 'power2.in', duration: 0.15 }, 0.62);

      const proxy = { rot: 0, scale: topicsScaleMul(), appear: 0 };

      const threeTl = gsap.timeline({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        scrollTrigger: {
          trigger:           sceneEl,
          start:             () => `top+=${window.innerHeight * 1.85}`,
          end:               'bottom bottom',
          scrub:             1.2,
          onUpdate:          (self: { progress: number }) => {
            const progress = self.progress;
            const particleT = particleProgressFromScroll(progress);

            if (progress >= 0.77) maybeIntroduceCards();
            else maybeResetCards();

            scene3d?.setTransitionProgress(particleT);
            updateTopicsScrollLayout(particleT);

            if (particleT >= 1 && !topicsMode) {
              enterTopicsMode();
            } else if (particleT < 1 && topicsMode && !isMobile) {
              exitTopicsMode();
            }

            updateMobileTopicsScrollComplete(progress, particleT);
            updateMobileCardsFromScroll(progress);
          },
          onReverseComplete: () => {
            scene3d?.setTransitionProgress(0);
            scene3d?.setMobileLayoutBlend(0);
            exitTopicsMode();
            maybeResetCards();
          },
        } as any,
      });

      threeTl.fromTo(proxy, { appear: 0 }, {
        appear: 1, duration: 0.12,
        onUpdate: () => {
          scene3d?.setOpacity(proxy.appear);
          scene3d?.setScale(topicsScaleMul(isMobile && mobileCardsVisible));
        },
      }, 0);

      threeTl.to(proxy, {
        rot: Math.PI * 2, ease: 'none', duration: 0.46,
        onUpdate: () => scene3d?.setRotationY(proxy.rot),
      }, 0.06);

      threeTl.fromTo('.stage__text',
        { opacity: 0, x: -30 },
        { opacity: 1, x: 0, ease: 'power2.out', duration: 0.12 },
        0.74
      );

      threeTl.fromTo('.stage__right-heading',
        { opacity: 0 },
        { opacity: 1, ease: 'power2.out', duration: 0.12 },
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

        // Mobile: titolo centrato verticalmente sullo schermo (invece di ancorato al fondo)
        if (isMobile) {
          titleEl.style.bottom = 'auto';
          titleEl.style.top = `${Math.max(0, (window.innerHeight - svgH) / 2)}px`;
        }
      }
      if (window.scrollY < window.innerHeight * 0.15) {
        gsap.to(titleEl, { opacity: 1, duration: 0.12, ease: 'none' });
      }
    });

    // ── Tutte le risorse → refresh ScrollTrigger ──
    // NB: niente preload eager dei modelli risultato (rimosso 2026-07-03): per infrastrutture
    // e sport erano 5 varianti da 14-21MB ciascuna (fino a ~90MB scaricati e decodificati in
    // background per niente, dato che ne serve solo una) — su mobile causava pressione di
    // memoria sufficiente a far ricaricare la scheda da sola (Safari, "reload infinito" su
    // sport). Il modello di risultato viene ora caricato on-demand in `morphToResult`, che
    // gestisce già correttamente l'attesa e gli eventuali errori (vedi Scene3D.svelte).
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
    });

      teardown = () => {
        exitTopicsMode();
        lenisRef = null;
        ctx.revert();
        if (lenisRaf) gsap.ticker.remove(lenisRaf);
        if (lenis) lenis.destroy();
        window.removeEventListener('resize', onWindowResize);
        if (isMobile) {
          window.visualViewport?.removeEventListener('resize', syncMobileBrowserChromeInset);
          window.visualViewport?.removeEventListener('scroll', syncMobileBrowserChromeInset);
          window.removeEventListener('resize', syncMobileBrowserChromeInset);
          window.removeEventListener('scroll', lockMobileTopicsPageScroll);
          document.removeEventListener('touchstart', mobileTouchStart);
          document.removeEventListener('touchmove', mobileTouchMove);
          document.removeEventListener('touchend', mobileTouchEnd);
        }
      };
    })();

    return () => teardown?.();
  });
</script>

<svelte:head>
  <title>{config.pageTitle}</title>
</svelte:head>

<section class="scene scene--{config.sectionId}" bind:this={sceneEl}>
  <div
    class="scene__viewport"
    class:scene__viewport--feedback={phase === 'feedback'}
    style={isMobile
      ? `--mobile-cards-scroll-height: ${MOBILE_CARDS_SCROLL_HEIGHT}px; --mobile-browser-chrome-bottom: ${mobileBrowserChromeBottom}px`
      : undefined}
  >

    <!-- Layer frost -->
    <div class="layer layer--frost">
      <FrostCanvas src={config.frostSrc} objectPosition={config.bgPosition} />
    </div>

    <!-- Layer bg -->
    <div
      class="layer layer--bg"
      style="background-image: url('{config.bgSrc}'); background-position: {config.bgPosition ?? 'center'}"
      aria-hidden="true"
    ></div>

    <!-- Titolone -->
    {#if config.heroTitleStyle === 'section'}
      <div
        class="hero-title hero-title--section"
        class:hero-title--spread={config.heroTitleLayout === 'spread'}
        role="img"
        aria-label={config.heroAriaLabel}
      >
        <SectionHeroTitle title={config.heroTitle} layout={config.heroTitleLayout ?? 'center'} />
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
      {#if config.phraseLines?.length}
        <div class="phrase phrase--multiline">
          {#each config.phraseLines as line}
            <p class="phrase__line">{line}</p>
          {/each}
        </div>
      {:else}
        <p class="phrase">{config.phrase}</p>
      {/if}
    </div>

    <!-- Layer 3D: canvas full-viewport, dietro la griglia -->
    <Scene3D
      bind:api={scene3d}
      modelSrc={config.modelSrc}
      onModelLoaded={() => resolveModelLoaded()}
      orbitEnabled={phase === 'feedback'}
      feedbackActive={phase === 'feedback'}
    />

    <!-- Stage: testo + card -->
    <div class="stage" class:stage--hidden={phase === 'feedback'}>

      <div
        class="stage__text"
        bind:this={stageTextEl}
        class:m-compact={isMobile && mobileCardsVisible}
        role="button"
        tabindex={isMobile && phase === 'topics' ? 0 : -1}
        onclick={() => { if (!isMobile) return; toggleMobileCardsPanel(); }}
        onkeydown={(e) => { if (isMobile && phase === 'topics' && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); toggleMobileCardsPanel(); } }}
      >
        <TextBlock
          title={topics[currentTopic].title}
          body={topics[currentTopic].body}
          source={topics[currentTopic].source ?? ''}
        />
      </div>

      <!-- colonna centrale vuota: spazio visivo per il modello 3D (desktop) -->
      <div aria-hidden="true"></div>

      <!-- Cards column -->
      <div class="stage__right" bind:this={stageRightEl} class:no-pointer={phase === 'feedback'} class:m-cards-visible={isMobile && mobileCardsVisible}>
        <p class="stage__right-heading">Metti like alle opinioni con cui sei d'accordo</p>
        <div class="stage__right-scroll-wrap">
          <div class="stage__right-scroll" bind:this={cardsScrollRef} onscroll={onCardsScroll}>
            <CardStack bind:api={cardStack} {cards} sectionId={config.sectionId} onToggleLike={toggleLike} topicIndex={currentTopic} />
          </div>
        </div>
      </div>

    </div>

    <!-- CTA in basso al centro (nascosto in feedback: usa feedback-bottom-cta) -->
    {#if phase !== 'feedback'}
    <div class="stage__cta">
      <div
        class="stage__cta-content"
        class:active={ctaActive}
        role="button"
        tabindex={ctaActive ? 0 : -1}
        aria-disabled={!ctaActive}
        onclick={handleCtaClick}
        onkeydown={(e) => { if (ctaActive && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); handleCtaClick(); } }}
      >
        <span class="cta-label">{ctaLabel}</span>
        <svg class="cta-chevron" viewBox="0 0 21 9" aria-hidden="true" fill="none">
          <path d="M1 1.35L10.5 7.65L20 1.35" stroke="#161A1F" stroke-width="1.5"
                stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
    </div>
    {/if}

    <!-- Mobile scroll indicator -->
    <div
      class="mobile-scroll-indicator"
      class:visible={isMobile && mobileCardsVisible}
      aria-hidden="true"
      style="--scroll-ratio: {mobileScrollRatio}"
    ></div>

    <!-- Overlay fase feedback -->
    {#if phase === 'feedback'}
      <div class="feedback-overlay">
        <div class="feedback-top" bind:this={feedbackTopEl} style="opacity: 0">
          <p class="feedback-title">{keepLastWordsTogether(FEEDBACK_HEADING.line1)}<br>{keepLastWordsTogether(FEEDBACK_HEADING.line2)}</p>
        </div>
        <p class="feedback-subtitle" bind:this={feedbackSubtitleEl} style="opacity: 0">
          {keepLastWordsTogether(getResultLabel())}
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
          <svg class="cta-chevron" viewBox="0 0 21 9" aria-hidden="true" fill="none">
            <path d="M1 1.35L10.5 7.65L20 1.35" stroke="#161A1F" stroke-width="1.5"
                  stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
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

  .scene--infrastructure .layer--frost::before {
    content: '';
    position: absolute;
    inset: -80px;
    z-index: 0;
    background-image: url('/images/frost-infrastructure.png');
    background-size: cover;
    background-position: center;
    filter: blur(23px) brightness(1.15) saturate(0.55) contrast(1.08);
    pointer-events: none;
  }

  .layer--bg {
    z-index: 0;
    background-size: cover;
    background-position: center;
    opacity: 0.10;
    pointer-events: none;
  }

  .layer--frost :global(.sharp) {
    opacity: 0.10;
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

  .hero-title--section.hero-title--spread {
    align-items: stretch;
    padding: 0;
    left: 0;
    right: 0;
    width: 100%;
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
    font-size: 36px;
    line-height: 1.1;
    color: var(--color-text-primary, #000000);
    opacity: 0;
    pointer-events: none;
  }

  .scene--sustainability .phrase-container {
    align-items: flex-start;
    justify-content: flex-start;
    padding-top: clamp(200px, 52vh, 500px);
    padding-left: clamp(24px, 5.556vw, 84px);
    padding-right: clamp(24px, 5.556vw, 79px);
    box-sizing: border-box;
  }

  .scene--sustainability .phrase {
    width: 100%;
    max-width: 1349px;
    text-align: left;
    font-size: 36px;
    color: #161a1f;
  }

  .scene--sport .phrase-container {
    align-items: flex-start;
    justify-content: flex-start;
    padding-top: clamp(200px, 52vh, 500px);
    padding-left: clamp(24px, 5.556vw, 84px);
    padding-right: clamp(24px, 5.556vw, 79px);
    box-sizing: border-box;
  }

  .scene--sport .phrase {
    width: 100%;
    max-width: 1349px;
    text-align: left;
    font-size: 36px;
    line-height: 1.1;
    color: #161a1f;
  }

  .scene--infrastructure .phrase-container {
    align-items: flex-start;
    justify-content: flex-start;
    padding-top: clamp(200px, 52vh, 500px);
    padding-left: clamp(24px, 5.556vw, 84px);
    padding-right: clamp(24px, 5.556vw, 79px);
    box-sizing: border-box;
  }

  .scene--infrastructure .phrase {
    width: 100%;
    max-width: 1349px;
    text-align: left;
    font-size: 36px;
    line-height: 1.1;
    color: #161a1f;
  }

  .phrase--multiline {
    display: flex;
    flex-direction: column;
    width: 100%;
    max-width: 1349px;
  }

  .phrase__line {
    margin: 0;
    line-height: 1.1;
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

  .stage--hidden {
    visibility: hidden;
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
    overflow: visible;
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

  .stage__right-scroll {
    overflow: visible;
  }

  /* ── CTA ─────────────────────────────────────────────────────────────── */
  .stage__cta {
    position: absolute;
    bottom: 12px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 10;
    pointer-events: none;
    opacity: 0;
    overflow: visible;
  }

  .stage__cta-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    padding: 0 14px 10px;
    opacity: 0.35;
    pointer-events: none;
    cursor: default;
    transition: opacity 300ms ease;
    overflow: visible;
  }

  .stage__cta-content.active {
    opacity: 1;
    pointer-events: auto;
    cursor: pointer;
  }

  .cta-label {
    font-family: 'Supreme Variable', sans-serif;
    font-weight: 700;
    font-size: 12px;
    line-height: 1;
    margin-top: -4px;
    text-transform: uppercase;
    color: #161A1F;
    white-space: nowrap;
  }

  .cta-chevron {
    display: block;
    width: 21px;
    height: 9px;
    flex-shrink: 0;
    overflow: visible;
  }

  .stage__cta-content.active .cta-chevron {
    animation: chevron-bounce 1.4s ease-in-out infinite;
  }

  @keyframes chevron-bounce {
    0%, 100% { transform: translateY(0); }
    50%       { transform: translateY(3px); }
  }

  /* ── Mobile scroll indicator (hidden on desktop) ─────────────────────── */
  .mobile-scroll-indicator {
    display: none;
  }

  /* ── Overlay feedback ────────────────────────────────────────────────── */
  .feedback-overlay {
    position: absolute;
    inset: 0;
    z-index: 10;
    pointer-events: none;
  }

  .feedback-top {
    position: absolute;
    top: 14vh;
    left: 0;
    right: 0;
    display: flex;
    justify-content: center;
    padding: 0 clamp(24px, 5.556vw, 84px);
    pointer-events: none;
  }

  .feedback-title {
    font-family: 'Supreme Variable', sans-serif;
    font-weight: 700;
    font-size: 36px;
    line-height: 1.25;
    color: #16181D;
    text-align: center;
    white-space: nowrap;
    text-wrap: balance;
  }

  .feedback-subtitle {
    position: absolute;
    bottom: 120px;
    left: 0;
    right: 0;
    text-align: left;
    font-family: 'Supreme Variable', sans-serif;
    font-weight: 400;
    font-size: 24px;
    line-height: 1.5;
    color: #16181D;
    pointer-events: none;
    max-width: 780px;
    margin: 0;
    padding: 0 clamp(24px, 5.556vw, 84px);
    text-wrap: pretty;
  }

  .feedback-bottom-cta {
    position: absolute;
    bottom: 12px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    padding: 0 14px 10px;
    cursor: pointer;
    pointer-events: auto;
    white-space: nowrap;
  }

  .feedback-bottom-cta .cta-chevron {
    animation: chevron-bounce 1.4s ease-in-out infinite;
  }

  /* ═══════════════════════════════════════════════════════════════════════
     MOBILE RESPONSIVE — same GSAP animations, adapted layout
     ═══════════════════════════════════════════════════════════════════════ */
  @media (max-width: 768px) {

    .scene__viewport {
      touch-action: pan-y;
      height: 100vh;
      height: 100lvh;
      --mobile-text-top: 108px;
      --mobile-phrase-top: 148px;
      --mobile-cards-bottom: 90px;
      --mobile-cta-bottom: 16px;
      --mobile-browser-chrome-bottom: 0px;
      --mobile-cards-scroll-height: calc(2 * 96px + 10px + 18px);
    }

    .scene__viewport--feedback {
      touch-action: none;
    }

    .scene {
      height: 600vh;
    }

    /* Titolone: centrato verticalmente sullo schermo (entrambe le varianti: center e spread) */
    .hero-title--section {
      justify-content: center;
    }

    /* Stage: single column, children absolutely positioned */
    .stage {
      display: block;
      padding: 0;
    }

    /* ── Text block: top of viewport ── */
    .stage__text {
      position: absolute;
      top: var(--mobile-text-top);
      left: 20px;
      right: 20px;
      width: auto;
      z-index: 5;
    }

    /* Topic title font size transition */
    .stage__text :global(.section-fact-block) {
      width: 100%;
      gap: 16px;
    }

    .stage__text :global(.section-fact-block__title) {
      font-size: 36px;
      transition: font-size 0.4s ease;
    }

    .stage__text.m-compact :global(.section-fact-block__title) {
      font-size: 24px;
    }

    .stage__text :global(.section-fact-block__body) {
      font-size: 20px;
      transition: font-size 0.4s ease;
    }

    .stage__text.m-compact :global(.section-fact-block__body) {
      font-size: 15px;
    }

    .stage__text :global(.section-fact-block__source) {
      font-size: 12px;
    }

    /* ── Cards column: posizione fissa (lvh), indipendente da CTA e barra browser ── */
    .stage__right {
      position: absolute;
      bottom: calc(var(--mobile-cards-bottom) + env(safe-area-inset-bottom, 0px));
      left: 0;
      right: 0;
      padding: 0 20px;
      width: 100%;
      height: auto;
      overflow: visible;
      flex-direction: column;
      gap: 8px;
      justify-self: unset;
      z-index: 5;
      pointer-events: none;
    }

    .stage__right.m-cards-visible {
      opacity: 1;
      pointer-events: auto;
      transition: opacity 0.3s ease;
    }

    .stage__right-heading {
      white-space: normal;
      font-size: 13px;
      line-height: 1.3;
    }

    /* Scrollable cards inner container.
       overflow-y: auto forces the browser to also clip overflow-x (spec rule:
       an axis can't stay 'visible' once the other is scrollable), which cut the
       cards' box-shadow/outline at the edges. Padding + matching negative margin
       gives that glow room to bleed without shifting the cards' visual position. */
    .stage__right-scroll-wrap {
      position: relative;
    }

    .stage__right-scroll {
      height: var(--mobile-cards-scroll-height);
      padding: 4px 16px 14px;
      margin: 0 -16px;
      overflow-y: auto;
      scrollbar-width: none;
      -webkit-overflow-scrolling: touch;
      overscroll-behavior: contain;
    }

    .stage__right-scroll :global(.card-stack) {
      padding-bottom: 4px;
    }

    .stage__right-scroll::-webkit-scrollbar {
      display: none;
    }

    .stage__right :global(.comment-card-glass) {
      max-width: 100%;
      box-shadow: none;
    }

    /* Ensure cards are visible when the cards panel is open (CSS fallback in case GSAP opacity animation is delayed) */
    .stage__right.m-cards-visible :global(.card-stack__item) {
      opacity: 1;
    }

    /* ── Mobile scroll indicator ── */
    .mobile-scroll-indicator {
      display: none;
      position: absolute;
      right: 6px;
      bottom: calc(var(--mobile-cards-bottom) + env(safe-area-inset-bottom, 0px));
      height: var(--mobile-cards-scroll-height);
      width: 3px;
      background: rgba(22, 26, 31, 0.12);
      border-radius: 2px;
      z-index: 20;
      overflow: hidden;
    }

    .mobile-scroll-indicator.visible {
      display: block;
    }

    .mobile-scroll-indicator::after {
      content: '';
      position: absolute;
      top: calc(var(--scroll-ratio, 0) * (100% - 44px));
      left: 0;
      right: 0;
      height: 44px;
      background: rgba(22, 26, 31, 0.4);
      border-radius: 2px;
      transition: top 0.12s ease;
    }

    /* ── Phrase: left-aligned intro text ── */
    .phrase-container {
      align-items: flex-start;
      justify-content: flex-start;
      padding-top: var(--mobile-phrase-top);
      padding-left: 20px;
      padding-right: 20px;
    }

    .phrase {
      text-align: left;
      font-size: 36px;
      width: 100%;
    }

    .phrase--multiline {
      width: 100%;
      max-width: none;
    }

    .phrase__line {
      line-height: 1.1;
    }

    .scene--sustainability .phrase-container,
    .scene--sport .phrase-container,
    .scene--infrastructure .phrase-container {
      padding-top: var(--mobile-phrase-top);
      padding-left: 20px;
      padding-right: 20px;
    }

    /* ── Feedback overlay adapted ── */
    .feedback-top {
      top: 16vh;
      padding: 0 20px;
      justify-content: center;
    }

    .feedback-title {
      font-size: 22px;
      white-space: normal;
      text-align: center;
      width: 100%;
    }

    .feedback-subtitle {
      font-size: 15px;
      bottom: 128px;
      padding: 0 20px;
      max-width: 100%;
      text-align: left;
    }

    .stage__cta {
      left: 0;
      right: 0;
      width: 100%;
      transform: none;
      bottom: 0;
      display: flex;
      justify-content: center;
      align-items: flex-end;
      padding-top: 148px;
      padding-bottom: max(
        calc(var(--mobile-cta-bottom) + 10px),
        calc(var(--mobile-browser-chrome-bottom, 0px) + env(safe-area-inset-bottom, 0px) + 10px)
      );
      box-sizing: border-box;
      background: transparent;
      overflow: visible;
      z-index: 15;
    }

    .stage__cta-content {
      padding: 18px 24px 18px;
    }

    .feedback-bottom-cta {
      bottom: max(8px, calc(var(--mobile-browser-chrome-bottom, 0px) + env(safe-area-inset-bottom, 0px)));
    }
  }
</style>
