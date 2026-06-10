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
    font-size: 50px;
    font-weight: 900;
    font-variation-settings: 'wght' 900;
    font-stretch: condensed;
    line-height: 1.3;
    text-align: center;
    text-transform: uppercase;
    color: #161a1f;
    word-break: break-word;
    pointer-events: none;
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

  @media (max-width: 640px) {
    .section-card-title {
      font-size: clamp(1.75rem, 9vw, 50px);
      height: auto;
      min-height: 16.8%;
    }
  }
</style>
