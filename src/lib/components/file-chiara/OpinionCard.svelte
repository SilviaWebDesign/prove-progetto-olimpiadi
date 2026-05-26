<script>
  /** @type {{ quote: string, liked?: boolean, disabled?: boolean, compact?: boolean, docked?: boolean, onToggle?: () => void }} */
  let { quote, liked = false, disabled = false, compact = false, docked = false, onToggle } = $props();

  function handleClick() {
    if (disabled) return;
    onToggle?.();
  }
</script>

<button
  type="button"
  class="opinion-card"
  class:liked
  class:disabled
  class:compact
  class:docked
  {disabled}
  onclick={handleClick}
  aria-pressed={liked}
>
  <p class="opinion-quote">{quote}</p>
  <span class="heart-btn" aria-hidden="true">
    {#if docked}
      <img
        class="heart-icon"
        class:filled={liked}
        src="/icons/heart-opinion.svg"
        alt=""
        width="44"
        height="44"
      />
    {:else}
      <svg width="44" height="44" viewBox="0 0 24 24">
        <path
          d="M12 20.5s-6.5-4.35-8.5-7.5C1.5 9.5 3 5.5 6.5 5.5c2 0 3.5 1.2 5.5 3.5C14 6.7 15.5 5.5 17.5 5.5 21 5.5 22.5 9.5 20.5 13c-2 3.15-8.5 7.5-8.5 7.5z"
          fill={liked ? 'currentColor' : 'none'}
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linejoin="round"
        />
      </svg>
    {/if}
  </span>
</button>

<style>
  .opinion-card {
    position: relative;
    display: flex;
    align-items: center;
    gap: 20px;
    width: 100%;
    min-height: 96px;
    padding: 20px;
    box-sizing: border-box;
    text-align: left;
    background: rgba(255, 255, 255, 0.5);
    border: 1px solid #161a1f;
    border-radius: 12px;
    cursor: pointer;
    font: inherit;
    color: #161a1f;
    transition:
      background 0.2s ease,
      border-color 0.2s ease,
      opacity 0.2s ease;
  }

  .opinion-card:hover:not(.disabled) {
    background: rgba(255, 255, 255, 0.72);
  }

  .opinion-card.liked {
    border-color: #3eaf3f;
    background: rgba(255, 255, 255, 0.75);
  }

  .opinion-card.liked .heart-btn {
    color: #3eaf3f;
  }

  .opinion-card.disabled {
    cursor: default;
    opacity: 0.55;
  }

  .opinion-card.compact {
    min-height: 0;
    gap: 12px;
    padding: 12px 14px;
    border-radius: 10px;
  }

  .opinion-card.compact .opinion-quote {
    font-size: clamp(0.8rem, 1.05vw, 15px);
    line-height: 1.28;
  }

  .opinion-card.compact .heart-btn svg {
    width: 32px;
    height: 32px;
  }

  /* Figma Comments — 424×96, glass 50 */
  .opinion-card.docked {
    height: 96px;
    min-height: 96px;
    max-height: 96px;
    gap: 20px;
    padding: 20px;
    border-radius: 12px;
    border-color: #161a1f;
    background: rgba(255, 255, 255, 0.5);
    backdrop-filter: blur(50px);
    -webkit-backdrop-filter: blur(50px);
  }

  .opinion-card.docked .opinion-quote {
    font-size: 18px;
    font-weight: 500;
    line-height: 1.3;
    color: #161a1f;
    display: flex;
    align-items: center;
    height: 56px;
    overflow: hidden;
  }

  .opinion-card.docked.liked {
    border-color: #3eaf3f;
    background: rgba(255, 255, 255, 0.75);
  }

  .opinion-card.docked.liked .heart-icon {
    filter: brightness(0) saturate(100%) invert(52%) sepia(42%) saturate(749%)
      hue-rotate(76deg) brightness(95%) contrast(89%);
  }

  .heart-icon {
    display: block;
    width: 44px;
    height: 44px;
    flex-shrink: 0;
  }

  .opinion-quote {
    flex: 1;
    margin: 0;
    font-family: 'Supreme Variable', sans-serif;
    font-size: clamp(0.95rem, 1.8vw, 18px);
    font-weight: 500;
    line-height: 1.3;
    color: #161a1f;
  }

  .heart-btn {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #161a1f;
    line-height: 0;
  }
</style>
