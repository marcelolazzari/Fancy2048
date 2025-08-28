// Fancy2048 - Enhanced Game Initialization and Layout Fix
// This script ensures proper game initialization and UI layout

console.log('🎮 Fancy2048 - Loading with Layout Fixes...');

// Enhanced Game Class with Better UI Management
class Game {
  constructor(size) {
    console.log(`Initializing game with size: ${size}x${size}`);
    
    // Core game properties
    this.size = size;
    this.board = this.createEmptyBoard();
    this.score = 0;
    this.bestScore = +localStorage.getItem('bestScore') || 0;
    this.moves = 0;
    this.startTime = null;

    // Game states
    this.gameState = 'ready';
    this.hasSavedStats = false;
    this.isPaused = false;
    
    // Animation and UI state
    this.animationInProgress = false;
    this.lastMoveDirection = null;
    this.lastMerged = [];
    
    // Initialize UI components
    this.initializeUI();
    this.setupEventListeners();
    this.updateUI();
    
    console.log('✅ Game initialized successfully');
  }
  
  initializeUI() {
    console.log('Setting up UI...');
    
    // Set CSS custom property for board size
    document.documentElement.style.setProperty('--size', this.size);
    
    // Clear and setup board container
    this.setupBoardContainer();
    
    // Update score display
    this.updateScoreDisplay();
    
    // Add initial tiles
    this.addRandomTile();
    this.addRandomTile();
    
    console.log('✅ UI setup complete');
  }
  
  setupBoardContainer() {
    const boardContainer = document.getElementById('board-container');
    if (!boardContainer) {
      console.error('❌ Board container not found');
      return;
    }
    
    // Clear existing content
    boardContainer.innerHTML = '';
    
    // Update CSS grid properties
    boardContainer.style.gridTemplateColumns = `repeat(${this.size}, 1fr)`;
    boardContainer.style.gridTemplateRows = `repeat(${this.size}, 1fr)`;
    
    // Create grid cells
    this.createGridCells();
    
    console.log(`✅ Board container setup for ${this.size}x${this.size} grid`);
  }
  
