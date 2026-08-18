/**
 * UIManager.js
 * Gerenciador de interface do usuário.
 */

import Tutorial from './Tutorial.js';
import eventManager from './EventManager.js';
import { playerManager } from './PlayerManager.js';

export default class UIManager {
    constructor() {
        this.boardContainer = document.getElementById('game-board');

        // Referências aos Modais e Botões
        this.modeModal = document.getElementById('mode-modal');
        this.winModal = document.getElementById('win-modal');
        this.tutorialModal = document.getElementById('tutorial-modal');
        this.creditsModal = document.getElementById('credits-modal');
        this.nameModal = document.getElementById('name-modal');
        this.onlineModal = document.getElementById('online-modal');
        this.rematchModal = document.getElementById('rematch-modal');

        this.btnModePvp = document.getElementById('btn-mode-pvp');
        this.btnModePve = document.getElementById('btn-mode-pve');
        this.diffButtons = document.querySelectorAll('.btn-diff');
        this.btnTutorial = document.getElementById('btn-help');
        this.btnCloseTutorial = document.getElementById('btn-close-tutorial');
        this.btnReset = document.getElementById('btn-reset');
        this.btnPlayAgain = document.getElementById('btn-play-again');
        this.btnCredits = document.getElementById('btn-credits');
        this.btnCloseCredits = document.getElementById('btn-close-credits');
        this.btnExitLobby = document.getElementById('btn-exit-lobby');
        this.btnConfirmName = document.getElementById('btn-confirm-name');
        this.pvpOptions = document.getElementById('pvp-options');
        this.btnPvpLocal = document.getElementById('btn-pvp-local');
        this.btnPvpOnline = document.getElementById('btn-pvp-online');
        this.btnCloseOnline = document.getElementById('btn-close-online');
        this.btnCreateRoom = document.getElementById('btn-create-room');
        this.btnJoinRoom = document.getElementById('btn-join-room');
        this.btnCopyCode = document.getElementById('btn-copy-code');
        this.btnCopyLink = document.getElementById('btn-copy-link');
        this.btnConfirmJoin = document.getElementById('btn-confirm-join');
        this.btnAcceptRematch = document.getElementById('btn-accept-rematch');
        this.btnDeclineRematch = document.getElementById('btn-decline-rematch');

        this.hostCard = document.getElementById('host-card');
        this.hostName = document.getElementById('host-name');
        this.hostScore = document.getElementById('host-score');
        this.guestCard = document.getElementById('guest-card');
        this.guestName = document.getElementById('guest-name');
        this.guestScore = document.getElementById('guest-score');
        this.winnerNameEl = document.getElementById('winner-name')
        this.winTitleEl = document.getElementById('win-title');
        this.winRatingValue = document.getElementById('win-rating-value');
        this.turnIndicator = document.getElementById('turn-indicator');
        this.difficultyOptions = document.getElementById('difficulty-options');
        this.inputPlayerName = document.getElementById('input-player-name');
        this.roomCodeDisplay = document.getElementById('room-code-display');
        this.inputRoomCode = document.getElementById('input-room-code');
        this.joinError = document.getElementById('join-error');
        this.statusRoom = document.getElementById("status-room");
        this.readyRedName = document.getElementById('ready-red-name');
        this.readyBlueName = document.getElementById('ready-blue-name');
        this.rematchMessage = document.getElementById('rematch-message');
        this.rematchActions = document.getElementById('rematch-actions');
        this.WinHostScore = document.getElementById("win-host-score")
        this.WinGuestScore = document.getElementById("win-guest-score")



        // Matriz visual para armazenar a referência das células no DOM
        this.cellElements = [];

        this.tutorial = new Tutorial();
    }

    /**
     * PASSO 1: Constrói a grade visual das células no HTML apenas UMA VEZ.
     * @param {number} rows - Número de linhas do tabuleiro (padrão: 8)
     * @param {number} cols - Número de colunas do tabuleiro (padrão: 6)
     */
    buildBoardDOM(rows = 8, cols = 6) {
        if (!this.boardContainer) {
            console.error("❌ [Erro UIManager]: Elemento com ID 'game-board' NÃO foi encontrado no HTML.");
            return;
        }

        // Limpa o conteúdo anterior
        this.boardContainer.innerHTML = '';
        this.cellElements = [];

        // Define dinamicamente o número de colunas e linhas no CSS Grid
        this.boardContainer.style.display = 'grid';
        this.boardContainer.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
        this.boardContainer.style.gridTemplateRows = `repeat(${rows}, 1fr)`;

        for (let r = 0; r < rows; r++) {
            const rowElements = [];
            for (let c = 0; c < cols; c++) {
                const cellElement = document.createElement('div');
                cellElement.classList.add('cell');
                cellElement.dataset.row = r;
                cellElement.dataset.col = c;

                // Evento de clique para disparar a jogada
                cellElement.addEventListener('click', () => {
                    eventManager.publish('cell:clicked', { row: r, col: c });
                });

                this.boardContainer.appendChild(cellElement);
                rowElements.push(cellElement);
            }
            this.cellElements.push(rowElements);
        }
    }

