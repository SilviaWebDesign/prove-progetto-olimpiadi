<script lang="ts">
  import SectionFactBlock from '$lib/components/SectionFactBlock.svelte';

  interface Props {
    title: string;
    body: string;
    source: string;
  }

  let { title, body, source }: Props = $props();
</script>

<SectionFactBlock {title} {body} {source} />
