// Initialize the game
function initializeGame() {
    // ...existing code...
    setupEventListeners();
    resetGame();
}

// Setup event listeners for user inputs
function setupEventListeners() {
    document.addEventListener('keydown', handleKeyPress);
    document.getElementById('resetButton').addEventListener('click', resetGame);
}

// Handle key press events
function handleKeyPress(event) {
    switch (event.key) {
        case 'ArrowUp':
            moveUp();
            break;
        case 'ArrowDown':
            moveDown();
            break;
        case 'ArrowLeft':
            moveLeft();
            break;
        case 'ArrowRight':
            moveRight();
            break;
        default:
            return;
    }
    updateGameState();
}

// Update the game state after a move
function updateGameState() {
    if (checkGameOver()) {
        displayGameOver();
    } else {
        addRandomTile();
        renderBoard();
    }
}

// Check if the game is over
function checkGameOver() {
    // ...existing code to check if there are no valid moves left...
}

// Display game over message
function displayGameOver() {
    // ...existing code to display game over message...
}

// Reset the game
function resetGame() {
    // ...existing code to reset the game state...
    initializeBoard();
    addRandomTile();
    addRandomTile();
    renderBoard();
}

// Initialize the game board
function initializeBoard() {
    // ...existing code to initialize the game board...
}

// Add a random tile to the board
function addRandomTile() {
    // ...existing code to add a random tile to the board...
}

// Render the game board
function renderBoard() {
    // ...existing code to render the game board...
}

// Move tiles up
function moveUp() {
    // ...existing code to move tiles up...
}

// Move tiles down
function moveDown() {
    // ...existing code to move tiles down...
}

// Move tiles left
function moveLeft() {
    // ...existing code to move tiles left...
}

// Move tiles right
function moveRight() {
    // ...existing code to move tiles right...
}

// Start the game
initializeGame();

document.getElementById('resetButton').addEventListener('click', function() {
    updateStatistics();
    // ...existing code...
});

function gameOver() {
    updateStatistics();
    // ...existing code...
}

function updateStatistics() {
    const score = getCurrentScore();
    const won = checkIfWon();
    const date = new Date().toISOString(); // Use ISO format for consistency
    fetch('/api/statistics', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ score, won, date })
    });
}
