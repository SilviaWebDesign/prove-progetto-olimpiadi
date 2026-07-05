<script>
  import FactCard from './FactCard.svelte';
  import { getHotspotPathIndex, ABOUT_HOTSPOT_PATH } from './aboutHotspots.js';

  /** @type {{
   *   hotspot: import('./aboutHotspots.js').AboutHotspot;
   *   onprev?: () => void;
   *   onnext?: () => void;
   * }} */
  let { hotspot, onprev, onnext } = $props();

  const pathIndex = $derived(getHotspotPathIndex(hotspot.id));
  const hasPrev = $derived(pathIndex > 0);
  const hasNext = $derived(pathIndex >= 0 && pathIndex < ABOUT_HOTSPOT_PATH.length - 1);
</script>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div class="card-backdrop">
  <div class="card-wrap">
    <nav class="path-nav" aria-label="Percorso sulla montagna">
      <button
        type="button"
        class="path-btn"
        disabled={!hasPrev}
        aria-label="Tappa precedente"
        onclick={() => onprev?.()}
      >
        ←
      </button>
      <span class="path-progress">
        {pathIndex + 1} / {ABOUT_HOTSPOT_PATH.length}
      </span>
      <button
        type="button"
        class="path-btn"
        disabled={!hasNext}
        aria-label="Tappa successiva"
        onclick={() => onnext?.()}
      >
        →
      </button>
    </nav>

    {#key hotspot.id}
      <FactCard label={hotspot.label} body={hotspot.body} docked />
    {/key}
  </div>
</div>

<style>
  .card-backdrop {
    position: fixed;
    inset: 0;
    z-index: 50;
    display: flex;
    align-items: flex-end;
    justify-content: flex-start;
    padding: clamp(16px, 4vw, 48px);
    padding-bottom: clamp(24px, 6vh, 64px);
    padding-left: clamp(24px, 5vw, 79px);
    pointer-events: none;
  }

  .card-wrap {
    position: relative;
    max-width: min(424px, calc(100vw - 48px));
    --card-nav-offset: 52px;
    --card-inset-x: 45px;
    --card-inset-y: 40px;
    pointer-events: auto;
    animation: cardIn 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
  }

  .path-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
    padding: 0 4px;
  }

  .path-btn {
    width: 40px;
    height: 40px;
    margin: 0;
    padding: 0;
    border: 1px solid rgba(22, 26, 31, 0.2);
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.8);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    font-size: 1.1rem;
    line-height: 1;
    color: #161a1f;
    cursor: pointer;
  }

  .path-btn:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.98);
  }

  .path-btn:disabled {
    opacity: 0.35;
    cursor: default;
  }

  .path-btn:focus-visible {
    outline: 2px solid #161a1f;
    outline-offset: 2px;
  }

  .path-progress {
    font-family: 'Supreme Variable', sans-serif;
    font-size: 0.85rem;
    font-weight: 800;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #161a1f;
  }

  .card-wrap :global(.fact-card) {
    pointer-events: auto;
    height: auto;
    min-height: 280px;
    max-height: min(520px, 68vh);
  }

  .card-wrap :global(.fact-card.docked) {
    height: auto;
    min-height: 280px;
    max-height: min(520px, 68vh);
  }

  @keyframes cardIn {
    from {
      opacity: 0;
      transform: translateY(18px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (max-width: 768px) {
    .card-backdrop {
      align-items: flex-end;
      justify-content: center;
      padding: 16px;
      padding-bottom: max(16px, env(safe-area-inset-bottom));
    }

    .card-wrap {
      width: 100%;
      max-width: none;
    }
  }
</style>
