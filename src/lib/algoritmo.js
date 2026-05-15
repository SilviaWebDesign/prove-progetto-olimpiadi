/**
 * Restituisce lo stato dell'oggetto di sezione in base ai like totali.
 * @param {number} pos - numero di like su opinioni positive
 * @param {number} neg - numero di like su opinioni negative
 * @returns {'NEUTRO'|'TUTTO_POSITIVO'|'TUTTO_NEGATIVO'|'MAGG_POSITIVO'|'MAGG_NEGATIVO'}
 */
export function getStato(pos, neg) {
	if (pos + neg === 0) return 'NEUTRO';
	if (neg === 0) return 'TUTTO_POSITIVO';
	if (pos === 0) return 'TUTTO_NEGATIVO';
	if (pos === neg) return 'NEUTRO';
	return pos > neg ? 'MAGG_POSITIVO' : 'MAGG_NEGATIVO';
}

/**
 * Restituisce uno score normalizzato da -1 a +1.
 * 0 se nessun like, (pos-neg)/(pos+neg) altrimenti.
 * @param {number} pos
 * @param {number} neg
 * @returns {number}
 */
export function getScore(pos, neg) {
	if (pos + neg === 0) return 0;
	return (pos - neg) / (pos + neg);
}
