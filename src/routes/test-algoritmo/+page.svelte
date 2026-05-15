<script lang="ts">
	import { getStato, getScore } from '$lib/algoritmo.js';
	import { sezione } from '$lib/opinioni.js';
	import Opinione from '$lib/components/Opinione.svelte';
	import OggettoSezione from '$lib/components/OggettoSezione.svelte';

	// Mappa id → opinione per lookup O(1) nei $derived
	const opinioniMap = new Map(
		sezione.argomenti.flatMap((a) => a.opinioni).map((o) => [o.id, o])
	);

	// Set reattivo degli id-opinione che l'utente ha likato
	let likedIds = $state(new Set<string>());

	// Conteggio derivato: quanti liked sono di tipo positiva/negativa
	let pos = $derived([...likedIds].filter((id) => opinioniMap.get(id)?.tipo === 'positiva').length);
	let neg = $derived([...likedIds].filter((id) => opinioniMap.get(id)?.tipo === 'negativa').length);

	// Stato e score derivati dall'algoritmo
	let stato = $derived(getStato(pos, neg));
	let score = $derived(getScore(pos, neg));

	function toggleLike(id: string) {
		// Creo sempre un nuovo Set così la riassegnazione a likedIds triggera la reattività
		const next = new Set(likedIds);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		likedIds = next;
	}
</script>

<div class="pagina">
	<h1>Test algoritmo — {sezione.titolo}</h1>

	<!-- Oggetto sezione: si aggiorna in tempo reale al cambio di stato -->
	<section class="sezione-oggetto">
		<OggettoSezione {stato} />
	</section>

	<!-- Pannello di debug -->
	<aside class="debug">
		<strong>Debug</strong>
		<table>
		<tbody>
			<tr><td>pos</td><td>{pos}</td></tr>
			<tr><td>neg</td><td>{neg}</td></tr>
			<tr><td>score</td><td>{score.toFixed(3)}</td></tr>
			<tr><td>stato</td><td>{stato}</td></tr>
		</tbody>
		</table>
	</aside>

	<!-- Argomenti con opinioni -->
	<div class="argomenti">
		{#each sezione.argomenti as argomento (argomento.id)}
			<section class="argomento">
				<h2>{argomento.titolo}</h2>

				<div class="colonne">
					<div class="colonna">
						<h3>Positive</h3>
						{#each argomento.opinioni.filter((o) => o.tipo === 'positiva') as op (op.id)}
							<Opinione
								testo={op.testo}
								tipo={op.tipo}
								likata={likedIds.has(op.id)}
								ontoggle={() => toggleLike(op.id)}
							/>
						{/each}
					</div>

					<div class="colonna">
						<h3>Negative</h3>
						{#each argomento.opinioni.filter((o) => o.tipo === 'negativa') as op (op.id)}
							<Opinione
								testo={op.testo}
								tipo={op.tipo}
								likata={likedIds.has(op.id)}
								ontoggle={() => toggleLike(op.id)}
							/>
						{/each}
					</div>
				</div>
			</section>
		{/each}
	</div>
</div>

<style>
	.pagina {
		max-width: 900px;
		margin: 0 auto;
		padding: 24px 16px;
		font-family: system-ui, sans-serif;
	}

	h1 {
		font-size: 1.4rem;
		margin-bottom: 20px;
		color: #222;
	}

	/* Oggetto sezione */
	.sezione-oggetto {
		display: flex;
		justify-content: center;
		margin-bottom: 20px;
	}

	/* Pannello debug */
	.debug {
		background: #1e1e1e;
		color: #d4d4d4;
		font-family: monospace;
		font-size: 0.85rem;
		padding: 12px 16px;
		border-radius: 6px;
		margin-bottom: 28px;
		display: inline-block;
	}

	.debug strong {
		color: #9cdcfe;
		display: block;
		margin-bottom: 8px;
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
	}

	.debug table {
		border-collapse: collapse;
	}

	.debug td {
		padding: 2px 12px 2px 0;
	}

	.debug td:first-child {
		color: #9cdcfe;
		min-width: 48px;
	}

	.debug td strong {
		color: #ce9178;
		display: inline;
		font-size: inherit;
		text-transform: none;
		letter-spacing: 0;
	}

	/* Argomenti */
	.argomenti {
		display: flex;
		flex-direction: column;
		gap: 28px;
	}

	.argomento {
		border: 1px solid #e0e0e0;
		border-radius: 8px;
		padding: 16px 20px;
	}

	.argomento h2 {
		font-size: 1rem;
		margin: 0 0 14px;
		color: #444;
	}

	.colonne {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 16px;
	}

	.colonna h3 {
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: #999;
		margin: 0 0 8px;
	}

	.colonna {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
</style>
