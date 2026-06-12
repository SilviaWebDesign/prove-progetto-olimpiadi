<script>
  import SectionFactBlock from '$lib/components/SectionFactBlock.svelte';
  import CommentCard from '$lib/components/CommentCard.svelte';
  import { FACT_DOCK, FACT_DOCK_FRAME, OPINIONS_STACK_HEIGHT } from './factDockLayout.js';

  /** @param {string} s */
  function stripOuterQuotes(s) {
    return s.replace(/^[""«']+|[""»']+$/g, '').trim();
  }

  /**
   * @type {{
   *   fact: { id: string, label: string, title?: string, body: string, sources: string },
   *   factCount?: number,
   *   opinions: { id: string, quote: string, sentiment?: string }[],
   *   opacity?: number,
   *   likedIds?: Set<string>,
   *   onToggleLike?: (opinionId: string) => void,
   *   showGateHint?: boolean,
   *   factIndex?: number
   * }}
   */
  let {
    fact,
    opinions,
    opacity = 1,
    likedIds = new Set(),
    onToggleLike,
    showGateHint = false,
    factIndex = 0,
    factCount = 3
  } = $props();

  const frameW = FACT_DOCK_FRAME.width;
  const frameH = FACT_DOCK_FRAME.height;
</script>

<div
  class="fact-main-stage"
  aria-label="Fact {factIndex + 1} e opinioni"
  style:opacity={opacity}
  style:pointer-events={opacity > 0.4 ? 'auto' : 'none'}
  style:--dock-frame-w={String(frameW)}
  style:--dock-frame-h={String(frameH)}
  style:--dock-col-w="min({FACT_DOCK.columnWidth}px, calc(100vw * {FACT_DOCK.columnWidth} / {frameW}))"
  style:--dock-left="max(16px, calc(100vw * {FACT_DOCK.insetLeft} / {frameW}))"
  style:--dock-top="max(100px, calc(100vh * {FACT_DOCK.contentTop} / {frameH}))"
  style:--dock-opinion-gap="{FACT_DOCK.opinionGap}px"
  style:--dock-opinions-h="{OPINIONS_STACK_HEIGHT}px"
  style:--dock-fact-h="{FACT_DOCK.factHeight}px"
  style:--dock-safe-x="16px"
>
  <div class="fact-main-layout">
    <div class="fact-main-card">
      <SectionFactBlock
        counter="{factIndex + 1} / {factCount}"
        title={fact.title ?? fact.label}
        body={fact.body}
        source={fact.sources}
      />
    </div>

    <aside class="fact-main-opinions" aria-label="Opinioni">
      <div class="opinions-list">
        {#each opinions as opinion (opinion.id)}
          <CommentCard
            comment={{ body: stripOuterQuotes(opinion.quote) }}
            sectionId="sustainability"
            liked={likedIds.has(opinion.id)}
            size="sm"
            onToggleLike={() => onToggleLike?.(opinion.id)}
          />
        {/each}
      </div>
      {#if showGateHint}
        <p class="gate-hint" aria-live="polite">
          Metti like ad almeno un'opinione per continuare
        </p>
      {/if}
    </aside>
  </div>
</div>

<style>
  /* Figma 2:234 — fact sinistra (80, 180), opinioni destra (66.67% − 2px, 180) */
  .fact-main-stage {
    position: fixed;
    inset: 0;
    z-index: 12;
    pointer-events: none;
    overflow: visible;
    transition: opacity 0.35s ease;
  }

  .fact-main-layout {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  .fact-main-card {
    position: absolute;
    left: max(var(--dock-safe-x), min(var(--dock-left), calc(100vw - var(--dock-col-w) - var(--dock-safe-x))));
    top: var(--dock-top);
    width: min(var(--dock-col-w), calc(100vw - (var(--dock-safe-x) * 2)));
    pointer-events: none;
    transform-origin: top left;
  }

  .fact-main-card :global(.section-fact-block) {
    width: 100%;
    max-width: 100%;
    pointer-events: none;
  }

  .fact-main-opinions {
    position: absolute;
    left: calc(66.667% + 56px);
    top: var(--dock-top);
    width: var(--dock-col-w);
    display: flex;
    flex-direction: column;
    gap: var(--dock-opinion-gap);
    pointer-events: auto;
    box-sizing: border-box;
    overflow: visible;
    transform-origin: top right;
  }

  .opinions-list {
    display: flex;
    flex-direction: column;
    gap: var(--dock-opinion-gap);
    width: 100%;
  }

  .gate-hint {
    margin: 0;
    padding: 12px 16px;
    font-family: 'Supreme Variable', sans-serif;
    font-size: 14px;
    font-weight: 800;
    text-transform: uppercase;
    color: #000000;
    background: rgba(62, 175, 63, 0.15);
    border-radius: 12px;
    border: 1px solid #3eaf3f;
  }

  /* Scala proporzionale se l’altezza non contiene le 6 opinioni (senza scroll) */
  @media (max-height: 920px) {
    .fact-main-opinions {
      transform: scale(
        min(1, calc((100vh - var(--dock-top) - 40px) / var(--dock-opinions-h)))
      );
    }

    .fact-main-card {
      transform: scale(
        min(1, calc((100vh - var(--dock-top) - 40px) / var(--dock-fact-h, 520px)))
      );
    }
  }

  @media (max-width: 1100px) {
    .fact-main-opinions {
      left: auto;
      right: max(16px, calc(100vw * 80 / var(--dock-frame-w)));
    }

    .fact-main-card {
      left: max(var(--dock-safe-x), min(var(--dock-left), calc(100vw - var(--dock-col-w) - var(--dock-safe-x))));
    }
  }

  @media (max-width: 900px) {
    .fact-main-layout {
      transform: scale(0.92);
      transform-origin: top center;
    }
  }
</style>
