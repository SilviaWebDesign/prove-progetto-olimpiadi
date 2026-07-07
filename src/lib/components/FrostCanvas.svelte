<script lang="ts">
	// ─── Props ───────────────────────────────────────────────────────────────
	interface Props {
		src: string;
		objectPosition?: string;
	}
	let { src, objectPosition = 'center' }: Props = $props();

	function parseObjectPosition(pos: string): [number, number] {
		const parts = pos.trim().split(/\s+/);
		const parseAxis = (value: string, fallback: number) => {
			if (value.endsWith('%')) return parseFloat(value) / 100;
			if (value === 'left' || value === 'top') return 0;
			if (value === 'right' || value === 'bottom') return 1;
			if (value === 'center') return 0.5;
			return fallback;
		};
		return [parseAxis(parts[0] ?? 'center', 0.5), parseAxis(parts[1] ?? parts[0] ?? 'center', 0.5)];
	}

	const [focusX, focusY] = $derived(parseObjectPosition(objectPosition));

	// ─── Config — identico al prototipo frost-reveal ─────────────────────────
	const FROST_OPACITY = 1.0;
	const FROST_VEIL_OPACITY = 0.42;
	const FROST_VEIL_OPACITY_MOBILE = 0.58;
	const GRAIN_OPACITY = 0.3;
	const SCRATCH_OPACITY = 0.16;
	const BLUR_AMOUNT = 23;
	const BLUR_AMOUNT_MOBILE = 30;
	const INITIAL_SNOWFLAKE_DENSITY = 40;
	const INITIAL_SPECKLE_DENSITY = 600;
	const INITIAL_CRYSTAL_OPACITY = 0.55;
	const REVEAL_RADIUS = 100;
	const REVEAL_LIFETIME = 1600;
	const REVEAL_POINT_SPACING = 6;
	const REVEAL_EDGE_SOFTNESS = 0.38;
	const REVEAL_SHARD_COUNT = 20;
	const REVEAL_SNOWFLAKE_CHANCE = 0.06;
	const MAX_REVEAL_STRENGTH = 0.4;
	const STATIONARY_DEFROST_DELAY = 500;
	const STATIONARY_DEFROST_RATE = 0.007;
	const MAX_STATIONARY_STRENGTH = 0.7;

	// ─── DOM refs ($state → tracciati da $effect) ────────────────────────────
	let wrapper = $state<HTMLDivElement | null>(null);
	let canvas = $state<HTMLCanvasElement | null>(null);
	let ready = $state(false);

	// ─── Variabili interne (non reattive) ────────────────────────────────────
	let ctx: CanvasRenderingContext2D | null = null;
	let imgEl: HTMLImageElement | null = null;
	let cssW = 0;
	let cssH = 0;
	let frostedCanvas: HTMLCanvasElement | null = null;
	let frostedCtx: CanvasRenderingContext2D | null = null;
	let revealCanvas: HTMLCanvasElement | null = null;
	let revealCtx: CanvasRenderingContext2D | null = null;

	interface Shard {
		angle: number;
		dist: number;
		rot: number;
		alpha: number;
		pts: [number, number][];
	}
	interface RevealPoint {
		x: number;
		y: number;
		timestamp: number;
		shards: Shard[];
	}
	let revealPoints: RevealPoint[] = [];
	let lastRevealX: number | undefined;
	let lastRevealY: number | undefined;
	let animRafId: number | null = null;
	let stationaryAccum = 0;
	let lastMoveTime = 0;
	let cursorX: number | undefined;
	let cursorY: number | undefined;
	let cursorInside = false;
	let meltEnabled = $state(true);
	let mobileFrost = $state(false);

	const MOBILE_BREAKPOINT = '(max-width: 768px)';

	function frostBlurAmount() {
		return mobileFrost ? BLUR_AMOUNT_MOBILE : BLUR_AMOUNT;
	}

	function frostVeilOpacity() {
		return mobileFrost ? FROST_VEIL_OPACITY_MOBILE : FROST_VEIL_OPACITY;
	}

	function finalVeilOpacity() {
		return 0.22;
	}

	function shouldUseManualBlur() {
		// Mobile Safari often exposes ctx.filter but doesn't paint blur — use box blur.
		return mobileFrost || !canvasFilterSupported();
	}

	function frostTone() {
		return {
			brightness: 1.15,
			contrast: 1.08
		};
	}

	function resetCanvasSize(
		target: HTMLCanvasElement,
		targetCtx: CanvasRenderingContext2D,
		dpr: number
	) {
		target.width = Math.round(cssW * dpr);
		target.height = Math.round(cssH * dpr);
		targetCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
	}

	function syncCanvasSize() {
		if (!canvas || !wrapper) return;
		const rect = wrapper.getBoundingClientRect();
		const nextW = Math.max(1, rect.width);
		const nextH = Math.max(1, rect.height);
		if (Math.round(nextW) === Math.round(cssW) && Math.round(nextH) === Math.round(cssH) && ctx)
			return;

		cssW = nextW;
		cssH = nextH;

		const dpr = window.devicePixelRatio || 1;
		ctx = canvas.getContext('2d')!;
		resetCanvasSize(canvas, ctx, dpr);

		frostedCanvas ??= document.createElement('canvas');
		frostedCtx = frostedCanvas.getContext('2d')!;
		resetCanvasSize(frostedCanvas, frostedCtx, dpr);

		revealCanvas ??= document.createElement('canvas');
		revealCtx = revealCanvas.getContext('2d')!;
		resetCanvasSize(revealCanvas, revealCtx, dpr);

		if (imgEl) drawFrost();
	}

	// ─── Setup su mount ──────────────────────────────────────────────────────
	$effect(() => {
		if (!canvas || !wrapper) return;

		const mobileQuery = window.matchMedia(MOBILE_BREAKPOINT);
		const syncMeltEnabled = () => {
			mobileFrost = mobileQuery.matches;
			meltEnabled = !mobileFrost;
			if (!meltEnabled) {
				revealPoints = [];
				stationaryAccum = 0;
				cursorInside = false;
				lastRevealX = undefined;
				lastRevealY = undefined;
				if (animRafId !== null) {
					cancelAnimationFrame(animRafId);
					animRafId = null;
				}
				renderCurrentState();
			}
			if (imgEl) drawFrost();
		};
		syncMeltEnabled();
		mobileQuery.addEventListener('change', syncMeltEnabled);

		syncCanvasSize();
		const resizeObserver = new ResizeObserver(syncCanvasSize);
		resizeObserver.observe(wrapper);
		window.visualViewport?.addEventListener('resize', syncCanvasSize);

		const img = new Image();
		// crossOrigin on same-origin static assets breaks getImageData on some Safari builds.
		if (src.startsWith('http') && !src.startsWith(window.location.origin)) {
			img.crossOrigin = 'anonymous';
		}
		img.onload = () => {
			imgEl = img;
			drawFrost();
			ready = true;
		};
		img.src = src;

		return () => {
			mobileQuery.removeEventListener('change', syncMeltEnabled);
			resizeObserver.disconnect();
			window.visualViewport?.removeEventListener('resize', syncCanvasSize);
			if (animRafId !== null) {
				cancelAnimationFrame(animRafId);
				animRafId = null;
			}
			ctx = null;
			imgEl = null;
			frostedCanvas = null;
			frostedCtx = null;
			revealCanvas = null;
			revealCtx = null;
			revealPoints = [];
		};
	});

	// ─── FROST DRAWING ────────────────────────────────────────────────────────
	function drawFrost() {
		if (!frostedCtx || !imgEl) return;
		const w = cssW;
		const h = cssH;
		const mainCtx = ctx;
		ctx = frostedCtx;
		ctx!.globalCompositeOperation = 'source-over';
		ctx!.globalAlpha = 1;
		ctx!.clearRect(0, 0, w, h);
		drawBlurredImage(w, h);
		drawFrostColor(w, h);
		drawGrain(w, h);
		drawStaticScratches(w, h);
		drawInitialFrostDetails(w, h);
		drawFrostVeil(w, h);
		ctx = mainCtx;
		renderCurrentState();
	}

	/** Allinea il disegno canvas a object-fit: cover + object-position dell'img .sharp */
	function drawImageCover(img: HTMLImageElement, w: number, h: number, bleed = 0) {
		const iw = img.naturalWidth;
		const ih = img.naturalHeight;
		if (!iw || !ih) return;

		const scale = Math.max(w / iw, h / ih);
		const dw = iw * scale;
		const dh = ih * scale;
		const dx = (w - dw) * focusX - bleed;
		const dy = (h - dh) * focusY - bleed;

		ctx!.drawImage(img, dx, dy, dw + bleed * 2, dh + bleed * 2);
	}

	function drawBlurredImage(w: number, h: number) {
		const blur = frostBlurAmount();
		const bleed = blur * 2;
		const { brightness, contrast } = frostTone();
		const pw = w + bleed * 2;
		const ph = h + bleed * 2;

		if (!shouldUseManualBlur()) {
			const dpr = window.devicePixelRatio || 1;
			const padded = document.createElement('canvas');
			padded.width = Math.round(pw * dpr);
			padded.height = Math.round(ph * dpr);
			const paddedCtx = padded.getContext('2d')!;
			paddedCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
			paddedCtx.translate(bleed, bleed);

			const mainCtx = ctx;
			ctx = paddedCtx;
			drawImageCover(imgEl!, w, h, 0);
			ctx = mainCtx;

			ctx!.save();
			ctx!.filter = `blur(${blur}px) brightness(${brightness}) saturate(0) contrast(${contrast})`;
			ctx!.drawImage(padded, -bleed, -bleed, pw, ph);
			ctx!.filter = 'none';
			ctx!.restore();
			return;
		}

		// Safari: ctx.filter blur is exposed but often not painted — manual box blur.
		const work = document.createElement('canvas');
		work.width = Math.round(pw);
		work.height = Math.round(ph);
		const wctx = work.getContext('2d')!;
		coverRect(wctx, imgEl!, 0, 0, pw, ph, focusX, focusY);
		coverRect(wctx, imgEl!, bleed, bleed, w, h, focusX, focusY);

		blurCanvasInPlace(work, blur);
		applyBrightnessContrast(work, brightness, contrast);

		ctx!.save();
		ctx!.imageSmoothingEnabled = true;
		ctx!.imageSmoothingQuality = 'high';
		ctx!.drawImage(work, -bleed, -bleed, pw, ph);
		ctx!.restore();
	}

	// Whether CanvasRenderingContext2D.filter actually RENDERS a blur. Safari exposes
	// the property but often doesn't paint it — test pixels, don't trust the API.
	let _canvasFilterOk: boolean | null = null;
	function canvasFilterSupported(): boolean {
		if (_canvasFilterOk !== null) return _canvasFilterOk;
		try {
			const a = document.createElement('canvas');
			a.width = 20;
			a.height = 1;
			const actx = a.getContext('2d')!;
			actx.fillStyle = '#000';
			actx.fillRect(0, 0, 10, 1);
			actx.fillStyle = '#fff';
			actx.fillRect(10, 0, 10, 1);

			const b = document.createElement('canvas');
			b.width = 20;
			b.height = 1;
			const bctx = b.getContext('2d')!;
			bctx.filter = 'blur(3px)';
			bctx.drawImage(a, 0, 0);
			bctx.filter = 'none';

			const v = bctx.getImageData(9, 0, 1, 1).data[0];
			_canvasFilterOk = v > 10;
		} catch {
			_canvasFilterOk = false;
		}
		return _canvasFilterOk;
	}

	function coverRect(
		c: CanvasRenderingContext2D,
		img: HTMLImageElement,
		tx: number,
		ty: number,
		tw: number,
		th: number,
		fx = 0.5,
		fy = 0.5
	) {
		const iw = img.naturalWidth;
		const ih = img.naturalHeight;
		if (!iw || !ih) return;
		const s = Math.max(tw / iw, th / ih);
		const dw = iw * s;
		const dh = ih * s;
		c.drawImage(img, tx + (tw - dw) * fx, ty + (th - dh) * fy, dw, dh);
	}

	const SAFARI_BLUR_PASSES = 3;

	function blurCanvasInPlace(cv: HTMLCanvasElement, radius: number) {
		const cx = cv.getContext('2d')!;
		const w = cv.width;
		const h = cv.height;
		if (w < 3 || h < 3) return;
		let img: ImageData;
		try {
			img = cx.getImageData(0, 0, w, h);
		} catch {
			return;
		}
		const a = img.data;
		const b = new Uint8ClampedArray(a.length);
		const r = Math.max(1, Math.round(radius));
		for (let p = 0; p < SAFARI_BLUR_PASSES; p++) {
			boxBlurH(a, b, w, h, r);
			boxBlurV(b, a, w, h, r);
		}
		cx.putImageData(img, 0, 0);
	}

	function boxBlurH(src: Uint8ClampedArray, dst: Uint8ClampedArray, w: number, h: number, r: number) {
		const n = r + r + 1;
		for (let y = 0; y < h; y++) {
			const row = y * w * 4;
			for (let c = 0; c < 4; c++) {
				let sum = 0;
				for (let i = -r; i <= r; i++) {
					const x = i < 0 ? 0 : i >= w ? w - 1 : i;
					sum += src[row + x * 4 + c];
				}
				for (let x = 0; x < w; x++) {
					dst[row + x * 4 + c] = sum / n;
					const xa = x + r + 1 >= w ? w - 1 : x + r + 1;
					const xs = x - r < 0 ? 0 : x - r;
					sum += src[row + xa * 4 + c] - src[row + xs * 4 + c];
				}
			}
		}
	}

	function boxBlurV(src: Uint8ClampedArray, dst: Uint8ClampedArray, w: number, h: number, r: number) {
		const n = r + r + 1;
		for (let x = 0; x < w; x++) {
			const col = x * 4;
			for (let c = 0; c < 4; c++) {
				let sum = 0;
				for (let i = -r; i <= r; i++) {
					const y = i < 0 ? 0 : i >= h ? h - 1 : i;
					sum += src[y * w * 4 + col + c];
				}
				for (let y = 0; y < h; y++) {
					dst[y * w * 4 + col + c] = sum / n;
					const ya = y + r + 1 >= h ? h - 1 : y + r + 1;
					const ys = y - r < 0 ? 0 : y - r;
					sum += src[ya * w * 4 + col + c] - src[ys * w * 4 + col + c];
				}
			}
		}
	}

	function applyBrightnessContrast(cv: HTMLCanvasElement, brightness: number, contrast: number) {
		const cx = cv.getContext('2d')!;
		let img: ImageData;
		try {
			img = cx.getImageData(0, 0, cv.width, cv.height);
		} catch {
			return;
		}
		const d = img.data;
		for (let i = 0; i < d.length; i += 4) {
			for (let k = 0; k < 3; k++) {
				let v = d[i + k] * brightness;
				v = (v - 128) * contrast + 128;
				d[i + k] = v < 0 ? 0 : v > 255 ? 255 : v;
			}
		}
		cx.putImageData(img, 0, 0);
	}

	function drawFrostColor(w: number, h: number) {
		ctx!.save();
		ctx!.globalAlpha = FROST_OPACITY;
		const patches: [number, number, number, string, number, number][] = [
			[0.12, 0.18, 0.7, '218,238,255', 0.78, 0.48],
			[0.88, 0.82, 0.6, '205,230,255', 0.72, 0.42],
			[0.65, 0.44, 0.42, '230,245,255', 0.58, 0.0],
			[0.5, 0.88, 0.6, '200,225,252', 0.48, 0.0]
		];
		for (const [cx, cy, r, rgb, a0, a1] of patches) {
			const g = ctx!.createRadialGradient(w * cx, h * cy, 0, w * cx, h * cy, w * r);
			g.addColorStop(0, `rgba(${rgb},${a0})`);
			if (a1 > 0) g.addColorStop(0.45, `rgba(${rgb},${a1})`);
			g.addColorStop(1, 'rgba(0,0,0,0)');
			ctx!.fillStyle = g;
			ctx!.fillRect(0, 0, w, h);
		}
		ctx!.globalAlpha = frostVeilOpacity();
		ctx!.fillStyle = 'rgba(215,235,255,1)';
		ctx!.fillRect(0, 0, w, h);
		ctx!.restore();
	}

	function drawFrostVeil(w: number, h: number) {
		ctx!.save();
		ctx!.globalAlpha = finalVeilOpacity();
		ctx!.fillStyle = 'rgba(248, 252, 255, 1)';
		ctx!.fillRect(0, 0, w, h);
		ctx!.restore();
	}

	function drawGrain(w: number, h: number) {
		const S = 200;
		const off = document.createElement('canvas');
		off.width = S;
		off.height = S;
		const gctx = off.getContext('2d')!;
		const data = gctx.createImageData(S, S);
		const d = data.data;
		for (let i = 0; i < d.length; i += 4) {
			if (Math.random() < 0.4) {
				const v = 180 + Math.floor(Math.random() * 75);
				d[i] = v;
				d[i + 1] = v;
				d[i + 2] = Math.min(255, v + 25);
				d[i + 3] = Math.floor(Math.random() * 38);
			}
		}
		gctx.putImageData(data, 0, 0);
		ctx!.save();
		ctx!.globalAlpha = GRAIN_OPACITY;
		ctx!.globalCompositeOperation = 'overlay';
		ctx!.fillStyle = ctx!.createPattern(off, 'repeat')!;
		ctx!.fillRect(0, 0, w, h);
		ctx!.restore();
	}

	function drawStaticScratches(w: number, h: number) {
		const diag = Math.sqrt(w * w + h * h);
		ctx!.save();
		ctx!.globalAlpha = SCRATCH_OPACITY;
		ctx!.lineCap = 'round';
		const families: [number, number, number, number][] = [
			[22, 6, 0.3, 0.8],
			[71, 10, 0.25, 0.5],
			[168, 18, 0.2, 0.4]
		];
		for (const [deg, spacing, prob, maxW] of families) {
			const angle = (deg * Math.PI) / 180;
			const perp = angle + Math.PI / 2;
			for (let pos = -diag; pos < diag; pos += spacing) {
				if (Math.random() > prob) continue;
				const ox = w / 2 + Math.cos(perp) * pos;
				const oy = h / 2 + Math.sin(perp) * pos;
				ctx!.beginPath();
				ctx!.lineWidth = 0.2 + Math.random() * maxW;
				ctx!.strokeStyle = `rgba(255,255,255,${0.2 + Math.random() * 0.5})`;
				ctx!.moveTo(ox - Math.cos(angle) * diag, oy - Math.sin(angle) * diag);
				ctx!.lineTo(ox + Math.cos(angle) * diag, oy + Math.sin(angle) * diag);
				ctx!.stroke();
			}
		}
		ctx!.restore();
	}

	function drawInitialFrostDetails(w: number, h: number) {
		ctx!.save();
		ctx!.globalCompositeOperation = 'source-over';
		for (let i = 0; i < INITIAL_SPECKLE_DENSITY; i++) {
			const x = Math.random() * w;
			const y = Math.random() * h;
			const size = 0.5 + Math.random() * 3.2;
			const alpha = (0.08 + Math.random() * 0.4) * INITIAL_CRYSTAL_OPACITY;
			ctx!.globalAlpha = alpha;
			ctx!.fillStyle = `rgba(${220 + Math.floor(Math.random() * 30)}, ${238 + Math.floor(Math.random() * 17)}, 255, 1)`;
			ctx!.save();
			ctx!.translate(x, y);
			ctx!.rotate(Math.random() * Math.PI);
			if (Math.random() < 0.55) {
				const hw = size * 0.12,
					hl = size * 0.88;
				ctx!.fillRect(-hw, -hl, hw * 2, hl * 2);
			} else {
				ctx!.beginPath();
				const pts = 3 + Math.floor(Math.random() * 3);
				for (let j = 0; j < pts; j++) {
					const a = (j / pts) * Math.PI * 2 + (Math.random() - 0.5) * 0.6;
					const d = size * (0.38 + Math.random() * 0.52);
					j === 0
						? ctx!.moveTo(Math.cos(a) * d, Math.sin(a) * d)
						: ctx!.lineTo(Math.cos(a) * d, Math.sin(a) * d);
				}
				ctx!.closePath();
				ctx!.fill();
			}
			ctx!.restore();
		}
		ctx!.strokeStyle = 'rgba(210, 235, 255, 1)';
		ctx!.lineCap = 'round';
		const branchCount = Math.floor(w * 0.18);
		for (let i = 0; i < branchCount; i++) {
			const x = Math.random() * w;
			const y = Math.random() * h;
			const angle = Math.random() * Math.PI * 2;
			const len = 10 + Math.random() * 65;
			const alpha = (0.03 + Math.random() * 0.11) * INITIAL_CRYSTAL_OPACITY;
			ctx!.globalAlpha = alpha;
			ctx!.lineWidth = 0.2 + Math.random() * 0.65;
			ctx!.beginPath();
			ctx!.moveTo(x, y);
			ctx!.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
			ctx!.stroke();
			if (Math.random() < 0.52) {
				const snapDeg = [30, 45, 60][Math.floor(Math.random() * 3)];
				const bSign = Math.random() < 0.5 ? 1 : -1;
				const bAngle = angle + ((snapDeg * Math.PI) / 180) * bSign;
				const bFrac = 0.3 + Math.random() * 0.4;
				const bLen = len * (0.25 + Math.random() * 0.3);
				const bx = x + Math.cos(angle) * len * bFrac;
				const by = y + Math.sin(angle) * len * bFrac;
				ctx!.globalAlpha = alpha * 0.55;
				ctx!.lineWidth *= 0.5;
				ctx!.beginPath();
				ctx!.moveTo(bx, by);
				ctx!.lineTo(bx + Math.cos(bAngle) * bLen, by + Math.sin(bAngle) * bLen);
				ctx!.stroke();
			}
		}
		for (let i = 0; i < INITIAL_SNOWFLAKE_DENSITY; i++) {
			const x = Math.random() * w;
			const y = Math.random() * h;
			const radius = 3 + Math.random() * 22;
			const opacity = (0.07 + Math.random() * 0.3) * INITIAL_CRYSTAL_OPACITY;
			drawSnowflake(x, y, radius, Math.random() * Math.PI, opacity);
		}
		ctx!.restore();
	}

	// ─── POINTER INTERACTION ─────────────────────────────────────────────────
	function getCoords(e: PointerEvent) {
		const rect = wrapper!.getBoundingClientRect();
		return { x: e.clientX - rect.left, y: e.clientY - rect.top };
	}

	function onPointerMove(e: PointerEvent) {
		if (!meltEnabled) return;
		const { x, y } = getCoords(e);
		cursorX = x;
		cursorY = y;
		cursorInside = true;
		lastMoveTime = performance.now();
		stationaryAccum = 0;
		addRevealPoint(x, y);
		lastRevealX = x;
		lastRevealY = y;
	}

	function onPointerLeave() {
		cursorInside = false;
		lastRevealX = undefined;
		lastRevealY = undefined;
	}

	function drawSnowflake(
		cx: number,
		cy: number,
		radius: number,
		rotation: number,
		opacity: number
	) {
		const ARMS = 6;
		ctx!.save();
		ctx!.translate(cx, cy);
		ctx!.rotate(rotation);
		ctx!.strokeStyle = 'rgba(205, 232, 255, 1)';
		ctx!.lineCap = 'round';
		for (let a = 0; a < ARMS; a++) {
			ctx!.save();
			ctx!.rotate((a / ARMS) * Math.PI * 2);
			const mainW = 0.28 + Math.random() * 0.48;
			ctx!.lineWidth = mainW;
			ctx!.globalAlpha = opacity;
			ctx!.beginPath();
			ctx!.moveTo(0, 0);
			ctx!.lineTo(0, -radius);
			ctx!.stroke();
			ctx!.lineWidth = mainW * 0.5;
			ctx!.globalAlpha = opacity * 0.85;
			ctx!.beginPath();
			ctx!.moveTo(0, -radius);
			ctx!.lineTo(-radius * 0.18, -radius * 0.82);
			ctx!.stroke();
			ctx!.beginPath();
			ctx!.moveTo(0, -radius);
			ctx!.lineTo(radius * 0.18, -radius * 0.82);
			ctx!.stroke();
			const numPairs = 1 + Math.floor(Math.random() * 2);
			for (let p = 1; p <= numPairs; p++) {
				const frac = p / (numPairs + 1);
				const bY = -radius * frac;
				const bLen = radius * (0.28 - frac * 0.07) * (0.82 + Math.random() * 0.36);
				const bDeg = ((55 + Math.random() * 15) * Math.PI) / 180;
				ctx!.lineWidth = mainW * (0.8 - frac * 0.22);
				ctx!.globalAlpha = opacity * (0.75 + Math.random() * 0.25);
				ctx!.beginPath();
				ctx!.moveTo(0, bY);
				ctx!.lineTo(-Math.sin(bDeg) * bLen, bY - Math.cos(bDeg) * bLen);
				ctx!.stroke();
				ctx!.beginPath();
				ctx!.moveTo(0, bY);
				ctx!.lineTo(Math.sin(bDeg) * bLen, bY - Math.cos(bDeg) * bLen);
				ctx!.stroke();
			}
			ctx!.restore();
		}
		ctx!.restore();
	}

	// ─── REVEAL MASK ─────────────────────────────────────────────────────────
	function addRevealPoint(x: number, y: number) {
		if (lastRevealX !== undefined) {
			const dx = x - lastRevealX;
			const dy = y - (lastRevealY ?? 0);
			if (dx * dx + dy * dy < REVEAL_POINT_SPACING * REVEAL_POINT_SPACING) return;
		}
		const shards: Shard[] = [];
		for (let i = 0; i < REVEAL_SHARD_COUNT; i++) {
			const angle = Math.random() * Math.PI * 2;
			const dist =
				REVEAL_RADIUS * (REVEAL_EDGE_SOFTNESS + Math.random() * (1.25 - REVEAL_EDGE_SOFTNESS));
			const size = REVEAL_RADIUS * (0.04 + Math.random() * 0.09) * 1.6;
			const rot = Math.random() * Math.PI;
			const alpha = 0.04 + Math.random() * 0.18;
			const sel = Math.random();
			const pts: [number, number][] = [];
			if (sel < 0.3) {
				for (let j = 0; j < 4; j++) {
					const a = (j / 4) * Math.PI * 2 + Math.PI / 4 + (Math.random() - 0.5) * 0.7;
					const d = size * (0.4 + Math.random() * 0.6);
					pts.push([Math.cos(a) * d, Math.sin(a) * d]);
				}
			} else if (sel < 0.55) {
				for (let j = 0; j < 3; j++) {
					const a = (j / 3) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
					const d = size * (0.45 + Math.random() * 0.55);
					pts.push([Math.cos(a) * d, Math.sin(a) * d]);
				}
			} else {
				const hw = size * (0.05 + Math.random() * 0.1);
				const hl = size * (0.55 + Math.random() * 0.65);
				const sk = (Math.random() - 0.5) * hw * 1.5;
				pts.push([-hw + sk, -hl], [hw + sk, -hl], [hw - sk, hl], [-hw - sk, hl]);
			}
			shards.push({ angle, dist, rot, alpha, pts });
		}
		revealPoints.push({ x, y, timestamp: performance.now(), shards });
		startAnimLoop();
	}

	function startAnimLoop() {
		if (animRafId !== null) return;
		animRafId = requestAnimationFrame(revealFrame);
	}

	function revealFrame(timestamp: number) {
		revealPoints = revealPoints.filter((p) => timestamp - p.timestamp < REVEAL_LIFETIME);
		if (cursorInside && lastMoveTime && timestamp - lastMoveTime > STATIONARY_DEFROST_DELAY) {
			stationaryAccum = Math.min(
				MAX_STATIONARY_STRENGTH,
				stationaryAccum + STATIONARY_DEFROST_RATE
			);
		} else if (!cursorInside) {
			stationaryAccum = Math.max(0, stationaryAccum - STATIONARY_DEFROST_RATE * 3);
		}
		renderCurrentState(timestamp);
		if (revealPoints.length === 0 && stationaryAccum <= 0 && !cursorInside) {
			animRafId = null;
			return;
		}
		animRafId = requestAnimationFrame(revealFrame);
	}

	function renderCurrentState(timestamp = performance.now()) {
		if (!ctx || !frostedCanvas || !revealCanvas) return;
		const w = cssW;
		const h = cssH;
		ctx.globalCompositeOperation = 'source-over';
		ctx.globalAlpha = 1;
		ctx.clearRect(0, 0, w, h);
		ctx.drawImage(frostedCanvas, 0, 0, w, h);
		const hasReveal = revealPoints.length > 0 || stationaryAccum > 0;
		if (!hasReveal) return;

		revealCtx!.globalCompositeOperation = 'source-over';
		revealCtx!.globalAlpha = 1;
		revealCtx!.clearRect(0, 0, w, h);
		const mainCtx = ctx;
		ctx = revealCtx!;
		for (const p of revealPoints) {
			const age = timestamp - p.timestamp;
			drawRevealShape(p.x, p.y, Math.max(0, 1 - age / REVEAL_LIFETIME), p.shards);
		}
		if (stationaryAccum > 0 && cursorX !== undefined) {
			drawRevealShape(cursorX, cursorY!, stationaryAccum, []);
		}
		ctx = mainCtx;

		ctx.globalCompositeOperation = 'destination-out';
		ctx.globalAlpha = MAX_REVEAL_STRENGTH;
		ctx.drawImage(revealCanvas, 0, 0, w, h);
		ctx.globalCompositeOperation = 'source-over';
		ctx.globalAlpha = 1;
		for (const p of revealPoints) {
			const age = timestamp - p.timestamp;
			drawRevealEdgeTexture(p.x, p.y, Math.max(0, 1 - age / REVEAL_LIFETIME));
		}
		ctx.globalCompositeOperation = 'source-over';
		ctx.globalAlpha = 1;
	}

	function drawRevealShape(cx: number, cy: number, fadeStrength: number, shards: Shard[]) {
		const r = REVEAL_RADIUS;
		ctx!.save();
		const g = ctx!.createRadialGradient(cx, cy, 0, cx, cy, r * 1.1);
		g.addColorStop(0, 'rgba(0,0,0,1)');
		g.addColorStop(0.4, 'rgba(0,0,0,0.88)');
		g.addColorStop(0.68, 'rgba(0,0,0,0.44)');
		g.addColorStop(0.85, 'rgba(0,0,0,0.12)');
		g.addColorStop(1, 'rgba(0,0,0,0)');
		ctx!.globalAlpha = fadeStrength;
		ctx!.fillStyle = g;
		ctx!.beginPath();
		ctx!.arc(cx, cy, r * 1.1, 0, Math.PI * 2);
		ctx!.fill();
		const SIDES = 12;
		ctx!.beginPath();
		for (let i = 0; i < SIDES; i++) {
			const angle = (i / SIDES) * Math.PI * 2;
			const jitter = Math.sin(cx * 0.37 + cy * 0.19 + angle * 2.7) * 0.2;
			const dist = r * (0.82 + jitter + 0.18);
			const px = cx + Math.cos(angle) * dist;
			const py = cy + Math.sin(angle) * dist;
			i === 0 ? ctx!.moveTo(px, py) : ctx!.lineTo(px, py);
		}
		ctx!.closePath();
		ctx!.fillStyle = 'rgba(0,0,0,1)';
		ctx!.globalAlpha = fadeStrength * 0.38;
		ctx!.fill();
		ctx!.fillStyle = 'rgba(0,0,0,1)';
		for (const s of shards) {
			const ex = cx + Math.cos(s.angle) * s.dist;
			const ey = cy + Math.sin(s.angle) * s.dist;
			ctx!.save();
			ctx!.translate(ex, ey);
			ctx!.rotate(s.rot);
			ctx!.globalAlpha = s.alpha * fadeStrength;
			ctx!.beginPath();
			s.pts.forEach(([px, py], idx) => {
				idx === 0 ? ctx!.moveTo(px, py) : ctx!.lineTo(px, py);
			});
			ctx!.closePath();
			ctx!.fill();
			ctx!.restore();
		}
		ctx!.restore();
	}

	function drawRevealEdgeTexture(cx: number, cy: number, fadeStrength: number) {
		if (Math.random() > REVEAL_SNOWFLAKE_CHANCE * fadeStrength * 4) return;
		const angle = Math.random() * Math.PI * 2;
		const dist = REVEAL_RADIUS * (0.75 + Math.random() * 0.55);
		drawSnowflake(
			cx + Math.cos(angle) * dist,
			cy + Math.sin(angle) * dist,
			2 + Math.random() * 8,
			Math.random() * Math.PI,
			0.22 * fadeStrength
		);
	}
