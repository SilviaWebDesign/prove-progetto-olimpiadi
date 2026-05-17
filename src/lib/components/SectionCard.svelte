<script lang="ts">
	let {
		title = '',
		color = '#000',
		image = '',
		href = '/'
	}: {
		title: string;
		color: string;
		image: string;
		href: string;
	} = $props();

	// FIX 4: each letter positioned individually on a 3D arc
	const letters = $derived(title.toUpperCase().split(''));

	// Arc span adapts to word length: shorter words → tighter arc
	const arcSpan = $derived(Math.min(190, Math.max(90, letters.length * 14)));
	const startAngle = $derived(-arcSpan / 2);
	const stepAngle = $derived(arcSpan / Math.max(letters.length - 1, 1));
	const radius = 240; // px — orbit radius; with translateZ(240px) on rotator, back edge grazes card surface
</script>

<a class="card-link" {href} style="--card-color: {color};">
	<div class="card-wrapper">
		<!-- Static card — opaque white blocks the text when text is behind -->
		<div class="card" style="border-color: {color};">
			<img src={image} alt={title} />
		</div>

		<!-- Orbit pivot at card center; letters fan out on arc via inline transforms -->
		<div class="orbit-rotator">
			{#each letters as letter, i}
				<span
					class="orbit-letter"
					style="transform: rotateY({startAngle + i * stepAngle}deg) translateZ({radius}px);"
				>
					{letter === ' ' ? ' ' : letter}
				</span>
			{/each}
		</div>
	</div>
</a>

<style>
	.card-link {
		display: block;
		text-decoration: none;
		transition: transform 0.3s ease;
	}

	.card-link:hover {
		transform: scale(1.05);
	}

	.card-wrapper {
		position: relative;
		width: 349px;
		height: 572px;
		/* perspective high → gentle curvature on letter arc */
		perspective: 1600px;
	}

	/* Card is opaque — occludes orbit text when text passes behind */
	.card {
		position: absolute;
		inset: 0;
		z-index: 2;
		background: #ffffff;
		border: 2px solid;
		border-radius: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 50px;
		box-sizing: border-box;
		overflow: hidden;
	}

	.card img {
		max-width: 100%;
		max-height: 100%;
		object-fit: contain;
		object-position: center;
	}

	/*
	  Pivot: a zero-size point at the exact card center (top:50% left:50%).
	  transform-origin: 0 0 0 ensures rotateY pivots around this exact point.
	  FIX 3: keyframes contain ONLY rotateY — no translate that would drift.
	*/
	.orbit-rotator {
		position: absolute;
		top: 50%;
		left: 50%;
		width: 0;
		height: 0;
		transform-style: preserve-3d;
		transform-origin: 0 0 0;
		animation: orbit 14s linear infinite;
		pointer-events: none;
		z-index: 3;
	}

	/*
	  Letters are placed at top:0 left:0 of the pivot (= card center).
	  margin-top/left: -0.5em shifts each letter so its visual center sits
	  ON the pivot point — independent of orbit rotation angle (unlike translate).
	  Inline transform then fans each letter out on the arc: rotateY + translateZ.
	*/
	.orbit-letter {
		position: absolute;
		top: 0;
		left: 0;
		margin-top: -0.5em;
		margin-left: -0.5em;
		transform-origin: 50% 50% 0;
		font-family: 'Tanker', sans-serif;
		font-size: clamp(40px, 4.5vw, 58px);
		line-height: 1;
		color: var(--card-color);
		white-space: pre;
		backface-visibility: visible;
		-webkit-backface-visibility: visible;
		user-select: none;
	}

	/* FIX 4: translateZ(240px) shifts orbit pivot 240px toward viewer — letters never pass behind card */
	@keyframes orbit {
		from { transform: translateZ(240px) rotateY(0deg); }
		to   { transform: translateZ(240px) rotateY(360deg); }
	}

	@media (max-width: 1024px) and (min-width: 769px) {
		.card-wrapper { width: 280px; height: 460px; }
	}

	@media (max-width: 768px) {
		.card-wrapper {
			width: min(300px, 90vw);
			aspect-ratio: 349 / 572;
			height: auto;
		}
		.orbit-letter { font-size: clamp(32px, 8vw, 44px); }
	}
</style>
