<script lang="ts">
  import { onMount } from 'svelte';
  import type { ComponentProps } from 'svelte';
  import SectionScrollytell from './SectionScrollytell.svelte';
  import SectionScrollytellMobile from './SectionScrollytellMobile.svelte';

  type Props = ComponentProps<typeof SectionScrollytell>;
  let { config }: Props = $props();

  let ready = $state(false);
  let isMobile = $state(false);

  onMount(() => {
    isMobile = window.innerWidth < 768;
    ready = true;
  });
</script>

{#if ready}
  {#if isMobile}
    <SectionScrollytellMobile {config} />
  {:else}
    <SectionScrollytell {config} />
  {/if}
{/if}
