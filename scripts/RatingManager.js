import { database, ref, get, update, runTransaction } from './FirebaseConfig.js';

const K_NEW_PLAYER = 40;
const K_EXPERIENCED_PLAYER = 20;
const EXPERIENCED_THRESHOLD_GAMES = 20;

export default class RatingManager {
    getKFactor(gamesPlayed) {
        return gamesPlayed >= EXPERIENCED_THRESHOLD_GAMES ? K_EXPERIENCED_PLAYER : K_NEW_PLAYER;
    }

    expetedScore(ratingSelf, ratingOpponent) {
        return 1 / (1 + Math.pow(10, (ratingOpponent - ratingSelf) / 400));
    }

    calculateNewRating(player, opponent, won) {
        const k = this.getKFactor(player.gamesPlayed);
        const expected = this.expetedScore(player.rating, opponent.rating);
        const actual = won ? 1 : 0;
        const delta = Math.round(k * (actual - expected));
        return { newRating: player.rating + delta, delta };
    }

    async applyMatchResult(roomCode, matchCode, winnerColor) {
        const ratingAppliedRef = ref(database, `rooms/${roomCode}/ratingApplied`);

        const transactionResult = await runTransaction(ratingAppliedRef, (current) => {
            if (current === true) return;
            return true;
        });

        if (!transactionResult.committed) return null;

        const roomSnap = await get(ref(database, `rooms/${roomCode}`));
        const room = roomSnap.val();

        const loserColor = winnerColor === 'red' ? 'blue' : 'red';
        let host = room.players.host;
        let guest = room.players.guest;
        const winnerUid = host.color === winnerColor ? host.uid : guest.uid;
        const loserUid = guest.color === winnerColor ? guest.uid : host.uid;

        const [winnerSnap, loserSnap] = await Promise.all([
            get(ref(database, `players/${winnerUid}`)),
            get(ref(database, `players/${loserUid}`))
        ]);

        const winnerProfile = winnerSnap.val();
        const loserProfile = loserSnap.val();

        const winnerResult = this.calculateNewRating(winnerProfile, loserProfile, true);
        const loserResult = this.calculateNewRating(loserProfile, winnerProfile, false);

        await update(ref(database, `rooms/${roomCode}/matches/${matchCode}`), {
            winner: winnerUid,
            currentPlayer: null
        })

        await update(ref(database, `players/${winnerUid}`), {
            rating: winnerResult.newRating,
            gamesPlayed: winnerProfile.gamesPlayed + 1,
            wins: winnerProfile.wins + 1
        });

        await update(ref(database, `players/${loserUid}`), {
            rating: loserResult.newRating,
            gamesPlayed: loserProfile.gamesPlayed + 1,
            losses: loserProfile.losses + 1
        });

        return {
            winner: { uid: winnerUid, color: winnerColor, delta: winnerResult.delta, newRating: winnerResult.newRating },
            loser: { uid: loserUid, color: loserColor, delta: loserResult.delta, newRating: loserResult.newRating }
        }
    }
}

export const ratingManager = new RatingManager();