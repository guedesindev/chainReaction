import Cell from "./Cells.js";

export default class Bot {
    constructor(playerColor, dificulty = 'easy') {
        this.playerColor = playerColor;
        this.dificulty = dificulty;
    }

    chooseMove(grid) {
        const validMoves = this.getValidMoves(grid);
        if (validMoves.length === 0) return null;

        if (this.dificulty === 'medium') {
            return this.chooseGreedyMove(grid, validMoves);
        }

        return this.chooseRandomMove(validMoves);
    }

    getValidMoves(grid) {
        const moves = [];
        grid.forEach((row) => {
            row.forEach((cell) => {
                if (cell.isEmpty() || cell.owner === this.playerColor) {
                    moves.push({ row: cell.row, col: cell.col });
                }
            });
        });
        return moves;
    }

    chooseRandomMove(validMoves) {
        const index = Math.floor(Math.random() * validMoves.length);
        return validMoves[index];
    }

    chooseGreedyMove(grid, validMoves) {
        let bestScore = -Infinity;
        let bestMoves = [];

        validMoves.forEach((move) => {
            const score = this.evaluateMove(grid, move);
            if (score > bestScore) {
                bestScore = score;
                bestMoves = [move];
            } else if (score === bestScore) {
                bestMoves.push(move);
            }
        });

        return bestMoves[Math.floor(Math.random() * bestMoves.length)];
    }

    evaluateMove(grid, move) {
        const simulatedGrid = this.cloneGrid(grid);
        this.simulateMove(simulatedGrid, move.row, move.col, this.playerColor);

        let ownOrbs = 0;
        let opponentOrbs = 0;

        simulatedGrid.forEach((row) => {
            row.forEach((cell) => {
                if (cell.owner === this.playerColor) {
                    ownOrbs += cell.orbs;
                } else if (cell.owner) {
                    opponentOrbs += cell.orbs
                }
            });
        });
        return ownOrbs - opponentOrbs;
    }

    cloneGrid(grid) {
        const rows = grid.length;
        const cols = grid[0].length;

        return grid.map((row) => {
            return row.map((cell) => {
                const clone = new Cell(cell.row, cell.col, rows, cols);
                clone.orbs = cell.orbs;
                clone.owner = cell.owner;
                return clone;
            });
        });
    }

    simulateMove(grid, row, col, player) {
        const rows = grid.length;
        const cols = grid[0].length;
        const cell = grid[row][col];

        const needsExplosion = cell.addOrb(player);
        if (!needsExplosion) return;

        const queue = [cell];
        let safety = 500;

        while (queue.length > 0 && safety-- > 0) {
            const current = queue.shift();
            if (current.orbs < current.maxCapacity) continue;

            const attacker = current.owner;
            current.explode();

            const neighbors = this.getNeighbors(grid, current.row, current.col, rows, cols);
            neighbors.forEach((neighbor) => {
                const willExplode = neighbor.addOrb(attacker);
                if (willExplode && !queue.includes(neighbor)) {
                    queue.push(neighbor);
                }
            });
        }
    }

    getNeighbors(grid, row, col, rows, cols) {
        const neighbors = [];
        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        directions.forEach(([dRow, dCol]) => {
            const newRow = row + dRow;
            const newCol = col + dCol;
            if (newRow >= 0 && newRow < rows && newCol >= 0 && newCol < cols) {
                neighbors.push(grid[newRow][newCol]);
            }
        });
        return neighbors;
    }
}