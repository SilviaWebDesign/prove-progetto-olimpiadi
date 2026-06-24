<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { fade } from 'svelte/transition';
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';
  import gsap from 'gsap';
  import { ScrollTrigger } from 'gsap/ScrollTrigger';
  import Lenis from 'lenis';

  import FrostCanvas from '$lib/components/FrostCanvas.svelte';
  import TextBlock from './TextBlock.svelte';
  import CardStack from './CardStack.svelte';
  import Scene3D from './Scene3D.svelte';
  import type { Scene3DApi } from './Scene3D.svelte';
  import Navbar from '$lib/materiali-home/Navbar.svelte';

  import './tokens.css';
  import { visitedSections, allSectionsCompleted } from '$lib/stores/visitedSections';
  import { overlayVisible } from '$lib/stores/pageTransition';

  // ── Interfaces ────────────────────────────────────────────────────────────
  interface CardData { id: number; body: string; liked: boolean; }
  interface TopicData { counter: string; title: string; body: string; comments: string[]; }

  // ── Topics ────────────────────────────────────────────────────────────────
  const topics: TopicData[] = [
    {
      counter: '1 / 3',
      title: 'Villaggio Olimpico',
      body: "Il Villaggio Olimpico di Porta Romana è stato progettato per ospitare gli atleti durante i Giochi e diventare student housing dopo l'evento. Il progetto presenta tecnologie ed impianti finalizzati al risparmio energetico. Una volta adibito a studentato, la quota mensile si aggirerà intorno ai 1.000€ per posto letto.",
      comments: [
        "Finalmente un progetto che ha a cuore il risparmio energetico, è ammirevole.",
        "Diventando student housing, il Villaggio può contribuire in modo utile alla città.",
        "Ha contribuito a creare una bella atmosfera tra gli atleti, e rafforzare la sportività, che è fondamentale.",
        "Il villaggio olimpico ha distrutto Porta Romana.",
        "La quota di affitto non è accessibile, sarà l'ennesimo studentato soltanto per ricchi.",
        "L'edificio non ha un aspetto gradevole, rovina il panorama urbano con la sua estetica da prefabbricato.",
      ],
    },
    {
      counter: '2 / 3',
      title: 'Arena Santa Giulia',
      body: "L'Arena Santa Giulia è stata progettata per ospitare l'hockey olimpico e diventare poi un'arena polifunzionale per eventi, sport e spettacoli. La costruzione dell'arena rientra nel progetto di riqualificazione del quartiere Santa Giulia, o Montecity-Rogoredo, nella periferia sudest di Milano.",
      comments: [
        "L'arena è completamente accessibile alle persone con disabilità, un grande passo avanti per l'Italia, finalmente.",
        "Design estremamente moderno, un ottimo passo verso la riqualificazione di Santa Giulia.",
        "Struttura molto adatta per i concerti, l'acustica è ottima!",
        "È inammissibile che l'arena sia stata utilizzata prima del suo completamento.",
        "La peggior arena di sempre, durante i Giochi si sono verificati troppi malfunzionamenti.",
        "Uno spreco di risorse, sicuramente l'arena resterà inutilizzata.",
      ],
    },
    {
      counter: '3 / 3',
      title: 'Sliding Centre',
      body: "L'Eugenio Monti Sliding Centre è un tracciato per bob, skeleton e slittino situato a Cortina d'Ampezzo. La pista è stata ricostruita per ospitare le gare dei tre sport alle Olimpiadi Invernali di Milano-Cortina, ed è considerata una delle strutture più emblematiche dei Giochi.",
      comments: [
        "Le Olimpiadi Invernali sono state l'occasione perfetta per ristrutturare la pista, finalmente si potrà praticare di nuovo il bob a Cortina!",
        "Gli atleti che ci hanno gareggiato l'hanno definita come la migliore di sempre, e il loro parere è sicuramente il più valido di tutti.",
        "Non è da poco costruire una struttura così di qualità in breve tempo, l'Italia dovrebbe esserne orgogliosa.",
        "La pista è stata costruita su un terreno franabile, è assurdo che questo progetto sia stato anche solo approvato.",
        "L'impatto ambientale dello Sliding Centre rende impossibile apprezzarlo, indipendentemente dalla sua utilità.",
        "Dubito che verrà utilizzata dopo il termine dei Giochi, mantenerla sarà solo un peso economico per lo Stato.",
      ],
    },
  ];

  // ── Topic + like state ────────────────────────────────────────────────────
  let currentTopic = $state(0);
  let topicLikes = $state<boolean[][]>(topics.map(t => t.comments.map(() => false)));
  let isTransitioning = $state(false);

  // ── Phase management ──────────────────────────────────────────────────────
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
    currentTopic === 2 && anyLiked
      ? 'Scopri il tuo risultato'
      : 'Clicca per continuare'
  );

  function goToNextSection() {
    goto('/sezioni/sostenibilita');
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
    if (totalPositive > 0 && totalNegative === 0) return '/oggetti/infrastrutture-positivo.glb';
    if (totalNegative > 0 && totalPositive === 0) return '/oggetti/infrastrutture-negativo.glb';
    if (totalPositive > totalNegative)            return '/oggetti/infrastrutture-piu-positivo.glb';
    if (totalNegative > totalPositive)            return '/oggetti/infrastrutture-piu-negativo.glb';
    return '/oggetti/infrastrutture-neutro.glb';
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
    visitedSections.markCompleted('infrastructure', resultModelPath);
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
    if (currentTopic === 2) { enterFeedbackPhase(); return; }

    scene3d?.resetPulse();
    isTransitioning = true;
    const OUT = 0.50;
    const CROSS = OUT * 0.88; // attesa all'88% del fade-out: opacity ≈ 3% (power3.inOut)

    // timeline locale: kill() non tocca i tween del threeTl ScrollTrigger
    const outTl = gsap.timeline();
    outTl.to('.stage__text',  { opacity: 0, y: -8, duration: OUT, ease: 'power3.inOut' }, 0);
    outTl.to('.stage__right', { opacity: 0, x:  8, duration: OUT, ease: 'power3.inOut' }, 0);

    await new Promise<void>(r => setTimeout(r, CROSS * 1000));
    outTl.kill();

    currentTopic++;
    await tick();

    gsap.set('.stage__text',  { y: 8,  opacity: 0 });
    gsap.set('.stage__right', { x: -8, opacity: 0 });

    gsap.timeline({ onComplete: () => { isTransitioning = false; } })
      .to('.stage__text',  { opacity: 1, y: 0, duration: 0.60, ease: 'power3.inOut' }, 0)
      .to('.stage__right', { opacity: 1, x: 0, duration: 0.60, ease: 'power3.inOut' }, 0.04);
  }

  async function goPrev() {
    if (isTransitioning || currentTopic === 0) return;

    scene3d?.resetPulse();
    isTransitioning = true;
    const OUT = 0.50;
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

  // ── Scene3D API (bindable) ───────────────────────────────────────────────
  let scene3d = $state<Scene3DApi | undefined>(undefined);

  // ── Model loaded signal ───────────────────────────────────────────────────
  let resolveModelLoaded: () => void = () => {};
  const modelLoadedPromise = new Promise<void>(resolve => { resolveModelLoaded = resolve; });

  // ── Topics-mode scroll interception ──────────────────────────────────────
  let topicsMode = false;
  let lenisRef: { stop: () => void; start: () => void } | null = null;

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

  function onTopicsWheel(e: WheelEvent) {
    if (phase === 'feedback') {
      e.preventDefault();
      if (e.deltaY < 0 && !isTransitioning) exitFeedbackPhase();
      if (e.deltaY > 0 && $allSectionsCompleted && !isTransitioning) navigateToResults();
      return;
    }

    const goingDown = e.deltaY > 0;

    // Scroll up on first topic → release the pin, let Lenis scroll normally
    if (!goingDown && currentTopic === 0) {
      exitTopicsMode();
      return; // no preventDefault: Lenis will handle the gesture
    }

    e.preventDefault();
    if (isTransitioning) return;

    if (goingDown) {
      if (currentTopic === 2) {
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

    history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);

    gsap.registerPlugin(ScrollTrigger);

    // ── A. Lenis smooth scroll ─────────────────────────────────────────────
    const lenis = new Lenis({ smoothWheel: true, lerp: 0.08 });
    lenis.scrollTo(0, { immediate: true });
    lenisRef = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    const lenisRaf = (t: number) => lenis.raf(t * 1000);
    gsap.ticker.add(lenisRaf);
    gsap.ticker.lagSmoothing(0);

    // ── B. Title refs ──────────────────────────────────────────────────────
    const titleEl = sceneEl.querySelector<SVGSVGElement>('.hero-title')!;
    const textEl  = titleEl.querySelector<SVGTextElement>('.hero-title__text')!;

    // ── C. GSAP initial state (CSS handles opacity:0 for anti-flash) ───────
    gsap.set(titleEl,        { scaleY: 1, yPercent: 0, transformOrigin: 'bottom center' });
    gsap.set('.phrase',      { y: 30, autoAlpha: 0 });
    gsap.set('.stage__text', { x: -30 });
    gsap.set('.stage__right',{ x:  30 });

    // ── D. Animations ──────────────────────────────────────────────────────
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
      // fromTo esplicito: garantisce autoAlpha:1 a scroll=0 senza gsap.set separato
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
        scrollTrigger: /** @type {any} */ ({
          trigger:           sceneEl,
          start:             () => `top+=${window.innerHeight * 1.85}`,
          end:               'bottom bottom',
          scrub:             1.2,
          onUpdate:          (self: { progress: number }) => { if (self.progress >= 0.999) { scene3d?.settle(); enterTopicsMode(); } },
          onReverseComplete: () => { scene3d?.unsettle(); exitTopicsMode(); },
        }),
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

    // ── E. fonts.ready → viewBox + titolo visibile ────────────────────────
    document.fonts.ready.then(() => {
      const bb   = textEl.getBBox();
      const svgW = titleEl.getBoundingClientRect().width || window.innerWidth;
      // capH = altezza dal top dei glifi alla baseline (escluso lo spazio sotto
      // la baseline che il getBBox può includere per font con riserva discendente).
      // Per testo tutto maiuscolo i glifi toccano la baseline → nessun gap.
      const capH = -bb.y;
      const svgH = svgW * capH / bb.width;
      titleEl.setAttribute('height', String(Math.ceil(svgH)));
      titleEl.setAttribute('viewBox', `${bb.x} ${bb.y} ${bb.width} ${capH}`);
      if (window.scrollY < window.innerHeight * 0.15) {
        gsap.to(titleEl, { opacity: 1, duration: 0.12, ease: 'none' });
      }
    });

    // ── F. Tutte le risorse → sync Lenis + refresh ScrollTrigger ──────────
    const bgImg = new Image();
    bgImg.src = '/images/sfondo-infrastrutture.jpg';
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
      // Preload result GLBs once the initial model + page are ready
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
  <title>Infrastrutture — Quante facce ha una medaglia?</title>
</svelte:head>

<Navbar />

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

    <!-- Layer 3D: canvas full-viewport, dietro la griglia -->
    <Scene3D bind:api={scene3d} onModelLoaded={() => resolveModelLoaded()} orbitEnabled={phase === 'feedback'} />

    <!-- Stage: testo a sx + card a dx, sopra il canvas 3D -->
    <div class="stage">

      <div class="stage__text">
        <TextBlock
          counter={topics[currentTopic].counter}
          title={topics[currentTopic].title}
          body={topics[currentTopic].body}
        />
      </div>

      <!-- colonna centrale vuota: spazio visivo per il modello 3D -->
      <div aria-hidden="true"></div>

      <!-- Colonna destra: heading + card -->
      <div class="stage__right" class:no-pointer={phase === 'feedback'}>
        <p class="stage__right-heading">Metti like alle opinioni con cui sei d'accordo</p>
        <CardStack {cards} onToggleLike={toggleLike} />
      </div>

    </div>

    <!-- CTA in basso al centro, attiva solo con almeno un like -->
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

    <!-- Overlay fase B: testo feedback + CTA continua -->
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
    overflow: hidden;
  }

  /* Placeholder sfocato renderizzato server-side: evita il flash della foto nitida
     prima che il canvas FrostCanvas abbia dipinto il primo frame.             */
  .layer--frost::before {
    content: '';
    position: absolute;
    inset: -80px;
    z-index: 0;
    background-image: url('/images/frost-infrastrutture.jpg');
    background-size: cover;
    background-position: center;
    filter: blur(23px) brightness(1.15) saturate(0.55) contrast(1.08);
    pointer-events: none;
  }

  .layer--bg {
    z-index: 1;
    background-image: url('/images/sfondo-infrastrutture.jpg');
    background-size: cover;
    background-position: center;
    opacity: 0.28;
    pointer-events: none;
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

  /* ── Overlay fase B: testo feedback sopra il modello ────────────────────── */
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

  /* ── Overlay fase B: CTA continua in basso ───────────────────────────────── */
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
