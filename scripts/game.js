class Game {
  constructor(size) {
    // Core game properties
    this.size = size;
    this.board = this.createEmptyBoard();
    this.score = 0;
    this.bestScore = +localStorage.getItem('bestScore') || 0;
    this.moves = 0;
    this.startTime = null;

    // Game states
    this.gameState = 'ready'; // ready, playing, paused, over, won
    this.hasSavedStats = false;
    this.isPaused = false;

    // Visual settings
    this.isLightMode = localStorage.getItem('isLightMode') === 'true';
    this.hueValue = 0;
    this.isRainbowMode = false;

    // Game history and stats
    this.gameStateStack = [];
    this.maxUndoSteps = 20; // Allow multiple undos up to a limit
    this.lastMoveScore = 0;
    this.scoreDelta = 0;
    this.lastMerged = []; // Track merged positions for animations
    this.stats = JSON.parse(localStorage.getItem('gameStats')) || [];
    this.timerInterval = null;

    // Animation properties
    this.animationInProgress = false;
    this.animationFrameId = null;
    this.lastMoveDirection = null;

    // Initialize the game
    this.addEventListeners();
    this.reset();
    window.addEventListener('resize', this.debounce(() => this.refreshLayout(), 100));
    window.addEventListener('orientationchange', () => setTimeout(() => this.refreshLayout(), 300));
    this.applyTheme();
    this.updateHue();
    this.startTimer();
  }

  addEventListeners() {
    document.getElementById('reset-button').addEventListener('click', () => {
      this.reset();
      this.updateUI();
    });
    window.addEventListener('keydown', this.handleKeyPress.bind(this));
    const boardContainer = document.getElementById('board-container');
    boardContainer.addEventListener('touchstart', this.handleTouchStart.bind(this), false);
    boardContainer.addEventListener('touchend', this.handleTouchEnd.bind(this), false);
    document.addEventListener('touchmove', this.preventScroll, { passive: false });
    document.getElementById('changeColor-button').addEventListener('click', this.changeHue.bind(this));
    document.getElementById('back-button').addEventListener('click', this.undoMove.bind(this));
    document.getElementById('leaderboard-button').addEventListener('click', this.openStatisticsPage.bind(this));
    document.getElementById('rainbowMode-button').addEventListener('click', this.toggleRainbowMode.bind(this));
    document.getElementById('pause-button').addEventListener('click', this.togglePause.bind(this));
    document.getElementById('board-size-button').addEventListener('click', this.changeBoardSize.bind(this));
    document.getElementById('theme-toggle-button').addEventListener('click', this.toggleTheme.bind(this));
  }

  updateBestScore() {
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      localStorage.setItem('bestScore', this.bestScore);
    }
  }

  openStatisticsPage() {
    window.location.href = '../pages/leaderboard.html';
  }

  saveStats() {
    if (this.score > 0) {
      const endTime = new Date();
      const timeDiff = Math.floor((endTime - this.startTime) / 1000);
      const minutes = Math.floor(timeDiff / 60).toString().padStart(2, '0');
      const seconds = (timeDiff % 60).toString().padStart(2, '0');
      const time = `${minutes}:${seconds}`;

      const stat = {
        score: this.score,
        bestTile: Math.max(...this.board.flat()),
        bestScore: this.bestScore,
        date: new Date().toISOString(),
        time: time,
        moves: this.moves
      };
      
      this.stats.push(stat);
      localStorage.setItem('gameStats', JSON.stringify(this.stats));
    }
  }

  startTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    
    this.startTime = new Date();
    const timeElement = document.getElementById('time');
    
    this.timerInterval = setInterval(() => {
      if (!this.isPaused) {
        const currentTime = new Date();
        const timeDiff = Math.floor((currentTime - this.startTime) / 1000);
        const minutes = Math.floor(timeDiff / 60).toString().padStart(2, '0');
        const seconds = (timeDiff % 60).toString().padStart(2, '0');
        timeElement.textContent = `${minutes}:${seconds}`;
      }
    }, 1000);
  }

  // Board manipulation functions with improved grid creation
  createEmptyBoard() {
    const board = [];
    for (let i = 0; i < this.size; i++) {
      const row = [];
      for (let j = 0; j < this.size; j++) {
        row.push(0);
      }
      board.push(row);
    }
    return board;
  }

  reset() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    
    // Reset game state
    this.board = this.createEmptyBoard();
    this.score = 0;
    this.moves = 0;
    this.gameState = 'playing';
    this.hasSavedStats = false;
    this.isPaused = false;
    this.gameStateStack = [];
    this.lastMerged = [];
    
    // Clear any existing tiles
    const boardContainer = document.getElementById('board-container');
    boardContainer.innerHTML = '';
    
    // Create the grid cells first for proper layout
    this.createGridCells();
    
    // Add initial tiles
    this.addRandomTile();
    this.addRandomTile();
    
    // Update UI
    this.updateUI();
    
    // Hide game over message - ensure it's properly hidden
    const gameOverElement = document.getElementById('game-over');
    gameOverElement.classList.add('hidden');
    gameOverElement.classList.remove('win-state');
    
    // Restart timer
    this.startTimer();

    // Enable back button if we have game states
    this.updateBackButtonState();
  }

  // Create grid cells for better visualization
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
    if (emptyCells.length === 0) return;
    
    // Choose a random empty cell
    const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    
    // Add a new tile (90% chance for 2, 10% chance for 4)
    this.board[randomCell.row][randomCell.col] = Math.random() < 0.9 ? 2 : 4;
    
    // Create and add the tile to the DOM
    this.createTileElement(randomCell.row, randomCell.col, this.board[randomCell.row][randomCell.col], true);
  }

  createTileElement(row, col, value, isNew = false) {
    const boardContainer = document.getElementById('board-container');
    const tile = document.createElement('div');
    tile.className = 'tile';
    tile.setAttribute('data-value', value);
    tile.dataset.row = row;
    tile.dataset.col = col;
    tile.textContent = value;
    
    // Position the tile in the grid
    const gridPosition = row * this.size + col;
    const gridCell = boardContainer.children[gridPosition];
    
    if (gridCell) {
      gridCell.appendChild(tile);
      
      // Adjust font size for proper fit if needed (fallback for very large numbers)
      if (value > 128) {
        const digitCount = Math.floor(Math.log10(value)) + 1;
        const fontSize = Math.max(0.5 - (digitCount * 0.05), 0.15); // Decrease font size as digits increase
        tile.style.fontSize = `calc(var(--tile-size) * ${fontSize})`;
      }
    } else {
      console.error(`No grid cell found at position ${row}, ${col}`);
      boardContainer.appendChild(tile);
    }
    
    if (isNew) {
      tile.classList.add('new-tile');
    }
    
    return tile;
  }

  // Game mechanics
  canMove(direction) {
    // Check if any tile can move in the given direction
    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        if (this.board[i][j] !== 0) {
          let rowDelta = 0;
          let colDelta = 0;
          
          switch (direction) {
            case 'up':
              rowDelta = -1;
              break;
            case 'down':
              rowDelta = 1;
              break;
            case 'left':
              colDelta = -1;
              break;
            case 'right':
              colDelta = 1;
              break;
          }
          
          const newRow = i + rowDelta;
          const newCol = j + colDelta;
          
          if (newRow >= 0 && newRow < this.size && newCol >= 0 && newCol < this.size) {
            // Can move to empty cell
            if (this.board[newRow][newCol] === 0) return true;
            
            // Can merge with same value
            if (this.board[newRow][newCol] === this.board[i][j]) return true;
          }
        }
      }
    }
    
    return false;
  }

  move(direction) {
    if (this.animationInProgress || this.gameState !== 'playing') return false;
    
    this.lastMoveDirection = direction;
    this.saveGameState();
    
    let moved = false;
    this.lastMerged = []; // Reset merged tiles tracking
    this.lastMoveScore = this.score; // Store score before move
    
    switch (direction) {
      case 'up':
        moved = this.moveUp();
        break;
      case 'down':
        moved = this.moveDown();
        break;
      case 'left':
        moved = this.moveLeft();
        break;
      case 'right':
        moved = this.moveRight();
        break;
    }
    
    if (moved) {
      this.moves++;
      this.addRandomTile();
      this.updateUI();
      
      // Calculate score delta for popup
      this.scoreDelta = this.score - this.lastMoveScore;
      if (this.scoreDelta > 0) {
        this.showScorePopup(this.scoreDelta);
      }
      
      // Check game state after move
      this.checkGameState();
    }
    
    return moved;
  }

  moveUp() {
    let moved = false;
    for (let col = 0; col < this.size; col++) {
      for (let row = 1; row < this.size; row++) {
        if (this.board[row][col] !== 0) {
          let currentRow = row;
          while (currentRow > 0 && 
                (this.board[currentRow - 1][col] === 0 || 
                 this.board[currentRow - 1][col] === this.board[currentRow][col]) &&
                !this.isInMergedList(currentRow - 1, col)) {
            
            if (this.board[currentRow - 1][col] === 0) {
              // Move to empty space
              this.board[currentRow - 1][col] = this.board[currentRow][col];
              this.board[currentRow][col] = 0;
              currentRow--;
              moved = true;
            } else if (this.board[currentRow - 1][col] === this.board[currentRow][col]) {
              // Merge with matching tile
              this.board[currentRow - 1][col] *= 2;
              this.score += this.board[currentRow - 1][col];
              this.board[currentRow][col] = 0;
              this.lastMerged.push({ row: currentRow - 1, col: col });
              moved = true;
              break;
            }
          }
        }
      }
    }
    return moved;
  }

  moveDown() {
    let moved = false;
    for (let col = 0; col < this.size; col++) {
      for (let row = this.size - 2; row >= 0; row--) {
        if (this.board[row][col] !== 0) {
          let currentRow = row;
          while (currentRow < this.size - 1 && 
                (this.board[currentRow + 1][col] === 0 || 
                 this.board[currentRow + 1][col] === this.board[currentRow][col]) &&
                !this.isInMergedList(currentRow + 1, col)) {
            
            if (this.board[currentRow + 1][col] === 0) {
              // Move to empty space
              this.board[currentRow + 1][col] = this.board[currentRow][col];
              this.board[currentRow][col] = 0;
              currentRow++;
              moved = true;
            } else if (this.board[currentRow + 1][col] === this.board[currentRow][col]) {
              // Merge with matching tile
              this.board[currentRow + 1][col] *= 2;
              this.score += this.board[currentRow + 1][col];
              this.board[currentRow][col] = 0;
              this.lastMerged.push({ row: currentRow + 1, col: col });
              moved = true;
              break;
            }
          }
        }
      }
    }
    return moved;
  }

  moveLeft() {
    let moved = false;
    for (let row = 0; row < this.size; row++) {
      for (let col = 1; col < this.size; col++) {
        if (this.board[row][col] !== 0) {
          let currentCol = col;
          while (currentCol > 0 && 
                (this.board[row][currentCol - 1] === 0 || 
                 this.board[row][currentCol - 1] === this.board[row][currentCol]) &&
                !this.isInMergedList(row, currentCol - 1)) {
            
            if (this.board[row][currentCol - 1] === 0) {
              // Move to empty space
              this.board[row][currentCol - 1] = this.board[row][currentCol];
              this.board[row][currentCol] = 0;
              currentCol--;
              moved = true;
            } else if (this.board[row][currentCol - 1] === this.board[row][currentCol]) {
              // Merge with matching tile
              this.board[row][currentCol - 1] *= 2;
              this.score += this.board[row][currentCol - 1];
              this.board[row][currentCol] = 0;
              this.lastMerged.push({ row: row, col: currentCol - 1 });
              moved = true;
              break;
            }
          }
        }
      }
    }
    return moved;
  }

  moveRight() {
    let moved = false;
    for (let row = 0; row < this.size; row++) {
      for (let col = this.size - 2; col >= 0; col--) {
        if (this.board[row][col] !== 0) {
          let currentCol = col;
          while (currentCol < this.size - 1 && 
                (this.board[row][currentCol + 1] === 0 || 
                 this.board[row][currentCol + 1] === this.board[row][currentCol]) &&
                !this.isInMergedList(row, currentCol + 1)) {
            
            if (this.board[row][currentCol + 1] === 0) {
              // Move to empty space
              this.board[row][currentCol + 1] = this.board[row][currentCol];
              this.board[row][currentCol] = 0;
              currentCol++;
              moved = true;
            } else if (this.board[row][currentCol + 1] === this.board[row][currentCol]) {
              // Merge with matching tile
              this.board[row][currentCol + 1] *= 2;
              this.score += this.board[row][currentCol + 1];
              this.board[row][currentCol] = 0;
              this.lastMerged.push({ row: row, col: currentCol + 1 });
              moved = true;
              break;
            }
          }
        }
      }
    }
    return moved;
  }

  isInMergedList(row, col) {
    return this.lastMerged.some(pos => pos.row === row && pos.col === col);
  }

  checkGameState() {
    // Check if 2048 tile exists (win condition)
    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        if (this.board[i][j] === 2048 && this.gameState !== 'won') {
          this.gameState = 'won';
          this.showWinMessage();
          return;
        }
      }
    }
    
    // Check if board is full
    let isFull = true;
    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        if (this.board[i][j] === 0) {
          isFull = false;
          break;
        }
      }
      if (!isFull) break;
    }
    
    // If board is full, check if any moves are possible
    if (isFull) {
      const canMoveAny = 
        this.canMove('up') || 
        this.canMove('down') || 
        this.canMove('left') || 
        this.canMove('right');
      
      if (!canMoveAny) {
        this.gameState = 'over';
        this.showGameOver();
      }
    }
  }

  showGameOver() {
    const gameOverElement = document.getElementById('game-over');
    gameOverElement.textContent = 'Game Over!';
    gameOverElement.classList.remove('hidden'); // Make sure we're removing the hidden class
    gameOverElement.classList.remove('win-state'); // Remove win state if present
    
    if (!this.hasSavedStats) {
      this.saveStats();
      this.hasSavedStats = true;
    }
  }

  showWinMessage() {
    const gameOverElement = document.getElementById('game-over');
    gameOverElement.textContent = 'You Win! Continue playing?';
    gameOverElement.classList.remove('hidden');
    gameOverElement.classList.add('win-state');
    
    // Add a continue button
    const continueButton = document.createElement('button');
    continueButton.textContent = 'Continue';
    continueButton.addEventListener('click', () => {
      gameOverElement.classList.add('hidden');
      this.gameState = 'playing';
    });
    
    gameOverElement.appendChild(continueButton);
    
    if (!this.hasSavedStats) {
      this.saveStats();
      this.hasSavedStats = true;
    }
  }

  // UI and visual functions
  updateUI() {
    // Update score display
    document.getElementById('score').textContent = this.score;
    document.getElementById('best-score').textContent = this.bestScore;
    document.getElementById('moves').textContent = this.moves;
    
    // Update best score if needed
    this.updateBestScore();
    
    // Clear existing tiles but keep grid cells
    const boardContainer = document.getElementById('board-container');
    const gridCells = boardContainer.querySelectorAll('.grid-cell');
    gridCells.forEach(cell => {
      while (cell.firstChild) {
        cell.removeChild(cell.firstChild);
      }
    });
    
    // Create tile elements
    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        if (this.board[i][j] !== 0) {
          const tile = this.createTileElement(i, j, this.board[i][j]);
          
          // Add animation classes if needed
          if (this.lastMerged.some(pos => pos.row === i && pos.col === j)) {
            tile.classList.add('merged');
          } else if (this.lastMoveDirection) {
            tile.classList.add(`slide-${this.lastMoveDirection}`);
          }
        }
      }
    }
    
    // Update back button state
    this.updateBackButtonState();
  }

  updateBackButtonState() {
    const backButton = document.getElementById('back-button');
    backButton.style.display = this.gameStateStack.length > 0 ? 'flex' : 'none';
  }

  showScorePopup(value) {
    const scorePopup = document.createElement('div');
    scorePopup.className = 'score-popup';
    scorePopup.textContent = `+${value}`;
    
    // Position the popup near the score display
    const scoreElement = document.getElementById('score');
    const scoreRect = scoreElement.getBoundingClientRect();
    
    scorePopup.style.position = 'absolute';
    scorePopup.style.left = `${scoreRect.left}px`;
    scorePopup.style.top = `${scoreRect.top - 30}px`;
    
    document.body.appendChild(scorePopup);
    
    // Remove the popup after animation completes
    setTimeout(() => {
      if (scorePopup.parentElement) {
        document.body.removeChild(scorePopup);
      }
    }, 1000);
  }

  refreshLayout() {
    // Update CSS variable for responsive layout
    document.documentElement.style.setProperty('--size', this.size);
    
    // Clear and redraw the board
    this.updateUI();
  }

  // Event handlers
  handleKeyPress(event) {
    if (this.isPaused || this.gameState !== 'playing') return;
    
    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault();
        this.move('up');
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.move('down');
        break;
      case 'ArrowLeft':
        event.preventDefault();
        this.move('left');
        break;
      case 'ArrowRight':
        event.preventDefault();
        this.move('right');
        break;
    }
  }

  // Touch handling for mobile
  handleTouchStart(event) {
    if (this.isPaused || this.gameState !== 'playing') return;
    
    this.touchStartX = event.touches[0].clientX;
    this.touchStartY = event.touches[0].clientY;
    
    // Prevent default behavior to avoid scrolling
    event.preventDefault();
  }

  handleTouchEnd(event) {
    if (!this.touchStartX || !this.touchStartY || this.isPaused || this.gameState !== 'playing') return;
    
    const touchEndX = event.changedTouches[0].clientX;
    const touchEndY = event.changedTouches[0].clientY;
    
    const deltaX = touchEndX - this.touchStartX;
    const deltaY = touchEndY - this.touchStartY;
    
    // Require minimum swipe distance to trigger move
    const minSwipeDistance = 30;
    
    if (Math.abs(deltaX) < minSwipeDistance && Math.abs(deltaY) < minSwipeDistance) {
      return; // Too small movement, ignore
    }
    
    // Determine swipe direction based on which axis had larger movement
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // Horizontal swipe
      if (deltaX > 0) {
        this.move('right');
      } else {
        this.move('left');
      }
    } else {
      // Vertical swipe
      if (deltaY > 0) {
        this.move('down');
      } else {
        this.move('up');
      }
    }
    
    // Reset touch start position
    this.touchStartX = null;
    this.touchStartY = null;
    
    // Prevent default behavior
    event.preventDefault();
  }

  preventScroll(event) {
    // Prevent scrolling when touching the game board
    if (event.target.closest('#board-container')) {
      event.preventDefault();
    }
  }

  // Game state management
  saveGameState() {
    // Create a deep copy of the current board
    const boardCopy = JSON.parse(JSON.stringify(this.board));
    
    // Save the current game state
    this.gameStateStack.push({
      board: boardCopy,
      score: this.score,
      moves: this.moves
    });
    
    // Limit the undo history
    if (this.gameStateStack.length > this.maxUndoSteps) {
      this.gameStateStack.shift();
    }
  }

  undoMove() {
    if (this.gameStateStack.length === 0 || this.animationInProgress) return;
    
    // Get the last game state
    const lastState = this.gameStateStack.pop();
    
    // Restore the game state
    this.board = lastState.board;
    this.score = lastState.score;
    this.moves = lastState.moves;
    
    // Update the UI
    this.updateUI();
    
    // If game was over, set it back to playing
    if (this.gameState === 'over' || this.gameState === 'won') {
      this.gameState = 'playing';
      document.getElementById('game-over').classList.add('hidden');
    }
  }

  // Theme and visual effects
  applyTheme() {
    if (this.isLightMode) {
      document.body.classList.add('light-mode');
    } else {
      document.body.classList.remove('light-mode');
    }
  }

  toggleTheme() {
    this.isLightMode = !this.isLightMode;
    localStorage.setItem('isLightMode', this.isLightMode);
    this.applyTheme();
  }

  updateHue() {
    document.documentElement.style.setProperty('--hue-value', this.hueValue);
    
    // Update color button color
    const colorButton = document.getElementById('changeColor-button');
    colorButton.style.color = `hsl(${this.hueValue}, 70%, 50%)`;
    
    if (this.isRainbowMode) {
      this.startRainbowMode();
    }
  }

  changeHue() {
    // Cycle through hue values (0-360)
    this.hueValue = (this.hueValue + 60) % 360;
    this.updateHue();
  }

  toggleRainbowMode() {
    this.isRainbowMode = !this.isRainbowMode;
    
    if (this.isRainbowMode) {
      this.startRainbowMode();
    } else {
      this.stopRainbowMode();
    }
  }

  startRainbowMode() {
    if (this.rainbowInterval) {
      clearInterval(this.rainbowInterval);
    }
    
    this.rainbowInterval = setInterval(() => {
      this.hueValue = (this.hueValue + 1) % 360;
      this.updateHue();
    }, 50);
  }

  stopRainbowMode() {
    if (this.rainbowInterval) {
      clearInterval(this.rainbowInterval);
      this.rainbowInterval = null;
    }
  }

  togglePause() {
    this.isPaused = !this.isPaused;
    
    const boardContainer = document.getElementById('board-container');
    const pauseButton = document.getElementById('pause-button');
    
    if (this.isPaused) {
      boardContainer.style.pointerEvents = 'none';
      boardContainer.style.opacity = '0.5';
      pauseButton.innerHTML = '<i class="fas fa-play"></i>';
    } else {
      boardContainer.style.pointerEvents = '';
      boardContainer.style.opacity = '';
      pauseButton.innerHTML = '<i class="fas fa-pause"></i>';
    }
  }

  changeBoardSize() {
    // Cycle through board sizes (3x3, 4x4, 5x5)
    const sizes = [3, 4, 5];
    const currentIndex = sizes.indexOf(this.size);
    const nextIndex = (currentIndex + 1) % sizes.length;
    this.size = sizes[nextIndex];
    
    // Reset the game with the new board size
    this.reset();
    this.refreshLayout();
  }

  // Utility function for throttling events
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        timeout = null;
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
}

// Initialize the game when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.game = new Game(4);
});