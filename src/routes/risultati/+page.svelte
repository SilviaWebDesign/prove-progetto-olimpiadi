<script lang="ts">
  import { onMount } from 'svelte';
  import Navbar from '$lib/materiali-home/Navbar.svelte';
  import ModelViewer from '$lib/components/ModelViewer.svelte';
  import { visitedSections } from '$lib/stores/visitedSections';
  import { overlayVisible } from '$lib/stores/pageTransition';

  const sectionLabels = ['Sostenibilità', 'Sport', 'Infrastrutture'] as const;

  let isMobile = $state(false);
  let currentIndex = $state(0);

  let touchStartX = 0;

  onMount(() => {
    isMobile = window.innerWidth < 768;
    const t = setTimeout(() => overlayVisible.set(false), 60);
    return () => clearTimeout(t);
  });

  async function tornareAllaHome() {
    overlayVisible.set(true);
    await new Promise(r => setTimeout(r, 400));
    visitedSections.reset();
    window.location.href = '/';
  }

  function prevSection() {
    currentIndex = (currentIndex - 1 + 3) % 3;
  }

  function nextSection() {
    currentIndex = (currentIndex + 1) % 3;
  }

  function onTouchStart(e: TouchEvent) {
    touchStartX = e.touches[0].clientX;
  }

  function onTouchEnd(e: TouchEvent) {
    const delta = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(delta) < 40) return;
    if (delta > 0) nextSection();
    else prevSection();
  }

  const modelPaths = $derived([
    $visitedSections.sustainability.resultModelPath,
    $visitedSections.sport.resultModelPath,
    $visitedSections.infrastructure.resultModelPath,
  ]);
</script>

<svelte:head>
  <title>I tuoi risultati — Quante facce ha una medaglia?</title>
</svelte:head>

<Navbar alwaysVisible />

