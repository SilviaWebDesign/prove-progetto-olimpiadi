<script>
  /** @type {{ hotspot: import('./aboutHotspots.js').AboutHotspot }} */
  let { hotspot } = $props();

  const title = $derived(hotspot.title ?? hotspot.label);
  const preview = $derived(getPreview(hotspot.body));

  /** @param {string} body */
  function getPreview(body) {
    const first = body
      .split(/\n\n+/)
      .map((p) => p.trim())
      .find(Boolean);

    if (!first) return '';

    const sentenceBreak = first.search(/\.\s+(?=[A-ZÀ-ÖØ-Þ"L««])/u);
    let text = sentenceBreak > -1 ? first.slice(0, sentenceBreak + 1) : first;

    const max = 200;
    if (text.length <= max) return text;

    const trimmed = text.slice(0, max).trimEnd();
    const lastPeriod = trimmed.lastIndexOf('.');
    if (lastPeriod > 60) return trimmed.slice(0, lastPeriod + 1);

    return `${trimmed}…`;
  }
</script>

<article class="hotspot-preview-card" aria-label={`Anteprima: ${title}`}>
  <h3 class="hotspot-preview-card__title">{title}</h3>
  <p class="hotspot-preview-card__body">{preview}</p>
</article>

<style>
  .hotspot-preview-card {
    position: relative;
    isolation: isolate;
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: 100%;
    max-width: 356px;
    padding: var(--spacing-md, 20px);
    background: rgba(255, 255, 255, 0.18);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: var(--border-thin, 1px solid rgba(22, 24, 29, 0.5));
    border-radius: var(--radius-xs, 8px);
    color: var(--color-text-primary, #000000);
    box-shadow:
      0 6px 20px rgba(0, 0, 0, 0.08),
      inset 0 1px 1px rgba(255, 255, 255, 0.4);
    overflow: hidden;
    pointer-events: none;
  }

  .hotspot-preview-card::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: -1;
    border-radius: inherit;
    opacity: 0.45;
    pointer-events: none;
    filter: blur(6px);
    background-image: radial-gradient(
      ellipse 75% 75% at 22% 50%,
      rgba(22, 24, 29, 0.14) 0%,
      rgba(22, 24, 29, 0.03) 60%,
      rgba(255, 255, 255, 0) 100%
    );
  }

  .hotspot-preview-card__title {
    margin: 0;
    font-family: 'Supreme Variable', sans-serif;
    font-size: 12px;
    font-weight: 700;
    line-height: 1.2;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #161a1f;
  }

  .hotspot-preview-card__body {
    margin: 0;
    font: var(--text-comment-body-sm-font, 600 14px/1.3 'Supreme Variable', sans-serif);
    display: -webkit-box;
    -webkit-line-clamp: 4;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>
