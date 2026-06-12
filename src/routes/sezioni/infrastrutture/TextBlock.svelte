<script lang="ts">
  import SectionFactBlock from '$lib/components/SectionFactBlock.svelte';

  interface Props {
    counter: string;
    title: string;
    body: string;
    source: string;
  }

  let { counter, title, body, source }: Props = $props();
</script>

<SectionFactBlock {counter} {title} {body} {source} />
