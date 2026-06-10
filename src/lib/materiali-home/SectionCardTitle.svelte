<script>
  /** @type {{ title: string, theme: 'sustainability' | 'sport' | 'infrastructure' }} */
  let { title, theme } = $props();
</script>

<p class="section-card-title theme-{theme}">{title}</p>

<style>
  .section-card-title {
    position: absolute;
    z-index: 3;
    margin: 0;
    height: 64px;
    font-family: 'PP Formula Condensed', var(--font-title);
    font-size: 64px;
    font-weight: 900;
    font-variation-settings: 'wght' 900;
    font-stretch: condensed;
    line-height: 1.3;
    text-align: center;
    text-transform: uppercase;
    color: #161a1f;
    word-break: break-word;
    pointer-events: none;
    text-shadow:
      0 0 0.35em #ffffff,
      0 0 0.7em #ffffff,
      0 0 1.1em rgba(255, 255, 255, 0.85);
  }

  .theme-sustainability {
    top: 74.74%;
    left: -23.16%;
    right: -23.16%;
  }

  .theme-sport {
    top: 74.74%;
    left: 50%;
    transform: translateX(-50%);
    width: 106.5%;
  }

  .theme-infrastructure {
    top: 75%;
    left: 50%;
    transform: translateX(-50%);
    width: 126.8%;
  }

  @media (max-width: 768px) {
    .section-card-title,
    .section-card-title.theme-sustainability,
    .section-card-title.theme-sport,
    .section-card-title.theme-infrastructure {
      top: 50%;
      left: 16px;
      right: 16px;
      bottom: auto;
      width: auto;
      height: auto;
      transform: translateY(-50%);
      font-size: clamp(2.25rem, 10vmin, 64px);
      line-height: 1.1;
      white-space: nowrap;
    }
  }
</style>
