<script>
  import CardModel from './CardModel.svelte';
  import SectionCardTitle from './SectionCardTitle.svelte';
  import '$lib/styles/tokens/colors.css';
  import '$lib/styles/tokens/gradients.css';

  /** @type {{ title: string, theme: 'sustainability' | 'sport' | 'infrastructure', modelSrc: string, href: string, active?: boolean }} */
  let { title, theme, modelSrc, href, active = false } = $props();

  let hovered = $state(false);

  /** @param {boolean} value */
  function setHovered(value) {
    hovered = value;
  }
</script>

<a
  {href}
  class="section-card-link"
  aria-label="{title} — apri sezione"
  onmouseenter={() => setHovered(true)}
  onmouseleave={(e) => {
    const el = e.currentTarget;
    if (el instanceof HTMLElement && el.matches(':focus-within')) return;
    setHovered(false);
  }}
  onfocusin={() => setHovered(true)}
  onfocusout={(e) => {
    const el = e.currentTarget;
    if (
      el instanceof HTMLElement &&
      e.relatedTarget instanceof Node &&
      el.contains(e.relatedTarget)
    ) {
      return;
    }
    setHovered(false);
  }}
>
  <div class="card-halo theme-{theme}" aria-hidden="true"></div>
  <article class="section-card theme-{theme}" data-theme={theme}>
    <div class="card-object" aria-hidden="true">
      <CardModel src={modelSrc} label={title} {active} {hovered} showLabel={false} />
    </div>
    <SectionCardTitle {title} {theme} />
  </article>
</a>

<style>
  .section-card-link {
    position: relative;
    text-decoration: none;
    color: inherit;
    display: block;
    width: 354px;
    height: 380px;
    outline: none;
  }

  .section-card-link:focus-visible .section-card {
    outline: 2px solid #161a1f;
    outline-offset: 4px;
  }

  .card-halo {
    position: absolute;
    inset: -48px;
    border-radius: 32px;
    opacity: 0;
    pointer-events: none;
    z-index: 0;
    filter: blur(26px);
    transform: scale(1.02);
    transition: opacity 0.35s ease;
  }

  .card-halo.theme-sustainability {
    background: var(--section-sustainability-halo);
  }

  .card-halo.theme-sport {
    background: var(--section-sport-halo);
  }

  .card-halo.theme-infrastructure {
    background: var(--section-infrastructure-halo);
  }

  .section-card-link:hover .card-halo,
  .section-card-link:focus-within .card-halo {
    opacity: 1;
  }

  .section-card {
    position: relative;
    z-index: 1;
    width: 100%;
    height: 100%;
    background: rgba(255, 255, 255, 0.5);
    border: 2px solid #161a1f;
    border-radius: 14px;
    overflow: hidden;
    box-sizing: border-box;
    transition:
      border-color 0.35s ease,
      box-shadow 0.35s ease;
  }

  .section-card-link:hover .theme-sustainability.section-card,
  .section-card-link:focus-within .theme-sustainability.section-card {
    border-color: var(--section-sustainability-500);
    box-shadow:
      0 0 24px rgba(71, 208, 142, 0.5),
      0 0 48px rgba(71, 208, 142, 0.32),
      0 0 80px rgba(71, 208, 142, 0.18);
  }

  .section-card-link:hover .theme-sport.section-card,
  .section-card-link:focus-within .theme-sport.section-card {
    border-color: var(--section-sport-500);
    box-shadow:
      0 0 24px rgba(137, 186, 255, 0.52),
      0 0 48px rgba(137, 186, 255, 0.34),
      0 0 80px rgba(137, 186, 255, 0.2);
  }

  .section-card-link:hover .theme-infrastructure.section-card,
  .section-card-link:focus-within .theme-infrastructure.section-card {
    border-color: var(--section-infrastructure-500);
    box-shadow:
      0 0 24px rgba(255, 131, 76, 0.5),
      0 0 48px rgba(255, 131, 76, 0.32),
      0 0 80px rgba(255, 131, 76, 0.18);
  }

  .card-object {
    position: absolute;
    top: 30px;
    left: 50%;
    transform: translateX(-50%);
    width: 280px;
    height: 220px;
    pointer-events: none;
    z-index: 1;
    overflow: visible;
  }

  @media (max-width: 640px) {
    .section-card-link {
      width: min(92vw, 354px);
      height: auto;
      aspect-ratio: 354 / 380;
    }

    .card-object {
      top: 7.9%;
      width: 79%;
      height: 57.9%;
    }

    .card-halo {
      inset: -36px;
      filter: blur(22px);
    }
  }
</style>
