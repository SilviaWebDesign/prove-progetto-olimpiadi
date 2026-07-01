<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { fade } from 'svelte/transition';
  import { goto } from '$app/navigation';

  import SectionHeroTitle from '$lib/materiali-home/SectionHeroTitle.svelte';
  import SectionFactBlock from '$lib/components/SectionFactBlock.svelte';
  import CommentCard from '$lib/components/CommentCard.svelte';
  import ModelViewer from '$lib/components/ModelViewer.svelte';

  import './tokens.css';
  import { visitedSections, allSectionsCompleted } from '$lib/stores/visitedSections';
  import { overlayVisible } from '$lib/stores/pageTransition';

  interface TopicData {
    counter: string;
    title: string;
    body: string;
    source?: string;
    comments: string[];
  }

  interface ScrollytellConfig {
    pageTitle: string;
    heroTitle: string;
    heroTitleStyle?: 'svg' | 'section';
    heroTitleLayout?: 'center' | 'spread';
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

  const topics = $derived(config.topics);
  const lastTopic = $derived(config.topics.length - 1);

  let currentTopic = $state(0);
  let topicLikes = $state<boolean[][]>(config.topics.map(t => t.comments.map(() => false)));
  let phase = $state<'topics' | 'feedback'>('topics');
  let isTransitioning = $state(false);
  let currentResultPath = $state('');
  let topicsEl = $state<HTMLDivElement | null>(null);

  const anyLikedInCurrent = $derived(topicLikes[currentTopic].some(l => l));

  const nextSectionRoute: Record<string, string> = {
    sustainability: '/sezioni/sport',
    sport: '/sezioni/infrastrutture',
    infrastructure: '/sezioni/sostenibilita',
  };

  function toggleLike(topicIdx: number, cardIdx: number) {
    topicLikes = topicLikes.map((tl, ti) =>
      ti === topicIdx ? tl.map((l, li) => li === cardIdx ? !l : l) : tl
    );
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

  function getResultLabel(path: string): string {
    if (path.includes('piu-positivo')) return 'La tua visione è prevalentemente ottimista con qualche riserva.';
    if (path.includes('piu-negativo')) return 'La tua visione è prevalentemente critica con qualche apertura.';
    if (path.includes('positivo'))    return 'Il tuo punto di vista guarda alle opportunità di questo grande evento.';
    if (path.includes('negativo'))    return 'Il tuo punto di vista si concentra sulle criticità di questo grande evento.';
    return 'La tua visione è equilibrata tra aspetti positivi e negativi.';
  }

  async function goNext() {
    if (!anyLikedInCurrent || isTransitioning) return;
    isTransitioning = true;

    if (currentTopic < lastTopic) {
      currentTopic++;
      await tick();
      topicsEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      const resultPath = computeResult();
      currentResultPath = resultPath;
      visitedSections.markCompleted(config.sectionId, resultPath);
      phase = 'feedback';
      await tick();
      topicsEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    isTransitioning = false;
  }

  async function goToNextSection() {
    overlayVisible.set(true);
    await new Promise<void>(r => setTimeout(r, 400));
    goto(nextSectionRoute[config.sectionId]);
  }

  async function navigateToResults() {
    overlayVisible.set(true);
    await new Promise<void>(r => setTimeout(r, 400));
    goto('/risultati');
  }

  onMount(() => {
    if ($overlayVisible) setTimeout(() => overlayVisible.set(false), 60);
    history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
  });
</script>

<div class="mobile-page mobile-page--{config.sectionId}">

  <!-- ── Hero ───────────────────────────────────────────────────────────────── -->
  <div class="mobile-hero">
    <div
      class="mobile-hero__bg"
      style="background-image: url('{config.bgSrc}')"
      aria-hidden="true"
    ></div>
    <div class="mobile-hero__frost" aria-hidden="true"></div>

    <div
      class="mobile-hero__title"
      role="img"
      aria-label={config.heroAriaLabel}
    >
      <SectionHeroTitle title={config.heroTitle} layout={config.heroTitleLayout ?? 'center'} />
    </div>

    <div class="mobile-hero__scroll-hint" aria-hidden="true">
      <svg viewBox="58 37 41 20" fill="none" width="32" height="16">
        <path d="M60 40L78.5 54L95 40" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>
  </div>

  <!-- ── Frase intro ────────────────────────────────────────────────────────── -->
  <div class="mobile-phrase">
    <p class="mobile-phrase__text">{config.phrase}</p>
  </div>

  <!-- ── Contenuto principale ───────────────────────────────────────────────── -->
  <div class="mobile-main" bind:this={topicsEl}>

    {#if phase === 'topics'}
      {#key currentTopic}
        <div class="mobile-topic" in:fade={{ duration: 280, delay: 180 }} out:fade={{ duration: 180 }}>

          <!-- Testo del topic -->
          <div class="mobile-topic__text">
            <SectionFactBlock
              counter={topics[currentTopic].counter}
              title={topics[currentTopic].title}
              body={topics[currentTopic].body}
              source={topics[currentTopic].source ?? ''}
            />
          </div>

          <!-- Modello 3D -->
          <div class="mobile-topic__model" aria-hidden="true">
            <ModelViewer src={config.modelSrc} fitFactor={0.68} />
          </div>

          <!-- Sezione commenti -->
          <div class="mobile-topic__cards">
            <p class="mobile-topic__cards-heading">
              Metti like alle opinioni con cui sei d'accordo
            </p>
            <div class="mobile-topic__cards-list">
              {#each topics[currentTopic].comments as comment, i}
                <CommentCard
                  comment={{ body: comment }}
                  sectionId={config.sectionId}
                  liked={topicLikes[currentTopic][i]}
                  onToggleLike={() => toggleLike(currentTopic, i)}
                  size="lg"
                />
              {/each}
            </div>
          </div>

          <!-- CTA -->
          <div class="mobile-topic__cta">
            <button
              class="mobile-cta-btn"
              class:mobile-cta-btn--active={anyLikedInCurrent && !isTransitioning}
              disabled={!anyLikedInCurrent || isTransitioning}
              onclick={goNext}
            >
              <span class="mobile-cta-btn__label">
                {currentTopic === lastTopic ? 'Scopri il tuo risultato' : 'Continua'}
              </span>
              <svg class="mobile-cta-btn__chevron" viewBox="58 37 41 20" fill="none"
                   aria-hidden="true">
                <path d="M60 40L78.5 54L95 40" stroke="currentColor" stroke-width="2"
                      stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </div>

        </div>
      {/key}

    {:else}
      <!-- ── Fase feedback ─────────────────────────────────────────────────── -->
      <div class="mobile-feedback" in:fade={{ duration: 400 }}>

        <p class="mobile-feedback__headline">
          Fatti unici, molteplici sguardi.<br>
          Questa è la realtà, plasmata dalla tua opinione.
        </p>

        <div class="mobile-feedback__model" aria-hidden="true">
          <ModelViewer src={currentResultPath || config.modelSrc} fitFactor={0.72} />
        </div>

        <p class="mobile-feedback__subtitle">
          {getResultLabel(currentResultPath)}
        </p>

        <button
          class="mobile-cta-btn mobile-cta-btn--active"
          onclick={() => { $allSectionsCompleted ? navigateToResults() : goToNextSection(); }}
        >
          <span class="mobile-cta-btn__label">
            {$allSectionsCompleted ? 'Scopri i tuoi risultati' : 'Passa al prossimo argomento'}
          </span>
          <svg class="mobile-cta-btn__chevron" viewBox="58 37 41 20" fill="none"
               aria-hidden="true">
            <path d="M60 40L78.5 54L95 40" stroke="currentColor" stroke-width="2"
                  stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>

      </div>
    {/if}

  </div>

</div>

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

  :global(*, *::before, *::after) { box-sizing: border-box; margin: 0; padding: 0; }
  :global(body) { background: #ffffff; color: #000000; overflow-x: hidden; }

  /* ── Page ────────────────────────────────────────────────────────────────── */
  .mobile-page {
    min-height: 100dvh;
    background: #ffffff;
    color: #161a1f;
  }

  /* ── Hero ────────────────────────────────────────────────────────────────── */
  .mobile-hero {
    position: relative;
    height: 100svh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    align-items: center;
    padding-bottom: 40px;
  }

  .mobile-hero__bg {
    position: absolute;
    inset: 0;
    background-size: cover;
    background-position: center;
    filter: grayscale(1);
    opacity: 0.28;
    pointer-events: none;
  }

  /* Frost overlay — CSS-only (no canvas) */
  .mobile-hero__frost {
    position: absolute;
    inset: 0;
    background:
      radial-gradient(ellipse 70% 55% at 12% 18%, rgba(218,238,255,0.78) 0%, rgba(218,238,255,0.48) 45%, rgba(0,0,0,0) 100%),
      radial-gradient(ellipse 60% 50% at 88% 82%, rgba(205,230,255,0.72) 0%, rgba(205,230,255,0.42) 45%, rgba(0,0,0,0) 100%),
      radial-gradient(ellipse 42% 42% at 65% 44%, rgba(230,245,255,0.58) 0%, rgba(0,0,0,0) 100%),
      rgba(215,235,255,0.42);
    pointer-events: none;
    z-index: 1;
  }

  .mobile-hero__title {
    position: relative;
    z-index: 2;
    width: 100%;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    align-items: center;
    overflow: hidden;
  }

  .mobile-hero__scroll-hint {
    position: relative;
    z-index: 2;
    margin-top: 20px;
    color: #161a1f;
    animation: bounce 1.6s ease-in-out infinite;
  }

  @keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50%       { transform: translateY(6px); }
  }

  /* ── Frase ───────────────────────────────────────────────────────────────── */
  .mobile-phrase {
    padding: 52px 28px 40px;
    background: #ffffff;
  }

  .mobile-phrase__text {
    font-family: 'Supreme Variable', sans-serif;
    font-weight: 700;
    font-size: clamp(22px, 6vw, 32px);
    line-height: 1.2;
    color: #161a1f;
  }

  /* ── Main content ────────────────────────────────────────────────────────── */
  .mobile-main {
    background: #ffffff;
    padding-bottom: 60px;
    scroll-margin-top: 60px;
  }

  /* ── Topic ───────────────────────────────────────────────────────────────── */
  .mobile-topic {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  /* Text block */
  .mobile-topic__text {
    padding: 0 28px 40px;
  }

  /* 3D Model */
  .mobile-topic__model {
    width: min(300px, 80vw);
    aspect-ratio: 1 / 1;
    margin: 0 auto 40px;
    position: relative;
  }

  /* Cards */
  .mobile-topic__cards {
    padding: 0 28px;
  }

  .mobile-topic__cards-heading {
    font-family: 'Supreme Variable', sans-serif;
    font-weight: 700;
    font-size: 14px;
    line-height: 1.3;
    color: #161a1f;
    margin-bottom: 16px;
  }

  .mobile-topic__cards-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  /* Override CommentCard max-width on mobile */
  .mobile-topic__cards-list :global(.comment-card-glass) {
    max-width: 100%;
  }

  /* CTA */
  .mobile-topic__cta {
    padding: 36px 28px 0;
    display: flex;
    justify-content: center;
  }

  /* ── Feedback ────────────────────────────────────────────────────────────── */
  .mobile-feedback {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0 28px;
    gap: 0;
  }

  .mobile-feedback__headline {
    font-family: 'Supreme Variable', sans-serif;
    font-weight: 700;
    font-size: clamp(22px, 5.5vw, 32px);
    line-height: 1.25;
    color: #161a1f;
    text-align: center;
    margin-bottom: 32px;
  }

  .mobile-feedback__model {
    width: min(280px, 78vw);
    aspect-ratio: 1 / 1;
    position: relative;
    margin-bottom: 32px;
  }

  .mobile-feedback__subtitle {
    font-family: 'Supreme Variable', sans-serif;
    font-weight: 400;
    font-size: clamp(16px, 4.5vw, 20px);
    line-height: 1.5;
    color: #161a1f;
    text-align: center;
    margin-bottom: 40px;
    max-width: 360px;
  }

  /* ── CTA button ──────────────────────────────────────────────────────────── */
  .mobile-cta-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    background: none;
    border: none;
    padding: 8px 16px;
    cursor: pointer;
    opacity: 0.3;
    transition: opacity 300ms ease;
    pointer-events: none;
  }

  .mobile-cta-btn--active {
    opacity: 1;
    pointer-events: auto;
  }

  .mobile-cta-btn__label {
    font-family: 'Supreme Variable', sans-serif;
    font-weight: 700;
    font-size: 13px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #161a1f;
    white-space: nowrap;
  }

  .mobile-cta-btn__chevron {
    display: block;
    width: 32px;
    height: 16px;
    color: #161a1f;
  }

  .mobile-cta-btn--active .mobile-cta-btn__chevron {
    animation: bounce 1.4s ease-in-out infinite;
  }

  /* Override SectionFactBlock width on mobile */
  .mobile-topic__text :global(.section-fact-block) {
    width: 100%;
  }

  /* ── Hero background variants ─────────────────────────────────────────────── */
  .mobile-page--sustainability .mobile-hero__bg { opacity: 0.16; }
</style>
