<script>
  /** @type {{ title: string, id?: string }} */
  let { title, id = undefined } = $props();
</script>

<h1 {id} class="section-hero-title" style="--title-chars: {title.length}">{title}</h1>

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
    color: #161a1f;
    white-space: nowrap;
    pointer-events: none;
  }

  @media (max-width: 900px) {
    .section-hero-title {
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
</style>
