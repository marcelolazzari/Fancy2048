class Game {
  constructor(size) {
    // Core game properties
    this.size = size;
    this.board = [];
    this.score = 0;
    this.bestScore = 0;
    this.moves = 0;
    this.startTime = null;

    // Backend integration
    this.gameId = null;
    this.useBackend = false; // Auto-detect if backend is available
    this.apiBase = window.location.origin;

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
    await this.checkBackendAvailability();
    await this.initGame();
    this.applyTheme();
    this.updateHue(); // Load and apply saved hue values
    this.initializeResizeObserver();
    this.optimizeForDevice();
    this.isGameInitialized = true;
    
    // Apply initial color scheme
    this.loadColorSettings();
  }

  async checkBackendAvailability() {
    try {
      const response = await fetch(`${this.apiBase}/api/new_game`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ size: this.size })
      });
      
      if (response.ok) {
        const data = await response.json();
        this.useBackend = true;
        this.gameId = data.gameId;
        console.log('Backend detected, using server-side game logic');
        return true;
      }
    } catch (error) {
      console.log('Backend not available, using client-side game logic');
    }
    
    this.useBackend = false;
    return false;
  }

  loadColorSettings() {
    // Load saved hue value from localStorage
    const savedHue = localStorage.getItem('hueValue');
    if (savedHue !== null) {
      this.hueValue = parseInt(savedHue) || 0;
    }
    
    // Apply the loaded hue immediately
    this.updateHue();
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
    
    const boardSize = Math.min(vw * 0.9, vh * 0.5);
    const tileSize = (boardSize - (this.size + 1) * 8) / this.size;
    
    root.style.setProperty('--board-size', `${boardSize}px`);
    root.style.setProperty('--tile-size', `${tileSize}px`);
    root.style.setProperty('--gap', '8px');
    
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
    if (this.useBackend && this.gameId) {
      console.log('Initializing game with backend...');
      await this.initBackendGame();
    } else {
      console.log('Initializing local game...');
      this.initLocalGame();
    }
  }

  async initBackendGame() {
    try {
      const response = await fetch(`${this.apiBase}/api/get_state?gameId=${this.gameId}`);
      if (response.ok) {
        const data = await response.json();
        this.loadServerState(data.gameState);
        console.log('Backend game initialized successfully');
      } else {
        console.warn('Failed to get initial state from backend, falling back to local');
        this.useBackend = false;
        this.initLocalGame();
      }
    } catch (error) {
      console.warn('Backend error, falling back to local:', error);
      this.useBackend = false;
      this.initLocalGame();
    }
  }

  loadServerState(state) {
    this.board = state.board;
    this.score = state.score;
    this.bestScore = state.bestScore || parseInt(localStorage.getItem('bestScore')) || 0;
    this.moves = state.moves;
    this.gameState = state.gameState;
    this.size = state.size;
    this.isLightMode = state.isLightMode;
    this.hueValue = state.hueValue;
    this.isRainbowMode = state.isRainbowMode;
    
    // Update localStorage with backend values
    localStorage.setItem('bestScore', this.bestScore.toString());
    localStorage.setItem('isLightMode', this.isLightMode.toString());
    localStorage.setItem('hueValue', this.hueValue.toString());
    localStorage.setItem('isRainbowMode', this.isRainbowMode.toString());
    
    this.updateUI();
    this.startTimer();
    
    const gameOverElement = document.getElementById('game-over');
    if (this.gameState === 'over') {
      gameOverElement.classList.remove('hidden');
    } else {
      gameOverElement.classList.add('hidden');
    }
    
    if (this.gameState === 'won' && !this.hasShownContinuePopup) {
      this.hasShownContinuePopup = true;
      this.showContinuePopup();
    }
  }

  initLocalGame() {
    // Create empty board
    this.board = this.createEmptyBoard();
    this.score = 0;
    this.moves = 0;
    this.gameState = 'playing';
    this.bestScore = +localStorage.getItem('bestScore') || 0;
    
    // Add initial tiles
    this.addRandomTile();
    this.addRandomTile();
    
    // Update the UI
    this.updateUI();
    this.startTimer();
    
    console.log('Local game initialized successfully');
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
    this.setupKeyboardListeners();
    this.setupTouchListeners();
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
        this.move(direction).catch(console.error);
      }
      
      if (event.code === 'KeyZ' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        this.undoMove().catch(console.error);
      }
      
      if (event.code === 'KeyR' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        this.reset();
      }
    });
  }

  setupTouchListeners() {
    const boardContainer = document.getElementById('board-container');
    
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
    
    this.move(direction).catch(console.error);
  }

  setupButtonListeners() {
    const buttons = {
      'reset-button': () => this.reset().catch(console.error),
      'back-button': () => this.undoMove().catch(console.error),
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

  // Continue with all other methods...
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
    const scoreElement = document.getElementById('score');
    const bestScoreElement = document.getElementById('best-score');
    const movesElement = document.getElementById('moves');
    const timeElement = document.getElementById('time');
    
    if (scoreElement) scoreElement.textContent = this.score;
    if (bestScoreElement) bestScoreElement.textContent = this.bestScore;
    if (movesElement) movesElement.textContent = this.moves;
    if (timeElement) timeElement.textContent = this.getFormattedTime();
  }

  getFormattedTime() {
    if (!this.startTime) return '00:00';
    
    const now = Date.now();
    const elapsed = Math.floor((now - this.startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  updateBoard() {
    const boardContainer = document.getElementById('board-container');
    boardContainer.innerHTML = '';
    
    this.createGridCells();
    
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

  // Theme methods
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
    // Increment hue by 30 degrees (12 different color schemes)
    this.hueValue = (this.hueValue + 30) % 360;
    localStorage.setItem('hueValue', this.hueValue.toString());
    this.updateHue();
    
    // Show a brief feedback
    this.showColorChangeEffect();
  }

  updateHue() {
    const root = document.documentElement;
    root.style.setProperty('--hue-rotation', this.hueValue);
    root.style.setProperty('--hue-value', this.hueValue);
    
    // Update highlight color for immediate visual feedback
    root.style.setProperty('--highlight-color', `hsl(${this.hueValue}, 100%, 60%)`);
    root.style.setProperty('--accent-color', `hsl(${this.hueValue}, 80%, 50%)`);
    root.style.setProperty('--button-background', `hsl(${this.hueValue}, 60%, 20%)`);
    root.style.setProperty('--button-hover-background', `hsl(${this.hueValue}, 70%, 30%)`);
    
    // Force update all tile colors immediately
    this.updateAllTileColors();
  }

  updateAllTileColors() {
    // Update all existing tiles with new colors
    const tiles = document.querySelectorAll('.tile');
    tiles.forEach(tile => {
      const value = tile.getAttribute('data-value');
      if (value) {
        // Force reflow to apply new CSS variables
        tile.style.display = 'none';
        tile.offsetHeight; // Trigger reflow
        tile.style.display = 'flex';
      }
    });
  }

  showColorChangeEffect() {
    // Create a brief visual effect when color changes
    const changeButton = document.getElementById('changeColor-button');
    if (changeButton) {
      changeButton.style.transform = 'scale(1.2) rotate(180deg)';
      changeButton.style.background = `hsl(${this.hueValue}, 100%, 60%)`;
      
      setTimeout(() => {
        changeButton.style.transform = 'scale(1) rotate(0deg)';
        changeButton.style.background = '';
      }, 300);
    }
    
    // Add a subtle screen flash effect
    const overlay = document.querySelector('.overlay');
    if (overlay) {
      overlay.style.background = `hsla(${this.hueValue}, 100%, 80%, 0.2)`;
      overlay.style.opacity = '1';
      overlay.style.pointerEvents = 'none';
      
      setTimeout(() => {
        overlay.style.opacity = '0';
        setTimeout(() => {
          overlay.style.background = '';
        }, 300);
      }, 150);
    }
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

  startTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    
    this.startTime = this.startTime || Date.now();
    
    this.timerInterval = setInterval(() => {
      this.updateScore(); // This will update the time display
    }, 1000);
  }

  getElapsedTime() {
    if (!this.startTime) return '00:00';
    const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
    const min = Math.floor(elapsed / 60).toString().padStart(2, '0');
    const sec = (elapsed % 60).toString().padStart(2, '0');
    return `${min}:${sec}`;
  }

  // Game control methods (simplified versions for now)
  async move(direction) {
    if (this.animationInProgress || this.gameState !== 'playing') return false;
    
    if (this.useBackend && this.gameId) {
      return await this.moveWithBackend(direction);
    } else {
      return this.moveLocal(direction);
    }
  }

  async moveWithBackend(direction) {
    try {
      const response = await fetch(`${this.apiBase}/api/move`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          gameId: this.gameId, 
          direction: direction 
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.moved) {
          this.loadServerState(data.gameState);
          return true;
        }
        return false;
      } else {
        console.warn('Backend move failed, falling back to local');
        this.useBackend = false;
        return this.moveLocal(direction);
      }
    } catch (error) {
      console.warn('Backend move error, falling back to local:', error);
      this.useBackend = false;
      return this.moveLocal(direction);
    }
  }

  moveLocal(direction) {
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
      
      // Update best score if needed
      if (this.score > this.bestScore) {
        this.bestScore = this.score;
        localStorage.setItem('bestScore', this.bestScore);
      }
    }
    
    return moved;
  }

  async reset() {
    if (this.useBackend && this.gameId) {
      await this.resetWithBackend();
    } else {
      this.resetLocal();
    }
  }

  async resetWithBackend() {
    try {
      const response = await fetch(`${this.apiBase}/api/reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ gameId: this.gameId })
      });
      
      if (response.ok) {
        const data = await response.json();
        this.loadServerState(data.gameState);
        console.log('Game reset via backend');
      } else {
        console.warn('Backend reset failed, falling back to local');
        this.useBackend = false;
        this.resetLocal();
      }
    } catch (error) {
      console.warn('Backend reset error, falling back to local:', error);
      this.useBackend = false;
      this.resetLocal();
    }
  }

  resetLocal() {
    // Clear the timer
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    
    // Reset game state
    this.board = this.createEmptyBoard();
    this.score = 0;
    this.moves = 0;
    this.gameState = 'playing';
    this.hasShownContinuePopup = false;
    this.startTime = null;
    this.gameStateStack = [];
    this.lastMerged = [];
    
    // Add initial tiles
    this.addRandomTile();
    this.addRandomTile();
    
    // Update UI and start timer
    this.updateUI();
    this.startTimer();
    
    // Hide game over message if visible
    const gameOverElement = document.getElementById('game-over');
    if (gameOverElement) {
      gameOverElement.classList.add('hidden');
    }
    
    console.log('Game reset successfully');
  }

  saveStats() {
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
        const stats = JSON.parse(localStorage.getItem('gameStats') || '[]');
        stats.push(stat);
        localStorage.setItem('gameStats', JSON.stringify(stats));
      }
      
      this.hasSavedStats = true;
    }
  }

  openStatisticsPage() {
    window.location.href = '../pages/leaderboard.html';
  }

  updateBackButtonState() {
    const backButton = document.getElementById('back-button');
    if (backButton) {
      backButton.disabled = this.gameStateStack.length === 0;
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
    
    // Clear existing grid cells
    const existingCells = boardContainer.querySelectorAll('.grid-cell');
    existingCells.forEach(cell => cell.remove());
    
    // Create background grid cells for visual structure
    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        const cell = document.createElement('div');
        cell.className = 'grid-cell';
        cell.dataset.row = i;
        cell.dataset.col = j;
        
        // Position background cells using CSS Grid
        cell.style.gridRow = i + 1;
        cell.style.gridColumn = j + 1;
        
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
    
    // Calculate absolute position within the board
    const tileSize = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--tile-size'));
    const gap = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--gap'));
    
    // Position tile with absolute coordinates
    const x = col * (tileSize + gap);
    const y = row * (tileSize + gap);
    
    tile.style.position = 'absolute';
    tile.style.left = `${x}px`;
    tile.style.top = `${y}px`;
    tile.style.width = `${tileSize}px`;
    tile.style.height = `${tileSize}px`;
    
    // Add to board container directly
    boardContainer.appendChild(tile);
    
    // Apply dynamic font sizing
    this.adjustTileFontSize(tile);
    
    if (isNew) {
      tile.classList.add('new-tile');
    }
    
    return tile;
  }

  // New method to adjust font size based on tile value and size
  adjustTileFontSize(tileElement) {
    const value = parseInt(tileElement.getAttribute('data-value'));
    const numDigits = value.toString().length;
    const tileWidth = tileElement.offsetWidth;
    
    // Calculate appropriate font size based on number of digits
    // Start with larger size for single digits and decrease more gradually for larger numbers
    let fontSizePercent;
    if (numDigits === 1) {
      fontSizePercent = 0.6; // 60% of tile width for single digits (2, 4, 8)
    } else if (numDigits === 2) {
      fontSizePercent = 0.4; // 40% for double digits (16, 32, 64)
    } else if (numDigits === 3) {
      fontSizePercent = 0.3; // 30% for triple digits (128, 256, 512)
    } else if (numDigits === 4) {
      fontSizePercent = 0.25; // 25% for 4 digits (1024, 2048, 4096)
    } else {
      fontSizePercent = 0.2; // 20% for 5+ digits (16384, etc.)
    }
    
    // Calculate and apply font size
    const fontSize = Math.max(tileWidth * fontSizePercent, 12); // Minimum 12px
    tileElement.style.fontSize = `${fontSize}px`;
    
    // Adjust padding for better visual centering
    const paddingPercent = Math.min(5 + numDigits, 15);
    tileElement.style.padding = `${paddingPercent}%`;
  }

  // Add method to update all tiles' font sizes
  updateTileFontSizes() {
    const tiles = document.querySelectorAll('.tile');
    tiles.forEach(tile => {
      this.adjustTileFontSize(tile);
    });
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
    
    // Make sure tile sizes are properly adjusted
    setTimeout(() => this.updateTileFontSizes(), 0);
    
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
    
    // Make sure all tiles have proper font sizing
    this.updateTileFontSizes();
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

  async undoMove() {
    if (this.useBackend && this.gameId) {
      await this.undoWithBackend();
    } else {
      this.undoLocal();
    }
  }

  async undoWithBackend() {
    try {
      const response = await fetch(`${this.apiBase}/api/undo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ gameId: this.gameId })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          this.loadServerState(data.gameState);
        }
      } else {
        console.warn('Backend undo failed, falling back to local');
        this.useBackend = false;
        this.undoLocal();
      }
    } catch (error) {
      console.warn('Backend undo error, falling back to local:', error);
      this.useBackend = false;
      this.undoLocal();
    }
  }

  undoLocal() {
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

  // New method to set up the resize observer
  initializeResizeObserver() {
    if (window.ResizeObserver) {
      this.resizeObserver = new ResizeObserver(entries => {
        // Only update if we're not in the middle of an animation
        if (!this.animationInProgress) {
          this.updateTileFontSizes();
        }
      });
      
      // Observe the board container to detect size changes
      const boardContainer = document.getElementById('board-container');
      this.resizeObserver.observe(boardContainer);
    }
  }

  // Add cleanup for the observer
  stopResizeObserver() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }
}

// Initialize the game when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.game = new Game(4);
});