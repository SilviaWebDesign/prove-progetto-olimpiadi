<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import '$lib/styles/tokens/colors.css';
	import { overlayVisible } from '$lib/stores/pageTransition';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div
	class="page-overlay"
	class:visible={$overlayVisible}
	aria-hidden="true"
></div>

{@render children()}

<style>
	.page-overlay {
		position: fixed;
		inset: 0;
		background: #ffffff;
		opacity: 0;
		pointer-events: none;
		z-index: 9999;
		transition: opacity 0.38s ease;
	}
	.page-overlay.visible {
		opacity: 1;
		pointer-events: all;
	}
</style>