<div class="risultati">
  <div class="bg" aria-hidden="true"></div>

  <!-- Desktop: 3 models side by side -->
  {#if !isMobile}
    <div class="models-row">
      <div class="model-wrap">
        <ModelViewer src={$visitedSections.sustainability.resultModelPath} fitFactor={0.78} />
      </div>
      <div class="model-wrap">
        <ModelViewer src={$visitedSections.sport.resultModelPath} fitFactor={0.88} />
      </div>
      <div class="model-wrap">
        <ModelViewer src={$visitedSections.infrastructure.resultModelPath} fitFactor={0.88} />
      </div>
    </div>
  {:else}
    <!-- Mobile: one model at a time with swipe carousel -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="carousel"
      ontouchstart={onTouchStart}
      ontouchend={onTouchEnd}
    >
      <!-- Quote above model on mobile (3 lines) -->
      <p class="carousel__quote">
        La realtà non è mai unica<br>
        e uguale per tutti.<br>
        Lo stesso evento può generare visioni<br>
        differenti e soggettive.
      </p>

      {#key currentIndex}
        <div class="carousel__model">
          <ModelViewer src={modelPaths[currentIndex]} fitFactor={0.82} />
        </div>
      {/key}

      <!-- Section name below model at 50px display font -->
      <p class="carousel__label">{sectionLabels[currentIndex]}</p>

      <!-- Dots indicator -->
      <div class="carousel__dots" aria-hidden="true">
        {#each sectionLabels as _, i}
          <button
            type="button"
            class="carousel__dot"
            class:active={i === currentIndex}
            onclick={() => { currentIndex = i; }}
            aria-label="Sezione {i + 1}"
          ></button>
        {/each}
      </div>

      <!-- Arrow buttons -->
      <button type="button" class="carousel__arrow carousel__arrow--left" onclick={prevSection} aria-label="Precedente">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>
      <button type="button" class="carousel__arrow carousel__arrow--right" onclick={nextSection} aria-label="Successivo">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </button>
    </div>
  {/if}

  <p class="quote">
    La realtà non è mai unica<br>
    e uguale per tutti.<br>
    Lo stesso evento può generare visioni differenti e soggettive, in base alle opinioni di ognuno
  </p>

  <div
    class="home-cta"
    role="button"
    tabindex="0"
    onclick={tornareAllaHome}
    onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tornareAllaHome(); } }}
  >
    <span class="cta-label">Torna alla home</span>
    <svg class="cta-chevron" viewBox="58 37 41 20" aria-hidden="true" fill="none">
      <path d="M60 40L78.5 54L95 40" stroke="#161A1F" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
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

  :global(*, *::before, *::after) {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
  :global(body) {
    background: #ffffff;
    overflow-x: hidden;
  }

  .risultati {
    position: relative;
    min-height: 100vh;
    background: #ffffff;
  }

  .bg {
    position: absolute;
    inset: 0;
    background-image: url('/images/sfondo-infrastrutture.jpg');
    background-size: cover;
    background-position: center;
    opacity: 0.28;
    filter: blur(12px);
    pointer-events: none;
    z-index: 0;
  }

  .quote {
    position: fixed;
    left: 50%;
    bottom: 108px;
    transform: translateX(-50%);
    z-index: 1;
    font-family: 'Supreme Variable', sans-serif;
    font-weight: 500;
    font-size: 30px;
    line-height: 1.35;
    text-align: center;
    color: #161A1F;
    max-width: min(860px, 92vw);
    padding: 0 16px;
  }

  /* ── Desktop: 3 models row ── */
  .models-row {
    position: fixed;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 24px;
    width: min(1200px, 92vw);
    height: min(58vh, 640px);
    pointer-events: none;
  }

  .model-wrap {
    flex: 1;
    height: 100%;
    min-width: 0;
    pointer-events: auto;
  }

  /* ── Mobile: carousel ── */
  .carousel {
    position: fixed;
    inset: 0;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
  }

  .carousel__model {
    width: 100%;
    height: min(50vh, 400px);
    pointer-events: auto;
  }

  .carousel__label {
    font-family: 'PP Formula Condensed', sans-serif;
    font-weight: 700;
    font-size: 50px;
    color: #161A1F;
    text-transform: uppercase;
    letter-spacing: 0.02em;
    text-align: center;
    line-height: 1;
  }

  .carousel__quote {
    font-family: 'Supreme Variable', sans-serif;
    font-weight: 500;
    font-size: 18px;
    line-height: 1.4;
    text-align: center;
    color: #161A1F;
    padding: 0 24px;
  }

  .carousel__dots {
    display: flex;
    gap: 8px;
    margin-top: 4px;
  }

  .carousel__dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    border: none;
    background: rgba(22, 26, 31, 0.25);
    cursor: pointer;
    padding: 0;
    transition: background 0.25s;
  }

  .carousel__dot.active {
    background: #161A1F;
  }

  .carousel__arrow {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 40px;
    height: 40px;
    border: none;
    background: transparent;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: #161A1F;
    z-index: 2;
  }

  .carousel__arrow svg {
    width: 20px;
    height: 20px;
  }

  .carousel__arrow--left {
    left: 16px;
  }

  .carousel__arrow--right {
    right: 16px;
  }

  .home-cta {
    position: fixed;
    left: 50%;
    bottom: 28px;
    transform: translateX(-50%);
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    white-space: nowrap;
  }

  .cta-label {
    font-family: 'Supreme Variable', sans-serif;
    font-weight: 700;
    font-size: 13px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #161A1F;
  }

  .cta-chevron {
    display: block;
    width: 38px;
    height: 19px;
    animation: chevron-bounce 1.4s ease-in-out infinite;
  }

  @keyframes chevron-bounce {
    0%, 100% { transform: translateY(0); }
    50%       { transform: translateY(5px); }
  }

  @media (max-width: 768px) {
    .quote {
      display: none;
    }

    .carousel__model {
      height: min(38vh, 300px);
    }

    .carousel {
      gap: 8px;
      justify-content: center;
    }
  }
</style>
