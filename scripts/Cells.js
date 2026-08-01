export default class Cell {
    constructor(row, col, totalRows, totalCols) {
        this.row = row;
        this.col = col;

        this.orbs = 0;
        this.owner = null;

        this.maxCapacity = this.calculateMaxCapacity(totalRows, totalCols);
    }

    /**
     * Calcula a capacidade máxima de esferas antes de explodir
     * Regra: Capacidade = (Número de vizinhos cartesianos) - 1
     * 
     * @param {number} totalRows - Total de linhas da Matriz
     * @param {number} totalCols - Total de colunas da Matriz
     * @returns {number} - Capacidade máxima (1 para cantos, 2 para bordas e 3 para centro)
     */
    calculateMaxCapacity(totalRows, totalCols) {
        const isTopOrBottomEdge = this.row === 0 || this.row === totalRows - 1;
        const isLeftOrRightEdge = this.col === 0 || this.col === totalCols - 1;

        if (isTopOrBottomEdge && isLeftOrRightEdge) {
            return 1;
        }

        if (isTopOrBottomEdge || isLeftOrRightEdge) {
            return 2;
        }

        return 3
    }

    /**
     * Adiciona uma esfera à célula e define um proprietário.
     * 
     * @param {string} playerColor - Cor/ID do jogador que seleciona a célula
     * @returns {boolean} Retorna 'true' se a célula atingiu o limite e precisa explodir
     */
    addOrb(playerColor) {
        this.orbs += 1;
        this.owner = playerColor

        return this.orbs > this.maxCapacity
    }

    /**
     * Esvazia a célula após uma explosão
     */
    explode() {
        this.orbs = 0;
        this.owner = null
    }

    /**
     * Retorna a célula para o estado inicial do jogo.
     */
    reset() {
        this.orbs = 0;
        this.owner = null
    }

    /**
     * verificar se a célula está vazia.
     * @returns {boolean}
     */
    isEmpty() {
        return this.orbs === 0;
    }
}