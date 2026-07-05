<script lang="ts">
  interface Props {
    title: string;
    body: string;
    source?: string;
  }

  let { title, body, source }: Props = $props();
</script>

<div class="text-block">
  <h2 class="title">{title}</h2>
  <p class="body-text">{body}</p>
  {#if source}<span class="source">— {source}</span>{/if}
</div>

<style>
  .text-block {
    width: clamp(280px, 27.9vw, 377px);
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: clamp(12px, 1.2vw, 16px);
  }

  .title {
    font-family: 'Supreme Variable', sans-serif;
    font-size: clamp(32px, 3.34vw, 45px);
    font-weight: 800;
    line-height: 1.1;
    color: var(--color-text-primary, #16181D);
    margin: 0;
  }

  .body-text {
    font-family: 'Supreme Variable', sans-serif;
    font-size: clamp(16px, 1.63vw, 22px);
    font-weight: 700;
    line-height: 1.5;
    color: var(--color-text-primary, #16181D);
    margin: 0;
  }

  .source {
    font-family: 'Supreme Variable', sans-serif;
    font-size: clamp(14px, 1.33vw, 18px);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-text-primary, #16181D);
    margin-top: auto;
    text-decoration: underline;
    text-underline-offset: 0.12em;
  }
</style>
