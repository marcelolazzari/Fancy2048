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
        // ...existing code to handle movement logic...
        this.addRandomTile();
        this.updateUI();
    }

    // ...existing code...
}
