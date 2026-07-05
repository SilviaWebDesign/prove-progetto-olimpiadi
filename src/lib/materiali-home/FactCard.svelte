<script>
  /** @type {{ label: string, body: string, sources?: string, expanded?: boolean, docked?: boolean, orbit?: boolean, class?: string }} */
  let {
    label,
    body,
    sources = '',
    expanded = false,
    docked = false,
    orbit = false,
    class: className = ''
  } = $props();
</script>

<article
  class="fact-card {className}"
  class:expanded
  class:docked
  class:orbit
  class:glass-surface={orbit}
  class:glass-orbit={orbit}
>
  <div class="fact-card-inner" class:glass-surface={!orbit}>
    <div class="fact-card-glow" aria-hidden="true"></div>
    <div class="fact-card-content">
      <div class="fact-card-header">
        <div class="fact-badge">
          <span>{label}</span>
        </div>
        <hr class="fact-divider" />
      </div>
      <p class="fact-body">{body}</p>
    </div>
    {#if sources}
      <footer class="fact-footer">
        <span class="fact-sources-label">- fonti:</span>
        <span class="fact-sources">{sources}</span>
      </footer>
    {/if}
  </div>
</article>

<style>
  .fact-card {
    --fact-card-width: min(424px, calc(100vw - 48px));
    width: var(--fact-card-width);
    height: 559px;
    box-sizing: border-box;
    pointer-events: none;
  }

  /* Orbita 3D: dimensioni fisse, vetro sull’articolo intero */
  .fact-card.orbit {
    --fact-card-width: 424px;
    width: 424px;
    max-width: none;
    height: 559px;
    border-radius: 30px;
    overflow: hidden;
  }

  .fact-card.orbit.expanded {
    height: 680px;
  }

  .fact-card.orbit .fact-card-inner {
    position: relative;
    z-index: 1;
    background: transparent;
    border: none;
    box-shadow: none;
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }

  .fact-card.expanded,
  .fact-card.docked {
    height: 680px;
  }

  .fact-card.docked .fact-badge span {
    font-size: 14px;
    font-weight: 800;
    letter-spacing: 0;
  }

  .fact-card.docked .fact-body {
    font-size: 22px;
    font-weight: 800;
    line-height: 1.1;
  }

  .fact-card.docked .fact-footer {
    font-size: 18px;
    font-weight: 800;
    line-height: 1.1;
    text-transform: uppercase;
  }

  .fact-card-inner {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    width: 100%;
    height: 100%;
    padding: 40px 45px;
    box-sizing: border-box;
    border-radius: 30px;
    overflow: hidden;
  }

  .fact-card-glow {
    position: absolute;
    left: -168px;
    top: -260px;
    width: 745px;
    height: 1071px;
    background: radial-gradient(
      ellipse 45% 40% at 50% 45%,
      rgba(62, 175, 63, 0.35) 0%,
      rgba(62, 175, 63, 0.12) 40%,
      transparent 70%
    );
    pointer-events: none;
  }

  .fact-card.docked .fact-card-glow {
    background: radial-gradient(
      ellipse 45% 40% at 50% 45%,
      rgba(22, 26, 31, 0.14) 0%,
      rgba(22, 26, 31, 0.06) 40%,
      transparent 70%
    );
  }

  .fact-card-content {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    gap: 30px;
    flex: 1;
    min-height: 0;
  }

  .fact-card-header {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .fact-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 15px;
    border: 1px solid rgba(22, 26, 31, 0.2);
    border-radius: 30px;
    width: fit-content;
    background: rgba(255, 255, 255, 0.35);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }

  .fact-badge span {
    font-family: 'Supreme Variable', sans-serif;
    font-size: 14px;
    font-weight: 800;
    text-transform: uppercase;
    color: #000000;
    white-space: nowrap;
  }

  .fact-divider {
    margin: 0;
    border: none;
    border-top: 1px solid rgba(22, 26, 31, 0.18);
    width: 100%;
  }

  .fact-body {
    margin: 0;
    font-family: 'Supreme Variable', sans-serif;
    font-size: clamp(1rem, 2vw, 22px);
    font-weight: 800;
    line-height: 1.1;
    color: #000000;
    flex: 1;
    overflow: hidden;
  }

  .fact-footer {
    position: relative;
    z-index: 1;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 1rem;
    font-family: 'Supreme Variable', sans-serif;
    font-size: 18px;
    font-weight: 800;
    text-transform: uppercase;
    color: #000000;
  }

  .fact-sources {
    text-align: right;
    text-decoration: underline;
    text-underline-offset: 0.12em;
  }
</style>