  createGridCells() {
    const boardContainer = document.getElementById('board-container');
    
    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        const cell = document.createElement('div');
        cell.className = 'grid-cell';
        cell.dataset.row = i;
        cell.dataset.col = j;
        boardContainer.appendChild(cell);
      }
    }
  }
  
  createEmptyBoard() {
    return Array(this.size).fill(null).map(() => Array(this.size).fill(0));
  }
  
  addRandomTile() {
    const emptyCells = [];
    
    // Find all empty cells
    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        if (this.board[i][j] === 0) {
          emptyCells.push({ row: i, col: j });
        }
      }
    }
    
    // If there are no empty cells, return
    if (emptyCells.length === 0) return false;
    
    // Pick a random empty cell
    const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    
    // Add either 2 or 4 (90% chance of 2, 10% chance of 4)
    const value = Math.random() < 0.9 ? 2 : 4;
    this.board[randomCell.row][randomCell.col] = value;
    
    return true;
  }
  
  createTileElement(row, col, value, isNew = false) {
    const tile = document.createElement('div');
    tile.className = `tile ${isNew ? 'new-tile' : ''}`;
    tile.dataset.value = value;
    tile.textContent = value;
    
    // Position the tile
    const gridCell = document.querySelector(`.grid-cell[data-row="${row}"][data-col="${col}"]`);
    if (gridCell) {
      gridCell.appendChild(tile);
    }
    
    return tile;
  }
  
  updateUI() {
    console.log('Updating UI...');
    
    // Update score display
    this.updateScoreDisplay();
    
    // Clear existing tiles
    const tiles = document.querySelectorAll('.tile');
    tiles.forEach(tile => tile.remove());
    
    // Create new tiles
    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        if (this.board[i][j] !== 0) {
          this.createTileElement(i, j, this.board[i][j]);
        }
      }
    }
    
    // Check game state
    this.checkGameState();
  }
  
  updateScoreDisplay() {
    const scoreElement = document.getElementById('score');
    const bestScoreElement = document.getElementById('best-score');
    const movesElement = document.getElementById('moves');
    const timeElement = document.getElementById('time');
    
    if (scoreElement) scoreElement.textContent = this.score.toLocaleString();
    if (bestScoreElement) bestScoreElement.textContent = this.bestScore.toLocaleString();
    if (movesElement) movesElement.textContent = this.moves;
    if (timeElement) {
      const elapsed = this.startTime ? Math.floor((Date.now() - this.startTime) / 1000) : 0;
      const minutes = Math.floor(elapsed / 60);
      const seconds = elapsed % 60;
      timeElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
  }
  
  setupEventListeners() {
    console.log('Setting up event listeners...');
    
    // Keyboard events
    document.addEventListener('keydown', (e) => this.handleKeyPress(e));
    
    // Button events
    const resetButton = document.getElementById('reset-button');
    if (resetButton) {
      resetButton.addEventListener('click', () => this.reset());
    }
    
    const changeColorButton = document.getElementById('changeColor-button');
    if (changeColorButton) {
      changeColorButton.addEventListener('click', () => this.changeHue());
    }
    
    const backButton = document.getElementById('back-button');
    if (backButton) {
      backButton.addEventListener('click', () => this.undoMove());
    }
    
    const pauseButton = document.getElementById('pause-button');
    if (pauseButton) {
      pauseButton.addEventListener('click', () => this.togglePause());
    }
    
    const boardSizeButton = document.getElementById('board-size-button');
    if (boardSizeButton) {
      boardSizeButton.addEventListener('click', () => this.changeBoardSize());
    }
    
    const themeButton = document.getElementById('theme-toggle-button');
    if (themeButton) {
      themeButton.addEventListener('click', () => this.toggleTheme());
    }
    
    console.log('✅ Event listeners setup complete');
  }
  
  handleKeyPress(event) {
    if (this.isPaused) return;
    
    const key = event.key.toLowerCase();
    let direction = null;
    
    switch (key) {
      case 'arrowup':
      case 'w':
        direction = 'up';
        break;
      case 'arrowdown':
      case 's':
        direction = 'down';
        break;
      case 'arrowleft':
      case 'a':
        direction = 'left';
        break;
      case 'arrowright':
      case 'd':
        direction = 'right';
        break;
      case ' ':
        event.preventDefault();
        this.togglePause();
        return;
      case 'r':
        this.reset();
        return;
      case 'u':
        this.undoMove();
        return;
    }
    
    if (direction) {
      event.preventDefault();
      this.move(direction);
    }
  }
  
  move(direction) {
    if (this.gameState !== 'ready' && this.gameState !== 'playing') return;
    
    console.log(`Moving: ${direction}`);
    
    // Start timer if not started
    if (!this.startTime) {
      this.startTime = Date.now();
      this.gameState = 'playing';
    }
    
    const previousBoard = this.board.map(row => row.slice());
    let moved = false;
    
    // Perform the move based on direction
    switch (direction) {
      case 'left':
        moved = this.moveLeft();
        break;
      case 'right':
        moved = this.moveRight();
        break;
      case 'up':
        moved = this.moveUp();
        break;
      case 'down':
        moved = this.moveDown();
        break;
    }
    
    if (moved) {
      this.moves++;
      this.addRandomTile();
      this.updateUI();
      
      // Update best score
      if (this.score > this.bestScore) {
        this.bestScore = this.score;
        localStorage.setItem('bestScore', this.bestScore);
      }
    }
  }
  
  moveLeft() {
    let moved = false;
    
    for (let i = 0; i < this.size; i++) {
      const row = this.board[i].filter(val => val !== 0);
      
      // Merge tiles
      for (let j = 0; j < row.length - 1; j++) {
        if (row[j] === row[j + 1]) {
          row[j] *= 2;
          this.score += row[j];
          row[j + 1] = 0;
        }
      }
      
      // Filter out zeros again and pad with zeros
      const newRow = row.filter(val => val !== 0);
      while (newRow.length < this.size) {
        newRow.push(0);
      }
      
      // Check if row changed
      for (let j = 0; j < this.size; j++) {
        if (this.board[i][j] !== newRow[j]) {
          moved = true;
        }
        this.board[i][j] = newRow[j];
      }
    }
    
    return moved;
  }
  
  moveRight() {
    let moved = false;
    
    for (let i = 0; i < this.size; i++) {
      const row = this.board[i].filter(val => val !== 0).reverse();
      
      // Merge tiles
      for (let j = 0; j < row.length - 1; j++) {
        if (row[j] === row[j + 1]) {
          row[j] *= 2;
          this.score += row[j];
          row[j + 1] = 0;
        }
      }
      
      // Filter out zeros again and pad with zeros
      const newRow = row.filter(val => val !== 0);
      while (newRow.length < this.size) {
        newRow.push(0);
      }
      
      newRow.reverse();
      
      // Check if row changed
      for (let j = 0; j < this.size; j++) {
        if (this.board[i][j] !== newRow[j]) {
          moved = true;
        }
        this.board[i][j] = newRow[j];
      }
    }
    
    return moved;
  }
  
  moveUp() {
    let moved = false;
    
    for (let j = 0; j < this.size; j++) {
      const column = [];
      for (let i = 0; i < this.size; i++) {
        column.push(this.board[i][j]);
      }
      
      const col = column.filter(val => val !== 0);
      
      // Merge tiles
      for (let i = 0; i < col.length - 1; i++) {
        if (col[i] === col[i + 1]) {
          col[i] *= 2;
          this.score += col[i];
          col[i + 1] = 0;
        }
      }
      
      // Filter out zeros again and pad with zeros
      const newCol = col.filter(val => val !== 0);
      while (newCol.length < this.size) {
        newCol.push(0);
      }
      
      // Check if column changed
      for (let i = 0; i < this.size; i++) {
        if (this.board[i][j] !== newCol[i]) {
          moved = true;
        }
        this.board[i][j] = newCol[i];
      }
    }
    
    return moved;
  }
  
  moveDown() {
    let moved = false;
    
    for (let j = 0; j < this.size; j++) {
      const column = [];
      for (let i = 0; i < this.size; i++) {
        column.push(this.board[i][j]);
      }
      
      const col = column.filter(val => val !== 0).reverse();
      
      // Merge tiles
      for (let i = 0; i < col.length - 1; i++) {
        if (col[i] === col[i + 1]) {
          col[i] *= 2;
          this.score += col[i];
          col[i + 1] = 0;
        }
      }
      
      // Filter out zeros again and pad with zeros
      const newCol = col.filter(val => val !== 0);
      while (newCol.length < this.size) {
        newCol.push(0);
      }
      
      newCol.reverse();
      
      // Check if column changed
      for (let i = 0; i < this.size; i++) {
        if (this.board[i][j] !== newCol[i]) {
          moved = true;
        }
        this.board[i][j] = newCol[i];
      }
    }
    
    return moved;
  }
  
  checkGameState() {
    // Check for win condition
    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        if (this.board[i][j] === 2048 && this.gameState !== 'won') {
          this.gameState = 'won';
          this.showWinMessage();
          return;
        }
      }
    }
    
    // Check for game over
    if (this.isGameOver()) {
      this.gameState = 'over';
      this.showGameOver();
    }
  }
  
  isGameOver() {
    // Check if there are any empty cells
    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        if (this.board[i][j] === 0) {
          return false;
        }
      }
    }
    
    // Check if any adjacent cells can be merged
    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        const current = this.board[i][j];
        
        // Check right
        if (j < this.size - 1 && this.board[i][j + 1] === current) {
          return false;
        }
        
        // Check down
        if (i < this.size - 1 && this.board[i + 1][j] === current) {
          return false;
        }
      }
    }
    
    return true;
  }
  
  showWinMessage() {
    console.log('🎉 You won!');
    // Implementation for win message display
  }
  
  showGameOver() {
    console.log('💀 Game Over');
    const gameOverElement = document.getElementById('game-over');
    if (gameOverElement) {
      gameOverElement.classList.remove('hidden');
    }
  }
  
  reset() {
    console.log('🔄 Resetting game...');
    this.board = this.createEmptyBoard();
    this.score = 0;
    this.moves = 0;
    this.startTime = null;
    this.gameState = 'ready';
    
    // Hide game over message
    const gameOverElement = document.getElementById('game-over');
    if (gameOverElement) {
      gameOverElement.classList.add('hidden');
    }
    
    // Add initial tiles
    this.addRandomTile();
    this.addRandomTile();
    
    this.updateUI();
  }
  
  // Placeholder methods for advanced features
  undoMove() {
    console.log('↶ Undo move');
  }
  
  togglePause() {
    this.isPaused = !this.isPaused;
    console.log(this.isPaused ? '⏸️ Paused' : '▶️ Resumed');
  }
  
  changeBoardSize() {
    console.log('⊞ Changing board size');
    // Cycle through sizes: 4 -> 5 -> 3 -> 4
    const sizes = [3, 4, 5];
    const currentIndex = sizes.indexOf(this.size);
    const nextSize = sizes[(currentIndex + 1) % sizes.length];
    
    this.size = nextSize;
    this.reset();
    this.setupBoardContainer();
    this.updateUI();
  }
  
  toggleTheme() {
    console.log('🌓 Toggling theme');
    document.body.classList.toggle('light-mode');
  }
  
  changeHue() {
    console.log('🎨 Changing hue');
    const currentHue = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--hue-value')) || 0;
    const newHue = (currentHue + 45) % 360;
    document.documentElement.style.setProperty('--hue-value', newHue);
  }
}

