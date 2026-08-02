import Board from './Board.js';
import eventManager from './EventManager.js';
import Tutorial from "./Tutorial.js";
import { audioManager } from './AudioManager.js';

const boardElement = document.getElementById('game-board');
const turnIndicator = document.getElementById('turn-indicator');
const currentPlayerName = document.getElementById('current-player-name');
const btnReset = document.getElementById('btn-reset');

const winModal = document.getElementById('win-modal');
const winnerName = document.getElementById('winner-name');
const btnPlayAgain = document.getElementById('btn-play-again');

const gridElement = document.querySelector('.board-grid');

// Configurações iniciais do jogo
const TOTAL_ROWS = 8;
const TOTAL_COLS = 6;
const PLAYERS = ['red', 'blue'];

let gameBoard = null
let tutorialInstance = null;


/**
 * Inicializa a interface do usuário,
 * criando as células do tabuleiro e configurando os eventos de clique.
 */
function initUI() {
    boardElement.style.setProperty('--cols', gameBoard.cols);
    boardElement.style.setProperty('--rows', gameBoard.rows);

    boardElement.innerHTML = '';

    for (let r = 0; r < gameBoard.rows; r++) {
        for (let c = 0; c < gameBoard.cols; c++) {
            const cellElement = document.createElement('div');
            cellElement.classList.add('cell');

            cellElement.dataset.row = r;
            cellElement.dataset.col = c;

            cellElement.addEventListener('click', async () => {
                await gameBoard.makeMove(r, c);
            });

            boardElement.appendChild(cellElement);
        }
    }

    hideWinModal();
    updateTurnBadge(gameBoard.getCurrentPlayer());
}

/**
 * Renderização do tabuleiro, esferas dentro das células de acordo com o estado atual do jogo.
 */
function renderBoard() {
    for (let r = 0; r < gameBoard.rows; r++) {
        for (let c = 0; c < gameBoard.cols; c++) {
            const cellData = gameBoard.grid[r][c];

            const cellElement = boardElement.querySelector(`[data-row="${r}"][data-col="${c}"]`);

            if (!cellElement) continue;

            if (cellData.orbs === 0) {
                cellElement.innerHTML = '';
                continue;
            }

            let orbContainer = cellElement.querySelector('.orb-container');
            if (!orbContainer) {
                orbContainer = document.createElement('div');
                orbContainer.classList.add('orb-container');
                cellElement.appendChild(orbContainer);
            }

            const existingOrbs = orbContainer.querySelectorAll('.orb');
            const currentCount = existingOrbs.length;
            const targetCount = cellData.orbs;

            existingOrbs.forEach(orb => {
                orb.className = `orb ${cellData.owner}`;
            });

            if (targetCount > currentCount) {
                const orbsToAdd = targetCount - currentCount;

                for (let i = 0; i < orbsToAdd; i++) {
                    const newOrb = document.createElement('div');
                    newOrb.classList.add('orb', cellData.owner);
                    orbContainer.appendChild(newOrb);
                }
            }
            else if (targetCount < currentCount) {
                const orbsToRemove = currentCount - targetCount;
                for (let i = 0; i < orbsToRemove; i++) {
                    if (orbContainer.lastChild) {
                        orbContainer.removeChild(orbContainer.lastChild);
                    }
                }
            }

        }
    }
}

/**
 * Atualiza o indicador de turno, mostrando a cor do jogador atual e seu nome.
 * @param {string} playerColor 
 */
function updateTurnBadge(playerColor) {
    turnIndicator.className = `turn-badge player-${playerColor}`;
    currentPlayerName.textContent = playerColor === 'red' ? 'Vermelho' : 'Azul';
    if (gridElement) {
        gridElement.style.setProperty(
            '--background-color',
            playerColor === 'red' ? "#b9432e45" : "#1d488645"
        );
    }
}

function showWinModal(winnerColor) {
    winnerName.textContent = winnerColor === 'red' ? 'Vermelho' : 'Azul';
    winnerName.style.color = winnerColor === 'red' ? '#ef4444' : '#3b82f6';
    winModal.classList.remove('hidden');
}

function hideWinModal() {
    winModal.classList.add('hidden');
}

// ====================================================
// Inscrições de eventos (pub/sub)
// ====================================================
function setupEventListeners() {
    eventManager.reset();

    eventManager.subscribe('board:move', () => {
        renderBoard();
        audioManager.playPopSound();
        audioManager.vibrateMove();
    });

    eventManager.subscribe('cell:exploded', (data) => {
        renderBoard();
        triggerScreenShake();
        audioManager.playExplosionSound();
        audioManager.vibrateExplosion();
    });

    eventManager.subscribe('turn:changed', (data) => {
        updateTurnBadge(data.currentPlayer);
    });

    eventManager.subscribe('game:over', (data) => {
        showWinModal(data.winner);
        audioManager.playVictorySound();
        audioManager.vibrateVictory();
    });
}

function triggerScreenShake() {
    if (!boardElement) return;

    boardElement.classList.remove('shake');

    void boardElement.offsetWidth;

    boardElement.classList.add('shake');

    setTimeout(() => {
        boardElement.classList.remove('shake');
    }, 300);
}


function startNewGame() {
    gameBoard = new Board(TOTAL_ROWS, TOTAL_COLS, PLAYERS);

    setupEventListeners();

    initUI();
    renderBoard();

    if (!tutorialInstance) {
        tutorialInstance = new Tutorial()
        tutorialInstance.init()
    }

    console.log('Este game foi desenvolvido por \n👩🏽‍💻 Fernando Guedes\ngithub do projeto: https://github.com/guedesindev/chainReaction\nMeu portifólio 🌐: https://guedesindev.github.io/portifolio/')
}

btnReset.addEventListener('click', () => {
    startNewGame();
})

btnPlayAgain.addEventListener('click', () => {
    startNewGame();
})


startNewGame();