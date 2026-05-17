<script lang="ts">
	let {
		text = '',
		play = false,
		onComplete = () => {}
	}: {
		text: string;
		play?: boolean;
		onComplete?: () => void;
	} = $props();

	let textVisible = $state(false);
	let animating = $state(false);
	let hasPlayed = $state(false);

	let flakes: Array<{
		id: number; x: number; delay: number; duration: number; color: string; size: number;
	}> = $state([]);

	const COLORS = ['#3EAF3F', '#422CCB', '#FE6D2D'];
	const FLAKE_COUNT = 65;

	const prefersReducedMotion =
		typeof window !== 'undefined'
			? window.matchMedia('(prefers-reduced-motion: reduce)').matches
			: false;

	function buildFlakes() {
		flakes = Array.from({ length: FLAKE_COUNT }, (_, i) => ({
			id: i,
			x: Math.random() * 100,
			delay: Math.random() * 0.8,
			duration: 0.8 + Math.random() * 0.6,
			color: COLORS[Math.floor(Math.random() * COLORS.length)],
			size: 6 + Math.floor(Math.random() * 8)
		}));
	}

	function triggerAnimation() {
		if (prefersReducedMotion) {
			textVisible = true;
			onComplete();
			return;
		}
		buildFlakes();
		animating = true;
		const maxDelay = Math.max(...flakes.map((f) => f.delay + f.duration));
		setTimeout(() => {
			textVisible = true;
			onComplete();
		}, (maxDelay + 0.2) * 1000);
	}

	$effect(() => {
		if (play && !hasPlayed) {
			hasPlayed = true;
			triggerAnimation();
		}
	});
</script>

<div class="snow-section">
	{#if animating}
		<div class="flakes-wrapper" aria-hidden="true">
			{#each flakes as flake (flake.id)}
				<div
					class="flake"
					style="
						left: {flake.x}%;
						width: {flake.size}px;
						height: {flake.size}px;
						background: {flake.color};
						animation-delay: {flake.delay}s;
						animation-duration: {flake.duration}s;
					"
				></div>
			{/each}
		</div>
	{/if}

	<p class="snow-text" class:visible={textVisible || prefersReducedMotion}>
		{text}
	</p>
</div>

<style>
	.snow-section {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		overflow: visible;
	}

	.flakes-wrapper {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100vh;
		pointer-events: none;
		z-index: 10;
	}

	.flake {
		position: absolute;
		top: -20px;
		border-radius: 2px;
		opacity: 0;
		animation: snowfall linear forwards;
	}

	@keyframes snowfall {
		0% { transform: translateY(0) rotate(0deg); opacity: 1; }
		80% { opacity: 0.9; }
		100% { transform: translateY(110vh) rotate(180deg); opacity: 0; }
	}

	.snow-text {
		font-family: 'Tanker', serif;
		font-size: clamp(1.6rem, 4vw, 3.5rem);
		color: #0a0a0a;
		text-align: center;
		max-width: 1000px;
		line-height: 1.2;
		opacity: 0;
		transform: translateY(12px);
		transition: opacity 0.6s ease, transform 0.6s ease;
		position: relative;
		z-index: 1;
		padding: 0 1.5rem;
	}

	.snow-text.visible {
		opacity: 1;
		transform: translateY(0);
	}

	@media (max-width: 768px) {
		.snow-text {
			font-size: clamp(1.4rem, 5vw, 2rem);
		}
	}
</style>
