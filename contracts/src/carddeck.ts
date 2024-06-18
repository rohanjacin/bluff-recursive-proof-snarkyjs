import { Field, SelfProof, ZkProgram, verify, Struct, Proof } from 'o1js';

// Card deck structure containing 
// qty - current deck size
// suite - suite of the toppmost card
class DeckState extends Struct({
	qty: Field,
	suite: Field,
	rank: Field,
}) {
	// Initial state
	static initState() {
		return new DeckState({
			qty: Field(0),
			suite: Field(0),
			rank: Field(0),
		});
	}

	// Add a card on top
	static add(state: DeckState, _qty: Field,
			_suite: Field, _rank: Field) {
		return new DeckState({
			qty: state.qty.add(Field(_qty)),
			suite: _suite,
			rank: _rank,		
		});
	}

	// Assert initial state
	static assertInitialState(state: DeckState) {
		state.qty.assertEquals(Field(0));
		state.suite.assertEquals(Field(0));
		state.rank.assertEquals(Field(0));
	}

	// Assert equality of state
	static assertEquals(state1: DeckState, state2: DeckState) {
		state1.qty.assertEquals(state2.qty);
		state1.suite.assertEquals(state2.suite);
		state1.rank.assertEquals(state2.rank);
	}
};

// Card deck zk circuit/program
let CardDeck = ZkProgram({

	// Name and state of deck 
	name: "Card-Deck",
	publicInput: DeckState,

	methods: {
		// Create base 
		create: {
			privateInputs: [],

			async method(state: DeckState) {

				DeckState.assertInitialState(state);
			},
		},

		// Add card to deck specifying suite and rank 
		add: {
			privateInputs: [SelfProof<DeckState, void>,
							Field, Field, Field],

			async method(newState: DeckState, 
				earlierProof: SelfProof<DeckState, void>,
				qty: Field, suite: Field, rank: Field) {

				// Verify previous card proof 
				earlierProof.verify();
				// Check card inputs against claimed state 
				const computedState = DeckState.add(
								earlierProof.publicInput,
								qty, suite, rank);
				DeckState.assertEquals(computedState, newState);
			},
		},
	},
});

// Compile the circuit/program
console.log("compiling...");
const { verificationKey } = await CardDeck.compile();
console.log("compiling finised");

// Create initial state and base proof 
console.log("proving initial state...");
let state0 = DeckState.initState();
let card_proof0 = await CardDeck.create(state0);
console.log("proving initial state done");

let qty = 1, suite, rank;
let qtyFp = Field(1), suiteFp, rankFp;
let state, proof;

// Add cards and their proofs iteratively
for (let i = 1, suite = 1,  state = state0,
	proof = card_proof0; suite <= 4; suite++) {

	for (rank = 1; rank <= 13; rank++, i++) {
		console.log(`working on card${i}`);
		rankFp = Field(rank);
		suiteFp = Field(suite);
		state = await DeckState.add(state, qtyFp, suiteFp, rankFp);
		proof = await CardDeck.add(state, proof, qtyFp, suiteFp, rankFp);
		state = state;
		proof = proof;
		console.log(`qty:${proof.publicInput.qty.toString()}` +
			` suite:${proof.publicInput.suite.toString()}` + 
			`rank:${proof.publicInput.rank.toString()}`);		
	}
}
