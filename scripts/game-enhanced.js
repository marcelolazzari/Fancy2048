class Game {
  constructor(size) {
    // Core game properties
    this.size = size;
    this.board = [];
    this.score = 0;
    this.bestScore = 0;
    this.moves = 0;
    this.startTime = null;

    // Enhanced game states
    this.gameState = 'ready';
    this.hasSavedStats = false;
    this.hasShownContinuePopup = false;
    this.isPaused = false;
    this.isGameInitialized = false;

    // Visual settings with persistence
    this.isLightMode = localStorage.getItem('isLightMode') === 'true';
    this.hueValue = parseInt(localStorage.getItem('hueValue')) || 0;
    this.isRainbowMode = localStorage.getItem('isRainbowMode') === 'true';

    // Enhanced game history and stats
    this.gameStateStack = [];
    this.maxUndoSteps = 20;
    this.lastMoveScore = 0;
    this.scoreDelta = 0;
    this.lastMerged = [];
    this.stats = [];
    this.timerInterval = null;

    // Animation and interaction properties
    this.animationInProgress = false;
    this.animationFrameId = null;
    this.lastMoveDirection = null;
    this.sessionId = null;

    // Enhanced touch handling
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.touchEndX = 0;
    this.touchEndY = 0;
    this.minSwipeDistance = 30;
    this.maxSwipeTime = 1000;
    this.swipeStartTime = 0;

    // Responsive design properties
    this.viewportWidth = window.innerWidth;
    this.viewportHeight = window.innerHeight;
    this.isMobile = this.detectMobile();
    this.isTablet = this.detectTablet();
    this.currentOrientation = this.getOrientation();

    this.init();
  }

  async init() {
    this.setupEventListeners();
    this.setupResponsiveHandlers();
    await this.initGame();
    this.applyTheme();
    this.updateHue();
    this.initializeResizeObserver();
    this.optimizeForDevice();
    this.isGameInitialized = true;
  }

  detectMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           window.innerWidth <= 768;
  }

  detectTablet() {
    return /iPad|Android/i.test(navigator.userAgent) && 
           window.innerWidth >= 768 && window.innerWidth <= 1024;
  }

  getOrientation() {
    return window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
  }

  optimizeForDevice() {
    const root = document.documentElement;
    
    if (this.isMobile) {
      root.classList.add('mobile-device');
      this.optimizeForMobile();
    }
    
    if (this.isTablet) {
      root.classList.add('tablet-device');
      this.optimizeForTablet();
    }
    
    if (!this.isMobile && !this.isTablet) {
      root.classList.add('desktop-device');
      this.optimizeForDesktop();
    }
  }

  optimizeForMobile() {
    const root = document.documentElement;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    
    // Dynamic sizing based on viewport
    const boardSize = Math.min(vw * 0.9, vh * 0.5);
    const tileSize = (boardSize - (this.size + 1) * 8) / this.size;
    
    root.style.setProperty('--board-size', `${boardSize}px`);
    root.style.setProperty('--tile-size', `${tileSize}px`);
    root.style.setProperty('--gap', '8px');
    
    // Adjust font sizes
    const baseFontSize = Math.max(12, Math.min(16, vw * 0.04));
    root.style.setProperty('--base-font-size', `${baseFontSize}px`);
  }

  optimizeForTablet() {
    const root = document.documentElement;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    
    const boardSize = Math.min(vw * 0.7, vh * 0.6);
    const tileSize = (boardSize - (this.size + 1) * 12) / this.size;
    
    root.style.setProperty('--board-size', `${boardSize}px`);
    root.style.setProperty('--tile-size', `${tileSize}px`);
    root.style.setProperty('--gap', '12px');
    
    const baseFontSize = Math.max(14, Math.min(18, vw * 0.025));
    root.style.setProperty('--base-font-size', `${baseFontSize}px`);
  }

  optimizeForDesktop() {
    const root = document.documentElement;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    
    // Better desktop scaling
    const maxBoardSize = Math.min(600, Math.min(vw * 0.6, vh * 0.7));
    const boardSize = Math.max(400, maxBoardSize);
    const tileSize = (boardSize - (this.size + 1) * 15) / this.size;
    
    root.style.setProperty('--board-size', `${boardSize}px`);
    root.style.setProperty('--tile-size', `${tileSize}px`);
    root.style.setProperty('--gap', '15px');
    
    const baseFontSize = Math.max(16, Math.min(20, boardSize * 0.035));
    root.style.setProperty('--base-font-size', `${baseFontSize}px`);
  }

  setupResponsiveHandlers() {
    const resizeHandler = this.debounce(() => {
      this.handleResize();
    }, 150);

    const orientationHandler = () => {
      setTimeout(() => {
        this.handleOrientationChange();
      }, 300);
    };

    window.addEventListener('resize', resizeHandler);
    window.addEventListener('orientationchange', orientationHandler);
    
    // Modern browsers support
    if (screen && screen.orientation) {
      screen.orientation.addEventListener('change', orientationHandler);
    }
  }

  handleResize() {
    this.viewportWidth = window.innerWidth;
    this.viewportHeight = window.innerHeight;
    this.isMobile = this.detectMobile();
    this.isTablet = this.detectTablet();
    
    this.optimizeForDevice();
    this.refreshLayout();
    this.updateTileFontSizes();
  }

  handleOrientationChange() {
    const newOrientation = this.getOrientation();
    if (newOrientation !== this.currentOrientation) {
      this.currentOrientation = newOrientation;
      this.handleResize();
    }
  }

  async initGame() {
    try {
      const res = await fetch('/api/new_game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ size: this.size })
      });
      const data = await res.json();
      if (data.state) {
        this.loadState(data.state);
      }
    } catch (error) {
      console.error('Failed to initialize game:', error);
      // Fallback to local game
      this.initLocalGame();
    }
  }

  initLocalGame() {
    this.board = this.createEmptyBoard();
    this.score = 0;
    this.moves = 0;
    this.gameState = 'playing';
    this.bestScore = +localStorage.getItem('bestScore') || 0;
    
    this.addRandomTile();
    this.addRandomTile();
    this.updateUI();
    this.startTimer();
  }

  loadState(state) {
    this.board = state.board;
    this.score = state.score;
    this.bestScore = state.bestScore;
    this.moves = state.moves;
    this.gameState = state.state;
    this.size = state.size;
    this.startTime = new Date(Date.now() - (state.elapsedTime * 1000));
    
    this.updateUI();
    this.startTimer();
    
    const gameOverElement = document.getElementById('game-over');
    if (this.gameState === 'over') {
      gameOverElement.classList.remove('hidden');
    } else {
      gameOverElement.classList.add('hidden');
    }
    
    // Enhanced win condition handling
    if (this.gameState === 'won' && !this.hasShownContinuePopup) {
      this.hasShownContinuePopup = true;
      this.showContinuePopup();
    }
  }

  showContinuePopup() {
    if (document.getElementById('continue-popup')) return;
    
    const popup = this.createPopup('continue-popup');
    popup.innerHTML = `
      <div class="popup-content">
        <h2>🎉 Congratulations!</h2>
        <p>You've reached the 2048 tile!<br>Do you want to continue playing?</p>
        <div class="popup-buttons">
          <button id="continue-yes" class="popup-btn primary">Continue</button>
          <button id="continue-no" class="popup-btn secondary">End Game</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(popup);
    
    document.getElementById('continue-yes').onclick = () => {
      document.body.removeChild(popup);
      this.gameState = 'playing';
      this.updateUI();
    };
    
    document.getElementById('continue-no').onclick = () => {
      document.body.removeChild(popup);
      this.gameState = 'over';
      this.updateUI();
      this.saveStats();
    };
  }

  createPopup(id) {
    const popup = document.createElement('div');
    popup.id = id;
    popup.className = 'game-popup';
    return popup;
  }

  setupEventListeners() {
    // Enhanced keyboard handling
    this.setupKeyboardListeners();
    // Enhanced touch handling
    this.setupTouchListeners();
    // Button event listeners
    this.setupButtonListeners();
  }

  setupKeyboardListeners() {
    document.addEventListener('keydown', (event) => {
      if (this.gameState !== 'playing' || this.animationInProgress) return;
      
      const keyMap = {
        'ArrowUp': 'up',
        'ArrowDown': 'down',
        'ArrowLeft': 'left',
        'ArrowRight': 'right',
        'KeyW': 'up',
        'KeyS': 'down',
        'KeyA': 'left',
        'KeyD': 'right'
      };
      
      const direction = keyMap[event.code];
      if (direction) {
        event.preventDefault();
        this.move(direction);
      }
      
      // Additional shortcuts
      if (event.code === 'KeyZ' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        this.undoMove();
      }
      
      if (event.code === 'KeyR' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        this.reset();
      }
    });
  }

  setupTouchListeners() {
    const boardContainer = document.getElementById('board-container');
    
    // Enhanced touch handling with better gesture recognition
    boardContainer.addEventListener('touchstart', (event) => {
      if (this.gameState !== 'playing' || this.animationInProgress) return;
      
      event.preventDefault();
      const touch = event.touches[0];
      this.touchStartX = touch.clientX;
      this.touchStartY = touch.clientY;
      this.swipeStartTime = Date.now();
    }, { passive: false });
    
    boardContainer.addEventListener('touchend', (event) => {
      if (this.gameState !== 'playing' || this.animationInProgress) return;
      
      event.preventDefault();
      const touch = event.changedTouches[0];
      this.touchEndX = touch.clientX;
      this.touchEndY = touch.clientY;
      
      this.handleSwipe();
    }, { passive: false });
    
    // Prevent scrolling on the game board
    boardContainer.addEventListener('touchmove', (event) => {
      event.preventDefault();
    }, { passive: false });
  }

  handleSwipe() {
    const swipeTime = Date.now() - this.swipeStartTime;
    if (swipeTime > this.maxSwipeTime) return;
    
    const deltaX = this.touchEndX - this.touchStartX;
    const deltaY = this.touchEndY - this.touchStartY;
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

  setupButtonListeners() {
    const buttons = {
      'reset-button': () => this.reset(),
      'back-button': () => this.undoMove(),
      'leaderboard-button': () => this.openStatisticsPage(),
      'changeColor-button': () => this.changeHue(),
      'rainbowMode-button': () => this.toggleRainbowMode(),
      'pause-button': () => this.togglePause(),
      'board-size-button': () => this.changeBoardSize(),
      'theme-toggle-button': () => this.toggleTheme()
    };
    
    Object.entries(buttons).forEach(([id, handler]) => {
      const element = document.getElementById(id);
      if (element) {
        element.addEventListener('click', handler);
      }
    });
  }

  async move(direction) {
    if (this.animationInProgress || this.gameState !== 'playing') return;
    
    this.animationInProgress = true;
    
    try {
      const res = await fetch('/api/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction })
      });
      const data = await res.json();
      
      if (data.state) {
        this.loadState(data.state);
        if (this.gameState === 'over') {
          await this.saveStats();
        }
      }
    } catch (error) {
      console.error('Move failed:', error);
      // Fallback to local move logic
      this.moveLocal(direction);
    }
    
    setTimeout(() => {
      this.animationInProgress = false;
    }, 150);
  }

  moveLocal(direction) {
    // Fallback local move implementation
    const previousBoard = this.board.map(row => [...row]);
    const moved = this.performMove(direction);
    
    if (moved) {
      this.moves++;
      this.addRandomTile();
      this.updateUI();
      this.checkGameState();
    }
  }

  performMove(direction) {
    let moved = false;
    const newBoard = this.board.map(row => [...row]);
    
    // Implementation depends on direction
    switch (direction) {
      case 'left':
        moved = this.moveLeft(newBoard);
        break;
      case 'right':
        moved = this.moveRight(newBoard);
        break;
      case 'up':
        moved = this.moveUp(newBoard);
        break;
      case 'down':
        moved = this.moveDown(newBoard);
        break;
    }
    
    if (moved) {
      this.board = newBoard;
    }
    
    return moved;
  }

  createEmptyBoard() {
    return Array(this.size).fill().map(() => Array(this.size).fill(0));
  }

  addRandomTile() {
    const emptyCells = [];
    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        if (this.board[i][j] === 0) {
          emptyCells.push({ row: i, col: j });
        }
      }
    }
    
    if (emptyCells.length > 0) {
      const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
      this.board[randomCell.row][randomCell.col] = Math.random() < 0.9 ? 2 : 4;
      return true;
    }
    
    return false;
  }

  updateUI() {
    this.updateScore();
    this.updateBoard();
    this.updateBackButtonState();
  }

  updateScore() {
    document.getElementById('score').textContent = this.score;
    document.getElementById('best-score').textContent = this.bestScore;
    document.getElementById('moves').textContent = this.moves;
  }

  updateBoard() {
    const boardContainer = document.getElementById('board-container');
    boardContainer.innerHTML = '';
    
    // Create grid cells
    this.createGridCells();
    
    // Create tiles
    for (let row = 0; row < this.size; row++) {
      for (let col = 0; col < this.size; col++) {
        const value = this.board[row][col];
        if (value > 0) {
          const tile = this.createTileElement(row, col, value);
          boardContainer.appendChild(tile);
        }
      }
    }
    
    this.updateTileFontSizes();
  }

  createGridCells() {
    const boardContainer = document.getElementById('board-container');
    
    for (let row = 0; row < this.size; row++) {
      for (let col = 0; col < this.size; col++) {
        const gridCell = document.createElement('div');
        gridCell.className = 'grid-cell';
        gridCell.style.gridRow = row + 1;
        gridCell.style.gridColumn = col + 1;
        boardContainer.appendChild(gridCell);
      }
    }
  }

  createTileElement(row, col, value, isNew = false) {
    const tile = document.createElement('div');
    tile.className = 'tile';
    tile.setAttribute('data-value', value);
    tile.textContent = value;
    tile.style.gridRow = row + 1;
    tile.style.gridColumn = col + 1;
    
    if (isNew) {
      tile.classList.add('new-tile');
    }
    
    this.adjustTileFontSize(tile);
    return tile;
  }

  adjustTileFontSize(tileElement) {
    const value = parseInt(tileElement.getAttribute('data-value'));
    const baseSize = this.isMobile ? 0.4 : 0.5;
    let fontSize = baseSize;
    
    if (value >= 1000) fontSize = baseSize * 0.7;
    if (value >= 10000) fontSize = baseSize * 0.6;
    if (value >= 100000) fontSize = baseSize * 0.5;
    
    tileElement.style.fontSize = `${fontSize}rem`;
  }

  updateTileFontSizes() {
    document.querySelectorAll('.tile').forEach(tile => {
      this.adjustTileFontSize(tile);
    });
  }

  async reset() {
    try {
      const res = await fetch('/api/reset', { method: 'POST' });
      const data = await res.json();
      if (data.state) {
        this.hasShownContinuePopup = false;
        this.loadState(data.state);
      }
    } catch (error) {
      console.error('Reset failed:', error);
      this.resetLocal();
    }
  }

  resetLocal() {
    this.board = this.createEmptyBoard();
    this.score = 0;
    this.moves = 0;
    this.gameState = 'playing';
    this.hasShownContinuePopup = false;
    this.gameStateStack = [];
    
    this.addRandomTile();
    this.addRandomTile();
    this.updateUI();
    this.startTimer();
  }

  // Enhanced theme and visual methods
  applyTheme() {
    document.body.classList.toggle('light-mode', this.isLightMode);
    localStorage.setItem('isLightMode', this.isLightMode);
  }

  toggleTheme() {
    this.isLightMode = !this.isLightMode;
    this.applyTheme();
  }

  updateHue() {
    document.documentElement.style.setProperty('--hue-value', this.hueValue);
    localStorage.setItem('hueValue', this.hueValue);
  }

  changeHue() {
    this.hueValue = (this.hueValue + 30) % 360;
    this.updateHue();
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
    if (this.rainbowInterval) return;
    
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

  // Timer and stats methods
  startTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    
    this.startTime = this.startTime || new Date();
    const timeElement = document.getElementById('time');
    
    this.timerInterval = setInterval(() => {
      timeElement.textContent = this.getElapsedTime();
    }, 1000);
  }

  getElapsedTime() {
    if (!this.startTime) return '00:00';
    const elapsed = Math.floor((Date.now() - this.startTime.getTime()) / 1000);
    const min = Math.floor(elapsed / 60).toString().padStart(2, '0');
    const sec = (elapsed % 60).toString().padStart(2, '0');
    return `${min}:${sec}`;
  }

  async saveStats() {
    if (this.score > 0 && !this.hasSavedStats) {
      const stat = {
        date: new Date().toISOString(),
        bestTile: Math.max(...this.board.flat()),
        score: this.score,
        bestScore: this.bestScore,
        time: this.getElapsedTime(),
        moves: this.moves
      };
      
      try {
        await fetch('/api/save_stats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(stat)
        });
      } catch (error) {
        // Fallback to localStorage
        const stats = JSON.parse(localStorage.getItem('gameStats') || '[]');
        stats.push(stat);
        localStorage.setItem('gameStats', JSON.stringify(stats));
      }
      
      this.hasSavedStats = true;
    }
  }

  // Utility methods
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

  refreshLayout() {
    this.optimizeForDevice();
    setTimeout(() => {
      this.updateBoard();
    }, 100);
  }

  initializeResizeObserver() {
    if ('ResizeObserver' in window) {
      this.resizeObserver = new ResizeObserver(this.debounce(() => {
        this.refreshLayout();
      }, 100));
      
      const boardContainer = document.getElementById('board-container');
      if (boardContainer) {
        this.resizeObserver.observe(boardContainer);
      }
    }
  }

  // Additional methods for complete functionality
  openStatisticsPage() {
    window.location.href = '../pages/leaderboard.html';
  }

  updateBackButtonState() {
    const backButton = document.getElementById('back-button');
    if (backButton) {
      backButton.disabled = this.gameStateStack.length === 0;
    }
  }

  async undoMove() {
    try {
      const res = await fetch('/api/undo', { method: 'POST' });
      const data = await res.json();
      if (data.state) {
        this.loadState(data.state);
      }
    } catch (error) {
      console.error('Undo failed:', error);
    }
  }

  togglePause() {
    this.isPaused = !this.isPaused;
    const boardContainer = document.getElementById('board-container');
    
    if (this.isPaused) {
      boardContainer.style.pointerEvents = 'none';
      boardContainer.style.filter = 'blur(2px)';
      if (this.timerInterval) {
        clearInterval(this.timerInterval);
      }
    } else {
      boardContainer.style.pointerEvents = 'auto';
      boardContainer.style.filter = 'none';
      this.startTimer();
    }
  }

  async changeBoardSize() {
    const newSize = prompt('Enter new board size (3-8):', this.size);
    const size = parseInt(newSize);
    
    if (size && size >= 3 && size <= 8 && size !== this.size) {
      try {
        const res = await fetch('/api/change_size', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ size })
        });
        const data = await res.json();
        if (data.state) {
          this.size = size;
          this.hasShownContinuePopup = false;
          this.loadState(data.state);
          this.optimizeForDevice();
        }
      } catch (error) {
        console.error('Size change failed:', error);
      }
    }
  }
}

// Initialize the enhanced game
document.addEventListener('DOMContentLoaded', () => {
  window.game = new Game(4);
});
