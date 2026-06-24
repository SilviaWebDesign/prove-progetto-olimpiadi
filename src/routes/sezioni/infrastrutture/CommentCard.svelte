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
    overflow: hidden;
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

  .comment-card-glass::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: -1;
    border-radius: inherit;
    opacity: 0;
    transition: opacity 400ms ease;
    pointer-events: none;
    filter: blur(6px);
    background-image: radial-gradient(
      ellipse 75% 75% at 22% 50%,
      rgba(22, 24, 29, 0.26) 0%,
      rgba(22, 24, 29, 0.06) 60%,
      rgba(255, 255, 255, 0) 100%
    );
  }

  .comment-card-glass:hover::before { opacity: 1; }
  .comment-card-glass[data-liked='true']::before { opacity: 0; }
  .comment-card-glass[data-liked='true']:hover::before { opacity: 1; }

  .comment-card-glass:hover {
    transform: translateY(-0.5px);
    border-color: rgba(22, 24, 29, 0.8);
    outline-color: rgba(22, 24, 29, 0.8);
  }

  .comment-card-glass[data-liked='true'] {
    border-color: rgba(22, 24, 29, 0.8);
    outline-color: rgba(22, 24, 29, 0.8);
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
    overflow: visible;
    transition: color 200ms ease;
  }

  .comment-card-glass__heart-shape {
    fill: transparent;
    transition: fill 200ms ease, stroke 200ms ease;
  }

  .comment-card-glass[data-liked='true'] .comment-card-glass__heart-shape {
    fill: #161a1f;
    stroke: #161a1f;
  }
</style>
