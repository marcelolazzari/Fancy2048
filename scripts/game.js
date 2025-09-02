/**
 * Simplified Fancy2048 Game Engine - Core functionality only
 * This is a cleaned up version focusing on essential game mechanics
 */

// Safe localStorage helper
const safeStorage = {
  getItem(key, defaultValue = null) {
    try {
      if (typeof Storage === 'undefined') return defaultValue;
      return localStorage.getItem(key) || defaultValue;
    } catch (error) {
      console.warn(`⚠️ Failed to get localStorage item "${key}":`, error);
      return defaultValue;
    }
  },
  
  setItem(key, value) {
    try {
      if (typeof Storage === 'undefined') {
        console.warn('⚠️ localStorage not available, cannot save item:', key);
        return false;
      }
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.warn(`⚠️ Failed to set localStorage item "${key}":`, error);
      return false;
    }
  },
  
  getJSON(key, defaultValue = null) {
    try {
      const item = this.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.warn(`⚠️ Failed to parse JSON from localStorage "${key}":`, error);
      return defaultValue;
    }
  },
  
  setJSON(key, value) {
    try {
      return this.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn(`⚠️ Failed to stringify JSON for localStorage "${key}":`, error);
      return false;
    }
  }
};

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
    this.isLightMode = safeStorage.getItem('isLightMode') === 'true';
    this.hueValue = parseInt(safeStorage.getItem('hueValue', '0')) || 0;
    
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
    this.aiDifficulty = safeStorage.getItem('aiDifficulty', 'normal');

    // Initialize the game with a short delay to ensure DOM is ready
    setTimeout(() => this.initializeGame(), 50);
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
    try {
      console.log('Setting up UI...');
      
      // Set CSS custom property for board size
      document.documentElement.style.setProperty('--size', this.size);
      
      // Setup board container
      this.setupBoardContainer();
      
      // Update score display
      this.updateScoreDisplay();
      
      console.log('✅ UI setup complete');
    } catch (error) {
      console.error('❌ UI initialization failed:', error);
      throw new Error(`UI initialization failed: ${error.message}`);
    }
  }

  setupBoardContainer() {
    const boardContainer = document.getElementById('board-container');
    if (!boardContainer) {
      console.error('❌ Board container element not found in DOM');
      throw new Error('Board container not found! Make sure the element with id="board-container" exists in the HTML.');
    }
    
    try {
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
    } catch (error) {
      console.error('❌ Failed to set up board container:', error);
      throw new Error(`Board container setup failed: ${error.message}`);
    }
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
    try {
      const elements = {
        'score': this.score,
        'best-score': this.bestScore,
        'moves': this.moves,
        'time': this.getFormattedTime()
      };

      let missingElements = [];
      Object.entries(elements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
          element.textContent = value;
        } else {
          missingElements.push(id);
        }
      });

      if (missingElements.length > 0) {
        console.warn(`⚠️ Score display elements not found: ${missingElements.join(', ')}`);
      }

      // Update best score if needed
      if (this.score > this.bestScore) {
        this.bestScore = this.score;
        this.saveBestScore();
      }
    } catch (error) {
      console.warn('⚠️ Failed to update score display:', error);
    }
  }

  updateBoardDisplay() {
    try {
      const boardContainer = document.getElementById('board-container');
      if (!boardContainer) {
        console.warn('⚠️ Board container not found during display update');
        return;
      }

      // Clear existing tiles from all grid cells
      const tiles = boardContainer.querySelectorAll('.tile');
      tiles.forEach(tile => tile.remove());

      // Create new tiles
      for (let row = 0; row < this.size; row++) {
        for (let col = 0; col < this.size; col++) {
          const value = this.board[row][col];
          if (value !== 0) {
            try {
              const tileElement = this.createTileElement(row, col, value);
              // createTileElement already appends to the correct grid cell
            } catch (tileError) {
              console.warn(`⚠️ Failed to create tile at [${row},${col}]:`, tileError);
            }
          }
        }
      }
    } catch (error) {
      console.warn('⚠️ Failed to update board display:', error);
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
    safeStorage.setItem('isLightMode', this.isLightMode);
    this.applyTheme();
  }

  cycleHue() {
    this.hueValue = (this.hueValue + 30) % 360;
    safeStorage.setItem('hueValue', this.hueValue);
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
    safeStorage.setItem('aiDifficulty', this.aiDifficulty);
    
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
    } else if (this.aiLearningSystem) {
      return this.aiLearningSystem.getBestMove(this.board);
    } else {
      console.warn('No AI available for move generation');
      return null;
    }
  }

  // Start AI auto-play
  startAI() {
    if (this.aiActive) return;
    
    this.aiActive = true;
    this.aiSpeed = this.aiSpeed || 500; // Default 500ms between moves
    
    const makeAIMove = () => {
      if (!this.aiActive || this.gameState === 'gameOver') {
        this.stopAI();
        return;
      }
      
      const move = this.getAIMove();
      if (move && this.canMove(move)) {
        this.move(move);
        setTimeout(makeAIMove, this.aiSpeed);
      } else {
        this.stopAI();
        console.log('AI stopped - no valid moves');
      }
    };
    
    setTimeout(makeAIMove, this.aiSpeed);
    console.log('AI started with speed:', this.aiSpeed);
  }

  // Stop AI auto-play
  stopAI() {
    this.aiActive = false;
    console.log('AI stopped');
  }

  // Make a single AI move
  aiMove() {
    const move = this.getAIMove();
    if (move && this.canMove(move)) {
      this.move(move);
      return true;
    }
    return false;
  }

  // Set AI speed (ms between moves)
  setAISpeed(speed) {
    this.aiSpeed = Math.max(50, speed);
  }

  // Storage functions
  loadBestScore() {
    return parseInt(safeStorage.getItem('bestScore', '0')) || 0;
  }

  saveBestScore() {
    safeStorage.setItem('bestScore', this.bestScore);
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

  // Score tracking and saving methods
  saveGameResult(gameWon = false) {
    try {
      const gameResult = {
        score: this.score || 0,
        moves: this.moves || 0,
        duration: this.gameTime || 0,
        maxTile: this.getMaxTile(),
        won: gameWon,
        playerType: this.currentPlayerType || 'human',
        aiType: this.currentAIType || null,
        timestamp: Date.now(),
        boardSize: this.size || 4,
        gameId: Date.now() + '-' + Math.random().toString(36).substr(2, 9)
      };
      
      // Save to appropriate storage based on player type
      const storageKey = this.getStorageKey();
      let savedGames = safeStorage.getJSON(storageKey, []);
      savedGames.push(gameResult);
      
      // Keep only last 100 games per category
      if (savedGames.length > 100) {
        savedGames = savedGames.slice(-100);
      }
      
      safeStorage.setJSON(storageKey, savedGames);
      
      // Also save to general leaderboard
      this.updateLeaderboard(gameResult);
      
      console.log(`Game result saved: ${gameResult.score} points (${gameResult.playerType})`);
      return gameResult;
      
    } catch (error) {
      console.error('Failed to save game result:', error);
      return null;
    }
  }
  
  getStorageKey() {
    if (this.currentPlayerType === 'ai') {
      return 'aiGameStats';
    } else if (this.currentPlayerType === 'mixed') {
      return 'mixedGameStats';
    }
    return 'gameStats';
  }
  
  updateLeaderboard(gameResult) {
    try {
      let leaderboard = safeStorage.getJSON('leaderboard', []);
      leaderboard.push(gameResult);
      
      // Sort by score and keep top 50
      leaderboard.sort((a, b) => b.score - a.score);
      leaderboard = leaderboard.slice(0, 50);
      
      safeStorage.setJSON('leaderboard', leaderboard);
    } catch (error) {
      console.error('Failed to update leaderboard:', error);
    }
  }
  
  getMaxTile() {
    let maxTile = 0;
    if (this.board) {
      this.board.flat().forEach(tile => {
        if (tile > maxTile) maxTile = tile;
      });
    }
    return maxTile;
  }
  
  setPlayerType(playerType, aiType = null) {
    this.currentPlayerType = playerType;
    this.currentAIType = aiType;
  }
  
  // Override game over to save results
  showGameOver() {
    // Save game result before showing game over
    this.saveGameResult(false);
    
    // Call original game over logic if it exists
    if (this.originalShowGameOver) {
      this.originalShowGameOver();
    } else {
      console.log('Game Over! Final Score:', this.score);
    }
  }
  
  // Override win condition to save results
  showWinMessage() {
    // Save game result as won
    this.saveGameResult(true);
    
    // Call original win logic if it exists
    if (this.originalShowWinMessage) {
      this.originalShowWinMessage();
    } else {
      console.log('You Won! Score:', this.score);
    }
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
