/**
 * main.js
 * Ponto de entrada e orquestrador principal do jogo.
 */

import Board from './Board.js';
import Bot from './Bot.js';
import UIManager from './UIManager.js';
import eventManager from './EventManager.js';
import { audioManager } from './AudioManager.js';
import PlayerManager, { playerManager } from './PlayerManager.js';
import { ratingManager } from './RatingManager.js';
import RoomManager from './RoomManager.js';
import OnlineManager from './OnlineManager.js';
import { database, ref, onValue } from './FirebaseConfig.js';

// 1. Instâncias Globais
const board = new Board();
const uiManager = new UIManager();
const MUSIC_SRC = './assets/audio/decisions.mp3';
const PLAYER_NAME_KEY = 'chain_reaction_player_name';

let gameMode = 'pvp';
let cpuDifficulty = 'easy';
let bot = null;
let roomManager = null;
let onlineManager = null;

const modeButtons = [uiManager.btnModePvp, uiManager.btnModePve];

// 2. Assinatura de Eventos do Sistema
function setupEventListeners() {
    eventManager.reset();

    // ASSINANTE ADICIONADO: Escuta quando o tabuleiro é resetado
    eventManager.subscribe('board:reset', () => {
        audioManager.playBackgroundMusic(MUSIC_SRC);
        uiManager.buildBoardDOM(board.rows, board.cols);
        uiManager.renderBoard(board.grid);
        uiManager.updateTurnIndicator(board.getCurrentPlayer());
    });

    // Escuta quando o jogador clica em uma célula na UI
    eventManager.subscribe('cell:clicked', ({ row, col }) => {
        if (gameMode === 'online') {
            if (!roomManager || board.getCurrentPlayer() !== roomManager.localColor) return;
            // board.makeMove(row, col);
            onlineManager.submitLocalMove(row, col);
            return;
        }
        board.makeMove(row, col);
    });

    // Escuta quando uma jogada ou movimento é realizado
    eventManager.subscribe('board:move', ({ row, col, player }) => {
        audioManager.playPopSound();
        audioManager.vibrateMove();
        // uiManager.renderBoard(board.grid);

        if (row !== undefined && col !== undefined) {
            const cell = board.grid[row]?.[col];
            if (cell) {
                const orbCount = cell.orbs !== undefined ? cell.orbs : (cell.count || 0);
                const isCritical = orbCount > 0 && orbCount === cell.maxCapacity;

                uiManager.updateSingleCell(row, col, orbCount, player, isCritical);
            }
        }
    });

    // Escuta quando uma célula explode
    eventManager.subscribe('cell:exploded', ({ row, col }) => {
        audioManager.playExplosionSound();
        audioManager.vibrateVictory()

        const cell = board.grid[row]?.[col];
        if (cell) {
            const orbCount = cell.orbs !== undefined ? cell.orbs : (cell.count || 0);
            const isCritical = orbCount > 0 && orbCount === cell.maxCapacity;

            uiManager.updateSingleCell(row, col, orbCount, cell.owner, isCritical);
        }

        uiManager.boardContainer.classList.add('shake')
        setTimeout(() => {
            uiManager.boardContainer.classList.remove('shake')
        }, 300)
    });

    eventManager.subscribe('cell:updated', ({ row, col }) => {
        const cell = board.grid[row]?.[col];
        if (cell) {
            const orbCount = cell.orbs !== undefined ? cell.orbs : (cell.count || 0);
            const isCritical = orbCount > 0 && orbCount === cell.maxCapacity;
            uiManager.updateSingleCell(row, col, orbCount, cell.owner, isCritical);
        }
    })

    eventManager.subscribe('chain:completed', () => {
        uiManager.renderBoard(board.grid);
    });

    // Escuta quando o turno troca
    eventManager.subscribe('turn:changed', (data) => {
        uiManager.updateTurnIndicator(data.currentPlayer);
        maybeTriggerBotMove(data.currentPlayer);
    });

    // Escuta fim de jogo
    eventManager.subscribe('game:over', async (data) => {
        audioManager.stopBackgroundMusic();

        const isOnline = gameMode === 'online' && roomManager;

        updateScoreBoardUI()

        setTimeout(async () => {
            if (!isOnline) {
                audioManager.playVictorySound();
                audioManager.vibrateVictory();
                uiManager.showWinModal(data.winner, 'generic');
                roomManager.setScoreWinModal();
                return
            }

            const isLocalWinner = data.winner === roomManager.localColor;

            if (isLocalWinner) {
                audioManager.playVictorySound();
                audioManager.vibrateVictory();
            } else {
                audioManager.playDefeatSound();
                audioManager.vibrateDefeat();
            }

            uiManager.showWinModal(data.winner, isLocalWinner ? 'victory' : 'defeat');

            const ratingData = await ratingManager.applyMatchResult(roomManager.roomCode, roomManager.matchCode, data.winner);
            const ratingToShow = await getRatingToShow(ratingData)

            uiManager.winRatingValue.textContent = ratingToShow
        }, 1200);


    });
}

