<script>
  /** @type {{ label: string, body: string, sources: string, expanded?: boolean, docked?: boolean, class?: string }} */
  let { label, body, sources, expanded = false, docked = false, class: className = '' } = $props();
</script>

<article class="fact-card {className}" class:expanded class:docked>
  <div class="fact-card-inner">
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
    <footer class="fact-footer">
      <span class="fact-sources-label">- fonti:</span>
      <span class="fact-sources">{sources}</span>
    </footer>
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

  .fact-card.expanded,
  .fact-card.docked {
    height: 680px;
  }

  .fact-card.docked .fact-card-inner {
    backdrop-filter: blur(50px);
    -webkit-backdrop-filter: blur(50px);
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
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    width: 100%;
    height: 100%;
    padding: 40px 45px;
    box-sizing: border-box;
    background: rgba(255, 255, 255, 0.5);
    border: 1px solid #000000;
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
    border: 1px solid #000000;
    border-radius: 30px;
    width: fit-content;
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
    border-top: 1px solid #000000;
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
  }
</style>
