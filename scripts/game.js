/**
 * Simplified Fancy2048 Game Engine - Core functionality only
 * This is a cleaned up version focusing on essential game mechanics
 */
class Game {
  constructor(size = 4) {
    console.log(`🎮 Initializing Fancy2048 with size: ${size}x${size}`);
    
    // Core game properties
    this.size = size;
    this.board = this.createEmptyBoard();
    this.score = 0;
    this.bestScore = this.loadBestScore();
    this.moves = 0;
    this.startTime = Date.now();

    // Game states
    this.gameState = 'playing';
    this.isPaused = false;
    this.gameWon = false;
    
    // Game history for undo
    this.gameStateStack = [];
    this.maxUndoSteps = 10;
    
    // Visual settings
    this.isLightMode = localStorage.getItem('isLightMode') === 'true';
    this.hueValue = parseInt(localStorage.getItem('hueValue')) || 0;
    
    // Touch handling
    this.touchStartX = null;
    this.touchStartY = null;
    
    // Timer
    this.timerInterval = null;
    
    // Autoplay
    this.isAutoPlaying = false;
    this.autoPlayInterval = null;
    this.autoPlaySpeed = 800;
    this.speedMultipliers = [1, 1.5, 2, 4, 8, 'MAX'];
    this.currentSpeedIndex = 0;
    
    // AI systems
    this.enhancedAI = null;
    this.aiLearningSystem = null;
    this.aiDifficulty = localStorage.getItem('aiDifficulty') || 'normal';

    // Initialize the game
    this.initializeGame();
  }

  initializeGame() {
    try {
      console.log('Setting up game...');
      
      // Initialize UI components
      this.initializeUI();
      this.addEventListeners();
      this.applyTheme();
      
      // Start the game
      this.addRandomTile();
      this.addRandomTile();
      this.updateUI();
      this.startTimer();
      
      // Initialize AI systems
      this.initializeAISystems();
      
      console.log('✅ Game initialized successfully');
    } catch (error) {
      console.error('❌ Game initialization failed:', error);
      this.handleInitializationFailure(error);
    }
  }

  initializeUI() {
    console.log('Setting up UI...');
    
    // Set CSS custom property for board size
    document.documentElement.style.setProperty('--size', this.size);
    
    // Setup board container
    this.setupBoardContainer();
    
    // Update score display
    this.updateScoreDisplay();
    
    console.log('✅ UI setup complete');
  }

