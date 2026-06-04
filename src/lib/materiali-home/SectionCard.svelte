<script>
  import CardModel from './CardModel.svelte';
  import SectionCardTitle from './SectionCardTitle.svelte';

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
  <article class="section-card glass-surface theme-{theme}" data-theme={theme}>
    <div class="card-glow" aria-hidden="true"></div>
    <div class="card-object" aria-hidden="true">
      <CardModel src={modelSrc} label={title} {active} {hovered} showLabel={false} />
    </div>
    <SectionCardTitle {title} />
  </article>
</a>

<style>
  .section-card-link {
    text-decoration: none;
    color: inherit;
    display: block;
    width: min(100%, 340px);
    height: min(58vh, 520px);
    outline: none;
  }

  .section-card-link:focus-visible .section-card {
    outline: 2px solid #000000;
    outline-offset: 4px;
  }

  .section-card {
    --card-accent: #000000;
    position: relative;
    width: 100%;
    height: 100%;
    border-radius: 56px;
    overflow: visible;
    transition:
      border-color 0.4s ease,
      background 0.4s ease,
      box-shadow 0.4s ease;
  }

  .theme-sustainability {
    --card-accent: #3eaf3f;
  }

  .theme-sport {
    --card-accent: #422ccb;
  }

  .theme-infrastructure {
    --card-accent: #ff783c;
  }

  .card-glow {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 140%;
    height: 130%;
    transform: translate(-50%, -50%);
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.4s ease;
    z-index: 1;
  }

  .theme-sustainability .card-glow {
    background: radial-gradient(
      ellipse 55% 50% at 50% 45%,
      rgba(62, 175, 63, 0.55) 0%,
      rgba(62, 175, 63, 0.2) 45%,
      transparent 70%
    );
  }

  .theme-sport .card-glow {
    background: radial-gradient(
      ellipse 55% 50% at 50% 45%,
      rgba(66, 44, 203, 0.55) 0%,
      rgba(66, 44, 203, 0.2) 45%,
      transparent 70%
    );
  }

  .theme-infrastructure .card-glow {
    background: radial-gradient(
      ellipse 55% 50% at 50% 45%,
      rgba(255, 120, 60, 0.55) 0%,
      rgba(255, 120, 60, 0.2) 45%,
      transparent 70%
    );
  }

  .section-card-link:hover .section-card,
  .section-card-link:focus-within .section-card {
    background: var(--glass-bg-hover);
    border-color: color-mix(in srgb, var(--card-accent) 35%, var(--glass-border));
    box-shadow:
      var(--glass-shadow),
      0 0 0 1px color-mix(in srgb, var(--card-accent) 25%, var(--glass-rim)),
      0 12px 48px color-mix(in srgb, var(--card-accent) 18%, transparent);
  }

  .section-card-link:hover .card-glow,
  .section-card-link:focus-within .card-glow {
    opacity: 1;
  }

  .card-object {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 2;
    overflow: visible;
  }

  @media (max-width: 640px) {
    .section-card-link {
      width: min(92vw, 340px);
      height: min(54vh, 480px);
    }
  }
</style>
