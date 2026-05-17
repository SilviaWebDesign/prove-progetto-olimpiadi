<script lang="ts">
	import PixelImage from '$lib/components/PixelImage.svelte';
	import PixelSnowText from '$lib/components/PixelSnowText.svelte';
	import SectionCard from '$lib/components/SectionCard.svelte';

	let section2 = $state<HTMLElement | null>(null);
	let section4 = $state<HTMLElement | null>(null);

	// ── FIX 3: unified phrase state machine ──
	// 'hidden'  → section not yet in viewport, both phrases invisible
	// 'first'   → snow animation plays → phrase 1 visible
	// 'second'  → phrase 1 fades out, phrase 2 fades in, CTA appears
	let phraseState = $state<'hidden' | 'first' | 'second'>('hidden');
	let snowDone = $state(false); // true when phrase 1 text is fully visible

	// PixelSnowText receives play=true as soon as we leave 'hidden'
	const snowPlaying = $derived(phraseState !== 'hidden');

	// IntersectionObserver: section2 enters viewport → start phrase 1
	$effect(() => {
		if (!section2 || phraseState !== 'hidden') return;
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting) {
					observer.disconnect();
					phraseState = 'first';
				}
			},
			{ threshold: 0.3 }
		);
		observer.observe(section2);
		return () => observer.disconnect();
	});

	// After snow done: listen for scroll-down to trigger phrase 2 (FIX 3)
	$effect(() => {
		if (!snowDone || phraseState !== 'first') return;

		let touchStartY = 0;

		function trigger() {
			if (phraseState !== 'first') return;
			phraseState = 'second';
		}

		function onWheel(e: WheelEvent) {
			if (e.deltaY > 10) trigger();
		}
		function onTouchStart(e: TouchEvent) {
			touchStartY = e.touches[0].clientY;
		}
		function onTouchEnd(e: TouchEvent) {
			if (touchStartY - e.changedTouches[0].clientY > 30) trigger();
		}

		window.addEventListener('wheel', onWheel, { passive: true });
		window.addEventListener('touchstart', onTouchStart, { passive: true });
		window.addEventListener('touchend', onTouchEnd, { passive: true });

		return () => {
			window.removeEventListener('wheel', onWheel);
			window.removeEventListener('touchstart', onTouchStart);
			window.removeEventListener('touchend', onTouchEnd);
		};
	});

	function onSnowComplete() {
		snowDone = true;
	}

	function scrollTo(el: HTMLElement | null) {
		el?.scrollIntoView({ behavior: 'smooth' });
	}

	const INTRO_TEXT =
		'Ogni olimpiade lascia medaglie, record ed eventi memorabili, ma lascia anche interpretazioni in conflitto.';

	const PHRASE2_TEXT =
		'Qui non troverai una realtà oggettiva; scoprirai il modo in cui essa prende forma.';

	const CARDS = [
		{ title: 'Sostenibilità', color: '#3EAF3F', image: '/images/card-sostenibilita.png', href: '/sostenibilita' },
		{ title: 'Sport',         color: '#422CCB', image: '/images/card-sport.png',         href: '/sport' },
		{ title: 'Infrastrutture',color: '#FE6D2D', image: '/images/card-infrastrutture.png',href: '/infrastrutture' }
	];
</script>

<svelte:head>
	<title>Quante facce ha una medaglia?</title>
	<meta name="description" content="Un percorso interattivo sulle olimpiadi tra sostenibilità, sport e infrastrutture." />
</svelte:head>

<!-- SEZIONE 1: HERO — canvas pixel full-screen + immagine base semi-trasparente (FIX 2) -->
<section class="hero" aria-label="Hero">
	<PixelImage />
	<h1 class="hero-title">Quante facce ha una medaglia?</h1>
	<button
		class="cta-scroll"
		onclick={() => scrollTo(section2)}
		aria-label="Scorri alla sezione successiva"
	>
		<span class="cta-label">scopri</span>
		<span class="cta-arrow" aria-hidden="true">↓</span>
	</button>
</section>

