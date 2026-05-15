<script lang="ts">
	import { T, useTask } from '@threlte/core';
	import * as THREE from 'three';
	import { untrack } from 'svelte';

	type Stato = 'NEUTRO' | 'TUTTO_POSITIVO' | 'MAGG_POSITIVO' | 'MAGG_NEGATIVO' | 'TUTTO_NEGATIVO';
	type PresetEntry = {
		sfereScala: number[];
		sfereColore: string;
		fioriScala: number;
		troncoColore: string;
		nevePresente: number;
	};

	let { stato }: { stato: Stato } = $props();

	// ── Geometria costante ──────────────────────────────────────────
	const SFERE_CHIOMA: { pos: [number, number, number]; r: number; ordine: number }[] = [
		{ pos: [  0.0,  2.0,  0.0 ], r: 0.55, ordine: 0 },
		{ pos: [  0.5,  1.85, 0.3 ], r: 0.45, ordine: 6 },
		{ pos: [ -0.45, 1.9,  0.2 ], r: 0.5,  ordine: 4 },
		{ pos: [  0.2,  2.2, -0.4 ], r: 0.4,  ordine: 2 },
		{ pos: [ -0.3,  2.15,-0.35], r: 0.38, ordine: 5 },
		{ pos: [  0.55, 2.1, -0.15], r: 0.35, ordine: 7 },
		{ pos: [ -0.55, 2.0, -0.1 ], r: 0.28, ordine: 3 },
		{ pos: [  0.0,  2.4,  0.1 ], r: 0.3,  ordine: 1 }
	];

	const FIORI: { pos: [number, number, number]; r: number }[] = [
		{ pos: [  0.15, 2.55, 0.0  ], r: 0.12 },
		{ pos: [ -0.18, 2.4,  0.15 ], r: 0.1  }
	];

	const RAMI: { pos: [number, number, number]; rot: [number, number, number]; rT: number; rB: number; h: number }[] = [
		{ pos: [  0.32, 1.85,  0.25 ], rot: [  0.38, 0, -0.52 ], rT: 0.06, rB: 0.09, h: 0.70 },
		{ pos: [ -0.28, 1.85,  0.32 ], rot: [  0.42, 0,  0.48 ], rT: 0.06, rB: 0.09, h: 0.65 },
		{ pos: [  0.22, 1.82, -0.35 ], rot: [ -0.40, 0, -0.38 ], rT: 0.06, rB: 0.08, h: 0.72 }
	];

	const NEVE_RAMI: { pos: [number, number, number] }[] = [
		{ pos: [  0.46, 2.12,  0.39 ] },
		{ pos: [ -0.43, 2.12,  0.46 ] },
		{ pos: [  0.36, 2.10, -0.50 ] }
	];

	const CESPUGLIO: { pos: [number, number, number]; r: number }[] = [
		{ pos: [  0.0,  0.25,  0.0  ], r: 0.25 },
		{ pos: [  0.2,  0.2,   0.15 ], r: 0.2  },
		{ pos: [ -0.18, 0.22,  0.1  ], r: 0.22 }
	];

	// ── Preset ──────────────────────────────────────────────────────
	const PRESET: Record<Stato, PresetEntry> = {
		TUTTO_POSITIVO: { sfereScala: [1, 1, 1, 1, 1, 1, 1, 1],         sfereColore: '#ffb7c5', fioriScala: 1, troncoColore: '#6b4423', nevePresente: 0 },
		MAGG_POSITIVO:  { sfereScala: [1, 1, 1, 1, 1, 1, 1, 1],         sfereColore: '#4caf50', fioriScala: 0, troncoColore: '#6b4423', nevePresente: 0 },
		NEUTRO:         { sfereScala: [1, 0.6, 1, 1, 0.6, 1, 1, 1],     sfereColore: '#7ba03d', fioriScala: 0, troncoColore: '#6b4423', nevePresente: 0 },
		MAGG_NEGATIVO:  { sfereScala: [0, 0, 0, 0.7, 0, 0.5, 0.7, 0.5], sfereColore: '#c2820e', fioriScala: 0, troncoColore: '#6b4423', nevePresente: 0 },
		TUTTO_NEGATIVO: { sfereScala: [0, 0, 0, 0, 0, 0, 0, 0],         sfereColore: '#8b6914', fioriScala: 0, troncoColore: '#5a5a5a', nevePresente: 1 }
	};

	// ── Easing ──────────────────────────────────────────────────────
	const easeInOut = (t: number) =>
		t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

	const easeElasticOut = (t: number): number => {
		if (t <= 0) return 0;
		if (t >= 1) return 1;
		return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
	};

	const DURATA = 1500;
	const STAGGER = 80;
	const DURATA_ATTIVA = DURATA - 7 * STAGGER; // 940ms

	// ── Valori correnti animati ──────────────────────────────────────
	const pN = PRESET.NEUTRO;

	let sfereScalaCorrente: number[] = $state([...pN.sfereScala]);
	let fioriScalaCorrente: number = $state(pN.fioriScala);
	let neveScalaCorrente: number = $state(pN.nevePresente);
	let cespuglioScala: number = $state(1);

	// Colori mutati in-place, applicati via ref ai materiali
	const sfereColore = new THREE.Color(pN.sfereColore);
	const troncoColore = new THREE.Color(pN.troncoColore);

	// ── Riferimenti materiali (popolati da oncreate) ─────────────────
	const matSfere: (THREE.MeshStandardMaterial | null)[] = Array(8).fill(null);
	const matLegno: THREE.MeshStandardMaterial[] = [];
	const matCespuglio: THREE.MeshStandardMaterial[] = [];

	// ── Animazione ──────────────────────────────────────────────────
	let fromSfereScala: number[] = [...pN.sfereScala];
	let toSfereScala: number[] = [...pN.sfereScala];
	const fromSfereColore = new THREE.Color(pN.sfereColore);
	const toSfereColore = new THREE.Color(pN.sfereColore);
	let fromFioriScala = pN.fioriScala;
	let toFioriScala = pN.fioriScala;
	const fromTroncoColore = new THREE.Color(pN.troncoColore);
	const toTroncoColore = new THREE.Color(pN.troncoColore);
	let fromNeveScala = pN.nevePresente;
	let toNeveScala = pN.nevePresente;
	let fromCespuglioScala = 1;
	let toCespuglioScala = 1;

	let animInizio = 0;
	let animRunning: boolean = $state(false);

	useTask(
		() => {
			const ora = performance.now();
			const tL = Math.min((ora - animInizio) / DURATA, 1);
			const tCol = easeInOut(tL);

			// Colori
			sfereColore.copy(fromSfereColore).lerp(toSfereColore, tCol);
			troncoColore.copy(fromTroncoColore).lerp(toTroncoColore, tCol);
			for (const mat of matSfere) if (mat) mat.color.copy(sfereColore);
			for (const mat of matLegno) mat.color.copy(troncoColore);

			// Scale sfere con stagger per ordine
			for (let i = 0; i < 8; i++) {
				const tLoc = Math.max(
					0,
					Math.min(1, (tL * DURATA - SFERE_CHIOMA[i].ordine * STAGGER) / DURATA_ATTIVA)
				);
				const eased =
					toSfereScala[i] >= fromSfereScala[i] ? easeElasticOut(tLoc) : easeInOut(tLoc);
				sfereScalaCorrente[i] = fromSfereScala[i] + (toSfereScala[i] - fromSfereScala[i]) * eased;
			}

			// Fiori
			const fioriEased = toFioriScala >= fromFioriScala ? easeElasticOut(tL) : easeInOut(tL);
			fioriScalaCorrente = fromFioriScala + (toFioriScala - fromFioriScala) * fioriEased;

			// Neve
			const neveEased = toNeveScala >= fromNeveScala ? easeElasticOut(tL) : easeInOut(tL);
			neveScalaCorrente = fromNeveScala + (toNeveScala - fromNeveScala) * neveEased;

			// Cespuglio: scala + stesso colore delle sfere
			const cespuglioEased =
				toCespuglioScala >= fromCespuglioScala ? easeElasticOut(tL) : easeInOut(tL);
			cespuglioScala = fromCespuglioScala + (toCespuglioScala - fromCespuglioScala) * cespuglioEased;
			for (const mat of matCespuglio) mat.color.copy(sfereColore);

			if (tL >= 1) animRunning = false;
		},
		{ running: () => animRunning }
	);

	function avviaAnimazione(s: Stato) {
		fromSfereScala = [...sfereScalaCorrente];
		fromSfereColore.copy(sfereColore);
		fromFioriScala = fioriScalaCorrente;
		fromTroncoColore.copy(troncoColore);
		fromNeveScala = neveScalaCorrente;
		fromCespuglioScala = cespuglioScala;

		const p = PRESET[s];
		toSfereScala = [...p.sfereScala];
		toSfereColore.set(p.sfereColore);
		toFioriScala = p.fioriScala;
		toTroncoColore.set(p.troncoColore);
		toNeveScala = p.nevePresente;
		toCespuglioScala = p.nevePresente > 0 ? 0 : 1;

		animInizio = performance.now();
		animRunning = true;
	}

	$effect(() => {
		const s = stato;
		untrack(() => avviaAnimazione(s));
	});
