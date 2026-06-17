<script lang="ts">
  /* Token colori sezione — self-contained, no import esterni */
  type SectionColor = 'infrastructure' | 'sport' | 'sustainability';

  const SECTION_COLORS: Record<SectionColor, string> = {
    infrastructure: '#FF834C',
    sport: '#89BAFF',
    sustainability: '#47D08E'
  };

  interface Props {
    text: string;
    section?: SectionColor;
    liked?: boolean;
    onToggleLike?: () => void;
  }

  let {
    text,
    section = 'infrastructure',
    liked = false,
    onToggleLike
  }: Props = $props();

  const accentColor = $derived(SECTION_COLORS[section]);

  function handleClick() {
    onToggleLike?.();
  }
</script>

<div
  class="comment-card"
  style:--accent={accentColor}
  class:liked
>
  <p class="card-text">{text}</p>
  <button
    type="button"
    class="heart-btn"
    class:liked
    onclick={handleClick}
    aria-pressed={liked}
    aria-label={liked ? 'Rimuovi like' : 'Metti like'}
  >
    <svg width="44" height="44" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 20.5s-6.5-4.35-8.5-7.5C1.5 9.5 3 5.5 6.5 5.5c2 0 3.5 1.2 5.5 3.5C14 6.7 15.5 5.5 17.5 5.5 21 5.5 22.5 9.5 20.5 13c-2 3.15-8.5 7.5-8.5 7.5z"
        fill={liked ? 'var(--accent)' : 'none'}
        stroke={liked ? 'var(--accent)' : 'currentColor'}
        stroke-width="1.5"
        stroke-linejoin="round"
      />
    </svg>
  </button>
</div>

<style>
  .comment-card {
    display: flex;
    align-items: center;
    gap: var(--spacing-md, 20px);
    width: clamp(260px, 26.4vw, 356px);
    min-height: 82px;
    padding: var(--spacing-md, 20px);
    box-sizing: border-box;
    border: var(--border-thin, 1px solid rgba(22, 24, 29, 0.5));
    border-radius: var(--radius-xs, 8px);
    background: transparent;
    transition:
      border-color 0.2s ease,
      background 0.2s ease;
  }

  .comment-card.liked {
    border-color: var(--accent);
    outline: 1px solid var(--accent);
  }

  .card-text {
    flex: 1;
    font-family: 'Supreme Variable', sans-serif;
    font-size: clamp(13px, 1.04vw, 14px);
    font-weight: 500;
    line-height: 1.45;
    color: var(--color-text-primary, #000000);
    margin: 0;
  }

  .heart-btn {
    flex-shrink: 0;
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    color: var(--color-text-primary, #000000);
    transition: transform 0.15s ease, color 0.2s ease;
  }

  .heart-btn:hover {
    transform: scale(1.12);
  }

  .heart-btn.liked {
    color: var(--accent);
  }
</style>
