<script lang="ts">
  import CommentCard from './CommentCard.svelte';

  interface CardData {
    id: number;
    body: string;
    liked: boolean;
  }

  interface Props {
    cards: CardData[];
    onToggleLike: (id: number) => void;
  }

  let { cards, onToggleLike }: Props = $props();
</script>

<div class="card-stack">
  {#each cards as card (card.id)}
    <CommentCard
      comment={{ body: card.body }}
      sectionId="infrastructure"
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
