<script lang="ts">
  interface Props {
    counter: string;
    title: string;
    body: string;
    source: string;
    class?: string;
  }

  let { counter, title, body, source, class: className = '' }: Props = $props();
</script>

<div class="section-fact-block {className}">
  <p class="section-fact-block__counter">{counter}</p>
  <div class="section-fact-block__main">
    <h2 class="section-fact-block__title">{title}</h2>
    <p class="section-fact-block__body">{body}</p>
  </div>
  <p class="section-fact-block__source">– {source}</p>
</div>

<style>
  .section-fact-block {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 40px;
    width: min(377px, calc(100vw - 48px));
    color: #000000;
    line-height: 1.1;
  }

  .section-fact-block__counter {
    margin: 0;
    width: 100%;
    font-family: 'Supreme Variable', sans-serif;
    font-size: 14px;
    font-weight: 700;
    text-transform: lowercase;
  }

  .section-fact-block__main {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
    width: 100%;
  }

  .section-fact-block__title {
    margin: 0;
    width: 100%;
    font-family: 'Supreme Variable', sans-serif;
    font-size: clamp(32px, 3.34vw, 45px);
    font-weight: 800;
    line-height: 1.1;
  }

  .section-fact-block__body {
    margin: 0;
    width: 100%;
    font-family: 'Supreme Variable', sans-serif;
    font-size: clamp(16px, 1.63vw, 22px);
    font-weight: 700;
    line-height: 1.1;
  }

  .section-fact-block__source {
    margin: 0;
    width: 100%;
    font-family: 'Supreme Variable', sans-serif;
    font-size: clamp(14px, 1.33vw, 18px);
    font-weight: 700;
    line-height: 1.1;
    text-transform: uppercase;
  }
</style>