// Enhanced initialization with error handling
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 DOM loaded, initializing Fancy2048...');
  
  try {
    // Check if required elements exist
    const requiredElements = ['board-container', 'score', 'best-score'];
    const missingElements = requiredElements.filter(id => !document.getElementById(id));
    
    if (missingElements.length > 0) {
      console.error('❌ Missing required elements:', missingElements);
      return;
    }
    
    // Initialize the game
    setTimeout(() => {
      window.game = new Game(4);
      console.log('🎮 Game ready to play!');
    }, 100);
    
  } catch (error) {
    console.error('❌ Failed to initialize game:', error);
  }
});

// Additional debugging helpers
window.debugGame = {
  checkLayout: () => {
    const boardContainer = document.getElementById('board-container');
    const computedStyle = getComputedStyle(boardContainer);
    
    console.log('Board Container Layout Debug:');
    console.log('Display:', computedStyle.display);
    console.log('Grid Template Columns:', computedStyle.gridTemplateColumns);
    console.log('Grid Template Rows:', computedStyle.gridTemplateRows);
    console.log('Gap:', computedStyle.gap);
    console.log('Width:', computedStyle.width);
    console.log('Height:', computedStyle.height);
  },
  
  checkTiles: () => {
    const tiles = document.querySelectorAll('.tile');
    console.log(`Found ${tiles.length} tiles:`);
    tiles.forEach((tile, index) => {
      const rect = tile.getBoundingClientRect();
      console.log(`Tile ${index}: value=${tile.dataset.value}, position=${tile.style.transform}, size=${rect.width}x${rect.height}`);
    });
  }
};

console.log('✅ Enhanced Fancy2048 script loaded. Type window.debugGame.checkLayout() to debug layout.');
