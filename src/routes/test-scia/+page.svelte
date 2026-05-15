<script lang="ts">
	// ===== COSTANTI — modifica qui per tweakare il comportamento =====
	const FRAME_SIZE = 220; // px — larghezza e altezza di ogni frame (sia scia che attivo)
	const TRAIL_DURATION = 3000; // ms — quanto a lungo ogni copia della scia rimane visibile prima di sparire
	const SAMPLE_INTERVAL = 80; // ms — intervallo minimo tra una copia della scia e la successiva (throttle)

	interface TrailFrame {
		id: number;
		x: number; // posizione cursore al momento del campionamento
		y: number;
		createdAt: number;
	}

	let trail = $state<TrailFrame[]>([]);
	let mouseX = $state(-9999); // posizione corrente del cursore (inizia fuori schermo)
	let mouseY = $state(-9999);

	let nextId = 0;
	let lastSampleTime = 0;

	function onMouseMove(e: MouseEvent) {
		// Aggiorna sempre la posizione del frame attivo
		mouseX = e.clientX;
		mouseY = e.clientY;

		// Throttle: aggiunge una copia alla scia solo ogni SAMPLE_INTERVAL ms
		const now = Date.now();
		if (now - lastSampleTime < SAMPLE_INTERVAL) return;
		lastSampleTime = now;

		trail.push({ id: nextId++, x: e.clientX, y: e.clientY, createdAt: now });
	}

	// Rimuove un frame dalla scia quando la sua animazione CSS è terminata
	function removeFrame(id: number) {
		const idx = trail.findIndex((f) => f.id === id);
		if (idx !== -1) trail.splice(idx, 1);
	}
</script>

<!--
	Struttura a layer:
	  1. .trail-layer  (z-index 10) — copie statiche della scia, SOTTO il testo
	  2. .title        (z-index 20) — scritta bianca su bianco, visibile solo dove la scia passa dietro
	  3. .active-frame (z-index 30) — frame che segue il cursore, SOPRA il testo
-->
<div class="page" onmousemove={onMouseMove} role="presentation">
	<!-- Layer 1: copie della scia -->
	<div class="trail-layer">
		{#each trail as frame (frame.id)}
			<div
				class="frame trail-frame"
				style="
					left: {frame.x - FRAME_SIZE / 2}px;
					top:  {frame.y - FRAME_SIZE / 2}px;
					width: {FRAME_SIZE}px;
					height: {FRAME_SIZE}px;
					animation-duration: {TRAIL_DURATION}ms;
				"
				onanimationend={() => removeFrame(frame.id)}
			>
				<img src="/images/test-photo.jpg" alt="" />
			</div>
		{/each}
	</div>

	<!-- Layer 2: scritta centrale — bianca su bianco, rivelata dalla scia sotto -->
	<h1 class="title">SOSTENIBILITÀ</h1>

	<!-- Layer 3: frame attivo che segue il cursore, sopra il testo -->
	<div
		class="frame active-frame"
		style="
			left: {mouseX - FRAME_SIZE / 2}px;
			top:  {mouseY - FRAME_SIZE / 2}px;
			width: {FRAME_SIZE}px;
			height: {FRAME_SIZE}px;
		"
	>
		<img src="/images/test-photo.jpg" alt="" />
	</div>
</div>

<style>
	@font-face {
		font-family: 'Tanker';
		/* Il percorso include la cartella con spazio nel nome */
		src: url('/fonts /tanker-regular/tanker-regular.otf') format('opentype');
		font-weight: normal;
		font-style: normal;
	}

	:global(body) {
		margin: 0;
		padding: 0;
		overflow: hidden;
	}

	.page {
		position: fixed;
		inset: 0;
		background: white;
		cursor: none; /* nasconde il cursore nativo: il frame attivo lo sostituisce visivamente */
	}

	/* ---- Scritta centrale ---- */
	.title {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		margin: 0;
		font-family: 'Tanker', sans-serif;
		font-size: clamp(3rem, 11vw, 12rem);
		font-weight: normal;
		/* Testo bianco = identico allo sfondo → invisibile da solo,
		   visibile solo dove un frame della scia passa dietro */
		color: white;
		white-space: nowrap;
		user-select: none;
		pointer-events: none;
		z-index: 20;
	}

	/* ---- Layer della scia ---- */
	.trail-layer {
		position: fixed;
		inset: 0;
		pointer-events: none;
		z-index: 10; /* sotto il testo */
	}

	/* ---- Frame condiviso (scia + attivo) ---- */
	.frame {
		position: fixed;
		overflow: hidden;
		border: 2px solid #111;
		box-sizing: border-box;
	}

	.frame img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	/* ---- Copia della scia: fade-out CSS ---- */
	.trail-frame {
		pointer-events: none;
		/* animation-duration viene passata inline così TRAIL_DURATION è l'unica fonte di verità */
		animation: fadeOut linear forwards;
	}

	@keyframes fadeOut {
		0% {
			opacity: 1;
		}
		65% {
			opacity: 1; /* rimane piena per i primi 2/3 della durata */
		}
		100% {
			opacity: 0;
		}
	}

	/* ---- Frame attivo (segue il cursore) ---- */
	.active-frame {
		z-index: 30; /* sopra il testo */
		pointer-events: none;
	}
</style>
