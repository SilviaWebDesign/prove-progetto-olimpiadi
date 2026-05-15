/**
 * Dati placeholder per una sezione con 3 argomenti × 6 opinioni ciascuno.
 * IDs univoci con schema: op-{argomento}-{indice}
 */
export const sezione = {
	id: 'sezione-1',
	titolo: 'Sezione di prova',
	argomenti: [
		{
			id: 'arg-1',
			titolo: 'Argomento 1: Partecipazione sportiva',
			opinioni: [
				{ id: 'op-1-1', testo: "Opinione positiva 1 sull'argomento 1: le olimpiadi aumentano la partecipazione sportiva giovanile.", tipo: 'positiva' },
				{ id: 'op-1-2', testo: "Opinione positiva 2 sull'argomento 1: gli atleti olympici ispirano milioni di persone.", tipo: 'positiva' },
				{ id: 'op-1-3', testo: "Opinione positiva 3 sull'argomento 1: lo sport olimpico promuove valori di fair play.", tipo: 'positiva' },
				{ id: 'op-1-4', testo: "Opinione negativa 1 sull'argomento 1: i costi di accesso escludono molti potenziali atleti.", tipo: 'negativa' },
				{ id: 'op-1-5', testo: "Opinione negativa 2 sull'argomento 1: la pressione agonistica danneggia i giovani sportivi.", tipo: 'negativa' },
				{ id: 'op-1-6', testo: "Opinione negativa 3 sull'argomento 1: solo i paesi ricchi dominano il medagliere.", tipo: 'negativa' }
			]
		},
		{
			id: 'arg-2',
			titolo: 'Argomento 2: Impatto economico',
			opinioni: [
				{ id: 'op-2-1', testo: "Opinione positiva 1 sull'argomento 2: le olimpiadi generano turismo e indotto economico.", tipo: 'positiva' },
				{ id: 'op-2-2', testo: "Opinione positiva 2 sull'argomento 2: le infrastrutture costruite restano alla città.", tipo: 'positiva' },
				{ id: 'op-2-3', testo: "Opinione positiva 3 sull'argomento 2: l'evento crea migliaia di posti di lavoro locali.", tipo: 'positiva' },
				{ id: 'op-2-4', testo: "Opinione negativa 1 sull'argomento 2: i costi di organizzazione superano spesso i benefici.", tipo: 'negativa' },
				{ id: 'op-2-5', testo: "Opinione negativa 2 sull'argomento 2: gli impianti diventano spesso cattedrali nel deserto.", tipo: 'negativa' },
				{ id: 'op-2-6', testo: "Opinione negativa 3 sull'argomento 2: il debito pubblico ricade sui cittadini per decenni.", tipo: 'negativa' }
			]
		},
		{
			id: 'arg-3',
			titolo: 'Argomento 3: Valori e cultura',
			opinioni: [
				{ id: 'op-3-1', testo: "Opinione positiva 1 sull'argomento 3: le olimpiadi uniscono nazioni diverse sotto un ideale comune.", tipo: 'positiva' },
				{ id: 'op-3-2', testo: "Opinione positiva 2 sull'argomento 3: la cerimonia olimpica è un atto culturale unico al mondo.", tipo: 'positiva' },
				{ id: 'op-3-3', testo: "Opinione positiva 3 sull'argomento 3: lo spirito olimpico promuove la pace internazionale.", tipo: 'positiva' },
				{ id: 'op-3-4', testo: "Opinione negativa 1 sull'argomento 3: le olimpiadi sono spesso usate come vetrina politica.", tipo: 'negativa' },
				{ id: 'op-3-5', testo: "Opinione negativa 2 sull'argomento 3: il doping mina i valori fondamentali dello sport.", tipo: 'negativa' },
				{ id: 'op-3-6', testo: "Opinione negativa 3 sull'argomento 3: la commercializzazione ha snaturato lo spirito originale.", tipo: 'negativa' }
			]
		}
	]
};
