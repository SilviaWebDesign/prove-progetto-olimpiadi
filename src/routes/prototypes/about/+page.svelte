<script>
  import { onMount } from 'svelte';
  import ExplorableMountainScene from '$lib/materiali-home/ExplorableMountainScene.svelte';
  import AboutSportDetail from '$lib/materiali-home/AboutSportDetail.svelte';
  import AboutHotspotCard from '$lib/materiali-home/AboutHotspotCard.svelte';
  import Navbar from '$lib/materiali-home/Navbar.svelte';
  import { preloadMountainGltf } from '$lib/materiali-home/mountainGltf.js';
  import { getNextHotspot, getPrevHotspot } from '$lib/materiali-home/aboutHotspots.js';
  import { overlayVisible } from '$lib/stores/pageTransition';
  import { browser } from '$app/environment';

  /** @type {import('$lib/materiali-home/aboutHotspots.js').AboutHotspot | null} */
  let selectedHotspot = $state(null);
  let introDismissed = $state(false);
  let introProgress = $state(0);

  /** @param {number} value */
  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function dismissIntro() {
    if (introDismissed) return;
    introDismissed = true;
    introProgress = 1;
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }

  /** @param {WheelEvent} [event] */
  function onWheelDismiss(event) {
    if (introDismissed) return;
    if (event && event.deltaY <= 0) return;
    const delta = event?.deltaY ?? 120;
    introProgress = Math.min(1, introProgress + delta / 500);
    if (introProgress >= 0.55) dismissIntro();
  }

  /** @param {KeyboardEvent} event */
  function onIntroKeydown(event) {
    if (introDismissed) return;
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
      event.preventDefault();
      dismissIntro();
    }
  }

  onMount(() => {
    overlayVisible.set(false);
    preloadMountainGltf();
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    window.addEventListener('wheel', onWheelDismiss, { passive: true });
    window.addEventListener('keydown', onIntroKeydown);

    return () => {
      window.removeEventListener('wheel', onWheelDismiss);
      window.removeEventListener('keydown', onIntroKeydown);
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  });

  let introTextOpacity = $derived(introDismissed ? 0 : Math.max(0, 1 - introProgress * 2.4));
  let introBgOpacity = $derived(introDismissed ? 0 : Math.max(0, 1 - introProgress * 1.35));

  function closeHotspot() {
    selectedHotspot = null;
  }

  function goPrev() {
    if (!selectedHotspot) return;
    const prev = getPrevHotspot(selectedHotspot.id);
    if (prev) selectedHotspot = prev;
  }

  function goNext() {
    if (!selectedHotspot) return;
    const next = getNextHotspot(selectedHotspot.id);
    if (next) selectedHotspot = next;
  }
</script>

<svelte:head>
  <title>About — Quante facce ha una medaglia?</title>
</svelte:head>

<div class="about-page">
  {#if browser}
    <ExplorableMountainScene bind:selectedHotspot />
  {/if}

  {#if selectedHotspot && introDismissed}
    {#if selectedHotspot.template === 'sport'}
      <AboutSportDetail
        hotspot={selectedHotspot}
        onclose={closeHotspot}
        onnext={goNext}
      />
    {:else}
      <AboutHotspotCard
        hotspot={selectedHotspot}
        onclose={closeHotspot}
        onprev={goPrev}
        onnext={goNext}
      />
    {/if}
  {/if}

  {#if !introDismissed}
    <section
      class="intro-screen"
      onwheel={onWheelDismiss}
      onkeydown={onIntroKeydown}
      tabindex="0"
      aria-label="Introduzione about"
    >
      <div class="intro-backdrop" style="opacity: {introBgOpacity}" aria-hidden="true"></div>

      <div class="intro-content" style="opacity: {introTextOpacity}">
        <p class="intro-message">
          Esplora la montagna per avere più informazioni sul progetto.
        </p>
      </div>

      <button
        type="button"
        class="scroll-hint"
        style="opacity: {introTextOpacity}"
        onclick={(event) => {
          event.stopPropagation();
          dismissIntro();
        }}
      >
        <span class="scroll-hint__label">Continua</span>
        <svg class="scroll-hint__chevron" viewBox="0 0 21 9" aria-hidden="true" fill="none">
          <path d="M1 1.35L10.5 7.65L20 1.35" stroke="#161A1F" stroke-width="1.5"
                stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    </section>
  {/if}
</div>

<Navbar alwaysVisible />

<style>
  .about-page {
    position: fixed;
    inset: 0;
    background: #ffffff;
    overflow: hidden;
  }

  .about-page :global(.three-canvas) {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }

  .intro-screen {
    position: fixed;
    inset: 0;
    z-index: 10;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
    padding: clamp(24px, 5vw, 48px);
    padding-top: clamp(72px, 12vh, 120px);
    padding-bottom: clamp(48px, 10vh, 96px);
    box-sizing: border-box;
    pointer-events: auto;
  }

  .intro-backdrop {
    position: absolute;
    inset: 0;
    background: #ffffff;
    pointer-events: none;
  }

  .intro-content,
  .scroll-hint {
    position: relative;
    z-index: 1;
    transition: opacity 0.25s ease;
  }

  .intro-content {
    flex: 1;
    width: min(100%, 640px);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    gap: clamp(28px, 5vh, 44px);
  }

  .intro-message {
    margin: 0;
    font-family: 'Supreme Variable', sans-serif;
    font-size: clamp(1.65rem, 4.6vw, 2.75rem);
    font-weight: 800;
    line-height: 1.1;
    letter-spacing: 0;
    color: #000000;
    text-wrap: balance;
  }

  .scroll-hint {
    font-family: 'Supreme Variable', sans-serif;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    padding: 0 14px 10px;
    flex-shrink: 0;
    border: 0;
    background: transparent;
    cursor: pointer;
  }

  .scroll-hint__label {
    font-size: 12px;
    font-weight: 700;
    line-height: 1;
    margin-top: -4px;
    text-align: center;
    color: #161a1f;
  }

  .scroll-hint__chevron {
    display: block;
    width: 21px;
    height: 9px;
    animation: chevron-bounce 1.4s ease-in-out infinite;
  }

  @keyframes chevron-bounce {
    0%,
    100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(5px);
    }
  }

  @media (max-width: 768px) {
    .intro-content {
      gap: 24px;
    }
  }
</style>
