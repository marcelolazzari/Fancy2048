class Game {
    constructor() {
        this.grid = this.createEmptyGrid();
        this.addRandomTile();
        this.addRandomTile();
        this.updateUI();
    }

    createEmptyGrid() {
        return Array.from({ length: 4 }, () => Array(4).fill(null));
    }

    addRandomTile() {
        const emptyCells = [];
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 4; col++) {
                if (this.grid[row][col] === null) {
                    emptyCells.push({ row, col });
                }
            }
        }
        if (emptyCells.length > 0) {
            const { row, col } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
            this.grid[row][col] = Math.random() < 0.9 ? 2 : 4;
        }
    }

    updateUI() {
        // ...existing code to update the UI based on this.grid...
    }

    move(direction) {
        // Integrate move logic from the 2048 repository
        const vector = this.getVector(direction);
        const traversals = this.buildTraversals(vector);
        let moved = false;

        this.prepareTiles();

        traversals.x.forEach(x => {
            traversals.y.forEach(y => {
                const cell = { x, y };
                const tile = this.grid[cell.x][cell.y];

                if (tile) {
                    const positions = this.findFarthestPosition(cell, vector);
                    const next = this.grid[positions.next.x][positions.next.y];

                    if (next && next.value === tile.value && !next.mergedFrom) {
                        const merged = new Tile(positions.next, tile.value * 2);
                        merged.mergedFrom = [tile, next];

                        this.grid[positions.next.x][positions.next.y] = merged;
                        this.grid[cell.x][cell.y] = null;

                        tile.updatePosition(positions.next);

                        if (merged.value === 2048) {
                            this.won = true;
                        }
                    } else {
                        this.moveTile(tile, positions.farthest);
                    }

                    if (!this.positionsEqual(cell, tile)) {
                        moved = true;
                    }
                }
            });
        });

        if (moved) {
            this.addRandomTile();

            if (!this.movesAvailable()) {
                this.over = true;
            }

            this.updateUI();
        }
    }

    getVector(direction) {
        const map = {
            0: { x: 0, y: -1 }, // Up
            1: { x: 1, y: 0 },  // Right
            2: { x: 0, y: 1 },  // Down
            3: { x: -1, y: 0 }  // Left
        };
        return map[direction];
    }

    buildTraversals(vector) {
        const traversals = { x: [], y: [] };

        for (let pos = 0; pos < 4; pos++) {
            traversals.x.push(pos);
            traversals.y.push(pos);
        }

        if (vector.x === 1) traversals.x = traversals.x.reverse();
        if (vector.y === 1) traversals.y = traversals.y.reverse();

        return traversals;
    }

    prepareTiles() {
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 4; col++) {
                const tile = this.grid[row][col];
                if (tile) {
                    tile.mergedFrom = null;
                    tile.savePosition();
                }
            }
        }
    }

    findFarthestPosition(cell, vector) {
        let previous;

        do {
            previous = cell;
            cell = { x: previous.x + vector.x, y: previous.y + vector.y };
        } while (this.withinBounds(cell) && this.cellAvailable(cell));

        return {
            farthest: previous,
            next: cell
        };
    }

    moveTile(tile, cell) {
        this.grid[tile.x][tile.y] = null;
        this.grid[cell.x][cell.y] = tile;
        tile.updatePosition(cell);
    }

    withinBounds(cell) {
        return cell.x >= 0 && cell.x < 4 && cell.y >= 0 && cell.y < 4;
    }

    cellAvailable(cell) {
        return !this.grid[cell.x][cell.y];
    }

    positionsEqual(first, second) {
        return first.x === second.x && first.y === second.y;
    }

    movesAvailable() {
        return this.cellsAvailable() || this.tileMatchesAvailable();
    }

    cellsAvailable() {
        return this.grid.some(row => row.some(cell => cell === null));
    }

    tileMatchesAvailable() {
        for (let x = 0; x < 4; x++) {
            for (let y = 0; y < 4; y++) {
                const tile = this.grid[x][y];
                if (tile) {
                    for (let direction = 0; direction < 4; direction++) {
                        const vector = this.getVector(direction);
                        const cell = { x: x + vector.x, y: y + vector.y };
                        const other = this.grid[cell.x] && this.grid[cell.x][cell.y];

                        if (other && other.value === tile.value) {
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    }

    // ...existing code...
}