// 3. Função para Iniciar Partida
function startNewGame() {

    // setupEventListeners();
    bot = gameMode === 'pve' ? new Bot('blue', cpuDifficulty) : null;

    if (gameMode === 'online') {
        if (onlineManager) onlineManager.stop();
        onlineManager = new OnlineManager(board, roomManager);
        onlineManager.start();
        listenToScore();
        updateScoreBoardUI();
    } else {
        onlineManager = null;
    }
    board.reset(); // Isso vai disparar o evento 'board:reset', ativando a reconstrução e renderização da tela!
}

function maybeTriggerBotMove(currentPlayer) {
    if (gameMode !== 'pve' || !bot) return;
    if (currentPlayer !== bot.playerColor) return;
    if (board.isGameOver) return;

    setTimeout(() => {
        const move = bot.chooseMove(board.grid);
        if (move) {
            board.makeMove(move.row, move.col);
        }
    }, 600);
}

async function getRatingToShow(ratingData) {
    if (!ratingData) {
        return await playerManager.getPlayerData(playerManager.uid, 'rating');
    }

    const { loser, winner } = ratingData;
    const uid = playerManager.uid;

    if (loser.uid === uid) return loser.newRating;
    if (winner.uid === uid) return winner.newRating

    return '';
}

function listenToScore() {
    if (!roomManager || !roomManager.roomCode) return;

    const scoreREf = ref(database, `rooms/${roomManager.roomCode}/score`);

    onValue(scoreREf, async () => {
        // const score = await roomManager.getRoomScore();
        // uiManager.hostScore.textContent = score.host;
        // uiManager.guestScore.textContent = score.guest;
        await updateScoreBoardUI();
    });
}

async function updateScoreBoardUI() {
    if (!roomManager) return;

    const roomData = await roomManager.getRoomData();
    if (!roomData) return;

    const host = roomData.players.host;
    const guest = roomData.players.guest;
    const score = roomData.score || {};

    if (uiManager.hostName) uiManager.hostName.textContent = host.displayName;
    if (uiManager.hostScore) uiManager.hostScore.textContent = score[host.uid] || 0;

    if (guest) {
        if (uiManager.guestName) uiManager.guestName.textContent = guest.displayName;
        if (uiManager.guestScore) uiManager.guestScore.textContent = score[guest.uid] || 0;
    }

    const isHostRed = roomManager.localColor === 'red'
        ? (roomManager.playerManager.uid === host.uid)
        : (roomManager.playerManager.uid !== host.uid)

    if (uiManager.hostCard) uiManager.hostCard.setAttribute('data-current-color', isHostRed ? 'red' : 'blue');
    if (uiManager.guestCard) uiManager.guestCard.setAttribute('data-current-color', isHostRed ? 'blue' : 'red');

}

// 4. Configuração dos Eventos da Interface de Usuário (Botões)
if (uiManager.btnConfirmName) {
    uiManager.btnConfirmName.addEventListener('click', async () => {
        const name = uiManager.getPlayerNameInput();
        if (!name) return;

        localStorage.setItem(PLAYER_NAME_KEY, name);
        uiManager.hideNameModal();
        await playerManager.init(name)
        proceedAfterIdentity();
    });
}



