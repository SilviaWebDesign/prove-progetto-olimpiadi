<!--
  ============================================================
  SECTION PAGE — [id] dynamic route
  ============================================================
  intro   — scroll-driven: frost + title + phrase + 3D
  topics  — model settled into particles; wheel navigates topics
  feedback— particles morph into the result model; overlay + blur

  Card stagger fires only on entering topics (first topic) and
  leaving towards feedback (last topic). Intermediate changes use
  a coordinated directional crossfade.
  ============================================================
-->

<script lang="ts">
  import { onMount, tick, untrack } from 'svelte';
  import { browser } from '$app/environment';
  import { afterNavigate, goto } from '$app/navigation';
  import gsap from 'gsap';
  import { ScrollTrigger } from 'gsap/ScrollTrigger';

  import FrostCanvas from '$lib/components/section/FrostCanvas.svelte';
  import SectionTitle from '$lib/components/section/SectionTitle.svelte';
  import Scene3D from '$lib/components/section/Scene3D.svelte';
  import type { Scene3DApi } from '$lib/components/section/Scene3D.svelte';
  import TextBlock from '$lib/components/section/TextBlock.svelte';
  import CardStack from '$lib/components/section/CardStack.svelte';
  import type { CardStackApi } from '$lib/components/section/CardStack.svelte';

  import { headerState, resetHeaderState } from '$lib/stores/header';
  import { lenisStore } from '$lib/stores/scroll';
  import { isMobile } from '$lib/stores/viewport';
  import { progress, allSectionsCompleted, SECTION_ORDER } from '$lib/stores/progress';
  import { computeOpinionState } from '$lib/utils/result';
  import { FEEDBACK_HEADING } from '$lib/data/feedback';
  import { get } from 'svelte/store';
  import type { OpinionState } from '$lib/types';
  import type { PageData } from './$types';
  import { overlayVisible } from '$lib/stores/pageTransition';
  import { sectionState } from '$lib/stores/sectionState';

  interface Props {
    data: PageData;
  }
  let { data }: Props = $props();
  let section = $derived(data.section);

  let scrollArea = $state<HTMLDivElement | null>(null);
  let sceneEl = $state<HTMLDivElement | null>(null);
  let titleWrap = $state<HTMLDivElement | null>(null);
  let frostLayer = $state<HTMLDivElement | null>(null);
  let phraseEl = $state<HTMLParagraphElement | null>(null);
  let scene3d = $state<Scene3DApi | undefined>(undefined);
  let cardStack = $state<CardStackApi | undefined>(undefined);
  // Mobile topics: false = mode A (expanded text, object below), true = mode B
  // (compact text + comments visible, object shrunk between them). Desktop ignores it.
  let mobileCardsVisible = $state(false);
  let textFading = false;

  // Toggle mobile topics A/B with a CROSS-FADE (smart-animate feel): fade the
  // text out, swap the size class while it's invisible, fade back in. No
  // font-size transition -> no visible scaling/sliding.
  function setMobileCards(next: boolean) {
    if (next === mobileCardsVisible || textFading) return;
    textFading = true;
    gsap.to('.stage__text', {
      opacity: 0,
      duration: 0.22,
      ease: 'power2.in',
      onComplete: () => {
        mobileCardsVisible = next;
        requestAnimationFrame(() => {
          gsap.to('.stage__text', {
            opacity: 1,
            duration: 0.28,
            ease: 'power2.out',
            onComplete: () => { textFading = false; }
          });
        });
      }
    });
  }

  let currentTopic = $state(0);
  let topicLikes = $state<Record<string, boolean>[]>(
    untrack(() => section.topics.map(() => ({})))
  );
  let currentResult = $state<OpinionState | null>(null);
  let isTransitioning = $state(false);
  // Set while goToSectionStart() rewinds to the intro, so the scroll-driven
  // auto-enter can't bounce us back into topics before we reach the top.
  let returningToStart = false;

  type Phase = 'intro' | 'topics' | 'feedback';
  let phase = $state<Phase>('intro');
  let restored = $state(false);

  // #8 — tell a reload apart from a fresh (re)entry.
  // resumeFromSave is true ONLY on a real page load / reload ('enter'); on menu
  // re-selection or "next section" navigation we always restart from the intro,
  // keeping any likes already given (they reappear when the user reaches topics).
  let resumeFromSave = $state(false);
  let navHandled = false;

  afterNavigate((nav) => {
    if (navHandled) return; // only react to the navigation that mounted us
    navHandled = true;

    const saved = sectionState.read(section.id);
    resumeFromSave = nav.type === 'enter';

    if (saved) {
      // Likes are always remembered, so the user sees them again.
      if (saved.topicLikes.length === section.topics.length) {
        topicLikes = saved.topicLikes;
      }
      // Phase / current topic / result come back only on a real reload.
      if (resumeFromSave) {
        currentTopic = saved.currentTopic;
        currentResult = saved.currentResult;
      }
    }
    restored = true;
  });

  const TOPICS_SCALE = 0.48;
  const INTRO_MODEL_SCALE = 0.85; // model size when it first appears (before shrinking to TOPICS_SCALE)
  const INTRO_MODEL_Y_OFFSET = -0.10; // model starts slightly lower, rises into place as it fades in

  let inIntro = $derived(phase === 'intro');
  let lastTopic = $derived(section.topics.length - 1);
  // Shuffle each topic's comments once per session, so positive and negative
  // are interspersed (not always 3 positive then 3 negative). Likes are keyed
  // by comment id, so the reorder is purely visual.
  function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  const shuffledComments = untrack(() => section.topics.map((t) => shuffle(t.comments)));

  let topic = $derived(section.topics[currentTopic]);
  let counter = $derived(`${currentTopic + 1} / ${section.topics.length}`);
  let anyLiked = $derived(Object.values(topicLikes[currentTopic]).some(Boolean));
  let feedbackBody = $derived(currentResult ? section.feedback[currentResult] : '');

  let resultPaths = $derived([
    `/models/${section.id}-positive.glb`,
    `/models/${section.id}-negative.glb`,
    `/models/${section.id}-more-positive.glb`,
    `/models/${section.id}-more-negative.glb`,
    `/models/${section.id}-neutral.glb`
  ]);

  function resultPathFor(state: OpinionState): string {
    const map: Record<OpinionState, string> = {
      ALL_POSITIVE: `/models/${section.id}-positive.glb`,
      ALL_NEGATIVE: `/models/${section.id}-negative.glb`,
      MOSTLY_POSITIVE: `/models/${section.id}-more-positive.glb`,
      MOSTLY_NEGATIVE: `/models/${section.id}-more-negative.glb`,
      NEUTRAL: `/models/${section.id}-neutral.glb`
    };
    return map[state];
  }

  function toggleLike(commentId: string) {
    const current = topicLikes[currentTopic];
    topicLikes[currentTopic] = { ...current, [commentId]: !current[commentId] };
    scene3d?.pulse();
  }

  function crossfadeTopic(direction: 1 | -1, applyChange: () => void): Promise<void> {
    return new Promise((resolve) => {
      const textTargets = '.stage__text, .stage__heading';
      const outY = direction === 1 ? -40 : 40;
      const inY = direction === 1 ? 40 : -40;

      const tl = gsap.timeline({ onComplete: resolve });

      // 1) fade the current content out
      tl.to([textTargets, '.card-stack__item'], {
        opacity: 0,
        y: outY,
        duration: 0.4,
        ease: 'power2.in'
      });

      // 2) swap the topic (new cards mount at opacity 0)
      tl.add(() => {
        applyChange();
      });

      // 3) after the DOM updates, place the new content and fade it in
      tl.add(async () => {
        await tick();
        gsap.set([textTargets, '.card-stack__item'], { opacity: 0, y: inY });
        gsap.to([textTargets, '.card-stack__item'], {
          opacity: 1,
          y: 0,
          duration: 0.5,
          ease: 'power2.out'
        });
      });
    });
  }

  async function goNext() {
    if (!anyLiked || isTransitioning) return;
    if (currentTopic === lastTopic) {
      enterFeedbackPhase();
      return;
    }
    scene3d?.resetPulse();
    isTransitioning = true;
    await crossfadeTopic(1, () => {
      currentTopic += 1;
    });
    isTransitioning = false;
  }

  async function goPrev() {
    if (isTransitioning || currentTopic === 0) return;
    scene3d?.resetPulse();
    isTransitioning = true;
    await crossfadeTopic(-1, () => {
      currentTopic -= 1;
    });
    isTransitioning = false;
  }


  function enterTopicsMode() {
    if (phase !== 'intro') return;
    phase = 'topics';
    get(lenisStore)?.stop();
    scene3d?.settle();
    void (async () => {
      await tick();
      // the CardStack api can bind a frame or two after phase flips to 'topics';
      // wait for it, otherwise the entrance is skipped and the cards stay hidden (#3)
      for (let i = 0; i < 20 && !cardStack; i++) {
        await new Promise((r) => requestAnimationFrame(r));
      }
      await cardStack?.animateIn();
    })();
  }