  setupBoardContainer() {
    const boardContainer = document.getElementById('board-container');
    if (!boardContainer) {
      throw new Error('Board container not found!');
    }
    
    // Clear existing content
    boardContainer.innerHTML = '';
    
    // Update CSS for grid size
    boardContainer.style.gridTemplateColumns = `repeat(${this.size}, 1fr)`;
    boardContainer.style.gridTemplateRows = `repeat(${this.size}, 1fr)`;
    
    // Create grid cells
    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        const gridCell = document.createElement('div');
        gridCell.className = 'grid-cell';
        gridCell.setAttribute('data-row', i);
        gridCell.setAttribute('data-col', j);
        boardContainer.appendChild(gridCell);
      }
    }
    
    console.log(`✅ Board container setup for ${this.size}x${this.size} grid`);
  }

  addEventListeners() {
    console.log('Adding event listeners...');
    
    // Button event listeners
    const buttons = {
      'reset-button': () => this.resetGame(),
      'back-button': () => this.undoMove(),
      'pause-button': () => this.togglePause(),
      'autoplay-button': () => this.toggleAutoPlay(),
      'speed-button': () => this.cycleSpeed(),
      'changeColor-button': () => this.cycleHue(),
      'theme-toggle-button': () => this.toggleTheme(),
      'board-size-button': () => this.cycleBoardSize(),
      'ai-difficulty-button': () => this.cycleAIDifficulty(),
      'export-stats-button': () => this.exportStats()
    };

    Object.entries(buttons).forEach(([id, handler]) => {
      const button = document.getElementById(id);
      if (button) {
        button.addEventListener('click', handler);
      }
    });

    // Touch/swipe handling
    const boardContainer = document.getElementById('board-container');
    if (boardContainer) {
      boardContainer.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
      boardContainer.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: true });
    }

    console.log('✅ Event listeners added');
  }

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
    
    // If no empty cells, return
    if (emptyCells.length === 0) return;
    
    // Choose random empty cell
    const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    
    // Add new tile (90% chance for 2, 10% chance for 4)
    this.board[randomCell.row][randomCell.col] = Math.random() < 0.9 ? 2 : 4;
    
    console.log(`Added tile ${this.board[randomCell.row][randomCell.col]} at (${randomCell.row}, ${randomCell.col})`);
  }

  updateUI() {
    // Update score display
    this.updateScoreDisplay();
    
    // Update board display
    this.updateBoardDisplay();
    
    // Update button states
    this.updateButtonStates();
  }

  updateScoreDisplay() {
    const elements = {
      'score': this.score,
      'best-score': this.bestScore,
      'moves': this.moves,
      'time': this.getFormattedTime()
    };

    Object.entries(elements).forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (element) {
        element.textContent = value;
      }
    });

    // Update best score if needed
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      this.saveBestScore();
    }
  }

  updateBoardDisplay() {
    const boardContainer = document.getElementById('board-container');
    if (!boardContainer) return;

    // Clear existing tiles
    const tiles = boardContainer.querySelectorAll('.tile');
    tiles.forEach(tile => tile.remove());

    // Create new tiles
    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        if (this.board[i][j] !== 0) {
          this.createTileElement(i, j, this.board[i][j]);
        }
      }
    }
  }

  createTileElement(row, col, value) {
    const boardContainer = document.getElementById('board-container');
    const gridPosition = row * this.size + col;
    const gridCell = boardContainer.children[gridPosition];
    
    if (!gridCell) {
      console.error(`No grid cell found at position ${row}, ${col}`);
      return;
    }

    const tile = document.createElement('div');
    tile.className = 'tile';
    tile.setAttribute('data-value', value);
    tile.textContent = value;
    
    // Apply tile styling based on value
    tile.classList.add(`tile-${value}`);
    
    // Position tile
    gridCell.appendChild(tile);
    
    return tile;
  }

  move(direction) {
    if (this.gameState !== 'playing' || this.isPaused) return false;

    // Save current state for undo
    this.saveGameState();

    const previousBoard = JSON.parse(JSON.stringify(this.board));
    let moved = false;
    let scoreGained = 0;

    // Perform move based on direction
    switch (direction) {
      case 'up':
        for (let j = 0; j < this.size; j++) {
          const column = [];
          for (let i = 0; i < this.size; i++) {
            column.push(this.board[i][j]);
          }
          const result = this.slideArray(column);
          for (let i = 0; i < this.size; i++) {
            this.board[i][j] = result.array[i];
          }
          moved = moved || result.moved;
          scoreGained += result.score;
        }
        break;
      case 'down':
        for (let j = 0; j < this.size; j++) {
          const column = [];
          for (let i = this.size - 1; i >= 0; i--) {
            column.push(this.board[i][j]);
          }
          const result = this.slideArray(column);
          for (let i = 0; i < this.size; i++) {
            this.board[this.size - 1 - i][j] = result.array[i];
          }
          moved = moved || result.moved;
          scoreGained += result.score;
        }
        break;
      case 'left':
        for (let i = 0; i < this.size; i++) {
          const result = this.slideArray(this.board[i]);
          this.board[i] = result.array;
          moved = moved || result.moved;
          scoreGained += result.score;
        }
        break;
      case 'right':
        for (let i = 0; i < this.size; i++) {
          const result = this.slideArray(this.board[i].slice().reverse());
          this.board[i] = result.array.reverse();
          moved = moved || result.moved;
          scoreGained += result.score;
        }
        break;
    }

    if (moved) {
      this.score += scoreGained;
      this.moves++;
      this.addRandomTile();
      this.updateUI();
      
      console.log(`Move ${direction}: Score +${scoreGained}, Total: ${this.score}`);
      
      // Check win/lose conditions
      this.checkGameState();
      
      return true;
    }
    
    return false;
  }

  slideArray(array) {
    const filtered = array.filter(val => val !== 0);
    const missing = this.size - filtered.length;
    const zeros = new Array(missing).fill(0);
    const newArray = filtered.concat(zeros);
    
    let score = 0;
    let moved = false;

    // Check if array changed by filtering
    for (let i = 0; i < this.size; i++) {
      if (array[i] !== newArray[i]) {
        moved = true;
        break;
      }
    }

    // Merge adjacent identical tiles
    for (let i = 0; i < this.size - 1; i++) {
      if (newArray[i] !== 0 && newArray[i] === newArray[i + 1]) {
        newArray[i] *= 2;
        newArray[i + 1] = 0;
        score += newArray[i];
        moved = true;
      }
    }

    // Filter zeros again after merging
    if (moved) {
      const finalFiltered = newArray.filter(val => val !== 0);
      const finalMissing = this.size - finalFiltered.length;
      const finalZeros = new Array(finalMissing).fill(0);
      return { 
        array: finalFiltered.concat(finalZeros), 
        moved: true, 
        score 
      };
    }

    return { array: newArray, moved, score };
  }

  checkGameState() {
    // Check for win condition (2048 tile)
    if (!this.gameWon) {
      for (let i = 0; i < this.size; i++) {
        for (let j = 0; j < this.size; j++) {
          if (this.board[i][j] === 2048) {
            this.gameWon = true;
            this.showWinMessage();
            return;
          }
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
    // Check for empty cells
    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        if (this.board[i][j] === 0) {
          return false;
        }
      }
    }

    // Check for possible merges
    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        const current = this.board[i][j];
        
        // Check right neighbor
        if (j < this.size - 1 && current === this.board[i][j + 1]) {
          return false;
        }
        
        // Check bottom neighbor
        if (i < this.size - 1 && current === this.board[i + 1][j]) {
          return false;
        }
      }
    }

    return true;
  }

  // Check if a move in a specific direction is possible
  canMove(direction) {
    const originalBoard = JSON.parse(JSON.stringify(this.board));
    const testBoard = this.simulateMove(direction);
    
    // Compare boards to see if the move would change anything
    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        if (originalBoard[i][j] !== testBoard[i][j]) {
          return true;
        }
      }
    }
    
    return false;
  }

  // Simulate a move without actually performing it
  simulateMove(direction) {
    const boardCopy = JSON.parse(JSON.stringify(this.board));
    
    if (direction === 'left') {
      for (let i = 0; i < this.size; i++) {
        boardCopy[i] = this.slideArray(boardCopy[i]);
      }
    } else if (direction === 'right') {
      for (let i = 0; i < this.size; i++) {
        boardCopy[i] = this.slideArray(boardCopy[i].slice().reverse()).reverse();
      }
    } else if (direction === 'up') {
      for (let j = 0; j < this.size; j++) {
        const column = [];
        for (let i = 0; i < this.size; i++) {
          column.push(boardCopy[i][j]);
        }
        const newColumn = this.slideArray(column);
        for (let i = 0; i < this.size; i++) {
          boardCopy[i][j] = newColumn[i];
        }
      }
    } else if (direction === 'down') {
      for (let j = 0; j < this.size; j++) {
        const column = [];
        for (let i = 0; i < this.size; i++) {
          column.push(boardCopy[i][j]);
        }
        const newColumn = this.slideArray(column.slice().reverse()).reverse();
        for (let i = 0; i < this.size; i++) {
          boardCopy[i][j] = newColumn[i];
        }
      }
    }
    
    return boardCopy;
  }

  showWinMessage() {
    const overlay = document.getElementById('game-won');
    if (overlay) {
      overlay.classList.remove('hidden');
    }
    console.log('🎉 Player won!');
  }

  showGameOver() {
    const overlay = document.getElementById('game-over');
    if (overlay) {
      overlay.classList.remove('hidden');
    }
    console.log('😞 Game over');
  }

  continueGame() {
    const overlay = document.getElementById('game-won');
    if (overlay) {
      overlay.classList.add('hidden');
    }
    this.gameState = 'continue';
  }

  resetGame() {
    console.log('Resetting game...');
    
    // Reset game state
    this.board = this.createEmptyBoard();
    this.score = 0;
    this.moves = 0;
    this.gameState = 'playing';
    this.gameWon = false;
    this.isPaused = false;
    this.startTime = Date.now();
    
    // Clear game state stack
    this.gameStateStack = [];
    
    // Hide overlays
    const overlays = ['game-over', 'game-won', 'pause-overlay'];
    overlays.forEach(id => {
      const overlay = document.getElementById(id);
      if (overlay) {
        overlay.classList.add('hidden');
      }
    });
    
    // Stop autoplay
    if (this.isAutoPlaying) {
      this.stopAutoPlay();
    }
    
    // Restart game
    this.addRandomTile();
    this.addRandomTile();
    this.updateUI();
    this.startTimer();
    
    console.log('✅ Game reset complete');
  }

  // Game state management
  saveGameState() {
    const state = {
      board: JSON.parse(JSON.stringify(this.board)),
      score: this.score,
      moves: this.moves
    };
    
    this.gameStateStack.push(state);
    
    // Keep only last N states
    if (this.gameStateStack.length > this.maxUndoSteps) {
      this.gameStateStack.shift();
    }
  }

  undoMove() {
    if (this.gameStateStack.length === 0) return;
    
    const previousState = this.gameStateStack.pop();
    this.board = previousState.board;
    this.score = previousState.score;
    this.moves = previousState.moves;
    
    this.updateUI();
    console.log('Undo move');
  }

  // Timer functions
  startTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    
    this.timerInterval = setInterval(() => {
      if (!this.isPaused) {
        this.updateTimer();
      }
    }, 1000);
  }

  updateTimer() {
    const timeElement = document.getElementById('time');
    if (timeElement) {
      timeElement.textContent = this.getFormattedTime();
    }
  }

  getFormattedTime() {
    const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  // Touch handling
  handleTouchStart(e) {
    if (e.touches.length === 1) {
      this.touchStartX = e.touches[0].clientX;
      this.touchStartY = e.touches[0].clientY;
    }
  }

  handleTouchEnd(e) {
    if (!this.touchStartX || !this.touchStartY) return;

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;

    const deltaX = touchEndX - this.touchStartX;
    const deltaY = touchEndY - this.touchStartY;

    const minSwipeDistance = 30;

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      if (Math.abs(deltaX) > minSwipeDistance) {
        this.move(deltaX > 0 ? 'right' : 'left');
      }
    } else {
      if (Math.abs(deltaY) > minSwipeDistance) {
        this.move(deltaY > 0 ? 'down' : 'up');
      }
    }

    this.touchStartX = null;
    this.touchStartY = null;
  }

  // Theme and visual functions
  applyTheme() {
    document.body.classList.toggle('light-mode', this.isLightMode);
  }

  toggleTheme() {
    this.isLightMode = !this.isLightMode;
    localStorage.setItem('isLightMode', this.isLightMode);
    this.applyTheme();
  }

  cycleHue() {
    this.hueValue = (this.hueValue + 30) % 360;
    localStorage.setItem('hueValue', this.hueValue);
    document.documentElement.style.setProperty('--hue-value', this.hueValue);
  }

  // Pause functionality
  togglePause() {
    this.isPaused = !this.isPaused;
    
    const overlay = document.getElementById('pause-overlay');
    const button = document.getElementById('pause-button');
    
    if (this.isPaused) {
      if (overlay) overlay.classList.remove('hidden');
      if (button) button.innerHTML = '<i class="fas fa-play"></i>';
    } else {
      if (overlay) overlay.classList.add('hidden');
      if (button) button.innerHTML = '<i class="fas fa-pause"></i>';
    }
  }

  // Autoplay functionality
  toggleAutoPlay() {
    if (this.isAutoPlaying) {
      this.stopAutoPlay();
    } else {
      this.startAutoPlay();
    }
  }

  startAutoPlay() {
    if (!this.enhancedAI && !this.advancedAI) {
      console.warn('No AI available for autoplay');
      return;
    }

    this.isAutoPlaying = true;
    const button = document.getElementById('autoplay-button');
    if (button) {
      button.innerHTML = '<i class="fas fa-stop"></i>';
      button.title = 'Stop auto play';
    }

    const speed = this.speedMultipliers[this.currentSpeedIndex];
    const interval = speed === 'MAX' ? 50 : this.autoPlaySpeed / speed;

    this.autoPlayInterval = setInterval(() => {
      if (this.gameState === 'playing' && !this.isPaused) {
        const bestMove = this.getAIMove();
        if (bestMove) {
          this.move(bestMove);
        } else {
          this.stopAutoPlay();
          console.log('AI found no valid moves - stopping autoplay');
        }
      }
    }, interval);

    console.log(`Autoplay started at ${speed}x speed`);
  }

  stopAutoPlay() {
    this.isAutoPlaying = false;
    
    if (this.autoPlayInterval) {
      clearInterval(this.autoPlayInterval);
      this.autoPlayInterval = null;
    }

    const button = document.getElementById('autoplay-button');
    if (button) {
      button.innerHTML = '<i class="fas fa-play"></i>';
      button.title = 'Auto play';
    }

    console.log('Autoplay stopped');
  }

  cycleSpeed() {
    this.currentSpeedIndex = (this.currentSpeedIndex + 1) % this.speedMultipliers.length;
    const speed = this.speedMultipliers[this.currentSpeedIndex];
    
    const button = document.getElementById('speed-button');
    if (button) {
      const speedText = button.querySelector('.speed-text');
      if (speedText) {
        speedText.textContent = speed + 'x';
      }
    }

    // Restart autoplay with new speed if running
    if (this.isAutoPlaying) {
      this.stopAutoPlay();
      setTimeout(() => this.startAutoPlay(), 100);
    }
  }

  // Board size cycling
  cycleBoardSize() {
    const sizes = [3, 4, 5, 7, 9];
    const currentIndex = sizes.indexOf(this.size);
    const nextIndex = (currentIndex + 1) % sizes.length;
    
    this.size = sizes[nextIndex];
    this.resetGame();
    
    const button = document.getElementById('board-size-button');
    if (button) {
      button.title = `Board size: ${this.size}x${this.size}`;
    }
    
    console.log(`Board size changed to ${this.size}x${this.size}`);
  }

  // AI difficulty cycling
  cycleAIDifficulty() {
    const difficulties = ['easy', 'normal', 'hard', 'expert'];
    const currentIndex = difficulties.indexOf(this.aiDifficulty);
    const nextIndex = (currentIndex + 1) % difficulties.length;
    
    this.aiDifficulty = difficulties[nextIndex];
    localStorage.setItem('aiDifficulty', this.aiDifficulty);
    
    const button = document.getElementById('ai-difficulty-button');
    if (button) {
      const buttonText = button.querySelector('.button-text');
      if (buttonText) {
        buttonText.textContent = this.aiDifficulty.charAt(0).toUpperCase() + this.aiDifficulty.slice(1);
      }
    }
    
    // Reinitialize AI with new difficulty
    this.initializeAISystems();
    
    console.log(`AI difficulty changed to ${this.aiDifficulty}`);
  }

  // AI Systems
  initializeAISystems() {
    try {
      if (typeof Enhanced2048AI !== 'undefined') {
        this.enhancedAI = new Enhanced2048AI(this);
        console.log('✅ Enhanced AI initialized');
      } else {
        console.warn('⚠️ Enhanced2048AI not available');
      }
      
      if (typeof AILearningSystem !== 'undefined') {
        this.aiLearningSystem = new AILearningSystem();
        console.log('✅ AI Learning System initialized');
      } else {
        console.warn('⚠️ AILearningSystem not available');
      }

      if (typeof AdvancedAI2048Solver !== 'undefined') {
        this.advancedAI = new AdvancedAI2048Solver(this);
        console.log('✅ Advanced AI Solver initialized');
      } else {
        console.warn('⚠️ AdvancedAI2048Solver not available');
      }
    } catch (error) {
      console.warn('⚠️ AI systems initialization failed:', error);
    }
  }

  // Get best move from available AI
  getAIMove() {
    if (this.enhancedAI) {
      return this.enhancedAI.getBestMove();
    } else if (this.advancedAI) {
      return this.advancedAI.getBestMove();
    } else {
      console.warn('No AI available for move generation');
      return null;
    }
  }

  // Storage functions
  loadBestScore() {
    return parseInt(localStorage.getItem('bestScore')) || 0;
  }

  saveBestScore() {
    localStorage.setItem('bestScore', this.bestScore);
  }

  // Stats and export
  exportStats() {
    const stats = {
      bestScore: this.bestScore,
      currentScore: this.score,
      moves: this.moves,
      boardSize: this.size,
      gameState: this.gameState,
      timestamp: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(stats, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `fancy2048-stats-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log('Stats exported');
  }

  updateButtonStates() {
    // Update back button
    const backButton = document.getElementById('back-button');
    if (backButton) {
      backButton.style.opacity = this.gameStateStack.length > 0 ? '1' : '0.5';
    }
  }

  handleInitializationFailure(error) {
    console.error('🚨 Critical initialization failure:', error);
    
    const boardContainer = document.getElementById('board-container');
    if (boardContainer) {
      boardContainer.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #ff6b6b; border: 2px solid #ff6b6b; border-radius: 12px; background: rgba(255, 107, 107, 0.1);">
          <h3>⚠️ Game Loading Error</h3>
          <p>Failed to initialize the game properly.</p>
          <p style="font-size: 14px; opacity: 0.8;">Error: ${error.message}</p>
          <button onclick="location.reload()" style="padding: 12px 24px; background: #ff6b6b; color: white; border: none; border-radius: 8px; cursor: pointer; margin-top: 15px; font-size: 16px;">
            Reload Game
          </button>
        </div>
      `;
    }
    
    this.gameState = 'error';
  }
}

// Enhanced CSS animations for notifications
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
  
  .tile {
    transition: all 0.15s ease;
  }
  
  .new-tile {
    animation: tileAppear 0.2s ease;
  }
  
  @keyframes tileAppear {
    from { transform: scale(0); }
    to { transform: scale(1); }
  }
`;
document.head.appendChild(style);

console.log('✅ Simplified Fancy2048 Game Engine loaded');

// Make available globally
window.Game = Game;