    /**
     * PASSO 2: Atualiza o estado visual de cada célula existente sem destruir o DOM.
     * @param {Array<Array<Object>>} grid - Matriz de células vinda do Board
     */
    renderBoard(grid) {
        if (!grid || !Array.isArray(grid)) return;

        if (this.cellElements.length === 0) {
            this.buildBoardDOM(grid.length, grid[0].length);
        }

        grid.forEach((row, r) => {
            row.forEach((cell, c) => {
                const cellElement = this.cellElements[r]?.[c];
                if (!cellElement) return;

                const orbCount = cell.orbs !== undefined ? cell.orbs : (cell.count || 0);
                const owner = cell.owner || '';
                const isCritical = orbCount > 0 && orbCount === cell.maxCapacity;

                // Desenha as esferas internas da célula
                if (cellElement.dataset.orbs === String(orbCount) && cellElement.dataset.owner === owner) {
                    return
                }

                cellElement.dataset.orbs = String(orbCount);
                cellElement.dataset.owner = owner;

                cellElement.callName = 'cell';
                if (owner) {
                    cellElement.classList.add(`player-${owner}`);
                }

                // this.updateCellOrbs(cellElement, orbCount, owner, isCritical);
                this.updateSingleCell(r, c, orbCount, owner, isCritical);
            });
        });
    }

    /**
     * Desenha ou limpa as esferas visuais dentro de uma célula.
     * @param {HTMLElement} cellElement 
     * @param {number} count 
     * @param {string} owner 
     */
    updateCellOrbs(cellElement, count, owner, isCritical) {
        cellElement.innerHTML = '';

        if (!count || count <= 0) return;

        const orbContainer = document.createElement('div');
        orbContainer.classList.add('orb-container', `orbs-${count}`);

        if (isCritical) {
            orbContainer.classList.add('is-critical')
        }

        for (let i = 0; i < count; i++) {
            const slot = document.createElement('div');
            slot.classList.add('orb-slot');

            const orb = document.createElement('div');
            orb.classList.add('orb');
            if (owner) {
                orb.classList.add(owner);
            }

            slot.appendChild(orb)
            orbContainer.appendChild(slot);
        }

        cellElement.appendChild(orbContainer);
    }

    updateSingleCell(row, col, count, owner, isCritical) {
        const cellElement = this.boardContainer.querySelector(`[data-row="${row}"][data-col="${col}"]`);

        if (!cellElement) return;

        this.updateCellOrbs(cellElement, count, owner, isCritical);
    }

    /**
     * Atualiza a indicação textual do jogador da vez.
     * @param {string} currentPlayer 
     */
    updateTurnIndicator(currentPlayer) {
        if (this.turnIndicator) {
            this.turnIndicator.textContent = `Vez do Jogador: ${currentPlayer.toUpperCase()}`;
            this.turnIndicator.className = `turn-badge player-${currentPlayer}`;
        }
    }

    // --- CONTROLE DE MODAIS ---
    showNameModal() {
        if (this.nameModal) {
            this.nameModal.classList.remove('hidden');
        }
    }

    hideNameModal() {
        if (this.nameModal) {
            this.nameModal.classList.add('hidden');
        }
    }

    showTutorialModal() {
        if (this.tutorialModal) {
            if (typeof this.tutorial.init === 'function') {
                this.tutorial.init();
            } else if (typeof this.tutorial.render === 'function') {
                this.tutorial.render();
            }
            this.tutorialModal.classList.remove('hidden');
        }
    }

    getPlayerNameInput() {
        if (!this.inputPlayerName) return '';
        return this.inputPlayerName.value.trim();
    }

    hideTutorialModal() {
        if (this.tutorialModal) {
            this.tutorialModal.classList.add('hidden');
        }
    }

    showModeModal() {
        if (this.difficultyOptions) {
            this.difficultyOptions.classList.add('hidden');
        }
        if (this.modeModal) {
            this.modeModal.classList.remove('hidden');
        }
    }

