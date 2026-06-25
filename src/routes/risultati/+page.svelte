<script lang="ts">
  import { onMount } from 'svelte';
  import Navbar from '$lib/materiali-home/Navbar.svelte';
  import ModelViewer from '$lib/components/ModelViewer.svelte';
  import { visitedSections } from '$lib/stores/visitedSections';
  import { overlayVisible } from '$lib/stores/pageTransition';

  onMount(() => {
    // Small delay so the page content is painted before fading out the overlay
    const t = setTimeout(() => overlayVisible.set(false), 60);
    return () => clearTimeout(t);
  });
</script>

<svelte:head>
  <title>I tuoi risultati — Quante facce ha una medaglia?</title>
</svelte:head>

<Navbar alwaysVisible />

<div class="risultati">
  <div class="bg" aria-hidden="true"></div>

  <div class="models-row">
    <div class="model-wrap">
      <ModelViewer src={$visitedSections.sustainability.resultModelPath} />
    </div>
    <div class="model-wrap">
      <ModelViewer src={$visitedSections.sport.resultModelPath} />
    </div>
    <div class="model-wrap">
      <ModelViewer src={$visitedSections.infrastructure.resultModelPath} />
    </div>
  </div>

  <p class="quote">
    La realtà non è mai unica e uguale per tutti.<br>
    Lo stesso evento può generare visioni differenti<br>
    e soggettive, in base alle opinioni di ognuno
  </p>
</div>

<style>
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
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 96px 6vw 48px;
    gap: 48px;
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
    position: relative;
    z-index: 1;
    font-family: 'Supreme Variable', sans-serif;
    font-weight: 500;
    font-size: 30px;
    line-height: 1.35;
    text-align: center;
    color: #161A1F;
    max-width: 860px;
  }

  .models-row {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: stretch;
    justify-content: center;
    gap: 24px;
    width: 100%;
    max-width: 1200px;
    flex: 1;
    min-height: 420px;
  }

  .model-wrap {
    flex: 1;
    min-height: 360px;
    max-height: 520px;
  }
</style>
