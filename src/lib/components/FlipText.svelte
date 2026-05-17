<script lang="ts">
	let {
		text = '',
		play = false
	}: {
		text: string;
		play?: boolean;
	} = $props();

	const CHARS = 'ABCDEFGHIJKLMNOPRSTUVWXYZ0123456789!?#@&$%*';
	const STAGGER_MS = 45;
	const FLIPS_PER_CHAR = 8;
	const FLIP_INTERVAL_MS = 60;

	const chars = $derived(text.split(''));

	let displayed = $state<string[]>([]);
	let flipping = $state<boolean[]>([]);
	let hasPlayed = $state(false);

	$effect(() => {
		// Initialize display array when chars are available
		if (!hasPlayed) {
			displayed = chars.map(() => ' ');
			flipping = chars.map(() => false);
		}
	});

	const prefersReducedMotion =
		typeof window !== 'undefined'
			? window.matchMedia('(prefers-reduced-motion: reduce)').matches
			: false;

	function runFlip() {
		chars.forEach((target, i) => {
			if (target === ' ') {
				displayed[i] = ' ';
				return;
			}
			const startDelay = i * STAGGER_MS;
			setTimeout(() => {
				flipping[i] = true;
				let flipCount = 0;
				const interval = setInterval(() => {
					if (flipCount < FLIPS_PER_CHAR) {
						displayed[i] = CHARS[Math.floor(Math.random() * CHARS.length)];
						flipCount++;
					} else {
						clearInterval(interval);
						displayed[i] = target;
						flipping[i] = false;
					}
				}, FLIP_INTERVAL_MS);
			}, startDelay);
		});
	}

	$effect(() => {
		if (play && !hasPlayed) {
			hasPlayed = true;
			if (prefersReducedMotion) {
				displayed = [...chars];
			} else {
				runFlip();
			}
		}
	});
</script>

<div class="flip-wrapper">
	<p class="flip-text">
		{#each chars as char, i}
			{#if char === ' '}
				<span class="flip-space"> </span>
			{:else}
				<span class="flip-char" class:flipping={flipping[i]}>
					{displayed[i] ?? ' '}
				</span>
			{/if}
		{/each}
	</p>
</div>

<style>
	.flip-wrapper {
		display: flex;
		justify-content: center;
		align-items: center;
		width: 100%;
	}

	.flip-text {
		font-family: 'Tanker', serif;
		font-size: clamp(1.6rem, 4vw, 3.5rem);
		color: #0a0a0a;
		text-align: center;
		max-width: 1000px;
		line-height: 1.2;
		padding: 0 1.5rem;
		word-break: break-word;
		margin: 0;
	}

	.flip-char {
		display: inline-block;
		transition: transform 0.08s ease-in-out;
		transform-style: preserve-3d;
	}

	.flip-char.flipping {
		transform: rotateX(90deg);
	}

	.flip-space {
		display: inline-block;
		width: 0.35em;
	}

	@media (max-width: 768px) {
		.flip-text {
			font-size: clamp(1.4rem, 5vw, 2rem);
		}
	}
</style>
