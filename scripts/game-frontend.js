/**
 * Fancy2048 Frontend Client
 * Handles UI interactions and communicates with Python backend for game logic
 */
class GameFrontend {
  constructor(size = 4) {
    // Core properties
    this.size = size;
    this.gameId = null;
    this.apiBase = window.location.origin;
    
    // UI state
    this.animationInProgress = false;
    this.isPaused = false;
    this.timerInterval = null;
    this.startTime = null;
    
    // Visual settings (managed locally)
    this.isLightMode = localStorage.getItem('isLightMode') === 'true';
    this.hueValue = parseInt(localStorage.getItem('hueValue')) || 0;
    this.isRainbowMode = localStorage.getItem('isRainbowMode') === 'true';
    this.rainbowInterval = null;
    
    // Device detection
    this.isMobile = this.detectMobile();
    this.isTablet = this.detectTablet();
    
    // Touch handling
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.minSwipeDistance = 30;
    
    this.init();
  }

  async init() {
    console.log('Initializing frontend...');
    
    this.setupEventListeners();
    this.optimizeForDevice();
    this.applyTheme();
    this.updateHue();
    
    // Initialize game with backend
    await this.initGame();
    
    console.log('Frontend initialization complete');
  }

  detectMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           window.innerWidth <= 768;
  }

  detectTablet() {
    return /iPad|Android/i.test(navigator.userAgent) && 
           window.innerWidth >= 768 && window.innerWidth <= 1024;
  }

  optimizeForDevice() {
    const root = document.documentElement;
    
    if (this.isMobile) {
      root.classList.add('mobile-device');
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const boardSize = Math.min(vw * 0.9, vh * 0.5);
      const tileSize = (boardSize - (this.size + 1) * 8) / this.size;
      
      root.style.setProperty('--board-size', `${boardSize}px`);
      root.style.setProperty('--tile-size', `${tileSize}px`);
      root.style.setProperty('--gap', '8px');
    } else if (this.isTablet) {
      root.classList.add('tablet-device');
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const boardSize = Math.min(vw * 0.7, vh * 0.6);
      const tileSize = (boardSize - (this.size + 1) * 12) / this.size;
      
      root.style.setProperty('--board-size', `${boardSize}px`);
      root.style.setProperty('--tile-size', `${tileSize}px`);
      root.style.setProperty('--gap', '12px');
    } else {
      root.classList.add('desktop-device');
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const maxBoardSize = Math.min(600, Math.min(vw * 0.6, vh * 0.7));
      const boardSize = Math.max(400, maxBoardSize);
      const tileSize = (boardSize - (this.size + 1) * 15) / this.size;
      
      root.style.setProperty('--board-size', `${boardSize}px`);
      root.style.setProperty('--tile-size', `${tileSize}px`);
      root.style.setProperty('--gap', '15px');
    }
  }

  setupEventListeners() {
    // Keyboard controls
    document.addEventListener('keydown', this.handleKeyPress.bind(this));
    
    // Touch controls
    const boardContainer = document.getElementById('board-container');
    if (boardContainer) {
      boardContainer.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
      boardContainer.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
    }
    
    // Button controls
    this.setupButtonListeners();
    
    // Prevent scrolling on mobile
    document.addEventListener('touchmove', this.preventScroll, { passive: false });
    
    // Window resize
    window.addEventListener('resize', this.debounce(this.handleResize.bind(this), 250));
  }

  setupButtonListeners() {
    // Reset button
    const resetBtn = document.getElementById('reset-button');
    if (resetBtn) {
      resetBtn.addEventListener('click', this.resetGame.bind(this));
    }

    // Undo button
    const backBtn = document.getElementById('back-button');
    if (backBtn) {
      backBtn.addEventListener('click', this.undoMove.bind(this));
    }

    // Theme toggle button
    const themeBtn = document.getElementById('theme-toggle-button');
    if (themeBtn) {
      themeBtn.addEventListener('click', this.toggleTheme.bind(this));
    }

    // Color change button
    const colorBtn = document.getElementById('changeColor-button');
    if (colorBtn) {
      colorBtn.addEventListener('click', this.changeHue.bind(this));
    }

    // Rainbow mode button
    const rainbowBtn = document.getElementById('rainbowMode-button');
    if (rainbowBtn) {
      rainbowBtn.addEventListener('click', this.toggleRainbowMode.bind(this));
    }

    // Pause button
    const pauseBtn = document.getElementById('pause-button');
    if (pauseBtn) {
      pauseBtn.addEventListener('click', this.togglePause.bind(this));
    }

    // Board size button
    const sizeBtn = document.getElementById('board-size-button');
    if (sizeBtn) {
      sizeBtn.addEventListener('click', this.changeBoardSize.bind(this));
    }
  }

  // ============ API Communication ============

  async initGame() {
    try {
      const response = await fetch(`${this.apiBase}/api/new_game`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ size: this.size })
      });

      if (response.ok) {
        const data = await response.json();
        this.gameId = data.gameId;
        this.updateUI(data.gameState);
        this.startTimer();
        console.log('Game initialized with backend');
      } else {
        throw new Error('Failed to initialize game');
      }
    } catch (error) {
      console.error('Failed to initialize game:', error);
      this.showError('Failed to connect to game server');
    }
  }

  async move(direction) {
    if (this.animationInProgress || this.isPaused || !this.gameId) {
      return;
    }

    this.animationInProgress = true;

    try {
      const response = await fetch(`${this.apiBase}/api/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          gameId: this.gameId, 
          direction: direction 
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.moved) {
          this.updateUI(data.gameState);
          this.checkGameEnd(data.gameState);
        }
      } else {
        throw new Error('Move failed');
      }
    } catch (error) {
      console.error('Move failed:', error);
      this.showError('Move failed');
    } finally {
      setTimeout(() => {
        this.animationInProgress = false;
      }, 150);
    }
  }

  async undoMove() {
    if (!this.gameId || this.animationInProgress) return;

    try {
      const response = await fetch(`${this.apiBase}/api/undo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: this.gameId })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          this.updateUI(data.gameState);
        }
      }
    } catch (error) {
      console.error('Undo failed:', error);
    }
  }

  async resetGame() {
    if (!this.gameId) return;

    try {
      const response = await fetch(`${this.apiBase}/api/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: this.gameId })
      });

      if (response.ok) {
        const data = await response.json();
        this.updateUI(data.gameState);
        this.startTimer();
      }
    } catch (error) {
      console.error('Reset failed:', error);
    }
  }

  async changeBoardSize() {
    const sizes = [3, 4, 5, 6];
    const currentIndex = sizes.indexOf(this.size);
    const newSize = sizes[(currentIndex + 1) % sizes.length];

    try {
      const response = await fetch(`${this.apiBase}/api/change_size`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: this.gameId, size: newSize })
      });

      if (response.ok) {
        const data = await response.json();
        this.size = newSize;
        this.optimizeForDevice();
        this.updateUI(data.gameState);
        this.createGridCells();
      }
    } catch (error) {
      console.error('Size change failed:', error);
    }
  }

  // ============ UI Updates ============

  updateUI(gameState) {
    if (!gameState) return;

    // Update score display
    document.getElementById('score').textContent = gameState.score || 0;
    document.getElementById('best-score').textContent = gameState.bestScore || 0;
    document.getElementById('moves').textContent = gameState.moves || 0;
    
    // Update board
    this.updateBoard(gameState.board);
    
    // Update back button state
    const backButton = document.getElementById('back-button');
    if (backButton) {
      backButton.disabled = !gameState.canUndo;
    }
  }

  updateBoard(board) {
    const boardContainer = document.getElementById('board-container');
    if (!boardContainer || !board) return;

    // Clear existing tiles
    const existingTiles = boardContainer.querySelectorAll('.tile');
    existingTiles.forEach(tile => tile.remove());

    // Create grid cells if they don't exist
    if (!boardContainer.querySelector('.grid-cell')) {
      this.createGridCells();
    }

    // Add tiles for non-zero values
    for (let row = 0; row < this.size; row++) {
      for (let col = 0; col < this.size; col++) {
        if (board[row][col] !== 0) {
          this.createTileElement(row, col, board[row][col]);
        }
      }
    }
  }

  createGridCells() {
    const boardContainer = document.getElementById('board-container');
    if (!boardContainer) return;

    // Clear existing grid cells
    const existingCells = boardContainer.querySelectorAll('.grid-cell');
    existingCells.forEach(cell => cell.remove());

    // Create grid cells
    for (let row = 0; row < this.size; row++) {
      for (let col = 0; col < this.size; col++) {
        const gridCell = document.createElement('div');
        gridCell.className = 'grid-cell';
        gridCell.style.gridRow = row + 1;
        gridCell.style.gridColumn = col + 1;
        boardContainer.appendChild(gridCell);
      }
    }

    // Update CSS grid
    boardContainer.style.gridTemplateRows = `repeat(${this.size}, 1fr)`;
    boardContainer.style.gridTemplateColumns = `repeat(${this.size}, 1fr)`;
  }

  createTileElement(row, col, value) {
    const boardContainer = document.getElementById('board-container');
    if (!boardContainer) return;

    const tile = document.createElement('div');
    tile.className = 'tile new-tile';
    tile.setAttribute('data-value', value);
    tile.textContent = value;
    tile.style.gridRow = row + 1;
    tile.style.gridColumn = col + 1;
    
    this.adjustTileFontSize(tile);
    boardContainer.appendChild(tile);

    // Trigger animation
    setTimeout(() => {
      tile.classList.remove('new-tile');
    }, 50);
  }

  adjustTileFontSize(tileElement) {
    const value = parseInt(tileElement.getAttribute('data-value'));
    const tileSize = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--tile-size'));
    
    let fontSize;
    if (value < 100) {
      fontSize = tileSize * 0.5;
    } else if (value < 1000) {
      fontSize = tileSize * 0.4;
    } else if (value < 10000) {
      fontSize = tileSize * 0.35;
    } else {
      fontSize = tileSize * 0.3;
    }
    
    tileElement.style.fontSize = `${fontSize}px`;
  }

  checkGameEnd(gameState) {
    if (gameState.gameState === 'won') {
      this.showWinMessage();
      this.saveStats();
    } else if (gameState.gameState === 'over') {
      this.showGameOver();
      this.saveStats();
    }
  }

  showWinMessage() {
    setTimeout(() => {
      alert('Congratulations! You reached 2048!');
    }, 500);
  }

  showGameOver() {
    const gameOverElement = document.getElementById('game-over');
    if (gameOverElement) {
      gameOverElement.classList.remove('hidden');
      setTimeout(() => {
        gameOverElement.classList.add('hidden');
      }, 3000);
    }
  }

  showError(message) {
    console.error(message);
    // Could implement a toast notification here
  }

  // ============ Input Handling ============

  handleKeyPress(event) {
    if (this.animationInProgress || this.isPaused) return;

    const keyMap = {
      'ArrowUp': 'up',
      'ArrowDown': 'down', 
      'ArrowLeft': 'left',
      'ArrowRight': 'right',
      'w': 'up',
      'W': 'up',
      's': 'down',
      'S': 'down',
      'a': 'left',
      'A': 'left',
      'd': 'right',
      'D': 'right'
    };

    const direction = keyMap[event.key];
    if (direction) {
      event.preventDefault();
      this.move(direction);
    }
  }

  handleTouchStart(event) {
    event.preventDefault();
    const touch = event.touches[0];
    this.touchStartX = touch.clientX;
    this.touchStartY = touch.clientY;
  }

  handleTouchEnd(event) {
    event.preventDefault();
    if (!event.changedTouches.length) return;

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - this.touchStartX;
    const deltaY = touch.clientY - this.touchStartY;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    if (Math.max(absDeltaX, absDeltaY) < this.minSwipeDistance) return;

    let direction;
    if (absDeltaX > absDeltaY) {
      direction = deltaX > 0 ? 'right' : 'left';
    } else {
      direction = deltaY > 0 ? 'down' : 'up';
    }

    this.move(direction);
  }

  preventScroll(event) {
    if (event.target.closest('#board-container')) {
      event.preventDefault();
    }
  }

  // ============ Theme and Visual Effects ============

  applyTheme() {
    document.body.classList.toggle('light-mode', this.isLightMode);
    localStorage.setItem('isLightMode', this.isLightMode);
  }

  toggleTheme() {
    this.isLightMode = !this.isLightMode;
    this.applyTheme();
  }

  updateHue() {
    document.documentElement.style.setProperty('--hue-rotation', `${this.hueValue}deg`);
    localStorage.setItem('hueValue', this.hueValue);
  }

  changeHue() {
    this.hueValue = (this.hueValue + 60) % 360;
    this.updateHue();
    this.showColorChangeEffect();
  }

  showColorChangeEffect() {
    const tiles = document.querySelectorAll('.tile');
    tiles.forEach(tile => {
      tile.style.transition = 'all 0.3s ease';
      setTimeout(() => {
        tile.style.transition = '';
      }, 300);
    });
  }

  toggleRainbowMode() {
    this.isRainbowMode = !this.isRainbowMode;
    localStorage.setItem('isRainbowMode', this.isRainbowMode);
    
    if (this.isRainbowMode) {
      this.startRainbowMode();
    } else {
      this.stopRainbowMode();
    }
  }

  startRainbowMode() {
    this.stopRainbowMode(); // Clear any existing interval
    this.rainbowInterval = setInterval(() => {
      this.hueValue = (this.hueValue + 5) % 360;
      this.updateHue();
    }, 100);
  }

  stopRainbowMode() {
    if (this.rainbowInterval) {
      clearInterval(this.rainbowInterval);
      this.rainbowInterval = null;
    }
  }

  // ============ Timer and Stats ============

  startTimer() {
    this.startTime = Date.now();
    
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    
    this.timerInterval = setInterval(() => {
      this.updateTimer();
    }, 1000);
  }

  updateTimer() {
    if (!this.startTime) return;
    
    const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    
    const timeElement = document.getElementById('time');
    if (timeElement) {
      timeElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
  }

  async saveStats() {
    if (!this.gameId) return;

    try {
      await fetch(`${this.apiBase}/api/save_stats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: this.gameId })
      });
    } catch (error) {
      console.error('Failed to save stats:', error);
    }
  }

  // ============ Utility Functions ============

  togglePause() {
    this.isPaused = !this.isPaused;
    
    const boardContainer = document.getElementById('board-container');
    const pauseButton = document.getElementById('pause-button');
    
    if (this.isPaused) {
      boardContainer.style.pointerEvents = 'none';
      boardContainer.style.opacity = '0.5';
      if (pauseButton) {
        pauseButton.querySelector('i').className = 'fas fa-play';
      }
      if (this.timerInterval) {
        clearInterval(this.timerInterval);
      }
    } else {
      boardContainer.style.pointerEvents = 'auto';
      boardContainer.style.opacity = '1';
      if (pauseButton) {
        pauseButton.querySelector('i').className = 'fas fa-pause';
      }
      this.startTimer();
    }
  }

  handleResize() {
    this.optimizeForDevice();
    this.updateBoard(this.board);
  }

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  openStatisticsPage() {
    window.location.href = 'leaderboard.html';
  }
}

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.game = new GameFrontend(4);
});
