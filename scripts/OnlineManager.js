import { database, ref, push, onChildAdded } from './FirebaseConfig.js';

export default class OnlineManager {
    constructor(board, roomManager) {
        this.board = board;
        this.roomManager = roomManager;
    }

    start() {
        const movesRef = ref(database, `rooms/${this.roomManager.roomCode}/moves`)

        onChildAdded(movesRef, (snapshot) => {
            const move = snapshot.val()

            if (!move) return;

            if (move.player !== this.roomManager.localColor) {
                this.board.makeMove(move.row, move.col);
            }
        });
    }

    submitLocalMove(row, col) {
        const movesRef = ref(database, `rooms/${this.roomManager.roomCode}/moves`);
        push(movesRef, {
            row,
            col,
            player: this.roomManager.localColor,
            timestamp: Date.now()
        });
    }
}