class Game {
    constructor() {
        this.board = [];
        this.score = 0;
        // ...existing code...
    }

    reset() {
        this.board = this.initializeBoard();
        this.score = 0;
        this.addRandomTile();
        this.addRandomTile();
    }

    initializeBoard() {
        // ...existing code to initialize the board...
    }

    addRandomTile() {
        // ...existing code to add a random tile...
    }

    moveUp() {
        this.board = this.transpose(this.board);
        this.board = this.board.map(row => this.slideAndCombine(row));
        this.board = this.transpose(this.board);
        this.addRandomTile();
    }

    moveDown() {
        this.board = this.transpose(this.board);
        this.board = this.board.map(row => this.slideAndCombine(row.reverse()).reverse());
        this.board = this.transpose(this.board);
        this.addRandomTile();
    }

    moveLeft() {
        this.board = this.board.map(row => this.slideAndCombine(row));
        this.addRandomTile();
    }

    moveRight() {
        this.board = this.board.map(row => this.slideAndCombine(row.reverse()).reverse());
        this.addRandomTile();
    }

    slideAndCombine(row) {
        let newRow = row.filter(val => val);
        for (let i = 0; i < newRow.length - 1; i++) {
            if (newRow[i] === newRow[i + 1]) {
                newRow[i] *= 2;
                this.score += newRow[i];
                newRow.splice(i + 1, 1);
            }
        }
        while (newRow.length < row.length) {
            newRow.push('');
        }
        return newRow;
    }

    transpose(matrix) {
        return matrix[0].map((_, i) => matrix.map(row => row[i]));
    }

    updateGameState() {
        if (this.checkGameOver()) {
            this.displayGameOver();
        } else {
            this.addRandomTile();
        }
    }

    checkGameOver() {
        // ...existing code to check if the game is over...
    }

    displayGameOver() {
        // ...existing code to display game over message...
    }
}

module.exports = Game;
