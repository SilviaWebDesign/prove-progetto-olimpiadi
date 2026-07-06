<script>
  import { tick, onMount } from 'svelte';
  import { getHotspotPathIndex, ABOUT_HOTSPOT_PATH } from './aboutHotspots.js';

  /** @type {{
   *   hotspot: import('./aboutHotspots.js').AboutHotspot;
   *   onclose: () => void;
   *   onnext?: () => void;
   * }} */
  let { hotspot, onclose, onnext } = $props();

  const pathIndex = $derived(getHotspotPathIndex(hotspot.id));
  const hasNext = $derived(pathIndex >= 0 && pathIndex < ABOUT_HOTSPOT_PATH.length - 1);
  const title = $derived(hotspot.title ?? hotspot.label);
  const paragraphs = $derived(
    hotspot.body
      .split(/\n\n+/)
      .map((p) => p.trim())
      .filter(Boolean)
  );

  /** @type {HTMLElement | null} */
  let panelEl = $state(null);
  /** @type {HTMLElement | null} */
  let scrollEl = $state(null);
  /** @type {HTMLElement | null} */
  let contentEl = $state(null);
  /** @type {HTMLElement | null} */
  let titleEl = $state(null);
  let canScroll = $state(false);
  let scrollRatio = $state(0);
  let thumbRatio = $state(1);
  let sliderTop = $state(0);
  let sliderTrackHeight = $state(0);

  function measureSliderFrame() {
    if (!scrollEl || !contentEl || !titleEl) return;

    const contentStyles = getComputedStyle(contentEl);
    const paddingTop = Number.parseFloat(contentStyles.paddingTop) || 0;
    sliderTop = contentEl.offsetTop + paddingTop + titleEl.offsetTop;
    sliderTrackHeight = Math.max(0, scrollEl.clientHeight - sliderTop);
  }

  function syncSlider() {
    if (!scrollEl) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollEl;
    const maxScroll = scrollHeight - clientHeight;
    canScroll = maxScroll > 4;
    scrollRatio = maxScroll > 0 ? scrollTop / maxScroll : 0;
    thumbRatio =
      scrollHeight > 0 ? Math.max(0.14, Math.min(1, clientHeight / scrollHeight)) : 1;
    measureSliderFrame();
  }

  /** @param {number} value @param {number} min @param {number} max */
  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  /** @param {PointerEvent} event */
  function onTrackPointerDown(event) {
    if (!scrollEl || !canScroll || event.target !== event.currentTarget) return;
    const track = /** @type {HTMLElement} */ (event.currentTarget);
    const rect = track.getBoundingClientRect();
    const thumbHeight = thumbRatio * rect.height;
    const y = event.clientY - rect.top - thumbHeight / 2;
    const ratio = clamp(y / Math.max(rect.height - thumbHeight, 1), 0, 1);
    scrollEl.scrollTop = ratio * (scrollEl.scrollHeight - scrollEl.clientHeight);
    syncSlider();
  }

  /** @param {PointerEvent} event */
  function onThumbPointerDown(event) {
    if (!scrollEl || !canScroll) return;
    event.preventDefault();
    event.stopPropagation();

    const startY = event.clientY;
    const startScroll = scrollEl.scrollTop;
    const maxScroll = scrollEl.scrollHeight - scrollEl.clientHeight;
    const trackHeightPx = sliderTrackHeight;
    const thumbHeightPx = thumbRatio * trackHeightPx;

    /** @param {PointerEvent} moveEvent */
    const onMove = (moveEvent) => {
      const delta = moveEvent.clientY - startY;
      const scrollDelta =
        (delta / Math.max(trackHeightPx - thumbHeightPx, 1)) * maxScroll;
      scrollEl.scrollTop = clamp(startScroll + scrollDelta, 0, maxScroll);
      syncSlider();
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  async function fitPanelContent() {
    await tick();
    if (!panelEl || !contentEl) return;

    contentEl.style.zoom = '1';
    syncSlider();
  }

  $effect(() => {
    hotspot.id;
    paragraphs.length;
    fitPanelContent();
  });

  $effect(() => {
    if (!panelEl || !scrollEl || !contentEl || !titleEl) return;

    const observer = new ResizeObserver(() => {
      fitPanelContent();
      syncSlider();
    });
    observer.observe(panelEl);
    observer.observe(scrollEl);
    observer.observe(contentEl);
    observer.observe(titleEl);

    return () => observer.disconnect();
  });

  onMount(() => {
    document.fonts?.ready.then(() => fitPanelContent());
    window.addEventListener('resize', fitPanelContent);

    return () => {
      window.removeEventListener('resize', fitPanelContent);
    };
  });

  function onContinue() {
    if (hasNext) onnext?.();
    else onclose();
  }
</script>

<div class="sport-detail">
  <div class="sport-detail-gradients" aria-hidden="true">
    <div class="grad-side"></div>
    <div class="grad-mobile-halo"></div>
  </div>

  <aside class="sport-panel" bind:this={panelEl} aria-labelledby="sport-detail-title">
    <div class="sport-panel-scroll" bind:this={scrollEl} onscroll={syncSlider}>
      <div class="sport-panel-content" bind:this={contentEl}>
        {#key hotspot.id}
          <h1 id="sport-detail-title" class="sport-title" bind:this={titleEl}>{title}</h1>
          <div class="sport-body">
            {#each paragraphs as paragraph}
              <p>{paragraph}</p>
            {/each}
          </div>
        {/key}
      </div>
    </div>

    <div
      class="sport-text-slider"
      class:sport-text-slider--active={canScroll}
      style:top="{sliderTop}px"
      style:height="{sliderTrackHeight}px"
      aria-hidden="true"
    >
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div class="sport-text-slider__track" onpointerdown={onTrackPointerDown}>
        <div
          class="sport-text-slider__thumb"
          style="--scroll-ratio: {scrollRatio}; --thumb-ratio: {thumbRatio}"
          onpointerdown={onThumbPointerDown}
        ></div>
      </div>
    </div>
  </aside>

  <footer class="sport-continue-wrap">
    <button type="button" class="continue-btn" onclick={onContinue}>
      <span class="continue-label">CONTINUA</span>
      <svg class="continue-chevron" viewBox="0 0 21 9" aria-hidden="true" fill="none">
        <path
          d="M1 1.35L10.5 7.65L20 1.35"
          stroke="#161A1F"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>
  </footer>
</div>

<style>
  .sport-detail {
    position: fixed;
    inset: 0;
    z-index: 50;
    pointer-events: none;
    --panel-padding-x: clamp(24px, 5.23vw, 79px);
  }

  .sport-detail-gradients {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  .grad-side {
    position: absolute;
    top: 0;
    left: 36%;
    right: 0;
    height: 100%;
    background: linear-gradient(
      to right,
      rgba(249, 249, 250, 0) 0%,
      rgba(249, 249, 250, 0.72) 22%,
      rgba(249, 249, 250, 0.92) 38%,
      #f9f9fa 50%
    );
  }

  .grad-mobile-halo {
    display: none;
  }

  .sport-panel {
    position: absolute;
    top: calc(50% + 22px);
    right: var(--panel-padding-x);
    left: auto;
    transform: translateY(-50%);
    width: min(402px, calc(50vw - var(--panel-padding-x) - 12px));
    max-height: calc(100vh - clamp(108px, 14vh, 136px));
    overflow: hidden;
    padding: 0;
    box-sizing: border-box;
    pointer-events: auto;
    animation: panelIn 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
  }

  .sport-panel-scroll {
    position: relative;
    height: 100%;
    overflow-x: hidden;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
    scrollbar-width: none;
    -ms-overflow-style: none;
    padding-right: 17px;
    box-sizing: border-box;
  }

  .sport-panel-scroll::-webkit-scrollbar {
    display: none;
  }

  .sport-panel-content {
    position: relative;
    padding: 0 0 28px;
    transform-origin: top right;
    --sport-title-size: clamp(1.75rem, 3.2vw, 36px);
  }

  .sport-text-slider {
    position: absolute;
    top: 0;
    right: 0;
    width: 3px;
    z-index: 2;
    opacity: 0.35;
    transition: opacity 0.2s ease;
    pointer-events: none;
  }

  .sport-text-slider--active {
    opacity: 1;
    pointer-events: auto;
  }

  .sport-text-slider__track {
    position: relative;
    width: 100%;
    height: 100%;
    border-radius: 2px;
    background: rgba(22, 26, 31, 0.12);
    cursor: pointer;
    touch-action: none;
  }

  .sport-text-slider__thumb {
    position: absolute;
    left: 0;
    right: 0;
    border-radius: 2px;
    background: rgba(22, 26, 31, 0.42);
    height: calc(var(--thumb-ratio, 1) * 100%);
    top: calc(var(--scroll-ratio, 0) * (100% - var(--thumb-ratio, 1) * 100%));
    cursor: grab;
    touch-action: none;
  }

  .sport-text-slider__thumb:active {
    cursor: grabbing;
  }

  .sport-title {
    margin: 0 0 16px;
    font-family: 'Supreme Variable', sans-serif;
    font-size: var(--sport-title-size);
    font-weight: 800;
    line-height: 1.1;
    letter-spacing: 0.2px;
    color: #161a1f;
  }

  .sport-body {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .sport-body p {
    margin: 0;
    font-family: 'Supreme Variable', sans-serif;
    font-size: 16px;
    font-weight: 400;
    line-height: normal;
    color: #161a1f;
    text-indent: 0.45em;
  }

  .sport-continue-wrap {
    position: absolute;
    left: calc(45.83% + 40.5px);
    bottom: clamp(28px, 6vh, 48px);
    transform: translateX(-50%);
    z-index: 51;
    pointer-events: none;
    padding-top: 64px;
  }

  .continue-btn {
    font-family: 'Supreme Variable', sans-serif;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    margin: 0;
    padding: 0 14px 10px;
    border: none;
    background: transparent;
    cursor: pointer;
    pointer-events: auto;
  }

  .continue-label {
    font-family: 'Supreme Variable', sans-serif;
    font-size: 12px;
    font-weight: 700;
    line-height: 1;
    margin-top: -4px;
    text-transform: uppercase;
    color: #161a1f;
  }

  .continue-chevron {
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

  @keyframes panelIn {
    from {
      opacity: 0;
      transform: translateY(calc(-50% + 18px));
    }
    to {
      opacity: 1;
      transform: translateY(-50%);
    }
  }

  @media (max-width: 900px) {
    .sport-detail {
      --panel-padding-x: 20px;
    }

    .grad-side {
      top: auto;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 72vh;
      background: linear-gradient(
        to top,
        rgba(249, 249, 250, 0.97) 0%,
        rgba(249, 249, 250, 0.94) 38%,
        rgba(249, 249, 250, 0.78) 50%,
        rgba(249, 249, 250, 0.52) 60%,
        rgba(249, 249, 250, 0.28) 68%,
        rgba(249, 249, 250, 0.12) 74%,
        rgba(249, 249, 250, 0.04) 80%,
        rgba(249, 249, 250, 0) 88%
      );
    }

    .grad-mobile-halo {
      display: block;
      position: absolute;
      left: -12%;
      right: -12%;
      bottom: 0;
      height: 72vh;
      background: radial-gradient(
        ellipse 120% 112% at 50% 100%,
        rgba(249, 249, 250, 0.98) 0%,
        rgba(249, 249, 250, 0.92) 36%,
        rgba(249, 249, 250, 0.72) 50%,
        rgba(249, 249, 250, 0.44) 62%,
        rgba(249, 249, 250, 0.2) 72%,
        rgba(249, 249, 250, 0.06) 80%,
        rgba(249, 249, 250, 0) 90%
      );
      pointer-events: none;
    }

    .sport-panel {
      top: auto;
      right: 0;
      left: 0;
      bottom: 68px;
      transform: none;
      width: 100%;
      height: calc(50vh - 68px);
      max-height: calc(50vh - 68px);
      display: block;
      overflow: hidden;
      padding: 0;
      background: transparent;
      border-radius: 0;
      animation-name: panelInMobile;
    }

    .sport-panel-scroll {
      height: 100%;
      padding-right: calc(17px + var(--panel-padding-x));
    }

    .sport-panel-content {
      position: relative;
      z-index: 1;
      padding: 20px 0 20px var(--panel-padding-x);
      transform-origin: top center;
    }

    .sport-text-slider {
      right: var(--panel-padding-x);
    }

    .sport-continue-wrap {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      transform: none;
      z-index: 51;
      flex-shrink: 0;
      display: flex;
      justify-content: center;
      align-items: center;
      width: 100%;
      margin: 0;
      padding: 64px var(--panel-padding-x) max(18px, env(safe-area-inset-bottom));
      box-sizing: border-box;
      pointer-events: auto;
      background: transparent;
    }
  }

  @keyframes panelInMobile {
    from {
      opacity: 0;
      transform: translateY(18px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>
