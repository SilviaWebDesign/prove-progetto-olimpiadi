<script lang="ts">
  import CommentCard from '$lib/components/CommentCard.svelte';

  interface CardData {
    id: number;
    body: string;
    liked: boolean;
  }

  interface Props {
    cards: CardData[];
    sectionId: 'infrastructure' | 'sport' | 'sustainability';
    onToggleLike: (id: number) => void;
  }

  let { cards, sectionId, onToggleLike }: Props = $props();
</script>

<div class="card-stack">
  {#each cards as card (card.id)}
    <CommentCard
      comment={{ body: card.body }}
      {sectionId}
      liked={card.liked}
      onToggleLike={() => onToggleLike(card.id)}
      size="sm"
    />
  {/each}
</div>

<style>
  .card-stack {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
</style>
