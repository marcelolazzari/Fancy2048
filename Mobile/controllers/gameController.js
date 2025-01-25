const Game = require('../models/game');

const game = new Game();

function handleMove(direction) {
    switch (direction) {
        case 'up':
            game.moveUp();
            break;
        case 'down':
            game.moveDown();
            break;
        case 'left':
            game.moveLeft();
            break;
        case 'right':
            game.moveRight();
            break;
        default:
            return;
    }
    game.updateGameState();
}

function resetGame() {
    game.reset();
}

module.exports = {
    handleMove,
    resetGame,
    // ...existing code...
};
