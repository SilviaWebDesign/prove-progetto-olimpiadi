<script lang="ts">
	import { onMount } from 'svelte';

	let canvas = $state<HTMLCanvasElement | null>(null);

	// FIX 1: progress drives imgOpacity via $derived — no direct mutation of display state
	let progress = $state(0);
	const imgOpacity = $derived(Math.max(0, Math.min(1, (progress - 0.1) / 0.8)) * 0.35);

	const ACCENT_COLORS = ['#3EAF3F', '#422CCB', '#FE6D2D'];
	const CELL_SIZE_DESKTOP = 95;
	const CELL_SIZE_MOBILE = 60;
	const TARGET_DURATION_MS = 5000;
	const REVEAL_DURATION_MS = 300;
	const ACCENT_COUNT = 10;

	const prefersReducedMotion =
		typeof window !== 'undefined'
			? window.matchMedia('(prefers-reduced-motion: reduce)').matches
			: false;

	function fisherYates<T>(arr: T[]): T[] {
		const a = [...arr];
		for (let i = a.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[a[i], a[j]] = [a[j], a[i]];
		}
		return a;
	}

	function easeOut(t: number): number {
		return 1 - (1 - t) * (1 - t);
	}

	onMount(() => {
		if (!canvas) return;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		const cellSize = window.innerWidth < 768 ? CELL_SIZE_MOBILE : CELL_SIZE_DESKTOP;

		// FIX 2: canvas exactly 100vw × 100vh
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;

		// FIX 2: resize listener keeps canvas pixel dimensions in sync
		function onResize() {
			if (!canvas) return;
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight;
		}
		window.addEventListener('resize', onResize);

		const W = canvas.width;
		const H = canvas.height;

		const img = new Image();
		img.src = '/images/hero-medal.png';

		let rafId = 0;

		img.onload = () => {
			const coverScale = Math.max(W / img.width, H / img.height);
			const imgOffX = (W - img.width * coverScale) / 2;
			const imgOffY = (H - img.height * coverScale) / 2;

			const offscreen = document.createElement('canvas');
			offscreen.width = img.width;
			offscreen.height = img.height;
			const offCtx = offscreen.getContext('2d')!;
			offCtx.drawImage(img, 0, 0);
			const imgData = offCtx.getImageData(0, 0, img.width, img.height).data;

			const GRID_COLS = Math.ceil(W / cellSize);
			const GRID_ROWS = Math.ceil(H / cellSize);
			const cellW = W / GRID_COLS;
			const cellH = H / GRID_ROWS;
			const totalCells = GRID_COLS * GRID_ROWS;

			const stepMs = TARGET_DURATION_MS / totalCells;

			type Cell = {
				cx: number; cy: number;
				color: string;
				revealDelay: number;
				isAccent: boolean;
			};

			const orderedCells: Cell[] = [];
			for (let row = 0; row < GRID_ROWS; row++) {
				for (let col = 0; col < GRID_COLS; col++) {
					const cx = col * cellW + cellW / 2;
					const cy = row * cellH + cellH / 2;

					const imgX = Math.max(0, Math.min(img.width - 1, Math.round((cx - imgOffX) / coverScale)));
					const imgY = Math.max(0, Math.min(img.height - 1, Math.round((cy - imgOffY) / coverScale)));
					const pi = (imgY * img.width + imgX) * 4;
					const r = imgData[pi];
					const g = imgData[pi + 1];
					const b = imgData[pi + 2];
					const alpha = imgData[pi + 3];
					const color = alpha < 10 ? 'rgba(255,255,255,0)' : `rgb(${r},${g},${b})`;

					orderedCells.push({ cx, cy, color, revealDelay: 0, isAccent: false });
				}
			}

			const accentIndices = new Set<number>();
			while (accentIndices.size < Math.min(ACCENT_COUNT, totalCells)) {
				accentIndices.add(Math.floor(Math.random() * totalCells));
			}
			accentIndices.forEach((idx) => {
				orderedCells[idx].color = ACCENT_COLORS[Math.floor(Math.random() * ACCENT_COLORS.length)];
				orderedCells[idx].isAccent = true;
			});

			const cells = fisherYates(orderedCells);
			cells.forEach((cell, i) => { cell.revealDelay = i * stepMs; });

			if (prefersReducedMotion) {
				progress = 1; // FIX 1: instant reveal via progress
				for (const cell of cells) {
					if (cell.color === 'rgba(255,255,255,0)') continue;
					ctx.globalAlpha = cell.isAccent ? 0.85 : 0.65;
					ctx.fillStyle = cell.color;
					ctx.fillRect(cell.cx - cellW / 2, cell.cy - cellH / 2, cellW, cellH);
				}
				ctx.globalAlpha = 1;
				return;
			}

			const startTime = performance.now();
			const endTime = startTime + TARGET_DURATION_MS + REVEAL_DURATION_MS;

			function render(now: number) {
				const elapsed = now - startTime;
				ctx!.clearRect(0, 0, W, H);

				// FIX 1: update progress; imgOpacity derives from it
				progress = Math.min(1, elapsed / TARGET_DURATION_MS);

				for (const cell of cells) {
					if (elapsed < cell.revealDelay) continue;
					if (cell.color === 'rgba(255,255,255,0)') continue;

					const t = Math.min(1, (elapsed - cell.revealDelay) / REVEAL_DURATION_MS);
					const eased = easeOut(t);

					const halfW = (cellW / 2) * (0.5 + 0.5 * eased);
					const halfH = (cellH / 2) * (0.5 + 0.5 * eased);

					ctx!.globalAlpha = (cell.isAccent ? 0.85 : 0.65) * eased;
					ctx!.fillStyle = cell.color;
					ctx!.fillRect(cell.cx - halfW, cell.cy - halfH, halfW * 2, halfH * 2);
				}

				ctx!.globalAlpha = 1;
				if (now < endTime) rafId = requestAnimationFrame(render);
			}

			rafId = requestAnimationFrame(render);
		};

		return () => {
			window.removeEventListener('resize', onResize); // FIX 2: cleanup
			cancelAnimationFrame(rafId);
		};
	});
</script>

<div class="pixel-bg">
	<img
		class="hero-bg-img"
		src="/images/hero-medal.png"
		style="opacity: {imgOpacity};"
		alt=""
		aria-hidden="true"
	/>
	<canvas bind:this={canvas} aria-label="Immagine medaglia con effetto pixel mosaico"></canvas>
</div>

<style>
	.pixel-bg {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		z-index: 0;
	}

	.hero-bg-img {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		z-index: 0;
	}

	canvas {
		position: absolute;
		inset: 0;
		display: block;
		width: 100%;
		height: 100%;
		z-index: 1;
	}
</style>
