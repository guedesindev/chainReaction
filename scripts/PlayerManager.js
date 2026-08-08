import { database, ref, set, get, auth, signInAnonymously } from './FirebaseConfig.js';

const DEFAULT_RATING = 1200;

export default class PlayerManager {
    constructor() {
        this.uid = null;
        this.profile = null;
    }

    async init(displayName) {
        const userCredential = await signInAnonymously(auth);
        this.uid = userCredential.user.uid;

        const profileRef = ref(database, `players/${this.uid}`);
        const snapshot = await get(profileRef);

        if (snapshot.exists()) {
            this.profile = snapshot.val();

            if (displayName && displayName !== this.profile.displayName) {
                await this.updateDisplayName(displayName);
            }
        } else {
            this.profile = {
                displayName: displayName || 'Jogador',
                rating: DEFAULT_RATING,
                gamesPlayer: 0,
                wins: 0,
                loses: 0,
                createdAt: Date.now()
            };
            await set(profileRef, this.profile);
        }
        return this.profile;
    }

    async updateDisplayName(displayName) {
        if (!this.uid) return;
        this.profile.displayName = displayName;
        await set(ref(database, `players/${this.uid}/displayName`), displayName);
    }
}

export const playerManager = new PlayerManager();