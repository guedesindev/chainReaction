import { database, get, ref, set, update, onValue, onDisconnect, runTransaction } from "./FirebaseConfig.js";

const ROOM_CODE_LENGTH = 6;

const ROOM_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVXWXYZ23456789';

export default class RoomManager {
    constructor(playerManager) {
        this.playerManager = playerManager;
        this.roomCode = null;
        this.localColor = null;
        this.matchID = 0;
        this.matchCode = '';
        this.lastScoredMatch = '';
        this.score = { 'hostUid': 0, 'guestUid': 0 };
    }

    generateRoomCode() {
        let code = '';
        for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
            code += ROOM_CODE_ALPHABET[Math.floor(Math.random() * ROOM_CODE_ALPHABET.length)];
        }
        this.roomCode = code;
        return code;
    }

    generateMatchCode() {
        this.matchID++
        const cod = String(this.matchID).padStart(3, '0');
        return `match${cod}`;
    }

    async createRoom() {
        const profile = this.requireProfile();

        let code;
        let attempts = 0;
        const maxAttempts = 5;
        this.localColor = 'red';

        do {
            code = this.generateRoomCode();
            const exists = (await get(ref(database, `rooms/${code}`))).exists();
            if (!exists) break;
            attempts++;
        } while (attempts < maxAttempts);

        if (attempts >= maxAttempts) {
            throw new Error('Não foi possível gerar um código de sala único. Tente novamente.');
        }

        const matchId = this.generateMatchCode();
        this.matchCode = matchId;

        const roomData = {
            status: 'waiting',
            createdAt: Date.now(),
            players: {
                host: {
                    uid: this.playerManager.uid,
                    displayName: profile.displayName,
                    ratingSnapshot: profile.rating,
                    connected: true,
                }
            },
            matches: {
                [matchId]: {
                    createdAt: Date.now(),
                    currentPlayer: 'red',
                }
            },
            ratingApplied: false,
            score: { [this.playerManager.uid]: 0 }
        };

        await set(ref(database, `rooms/${code}`), roomData);



        return code;
    }

    async getRoomData() {
        const snapshot = await get(ref(database, `rooms/${this.roomCode}`));
        if (snapshot.exists()) return snapshot.val();

        return null;
    }

    async getMatchData(roomCode) {
        const snapshot = await get(ref(database, `rooms/${roomCode}/matches/${this.matchCode}`))
        if (snapshot.exists()) return snapshot.val();
        return null;
    }

    async joinRoom(code) {
        const profile = this.requireProfile();

        const roomRef = ref(database, `rooms/${code}`);
        const snapshot = await get(roomRef);
        this.localColor = 'blue'

        if (!snapshot.exists()) {
            throw new Error('Sala não encontrada. Confira o código.');
        }

        const room = snapshot.val();

        if (room.status !== 'waiting') {
            throw new Error('Essa sala já está em andamento ou já terminou.');
        }

        if (room.players && room.players.blue) {
            throw new Error('Essa sala já está cheia.');
        }

        await update(roomRef, {
            'players/guest': {
                uid: this.playerManager.uid,
                displayName: profile.displayName,
                ratingSnapshot: profile.rating,
                connected: true,
            },
            score: { [room.players.host.uid]: 0, [this.playerManager.uid]: 0 },
            status: 'playing',
        });

        this.roomCode = code;

        const matchesData = await this.getMatchData(code);
        if (matchesData) {
            const keys = Object.keys(matchesData);
            this.matchCode = keys[keys.length - 1]
        }

        return code;
    }

    async leaveRoom() {
        if (!this.roomCode || !this.localColor) return;

        const room = await this.getRoomData();
        if (room && room.players) {
            const role = room.players.host?.uid === this.playerManager.uid ? 'host' : 'guest';

            const presenceRef = ref(database, `rooms/${this.roomCode}/players/${role}/connected`);
            await set(presenceRef, false);

            await update(ref(database, `rooms/${this.roomCode}`), { status: 'cancelled' })
        }
        this.roomCode = null;
        this.localColor = null;
        this.matchCode = '';
    }

    onOpponentPresenceChange(callback) {
        if (!this.roomCode) return () => { };

        const roomRef = ref(database, `room/${this.roomCode}`);

        return onValue(roomRef, (snapshot) => {
            const room = snapshot.val();
            if (!room || !room.players) return;

            const isLocalHost = room.players.host?.uid === this.playerManager.uid;
            const opponent = isLocalHost ? room.players.guest : room.players.host;

            if (opponent && opponent.connected === false) {
                callback(opponent);
            }
        });
    }

    onRoomUpdate(callback) {
        if (!this.roomCode) return () => { };
        const roomRef = ref(database, `rooms/${this.roomCode}`);
        return onValue(roomRef, (snapshot) => {
            callback(snapshot.val());
        })
    }

    async setScore(winnerUid) {
        if (this.lastScoredMatch === this.matchCode) return;

        this.lastScoredMatch = this.matchCode;

        const scoreRef = ref(database, `rooms/${this.roomCode}/score/${winnerUid}`);
        const snapshot = await get(scoreRef);
        const currentScore = snapshot.exists() ? snapshot.val() : 0;

        // await set(scoreRef, currentScore + 1);
        await runTransaction(scoreRef, (current) => {
            (current || 0) + 1
        })

    }

    async getRoomScore() {
        const room = await this.getRoomData();
        if (!room || !room.players) return { host: 0, guest: 0 };

        const score = room.score || {};

        // para UI
        const hostUid = room.players.host?.uid;
        const guestUid = room.players.guest?.uid;

        return {
            host: hostUid ? (score[hostUid] || 0) : 0,
            guest: guestUid ? (score[guestUid] || 0) : 0
        };
    }

    requireProfile() {
        const profile = this.playerManager.profile;
        if (!profile) {
            throw new Error('Jogador ainda não tem perfil - chame playerManager.init(nome) antes de criar/entrar em uma sala.');
        }
        return profile;
    }

    trackPresence() {
        if (!this.roomCode) return;

        this.getRoomData().then((room) => {
            if (!room || !room.players) return;

            const role = room.players.host?.uid === this.playerManager.uid ? 'host' : 'guest';
            const presenceRef = ref(database, `rooms/${this.roomCode}/players/${role}/connected`);

            set(presenceRef, true);
            onDisconnect(presenceRef).set(false);
        });
    }

    async isOpponentConnected() {
        const room = await this.getRoomData();
        if (!room || !room.players || !room.players.host) return false;

        const isLocalHost = room.players.guest.uid === this.playerManager.uid
        const opponent = isLocalHost ? room.players.guest : room.players.host;

        return !!(opponent && opponent.connected);
    }

    async requestRematch() {
        await set(ref(database, `rooms/${this.roomCode}/rematch`), {
            status: 'pending',
            requestedBy: this.playerManager.uid
        });
    }

    switchLocalColor() {
        this.localColor = this.localColor === 'red' ? 'blue' : 'red';
    }

    async respondToRematch(accept) {
        if (!accept) {
            await update(ref(database, `rooms/${this.roomCode}/rematch`), { status: 'declined' });
            return;
        }
        const roomRef = ref(database, `rooms/${this.roomCode}`)
        const room = await this.getRoomData()


        let matchCode;
        let attempts = 0;
        let maxAttempts = 5;

        do {
            matchCode = this.generateMatchCode();
            let exists = (await get(ref(database, `rooms/${this.roomCode}/matches/${matchCode}`))).exists()
            if (!exists) break;
            attempts++;
        } while (attempts < maxAttempts);

        this.matchCode = matchCode;

        await update(roomRef, {
            players: room.players,
            [`matches/${matchCode}`]: {
                createdAt: Date.now(),
                currentPlayer: 'red',
            },
            ratingApplied: false,
            rematch: { status: 'accepted', requestedBy: null },
            status: 'playing'
        });
    }

    async clearRematchRequest() {
        await set(ref(database, `rooms/${this.roomCode}/rematch`), { status: null, requestedBy: null });
    }

    onRematchUpdate(callback) {
        if (!this.roomCode) return () => { };
        const rematchRef = ref(database, `rooms/${this.roomCode}/rematch`);
        return onValue(rematchRef, (snapshot) => callback(snapshot.val()));
    }

    async asyncCurrentMatch() {
        const room = await this.getRoomData();
        if (!room || !room.matches) return;

        const keys = Object.keys(room.matches);
        this.matchCode = keys[keys.length - 1];
    }
}