<!-- SEZIONE 2: LE DUE FRASI sovrapposte + CTA (FIX 3) -->
<section class="phrases-section" bind:this={section2} aria-label="Introduzione e messaggio">
	<div class="blobs" aria-hidden="true">
		<div class="blob blob-1"></div>
		<div class="blob blob-2"></div>
		<div class="blob blob-3"></div>
	</div>

	<!-- Entrambe le frasi in grid-area 1/1 per sovrapposi zione -->
	<div class="phrases-grid">
		<div class="phrase" class:visible={phraseState === 'first'}>
			<PixelSnowText text={INTRO_TEXT} play={snowPlaying} onComplete={onSnowComplete} />
		</div>
		<div class="phrase" class:visible={phraseState === 'second'}>
			<p class="phrase-text">{PHRASE2_TEXT}</p>
		</div>
	</div>

	<!-- FIX 3: "continua" button — click OR scroll triggers phrase 2 -->
	{#if snowDone && phraseState === 'first'}
		<button
			class="continue-btn"
			onclick={() => { phraseState = 'second'; }}
			aria-label="Continua alla frase successiva"
		>
			<span class="continue-arrow">↓</span>
		</button>
	{/if}

	<!-- CTA "Inizia il percorso" appare con la seconda frase -->
	<div class="cta-wrap" class:visible={phraseState === 'second'}>
		<button
			class="cta-path"
			onclick={() => scrollTo(section4)}
			aria-label="Inizia il percorso, scorri alle sezioni"
		>
			Inizia il percorso
			<span class="cta-arrow" aria-hidden="true">↓</span>
		</button>
	</div>
</section>

<!-- SEZIONE 3: CARD -->
<section class="cards-section" bind:this={section4} aria-label="Sezioni del percorso">
	<div class="cards-row">
		{#each CARDS as card (card.href)}
			<SectionCard title={card.title} color={card.color} image={card.image} href={card.href} />
		{/each}
	</div>
</section>

<style>
	/* ── HERO ── */
	.hero {
		position: relative;
		width: 100%;
		height: 100vh;
		overflow: hidden;
		background: #ffffff;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
	}

	.hero-title {
		font-family: 'Tanker', serif;
		font-size: clamp(2rem, 7vw, 6rem);
		color: #0a0a0a;
		text-align: center;
		margin: 0;
		line-height: 1.05;
		max-width: 14ch;
		position: relative;
		z-index: 3;
	}

	.cta-scroll {
		position: absolute;
		bottom: 2.5rem;
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.3rem;
		background: none;
		border: none;
		cursor: pointer;
		font-family: 'Tanker', serif;
		font-size: 1.1rem;
		color: #0a0a0a;
		letter-spacing: 0.08em;
		text-transform: lowercase;
		padding: 0.5rem 1rem;
		z-index: 3;
	}

	.cta-scroll .cta-arrow {
		display: inline-block;
		animation: bounce 1.6s ease-in-out infinite;
	}

	/* ── PHRASES SECTION ── */
	.phrases-section {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		position: relative;
		overflow: hidden;
		padding: 6rem 2rem;
		background: #ffffff;
		gap: 2.5rem;
	}

	/* FIX 2: relative container with fixed height — both phrases absolutely centered */
	.phrases-grid {
		position: relative;
		width: 100%;
		max-width: 1000px;
		height: 340px;
	}

	/* Both phrases anchored to the exact same point: 50%/50% of the container */
	.phrase {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 100%;
		margin: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		opacity: 0;
		pointer-events: none;
		transition: opacity 0.7s ease;
	}

	.phrase.visible {
		opacity: 1;
		pointer-events: auto;
	}

	.phrase-text {
		font-family: 'Tanker', serif;
		font-size: clamp(1.6rem, 4vw, 3.5rem);
		color: #0a0a0a;
		text-align: center;
		max-width: 1000px;
		line-height: 1.2;
		margin: 0;
		padding: 0 1.5rem;
	}

	/* FIX 3: "continua" pulse arrow below phrase 1 */
	.continue-btn {
		background: none;
		border: none;
		cursor: pointer;
		padding: 0.5rem;
		color: #0a0a0a;
		opacity: 0.6;
		transition: opacity 0.2s ease;
	}

	.continue-btn:hover {
		opacity: 1;
	}

	.continue-arrow {
		display: inline-block;
		font-size: 1.8rem;
		animation: bounce 1.4s ease-in-out infinite;
	}

	/* CTA "Inizia il percorso" */
	.cta-wrap {
		opacity: 0;
		transition: opacity 0.6s ease;
		pointer-events: none;
	}
	.cta-wrap.visible {
		opacity: 1;
		pointer-events: auto;
	}

	/* ── BLOBS ── */
	.blobs { position: absolute; inset: 0; pointer-events: none; }

	.blob { position: absolute; border-radius: 50%; filter: blur(100px); }

	.blob-1 {
		width: 420px; height: 420px;
		background: radial-gradient(circle, #c0b0b0 0%, transparent 70%);
		opacity: 0.1; top: 8%; left: -8%;
	}
	.blob-2 {
		width: 320px; height: 320px;
		background: radial-gradient(circle, #b0b8c0 0%, transparent 70%);
		opacity: 0.09; bottom: 10%; right: 5%;
	}
	.blob-3 {
		width: 260px; height: 260px;
		background: radial-gradient(circle, #c0c0b0 0%, transparent 70%);
		opacity: 0.08; top: 50%; left: 55%;
	}

	/* ── CTA PATH ── */
	.cta-path {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		font-family: 'Tanker', serif;
		font-size: 1.25rem;
		color: #0a0a0a;
		background: transparent;
		border: 2px solid #0a0a0a;
		border-radius: 100px;
		padding: 0.85rem 2rem;
		cursor: pointer;
		letter-spacing: 0.04em;
		transition: background 0.25s ease, color 0.25s ease;
	}

	.cta-path:hover {
		background: #0a0a0a;
		color: #ffffff;
	}

	.cta-path .cta-arrow {
		display: inline-block;
		animation: bounce 1.6s ease-in-out infinite;
	}

	/* ── CARDS ── */
	.cards-section {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 6rem 2rem;
		background: #ffffff;
	}

	.cards-row {
		display: flex;
		flex-direction: row;
		gap: 56px;
		align-items: center;
		justify-content: center;
		flex-wrap: wrap;
	}

	/* ── ANIMATIONS ── */
	@keyframes bounce {
		0%, 100% { transform: translateY(0); }
		50%       { transform: translateY(7px); }
	}

	/* ── RESPONSIVE ── */
	@media (max-width: 1024px) {
		.cards-row { gap: 40px; }
	}

	@media (max-width: 768px) {
		.hero-title { font-size: clamp(2rem, 9vw, 3.5rem); }
		.phrases-section { padding: 4rem 1rem; }
		.phrase-text { font-size: clamp(1.4rem, 5vw, 2rem); }
		.cards-row { flex-direction: column; gap: 5rem; }
	}

	@media (prefers-reduced-motion: reduce) {
		.cta-scroll .cta-arrow,
		.cta-path .cta-arrow,
		.continue-arrow { animation: none; }
	}
</style>
