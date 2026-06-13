<script>
  import SustainabilityOrbitScene from './SustainabilityOrbitScene.svelte';
  import { getFactDockT, DOCK_UI_THRESHOLD } from './sustainabilityDock.js';

  /**
   * @type {{
   *   facts: { id: string, label: string, body: string, sources: string }[],
   *   modelSrc: string,
   *   scrollProgress: number,
   *   orbitStart: number,
   *   orbitEnd: number,
   *   factSegments: { start: number, end: number }[],
   *   modelActive: boolean,
   *   reducedMotion?: boolean
   * }}
   */
  let {
    facts,
    modelSrc,
    scrollProgress,
    orbitStart,
    orbitEnd,
    factSegments,
    modelActive = false,
    reducedMotion = false
  } = $props();

  let layerOpacity = $derived(
    scrollProgress >= orbitStart && scrollProgress < (factSegments[2]?.end ?? 1) + 0.02 ? 1 : 0
  );

  let hideGuides = $derived.by(() => {
    for (let i = 0; i < factSegments.length; i++) {
      if (
        scrollProgress >= factSegments[i].start &&
        scrollProgress < factSegments[i].end &&
        getFactDockT(scrollProgress, factSegments, i) >= DOCK_UI_THRESHOLD
      ) {
        return true;
      }
    }
    return false;
  });
</script>

<div
  class="orbit-layer"
  style="opacity: {layerOpacity}; visibility: {layerOpacity > 0.05 ? 'visible' : 'hidden'}; pointer-events: {layerOpacity > 0.05 ? 'auto' : 'none'};"
  aria-hidden={layerOpacity < 0.05}
>
  <div class="orbit-guides" class:hidden={hideGuides} aria-hidden="true">
    <div class="orbit-guide orbit-guide-left"></div>
    <div class="orbit-guide orbit-guide-right"></div>
  </div>

  <div class="orbit-scene-wrap">
    <SustainabilityOrbitScene
      {facts}
      {modelSrc}
      {scrollProgress}
      {orbitStart}
      {orbitEnd}
      {factSegments}
      active={modelActive}
      {reducedMotion}
    />
  </div>
</div>

<style>
  .orbit-layer {
    position: fixed;
    inset: 0;
    z-index: 5;
    pointer-events: none;
    transition: opacity 0.35s ease;
  }

  .orbit-guides {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  .orbit-guide {
    position: absolute;
    top: 50%;
    left: 50%;
    width: min(520px, 38vw);
    height: min(620px, 58vh);
    margin: 0;
    border: 1px solid rgba(0, 0, 0, 0.08);
    border-radius: 50%;
    opacity: 0.28;
    transform: translate(-50%, -54%);
    pointer-events: none;
  }

  .orbit-guide-left {
    transform: translate(-62%, -54%) scale(0.92);
  }

  .orbit-guide-right {
    transform: translate(-38%, -54%) scale(0.92) scaleX(-1);
  }

  .orbit-guides.hidden {
    opacity: 0;
  }

  .orbit-scene-wrap {
    position: absolute;
    inset: 0;
    z-index: 1;
  }

  @media (max-width: 900px) {
    .orbit-guide {
      display: none;
    }
  }
</style>
