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
  let contentEl = $state(null);

  async function fitPanelContent() {
    await tick();
    if (!panelEl || !contentEl) return;

    contentEl.style.zoom = '1';

    const available = panelEl.clientHeight;
    const needed = contentEl.scrollHeight;
    if (needed <= available || available <= 0) return;

    const scale = Math.max(0.76, available / needed);
    contentEl.style.zoom = String(scale);
  }

  $effect(() => {
    hotspot.id;
    paragraphs.length;
    fitPanelContent();
  });

  $effect(() => {
    if (!panelEl) return;

    const observer = new ResizeObserver(() => {
      fitPanelContent();
    });
    observer.observe(panelEl);

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
  </div>

  <aside class="sport-panel" bind:this={panelEl} aria-labelledby="sport-detail-title">
    <div class="sport-panel-content" bind:this={contentEl}>
      {#key hotspot.id}
        <h1 id="sport-detail-title" class="sport-title">{title}</h1>
        <div class="sport-body">
          {#each paragraphs as paragraph}
            <p>{paragraph}</p>
          {/each}
        </div>
      {/key}
    </div>
  </aside>

  <button type="button" class="continue-btn" onclick={onContinue}>
    <span class="continue-label">Continua</span>
    <span class="continue-chevron" aria-hidden="true"></span>
  </button>
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

  .sport-panel-content {
    position: relative;
    padding: 0 0 24px;
    transform-origin: top right;
    --sport-title-size: clamp(1.75rem, 3.2vw, 36px);
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

  .continue-btn {
    position: absolute;
    left: calc(45.83% + 40.5px);
    bottom: clamp(28px, 6vh, 48px);
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 22px;
    margin: 0;
    padding: 8px 14px;
    border: none;
    background: transparent;
    cursor: pointer;
    pointer-events: auto;
  }

  .continue-label {
    font-family: 'Supreme Variable', sans-serif;
    font-size: 16px;
    font-weight: 700;
    line-height: 1.1;
    color: #161a1f;
  }

  .continue-chevron {
    display: block;
    width: 25px;
    height: 10px;
    background-image: url("data:image/svg+xml,%3Csvg width='25' height='10' viewBox='0 0 25 10' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L12.5 8.5L24 1.5' stroke='%23161A1F' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: center;
    background-size: contain;
    animation: bounce 2s infinite;
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

  @keyframes bounce {
    0%,
    100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(4px);
    }
  }

  @media (max-width: 900px) {
    .sport-detail {
      --panel-padding-x: 20px;
    }

    .grad-side {
      width: 100%;
      background: linear-gradient(
        to top,
        #f9f9fa 0%,
        rgba(249, 249, 250, 0.96) 52%,
        rgba(249, 249, 250, 0.55) 68%,
        rgba(249, 249, 250, 0) 82%
      );
    }

    .sport-panel {
      top: auto;
      right: 0;
      left: 0;
      bottom: 0;
      transform: none;
      width: 100%;
      max-height: min(74vh, calc(100vh - 108px));
      overflow: hidden;
      padding: 0;
      background: linear-gradient(to top, #f9f9fa 94%, rgba(249, 249, 250, 0.98));
      border-radius: 20px 20px 0 0;
      animation-name: panelInMobile;
    }

    .sport-panel-content {
      padding: 20px var(--panel-padding-x) 28px;
      transform-origin: top center;
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
