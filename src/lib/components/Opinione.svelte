<script lang="ts">
	// Lo stato "likata" non vive qui: viene ricevuto via props e l'evento emesso al parent.
	let {
		testo,
		tipo,
		likata = false,
		ontoggle
	}: {
		testo: string;
		tipo: 'positiva' | 'negativa';
		likata?: boolean;
		ontoggle: () => void;
	} = $props();
</script>

<div class="opinione" class:positiva={tipo === 'positiva'} class:negativa={tipo === 'negativa'}>
	<p class="testo">{testo}</p>
	<button
		class="like-btn"
		class:attivo={likata}
		onclick={ontoggle}
		aria-label={likata ? 'Rimuovi like' : 'Metti like'}
		aria-pressed={likata}
	>
		♥
	</button>
</div>

<style>
	.opinione {
		display: flex;
		align-items: flex-start;
		gap: 10px;
		padding: 10px 12px;
		border-left: 4px solid transparent;
		background: #f9f9f9;
		border-radius: 4px;
	}

	.opinione.positiva {
		border-left-color: #4caf50;
	}

	.opinione.negativa {
		border-left-color: #f44336;
	}

	.testo {
		flex: 1;
		margin: 0;
		font-size: 0.9rem;
		line-height: 1.4;
		color: #333;
	}

	.like-btn {
		flex-shrink: 0;
		background: none;
		border: none;
		font-size: 1.3rem;
		cursor: pointer;
		color: #ccc;
		padding: 0 4px;
		line-height: 1;
		transition: color 0.15s, transform 0.1s;
	}

	.like-btn:hover {
		color: #e57373;
		transform: scale(1.15);
	}

	.like-btn.attivo {
		color: #e53935;
	}
</style>
