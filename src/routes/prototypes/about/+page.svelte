<script>
  import { onMount } from 'svelte';
  import ExplorableMountainScene from '$lib/materiali-home/ExplorableMountainScene.svelte';
  import AboutSportDetail from '$lib/materiali-home/AboutSportDetail.svelte';
  import AboutHotspotCard from '$lib/materiali-home/AboutHotspotCard.svelte';
  import Navbar from '$lib/materiali-home/Navbar.svelte';
  import AboutFooter from '$lib/materiali-home/AboutFooter.svelte';
  import { preloadMountainGltf } from '$lib/materiali-home/mountainGltf.js';
  import { getNextHotspot, getPrevHotspot } from '$lib/materiali-home/aboutHotspots.js';
  import { overlayVisible } from '$lib/stores/pageTransition';
  import { browser } from '$app/environment';

  /** @type {import('$lib/materiali-home/aboutHotspots.js').AboutHotspot | null} */
  let selectedHotspot = $state(null);
  /** @type {import('$lib/materiali-home/aboutHotspots.js').AboutHotspot | null} */
  let hoveredHotspot = $state(null);
  let introDismissed = $state(false);
  let introProgress = $state(0);
  let lastHintTitle = $state('');
  let isMobileExplore = $state(false);
  let footerVisible = $state(false);
  let footerHeight = $state(0);

  let hintVisible = $derived(!!hoveredHotspot && !isMobileExplore);
  let showDesktopFooter = $derived(introDismissed && !isMobileExplore && !selectedHotspot);
  let showMobileExploreHint = $derived(isMobileExplore && introDismissed && !selectedHotspot);
  let showHintOverlay = $derived(showMobileExploreHint || hintVisible);

  $effect(() => {
    if (!showDesktopFooter) footerVisible = false;
  });

  $effect(() => {
    if (hoveredHotspot) {
      lastHintTitle = hoveredHotspot.title ?? hoveredHotspot.label;
    }
  });

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

  /** @param {number} deltaY */
  function applyIntroScroll(deltaY) {
    if (introDismissed || deltaY <= 0) return;
    introProgress = Math.min(1, introProgress + deltaY / 500);
    if (introProgress >= 0.55) dismissIntro();
  }

  /** @param {WheelEvent} [event] */
  function onWheelDismiss(event) {
    if (introDismissed) return;
    if (event && event.deltaY <= 0) return;
    applyIntroScroll(event?.deltaY ?? 120);
  }

  let touchStartY = 0;

  /** @param {TouchEvent} event */
  function onTouchStart(event) {
    if (introDismissed || event.touches.length !== 1) return;
    touchStartY = event.touches[0].clientY;
  }

  /** @param {TouchEvent} event */
  function onTouchMove(event) {
    if (introDismissed || event.touches.length !== 1) return;
    const currentY = event.touches[0].clientY;
    const deltaY = touchStartY - currentY;
    touchStartY = currentY;
    applyIntroScroll(deltaY);
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

    const mobileMq = window.matchMedia('(max-width: 900px)');
    const syncMobileExplore = () => {
      isMobileExplore = mobileMq.matches;
    };
    syncMobileExplore();
    mobileMq.addEventListener('change', syncMobileExplore);

    window.addEventListener('wheel', onWheelDismiss, { passive: true });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('keydown', onIntroKeydown);

    return () => {
      mobileMq.removeEventListener('change', syncMobileExplore);
      window.removeEventListener('wheel', onWheelDismiss);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
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

<div
  class="about-page"
  class:footer-open={footerVisible}
  style="--mountain-lift: {footerVisible ? footerHeight : 0}px"
>
  {#if browser}
    <ExplorableMountainScene bind:selectedHotspot bind:hoveredHotspot />
  {/if}

  {#if introDismissed && !selectedHotspot}
    <div
      class="mountain-hover-hint"
      class:visible={showHintOverlay}
      class:mountain-hover-hint--mobile-explore={showMobileExploreHint}
      aria-live="polite"
      aria-hidden={!showHintOverlay}
    >
      {#if hintVisible}
        {#key hoveredHotspot?.id ?? 'none'}
          <p class="mountain-hover-hint__title">
            {hoveredHotspot?.title ?? hoveredHotspot?.label ?? lastHintTitle}
          </p>
        {/key}
      {/if}
      <p class="mountain-hover-hint__cta">clicca sulle sfere per sapere di più</p>
    </div>
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
        onprev={goPrev}
        onnext={goNext}
      />
    {/if}
  {/if}

  {#if !introDismissed}
    <section
      class="intro-screen"
      onwheel={onWheelDismiss}
      ontouchstart={onTouchStart}
      ontouchmove={onTouchMove}
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
        <span class="scroll-hint__label">CONTINUA</span>
        <svg class="scroll-hint__chevron" viewBox="0 0 21 9" aria-hidden="true" fill="none">
          <path d="M1 1.35L10.5 7.65L20 1.35" stroke="#161A1F" stroke-width="1.5"
                stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    </section>
  {/if}

  {#if showDesktopFooter}
    {#if footerVisible}
      <div
        class="about-footer-scrim"
        style:bottom="{footerHeight}px"
        aria-hidden="true"
      ></div>
    {/if}
    <AboutFooter enabled bind:visible={footerVisible} bind:height={footerHeight} />
  {/if}
</div>

<Navbar alwaysVisible />

<style>
  .about-page {
    position: fixed;
    inset: 0;
    background: #ffffff;
    overflow: hidden;
    --panel-padding-x: clamp(24px, 5.23vw, 79px);
  }

  .about-page :global(.three-canvas) {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    z-index: 1;
    transform: translateY(calc(-1 * var(--mountain-lift, 0px)));
    transition: transform 420ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  .about-footer-scrim {
    position: fixed;
    left: 0;
    right: 0;
    height: 120px;
    z-index: 7;
    pointer-events: none;
    background: linear-gradient(
      to bottom,
      rgba(255, 255, 255, 0) 0%,
      rgba(255, 255, 255, 0) 30%,
      rgba(255, 255, 255, 0.2) 50%,
      rgba(255, 255, 255, 0.55) 72%,
      rgba(255, 255, 255, 0.85) 88%,
      #ffffff 100%
    );
    animation: footer-scrim-in 380ms ease both;
  }

  @keyframes footer-scrim-in {
    from {
      opacity: 0;
    }

    to {
      opacity: 1;
    }
  }

  .about-page.footer-open .mountain-hover-hint {
    transform: translateX(-50%) translateY(calc(-1 * var(--mountain-lift, 0px)));
    transition: transform 420ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  .mountain-hover-hint {
    position: fixed;
    top: clamp(104px, 15vh, 148px);
    left: 50%;
    z-index: 6;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    margin: 0;
    padding: 0;
    transform: translateX(-50%);
    pointer-events: none;
    text-align: center;
    color: #161a1f;
    transition: transform 420ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  .mountain-hover-hint__title,
  .mountain-hover-hint__cta {
    margin: 0;
    opacity: 0;
    transform: translateY(10px);
    transition:
      opacity 480ms cubic-bezier(0.22, 1, 0.36, 1),
      transform 480ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  .mountain-hover-hint.visible .mountain-hover-hint__title {
    animation: mountain-hint-fade-in 520ms cubic-bezier(0.22, 1, 0.36, 1) both;
  }

  .mountain-hover-hint.visible .mountain-hover-hint__cta {
    animation: mountain-hint-fade-in-cta 520ms cubic-bezier(0.22, 1, 0.36, 1) 140ms both;
  }

  .mountain-hover-hint:not(.visible) .mountain-hover-hint__cta {
    opacity: 0;
    transform: translateY(6px);
    transition-delay: 0ms;
  }

  .mountain-hover-hint:not(.visible) .mountain-hover-hint__title {
    opacity: 0;
    transform: translateY(6px);
    transition-delay: 100ms;
  }

  @keyframes mountain-hint-fade-in {
    from {
      opacity: 0;
      transform: translateY(10px);
    }

    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes mountain-hint-fade-in-cta {
    from {
      opacity: 0;
      transform: translateY(10px);
    }

    to {
      opacity: 0.82;
      transform: translateY(0);
    }
  }

  .mountain-hover-hint__title {
    font-family: 'Supreme Variable', sans-serif;
    font-size: clamp(1.25rem, 3.2vw, 1.75rem);
    font-weight: 800;
    line-height: 1.1;
    letter-spacing: 0.01em;
    white-space: nowrap;
  }

  .mountain-hover-hint__cta {
    font-family: 'Supreme Variable', sans-serif;
    font-size: clamp(0.75rem, 1.6vw, 0.875rem);
    font-weight: 700;
    line-height: 1.2;
    letter-spacing: 0.02em;
    white-space: nowrap;
    text-transform: uppercase;
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
    color: #161A1F;
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
    text-transform: uppercase;
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

  @media (max-width: 900px) {
    .mountain-hover-hint {
      top: clamp(88px, 11vh, 112px);
    }

    .mountain-hover-hint--mobile-explore .mountain-hover-hint__cta {
      opacity: 0.82;
      transform: translateY(0);
      animation: none;
    }
  }

  @media (max-width: 768px) {
    .about-page {
      --panel-padding-x: 20px;
    }

    .intro-content {
      gap: 24px;
    }
  }
</style>
