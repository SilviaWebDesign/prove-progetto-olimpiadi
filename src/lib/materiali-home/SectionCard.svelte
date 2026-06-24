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
    transform-origin: center center;
    transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1);
  }

  @media (hover: hover) {
    .section-card-link:hover,
    .section-card-link:focus-within {
      transform: scale(1.06);
      z-index: 2;
    }
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

  .card-halo.theme-sustainability,
  .card-halo.theme-sport,
  .card-halo.theme-infrastructure {
    background: radial-gradient(
      ellipse 72% 68% at 50% 44%,
      rgba(22, 26, 31, 0.18) 0%,
      rgba(22, 26, 31, 0.09) 38%,
      rgba(22, 26, 31, 0.04) 58%,
      rgba(22, 26, 31, 0) 78%
    );
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

  .section-card-link:hover .section-card,
  .section-card-link:focus-within .section-card {
    border-color: #161a1f;
    box-shadow:
      0 0 24px rgba(0, 0, 0, 0.12),
      0 0 48px rgba(0, 0, 0, 0.07),
      0 0 80px rgba(0, 0, 0, 0.04);
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

  @media (max-width: 768px) {
    .section-card-link {
      flex: 1 1 0;
      width: min(calc(100vw - 48px), 354px);
      min-height: 0;
      max-height: 157px;
      height: auto;
    }

    .section-card {
      border-width: 1px;
      border-radius: clamp(18px, 4.5vmin, 32px);
    }

    .card-object {
      inset: 0;
      top: 0;
      left: 0;
      transform: none;
      width: 100%;
      height: 100%;
      overflow: hidden;
    }

    .theme-sport .card-object {
      transform: scale(1.35);
      transform-origin: center 55%;
    }

    .card-halo {
      inset: -20px;
      border-radius: 40px;
      filter: blur(18px);
    }
  }
</style>
