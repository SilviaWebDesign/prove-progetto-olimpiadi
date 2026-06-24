<!--
  COMMENT CARD — GLASS VARIANT
  Self-contained: tipi definiti localmente, nessun import da $lib/types.
-->
<script lang="ts">
  type SectionId = 'infrastructure' | 'sport' | 'sustainability';
  interface Comment { body: string; }

  interface Props {
    comment: Comment;
    sectionId?: SectionId;
    liked?: boolean;
    onToggleLike?: () => void;
    size?: 'sm' | 'lg';
  }

  let {
    comment,
    sectionId = 'infrastructure',
    liked = false,
    onToggleLike,
    size = 'sm'
  }: Props = $props();
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_to_interactive_role -->
<article
  class="comment-card-glass"
  data-section={sectionId}
  data-liked={liked}
  data-size={size}
  role="button"
  tabindex="0"
  aria-pressed={liked}
  aria-label={liked ? 'Rimuovi like dal commento' : 'Metti like al commento'}
  onclick={() => onToggleLike?.()}
  onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggleLike?.(); } }}
>
  <p class="comment-card-glass__body">{comment.body}</p>
  <svg class="comment-card-glass__heart" viewBox="10 12 24 24" aria-hidden="true">
    <path class="comment-card-glass__heart-shape"
      d="M12.4194 15.7227C14.8602 13.2819 18.8175 13.2819 21.2583 15.7227L22.1421 16.6066L23.026 15.7227C25.4668 13.2819 29.4241 13.2819 31.8649 15.7227C34.3055 18.1634 34.3056 22.1208 31.8649 24.5615L22.1421 34.2842L12.4194 24.5615C9.97876 22.1208 9.97896 18.1635 12.4194 15.7227Z"
      stroke="currentColor" fill="none"/>
  </svg>
</article>

