import eventManager from './EventManager.js';
import { database, ref, child, push, onChildAdded, onValue, off, update, set } from './FirebaseConfig.js';

export default class OnlineManager {
    constructor(board, roomManager) {
        this.board = board;
        this.roomManager = roomManager;
        this.movesRef = null;
        this.winnerRef = null;
        this.currentPlayerRef = null
    }

    stop() {
        if (this.movesRef) off(this.movesRef);
        if (this.winnerRef) off(this.winnerRef);
        if (this.currentPlayerRef) off(this.currentPlayerRef);
    }

    start() {
        this.stop();

        this.movesRef = ref(database, `rooms/${this.roomManager.roomCode}/matches/${this.roomManager.matchCode}/moves`);
        onChildAdded(this.movesRef, (snapshot) => {
            const move = snapshot.val();
            if (!move) return;

            if (move.player !== this.roomManager.localColor) {
                this.board.makeMove(move.row, move.col);
            }
        });

        this.winnerRef = ref(database, `rooms/${this.roomManager.roomCode}/matches/${this.roomManager.matchCode}/winner`);
        onValue(this.winnerRef, (snapshot) => {
            const winner = snapshot.val();
            if (!winner) return;
            this.roomManager.setScore(snapshot.val().winner);
        });

        this.currentPlayerRef = ref(database, `rooms/${this.roomManager.roomCode}/matches/${this.roomManager.matchCode}/currentPlayer`);
        onValue(this.currentPlayerRef, (snapshot) => {
            if (snapshot.exists()) this.board.setCurrentPlayer(snapshot.val());
        });
    }

    async submitLocalMove(row, col) {

        if (this.board.getCurrentPlayer() !== this.roomManager.localColor) return;

        const nextPlayer = this.roomManager.localColor === 'red' ? 'blue' : 'red';
        const matchRef = ref(database, `rooms/${this.roomManager.roomCode}/matches/${this.roomManager.matchCode}`);

        const moved = await this.board.makeMove(row, col);
        if (!moved) return;

        await push(child(matchRef, 'moves'), {
            row,
            col,
            player: this.roomManager.localColor,
            timestamp: Date.now()
        });

        await update(matchRef, {
            currentPlayer: nextPlayer
        });
    }
}