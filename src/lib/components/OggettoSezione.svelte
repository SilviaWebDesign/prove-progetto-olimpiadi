<script lang="ts">
	type Stato = 'NEUTRO' | 'TUTTO_POSITIVO' | 'MAGG_POSITIVO' | 'MAGG_NEGATIVO' | 'TUTTO_NEGATIVO';

	let { stato }: { stato: Stato } = $props();

	const immagini: Record<Stato, string> = {
		NEUTRO: '/oggetti/neutro.png',
		TUTTO_POSITIVO: '/oggetti/tutto-positivo.png',
		MAGG_POSITIVO: '/oggetti/magg-positivo.png',
		MAGG_NEGATIVO: '/oggetti/magg-negativo.png',
		TUTTO_NEGATIVO: '/oggetti/tutto-negativo.png'
	};
</script>

<div class="oggetto-sezione">
	<img src={immagini[stato]} alt="Stato: {stato}" />
	<span class="label">{stato}</span>
</div>

<style>
	.oggetto-sezione {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
	}

	img {
		width: 300px;
		height: 200px;
		object-fit: cover;
		border-radius: 6px;
		border: 2px solid #ddd;
		display: block;
	}

	.label {
		font-size: 0.75rem;
		font-family: monospace;
		color: #888;
		letter-spacing: 0.05em;
	}
</style>
