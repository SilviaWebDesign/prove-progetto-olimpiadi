<script lang="ts">
  import { onMount } from 'svelte';
  import Navbar from '$lib/materiali-home/Navbar.svelte';
  import ModelViewer from '$lib/components/ModelViewer.svelte';
  import SectionMountainScene from '$lib/materiali-home/SectionMountainScene.svelte';
  import { preloadMountainGltf } from '$lib/materiali-home/mountainGltf.js';
  import { visitedSections } from '$lib/stores/visitedSections';
  import { overlayVisible } from '$lib/stores/pageTransition';

  let isMobile = $state(false);

  onMount(() => {
    isMobile = window.innerWidth < 768;
    preloadMountainGltf();
    const t = setTimeout(() => overlayVisible.set(false), 60);
    return () => clearTimeout(t);
  });

  async function tornareAllaHome() {
    overlayVisible.set(true);
    await new Promise((r) => setTimeout(r, 400));
    visitedSections.reset();
    window.location.href = '/prototypes/home';
  }

  async function scopriDiPiu() {
    overlayVisible.set(true);
    await new Promise((r) => setTimeout(r, 400));
    window.location.href = '/prototypes/about';
  }

  const modelPaths = $derived([
    $visitedSections.sustainability.resultModelPath,
    $visitedSections.sport.resultModelPath,
    $visitedSections.infrastructure.resultModelPath
  ]);
</script>

<svelte:head>
  <title>I tuoi risultati — Quante facce ha una medaglia?</title>
</svelte:head>

<Navbar alwaysVisible />

<div class="risultati" class:risultati--mobile={isMobile}>
  {#if isMobile}
    <div class="bg bg--mountain" aria-hidden="true">
      <SectionMountainScene topDown={true} fixedZoom={1.05} visible={true} />
    </div>
  {:else}
    <div class="bg" aria-hidden="true"></div>
  {/if}

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

    <p class="quote quote--desktop">
      La realtà non è mai unica<br />
      e uguale per tutti.<br />
      Lo stesso evento può generare visioni differenti e soggettive.
    </p>
  {:else}
    <div class="mobile-layout">
      <p class="quote quote--mobile">
        La realtà non è mai unica<br />
        e uguale per tutti.<br />
        Lo stesso evento può generare visioni differenti e soggettive.
      </p>

      <div class="models-scene" aria-label="Risultati delle tre sezioni">
        <div class="models-scene__item models-scene__item--sustainability">
          <ModelViewer src={modelPaths[0]} fitFactor={0.9} />
        </div>
        <div class="models-scene__item models-scene__item--sport">
          <ModelViewer src={modelPaths[1]} fitFactor={0.86} />
        </div>
        <div class="models-scene__item models-scene__item--infrastructure">
          <ModelViewer src={modelPaths[2]} fitFactor={0.92} />
        </div>
      </div>
    </div>
  {/if}

  <div class="bottom-nav" class:bottom-nav--mobile={isMobile}>
    <div
      class="bottom-cta bottom-cta--home"
      role="button"
      tabindex="0"
      onclick={tornareAllaHome}
      onkeydown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          tornareAllaHome();
        }
      }}
    >
      <span class="cta-label">Torna alla home</span>
      <svg class="cta-chevron cta-chevron--up" viewBox="58 37 41 20" aria-hidden="true" fill="none">
        <path
          d="M60 54L78.5 40L95 54"
          stroke="#161A1F"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </div>

    <div
      class="bottom-cta bottom-cta--about"
      role="button"
      tabindex="0"
      onclick={scopriDiPiu}
      onkeydown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          scopriDiPiu();
        }
      }}
    >
      <span class="cta-label">Scopri di più</span>
      <svg class="cta-chevron cta-chevron--down" viewBox="58 37 41 20" aria-hidden="true" fill="none">
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

  .risultati--mobile {
    display: flex;
    flex-direction: column;
    min-height: 100dvh;
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
    overflow: hidden;
  }

  .bg--mountain {
    inset: -10%;
    background-image: none;
    opacity: 1;
    filter: blur(18px) saturate(0.95) contrast(1.08);
  }

  .bg--mountain::after {
    content: '';
    position: absolute;
    inset: 0;
    background: rgba(255, 255, 255, 0.22);
    pointer-events: none;
    z-index: 1;
  }

  .bg--mountain :global(.three-canvas) {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    z-index: 0;
  }

  .quote {
    font-family: 'Supreme Variable', sans-serif;
    font-weight: 500;
    text-align: center;
    color: #161a1f;
  }

  .quote--desktop {
    position: fixed;
    left: 50%;
    bottom: 108px;
    transform: translateX(-50%);
    z-index: 1;
    font-size: 30px;
    line-height: 1.35;
    max-width: min(860px, 92vw);
    padding: 0 16px;
  }

  .mobile-layout {
    position: relative;
    z-index: 1;
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
    padding: 88px 20px 108px;
  }

  .quote--mobile {
    font-size: 20pt;
    font-weight: 500;
    font-variation-settings: 'wght' 500;
    line-height: normal;
    max-width: 305px;
    margin: 0 auto 20px;
  }

  .models-scene {
    position: relative;
    flex: 1;
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: clamp(6px, 1.5vh, 14px);
    min-height: 0;
    pointer-events: none;
  }

  .models-scene__item {
    position: relative;
    width: min(54vw, 220px);
    height: min(17vh, 125px);
    flex-shrink: 0;
    pointer-events: auto;
  }

  .models-scene__item--infrastructure {
    width: min(62vw, 255px);
    height: min(20vh, 148px);
  }

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

  .bottom-nav {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 28px;
    z-index: 2;
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    width: 100%;
    padding: 0 clamp(20px, 6vw, 32px);
    box-sizing: border-box;
  }

  .bottom-nav--mobile {
    bottom: 24px;
    padding: 0 20px;
  }

  .bottom-cta {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    padding: 0 14px;
    cursor: pointer;
    white-space: nowrap;
  }

  .bottom-nav--mobile .bottom-cta {
    gap: 9px;
    align-items: center;
  }

  .cta-label {
    font-family: 'Supreme Variable', sans-serif;
    font-weight: 700;
    font-size: 16px;
    line-height: 1.1;
    letter-spacing: 0;
    text-transform: uppercase;
    color: #161a1f;
    text-align: center;
  }

  .bottom-nav--mobile .cta-label {
    font-size: 13px;
    text-align: center;
  }

  .cta-chevron {
    display: block;
    width: 25px;
    height: 10px;
  }

  .bottom-nav--mobile .cta-chevron {
    width: 17px;
    height: 7px;
  }

  .cta-chevron--down {
    animation: chevron-bounce-down 2.4s ease-in-out infinite;
  }

  .cta-chevron--up {
    animation: chevron-bounce-up 2.4s ease-in-out infinite;
  }

  @keyframes chevron-bounce-down {
    0%,
    100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(5px);
    }
  }

  @keyframes chevron-bounce-up {
    0%,
    100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-5px);
    }
  }

  @media (max-width: 768px) {
    .mobile-layout {
      padding-top: 82px;
      padding-bottom: 96px;
    }

    .quote--mobile {
      font-size: 20pt;
      margin-bottom: 16px;
    }

    .models-scene__item {
      width: min(52vw, 210px);
      height: min(16vh, 118px);
    }

    .models-scene__item--infrastructure {
      width: min(58vw, 240px);
      height: min(19vh, 140px);
    }
  }
</style>
