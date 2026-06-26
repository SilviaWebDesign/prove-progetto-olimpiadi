<script>
  import { onMount } from 'svelte';
  import ExplorableMountainScene from '$lib/materiali-home/ExplorableMountainScene.svelte';
  import AboutHotspotCard from '$lib/materiali-home/AboutHotspotCard.svelte';
  import Navbar from '$lib/materiali-home/Navbar.svelte';
  import { preloadMountainGltf } from '$lib/materiali-home/mountainGltf.js';
  import { getNextHotspot, getPrevHotspot } from '$lib/materiali-home/aboutHotspots.js';
  import { browser } from '$app/environment';

  /** @type {import('$lib/materiali-home/aboutHotspots.js').AboutHotspot | null} */
  let selectedHotspot = $state(null);

  onMount(() => {
    preloadMountainGltf();
  });

  function closeHotspot() {
    selectedHotspot = null;
  }

  function goPrev() {
    if (!selectedHotspot) return;
    const prev = getPrevHotspot(selectedHotspot.id);
    if (prev) selectedHotspot = prev;
  }

  function goNext() {
    if (!selectedHotspot) return;
    const next = getNextHotspot(selectedHotspot.id);
    if (next) selectedHotspot = next;
  }
</script>

<svelte:head>
  <title>About — Quante facce ha una medaglia?</title>
</svelte:head>

<div class="about-page">
  {#if browser}
    <ExplorableMountainScene bind:selectedHotspot />
  {/if}

  {#if selectedHotspot}
    <AboutHotspotCard
      hotspot={selectedHotspot}
      onclose={closeHotspot}
      onprev={goPrev}
      onnext={goNext}
    />
  {/if}
</div>

<Navbar alwaysVisible />

<style>
  :global(body) {
    overflow: hidden;
  }

  .about-page {
    position: fixed;
    inset: 0;
    background: #ffffff;
  }
</style>
