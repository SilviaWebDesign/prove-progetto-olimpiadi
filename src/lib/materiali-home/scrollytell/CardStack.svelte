<script lang="ts">
  import gsap from 'gsap';
  import CommentCard from '$lib/components/CommentCard.svelte';

  interface CardData {
    id: number;
    body: string;
    liked: boolean;
  }

  export interface CardStackApi {
    animateOut: () => Promise<void>;
    animateIn:  () => Promise<void>;
    resetHidden: () => void;
  }

  interface Props {
    cards: CardData[];
    sectionId: 'infrastructure' | 'sport' | 'sustainability';
    onToggleLike: (id: number) => void;
    topicIndex?: number;
    api?: CardStackApi;
  }

  let { cards, sectionId, onToggleLike, topicIndex = 0, api = $bindable() }: Props = $props();

  let stackEl = $state<HTMLDivElement | null>(null);

  const STAGGER  = 0.075;
  const DURATION = 0.42;
  const OFFSCREEN_PAD = 32;

  function getItems(): HTMLElement[] {
    if (!stackEl) return [];
    return Array.from(stackEl.querySelectorAll<HTMLElement>('.card-stack__item'));
  }

  /** Distanza per portare l'intera card oltre il bordo destro del viewport. */
  function exitDistanceFor(item: HTMLElement): number {
    const rect = item.getBoundingClientRect();
    return window.innerWidth - rect.left + OFFSCREEN_PAD;
  }

  /** Esce completamente a destra, una card alla volta. */
  function animateOut(): Promise<void> {
    const items = getItems();
    if (!items.length) return Promise.resolve();
    return new Promise((resolve) => {
      gsap.to(items, {
        x: (_i, el) => exitDistanceFor(el as HTMLElement),
        duration: DURATION,
        stagger: STAGGER,
        ease: 'power3.in',
        onComplete: resolve,
      });
    });
  }

  /** Rientra completamente dal lato destro, una card alla volta. */
  function animateIn(): Promise<void> {
    const items = getItems();
    if (!items.length) return Promise.resolve();

    gsap.set(items, { x: 0, opacity: 1 });
    const distances = items.map((item) => exitDistanceFor(item));
    items.forEach((item, i) => gsap.set(item, { x: distances[i] }));

    return new Promise((resolve) => {
      gsap.to(items, {
        x: 0,
        duration: DURATION,
        stagger: STAGGER,
        ease: 'power3.out',
        onComplete: resolve,
      });
    });
  }

  function resetHidden() {
    const items = getItems();
    gsap.killTweensOf(items);
    gsap.set(items, { opacity: 0, x: 0 });
  }

  api = { animateOut, animateIn, resetHidden };
</script>

<div class="card-stack" bind:this={stackEl}>
  {#each cards as card (`${topicIndex}-${card.id}`)}
    <div class="card-stack__item">
      <CommentCard
        comment={{ body: card.body }}
        {sectionId}
        liked={card.liked}
        onToggleLike={() => onToggleLike(card.id)}
        size="sm"
      />
    </div>
  {/each}
</div>

<style>
  .card-stack {
    display: flex;
    flex-direction: column;
    gap: 10px;
    overflow: visible;
  }

  .card-stack__item {
    opacity: 0;
    will-change: transform;
  }
</style>
