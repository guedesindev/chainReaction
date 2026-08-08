import { database, get, ref, set, update, onValue, onDisconnect } from "./FirebaseConfig.js";

const ROOM_CODE_LENGTH = 6;

const ROOM_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVXWXYZ23456789';

export default class RoomManager {
    constructor(playerManager) {
        this.playerManager = playerManager;
        this.roomCode = null;
        this.localColor = null;
    }

    generateRoomCode() {
        let code = '';
        for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
            code += ROOM_CODE_ALPHABET[Math.floor(Math.random() * ROOM_CODE_ALPHABET.length)];
        }
        return code;
    }

    async createRoom() {
        const profile = this.requireProfile();

        let code;
        let attempts = 0;
        const maxAttempts = 5;

        do {
            code = this.generateRoomCode();
            const exists = (await get(ref(database, `rooms/${code}`))).exists();
            if (!exists) break;
            attempts++;
        } while (attempts < maxAttempts);

        if (attempts >= maxAttempts) {
            throw new Error('Não foi possível gerar um código de sala único. Tente novamente.');
        }

        const roomData = {
            status: 'waiting',
            createdAt: Date.now(),
            players: {
                red: {
                    uid: this.playerManager.uid,
                    displayName: profile.displayName,
                    ratingSnapshot: profile.rating,
                    connected: true
                }
            },
            winner: null,
            ratingApplied: false
        };

        await set(ref(database, `rooms/${code}`), roomData);

        this.roomCode = code;
        this.localColor = 'red';

        return code;
    }

    async getRoomData() {
        const snapshot = await get(ref(database, `rooms/${this.roomCode}`));
        if (snapshot.exists()) return snapshot.val();

        return null;
    }

    async joinRoom(code) {
        const profile = this.requireProfile();
        const normalizedCode = code.trim().toUpperCase();

        const roomRef = ref(database, `rooms/${normalizedCode}`);
        const snapshot = await get(roomRef);

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
            status: 'playing',
            'players/blue': {
                uid: this.playerManager.uid,
                displayName: profile.displayName,
                ratingSnapshot: profile.rating,
                connected: true
            }
        });

        this.roomCode = normalizedCode;
        this.localColor = 'blue';

        return normalizedCode;
    }

    onRoomUpdate(callback) {
        if (!this.roomCode) return () => { };

        const roomRef = ref(database, `rooms/${this.roomCode}`);
        return onValue(roomRef, (snapshot) => {
            callback(snapshot.val());
        })
    }

    requireProfile() {
        const profile = this.playerManager.profile;
        if (!profile) {
            throw new Error('Jogador ainda não tem perfil - chame playerManager.init(nome) antes de criar/entrar em uma sala.');
        }
        return profile;
    }

    trackPresence() {
        if (!this.roomCode || !this.localColor) return;
        const presenceRef = ref(database, `rooms/${this.roomCode}/players/${this.localColor}/connected`);
        set(presenceRef, true);
        onDisconnect(presenceRef).set(false);
    }

    async isOpponentConnected() {
        const room = await this.getRoomData();
        const opponentColor = this.localColor === 'red' ? 'blue' : 'red';
        return !!(room.players?.[opponentColor]?.connected);
    }

    async requestRematch() {
        await set(ref(database, `rooms/${this.roomCode}/rematch`), {
            status: 'pending',
            requestedBy: this.localColor
        });
    }

    async respondToRematch(accept) {
        if (!accept) {
            await update(ref(database, `rooms/${this.roomCode}/rematch`), { status: 'declined' });
            return;
        }

        const room = await this.getRoomData();
        const swappedPlayers = { red: room.players.blue, blue: room.players.red };

        await update(ref(database, `rooms/${this.roomCode}`), {
            players: swappedPlayers,
            moves: null,
            status: 'playing',
            winner: null,
            ratingApplied: false,
            rematch: { status: 'accepted', requestedBy: null }
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

    async syncLocalColorAfterRematch() {
        const room = await this.getRoomData();
        this.localColor = room.players.red.uid === this.playerManager.uid ? 'red' : 'blue';
    }
}