<script>
  /** @type {{ title: string, id?: string, layout?: 'center' | 'spread' }} */
  let { title, id = undefined, layout = 'center' } = $props();

  const letters = $derived([...title]);
</script>

{#if layout === 'spread'}
  <h1 {id} class="section-hero-title section-hero-title--spread" aria-label={title}>
    {#each letters as letter, index (index)}
      <span class="section-hero-title__letter" aria-hidden="true">{letter}</span>
    {/each}
  </h1>
{:else}
  <h1 {id} class="section-hero-title" style="--title-chars: {title.length}">{title}</h1>
{/if}

<style>
  /* Titolo grande sezione — come hero SectionPage / card home */
  .section-hero-title {
    position: relative;
    z-index: 2;
    flex-shrink: 0;
    width: 100%;
    margin: 0 0 -0.06em;
    padding: 0.12em 0 0;
    box-sizing: border-box;
    font-family: 'PP Formula Condensed', var(--font-title);
    font-size: min(
      300px,
      max(18vw, calc(100vw / (var(--title-chars, 12) * 0.44)))
    );
    font-weight: 900;
    font-variation-settings: 'wght' 900;
    font-stretch: condensed;
    line-height: 0.72;
    letter-spacing: clamp(6px, 1.2vw, 18.2px);
    text-align: center;
    text-transform: uppercase;
    color: #000000;
    white-space: nowrap;
    pointer-events: none;
  }

  @media (max-width: 900px) {
    .section-hero-title:not(.section-hero-title--spread) {
      font-size: min(
        10rem,
        max(15vw, calc(100vw / (var(--title-chars, 12) * 0.5)))
      );
      letter-spacing: clamp(3px, 0.8vw, 12px);
      line-height: 0.72;
      white-space: normal;
      padding: 0.1em 0.5rem 0;
      margin-bottom: -0.06em;
    }
  }

  .section-hero-title--spread {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    width: 100%;
    max-width: 100%;
    padding: 0.12em 0 0;
    letter-spacing: 0;
    text-align: initial;
    white-space: nowrap;
    font-size: min(300px, 22vw);
  }

  .section-hero-title__letter {
    flex: 0 0 auto;
  }

  @media (max-width: 900px) {
    .section-hero-title--spread {
      font-size: min(10rem, 18vw);
      padding: 0.1em 0 0;
    }
  }
</style>