function exitTopicsMode() {
    if (phase !== 'topics') return;
    phase = 'intro';
    scene3d?.unsettle(() => get(lenisStore)?.start());
  }

 
  const FEEDBACK_BODY_MAX_LINES = 3;
  const FEEDBACK_BODY_MAX_FONT = 24; 
  const FEEDBACK_BODY_MIN_FONT = 14; 
  const FEEDBACK_BODY_LINE_HEIGHT = 1.5;

  function fitFeedbackBody() {
    const el = document.querySelector<HTMLElement>('.feedback__body');
    if (!el) return;
    let fs = FEEDBACK_BODY_MAX_FONT;
    el.style.fontSize = `${fs}px`;
    // step down 1px at a time until it fits in <= max lines or hits the floor
    while (fs > FEEDBACK_BODY_MIN_FONT) {
      const lines = Math.round(el.scrollHeight / (fs * FEEDBACK_BODY_LINE_HEIGHT));
      if (lines <= FEEDBACK_BODY_MAX_LINES) break;
      fs -= 1;
      el.style.fontSize = `${fs}px`;
    }
  }

  async function enterFeedbackPhase() {
    if (phase !== 'topics' || isTransitioning || !anyLiked) return;
    isTransitioning = true;

    const OUT = 0.5;
    gsap.to('.stage__text', { opacity: 0, y: -8, duration: OUT, ease: 'power3.inOut' });
    gsap.to('.stage__heading', { opacity: 0, duration: OUT * 0.6, ease: 'power3.inOut' });
    gsap.to('.continue', { opacity: 0, duration: OUT * 0.6, ease: 'power2.inOut' });
    await cardStack?.animateOut();

    const result = computeOpinionState(section, topicLikes);
    currentResult = result;
    progress.markCompleted(section.id, result);

    gsap.to('.layer--bg', { filter: 'blur(12px)', duration: 0.8, ease: 'power2.inOut' });

    scene3d?.morphToResult(resultPathFor(result), () => {
      phase = 'feedback';
      isTransitioning = false;
      void tick().then(() => {
        gsap.fromTo('.feedback__heading', { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'power2.out' });
        gsap.fromTo('.feedback__body', { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'power2.out', delay: 0.15 });
        gsap.fromTo('.feedback__cta', { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'power2.out', delay: 0.25 });
      });
    });
  }

  async function exitFeedbackPhase() {
    if (phase !== 'feedback' || isTransitioning) return;
    isTransitioning = true;

    const OUT = 0.35;
    gsap.to('.feedback__heading', { opacity: 0, duration: OUT });
    gsap.to('.feedback__body', { opacity: 0, duration: OUT });
    gsap.to('.feedback__cta', { opacity: 0, duration: OUT });
    await new Promise<void>((r) => setTimeout(r, OUT * 1000));

    gsap.to('.layer--bg', { filter: 'none', duration: 0.6, ease: 'power2.inOut' });
    scene3d?.returnToParticles();
    currentResult = null;
    phase = 'topics';
    await tick();

    gsap.fromTo('.stage__text', { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.inOut' });
    gsap.fromTo('.stage__heading', { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'power3.inOut', delay: 0.04 });
    await tick();
    await cardStack?.animateIn();
    gsap.to('.continue', { opacity: 1, duration: 0.3, delay: 0.1 });
    isTransitioning = false;
  }

  async function goToSectionStart() {
    if (isTransitioning) return;

    // From feedback OR topics, the header title rewinds to the intro at the top.
    // We deliberately DON'T call exitFeedbackPhase() here: it rebuilds the whole
    // topics UI (card entrance, stage fades, .continue) only for us to hide it
    // again — which left a ghost CTA and, with the scroll parked at the bottom,
    // let ScrollTrigger re-enter topics (the jumps / lock). Tear down to intro.
    if (phase === 'feedback' || phase === 'topics') {
      const fromFeedback = phase === 'feedback';
      isTransitioning = true;
      returningToStart = true;

      if (fromFeedback) {
        gsap.to('.layer--bg', { filter: 'none', duration: 0.3, ease: 'power2.inOut' });
        scene3d?.returnToParticles();
      }

      // Rewind to the very start of the section and reset it COMPLETELY: first
      // topic, no result, likes/choices cleared, and this section removed from
      // progress (redoing it from scratch, desktop fix A4).
      currentTopic = 0;
      currentResult = null;
      topicLikes = section.topics.map(() => ({}));
      progress.clearSection(section.id);
      phase = 'intro';
      scene3d?.setScale(INTRO_MODEL_SCALE); // reset from TOPICS_SCALE so the intro model isn't stuck small
      scene3d?.resetOrientation(); // reset any rotation done in the feedback (S5)
      // Clear leftover GSAP inline styles from earlier topic crossfades so the
      // topic texts re-enter clean when the user scrolls back down.
      gsap.set(['.stage__text', '.stage__heading'], { clearProps: 'opacity,transform' });
      await tick();

      // Drop GSAP inline styles so the CSS visibility classes win again.
      gsap.set('.continue', { clearProps: 'opacity' });

      const lenis = get(lenisStore);
      lenis?.start();
      lenis?.scrollTo(0, { immediate: true, force: true });
      ScrollTrigger.update();

      scene3d?.unsettle(() => {
        lenis?.scrollTo(0, { immediate: true, force: true });
        ScrollTrigger.update();
        // release the suppression once we've settled at the very top
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            ScrollTrigger.update();
            returningToStart = false;
            isTransitioning = false;
          })
        );
      });
      return;
    }

    get(lenisStore)?.scrollTo(0, { immediate: true, force: true });
  }

  async function goToNextSection() {
    get(lenisStore)?.start();
    overlayVisible.set(true);
    await new Promise<void>((r) => setTimeout(r, 400));
    const i = SECTION_ORDER.indexOf(section.id);
    const next = SECTION_ORDER[(i + 1) % SECTION_ORDER.length];
    goto(`/sections/${next}`);
  }

  
  async function goToResults() {
    get(lenisStore)?.start();
    overlayVisible.set(true);
    await new Promise<void>((r) => setTimeout(r, 400));
    goto('/results');
  }

  function finishFeedback() {
    if (get(allSectionsCompleted)) {
      goToResults();
    } else {
      goToNextSection();
    }
  }

  let modelLoaded = $state(false);

 
  $effect(() => {
    if (!restored) return;
    sectionState.save(section.id, {
      currentTopic,
      topicLikes: $state.snapshot(topicLikes),
      phase,
      currentResult
    });
  });

  let sceneRestored = $state(false);
  $effect(() => {
    if (sceneRestored || !restored || !modelLoaded || !resumeFromSave) return;
    const saved = sectionState.read(section.id);
    if (saved?.phase !== 'topics' && saved?.phase !== 'feedback') return;

    sceneRestored = true;
    scene3d?.setScale(TOPICS_SCALE);

    if (saved.phase === 'topics') {
      scene3d?.snapToParticles();
      void tick().then(() => cardStack?.animateIn());
    } else {
      // feedback: show the result model formed, blur the backdrop.
      if (currentResult) scene3d?.snapToResult(resultPathFor(currentResult));
      gsap.set('.layer--bg', { filter: 'blur(12px)' });
    }
  });

  // Re-fit the feedback body whenever it appears or its text changes.
  $effect(() => {
    if (phase === 'feedback' && feedbackBody) {
      void tick().then(fitFeedbackBody);
    }
  });

  onMount(() => {
    if (!browser || !scrollArea || !titleWrap || !frostLayer || !phraseEl) return;

    // State restore (likes / topic / result) is handled in afterNavigate above,
    // so it can tell a reload apart from a menu re-selection (#8).
    const saved = sectionState.read(section.id);

    // Reveal this section by fading out the navigation veil.
    if (get(overlayVisible)) {
      setTimeout(() => overlayVisible.set(false), 60);
    }

    history.scrollRestoration = 'manual';

    // Fresh entry: reset the persistent Lenis scroll right away (see #2). Re-asserted
    // in the deferred block below once the layout settles.
    resetScrollToTop();

    headerState.update((s) => ({
      ...s,
      sectionTitle: section.title,
      onSectionTitleClick: goToSectionStart
    }));

    const ctx = gsap.context(() => {
      const heroTl = gsap.timeline({
        scrollTrigger: {
          trigger: scrollArea,
          start: 'top top',
          end: () => `+=${window.innerHeight * 1.5}`,
          scrub: 1.2
        }
      });

      heroTl.fromTo(
        titleWrap,
        { yPercent: 0, opacity: 1 },
        { yPercent: -100, opacity: 0, ease: 'power3.inOut' },
        0
      );
      heroTl.fromTo(frostLayer, { opacity: 1 }, { opacity: 0, ease: 'power2.inOut' }, 0);
      heroTl.fromTo(phraseEl, { opacity: 0, y: 40 }, { opacity: 1, y: 0, ease: 'power2.out' }, 0.35);
      heroTl.to(phraseEl, { opacity: 0, y: -40, ease: 'power2.in' }, 0.7);

      const proxy = { rot: 0, scale: INTRO_MODEL_SCALE, appear: 0, posY: INTRO_MODEL_Y_OFFSET };

      const threeTl = gsap.timeline({
        scrollTrigger: {
          trigger: scrollArea,
          start: () => `top+=${window.innerHeight * 1.85} top`,
          end: 'bottom bottom',
          scrub: 1.2,
          onUpdate: (self) => {
            // Ignore the auto-enter while rewinding to the intro: the scroll can
            // still be parked near the bottom (progress ~1) and would bounce us
            // straight back into topics (jumps / lock / ghost CTA).
            if (returningToStart) return;
            if (self.progress >= 0.999) enterTopicsMode();
          },
          onLeaveBack: () => exitTopicsMode()
        }
      });

      threeTl.fromTo(
        proxy,
        { appear: 0 },
        { appear: 1, duration: 0.12, onUpdate: () => scene3d?.setOpacity(proxy.appear) },
        0
      );
      threeTl.fromTo(
        proxy,
        { posY: INTRO_MODEL_Y_OFFSET },
        { posY: 0, duration: 0.12, ease: 'power2.out', onUpdate: () => scene3d?.setPositionY(proxy.posY) },
        0
      );
      threeTl.to(
        proxy,
        { rot: Math.PI * 2, ease: 'none', duration: 0.46, onUpdate: () => scene3d?.setRotationY(proxy.rot) },
        0.06
      );
      threeTl.to(
        proxy,
        { scale: TOPICS_SCALE, ease: 'power2.inOut', duration: 0.46, onUpdate: () => scene3d?.setScale(proxy.scale) },
        0.06
      );

      ScrollTrigger.create({
        trigger: scrollArea,
        start: () => `top+=${window.innerHeight * 0.5} top`,
        onEnter: () => headerState.update((s) => ({ ...s, showSection: true })),
        onLeaveBack: () => headerState.update((s) => ({ ...s, showSection: false }))
      });
    }, scrollArea);

    const windowLoaded = new Promise<void>((resolve) => {
      if (document.readyState === 'complete') resolve();
      else window.addEventListener('load', () => resolve(), { once: true });
    });

    function resetScrollToTop() {
    // Fresh entry (menu re-selection / "next section"): Lenis is a persistent
    // singleton that keeps the previous section's scroll position across SPA
    // navigation, so without this the intro opens scrolled down (#2).
    if (resumeFromSave) return;
    const lenis = get(lenisStore);
    lenis?.start();
    lenis?.scrollTo(0, { immediate: true, force: true });
    ScrollTrigger.update();
    }

     function restoreScrollForPhase() {
      if (!resumeFromSave || !saved) return;
      if (saved.phase !== 'topics' && saved.phase !== 'feedback') return;
      phase = saved.phase; // guards in enter/exitTopicsMode now bail out
      const lenis = get(lenisStore);
      lenis?.scrollTo(document.documentElement.scrollHeight, {
        immediate: true,
        force: true
      });
      ScrollTrigger.update();
      lenis?.stop();
    }

      windowLoaded.then(() => {
      ScrollTrigger.refresh();
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          ScrollTrigger.refresh();
          resetScrollToTop();
          restoreScrollForPhase();
        })
      );
      // On mobile, don't eagerly preload all result models: loading several GLBs at
      // once spikes memory and crashes the tab on mobile Safari. The one needed model
      // still loads on demand in morphToResult when the user reaches the feedback.
      if (!$isMobile) {
        if ('requestIdleCallback' in window) {
          (
            window as Window & {
              requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => void;
            }
          ).requestIdleCallback(() => scene3d?.preloadResultModels(), { timeout: 1000 });
        } else {
          setTimeout(() => scene3d?.preloadResultModels(), 2000);
        }
      }
    });

    let wheelLock = false;

    // --- touch input (mobile): mirrors onWheel branch-by-branch so the sections
    //     behave the same under a finger. One discrete action per swipe. ---
    const TOUCH_TOPIC_THRESHOLD = 40; // px of swipe to advance one topic
    let touchLastY = 0;
    let touchAccum = 0; // swipe distance accumulated within the current gesture
    let touchSwiped = false; // whether this gesture already fired a discrete action

    // --- intro snap: settle the frost/phrase scroll onto rest beats ---
    const INTRO_SNAP_IDLE_MS = 150; // snap after the scroll pauses
    const PHRASE_BEAT = 0.75; // viewport-height fraction where the phrase rests
    const INTRO_COMMIT = 1.65; // beyond this (x vh) scroll is free (heading to the 3D)
    const INTRO_COMMIT_FRAC = 0.2; // #11 — how far into a gap a deliberate scroll must go
                                   // to commit to the next beat (lower = more forgiving/forward)
    let introSnapTimer: ReturnType<typeof setTimeout> | null = null;
    let introDir = 1; // last intro wheel direction: 1 = down, -1 = up

    function introSnap() {
      if (phase !== 'intro') return;
      const vh = window.innerHeight;
      const y = window.scrollY;
      if (y > vh * INTRO_COMMIT) return; // committed to the 3D reveal -> leave it free

      const title = 0;
      const phraseY = vh * PHRASE_BEAT;

      // Directional commit (like the home scroll): a deliberate scroll settles onto
      // the beat it heads TOWARD, instead of the geometrically nearest one — so a
      // small downward move no longer gets thrown back to the title (#11).
      let target: number;
      if (y <= phraseY) {
        const progress = (y - title) / (phraseY - title || 1); // 0..1 within the gap
        target =
          introDir > 0
            ? progress > INTRO_COMMIT_FRAC ? phraseY : title
            : progress < 1 - INTRO_COMMIT_FRAC ? title : phraseY;
      } else {
        // past the phrase, in the run-up to the 3D reveal:
        // scrolling down flows on (no snap-back); scrolling up settles on the phrase
        if (introDir > 0) return;
        target = phraseY;
      }

      const dist = Math.abs(target - y);
      if (dist < 4) return;
      // duration scales with distance -> tiny fixes feel instant, no springy bounce
      const duration = Math.min(0.7, 0.18 + (dist / vh) * 0.6);
      get(lenisStore)?.scrollTo(target, {
        duration,
        easing: (t: number) => Math.sin((t * Math.PI) / 2) // easeOutSine, no overshoot
      });
    }

    function onWheel(e: WheelEvent) {
      if (phase === 'intro') {
        // free scroll, but settle onto the intro beat we're heading toward on pause
        if (e.deltaY !== 0) introDir = e.deltaY > 0 ? 1 : -1;
        if (introSnapTimer) clearTimeout(introSnapTimer);
        introSnapTimer = setTimeout(introSnap, INTRO_SNAP_IDLE_MS);
        return;
      }

      if (phase === 'topics') {
        // Mode B (mobile): let the comments scroll natively; only advance the topic
        // once the comments hit their edge (matches the prototype).
        if (mobileCardsVisible) {
          const el = e.target as Element | null;
          const sc = el && (el.closest('.stage__right-scroll') as HTMLElement | null);
          if (sc) {
            const atBottom = sc.scrollHeight - sc.scrollTop - sc.clientHeight < 8;
            const atTop = sc.scrollTop < 8;
            if ((e.deltaY > 0 && !atBottom) || (e.deltaY < 0 && !atTop)) return;
          }
        }

        const goingDown = e.deltaY > 0;

        // guards first, so leftover scroll momentum can't fire another action
        if (wheelLock || isTransitioning) {
          e.preventDefault();
          return;
        }
        if (Math.abs(e.deltaY) < 10) return;

        // at the first topic, scrolling up leaves topics mode
        if (!goingDown && currentTopic === 0) {
          wheelLock = true;
          exitTopicsMode();
          setTimeout(() => {
            wheelLock = false;
          }, 1000);
          return;
        }

        e.preventDefault();
        wheelLock = true;
        if (goingDown) goNext();
        else goPrev();
        setTimeout(() => {
          wheelLock = false;
        }, 1000);
        return;
      }

      if (phase === 'feedback') {
        e.preventDefault();
        // Scrolling DOWN advances like the CTA (the whole site is scroll-driven,
        // so users expect scroll to continue). Scrolling up stays disabled
        // (one-way, approach A: no going back to topics).
        if (wheelLock || isTransitioning) return;
        if (e.deltaY > 10) {
          wheelLock = true;
          finishFeedback();
          setTimeout(() => { wheelLock = false; }, 1000);
        }
      }
    }

    function onTouchStart(e: TouchEvent) {
      if (e.touches.length !== 1) return;
      touchLastY = e.touches[0].clientY;
      touchAccum = 0;
      touchSwiped = false;
    }

    function onTouchMove(e: TouchEvent) {
      if (e.touches.length !== 1) return;
      const y = e.touches[0].clientY;
      const dy = touchLastY - y; // finger up = positive = "scroll down" (matches wheel sign)
      touchLastY = y;

      if (phase === 'intro') {
        // let native/Lenis scroll drive the reveal; we only track direction for the snap
        if (dy !== 0) introDir = dy > 0 ? 1 : -1;
        if (introSnapTimer) clearTimeout(introSnapTimer);
        introSnapTimer = setTimeout(introSnap, INTRO_SNAP_IDLE_MS);
        return; // no preventDefault -> native scroll moves the intro
      }

      if (phase === 'topics') {
        // In mode B (mobile), let the comments list scroll natively instead of
        // hijacking the gesture for topic navigation.
        if (mobileCardsVisible) {
          // Mode B: let the comments scroll natively; only advance once at the edge.
          const el = e.target as Element | null;
          const sc = el && (el.closest('.stage__right') as HTMLElement | null);
          if (sc) {
            const atBottom = sc.scrollHeight - sc.scrollTop - sc.clientHeight < 8;
            const atTop = sc.scrollTop < 8;
            if ((dy > 0 && !atBottom) || (dy < 0 && !atTop)) return; // comments own this touch
          }
        }
        e.preventDefault(); // we own the gesture: no native scroll in topics
        if (wheelLock || isTransitioning || touchSwiped) return;
        touchAccum += dy;
        if (Math.abs(touchAccum) < TOUCH_TOPIC_THRESHOLD) return;

        const goingDown = touchAccum > 0;
        touchSwiped = true; // one discrete action per swipe (like wheelLock for the wheel)

        // at the first topic, swiping down (content up) leaves topics mode
        if (!goingDown && currentTopic === 0) {
          wheelLock = true;
          exitTopicsMode();
          setTimeout(() => (wheelLock = false), 1000);
          return;
        }
        wheelLock = true;
        if (goingDown) goNext();
        else goPrev();
        setTimeout(() => (wheelLock = false), 1000);
        return;
      }

      if (phase === 'feedback') {
        e.preventDefault(); // one-way: no scrolling back on touch either
      }
    }

    function onTouchEnd() {
      touchAccum = 0;
      touchSwiped = false;
      if (phase === 'intro') {
        if (introSnapTimer) clearTimeout(introSnapTimer);
        introSnapTimer = setTimeout(introSnap, INTRO_SNAP_IDLE_MS);
      }
    }

    const onFeedbackResize = () => {
      if (phase === 'feedback') fitFeedbackBody();
    };
    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('resize', onFeedbackResize);
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', onFeedbackResize);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      if (introSnapTimer) clearTimeout(introSnapTimer);
      ctx.revert();
      resetHeaderState();
    };
  });