</script>

<!--
  Struttura identica al prototipo:
    1. .sharp  — foto nitida B/N, sempre visibile sotto
    2. canvas  — frost dipinto sopra; destination-out rivela la foto
-->
<div
	class="frost-wrap"
	class:ready
	class:no-melt={!meltEnabled}
	bind:this={wrapper}
	aria-hidden="true"
>
	<img class="sharp" {src} alt="" draggable="false" style:object-position={objectPosition} />
	<canvas
		bind:this={canvas}
		onpointermove={onPointerMove}
		onpointerleave={onPointerLeave}
		oncontextmenu={(e) => e.preventDefault()}
	></canvas>
</div>

<style>
	.frost-wrap {
		position: absolute;
		inset: 0;
		overflow: hidden;
		opacity: 0;
		transition: opacity 200ms ease;
	}
	.frost-wrap.ready {
		opacity: 1;
	}

	.sharp {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		pointer-events: none;
		user-select: none;
		filter: grayscale(1);
		display: block;
	}

	canvas {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		cursor: crosshair;
		touch-action: none;
		filter: saturate(0);
	}

	.frost-wrap.no-melt canvas {
		pointer-events: none;
		cursor: default;
	}

	@media (max-width: 768px) {
		.frost-wrap.no-melt canvas {
			touch-action: auto;
		}
	}
</style>