    hideModeModal() {
        if (this.modeModal) {
            this.modeModal.classList.add('hidden');
        }
    }

    showDifficultyOptions() {
        if (this.difficultyOptions) {
            this.difficultyOptions.classList.remove('hidden');
        }
    }

    showWinModal(winner, outcome = 'generic') {
        if (!this.winModal) return;


        if (this.winnerNameEl) {
            this.winnerNameEl.classList.add(winner);
            this.winnerNameEl.textContent = winner.toUpperCase();
        }

        if (this.winTitleEl) {
            if (outcome === 'victory') {
                this.winTitleEl.textContent = '🏆 Você Venceu!';
            } else if (outcome) {
                this.winTitleEl.textContent = '💀 Você Perdeu';
            } else {
                this.winTitleEl.textContent = '🏆 Vitória!';
            }
        }

        this.winModal.classList.remove('hidden');

    }

    hideWinModal() {
        if (this.winModal) {
            this.winModal.classList.add('hidden');
        }
    }

    showCreditsModal() {
        if (this.creditsModal) {
            this.creditsModal.classList.remove('hidden');
        }
    }

    hideCreditsModal() {
        if (this.creditsModal) {
            this.creditsModal.classList.add('hidden');
        }
    }

    showPvpOptions() {
        if (this.pvpOptions) this.pvpOptions.classList.remove('hidden');
        if (this.difficultyOptions) this.difficultyOptions.classList.add('hidden');
    }

    showOnlineModal() {
        if (this.onlineModal) {
            this.onlineModal.classList.remove('hidden');
            this.setRoomCodeDisplay('')
        }
    }

    showOnlineStep(step) {
        const steps = {
            choice: document.getElementById('online-choice'),
            waiting: document.getElementById('online-waiting'),
            join: document.getElementById('online-join'),
            ready: document.getElementById('online-ready')
        };
        Object.values(steps).forEach((el) => { if (el) el.classList.add('hidden'); });
        if (steps[step]) steps[step].classList.remove('hidden');
    }

    hideOnlineModal() {
        if (this.onlineModal) {
            this.setRoomCodeDisplay('')
            this.onlineModal.classList.add('hidden');
        }
    }

    showRematchStatus(message) {
        if (this.rematchMessage) this.rematchMessage.textContent = message;
        if (this.rematchActions) { this.rematchActions.classList.add('hidden'); this.rematchActions.style.display = "none"; }
        if (this.rematchModal) this.rematchModal.classList.remove('hidden');
    }

    showRematchPrompt() {
        if (this.rematchMessage) this.rematchMessage.textContent = 'Seu adversário quer revanche!';
        if (this.rematchActions) { this.rematchActions.classList.remove('hidden'); this.rematchActions.style.display = 'flex'; }
        if (this.rematchModal) this.rematchModal.classList.remove('hidden');
    }

    hideRematchUI() {
        if (this.rematchModal) this.rematchModal.classList.add('hidden');
    }

    clearActiveButtons(buttons) {
        buttons.forEach(btn => btn.classList.remove('btn-success'));
    }

    setActiveButton(selectedButton, groupButtons) {
        this.clearActiveButtons(groupButtons);
        selectedButton.classList.add('btn-success');
    }

    setRoomCodeDisplay(code) {
        if (this.roomCodeDisplay) this.roomCodeDisplay.textContent = code;
    }

    setScoreWinModal() {
        //pass
    }

    getJoinCodeInput() {
        if (!this.inputRoomCode) return '';
        return this.inputRoomCode.value.trim().toUpperCase();
    }

    setJoinCodeInput(code) {
        if (this.inputRoomCode) this.inputRoomCode.value = code;
    }

    setJoinError(message) {
        if (this.joinError) this.joinError.textContent = message || '';
    }

    setStatusRoom(roomData) {
        if (!roomData) return;
        const players = Object.keys(roomData.players)
        let qtdPlayers = players.length

        if (qtdPlayers < 2) {
            this.statusRoom.textContent = '⌛ Aguardando adversário...';
            this.readyRedName.textContent = playerManager.profile.displayName;
        } else if (qtdPlayers === 2) {
            this.statusRoom.textContent = '✅ Sala pronta!';
            this.readyRedName.textContent = roomData.players.host.displayName;
            this.readyBlueName.textContent = playerManager.profile.displayName;
        }
    }

    setReadyPlayers(redName, blueName) {
        if (this.readyRedName) this.readyRedName.textContent = redName;
        if (this.readyBlueName) this.readyBlueName.textContent = blueName;
    }
}