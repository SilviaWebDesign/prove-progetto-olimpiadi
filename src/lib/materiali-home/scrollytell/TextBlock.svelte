<script lang="ts">
  import SectionFactBlock from '$lib/components/SectionFactBlock.svelte';

  interface Props {
    title: string;
    body: string;
    source: string;
    counter?: string;
  }

  let { title, body, source, counter }: Props = $props();
</script>

<SectionFactBlock {title} {body} {source} {counter} />
