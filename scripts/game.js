class Game {
  constructor(size = 4) {
    console.log(`Initializing game with size: ${size}x${size}`);
    
    // Core game properties
    this.size = size;
    this.board = this.createEmptyBoard();
    this.score = 0;
    this.bestScore = +localStorage.getItem('bestScore') || 0;
    this.moves = 0;
    this.startTime = null;

    // Game states
    this.gameState = 'playing';
    this.hasSavedStats = false;
    this.isPaused = false;
    this.wasPausedByUser = false;
    this.pausedTime = 0;
    this.pauseStartTime = null;
    
    // Animation and UI state
    this.animationInProgress = false;
    this.lastMoveDirection = null;
    this.lastMerged = [];
    
    // Game history for undo
    this.gameStateStack = [];
    this.maxUndoSteps = 10;
    
    // Visual settings
    this.isLightMode = localStorage.getItem('isLightMode') === 'true';
    this.hueValue = parseInt(localStorage.getItem('hueValue')) || 0;
    
    // Touch handling
    this.touchStartX = null;
    this.touchStartY = null;
    this.touchMoved = false;
    this.touchStartTime = null;
    
    // Timer
    this.timerInterval = null;
    
    // Stats
    this.stats = JSON.parse(localStorage.getItem('gameStats')) || [];
    
    // Performance optimization
    this.debounceTimeout = null;
    
    // Mobile state management
    this.lastSavedState = null;
    this.autoSaveInterval = null;
    this.isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    this.pageVisibilityTimeout = null;

    // Autoplay properties
    this.isAutoPlaying = false;
    this.autoPlayInterval = null;
    this.autoPlaySpeed = 800; // milliseconds between moves
    this.speedMultipliers = [1, 1.5, 2, 4, 8]; // Speed options including x8
    this.currentSpeedIndex = 0; // Current speed index
    this.isAutoPlayedGame = false; // Track if current game used autoplay

    // Initialize the game
    this.initializeUI();
    this.addEventListeners();
    this.applyTheme();
    this.updateHue();
    
    // Enhanced responsive handling
    this.setupResponsiveHandlers();
    
    // Initialize resize observer for better font scaling
    this.initializeResizeObserver();
    
    // Initialize autoplay button
    this.updateAutoPlayButton();
    this.updateSpeedButton();
    
    // Start the game
    this.addRandomTile();
    this.addRandomTile();
    this.updateUI();
    this.startTimer();
    
    // Initialize enhanced AI
    this.enhancedAI = null;
    this.initializeEnhancedAI();
    
    // AI performance settings
    this.aiDifficulty = localStorage.getItem('aiDifficulty') || 'normal';
    this.adaptiveDepth = true;
    
    // Auto-save for mobile devices
    this.startAutoSave();
    this.restoreGameStateIfNeeded();
    
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
    
    console.log('✅ UI setup complete');
  }

  setupBoardContainer() {
    const boardContainer = document.getElementById('board-container');
    if (!boardContainer) {
      console.error('Board container not found!');
      return;
    }
    
    // Clear existing content
    boardContainer.innerHTML = '';
    
    // Update CSS custom properties for the current grid size
    document.documentElement.style.setProperty('--size', this.size);
    
    // Add board size class to body for CSS targeting
    document.body.className = document.body.className.replace(/board-size-\d+/g, '');
    document.body.classList.add(`board-size-${this.size}`);
    
    // Calculate optimal board dimensions for proper fitting
    const viewport = Math.min(window.innerWidth, window.innerHeight);
    let maxBoardSize;
    
    // Dynamic sizing based on grid size and viewport
    if (this.size === 3) {
      maxBoardSize = Math.min(viewport * 0.8, 450);
    } else if (this.size === 4) {
      maxBoardSize = Math.min(viewport * 0.85, 500);
    } else if (this.size === 5) {
      maxBoardSize = Math.min(viewport * 0.9, 520);
    }
    
    // Apply dynamic sizing
    document.documentElement.style.setProperty('--board-max-size', `${maxBoardSize}px`);
    
    // Create grid cells
    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        const cell = document.createElement('div');
        cell.className = 'grid-cell';
        cell.dataset.row = i;
        cell.dataset.col = j;
        boardContainer.appendChild(cell);
      }
    }
    
    console.log(`✅ Board container setup for ${this.size}x${this.size} grid - Max size: ${maxBoardSize}px`);
  }

  setupResponsiveHandlers() {
    // Enhanced window resize handling
    window.addEventListener('resize', this.debounce(() => {
      this.refreshLayout();
      this.updateTileFontSizes();
    }, 150));
    
    // Orientation change handling with delay for mobile
    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        this.refreshLayout();
        this.updateTileFontSizes();
      }, 300);
    });

    // Viewport meta tag adjustment for mobile
    if (this.isMobileDevice()) {
      this.adjustViewportForMobile();
    }

    // Handle visibility changes to pause/resume timer and game
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // Page is now hidden (tab switched, minimized, app backgrounded)
        this.handlePageHidden();
      } else {
        // Page is now visible again
        this.handlePageVisible();
      }
    });

    // Handle beforeunload to save game state when user is about to leave
    window.addEventListener('beforeunload', () => {
      this.saveCurrentGameState();
      this.stopAutoSave(); // Stop auto-save interval
      if (!this.isPaused && this.gameState === 'playing') {
        this.pauseGame(false); // Auto-pause without user flag
      }
    });

    // Mobile-specific events for better lifecycle management
    if (this.isMobileDevice) {
      window.addEventListener('pagehide', () => {
        this.saveCurrentGameState();
        this.handlePageHidden();
      });
      
      window.addEventListener('pageshow', (event) => {
        if (event.persisted) {
          // Page was restored from cache
          this.handlePageVisible();
        }
      });
      
      // Handle app focus events with debouncing to avoid rapid state changes
      let focusTimeout;
      window.addEventListener('focus', () => {
        clearTimeout(focusTimeout);
        focusTimeout = setTimeout(() => this.handlePageVisible(), 100);
      });
      
      window.addEventListener('blur', () => {
        clearTimeout(focusTimeout);
        this.handlePageHidden();
      });
    } else {
      // Desktop focus/blur handling
      window.addEventListener('blur', () => {
        if (!this.isPaused && this.gameState === 'playing') {
          this.pauseGame(false); // Auto-pause
        }
      });

      window.addEventListener('focus', () => {
        // Only resume if it was auto-paused (not paused by user)
        if (this.isPaused && !this.wasPausedByUser && this.gameState === 'playing') {
          this.resumeGame();
        }
      });
    }
  }

  initializeResizeObserver() {
    // Initialize ResizeObserver for better responsive handling
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(this.debounce((entries) => {
        for (const entry of entries) {
          if (entry.target.id === 'board-container') {
            this.updateTileFontSizes();
            this.refreshLayout();
          }
        }
      }, 100));

      // Observe the board container
      const boardContainer = document.getElementById('board-container');
      if (boardContainer) {
        this.resizeObserver.observe(boardContainer);
        console.log('✅ ResizeObserver initialized for board container');
      }
    } else {
      console.warn('⚠️ ResizeObserver not supported, using fallback resize handling');
    }
  }

  // Enhanced page visibility handlers
  handlePageHidden() {
    // Save current game state before potentially losing focus
    this.saveCurrentGameState();
    
    if (!this.isPaused && this.gameState === 'playing') {
      this.pauseGame(false); // Auto-pause (not user-initiated)
      
      // Show smaller, less intrusive message for mobile
      if (this.isMobileDevice) {
        this.showMobileHiddenMessage();
      } else {
        this.showPageHiddenMessage();
      }
    }
    
    // Clear any timeout for automatic resume
    if (this.pageVisibilityTimeout) {
      clearTimeout(this.pageVisibilityTimeout);
      this.pageVisibilityTimeout = null;
    }
  }

  handlePageVisible() {
    // Add a small delay to avoid rapid state changes on mobile
    if (this.pageVisibilityTimeout) {
      clearTimeout(this.pageVisibilityTimeout);
    }
    
    this.pageVisibilityTimeout = setTimeout(() => {
      // Only resume if it was auto-paused (not paused by user)
      if (this.isPaused && !this.wasPausedByUser && this.gameState === 'playing') {
        this.resumeGame();
        this.hidePageHiddenMessage();
        this.hideMobileHiddenMessage();
      } else if (this.isPaused && this.wasPausedByUser) {
        // Show brief message that game is still paused by user
        this.showUserPausedMessage();
      }
      
      // Restore game state if needed (for mobile app switching)
      if (this.isMobileDevice && this.gameState === 'playing') {
        this.restoreGameStateIfNeeded();
      }
    }, this.isMobileDevice ? 200 : 50); // Longer delay for mobile
  }

  showPageHiddenMessage() {
    // Remove existing message first
    this.hidePageHiddenMessage();
    
    const message = document.createElement('div');
    message.id = 'page-hidden-message';
    message.className = 'pause-message';
    message.innerHTML = `
      <div class="pause-content">
        <i class="fas fa-eye-slash"></i>
        <h3>Game Auto-Paused</h3>
        <p>The game was paused because you switched tabs or minimized the window.</p>
        <p>It will resume automatically when you return.</p>
      </div>
    `;
    document.body.appendChild(message);
  }

  showMobileHiddenMessage() {
    // Remove existing message first
    this.hideMobileHiddenMessage();
    
    const message = document.createElement('div');
    message.id = 'mobile-hidden-message';
    message.className = 'mobile-pause-toast';
    message.innerHTML = `
      <div class="toast-content">
        <i class="fas fa-pause-circle"></i>
        <span>Game paused - tap to resume when ready</span>
      </div>
    `;
    
    // Position at top of screen for mobile
    message.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 10000;
      background: rgba(0, 0, 0, 0.85);
      color: white;
      padding: 12px 20px;
      border-radius: 25px;
      font-size: 14px;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      animation: slideInTop 0.3s ease-out;
    `;
    
    document.body.appendChild(message);
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
      this.hideMobileHiddenMessage();
    }, 3000);
  }

  hidePageHiddenMessage() {
    const message = document.getElementById('page-hidden-message');
    if (message) {
      message.remove();
    }
  }

  hideMobileHiddenMessage() {
    const message = document.getElementById('mobile-hidden-message');
    if (message) {
      message.style.animation = 'slideOutTop 0.3s ease-in forwards';
      setTimeout(() => {
        if (message.parentNode) {
          message.remove();
        }
      }, 300);
    }
  }

  showUserPausedMessage() {
    // Show a brief message that the game is still paused by user choice
    const existingMessage = document.getElementById('user-paused-reminder');
    if (existingMessage) return;

    const message = document.createElement('div');
    message.id = 'user-paused-reminder';
    message.className = 'pause-reminder-toast';
    
    if (this.isMobileDevice) {
      message.innerHTML = `
        <div class="toast-content">
          <i class="fas fa-pause"></i>
          <span>Still paused - tap pause button to resume</span>
        </div>
      `;
      message.style.cssText = `
        position: fixed;
        bottom: 100px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 10000;
        background: rgba(255, 153, 0, 0.9);
        color: white;
        padding: 12px 20px;
        border-radius: 25px;
        font-size: 14px;
        backdrop-filter: blur(10px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        animation: pulseIn 0.3s ease-out;
      `;
    } else {
      message.innerHTML = `
        <div class="reminder-content">
          <i class="fas fa-pause"></i>
          <span>Game is paused - Click the pause button to resume</span>
        </div>
      `;
      message.className = 'pause-reminder';
    }
    
    document.body.appendChild(message);

    // Auto-remove after 2.5 seconds (shorter for mobile)
    setTimeout(() => {
      if (message.parentNode) {
        if (this.isMobileDevice) {
          message.style.animation = 'fadeOut 0.3s ease-in forwards';
          setTimeout(() => message.remove(), 300);
        } else {
          message.remove();
        }
      }
    }, this.isMobileDevice ? 2500 : 3000);
  }

  adjustViewportForMobile() {
    // Dynamic viewport adjustment for better mobile experience
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
    }

    // Prevent iOS Safari bounce scrolling
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.height = '100%';
  }

  addEventListeners() {
    // Add event listeners with null checks and improved touch handling
    const resetButton = document.getElementById('reset-button');
    if (resetButton) {
      resetButton.addEventListener('click', () => {
        this.reset();
        this.updateUI();
      });
    }
    
    window.addEventListener('keydown', this.handleKeyPress.bind(this));
    
    const boardContainer = document.getElementById('board-container');
    if (boardContainer) {
      // Enhanced touch event handling with passive options for better performance
      boardContainer.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
      boardContainer.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
      boardContainer.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
      boardContainer.addEventListener('touchcancel', this.resetTouchState.bind(this), { passive: true });
      
      // Add mouse events for desktop drag simulation (optional)
      boardContainer.addEventListener('mousedown', this.handleMouseStart.bind(this));
      boardContainer.addEventListener('mousemove', this.handleMouseMove.bind(this));
      boardContainer.addEventListener('mouseup', this.handleMouseEnd.bind(this));
      boardContainer.addEventListener('mouseleave', this.resetMouseState.bind(this));
    }
    
    // Prevent page scrolling and zooming on mobile during gameplay
    document.addEventListener('touchmove', this.preventScroll, { passive: false });
    document.addEventListener('gesturestart', e => e.preventDefault());
    document.addEventListener('gesturechange', e => e.preventDefault());
    document.addEventListener('gestureend', e => e.preventDefault());
    
    const changeColorButton = document.getElementById('changeColor-button');
    if (changeColorButton) {
      changeColorButton.addEventListener('click', this.changeHue.bind(this));
      // Add keyboard accessibility
      changeColorButton.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.changeHue();
        }
      });
    }
    
    const backButton = document.getElementById('back-button');
    if (backButton) {
      backButton.addEventListener('click', this.undoMove.bind(this));
      backButton.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.undoMove();
        }
      });
    }
    
    const leaderboardButton = document.getElementById('leaderboard-button');
    if (leaderboardButton) {
      leaderboardButton.addEventListener('click', this.openStatisticsPage.bind(this));
    }
    
    const pauseButton = document.getElementById('pause-button');
    if (pauseButton) {
      pauseButton.addEventListener('click', this.togglePause.bind(this));
      pauseButton.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.togglePause();
        }
      });
    }
    
    const boardSizeButton = document.getElementById('board-size-button');
    if (boardSizeButton) {
      boardSizeButton.addEventListener('click', this.changeBoardSize.bind(this));
    }
    
    const themeToggleButton = document.getElementById('theme-toggle-button');
    if (themeToggleButton) {
      themeToggleButton.addEventListener('click', this.toggleTheme.bind(this));
      themeToggleButton.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.toggleTheme();
        }
      });
    }
    
    const autoplayButton = document.getElementById('autoplay-button');
    if (autoplayButton) {
      autoplayButton.addEventListener('click', this.toggleAutoPlay.bind(this));
      autoplayButton.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.toggleAutoPlay();
        }
      });
    }
    
    const speedButton = document.getElementById('speed-button');
    if (speedButton) {
      speedButton.addEventListener('click', this.changeSpeed.bind(this));
      speedButton.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.changeSpeed();
        }
      });
    }
    
    // Add advanced keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'z':
            e.preventDefault();
            this.undoMove();
            break;
          case 'r':
            e.preventDefault();
            this.reset();
            break;
          case 'p':
            e.preventDefault();
            this.togglePause();
            break;
          case 'a':
            e.preventDefault();
            this.toggleAutoPlay();
            break;
        }
      }
    });
    
    // Add focus management for accessibility
    this.setupFocusManagement();

    // AI Difficulty button - Enhanced integration
    const aiDifficultyButton = document.getElementById('ai-difficulty-button');
    if (aiDifficultyButton) {
      aiDifficultyButton.addEventListener('click', () => {
        this.changeAIDifficulty();
        // Update button text immediately
        const buttonText = aiDifficultyButton.querySelector('.button-text');
        if (buttonText) {
          const capitalizedDifficulty = this.aiDifficulty.charAt(0).toUpperCase() + this.aiDifficulty.slice(1);
          buttonText.textContent = capitalizedDifficulty;
        }
      });

      // Initialize button text on startup
      const buttonText = aiDifficultyButton.querySelector('.button-text');
      if (buttonText) {
        const savedDifficulty = localStorage.getItem('aiDifficulty') || 'normal';
        this.aiDifficulty = savedDifficulty;
        const capitalizedDifficulty = this.aiDifficulty.charAt(0).toUpperCase() + this.aiDifficulty.slice(1);
        buttonText.textContent = capitalizedDifficulty;
      }
    }
  }

  setupFocusManagement() {
    // Improve focus management for screen readers and keyboard navigation
    const focusableElements = document.querySelectorAll('button, [tabindex]:not([tabindex="-1"])');
    
    focusableElements.forEach(element => {
      element.addEventListener('focus', (e) => {
        e.target.style.outline = '2px solid var(--highlight-color)';
        e.target.style.outlineOffset = '2px';
      });
      
      element.addEventListener('blur', (e) => {
        e.target.style.outline = '';
        e.target.style.outlineOffset = '';
      });
    });
    
    // Add board container focus for keyboard navigation
    const boardContainer = document.getElementById('board-container');
    if (boardContainer) {
      boardContainer.setAttribute('tabindex', '0');
      boardContainer.setAttribute('aria-label', `${this.size}x${this.size} game board`);
      boardContainer.addEventListener('focus', () => {
        boardContainer.style.boxShadow = `0 0 0 3px var(--highlight-color)`;
      });
      boardContainer.addEventListener('blur', () => {
        boardContainer.style.boxShadow = '';
      });
    }
  }

  // Mouse event handlers for desktop drag support (optional enhancement)
  handleMouseStart(event) {
    if (this.isPaused || (this.gameState !== 'playing' && this.gameState !== 'won-continue')) return;
    
    this.mouseStartX = event.clientX;
    this.mouseStartY = event.clientY;
    this.mouseStartTime = Date.now();
    this.isDragging = false;
    
    event.preventDefault();
  }

  handleMouseMove(event) {
    if (!this.mouseStartX || !this.mouseStartY) return;
    
    const deltaX = Math.abs(event.clientX - this.mouseStartX);
    const deltaY = Math.abs(event.clientY - this.mouseStartY);
    
    if (deltaX > 5 || deltaY > 5) {
      this.isDragging = true;
    }
    
    event.preventDefault();
  }

  handleMouseEnd(event) {
    if (!this.mouseStartX || !this.mouseStartY || this.isPaused || (this.gameState !== 'playing' && this.gameState !== 'won-continue')) return;
    
    const deltaX = event.clientX - this.mouseStartX;
    const deltaY = event.clientY - this.mouseStartY;
    const deltaTime = Date.now() - this.mouseStartTime;
    
    // Only process as swipe if mouse was dragged and released quickly
    if (this.isDragging && deltaTime < 500) {
      const minSwipeDistance = 30;
      const swipeDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      
      if (swipeDistance >= minSwipeDistance) {
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          this.move(deltaX > 0 ? 'right' : 'left');
        } else {
          this.move(deltaY > 0 ? 'down' : 'up');
        }
      }
    }
    
    this.resetMouseState();
    event.preventDefault();
  }

  resetMouseState() {
    this.mouseStartX = null;
    this.mouseStartY = null;
    this.mouseStartTime = null;
    this.isDragging = false;
  }

  preventScroll(event) {
    // Enhanced scroll prevention with better target detection
    const target = event.target;
    const gameArea = document.querySelector('main');
    
    if (gameArea && gameArea.contains(target)) {
      // Allow scrolling in score containers and controls, but prevent elsewhere
      const allowScrollElements = target.closest('#score-container, #controls-container, .stats-section');
      
      if (!allowScrollElements) {
        event.preventDefault();
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
      let totalElapsed = Math.floor((endTime - this.startTime) / 1000);
      
      // Add current pause time if game is currently paused
      let currentPausedTime = this.pausedTime;
      if (this.isPaused && this.pauseStartTime) {
        const currentPauseDuration = Math.floor((endTime - this.pauseStartTime) / 1000);
        currentPausedTime += currentPauseDuration;
      }
      
      // Calculate actual game time (excluding paused time)
      const actualGameTime = Math.max(0, totalElapsed - currentPausedTime);
      const minutes = Math.floor(actualGameTime / 60).toString().padStart(2, '0');
      const seconds = (actualGameTime % 60).toString().padStart(2, '0');
      const time = `${minutes}:${seconds}`;

      const stat = {
        score: this.score,
        bestTile: Math.max(...this.board.flat()),
        bestScore: this.bestScore,
        date: new Date().toISOString(),
        time: time,
        moves: this.moves,
        gridSize: this.size, // Add grid size to stats
        gridType: `${this.size}x${this.size}`, // Add formatted grid type
        isAutoPlayed: this.isAutoPlayedGame // Track if AI was used
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
    this.pausedTime = 0; // Reset paused time
    const timeElement = document.getElementById('time');
    
    this.timerInterval = setInterval(() => {
      if (!this.isPaused && timeElement && this.gameState === 'playing') {
        const currentTime = new Date();
        const totalElapsed = Math.floor((currentTime - this.startTime) / 1000);
        const actualGameTime = totalElapsed - this.pausedTime; // Subtract paused time
        const minutes = Math.floor(actualGameTime / 60).toString().padStart(2, '0');
        const seconds = (actualGameTime % 60).toString().padStart(2, '0');
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
    
    // Stop autoplay if running
    if (this.isAutoPlaying) {
      this.stopAutoPlay();
    }
    
    // Clean up pause overlays and messages
    this.hidePauseOverlay();
    this.hidePageHiddenMessage();
    this.hideMobileHiddenMessage();
    
    // Clear saved mobile state
    localStorage.removeItem('currentGameState');
    
    // Reset game state
    this.board = this.createEmptyBoard();
    this.score = 0;
    this.moves = 0;
    this.gameState = 'playing';
    this.hasSavedStats = false;
    this.isPaused = false;
    this.wasPausedByUser = false;
    this.pausedTime = 0;
    this.pauseStartTime = null;
    this.gameStateStack = [];
    this.lastMerged = [];
    this.isAutoPlayedGame = false; // Reset autoplay flag
    
    // Reset hue to 0
    this.hueValue = 0;
    this.updateHue();
    
    // Clear any existing tiles
    const boardContainer = document.getElementById('board-container');
    if (boardContainer) {
      boardContainer.innerHTML = '';
      boardContainer.style.pointerEvents = '';
      boardContainer.style.opacity = '';
      boardContainer.removeAttribute('aria-disabled');
      
      // Create the grid cells first for proper layout
      this.createGridCells();
    }
    
    // Reset pause button UI
    const pauseButton = document.getElementById('pause-button');
    if (pauseButton) {
      pauseButton.innerHTML = '<i class="fas fa-pause" aria-hidden="true"></i>';
      pauseButton.setAttribute('aria-label', 'Pause Game');
      pauseButton.title = 'Pause Game (Space)';
    }
    
    // Reset autoplay button UI
    this.updateAutoPlayButton();
    this.updateSpeedButton();
    
    // Add initial tiles
    this.addRandomTile();
    this.addRandomTile();
    
    // Update UI
    this.updateUI();
    
    // Hide game over message - ensure it's properly hidden
    const gameOverElement = document.getElementById('game-over');
    if (gameOverElement) {
      gameOverElement.classList.add('hidden');
      gameOverElement.classList.remove('win-state');
    }
    
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
      // Apply dynamic font sizing instead of relying on CSS
      this.adjustTileFontSize(tile);
    } else {
      console.error(`No grid cell found at position ${row}, ${col}`);
      boardContainer.appendChild(tile);
    }
    
    if (isNew) {
      tile.classList.add('new-tile');
    }
    
    // Apply glow effect based on value
    this.applyTileGlow(tile, value);
    
    return tile;
  }

  applyTileGlow(tile, value) {
    // Apply enhanced glow effects based on tile value
    if (value >= 128) {
      const glowProperty = value >= 4096 ? '--tile-super-glow' : `--tile-${value}-glow`;
      const glowValue = getComputedStyle(document.documentElement).getPropertyValue(glowProperty);
      
      if (glowValue.trim()) {
        tile.style.boxShadow = glowValue;
        
        // Add pulsing effect for high-value tiles
        if (value >= 1024) {
          tile.style.animation = `pulse-glow 2s ease-in-out infinite alternate`;
        }
      }
    }
  }

  // New method to adjust font size based on tile value and size
  adjustTileFontSize(tileElement) {
    const value = parseInt(tileElement.getAttribute('data-value'));
    const numDigits = value.toString().length;
    
    // Get actual tile dimensions for more accurate scaling
    const rect = tileElement.getBoundingClientRect();
    const tileSize = Math.min(rect.width, rect.height);
    
    if (tileSize === 0) {
      // Fallback to CSS-calculated size if element not yet rendered
      const computedSize = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--tile-size'));
      const actualTileSize = computedSize || Math.min(window.innerWidth, window.innerHeight) / (this.size + 1);
      this.setFontSizeForTile(tileElement, actualTileSize, numDigits, value);
    } else {
      this.setFontSizeForTile(tileElement, tileSize, numDigits, value);
    }
  }

  setFontSizeForTile(tileElement, tileSize, numDigits, value) {
    // Enhanced font size calculation with better progression
    let fontSizePercent;
    
    if (numDigits === 1) {
      fontSizePercent = 0.65; // Larger for single digits
    } else if (numDigits === 2) {
      fontSizePercent = 0.5;  // Good size for double digits
    } else if (numDigits === 3) {
      fontSizePercent = 0.38; // Smaller for triple digits
    } else if (numDigits === 4) {
      fontSizePercent = 0.32; // Even smaller for 4 digits
    } else {
      fontSizePercent = 0.28; // Minimum for 5+ digits
    }
    
    // Apply responsive scaling based on device type
    const scaleFactor = this.isMobileDevice() ? 0.9 : 1.0;
    fontSizePercent *= scaleFactor;
    
    // Calculate final font size with constraints
    const baseFontSize = tileSize * fontSizePercent;
    const minFontSize = this.isMobileDevice() ? 10 : 12;
    const maxFontSize = tileSize * 0.7;
    
    const fontSize = Math.max(minFontSize, Math.min(baseFontSize, maxFontSize));
    tileElement.style.fontSize = `${fontSize}px`;
    
    // Adjust line height for better centering
    tileElement.style.lineHeight = '1';
    
    // Dynamic padding based on font size
    const paddingPercent = Math.max(5, Math.min(15, 10 + numDigits));
    tileElement.style.padding = `${paddingPercent}%`;
    
    // Add font weight adjustment for better readability
    if (numDigits >= 4) {
      tileElement.style.fontWeight = '700';
    } else {
      tileElement.style.fontWeight = '600';
    }
    
    // Add text shadow for better contrast on light backgrounds
    if (value >= 8) {
      tileElement.style.textShadow = '0 1px 3px rgba(0,0,0,0.3)';
    }
  }

  isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           ('ontouchstart' in window) ||
           (navigator.maxTouchPoints > 0);
  }

  // Utility method for debouncing function calls
  debounce(func, wait) {
    return (...args) => {
      clearTimeout(this.debounceTimeout);
      this.debounceTimeout = setTimeout(() => func.apply(this, args), wait);
    };
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
    if (this.animationInProgress || (this.gameState !== 'playing' && this.gameState !== 'won-continue')) return false;
    
    // Start animation lock
    this.animationInProgress = true;
    
    this.lastMoveDirection = direction;
    this.saveGameState();
    
    let moved = false;
    this.lastMerged = []; // Reset merged tiles tracking
    this.lastMoveScore = this.score; // Store score before move
    
    // Create move promise for animation coordination
    const movePromise = new Promise((resolve) => {
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
      resolve(moved);
    });
    
    movePromise.then((moved) => {
      if (moved) {
        this.moves++;
        
        // Calculate score delta for popup
        this.scoreDelta = this.score - this.lastMoveScore;
        if (this.scoreDelta > 0) {
          this.showScorePopup(this.scoreDelta);
        }
        
        // Update UI first, then add new tile after animation
        this.updateUI();
        
        // Add slight delay for better visual feedback
        setTimeout(() => {
          this.addRandomTile();
          this.updateUI();
          
          // Check game state after move
          setTimeout(() => {
            this.checkGameState();
            this.animationInProgress = false;
          }, 100);
        }, 150);
      } else {
        this.animationInProgress = false;
      }
    });
    
    return movePromise;
  }

  // Enhanced UI update with smoother animations
  updateUI() {
    // Update score display with animation
    this.updateScoreDisplay();
    
    // Update best score if needed
    this.updateBestScore();
    
    // Clear existing tiles but keep grid cells
    const boardContainer = document.getElementById('board-container');
    if (boardContainer) {
      const gridCells = boardContainer.querySelectorAll('.grid-cell');
      gridCells.forEach(cell => {
        // Remove tiles with fade out animation
        const tiles = cell.querySelectorAll('.tile');
        tiles.forEach(tile => {
          tile.style.transition = 'opacity 0.1s ease';
          tile.style.opacity = '0';
          setTimeout(() => {
            if (tile.parentNode) {
              tile.parentNode.removeChild(tile);
            }
          }, 100);
        });
      });
    }
    
    // Create new tiles after slight delay
    setTimeout(() => {
      for (let i = 0; i < this.size; i++) {
        for (let j = 0; j < this.size; j++) {
          if (this.board[i][j] !== 0) {
            const tile = this.createTileElement(i, j, this.board[i][j]);
            
            // Add slide animation based on last move direction
            if (this.lastMoveDirection && !this.lastMerged.some(pos => pos.row === i && pos.col === j)) {
              tile.classList.add(`slide-from-${this.getOppositeDirection(this.lastMoveDirection)}`);
            }
          }
        }
      }
      
      // Update tile fonts after rendering
      setTimeout(() => this.updateTileFontSizes(), 50);
    }, 110);
    
    // Update back button state
    this.updateBackButtonState();
  }

  updateScoreDisplay() {
    const scoreElement = document.getElementById('score');
    const bestScoreElement = document.getElementById('best-score');
    const movesElement = document.getElementById('moves');
    
    if (scoreElement) {
      // Animate score changes
      const oldScore = parseInt(scoreElement.textContent) || 0;
      if (oldScore !== this.score) {
        this.animateNumberChange(scoreElement, oldScore, this.score);
      }
    }
    
    if (bestScoreElement) {
      const oldBestScore = parseInt(bestScoreElement.textContent) || 0;
      if (oldBestScore !== this.bestScore) {
        this.animateNumberChange(bestScoreElement, oldBestScore, this.bestScore);
        // Add highlight effect for new best score
        bestScoreElement.style.color = `hsl(${this.hueValue}, 80%, 60%)`;
        setTimeout(() => {
          bestScoreElement.style.color = '';
        }, 1000);
      }
    }
    
    if (movesElement) {
      movesElement.textContent = this.moves;
    }
  }

  animateNumberChange(element, fromValue, toValue) {
    const duration = 300;
    const steps = 20;
    const stepValue = (toValue - fromValue) / steps;
    let currentStep = 0;
    
    const animate = () => {
      if (currentStep < steps) {
        const currentValue = Math.round(fromValue + (stepValue * currentStep));
        element.textContent = currentValue;
        currentStep++;
        requestAnimationFrame(animate);
      } else {
        element.textContent = toValue;
      }
    };
    
    animate();
  }

  getOppositeDirection(direction) {
    const opposites = {
      'up': 'down',
      'down': 'up',
      'left': 'right',
      'right': 'left'
    };
    return opposites[direction] || direction;
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
    // Check if 2048 tile exists (win condition) - but only show once
    let has2048 = false;
    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        if (this.board[i][j] === 2048) {
          has2048 = true;
          break;
        }
      }
      if (has2048) break;
    }
    
    // Show win message only once when first reaching 2048
    if (has2048 && this.gameState !== 'won' && this.gameState !== 'won-continue') {
      this.gameState = 'won';
      this.showWinMessage();
      return;
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
        if (this.isAutoPlaying) {
          this.stopAutoPlay();
        }
        this.showGameOver();
      }
    }
  }

  showGameOver() {
    const gameOverElement = document.getElementById('game-over');
    
    if (this.isMobileDevice) {
      // Smaller, mobile-friendly game over message
      gameOverElement.innerHTML = `
        <div class="mobile-game-over">
          <div class="game-over-icon">💀</div>
          <h3>Game Over!</h3>
          <div class="final-stats">
            <div class="stat">Score: ${this.score.toLocaleString()}</div>
            <div class="stat">Moves: ${this.moves}</div>
          </div>
          <div class="button-row">
            <button class="compact-btn primary" onclick="game.reset(); game.updateUI();">
              <i class="fas fa-redo"></i> New Game
            </button>
          </div>
        </div>
      `;
    } else {
      gameOverElement.textContent = 'Game Over!';
    }
    
    gameOverElement.classList.remove('hidden');
    gameOverElement.classList.remove('win-state');
    
    if (!this.hasSavedStats) {
      this.saveStats();
      this.hasSavedStats = true;
    }
  }

  showWinMessage() {
    const gameOverElement = document.getElementById('game-over');
    gameOverElement.innerHTML = ''; // Clear any existing content
    
    if (this.isMobileDevice) {
      // Compact mobile win message
      const winDiv = document.createElement('div');
      winDiv.className = 'mobile-win-message';
      winDiv.innerHTML = `
        <div class="win-icon">🎉</div>
        <h3>You Won!</h3>
        <p>You reached 2048!</p>
        <div class="win-buttons">
          <button class="compact-btn primary" onclick="document.getElementById('game-over').classList.add('hidden'); game.gameState = 'won-continue';">
            <i class="fas fa-play"></i> Keep Playing
          </button>
          <button class="compact-btn secondary" onclick="game.reset(); game.updateUI();">
            <i class="fas fa-redo"></i> New Game
          </button>
        </div>
      `;
      gameOverElement.appendChild(winDiv);
    } else {
      // Desktop version (keep existing)
      const messageDiv = document.createElement('div');
      messageDiv.style.marginBottom = '15px';
      messageDiv.innerHTML = `
        <h3 style="margin: 0 0 10px 0; color: #ffcc00;">🎉 Congratulations!</h3>
        <p style="margin: 0;">You reached 2048! Keep playing to reach even higher tiles!</p>
      `;
      
      // Add a continue button
      const continueButton = document.createElement('button');
      continueButton.textContent = 'Keep Playing';
      continueButton.style.cssText = `
        background: linear-gradient(45deg, #4CAF50, #45a049);
        color: white;
        border: none;
        padding: 10px 20px;
        margin: 0 5px;
        border-radius: 5px;
        cursor: pointer;
        font-size: 1rem;
        font-weight: bold;
      `;
      continueButton.addEventListener('click', () => {
        gameOverElement.classList.add('hidden');
        this.gameState = 'won-continue'; // Mark as won but continuing
      });
      
      // Add a new game button
      const newGameButton = document.createElement('button');
      newGameButton.textContent = 'New Game';
      newGameButton.style.cssText = `
        background: linear-gradient(45deg, #2196F3, #1976D2);
        color: white;
        border: none;
        padding: 10px 20px;
        margin: 0 5px;
        border-radius: 5px;
        cursor: pointer;
        font-size: 1rem;
        font-weight: bold;
      `;
      newGameButton.addEventListener('click', () => {
        this.reset();
        this.updateUI();
      });
      
      gameOverElement.appendChild(messageDiv);
      gameOverElement.appendChild(continueButton);
      gameOverElement.appendChild(newGameButton);
    }
    
    gameOverElement.classList.remove('hidden');
    gameOverElement.classList.add('win-state');
    
    if (!this.hasSavedStats) {
      this.saveStats();
      this.hasSavedStats = true;
    }
  }

  // Mobile state management methods
  saveCurrentGameState() {
    if (this.gameState === 'playing' || this.gameState === 'won-continue') {
      const gameState = {
        board: JSON.parse(JSON.stringify(this.board)),
        score: this.score,
        bestScore: this.bestScore,
        moves: this.moves,
        gameState: this.gameState,
        startTime: this.startTime,
        pausedTime: this.pausedTime,
        isAutoPlayedGame: this.isAutoPlayedGame,
        hueValue: this.hueValue,
        isLightMode: this.isLightMode,
        size: this.size,
        timestamp: Date.now()
      };
      
      try {
        localStorage.setItem('currentGameState', JSON.stringify(gameState));
        console.log('📱 Game state saved for mobile resume');
      } catch (e) {
        console.warn('Failed to save game state:', e);
      }
    }
  }

  restoreGameStateIfNeeded() {
    try {
      const savedState = localStorage.getItem('currentGameState');
      if (savedState) {
        const gameState = JSON.parse(savedState);
        
        // Only restore if the saved state is recent (within 24 hours)
        const timeDiff = Date.now() - gameState.timestamp;
        if (timeDiff < 24 * 60 * 60 * 1000) { // 24 hours in milliseconds
          
          // Only restore if current game is fresh (no moves made)
          if (this.moves === 0 && this.score === 0) {
            this.board = gameState.board;
            this.score = gameState.score;
            this.moves = gameState.moves;
            this.gameState = gameState.gameState;
            this.startTime = gameState.startTime;
            this.pausedTime = gameState.pausedTime || 0;
            this.isAutoPlayedGame = gameState.isAutoPlayedGame || false;
            
            // Restore visual settings if they match current settings
            if (gameState.size === this.size) {
              this.updateUI();
              console.log('📱 Game state restored successfully');
              
              // Show brief message about restoration
              this.showRestorationMessage();
            }
          }
        }
        
        // Clear old saved state
        localStorage.removeItem('currentGameState');
      }
    } catch (e) {
      console.warn('Failed to restore game state:', e);
      localStorage.removeItem('currentGameState');
    }
  }

  showRestorationMessage() {
    const message = document.createElement('div');
    message.className = 'restoration-toast';
    message.innerHTML = `
      <div class="toast-content">
        <i class="fas fa-history"></i>
        <span>Game restored</span>
      </div>
    `;
    
    message.style.cssText = `
      position: fixed;
      top: 80px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 10000;
      background: rgba(76, 175, 80, 0.9);
      color: white;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 13px;
      backdrop-filter: blur(10px);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      animation: slideInTop 0.3s ease-out;
    `;
    
    document.body.appendChild(message);
    
    setTimeout(() => {
      message.style.animation = 'slideOutTop 0.3s ease-in forwards';
      setTimeout(() => message.remove(), 300);
    }, 2000);
  }

  startAutoSave() {
    if (this.isMobileDevice) {
      // Auto-save every 30 seconds for mobile devices
      this.autoSaveInterval = setInterval(() => {
        if (this.gameState === 'playing') {
          this.saveCurrentGameState();
        }
      }, 30000); // 30 seconds
    }
  }

  stopAutoSave() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }

  // UI and visual functions
  updateUI() {
    // Update score display with null checks
    const scoreElement = document.getElementById('score');
    const bestScoreElement = document.getElementById('best-score');
    const movesElement = document.getElementById('moves');
    
    if (scoreElement) scoreElement.textContent = this.score;
    if (bestScoreElement) bestScoreElement.textContent = this.bestScore;
    if (movesElement) movesElement.textContent = this.moves;
    
    // Update best score if needed
    this.updateBestScore();
    
    // Clear existing tiles but keep grid cells
    const boardContainer = document.getElementById('board-container');
    if (boardContainer) {
      const gridCells = boardContainer.querySelectorAll('.grid-cell');
      gridCells.forEach(cell => {
        while (cell.firstChild) {
          cell.removeChild(cell.firstChild);
        }
      });
    }
    
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
    if (backButton) {
      backButton.style.display = this.gameStateStack.length > 0 ? 'flex' : 'none';
    }
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
    
    // Add board size class to body for CSS targeting
    document.body.className = document.body.className.replace(/board-size-\d+/g, '');
    document.body.classList.add(`board-size-${this.size}`);
    
    // Recalculate board container dimensions
    this.setupBoardContainer();
    
    // Clear and redraw the board
    this.updateUI();
    
    // Make sure all tiles have proper font sizing
    this.updateTileFontSizes();
  }

  // Event handlers
  handleKeyPress(event) {
    // Handle pause/resume with space key regardless of game state
    if (event.key === ' ' || event.code === 'Space') {
      event.preventDefault();
      if (this.gameState === 'playing' || this.gameState === 'paused') {
        this.togglePause();
      }
      return;
    }

    // Handle other keys only when not paused and game is playing
    if (this.isPaused || (this.gameState !== 'playing' && this.gameState !== 'won-continue')) return;
    
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

  // Enhanced touch handling for mobile with better gesture recognition
  handleTouchStart(event) {
    if (this.isPaused || (this.gameState !== 'playing' && this.gameState !== 'won-continue')) return;
    
    // Support multi-touch by using first touch only
    const touch = event.touches[0];
    this.touchStartX = touch.clientX;
    this.touchStartY = touch.clientY;
    this.touchStartTime = Date.now();
    this.touchMoved = false;
    
    // Add visual feedback for touch start
    const boardContainer = document.getElementById('board-container');
    if (boardContainer) {
      boardContainer.style.transform = 'scale(0.98)';
      boardContainer.style.transition = 'transform 0.1s ease';
    }
    
    // Prevent default behavior to avoid scrolling and context menus
    event.preventDefault();
  }

  handleTouchMove(event) {
    if (!this.touchStartX || !this.touchStartY) return;
    
    // Mark that touch has moved (helps distinguish from taps)
    this.touchMoved = true;
    
    // Prevent scrolling during swipe
    event.preventDefault();
  }

  handleTouchEnd(event) {
    if (!this.touchStartX || !this.touchStartY || this.isPaused || (this.gameState !== 'playing' && this.gameState !== 'won-continue')) return;
    
    const boardContainer = document.getElementById('board-container');
    if (boardContainer) {
      boardContainer.style.transform = '';
      boardContainer.style.transition = '';
    }
    
    const touch = event.changedTouches[0];
    const touchEndX = touch.clientX;
    const touchEndY = touch.clientY;
    const touchEndTime = Date.now();
    
    const deltaX = touchEndX - this.touchStartX;
    const deltaY = touchEndY - this.touchStartY;
    const deltaTime = touchEndTime - this.touchStartTime;
    
    // Calculate swipe velocity for better gesture recognition
    const velocity = Math.sqrt(deltaX * deltaX + deltaY * deltaY) / deltaTime;
    
    // Enhanced swipe detection parameters
    const minSwipeDistance = Math.max(30, Math.min(window.innerWidth, window.innerHeight) * 0.05);
    const maxSwipeTime = 1000; // Maximum time for a swipe
    const minVelocity = 0.1; // Minimum velocity to register as intentional swipe
    
    // Check if this qualifies as a swipe
    const swipeDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const isValidSwipe = swipeDistance >= minSwipeDistance && 
                        deltaTime <= maxSwipeTime && 
                        velocity >= minVelocity;
    
    if (!isValidSwipe) {
      this.resetTouchState();
      return;
    }
    
    // Determine swipe direction with improved accuracy
    const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
    const absAngle = Math.abs(angle);
    
    let direction = null;
    
    // Use angle-based direction detection for more accurate swipe recognition
    if (absAngle <= 45) {
      direction = 'right';
    } else if (absAngle >= 135) {
      direction = 'left';
    } else if (angle > 45 && angle < 135) {
      direction = 'down';
    } else if (angle < -45 && angle > -135) {
      direction = 'up';
    }
    
    if (direction) {
      // Add haptic feedback on supported devices
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
      
      // Perform the move with visual feedback
      const moved = this.move(direction);
      
      if (moved) {
        // Add swipe direction indicator
        this.showSwipeIndicator(direction);
      }
    }
    
    this.resetTouchState();
    event.preventDefault();
  }

  resetTouchState() {
    this.touchStartX = null;
    this.touchStartY = null;
    this.touchStartTime = null;
    this.touchMoved = false;
  }

  showSwipeIndicator(direction) {
    // Visual feedback for swipe direction
    const indicator = document.createElement('div');
    indicator.className = 'swipe-indicator';
    indicator.innerHTML = this.getDirectionIcon(direction);
    
    const boardContainer = document.getElementById('board-container');
    const rect = boardContainer.getBoundingClientRect();
    
    indicator.style.position = 'fixed';
    indicator.style.left = `${rect.left + rect.width / 2}px`;
    indicator.style.top = `${rect.top + rect.height / 2}px`;
    indicator.style.transform = 'translate(-50%, -50%)';
    indicator.style.fontSize = '2rem';
    indicator.style.color = `hsl(${this.hueValue}, 70%, 50%)`;
    indicator.style.opacity = '0.8';
    indicator.style.pointerEvents = 'none';
    indicator.style.zIndex = '1000';
    indicator.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    indicator.style.textShadow = '0 2px 4px rgba(0,0,0,0.5)';
    
    document.body.appendChild(indicator);
    
    // Animate indicator
    requestAnimationFrame(() => {
      indicator.style.opacity = '0';
      indicator.style.transform = `translate(-50%, -50%) scale(1.5) translate${this.getDirectionOffset(direction)}`;
    });
    
    setTimeout(() => {
      if (indicator.parentNode) {
        indicator.parentNode.removeChild(indicator);
      }
    }, 300);
  }

  getDirectionIcon(direction) {
    const icons = {
      up: '↑',
      down: '↓',
      left: '←',
      right: '→'
    };
    return icons[direction] || '•';
  }

  getDirectionOffset(direction) {
    const offsets = {
      up: '(0, -20px)',
      down: '(0, 20px)',
      left: '(-20px, 0)',
      right: '(20px, 0)'
    };
    return offsets[direction] || '(0, 0)';
  }

  // Enhanced responsive layout management
  refreshLayout() {
    // Update CSS variables for responsive layout
    document.documentElement.style.setProperty('--size', this.size);
    
    // Calculate optimal sizes based on viewport
    const vmin = Math.min(window.innerWidth, window.innerHeight);
    const availableSpace = vmin * 0.85; // Use 85% of smallest viewport dimension
    const gap = Math.max(8, Math.min(20, availableSpace * 0.02)); // Responsive gap
    
    document.documentElement.style.setProperty('--gap', `${gap}px`);
    
    // Adjust tile border radius based on size
    const borderRadius = Math.max(8, Math.min(15, gap * 0.8));
    document.documentElement.style.setProperty('--tile-border-radius', `${borderRadius}px`);
    
    // Update mobile-specific measurements
    if (this.isMobileDevice()) {
      this.applyMobileOptimizations();
    } else {
      this.applyDesktopOptimizations();
    }
    
    // Clear and redraw the board
    this.updateUI();
    
    // Ensure proper font sizing after layout change
    setTimeout(() => this.updateTileFontSizes(), 100);
  }

  isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           ('ontouchstart' in window) ||
           (navigator.maxTouchPoints > 0);
  }

  applyMobileOptimizations() {
    // Mobile-specific optimizations
    const controlsContainer = document.getElementById('controls-container');
    const scoreContainer = document.getElementById('score-container');
    
    if (controlsContainer) {
      controlsContainer.style.gap = '8px';
      controlsContainer.style.padding = '8px';
    }
    
    if (scoreContainer) {
      scoreContainer.style.fontSize = '0.9rem';
      scoreContainer.style.padding = '8px';
    }
    
    // Adjust header for mobile
    const header = document.querySelector('header');
    if (header) {
      header.style.padding = '8px 16px';
    }
    
    // Enable touch-friendly button sizes
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
      button.style.minWidth = '44px';
      button.style.minHeight = '44px';
      button.style.padding = '8px 12px';
    });
    
    // Optimize main layout for mobile
    const main = document.querySelector('main');
    if (main) {
      main.style.padding = '8px';
      main.style.gap = '12px';
    }
  }

  applyDesktopOptimizations() {
    // Desktop-specific optimizations
    const controlsContainer = document.getElementById('controls-container');
    const scoreContainer = document.getElementById('score-container');
    
    if (controlsContainer) {
      controlsContainer.style.gap = '15px';
      controlsContainer.style.padding = '10px';
    }
    
    if (scoreContainer) {
      scoreContainer.style.fontSize = '1rem';
      scoreContainer.style.padding = '15px';
    }
    
    // Reset header for desktop
    const header = document.querySelector('header');
    if (header) {
      header.style.padding = '10px 20px';
    }
    
    // Reset button sizes for desktop
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
      button.style.minWidth = '';
      button.style.minHeight = '';
      button.style.padding = '10px 20px';
    });
    
    // Optimize main layout for desktop
    const main = document.querySelector('main');
    if (main) {
      main.style.padding = '10px';
      main.style.gap = '20px';
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
    // Update tile colors for the new theme
    this.updateTileColors();
  }

  updateHue() {
    // Update the CSS custom property with smooth transition
    document.documentElement.style.setProperty('--hue-value', this.hueValue);
    
    // Update color button with animated gradient to reflect current hue
    const colorButton = document.getElementById('changeColor-button');
    if (colorButton) {
      const currentHue = this.hueValue;
      const nextHue = (this.hueValue + 30) % 360;
      colorButton.style.background = `linear-gradient(45deg, hsl(${currentHue}, 70%, 50%) 30%, hsl(${nextHue}, 70%, 50%) 70%)`;
      colorButton.style.color = '#ffffff';
      colorButton.style.textShadow = '0 1px 2px rgba(0,0,0,0.5)';
    }
    
    // Update background elements with subtle hue shift
    this.updateBackgroundHue();
    
    // Update all tile colors dynamically based on hue
    this.updateTileColors();
  }

  updateBackgroundHue() {
    // Apply subtle hue shifts to game elements for cohesive theming
    const gameSection = document.querySelector('.game-section');
    const scoreContainer = document.getElementById('score-container');
    const boardContainer = document.getElementById('board-container');
    
    if (gameSection) {
      gameSection.style.filter = `hue-rotate(${this.hueValue * 0.1}deg) brightness(${1 + this.hueValue * 0.0002})`;
    }
    
    if (scoreContainer) {
      scoreContainer.style.background = `rgba(${this.getHueRGB()}, 0.1)`;
      scoreContainer.style.boxShadow = `0 0 15px rgba(${this.getHueRGB()}, 0.3)`;
    }
    
    if (boardContainer) {
      boardContainer.style.boxShadow = `0 0 20px rgba(${this.getHueRGB()}, 0.4)`;
    }
  }

  getHueRGB() {
    // Convert current hue to RGB values for use in rgba()
    const hsl = { h: this.hueValue, s: 70, l: 50 };
    const rgb = this.hslToRgb(hsl.h, hsl.s, hsl.l);
    return `${rgb.r}, ${rgb.g}, ${rgb.b}`;
  }

  hslToRgb(h, s, l) {
    h /= 360;
    s /= 100;
    l /= 100;
    const a = s * Math.min(l, 1 - l);
    const f = n => {
      const k = (n + h * 12) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color);
    };
    return { r: f(0), g: f(8), b: f(4) };
  }

  updateTileColors() {
    // Enhanced tile color configurations with better visual progression
    const tileColorConfig = {
      2: { 
        baseHue: 200, saturation: 50, lightness: 95, 
        textColor: this.isLightMode ? 'hsl(0, 0%, 20%)' : 'hsl(30, 20%, 30%)',
        glowIntensity: 0.1
      },
      4: { 
        baseHue: 190, saturation: 55, lightness: 90, 
        textColor: this.isLightMode ? 'hsl(0, 0%, 15%)' : 'hsl(30, 25%, 25%)',
        glowIntensity: 0.15
      },
      8: { 
        baseHue: 35, saturation: 85, lightness: this.isLightMode ? 70 : 65, 
        textColor: 'hsl(0, 0%, 100%)',
        glowIntensity: 0.2
      },
      16: { 
        baseHue: 25, saturation: 85, lightness: this.isLightMode ? 65 : 60, 
        textColor: 'hsl(0, 0%, 100%)',
        glowIntensity: 0.25
      },
      32: { 
        baseHue: 15, saturation: 90, lightness: this.isLightMode ? 65 : 60, 
        textColor: 'hsl(0, 0%, 100%)',
        glowIntensity: 0.3
      },
      64: { 
        baseHue: 5, saturation: 90, lightness: this.isLightMode ? 65 : 60, 
        textColor: 'hsl(0, 0%, 100%)',
        glowIntensity: 0.35
      },
      128: { 
        baseHue: 50, saturation: 75, lightness: this.isLightMode ? 75 : 65, 
        textColor: 'hsl(0, 0%, 100%)',
        glowIntensity: 0.4
      },
      256: { 
        baseHue: 50, saturation: 80, lightness: this.isLightMode ? 70 : 60, 
        textColor: 'hsl(0, 0%, 100%)',
        glowIntensity: 0.45
      },
      512: { 
        baseHue: 50, saturation: 85, lightness: this.isLightMode ? 65 : 55, 
        textColor: 'hsl(0, 0%, 100%)',
        glowIntensity: 0.5
      },
      1024: { 
        baseHue: 50, saturation: 90, lightness: this.isLightMode ? 60 : 50, 
        textColor: 'hsl(0, 0%, 100%)',
        glowIntensity: 0.6
      },
      2048: { 
        baseHue: 45, saturation: 95, lightness: this.isLightMode ? 55 : 45, 
        textColor: 'hsl(0, 0%, 100%)',
        glowIntensity: 0.7
      },
      super: { 
        baseHue: 280, saturation: 80, lightness: this.isLightMode ? 50 : 40, 
        textColor: 'hsl(0, 0%, 100%)',
        glowIntensity: 0.8
      }
    };

    // Update CSS custom properties with enhanced visual effects
    Object.entries(tileColorConfig).forEach(([value, config]) => {
      const adjustedHue = (config.baseHue + this.hueValue) % 360;
      const glowColor = `hsl(${adjustedHue}, ${config.saturation}%, ${Math.min(config.lightness + 20, 95)}%)`;
      
      if (value === 'super') {
        // Enhanced super tiles with gradient and glow
        document.documentElement.style.setProperty(
          '--tile-super-bg', 
          `linear-gradient(135deg, 
            hsl(${adjustedHue}, ${config.saturation}%, ${config.lightness}%) 0%,
            hsl(${(adjustedHue + 15) % 360}, ${config.saturation}%, ${config.lightness - 5}%) 100%)`
        );
        document.documentElement.style.setProperty('--tile-super-text', config.textColor);
        document.documentElement.style.setProperty('--tile-super-glow', 
          `0 0 ${20 * config.glowIntensity}px ${glowColor}`);
      } else {
        // Enhanced regular tiles with subtle gradients for higher values
        const isHighValue = parseInt(value) >= 128;
        const bgValue = isHighValue ? 
          `linear-gradient(135deg, 
            hsl(${adjustedHue}, ${config.saturation}%, ${config.lightness}%) 0%,
            hsl(${(adjustedHue + 10) % 360}, ${config.saturation}%, ${config.lightness - 3}%) 100%)` :
          `hsl(${adjustedHue}, ${config.saturation}%, ${config.lightness}%)`;
        
        document.documentElement.style.setProperty(`--tile-${value}-bg`, bgValue);
        document.documentElement.style.setProperty(`--tile-${value}-text`, config.textColor);
        document.documentElement.style.setProperty(`--tile-${value}-glow`, 
          `0 0 ${15 * config.glowIntensity}px ${glowColor}`);
      }
    });

    // Update tiles with glow effects
    this.applyTileGlowEffects();
  }

  applyTileGlowEffects() {
    // Apply glow effects to existing tiles
    const tiles = document.querySelectorAll('.tile');
    tiles.forEach(tile => {
      const value = tile.getAttribute('data-value');
      const glowProperty = value >= 4096 ? '--tile-super-glow' : `--tile-${value}-glow`;
      const glowValue = getComputedStyle(document.documentElement).getPropertyValue(glowProperty);
      if (glowValue.trim()) {
        tile.style.boxShadow = glowValue;
      }
    });
  }

  // Enhanced hue change with smooth animation
  changeHue() {
    // Enhanced hue change with smooth animation
    const oldHue = this.hueValue;
    this.hueValue = (this.hueValue + 30) % 360;
    
    // Save to localStorage
    localStorage.setItem('hueValue', this.hueValue);
    
    // Animate the hue transition
    this.animateHueTransition(oldHue, this.hueValue);
    
    // Update immediately but also set up transition
    this.updateHue();
    
    // Force a UI update to refresh tile colors after a brief delay
    setTimeout(() => this.updateUI(), 100);
  }

  animateHueTransition(fromHue, toHue) {
    // Add transition class to body for smooth color changes
    document.body.classList.add('hue-transitioning');
    
    // Remove transition class after animation completes
    setTimeout(() => {
      document.body.classList.remove('hue-transitioning');
    }, 500);
    
    // Create ripple effect from color button
    this.createColorChangeRipple();
  }

  createColorChangeRipple() {
    const colorButton = document.getElementById('changeColor-button');
    if (!colorButton) return;
    
    const ripple = document.createElement('div');
    ripple.className = 'color-change-ripple';
    
    const rect = colorButton.getBoundingClientRect();
    ripple.style.position = 'fixed';
    ripple.style.left = `${rect.left + rect.width / 2}px`;
    ripple.style.top = `${rect.top + rect.height / 2}px`;
    ripple.style.width = '0px';
    ripple.style.height = '0px';
    ripple.style.borderRadius = '50%';
    ripple.style.background = `radial-gradient(circle, 
      hsla(${this.hueValue}, 70%, 50%, 0.3) 0%,
      hsla(${this.hueValue}, 70%, 50%, 0.1) 50%,
      transparent 100%)`;
    ripple.style.pointerEvents = 'none';
    ripple.style.zIndex = '1000';
    ripple.style.transform = 'translate(-50%, -50%)';
    ripple.style.transition = 'width 0.6s ease-out, height 0.6s ease-out, opacity 0.6s ease-out';
    
    document.body.appendChild(ripple);
    
    // Animate ripple expansion
    requestAnimationFrame(() => {
      ripple.style.width = '200px';
      ripple.style.height = '200px';
      ripple.style.opacity = '0';
    });
    
    // Remove ripple after animation
    setTimeout(() => {
      if (ripple.parentNode) {
        ripple.parentNode.removeChild(ripple);
      }
    }, 600);
  }

  togglePause() {
    if (this.isPaused) {
      this.resumeGame();
    } else {
      this.pauseGame(true); // User-initiated pause
    }
  }

  pauseGame(isUserInitiated = true) {
    if (this.isPaused) return; // Already paused

    this.isPaused = true;
    this.wasPausedByUser = isUserInitiated;
    this.pauseStartTime = new Date();
    this.gameState = 'paused';
    
    const boardContainer = document.getElementById('board-container');
    const pauseButton = document.getElementById('pause-button');
    
    if (boardContainer) {
      boardContainer.style.pointerEvents = 'none';
      boardContainer.style.opacity = '0.5';
      boardContainer.setAttribute('aria-disabled', 'true');
    }
    
    if (pauseButton) {
      pauseButton.innerHTML = '<i class="fas fa-play" aria-hidden="true"></i>';
      pauseButton.setAttribute('aria-label', 'Resume Game');
      pauseButton.title = 'Resume Game (Space)';
    }

    // Show pause overlay
    this.showPauseOverlay(isUserInitiated);

    // Dispatch pause event
    document.dispatchEvent(new CustomEvent('gamePaused', {
      detail: { userInitiated: isUserInitiated }
    }));
  }

  resumeGame() {
    if (!this.isPaused) return; // Not paused

    // Calculate and add paused time
    if (this.pauseStartTime) {
      const pauseDuration = Math.floor((new Date() - this.pauseStartTime) / 1000);
      this.pausedTime += pauseDuration;
      this.pauseStartTime = null;
    }

    this.isPaused = false;
    this.wasPausedByUser = false;
    this.gameState = 'playing';
    
    const boardContainer = document.getElementById('board-container');
    const pauseButton = document.getElementById('pause-button');
    
    if (boardContainer) {
      boardContainer.style.pointerEvents = '';
      boardContainer.style.opacity = '';
      boardContainer.removeAttribute('aria-disabled');
    }
    
    if (pauseButton) {
      pauseButton.innerHTML = '<i class="fas fa-pause" aria-hidden="true"></i>';
      pauseButton.setAttribute('aria-label', 'Pause Game');
      pauseButton.title = 'Pause Game (Space)';
    }

    // Hide pause overlay and messages
    this.hidePauseOverlay();
    this.hidePageHiddenMessage();
    this.hideMobileHiddenMessage();

    // Dispatch resume event
    document.dispatchEvent(new CustomEvent('gameResumed'));
  }

  showPauseOverlay(isUserInitiated) {
    // Remove existing overlay
    this.hidePauseOverlay();

    const overlay = document.createElement('div');
    overlay.id = 'pause-overlay';
    overlay.className = 'pause-overlay';
    overlay.innerHTML = `
      <div class="pause-content">
        <div class="pause-icon">
          <i class="fas fa-${isUserInitiated ? 'pause' : 'eye-slash'}"></i>
        </div>
        <h2>${isUserInitiated ? 'Game Paused' : 'Game Auto-Paused'}</h2>
        <p>${isUserInitiated 
          ? 'Click the pause button or press Space to resume'
          : 'Game paused due to tab switch. Return to resume automatically.'
        }</p>
        ${isUserInitiated ? '<button id="resume-from-overlay" class="resume-btn">Resume Game</button>' : ''}
      </div>
    `;

    document.body.appendChild(overlay);

    // Add click handler for resume button
    const resumeBtn = document.getElementById('resume-from-overlay');
    if (resumeBtn) {
      resumeBtn.addEventListener('click', () => this.resumeGame());
    }

    // Focus management
    overlay.setAttribute('tabindex', '-1');
    overlay.focus();
  }

  hidePauseOverlay() {
    const overlay = document.getElementById('pause-overlay');
    if (overlay) {
      overlay.remove();
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

  // Autoplay functionality
  toggleAutoPlay() {
    if (this.isAutoPlaying) {
      this.stopAutoPlay();
    } else {
      this.startAutoPlay();
    }
  }

  startAutoPlay() {
    if (this.autoPlayInterval) return;

    this.isAutoPlaying = true;
    this.autoPlayMoves = 0;
    this.autoPlayStartTime = Date.now();
    
    // Mark this as AI gameplay for stats
    this.playMode = 'AI';
    
    const makeMove = () => {
      if (!this.isAutoPlaying || this.gameState === 'over' || this.isPaused) {
        this.stopAutoPlay();
        return;
      }

      const move = this.getBestMove();
      if (move && this.canMove(move)) {
        this.move(move);
        this.autoPlayMoves++;
        
        // Update UI
        this.updateAutoPlayButton();
      } else {
        // No valid moves, stop autoplay
        this.stopAutoPlay();
      }
    };

    // Start the autoplay loop
    this.autoPlayInterval = setInterval(makeMove, this.getAutoPlayDelay());
    this.updateAutoPlayButton();
    
    console.log(`🤖 Enhanced AI autoplay started (difficulty: ${this.aiDifficulty})`);
  }

  stopAutoPlay() {
    if (this.autoPlayInterval) {
      clearInterval(this.autoPlayInterval);
      this.autoPlayInterval = null;
    }
    
    if (this.isAutoPlaying) {
      const duration = (Date.now() - this.autoPlayStartTime) / 1000;
      const movesPerSecond = (this.autoPlayMoves / duration).toFixed(2);
      
      console.log(`🏁 AI autoplay stopped: ${this.autoPlayMoves} moves in ${duration.toFixed(1)}s (${movesPerSecond} moves/sec)`);
      
      // Show AI performance stats
      if (this.enhancedAI && window.debugAI) {
        const stats = this.enhancedAI.getStats();
        console.log('AI Performance Stats:', stats);
      }
    }
    
    this.isAutoPlaying = false;
    this.playMode = 'Human';
    this.updateAutoPlayButton();
  }

  updateAutoPlayButton() {
    const autoplayButton = document.getElementById('autoplay-button');
    if (!autoplayButton) return;

    const icon = autoplayButton.querySelector('i');
    if (!icon) return;

    if (this.isAutoPlaying) {
      icon.className = 'fas fa-pause';
      autoplayButton.setAttribute('data-tooltip', 'Stop auto play');
      autoplayButton.classList.add('active');
    } else {
      icon.className = 'fas fa-play';
      autoplayButton.setAttribute('data-tooltip', 'Start auto play');
      autoplayButton.classList.remove('active');
    }
  }

  updateSpeedButton() {
    const speedButton = document.getElementById('speed-button');
    if (!speedButton) return;

    const speedText = speedButton.querySelector('.speed-text');
    if (!speedText) return;

    const multiplier = this.speedMultipliers[this.currentSpeedIndex];
    speedText.textContent = `${multiplier}x`;
    
    const tooltipText = multiplier === 1 ? 
      'Normal speed' : 
      `${multiplier}x speed (${(this.autoPlaySpeed / multiplier)}ms between moves)`;
    speedButton.setAttribute('data-tooltip', tooltipText);
  }

  getAutoPlayDelay() {
    const multiplier = this.speedMultipliers[this.currentSpeedIndex];
    return Math.max(50, this.autoPlaySpeed / multiplier); // Minimum 50ms delay
  }

  changeSpeed() {
    // Cycle through speed options
    this.currentSpeedIndex = (this.currentSpeedIndex + 1) % this.speedMultipliers.length;
    this.updateSpeedButton();
    
    // If autoplay is running, restart it with new speed
    if (this.isAutoPlaying) {
      clearInterval(this.autoPlayInterval);
      const makeMove = () => {
        if (!this.isAutoPlaying || this.gameState === 'over' || this.isPaused) {
          this.stopAutoPlay();
          return;
        }

        const move = this.getBestMove();
        if (move && this.canMove(move)) {
          this.move(move);
          this.autoPlayMoves++;
          this.updateAutoPlayButton();
        } else {
          this.stopAutoPlay();
        }
      };

      this.autoPlayInterval = setInterval(makeMove, this.getAutoPlayDelay());
    }
    
    const multiplier = this.speedMultipliers[this.currentSpeedIndex];
    console.log(`Speed changed to ${multiplier}x`);
  }

  // AI Algorithm for 2048 - Uses a simple heuristic approach
  getBestMove() {
    // Use enhanced AI if available, otherwise fall back to basic AI
    if (this.enhancedAI) {
      // Adjust AI difficulty dynamically
      this.adjustAIDifficulty();
      
      const startTime = performance.now();
      const move = this.enhancedAI.getBestMove();
      const endTime = performance.now();
      
      // Log performance for debugging
      if (window.debugAI) {
        console.log(`Enhanced AI move: ${move} (${(endTime - startTime).toFixed(2)}ms)`);
      }
      
      return move;
    } else {
      // Fallback to your existing basic AI
      return this.getBasicAIMove();
    }
  }

  // Keep your existing AI as fallback
  getBasicAIMove() {
    const directions = ['up', 'down', 'left', 'right'];
    let bestMove = null;
    let bestScore = -Infinity;

    for (const direction of directions) {
      if (this.canMove(direction)) {
        const score = this.evaluateMove(direction);
        if (score > bestScore) {
          bestScore = score;
          bestMove = direction;
        }
      }
    }

    return bestMove || directions[0];
  }

  // Add helper method to get max tile
  getMaxTile() {
    let maxTile = 0;
    for (let row = 0; row < this.size; row++) {
      for (let col = 0; col < this.size; col++) {
        maxTile = Math.max(maxTile, this.board[row][col]);
      }
    }
    return maxTile;
  }

  // Add method to change AI difficulty
  changeAIDifficulty() {
    const difficulties = ['easy', 'normal', 'hard', 'expert'];
    const currentIndex = difficulties.indexOf(this.aiDifficulty);
    const nextIndex = (currentIndex + 1) % difficulties.length;
    this.aiDifficulty = difficulties[nextIndex];
    
    // Save preference to localStorage
    localStorage.setItem('aiDifficulty', this.aiDifficulty);
    
    // Update AI settings immediately if AI is available
    this.adjustAIDifficulty();
    
    // Update button appearance
    const aiDifficultyButton = document.getElementById('ai-difficulty-button');
    if (aiDifficultyButton) {
      const buttonText = aiDifficultyButton.querySelector('.button-text');
      if (buttonText) {
        const capitalizedDifficulty = this.aiDifficulty.charAt(0).toUpperCase() + this.aiDifficulty.slice(1);
        buttonText.textContent = capitalizedDifficulty;
      }
      
      // Add visual feedback
      aiDifficultyButton.style.transform = 'scale(1.1)';
      setTimeout(() => {
        aiDifficultyButton.style.transform = '';
      }, 150);
    }
    
    // Show notification with detailed info
    const difficultyInfo = this.getDifficultyInfo(this.aiDifficulty);
    this.showNotification(`AI Difficulty: ${this.aiDifficulty.toUpperCase()}\n${difficultyInfo}`, 3000);
    
    console.log(`🧠 AI difficulty changed to: ${this.aiDifficulty}`);
  }

  // Helper method to get difficulty information
  getDifficultyInfo(difficulty) {
    const info = {
      easy: 'Fast moves, 2-depth search',
      normal: 'Balanced performance, 3-depth search', 
      hard: 'Strong play, 4-depth search',
      expert: 'Maximum strength, 5-6 depth search'
    };
    return info[difficulty] || '';
  }

  initializeEnhancedAI() {
    // Try to initialize the advanced AI first, fallback to enhanced AI
    if (window.AdvancedAI2048Solver) {
      this.advancedAI = new AdvancedAI2048Solver(this);
      this.enhancedAI = this.advancedAI; // Keep compatibility
      console.log('✅ Advanced AI Solver initialized with Expectimax algorithm');
    } else if (window.Enhanced2048AI) {
      this.enhancedAI = new Enhanced2048AI(this);
      console.log('✅ Enhanced AI initialized with Minimax algorithm');
    } else {
      console.warn('⚠️ No AI solvers loaded, falling back to basic AI');
      return;
    }
      
    // Load saved difficulty preference
    const savedDifficulty = localStorage.getItem('aiDifficulty') || 'normal';
    this.aiDifficulty = savedDifficulty;
    
    // Adjust AI difficulty based on board size and performance
    this.adjustAIDifficulty();
    
    // Update button text to match loaded difficulty
    const aiDifficultyButton = document.getElementById('ai-difficulty-button');
    if (aiDifficultyButton) {
      const buttonText = aiDifficultyButton.querySelector('.button-text');
      if (buttonText) {
        const capitalizedDifficulty = this.aiDifficulty.charAt(0).toUpperCase() + this.aiDifficulty.slice(1);
        buttonText.textContent = capitalizedDifficulty;
      }
    }
    
    console.log(`AI difficulty set to: ${this.aiDifficulty}`);
  }

  adjustAIDifficulty() {
    if (!this.enhancedAI) return;

    let weights;
    
    // Check if we're using the Advanced AI or Enhanced AI
    const isAdvancedAI = this.advancedAI instanceof AdvancedAI2048Solver;

    switch (this.aiDifficulty) {
      case 'easy':
        if (isAdvancedAI) {
          weights = { 
            openness: 0.8,      // Lower priority on empty cells
            smoothness: 3.0,    // Reduced smoothness focus
            monotonicity: 3.0,  // Reduced monotonicity
            maxTileCorner: 0.05 // Lower corner bonus
          };
        } else {
          // Legacy Enhanced AI weights
          weights = { 
            emptyCells: 200, 
            smoothness: 50, 
            monotonicity: 500,
            maxTileCorner: 100,
            merging: 300,
            positionScores: 100
          };
        }
        break;
        
      case 'normal':
        if (isAdvancedAI) {
          weights = { 
            openness: 1.0,      // Balanced empty cells priority
            smoothness: 5.0,    // Standard smoothness
            monotonicity: 5.0,  // Standard monotonicity
            maxTileCorner: 0.1  // Standard corner bonus
          };
        } else {
          weights = { 
            emptyCells: 270, 
            smoothness: 100, 
            monotonicity: 1000,
            maxTileCorner: 200,
            merging: 500,
            positionScores: 150
          };
        }
        break;
        
      case 'hard':
        if (isAdvancedAI) {
          weights = { 
            openness: 1.2,      // Higher priority on empty cells
            smoothness: 6.0,    // Increased smoothness focus
            monotonicity: 6.0,  // Increased monotonicity
            maxTileCorner: 0.15 // Higher corner bonus
          };
        } else {
          weights = { 
            emptyCells: 300, 
            smoothness: 150, 
            monotonicity: 1200,
            maxTileCorner: 250,
            merging: 600,
            positionScores: 200
          };
        }
        break;
        
      case 'expert':
        if (isAdvancedAI) {
          weights = { 
            openness: 1.5,      // Maximum priority on empty cells
            smoothness: 8.0,    // Maximum smoothness focus
            monotonicity: 8.0,  // Maximum monotonicity
            maxTileCorner: 0.2  // Maximum corner bonus
          };
        } else {
          weights = { 
            emptyCells: 350, 
            smoothness: 200, 
            monotonicity: 1500,
            maxTileCorner: 300,
            merging: 700,
            positionScores: 250
          };
        }
        break;
    }

    // Apply the weights
    this.enhancedAI.adjustWeights(weights);
    
    console.log(`🔧 AI adjusted: ${this.aiDifficulty} difficulty with ${isAdvancedAI ? 'Advanced' : 'Enhanced'} AI`);
    if (window.debugAI) {
      console.log('Applied weights:', weights);
    }
  }

  // Helper method to count empty cells
  countEmptyCells() {
    let count = 0;
    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        if (this.board[i][j] === 0) count++;
      }
    }
    return count;
  }

  // Enhanced autoplay with better performance monitoring
  startAutoPlay() {
    if (this.autoPlayInterval) return;

    this.isAutoPlaying = true;
    this.autoPlayMoves = 0;
    this.autoPlayStartTime = Date.now();
    
    // Mark this as AI gameplay for stats
    this.playMode = 'AI';
    
    const makeMove = () => {
      if (!this.isAutoPlaying || this.gameState === 'over' || this.isPaused) {
        this.stopAutoPlay();
        return;
      }

      const move = this.getBestMove();
      if (move && this.canMove(move)) {
        this.move(move);
        this.autoPlayMoves++;
        
        // Update UI
        this.updateAutoPlayButton();
      } else {
        // No valid moves, stop autoplay
        this.stopAutoPlay();
      }
    };

    // Start the autoplay loop
    this.autoPlayInterval = setInterval(makeMove, this.getAutoPlayDelay());
    this.updateAutoPlayButton();
    
    console.log(`🤖 Enhanced AI autoplay started (difficulty: ${this.aiDifficulty})`);
  }

  stopAutoPlay() {
    if (this.autoPlayInterval) {
      clearInterval(this.autoPlayInterval);
      this.autoPlayInterval = null;
    }
    
    if (this.isAutoPlaying) {
      const duration = (Date.now() - this.autoPlayStartTime) / 1000;
      const movesPerSecond = (this.autoPlayMoves / duration).toFixed(2);
      
      console.log(`🏁 AI autoplay stopped: ${this.autoPlayMoves} moves in ${duration.toFixed(1)}s (${movesPerSecond} moves/sec)`);
      
      // Show AI performance stats
      if (this.enhancedAI && window.debugAI) {
        const stats = this.enhancedAI.getStats();
        console.log('AI Performance Stats:', stats);
      }
    }
    
    this.isAutoPlaying = false;
    this.playMode = 'Human';
    this.updateAutoPlayButton();
  }

  // Add notification system for AI feedback
  showNotification(message, duration = 2000) {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.ai-notification');
    existingNotifications.forEach(n => n.remove());

    const notification = document.createElement('div');
    notification.className = 'ai-notification';
    
    // Handle multi-line messages
    const lines = message.split('\n');
    if (lines.length > 1) {
      notification.innerHTML = lines.map(line => 
        line.includes(':') ? `<div><strong>${line}</strong></div>` : `<div>${line}</div>`
      ).join('');
    } else {
      notification.textContent = message;
    }
    
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, rgba(255, 204, 0, 0.95) 0%, rgba(255, 153, 0, 0.95) 100%);
      color: #000;
      padding: 12px 18px;
      border-radius: 8px;
      font-weight: bold;
      font-size: 14px;
      line-height: 1.3;
      z-index: 1000;
      animation: slideIn 0.3s ease;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      border: 1px solid rgba(255, 204, 0, 0.3);
      max-width: 300px;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, duration);
  }
}

// Add CSS animations for notifications
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
`;
document.head.appendChild(style);

// Initialize the game when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 DOM loaded, initializing Fancy2048...');
  
  let gameInitialized = false;
  
  function initializeGame() {
    if (!gameInitialized) {
      gameInitialized = true;
      try {
        // Ensure all required elements exist
        const requiredElements = ['board-container', 'score', 'best-score', 'moves', 'time'];
        const missingElements = requiredElements.filter(id => !document.getElementById(id));
        
        if (missingElements.length > 0) {
          console.error('Missing required elements:', missingElements);
          return;
        }
        
        // Initialize the game
        window.game = new Game(4);
        console.log('✅ Fancy2048 initialized successfully!');
        
      } catch (error) {
        console.error('❌ Failed to initialize Fancy2048:', error);
        
        // Show user-friendly error message
        const boardContainer = document.getElementById('board-container');
        if (boardContainer) {
          boardContainer.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: #ff6b6b;">
              <h3>❌ Game Initialization Failed</h3>
              <p>Please refresh the page to try again.</p>
              <button onclick="location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #ff6b6b; color: white; border: none; border-radius: 5px; cursor: pointer;">
                Refresh Page
              </button>
            </div>
          `;
        }
      }
    }
  }
  
  // Initialize the game with a slight delay to ensure DOM is fully loaded
  setTimeout(initializeGame, 100);
});

// Additional debugging helpers
window.debugGame = {
  // Helper function to test win condition (for development/testing only)
  testWinCondition: () => {
    if (window.game) {
      // Add a 2048 tile to test the win message
      window.game.board[0][0] = 2048;
      window.game.updateUI();
      console.log('🧪 Added 2048 tile for testing. Next move will trigger win message.');
    } else {
      console.log('❌ Game not initialized yet');
    }
  },

  // Helper to test continue after win
  testContinueAfterWin: () => {
    if (window.game) {
      window.game.gameState = 'won-continue';
      console.log('🧪 Set game state to "won-continue". You can now move tiles after winning.');
    } else {
      console.log('❌ Game not initialized yet');
    }
  }
};

// Add to your game.js or create a separate debug file
window.debugAI = true; // Set to false to disable AI debugging

window.aiDebugTools = {
  testAI: (moves = 10) => {
    console.log(`Testing AI for ${moves} moves...`);
    const startTime = performance.now();
    
    for (let i = 0; i < moves; i++) {
      const move = game.getBestMove();
      console.log(`Move ${i + 1}: ${move}`);
    }
    
    const endTime = performance.now();
    console.log(`AI test completed in ${(endTime - startTime).toFixed(2)}ms`);
    console.log(`Average time per move: ${((endTime - startTime) / moves).toFixed(2)}ms`);
  },
  
  compareAI: () => {
    console.log('Comparing AI performance...');
    const enhanced = game.enhancedAI?.getBestMove();
    const basic = game.getBasicAIMove();
    console.log(`Enhanced AI suggests: ${enhanced}`);
    console.log(`Basic AI suggests: ${basic}`);
  },
  
  benchmarkAI: (depth = 4) => {
    if (game.enhancedAI) {
      const originalDepth = game.enhancedAI.maxDepth;
      game.enhancedAI.setDepth(depth);
      
      const startTime = performance.now();
      const move = game.enhancedAI.getBestMove();
      const endTime = performance.now();
      
      console.log(`Depth ${depth}: ${move} (${(endTime - startTime).toFixed(2)}ms)`);
      
      game.enhancedAI.setDepth(originalDepth);
      return endTime - startTime;
    }
  }
};