<style>
  .comment-card-glass {
    position: relative;
    isolation: isolate;
    display: flex;
    align-items: center;
    gap: var(--spacing-md, 20px);
    width: 100%;
    padding: var(--spacing-md, 20px);
    background: rgba(255, 255, 255, 0.18);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: var(--border-thin, 1px solid rgba(22, 24, 29, 0.5));
    border-radius: var(--radius-xs, 8px);
    color: var(--color-text-primary, #16181D);
    outline: var(--border-width-thin, 1px) solid transparent;
    outline-offset: 0;
    box-shadow:
      0 6px 20px rgba(0, 0, 0, 0.08),
      inset 0 1px 1px rgba(255, 255, 255, 0.4);
    cursor: pointer;
    transition:
      transform 300ms cubic-bezier(0.25, 1, 0.5, 1),
      background 300ms ease,
      border-color 200ms ease,
      outline-color 200ms ease,
      box-shadow 300ms ease;
  }

  .comment-card-glass[data-size='sm'] { max-width: 356px; min-height: 82px; }
  .comment-card-glass[data-size='lg'] { max-width: 426px; min-height: 96px; }

  /* Glow gradient dietro la card — sweepato su hover */
  .comment-card-glass::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: -1;
    border-radius: inherit;
    opacity: 0;
    transition: opacity 400ms ease;
    pointer-events: none;
    filter: blur(20px);
    background-size: 300% 100%;
    background-position: 100% 50%;
    background-repeat: no-repeat;
  }

  .comment-card-glass[data-section='sustainability']::before {
    background-image: linear-gradient(to right, var(--color-section-sustainability, #47D08E) 0%, rgba(255, 255, 255, 0) 50%);
  }
  .comment-card-glass[data-section='sport']::before {
    background-image: linear-gradient(to right, var(--color-section-sport, #89BAFF) 0%, rgba(255, 255, 255, 0) 50%);
  }
  .comment-card-glass[data-section='infrastructure']::before {
    background-image: linear-gradient(to right, var(--color-section-infrastructure, #FF834C) 0%, rgba(255, 255, 255, 0) 50%);
  }

  .comment-card-glass:hover::before {
    opacity: 1;
    animation: sweep 800ms cubic-bezier(0.25, 1, 0.5, 1) forwards;
  }

  .comment-card-glass[data-liked='true']::before {
    opacity: 0;
  }

  .comment-card-glass[data-liked='true']:hover::before {
    opacity: 1;
    animation: sweep 800ms cubic-bezier(0.25, 1, 0.5, 1) forwards;
  }

  @keyframes sweep {
    from { background-position: 100% 50%; }
    to   { background-position: 0%   50%; }
  }

  .comment-card-glass:hover { transform: translateY(-1px); }

  /* Hover colorato per sezione */
  .comment-card-glass[data-section='sustainability']:hover {
    border-color: var(--color-section-sustainability, #47D08E);
    outline-color: var(--color-section-sustainability, #47D08E);
    box-shadow: 0 10px 30px rgba(0,0,0,0.10), 0 0 24px rgba(71,208,142,0.25), inset 0 1px 1px rgba(255,255,255,0.5);
  }
  .comment-card-glass[data-section='sport']:hover {
    border-color: var(--color-section-sport, #89BAFF);
    outline-color: var(--color-section-sport, #89BAFF);
    box-shadow: 0 10px 30px rgba(0,0,0,0.10), 0 0 24px rgba(137,186,255,0.30), inset 0 1px 1px rgba(255,255,255,0.5);
  }
  .comment-card-glass[data-section='infrastructure']:hover {
    border-color: var(--color-section-infrastructure, #FF834C);
    outline-color: var(--color-section-infrastructure, #FF834C);
    box-shadow: 0 10px 30px rgba(0,0,0,0.10), 0 0 24px rgba(255,131,76,0.28), inset 0 1px 1px rgba(255,255,255,0.5);
  }

  /* Stato liked — bordo + outline colorati per sezione */
  .comment-card-glass[data-section='sustainability'][data-liked='true'] {
    border-color: var(--color-section-sustainability, #47D08E);
    outline-color: var(--color-section-sustainability, #47D08E);
  }
  .comment-card-glass[data-section='sport'][data-liked='true'] {
    border-color: var(--color-section-sport, #89BAFF);
    outline-color: var(--color-section-sport, #89BAFF);
  }
  .comment-card-glass[data-section='infrastructure'][data-liked='true'] {
    border-color: var(--color-section-infrastructure, #FF834C);
    outline-color: var(--color-section-infrastructure, #FF834C);
  }

  /* Testo */
  .comment-card-glass__body { flex: 1; margin: 0; }
  .comment-card-glass[data-size='sm'] .comment-card-glass__body {
    font: var(--text-comment-body-sm-font, 600 14px/1.3 'Supreme Variable', sans-serif);
  }
  .comment-card-glass[data-size='lg'] .comment-card-glass__body {
    font: var(--text-comment-body-lg-font, 600 16px/1.4 'Supreme Variable', sans-serif);
  }
  .comment-card-glass__body::before { content: '\201C'; }
  .comment-card-glass__body::after  { content: '\201D'; }

  .comment-card-glass:focus-visible {
    outline: 2px solid var(--color-border, rgba(22,24,29,0.5));
    outline-offset: 4px;
  }

  .comment-card-glass__heart {
    display: block;
    flex-shrink: 0;
    width: 36px;
    height: 36px;
    transition: color 200ms ease;
  }

  .comment-card-glass__heart-shape {
    fill: none;
    transition: fill 200ms ease, stroke 200ms ease;
  }

  /* Cuore filled al like */
  .comment-card-glass[data-section='sustainability'][data-liked='true'] .comment-card-glass__heart-shape {
    fill: var(--color-section-sustainability, #47D08E);
    stroke: var(--color-section-sustainability, #47D08E);
  }
  .comment-card-glass[data-section='sport'][data-liked='true'] .comment-card-glass__heart-shape {
    fill: var(--color-section-sport, #89BAFF);
    stroke: var(--color-section-sport, #89BAFF);
  }
  .comment-card-glass[data-section='infrastructure'][data-liked='true'] .comment-card-glass__heart-shape {
    fill: var(--color-section-infrastructure, #FF834C);
    stroke: var(--color-section-infrastructure, #FF834C);
  }
</style>
