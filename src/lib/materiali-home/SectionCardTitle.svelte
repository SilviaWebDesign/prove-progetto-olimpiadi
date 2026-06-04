<script>
  /** @type {{ title: string }} */
  let { title } = $props();
</script>

<p class="section-card-title" style="--title-chars: {title.length}">{title}</p>

<style>
  .section-card-title {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 3;
    margin: 0 0 -0.04em;
    padding: 0 16px 14px;
    box-sizing: border-box;
    font-family: 'PP Formula Condensed', var(--font-title);
    font-size: min(
      3.25rem,
      max(1.5rem, calc(100% / (var(--title-chars, 10) * 0.48)))
    );
    font-weight: 900;
    font-variation-settings: 'wght' 900;
    font-stretch: condensed;
    line-height: 0.72;
    letter-spacing: clamp(2px, 0.35vw, 8px);
    text-align: center;
    text-transform: uppercase;
    color: #161a1f;
    white-space: nowrap;
    pointer-events: none;
  }

  @media (max-width: 640px) {
    .section-card-title {
      font-size: min(2.5rem, max(1.35rem, calc(92vw / (var(--title-chars, 10) * 0.52))));
      white-space: normal;
      padding-bottom: 18px;
    }
  }
</style>