</script>

<svelte:head>
  <title>{section.title} — Quante facce ha una medaglia?</title>
</svelte:head>


<div class="scroll-area" bind:this={scrollArea}>
  <div class="scene" bind:this={sceneEl}>
    <div class="layer layer--bg" style="background-image: url({section.frostImage})"></div>

    <div class="layer layer--frost" class:is-hidden={!inIntro} bind:this={frostLayer}>
      <FrostCanvas src={section.frostImage} />
    </div>

    <div class="layer layer--model">
      <Scene3D
        modelSrc={section.glbPath}
        fitFactor={section.modelFitFactor}
        resultScale={section.resultScale}
        resultPaths={resultPaths}
        orbitEnabled={phase === 'feedback'}
        onModelLoaded={() => (modelLoaded = true)}
        bind:api={scene3d}
      />
    </div>

    <div class="hero-title" class:is-hidden={!inIntro} bind:this={titleWrap}>
      <SectionTitle id={section.id} title={section.title} />
    </div>

    <div class="phrase-anchor" class:is-hidden={!inIntro}>
      <p class="phrase" bind:this={phraseEl}><span class="phrase__text">{$isMobile && section.descriptionMobile ? section.descriptionMobile : section.description}</span></p>
    </div>

    <!-- ── Topics stage ── -->
    <div class="stage" class:is-visible={phase === 'topics'} class:m-cards-visible={mobileCardsVisible}>
      <div
        class="stage__text"
        role="button"
        tabindex="0"
        onclick={() => { if ($isMobile) setMobileCards(!mobileCardsVisible); }}
        onkeydown={(e) => { if ($isMobile && (e.key === 'Enter' || e.key === ' ')) setMobileCards(!mobileCardsVisible); }}
      >
        <TextBlock {counter} title={topic.title} body={topic.description} sources={topic.sources} />
      </div>

      <div class="stage__center" aria-hidden="true"></div>

      <div class="stage__right" class:no-pointer={phase !== 'topics'}>
        <h2 class="stage__heading">Metti like alle opinioni con cui sei d'accordo</h2>
        <div class="stage__right-scroll">
          <CardStack
            bind:api={cardStack}
            comments={shuffledComments[currentTopic]}
            sectionId={section.id}
            likes={topicLikes[currentTopic]}
            onToggleLike={toggleLike}
            topicId={topic.id}
            active={phase === 'topics'}
          />
        </div>
      </div>
    </div>

    <!-- ── "Continua" CTA ── -->
    <button
      class="continue"
      class:is-visible={phase === 'topics'}
      disabled={!anyLiked}
      onclick={goNext}
      aria-label={currentTopic === lastTopic ? 'Conferma le tue scelte' : 'Continua al prossimo argomento'}
    >
      <span class="continue__label">{currentTopic === lastTopic ? 'Conferma le tue scelte' : 'Continua'}</span>
      <svg class="continue__arrow" viewBox="0 0 25 10" fill="none" aria-hidden="true">
        <path d="M2 2l10.5 6 10.5-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>

    <!-- ── Feedback overlay ── -->
    {#if phase === 'feedback'}
      <div class="feedback">
        <p class="feedback__heading">{FEEDBACK_HEADING}</p>
        <p class="feedback__body">{feedbackBody}</p>
        <button
          class="feedback__cta"
          onclick={finishFeedback}
          aria-label={$allSectionsCompleted ? 'Scopri i tuoi risultati' : 'Continua il percorso'}
        >
          <span class="feedback__cta-label">
            {$allSectionsCompleted ? 'Scopri i tuoi risultati' : 'Continua il percorso'}
          </span>
          <svg class="feedback__cta-arrow" viewBox="0 0 25 10" fill="none" aria-hidden="true">
            <path d="M2 2l10.5 6 10.5-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
      </div>
    {/if}
  </div>
</div>


<style>
  .scroll-area {
    height: 500vh;
    position: relative;
  }

  .scene {
    position: sticky;
    top: 0;
    width: 100vw;
    height: 100dvh;
    overflow: hidden;
    background: var(--color-background-page);
  }

  .layer {
    position: absolute;
    inset: 0;
  }

  .layer--bg {
    z-index: 1;
    background-size: cover;
    background-position: center;
    opacity: 0.10;
    pointer-events: none;
  }

  .layer--frost {
    z-index: 2;
    overflow: hidden;
  }

  .layer--model {
    z-index: 3;
    pointer-events: none;
  }

  .hero-title {
    position: absolute;
    z-index: 4;
    inset: 0;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    transform-origin: bottom center;
    pointer-events: none;
    will-change: transform, opacity;
  }

  .phrase-anchor {
    position: absolute;
    z-index: 5;
    left: 0;
    right: 0;
    bottom: var(--page-gutter);
    padding: 0 var(--page-gutter);
    box-sizing: border-box;
    pointer-events: none;
  }

  .phrase {
    width: 100%;
    max-width: 89.22vw;
    height: 29.76vw;
    margin: 0;
    display: flex;
    align-items: center;
    text-align: left;
    white-space: pre-line; /* honor the explicit line breaks in the description */
    font-family: var(--font-family-body);
    font-weight: var(--font-weight-bold);
    font-size: 4.5vw;
    line-height: var(--line-height-tight);
    letter-spacing: -0.01em;
    color: var(--color-text-primary);
    opacity: 0;
    will-change: transform, opacity;
  }

  .phrase__text {
    width: 100%;
    /* Safari drops white-space:pre-line on flex containers, so the explicit
       newlines must live on the text node itself, not on the flex .phrase. */
    white-space: pre-line;
  }

  .layer--frost.is-hidden,
  .hero-title.is-hidden,
  .phrase-anchor.is-hidden {
    opacity: 0 !important;
    pointer-events: none;
  }

  /* ── Mobile (≤768px) intro: cover title centered, phrase large + top-anchored,
     calibrated to the 390px Figma frame (title 68 / phrase 36). ── */
  @media (max-width: 768px) {
    .hero-title {
      justify-content: center; /* cover title centered vertically like the Figma */
    }

    .phrase-anchor {
      top: 104px; /* sits below the header */
      bottom: auto;
    }
    .phrase {
      height: auto;
      align-items: flex-start;
      font-size: clamp(1.7rem, 8.2vw, 2.2rem); /* 32px @390 */
    }
  }

  .stage {
    position: absolute;
    inset: 0;
    z-index: 6;
    display: grid;
    grid-template-columns: 1fr 1.2fr 1fr;
    align-items: center;
    gap: var(--page-gutter);
    padding: 0 var(--page-gutter);
    box-sizing: border-box;
    opacity: 0;
    pointer-events: none;
    transition: opacity 600ms cubic-bezier(0.25, 1, 0.5, 1);
  }

  .stage.is-visible {
    opacity: 1;
    pointer-events: auto;
  }

  .stage__text {
    grid-column: 1;
    justify-self: start;
  }

  .stage__center {
    grid-column: 2;
  }

  .stage__right {
    grid-column: 3;
    justify-self: end;
    width: 385px;
    display: flex;
    flex-direction: column;
    gap: 19px;
    max-height: 100%;
  }

  .stage__right.no-pointer {
    pointer-events: none;
  }

  .stage__heading {
    margin: 0;
    text-align: center;
    font-family: var(--font-family-body);
    font-weight: var(--font-weight-bold);
    font-size: var(--font-size-xs); 
    line-height: var(--line-height-tight);
    color: var(--color-text-primary);
  }

  /* ── Mobile topics (S4.1): stack vertically; mode A = text + object (scene behind),
     mode B (.m-cards-visible) = text on top + comments at the bottom. ── */
  @media (max-width: 768px) {
    .stage {
      display: flex;
      flex-direction: column;
      grid-template-columns: none;
      gap: 0;
      align-items: stretch;
      justify-content: flex-start;
      padding: 96px var(--page-gutter) 0; /* below the header */
    }

    .stage__center {
      display: none;
    }

    .stage__text {
      justify-self: stretch;
      cursor: pointer; /* tap toggles mode A/B */
    }

    /* text block: fit the phone width (not the 437px desktop column), with two
       sizes that morph smoothly between mode A (expanded) and B (compact). */
    .stage__text :global(.text-block) {
      width: 100%;
      max-height: none;
    }
    /* size changes happen while the text is faded out (see setMobileCards),
       so NO font-size transition here — that caused the visible scaling. */
    /* Mode A (expanded) */
    .stage__text :global(.text-block__title) {
      font-size: 36px;
      margin-bottom: 12px;
    }
    .stage__text :global(.text-block__body) {
      font-size: 18px;
      margin-bottom: 16px;
    }
    .stage__text :global(.text-block__counter) {
      margin-bottom: 12px;
    }
    .stage__text :global(.text-block__sources) {
      font-size: 14px;
    }
    /* Mode B (compact) */
    .stage.m-cards-visible .stage__text :global(.text-block__title) {
      font-size: 24px;
    }
    .stage.m-cards-visible .stage__text :global(.text-block__body) {
      font-size: 15px;
    }

    .stage__right {
      width: auto;
      display: none;
    }

    .stage.m-cards-visible .stage__right {
      display: block;
      margin-top: auto;
      min-height: 0; /* let the inner scroll wrapper size correctly in flex/grid */
    }

    /* dedicated scroll VIEWPORT (prototype approach): a plain block with a fixed
       height + overflow, wrapping ONLY the CardStack, so it's not resized by the
       .stage layout and the cards overflow & scroll natively. */
    .stage.m-cards-visible .stage__right-scroll {
      height: var(--m-comments-h, 40vh);
      overflow-y: auto;
      overscroll-behavior: contain;
      -webkit-overflow-scrolling: touch;
    }

   /* scroll lives on .stage__right (above); .card-stack keeps its natural height
       so its cards overflow the viewport instead of squishing. */
  }

   .continue {
    position: absolute;
    z-index: 7;
    transition: transform 0.2s ease;
    left: 50%;
    bottom: var(--cta-bottom);
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-2xs);
    margin: 0;
    padding: 0;
    border: none;
    background: none;
    cursor: pointer;
    color: var(--color-text-primary);
    opacity: 0;
    pointer-events: none;
    transition: opacity 400ms cubic-bezier(0.25, 1, 0.5, 1);
  }

  .continue.is-visible {
    opacity: 0.35;
    pointer-events: auto;
  }

  .continue.is-visible:not(:disabled) {
    opacity: 1;
  }

  .continue:disabled {
    cursor: default;
  }

  .continue:hover:not(:disabled) {
    transform: translateX(-50%) scale(1.05); /* grow label + arrow together */
  }

  .continue__label {
    font-family: var(--font-family-body);
    font-weight: var(--font-weight-bold);
    font-size: var(--font-size-sm);
    text-transform: uppercase;
    color: inherit;
  }



  .continue__arrow {
    width: 25px;
    height: 10px;
    transition: transform 0.2s ease;
  }

  .continue:hover .continue__arrow {
    transform: scale(1.05);
  }

  .continue.is-visible:not(:disabled) .continue__arrow {
    animation: continue-bounce 1.6s ease-in-out infinite;
  }

  .feedback {
    position: absolute;
    inset: 0;
    z-index: 7;
    pointer-events: none;
  }

  .feedback__heading {
    position: absolute;
    top: 14vh;
    left: 50%;
    transform: translateX(-50%);
    margin: 0;
    text-align: center;
    white-space: pre;
    font-family: var(--font-family-body);
    font-weight: var(--font-weight-bold);
    font-size: clamp(16px, 2.38vw, 36px);
    line-height: 1.25;
    color: var(--color-text-primary);
  }

  .feedback__body {
    position: absolute;
    bottom: calc(var(--page-gutter) + 60px); /* sits above the CTA */
    left: 50%;
    transform: translateX(-50%);
    margin: 0;
    width: 1000px;
    max-width: 1100px;
    padding: 0 clamp(16px, 4vw, 48px);
    box-sizing: border-box;
    text-align: center;
    text-wrap: balance;
    font-family: var(--font-family-body);
    font-weight: var(--font-weight-medium);
    font-size: 24px;
    line-height: 1.5;
    color: var(--color-text-primary);
  }

  .feedback__cta {
    position: absolute;
    transition: transform 0.2s ease;
    bottom: var(--cta-bottom);
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-2xs);
    margin: 0;
    padding: 0;
    border: none;
    background: none;
    cursor: pointer;
    color: var(--color-text-primary);
    pointer-events: auto;
  }
  
   .feedback__cta:hover {
    transform: translateX(-50%) scale(1.08);
  }

  .feedback__cta-label {
    font-family: var(--font-family-body);
    font-weight: var(--font-weight-bold);
    font-size: var(--font-size-sm);
    text-transform: uppercase;
    color: inherit;
  }

  .feedback__cta-arrow {
    width: 25px;
    height: 10px;
    animation: continue-bounce 1.6s ease-in-out infinite;
  }

  @keyframes continue-bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(4px); }
  }

  @media (prefers-reduced-motion: reduce) {
    .continue__arrow,
    .feedback__cta-arrow {
      animation: none;
    }
  }
</style>