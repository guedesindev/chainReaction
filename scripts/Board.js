import Cell from './Cells.js';
import eventManager from './EventManager.js';

export default class Board {
    constructor(rows = 8, cols = 6, players = ['red', 'blue']) {
        this.rows = rows;
        this.cols = cols;
        this.players = players;
        this.currentPlayerIndex = 0;
        this.currentPlayer = this.players[this.currentPlayerIndex];
        this.totalMoves = 0;

        this.grid = [];
        this.isProcessing = false;
        this.isGameOver = false;
        this.initGrid();
    }

    /**
     * Cria e inicializa a matriz de células do tabuleiro.
     */
    initGrid() {
        this.grid = [];
        for (let r = 0; r < this.rows; r++) {
            const row = [];
            for (let c = 0; c < this.cols; c++) {
                row.push(new Cell(r, c, this.rows, this.cols));
            }
            this.grid.push(row)
        }
    }

    /**
     * 
     * @returns {string}
     */
    getCurrentPlayer() {
        return this.players[this.currentPlayerIndex]
    }

    /**
     * Executa uma jogada quando o jogador clica em uma célula.
     * @param {number} row - linha selecionada
     * @param {number} col - coluna selecionada
     * @returns {boolean} - True se a jogada foi válida e processada, False caso contrário.
     */
    async makeMove(row, col) {
        if (this.isProcessing || this.isGameOver) return false;

        const cell = this.grid[row]?.[col];
        if (!cell) return false;
        const currentPlayer = this.getCurrentPlayer();

        if (!cell.isEmpty() && cell.owner !== currentPlayer) {
            console.warn(`[⚠️ Jogada Inválida] Célula (${row}, ${col}) pertence a outro jogador.`)
            return false;
        }

        this.isProcessing = true;
        this.totalMoves++;

        const needsExplosion = cell.addOrb(currentPlayer)


        if (needsExplosion) {
            this.processChainReaction(cell)
        } else {
            this.finishTurn()
        }
        eventManager.publish('board:move', { row, col, player: currentPlayer });

        return true
    }

    /**
     * Função auxiliar para criar um delay de milisegundos para que o navegador
     * redesenhe a tela e previnir travamentos durante a reação em cadeia.
     * @param {number} ms 
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Algoritmo para reação em cadeia (Baseado em Fila/Queue)
     * @param {Cell} initialCell - A primeira célula que atingiu a capacidade máxima
     */
    async processChainReaction(initialCell) {
        // Fila contendo apenas as células que precisam explodir
        const explosionQueue = [initialCell];
        let maxSafetyIterations = 500;
        let currentIteration = 0;

        while (explosionQueue.length > 0 && currentIteration < maxSafetyIterations) {
            currentIteration++;

            // Retira a próxima célula instável da fila
            const currentCell = explosionQueue.shift();

            // Se por algum motivo a célula já tiver sido esvaziada, ignora
            if (currentCell.orbs < currentCell.maxCapacity) {
                continue;
            }

            const attackerPlayer = currentCell.owner;

            // 1. Esvazia a célula que está explodindo
            currentCell.explode();

            // 2. Avisa a interface que esta célula explodiu
            eventManager.publish('cell:exploded', {
                row: currentCell.row,
                col: currentCell.col,
                player: attackerPlayer
            });

            // 3. Busca apenas os VIZINHOS DIRETOS (Cima, Baixo, Esquerda, Direita)
            const neighbors = this.getNeighbors(currentCell.row, currentCell.col);

            // 4. Distribui 1 esfera para cada vizinho direto
            neighbors.forEach((neighborCell) => {
                // addOrb retorna TRUE apenas se o vizinho ultrapassar a capacidade limite!
                const willExplode = neighborCell.addOrb(attackerPlayer);

                // Se o vizinho atingiu a capacidade crítica, entra na fila para explodir na sequência
                if (willExplode && !explosionQueue.includes(neighborCell)) {
                    explosionQueue.push(neighborCell);
                }
            });

            // 5. Atualiza a tela com o estado atual das esferas
            eventManager.publish('board:move', {});

            // ⏱️ Pausa de 120ms para criar a animação em ondas e dar o efeito de Game Juice!
            await this.delay(120);

            // 6. Verifica se esta onda de explosão já eliminou o adversário
            const winner = this.checkWinCondition();
            if (winner) {
                break;
            }
        }

        if (currentIteration >= maxSafetyIterations) {
            console.warn('[⚠️ Alerta] Reação em cadeia interrompida pela trava de segurança.');
        }

        this.finishTurn();
    }

    /**
     * Buscar células vizinhas cartesianas (Axiais: Cima, Baixo, Esquerda, Direita)
     * @param {number} row 
     * @param {number} col 
     * @returns {Array<Cell>} Lista de objetos Cell vizinhos válidos
     */
    getNeighbors(row, col) {
        const neighbors = [];

        const directions = [
            [-1, 0], [1, 0], [0, -1], [0, 1]
        ];

        directions.forEach(([dRow, dCol]) => {
            const newRow = row + dRow;
            const newCol = col + dCol;

            if (newRow >= 0 && newRow < this.rows && newCol >= 0 && newCol < this.cols) {
                neighbors.push(this.grid[newRow][newCol])
            }
        });
        return neighbors
    }

    checkWinCondition() {
        if (this.totalMoves < this.players.length) {
            return null
        }

        const activeOwners = new Set();

        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const cell = this.grid[r][c];
                if (cell.owner) {
                    activeOwners.add(cell.owner)
                }
            }
        }

        if (activeOwners.size === 1) {
            const winner = Array.from(activeOwners)[0];
            return winner;
        }
        return null;
    }

    /**
     * Finaliza o turno atual, troca para o próximo jogador e destrava o tabuleiro
     */
    finishTurn() {
        const winner = this.checkWinCondition();

        if (winner) {
            this.isGameOver = true;
            this.isProcessing = true;
            eventManager.publish('game:over', { winner })
            return
        }

        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;

        this.isProcessing = false;

        eventManager.publish('turn:changed', {
            currentPlayer: this.getCurrentPlayer()
        })
    }

    /**
     * Reseta o tabuleiro para um novo jogo
     */
    reset() {
        this.initGrid();
        this.currentPlayerIndex = 0;
        this.totalMoves = 0;
        this.isProcessing = false;
        this.isGameOver = false;
        eventManager.publish('board:reset')
    }
}