if (uiManager.btnPvpLocal) {
    uiManager.btnPvpLocal.addEventListener('click', () => {
        gameMode = 'pvp';
        audioManager.playBackgroundMusic(MUSIC_SRC);

        setTimeout(() => {
            uiManager.hideModeModal();

            startNewGame();
        }, 200);
    });
}

if (uiManager.btnPvpOnline) {
    uiManager.btnPvpOnline.addEventListener('click', () => {
        uiManager.hideModeModal();
        uiManager.showOnlineStep('choice');
        uiManager.showOnlineModal();
    });
}

if (uiManager.btnCloseOnline) {
    uiManager.btnCloseOnline.addEventListener('click', () => {
        uiManager.hideOnlineModal();
        uiManager.showModeModal();
    });
}

if (uiManager.btnCreateRoom) {
    uiManager.btnCreateRoom.addEventListener('click', async () => {
        roomManager = new RoomManager(playerManager);
        try {
            const code = await roomManager.createRoom();
            uiManager.setRoomCodeDisplay(code);
            uiManager.showOnlineStep('choice');

            const unsubscribe = roomManager.onRoomUpdate(async (room) => {
                if (room && room.status === 'playing' && room.players?.guest) {
                    gameMode = 'online';
                    uiManager.hideOnlineModal();
                    attachRematchListener()
                    startNewGame();
                    unsubscribe();
                }
            });
        } catch (e) {
            console.error(e);
        }
    });
}

if (uiManager.btnJoinRoom) {
    uiManager.btnJoinRoom.addEventListener('click', () => {
        uiManager.setJoinError('');
        uiManager.showOnlineStep('join');
    });
}

if (uiManager.btnConfirmJoin) {
    uiManager.btnConfirmJoin.addEventListener('click', async () => {
        const code = uiManager.getJoinCodeInput();
        if (!code) return;

        roomManager = new RoomManager(playerManager);
        try {
            await roomManager.joinRoom(code);
            const roomData = await roomManager.getRoomData();
            if (!roomData) return;

            uiManager.setReadyPlayers(roomData.players.host.displayName, roomData.players.guest.displayName);
            gameMode = 'online';
            uiManager.hideOnlineModal();
            attachRematchListener()
            startNewGame();
        } catch (e) {
            uiManager.setJoinError(e.message);
        }
    });
}

if (uiManager.btnCopyCode) {
    uiManager.btnCopyCode.addEventListener('click', () => {
        navigator.clipboard.writeText(roomManager.roomCode);
    });
}

if (uiManager.btnCopyLink) {
    uiManager.btnCopyLink.addEventListener('click', () => {
        const link = `${window.location.origin}${window.location.pathname}?sala=${roomManager.roomCode}`;
        navigator.clipboard.writeText(link);
    });
}


if (uiManager.tutorial) {
    uiManager.tutorial.init();
}

if (uiManager.btnCloseTutorial) {
    uiManager.btnCloseTutorial.addEventListener('click', () => {
        uiManager.hideTutorialModal();
        if (typeof uiManager.tutorial.markAsSeen === 'function') {
            uiManager.tutorial.markAsSeen();
        } else {
            localStorage.setItem(uiManager.tutorial.STORAGE_KEY, 'true');
        }
        uiManager.showModeModal();
    });
}

if (uiManager.btnModePvp) {
    uiManager.btnModePvp.addEventListener('click', () => {
        uiManager.setActiveButton(uiManager.btnModePvp, modeButtons);
        uiManager.showPvpOptions(); // NOVO: em vez de já iniciar, abre a escolha Local/Online
    });
}

if (uiManager.btnModePve) {
    uiManager.btnModePve.addEventListener('click', () => {
        uiManager.setActiveButton(uiManager.btnModePve, modeButtons);
        gameMode = 'pve';
        audioManager.playBackgroundMusic(MUSIC_SRC);
        uiManager.showDifficultyOptions();
    });
}

