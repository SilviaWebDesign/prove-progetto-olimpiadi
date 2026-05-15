<script lang="ts">
	// ===== COSTANTI — modifica qui per tweakare il comportamento =====
	const FRAME_SIZE = 220; // px — larghezza e altezza di ogni frame (sia scia che attivo)
	const TRAIL_DURATION = 3000; // ms — quanto a lungo ogni copia della scia rimane visibile prima di sparire
	const SAMPLE_INTERVAL = 80; // ms — intervallo minimo tra una copia della scia e la successiva (throttle)

	// Qualità del JPEG generato dal canvas (0–1). Più basso = meno memoria, più artefatti.
	const SNAPSHOT_QUALITY = 0.85;

	interface TrailFrame {
		id: number;
		x: number; // posizione cursore al momento del campionamento
		y: number;
		snapshot: string; // data URL dell'immagine congelata sul fotogramma corrente del video
	}

	let trail = $state<TrailFrame[]>([]);
	let mouseX = $state(-9999); // posizione corrente del cursore (inizia fuori schermo)
	let mouseY = $state(-9999);

	// Riferimento all'elemento <video> nel DOM — non reattivo, serve solo per leggerne i frame
	let videoEl: HTMLVideoElement;

	let nextId = 0;
	let lastSampleTime = 0;

	/**
	 * Cattura il fotogramma corrente del video e lo disegna su un canvas temporaneo,
	 * replicando il comportamento di object-fit: cover per un frame quadrato.
	 * Restituisce un data URL (JPEG) oppure null se il video non è ancora pronto.
	 */
	function captureFrame(): string | null {
		// readyState >= 2 (HAVE_CURRENT_DATA) garantisce che ci sia almeno un fotogramma disponibile.
		// videoWidth === 0 significa che i metadati non sono ancora arrivati.
		if (!videoEl || videoEl.readyState < 2 || videoEl.videoWidth === 0) return null;

		// Canvas temporaneo delle stesse dimensioni del frame — non viene mai inserito nel DOM
		const canvas = document.createElement('canvas');
		canvas.width = FRAME_SIZE;
		canvas.height = FRAME_SIZE;
		const ctx = canvas.getContext('2d');
		if (!ctx) return null;

		const vw = videoEl.videoWidth;
		const vh = videoEl.videoHeight;

		// Calcolo del crop centrato per replicare object-fit: cover su un frame quadrato.
		// Si prende il lato più corto del video e si ritaglia un quadrato al centro,
		// poi lo si scala a FRAME_SIZE × FRAME_SIZE.
		let sx: number, sy: number, sideLen: number;
		if (vw > vh) {
			// Video più largo che alto: il crop è alto quanto il video, centrato orizzontalmente
			sideLen = vh;
			sx = (vw - vh) / 2;
			sy = 0;
		} else {
			// Video più alto che largo (o quadrato): il crop è largo quanto il video, centrato verticalmente
			sideLen = vw;
			sx = 0;
			sy = (vh - vw) / 2;
		}

		// drawImage a 9 argomenti: (source, sx, sy, sw, sh, dx, dy, dw, dh)
		// Ritaglia il quadrato dal video e lo ridimensiona al canvas
		ctx.drawImage(videoEl, sx, sy, sideLen, sideLen, 0, 0, FRAME_SIZE, FRAME_SIZE);

		return canvas.toDataURL('image/jpeg', SNAPSHOT_QUALITY);
	}

	function onMouseMove(e: MouseEvent) {
		// Aggiorna sempre la posizione del frame attivo
		mouseX = e.clientX;
		mouseY = e.clientY;

		// Throttle: aggiunge una copia alla scia solo ogni SAMPLE_INTERVAL ms
		const now = Date.now();
		if (now - lastSampleTime < SAMPLE_INTERVAL) return;
		lastSampleTime = now;

		// Cattura il fotogramma corrente; se il video non è pronto, salta questa copia
		const snapshot = captureFrame();
		if (!snapshot) return;

		trail.push({ id: nextId++, x: e.clientX, y: e.clientY, snapshot });
	}

	// Rimuove un frame dalla scia quando la sua animazione CSS è terminata
	function removeFrame(id: number) {
		const idx = trail.findIndex((f) => f.id === id);
		if (idx !== -1) trail.splice(idx, 1);
	}
</script>

<!--
	Struttura a layer:
	  1. .trail-layer  (z-index 10) — copie statiche della scia (immagini congelate), SOTTO il testo
	  2. .title        (z-index 20) — scritta bianca su bianco, visibile solo dove la scia passa dietro
	  3. .active-frame (z-index 30) — frame col video live che segue il cursore, SOPRA il testo
-->
<div class="page" onmousemove={onMouseMove} role="presentation">
	<!-- Layer 1: copie della scia — ogni copia è un'immagine statica congelata al momento del campionamento -->
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
				<!-- Immagine statica catturata dal canvas al momento della copia -->
				<img src={frame.snapshot} alt="" />
			</div>
		{/each}
	</div>

	<!-- Layer 2: scritta centrale — bianca su bianco, rivelata dalla scia sotto -->
	<h1 class="title">SOSTENIBILITÀ</h1>

	<!-- Layer 3: frame attivo con video live che segue il cursore, sopra il testo -->
	<div
		class="frame active-frame"
		style="
			left: {mouseX - FRAME_SIZE / 2}px;
			top:  {mouseY - FRAME_SIZE / 2}px;
			width: {FRAME_SIZE}px;
			height: {FRAME_SIZE}px;
		"
	>
		<!--
			autoplay + muted: obbligatori insieme per l'autoplay nei browser moderni.
			loop: il video riparte dall'inizio quando finisce.
			playsinline: su iOS evita il fullscreen automatico.
			bind:this: riferimento all'elemento per captureFrame().
		-->
		<video
			src="/videos/test-video.mp4"
			autoplay
			loop
			muted
			playsinline
			bind:this={videoEl}
		></video>
	</div>
</div>

<style>
	@font-face {
		font-family: 'Tanker';
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
		cursor: none;
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
		z-index: 10;
	}

	/* ---- Frame condiviso (scia + attivo) ---- */
	.frame {
		position: fixed;
		overflow: hidden;
		border: 2px solid #111;
		box-sizing: border-box;
	}

	/* ---- Copia della scia: immagine statica con fade-out ---- */
	.trail-frame {
		pointer-events: none;
		animation: fadeOut linear forwards;
	}

	.trail-frame img {
		width: 100%;
		height: 100%;
		/* object-fit non serve: il canvas ha già prodotto un'immagine già ritagliata e quadrata */
		display: block;
	}

	@keyframes fadeOut {
		0% {
			opacity: 1;
		}
		65% {
			opacity: 1;
		}
		100% {
			opacity: 0;
		}
	}

	/* ---- Frame attivo con video live ---- */
	.active-frame {
		z-index: 30;
		pointer-events: none;
	}

	.active-frame video {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}
</style>