</script>

<T.Group>
	<!-- Tronco -->
	<T.Mesh position={[0, 0.75, 0]} castShadow={true}>
		<T.CylinderGeometry args={[0.15, 0.25, 1.5, 8]} />
		<T.MeshStandardMaterial
			roughness={0.9}
			metalness={0}
			oncreate={(mat) => {
				matLegno.push(mat);
				mat.color.copy(troncoColore);
			}}
		/>
	</T.Mesh>

	<!-- Rami principali -->
	{#each RAMI as ramo}
		<T.Mesh position={ramo.pos} rotation={ramo.rot} castShadow={true}>
			<T.CylinderGeometry args={[ramo.rT, ramo.rB, ramo.h, 6]} />
			<T.MeshStandardMaterial
				roughness={0.9}
				metalness={0}
				oncreate={(mat) => {
					matLegno.push(mat);
					mat.color.copy(troncoColore);
				}}
			/>
		</T.Mesh>
	{/each}

	<!-- Chioma: 8 sfere con scala e colore indipendenti -->
	{#each SFERE_CHIOMA as sfera, i}
		{@const sc = sfereScalaCorrente[i]}
		<T.Mesh position={sfera.pos} scale={[sc, sc, sc]} castShadow={true} receiveShadow={true}>
			<T.SphereGeometry args={[sfera.r, 8, 8]} />
			<T.MeshStandardMaterial
				roughness={0.75}
				metalness={0}
				oncreate={(mat) => {
					matSfere[i] = mat;
					mat.color.copy(sfereColore);
				}}
			/>
		</T.Mesh>
	{/each}

	<!-- Fiori (solo in TUTTO_POSITIVO) -->
	{#each FIORI as fiore}
		{@const sf = fioriScalaCorrente}
		<T.Mesh position={fiore.pos} scale={[sf, sf, sf]} castShadow={true}>
			<T.SphereGeometry args={[fiore.r, 6, 6]} />
			<T.MeshStandardMaterial color="#fff5e6" roughness={0.5} metalness={0} />
		</T.Mesh>
	{/each}

	<!-- Neve sul tronco (solo in TUTTO_NEGATIVO) -->
	{@const sn = neveScalaCorrente}
	<T.Mesh position={[0, 1.55, 0]} scale={[sn, sn, sn]} castShadow={true}>
		<T.CylinderGeometry args={[0.3, 0.3, 0.05, 16]} />
		<T.MeshStandardMaterial color="white" roughness={0.4} metalness={0} />
	</T.Mesh>

	<!-- Neve sui rami -->
	{#each NEVE_RAMI as nr}
		{@const sn2 = neveScalaCorrente}
		<T.Mesh position={nr.pos} scale={[sn2, sn2, sn2]} castShadow={true}>
			<T.CylinderGeometry args={[0.12, 0.12, 0.04, 12]} />
			<T.MeshStandardMaterial color="white" roughness={0.4} metalness={0} />
		</T.Mesh>
	{/each}

	<!-- Cespuglio: segue il colore delle foglie, sparisce in TUTTO_NEGATIVO -->
	<T.Group position={[-2, 0, -1.2]}>
		{#each CESPUGLIO as cespu}
			{@const cs = cespuglioScala}
			<T.Mesh position={cespu.pos} scale={[cs, cs, cs]} castShadow={true} receiveShadow={true}>
				<T.SphereGeometry args={[cespu.r, 16, 16]} />
				<T.MeshStandardMaterial
					roughness={0.75}
					metalness={0}
					oncreate={(mat) => {
						matCespuglio.push(mat);
						mat.color.copy(sfereColore);
					}}
				/>
			</T.Mesh>
		{/each}
	</T.Group>
</T.Group>