uiManager.diffButtons.forEach(button => {
    button.addEventListener('click', () => {
        uiManager.setActiveButton(button, uiManager.diffButtons);
        cpuDifficulty = button.dataset.level;

        setTimeout(() => {
            uiManager.hideModeModal();
            startNewGame();
        }, 200);
    });
});

if (uiManager.btnReset) {
    uiManager.btnReset.addEventListener('click', () => {
        startNewGame();
    });
}

if (uiManager.btnPlayAgain) {
    uiManager.btnPlayAgain.addEventListener('click', async () => {
        uiManager.hideWinModal();

        if (gameMode === 'online' && roomManager) {
            const opponentConnected = await roomManager.isOpponentConnected();
            if (!opponentConnected) {
                uiManager.showRematchStatus('Seu adversário não está mais disponível.');
                return;
            }
            await roomManager.requestRematch();
            uiManager.showRematchStatus('Pedido enviado. Aguardando resposta do adversário...');
        } else {
            startNewGame()
        }
    })
}

if (uiManager.btnExitLobby) {
    uiManager.btnExitLobby.addEventListener('click', async () => {
        uiManager.hideWinModal()
        uiManager.showModeModal()
        await roomManager.leaveRoom()
    })
}

if (uiManager.btnCredits) {
    uiManager.btnCredits.addEventListener('click', () => {
        uiManager.showCreditsModal();
    });
}

if (uiManager.btnCloseCredits) {
    uiManager.btnCloseCredits.addEventListener('click', () => {
        uiManager.hideCreditsModal();
    })
}

if (uiManager.btnAcceptRematch) {
    uiManager.btnAcceptRematch.addEventListener('click', () => {
        roomManager.respondToRematch(true);
        uiManager.hideRematchUI();
        uiManager.hideWinModal();
    });
}

if (uiManager.btnDeclineRematch) {
    uiManager.btnDeclineRematch.addEventListener('click', () => {
        roomManager.respondToRematch(false);
        uiManager.showRematchStatus('Você recusou a revanche. \nVoltando para o lobby...');
        board.reset();
        setInterval(() => {
            uiManager.hideRematchUI();
            uiManager.showModeModal();
        }, 3000);
    })
}

// 5. Inicialização da Aplicação
async function initApp() {
    const savedName = localStorage.getItem(PLAYER_NAME_KEY);

    if (savedName) {
        await playerManager.init(savedName);
        proceedAfterIdentity();
        setupEventListeners();
    } else {
        uiManager.showNameModal();
    }
}

function proceedAfterIdentity() {
    const urlParams = new URLSearchParams(window.location.search);
    const invitedRoomCode = urlParams.get('sala');

    if (invitedRoomCode) {
        uiManager.setJoinCodeInput(invitedRoomCode.toUpperCase());
        uiManager.showOnlineStep('join');
        uiManager.showOnlineModal();
        return; // pula tutorial/lobby normal, vai direto pro "entrar em partida"
    }

    const hasSeenTutorial = uiManager.tutorial.hasSeenTutorial();
    if (!hasSeenTutorial) {
        uiManager.showTutorialModal();
    } else {
        uiManager.showModeModal();
    }
}

function attachRematchListener() {
    roomManager.onRematchUpdate(async (rematch) => {

        if (!rematch || rematch.status === 'none') return;

        if (rematch.status === 'pending') {
            if (rematch.requestedBy === roomManager.localColor) {
                uiManager.showRematchStatus('Pedido enviado. Aguardando resposta do adversário...');
            } else {
                uiManager.showRematchPrompt();
            }
            return;
        }

        if (rematch.status === 'declined' && rematch.requestedBy === roomManager.localColor) {
            uiManager.showRematchStatus('Revanche recusada.');
            setInterval(() => {
                board.reset()
                uiManager.hideRematchUI()
                uiManager.showModeModal();
            }, 3000);
            await roomManager.clearRematchRequest();
            return;
        }

        if (rematch.status === 'accepted') {
            uiManager.hideRematchUI();
            roomManager.switchLocalColor();
            await roomManager.asyncCurrentMatch();
            onlineManager.start();
            startNewGame();
            await roomManager.clearRematchRequest();
        }
    });
}

initApp();