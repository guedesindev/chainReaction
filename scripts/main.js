/**
 * main.js
 * Ponto de entrada e orquestrador principal do jogo.
 */

import Board from './Board.js';
import Bot from './Bot.js';
import UIManager from './UIManager.js';
import eventManager from './EventManager.js';
import { audioManager } from './AudioManager.js';
import Firebase from './Firebase.js';
import PlayerManager, { playerManager } from './PlayerManager.js';
import RoomManager from './RoomManager.js';
import OnlineManager from './OnlineManager.js';

// 1. Instâncias Globais
const board = new Board();
const uiManager = new UIManager();
const MUSIC_SRC = './assets/audio/decisions.mp3';
const firebase = new Firebase();
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
            board.makeMove(row, col);
            onlineManager.submitLocalMove(row, col);
        }
        board.makeMove(row, col);
    });

    // Escuta quando uma jogada ou movimento é realizado
    eventManager.subscribe('board:move', () => {
        audioManager.playPopSound();
        audioManager.vibrateMove();
        uiManager.renderBoard(board.grid);
    });

    // Escuta quando uma célula explode
    eventManager.subscribe('cell:exploded', () => {
        audioManager.playExplosionSound();
        audioManager.vibrateVictory()
        uiManager.renderBoard(board.grid);
    });

    // Escuta quando o turno troca
    eventManager.subscribe('turn:changed', (data) => {
        uiManager.updateTurnIndicator(data.currentPlayer);
        maybeTriggerBotMove(data.currentPlayer);
    });

    // Escuta fim de jogo
    eventManager.subscribe('game:over', (data) => {

        audioManager.stopBackgroundMusic();
        if (gameMode === 'online' && roomManager) {
            const isLocalWinner = data.winner === roomManager.localColor;

            if (isLocalWinner) {
                audioManager.playVictorySound();
                audioManager.vibrateVictory();
            } else {
                audioManager.playDefeatSound();
                audioManager.vibrateDefeat();
            }

            uiManager.showWinModal(data.winner, isLocalWinner ? 'victory' : 'defeat');
        } else {
            audioManager.playVictorySound();
            audioManager.vibrateVictory();
            uiManager.showWinModal(data.winner, 'generic')
        }
        // // audioManager.playVictorySound()
        // if (typeof uiManager.showWinModal === 'function') {
        //     uiManager.showWinModal(data.winner);
        // }
    });
}

// 3. Função para Iniciar Partida
function startNewGame() {
    setupEventListeners();
    bot = gameMode === 'pve' ? new Bot('blue', cpuDifficulty) : null;
    onlineManager = gameMode === 'online' ? new OnlineManager(board, roomManager) : null;

    if (onlineManager) onlineManager.start();

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
            uiManager.showOnlineStep('waiting');

            const unsubscribe = roomManager.onRoomUpdate((room) => {
                if (room && room.status === 'playing' && room.players?.blue) {
                    gameMode = 'online';
                    uiManager.hideOnlineModal();
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
            uiManager.setReadyPlayers(roomData.players.red.displayName, roomData.players.blue.displayName);
            gameMode = 'online',
                uiManager.hideOnlineModal();
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
    uiManager.btnPlayAgain.addEventListener('click', () => {
        uiManager.hideWinModal();
        startNewGame()
    })
}

if (uiManager.btnExitLobby) {
    uiManager.btnExitLobby.addEventListener('click', () => {
        console.log("Saindo para o Lobby")
        uiManager.hideWinModal()
        uiManager.showModeModal()
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

// 5. Inicialização da Aplicação
async function initApp() {
    const savedName = localStorage.getItem(PLAYER_NAME_KEY);

    if (savedName) {
        await playerManager.init(savedName);
        proceedAfterIdentity();
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

initApp();