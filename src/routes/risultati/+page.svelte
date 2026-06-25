<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import Navbar from '$lib/materiali-home/Navbar.svelte';
  import ModelViewer from '$lib/components/ModelViewer.svelte';
  import { visitedSections } from '$lib/stores/visitedSections';
  import { overlayVisible } from '$lib/stores/pageTransition';

  onMount(() => {
    const t = setTimeout(() => overlayVisible.set(false), 60);
    return () => clearTimeout(t);
  });

  async function tornareAllaHome() {
    overlayVisible.set(true);
    await new Promise(r => setTimeout(r, 400));
    visitedSections.reset();
    goto('/');
  }
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

  <button class="home-cta" onclick={tornareAllaHome}>
    Torna alla home
  </button>
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
    padding: 96px 6vw 40px;
    gap: 32px;
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

  .home-cta {
    position: relative;
    z-index: 1;
    background: none;
    border: 1.5px solid #161A1F;
    border-radius: 100px;
    padding: 12px 32px;
    font-family: 'Supreme Variable', sans-serif;
    font-weight: 600;
    font-size: 16px;
    color: #161A1F;
    cursor: pointer;
    letter-spacing: 0.01em;
    transition: background 0.2s ease, color 0.2s ease;
  }

  .home-cta:hover {
    background: #161A1F;
    color: #ffffff;
  }
</style>
