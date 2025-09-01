class Game {
  constructor(size = 4) {
    console.log(`🎮 Initializing Fancy2048 Game (${size}×${size})`);
    
    // Initialize unified managers first
    this.dataManager = window.unifiedDataManager || new UnifiedDataManager();
    this.uiManager = window.unifiedUIManager || new UnifiedUIManager();
    
    // Subscribe to UI changes
    this.uiManager.subscribe((event) => {
      this.handleUIEvent(event);
    });
    
    // Load settings and data from unified data manager
    const settings = this.dataManager.getSettings();
    const savedGame = this.dataManager.loadGameState();
    
    // Core game properties
    this.size = size;
    this.board = savedGame?.board || this.createEmptyBoard();
    this.score = savedGame?.score || 0;
    this.bestScore = this.dataManager.getData('bestScore', 0);
    this.moves = savedGame?.moves || 0;
    this.startTime = savedGame?.time || null;

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
    
    // Game history for undo - optimized based on device
    this.gameStateStack = [];
    this.maxUndoSteps = this.isMobile() ? 5 : 10;
    
    // Visual settings from unified settings
    this.isLightMode = settings.theme === 'light';
    this.hueValue = settings.hueValue || 0;
    
    // Touch handling with performance optimization
    this.touchStartX = null;
    this.touchStartY = null;
    this.touchMoved = false;
    this.touchStartTime = null;
    this.lastTouchTime = 0;
    this.touchThrottleDelay = 50;
    
    // Timer
    this.timerInterval = null;
    
    // Stats managed by unified data manager
    this.maxStoredStats = 500;
    
    // Performance optimization
    this.debounceTimeout = null;
    this.resizeTimeout = null;
    
    // Mobile state management
    this.lastSavedState = null;
    this.autoSaveInterval = null;
    this.pageVisibilityTimeout = null;
    this.backgroundTime = 0;
    this.isInBackground = false;

    // Enhanced mobile detection
    this.isMobileDevice = this.detectMobileDevice();
    this.isTablet = this.detectTablet();
    this.isDesktop = !this.isMobileDevice && !this.isTablet;
    
    // Game features from settings
    this.animationSpeed = settings.animationsEnabled ? 1 : 0;
    this.soundEnabled = settings.soundEnabled;
    this.vibrationEnabled = settings.vibrationEnabled;
    
    // AI Integration with unified data
    this.aiLearningSystem = new AILearningSystem();
    this.enhancedAI = null;
    this.isAIPlaying = false;
    this.aiSpeed = 1000;
    this.aiDifficulty = settings.aiDifficulty || 'normal';
    this.gameMode = savedGame?.gameMode || 'human';
    
    // Performance tracking
    this.performanceMetrics = {
      moveStartTime: 0,
      totalMoveTime: 0,
      moveCount: 0,
      averageMoveTime: 0,
      slowMoves: 0
    };

    // Autoplay properties with improved performance
    this.isAutoPlaying = false;
    this.autoPlayInterval = null;
    this.autoPlaySpeed = 800; // milliseconds between moves
    this.speedMultipliers = [1, 1.5, 2, 4, 8, 'MAX']; // Speed options including MAX
    this.currentSpeedIndex = 0; // Current speed index
    this.isAutoPlayedGame = false; // Track if current game used autoplay
    this.hasHumanMoves = false; // Track if current game has human moves

    // Enhanced error tracking and debugging
    this.errorCount = 0;
    this.maxErrors = 10;
    this.debugMode = window.debugFancy2048 || false;
    this.performanceMetrics = {
      moveCount: 0,
      averageMoveTime: 0,
      totalMoveTime: 0
    };

    // Initialize the game with error handling
    try {
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
      
      // Initialize enhanced AI and learning systems automatically
      this.enhancedAI = null;
      this.aiLearningSystem = null;
      this.initializeEnhancedSystems();
      
      // AI performance settings
      this.aiDifficulty = this.dataManager.getData('aiDifficulty', 'normal');
      this.adaptiveDepth = true;
      
      // Enhanced game state persistence (improved mobile handling)
      this.startAutoSave();
      
      // Enhanced mobile optimizations
      if (this.isMobileDevice()) {
        this.enableAdvancedMobileOptimizations();
      }
      
      // Clean up old data periodically
      this.scheduleDataCleanup();
      
    } catch (error) {
      console.error('❌ Failed to initialize game:', error);
      this.handleInitializationError(error);
    }
    this.restoreGameStateIfNeeded();
    
    // Add message handler for test interface
    this.setupMessageHandler();
    
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
    
    // Initialize responsive variables
    this.updateResponsiveVariables();
    
    // Create grid cells for the board
    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        const gridCell = document.createElement('div');
        gridCell.className = 'grid-cell';
        gridCell.setAttribute('data-row', i);
        gridCell.setAttribute('data-col', j);
        boardContainer.appendChild(gridCell);
      }
    }
    
    console.log(`✅ Board container setup for ${this.size}x${this.size} grid - Responsive sizing applied`);
  }

  setupMessageHandler() {
    // Handle messages from parent window (for test interface)
    window.addEventListener('message', (event) => {
      if (event.data.type === 'changeGridSize') {
        const newSize = event.data.size;
        if ([4, 5, 7, 9].includes(newSize) && newSize !== this.size) {
          console.log(`🔄 Changing grid size from ${this.size}x${this.size} to ${newSize}x${newSize}`);
          this.size = newSize;
          this.reset();
          this.refreshLayout();
          
          // Notify parent of the change
          window.parent.postMessage({
            type: 'gridSizeChanged',
            size: newSize
          }, '*');
        }
      }
    });
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

    // Enhanced state persistence - save game state when user is about to leave
    window.addEventListener('beforeunload', () => {
      this.saveCurrentGameState();
      this.stopAutoSave(); // Stop auto-save interval
    });

    // Mobile-specific events for better lifecycle management
    if (this.isMobileDevice()) {
      window.addEventListener('pagehide', () => {
        this.saveCurrentGameState();
      });
      
      window.addEventListener('pageshow', (event) => {
        if (event.persisted) {
          // Page was restored from cache, attempt to restore game state
          this.restoreGameStateIfNeeded();
        }
      });
    }
  }

  initializeResizeObserver() {
    // Enhanced responsive handling with viewport and orientation detection
    let resizeTimeout;
    let lastWidth = window.innerWidth;
    let lastHeight = window.innerHeight;
    let lastOrientation = window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
    
    // Unified resize handler
    const handleResize = () => {
      const currentWidth = window.innerWidth;
      const currentHeight = window.innerHeight;
      const currentOrientation = currentHeight > currentWidth ? 'portrait' : 'landscape';
      
      // Check for significant changes
      const widthChange = Math.abs(currentWidth - lastWidth) > 50;
      const heightChange = Math.abs(currentHeight - lastHeight) > 50;
      const orientationChange = currentOrientation !== lastOrientation;
      
      if (widthChange || heightChange || orientationChange) {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
          console.log(`📱 Viewport change detected: ${currentWidth}×${currentHeight} (${currentOrientation})`);
          
          // Update responsive variables first
          this.updateResponsiveVariables();
          
          // Then refresh layout
          this.refreshLayout();
          
          // Update stored values
          lastWidth = currentWidth;
          lastHeight = currentHeight;
          lastOrientation = currentOrientation;
        }, orientationChange ? 300 : 150); // Longer delay for orientation changes
      }
    };
    
    // Modern ResizeObserver for element-specific changes
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(this.debounce((entries) => {
        for (const entry of entries) {
          if (entry.target.id === 'board-container') {
            // Only update font sizes if the container actually resized
            const rect = entry.contentRect;
            if (rect.width > 0 && rect.height > 0) {
              setTimeout(() => this.updateTileFontSizes(), 50);
            }
          }
        }
      }, 100));

      // Observe both body and board container
      const boardContainer = document.getElementById('board-container');
      if (boardContainer) {
        this.resizeObserver.observe(boardContainer);
        this.resizeObserver.observe(document.body);
        console.log('✅ Enhanced ResizeObserver initialized');
      }
    }
    
    // Window resize events for viewport changes
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', () => {
      // Give time for the orientation change to complete
      setTimeout(handleResize, 100);
      setTimeout(handleResize, 500); // Double-check after animations
    });
    
    // Initial setup
    handleResize();
    
    console.log('✅ Enhanced responsive system initialized');
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
    
    const exportStatsButton = document.getElementById('export-stats-button');
    if (exportStatsButton) {
      exportStatsButton.addEventListener('click', this.exportGameStatistics.bind(this));
      exportStatsButton.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.exportGameStatistics();
        }
      });
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
        const savedDifficulty = this.dataManager.getData('aiDifficulty', 'normal');
        this.aiDifficulty = savedDifficulty;
        const capitalizedDifficulty = this.aiDifficulty.charAt(0).toUpperCase() + this.aiDifficulty.slice(1);
        buttonText.textContent = capitalizedDifficulty;
      }
    }

    // Setup mobile hamburger menu
    this.setupMobileMenu();
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

  setupMobileMenu() {
    // Mobile hamburger menu has been removed
    // All buttons are now directly accessible on all screen sizes
    console.log('✅ Mobile hamburger menu removed - buttons are now always visible');
  }

  // Mobile menu functions no longer needed - keeping stubs for compatibility
  setupMobileButtonDuplicates() {
    console.log('✅ Mobile button duplicates no longer needed');
  }

  syncMobileButtonState(mobileId, desktopId) {
    // No longer needed
  }

  syncAllMobileButtonStates() {
    // No longer needed
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
      this.dataManager.setData('bestScore', this.bestScore);
    }
  }

  openStatisticsPage() {
    window.location.href = '../pages/leaderboard.html';
  }

  exportGameStatistics() {
    try {
      let stats = [];
      try {
        stats = this.dataManager.getData('gameStats', []);
      } catch (e) {
        this.showNotification('No game statistics to export!', 'error');
        return;
      }
      
      const uniqueStats = Array.from(new Set(stats.map(stat => JSON.stringify(stat)))).map(stat => JSON.parse(stat));
      if (uniqueStats.length === 0) {
        this.showNotification('No game statistics to export!', 'error');
        return;
      }

      // Format date helper
      const formatDate = (date) => {
        return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear().toString().slice(-2)} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
      };

      // Create enhanced JSON structure with metadata
      const exportData = {
        exportInfo: {
          exportedAt: new Date().toISOString(),
          gameVersion: "Fancy2048",
          totalGames: uniqueStats.length,
          dataVersion: "1.0",
          exportedFrom: "Main Game Interface"
        },
        summary: {
          totalGames: uniqueStats.length,
          bestScore: Math.max(...uniqueStats.map(stat => parseInt(stat.score) || 0)),
          bestTile: Math.max(...uniqueStats.map(stat => parseInt(stat.bestTile) || 0)),
          totalMoves: uniqueStats.reduce((sum, stat) => sum + (parseInt(stat.moves) || 0), 0),
          averageScore: Math.round(uniqueStats.reduce((sum, stat) => sum + (parseInt(stat.score) || 0), 0) / uniqueStats.length),
          gamesWon: uniqueStats.filter(stat => parseInt(stat.bestTile) >= 2048).length,
          winRate: ((uniqueStats.filter(stat => parseInt(stat.bestTile) >= 2048).length / uniqueStats.length) * 100).toFixed(1) + '%',
          gamesByMode: {
            human: uniqueStats.filter(stat => (stat.playMode || (stat.isAutoPlayed ? 'AI' : 'Human')) === 'Human').length,
            ai: uniqueStats.filter(stat => (stat.playMode || (stat.isAutoPlayed ? 'AI' : 'Human')) === 'AI').length,
            mixed: uniqueStats.filter(stat => (stat.playMode || (stat.isAutoPlayed ? 'AI' : 'Human')) === 'Mixed').length
          },
          gamesByGridSize: uniqueStats.reduce((acc, stat) => {
            const gridSize = stat.gridSize || 4;
            acc[`${gridSize}x${gridSize}`] = (acc[`${gridSize}x${gridSize}`] || 0) + 1;
            return acc;
          }, {})
        },
        games: uniqueStats.map(stat => ({
          ...stat,
          // Ensure consistent field formatting
          date: stat.date,
          dateFormatted: formatDate(new Date(stat.date)),
          gridSize: stat.gridSize || 4,
          gridType: stat.gridType || `${stat.gridSize || 4}x${stat.gridSize || 4}`,
          playMode: stat.playMode || (stat.isAutoPlayed ? 'AI' : 'Human'),
          score: parseInt(stat.score) || 0,
          bestScore: parseInt(stat.bestScore) || 0,
          bestTile: parseInt(stat.bestTile) || 0,
          moves: parseInt(stat.moves) || 0,
          duration: stat.time,
          won: parseInt(stat.bestTile) >= 2048
        }))
      };

      const jsonContent = JSON.stringify(exportData, null, 2);
      const filename = `fancy2048_statistics_${new Date().toISOString().split('T')[0]}.json`;
      
      // Create download
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      this.showNotification(`Statistics exported to ${filename}`, 'success');
      
    } catch (error) {
      console.error('Failed to export statistics:', error);
      this.showNotification('Failed to export statistics', 'error');
    }
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
        isAutoPlayed: this.isAutoPlayedGame, // Track if AI was used
        hasHumanMoves: this.hasHumanMoves, // Track if human moves were made
        playMode: this.getPlayModeString() // Get comprehensive play mode
      };
      
      // Use unified data manager for statistics
      const currentStats = this.dataManager.getData('gameStats', []);
      currentStats.push(stat);
      this.dataManager.setData('gameStats', currentStats);
      this.stats = currentStats;
    }
  }

  getPlayModeString() {
    // Determine the play mode based on which inputs were used
    if (this.isAutoPlayedGame && this.hasHumanMoves) {
      return 'AI + Human';
    } else if (this.isAutoPlayedGame) {
      return 'AI';
    } else if (this.hasHumanMoves) {
      return 'Human';
    } else {
      // Edge case: no moves made (shouldn't really happen in saved stats)
      return 'Human';
    }
  }

  startTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    
    this.startTime = new Date();
    this.pausedTime = 0;
    
    this.timerInterval = setInterval(() => {
      if (!this.isPaused && this.gameState === 'playing') {
        const currentTime = new Date();
        const totalElapsed = Math.floor((currentTime - this.startTime) / 1000);
        const actualGameTime = totalElapsed - this.pausedTime;
        const timeString = this.formatTime(actualGameTime);
        
        // Update through unified UI manager
        this.uiManager.updateTime(timeString);
      }
    }, 1000);
  }

  /**
   * Format time for display
   */
  formatTime(seconds) {
    const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${minutes}:${secs}`;
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
    
    // Clear saved mobile state
    this.dataManager.removeData('currentGameState');
    
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
    this.hasHumanMoves = false; // Reset human moves flag
    
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
    
    // Let CSS handle font sizing using our responsive variables
    // Remove any inline font-size styles to allow CSS to take over
    tileElement.style.fontSize = '';
    
    // Apply appropriate CSS class for font scaling based on value length
    if (value >= 4096) {
      // Use CSS variable --font-scale-mega for 5+ digit numbers
      tileElement.style.fontSize = `calc(var(--tile-size) * var(--font-scale-mega))`;
    } else if (value >= 1024) {
      // Use CSS variable --font-scale-large for 4-digit numbers
      tileElement.style.fontSize = `calc(var(--tile-size) * var(--font-scale-large))`;
    } else {
      // Use CSS variable --font-scale-base for 1-3 digit numbers
      tileElement.style.fontSize = `calc(var(--tile-size) * var(--font-scale-base))`;
    }
  }

  // Enhanced updateTileFontSizes that respects viewport changes
  updateTileFontSizes() {
    // First update the responsive variables to get current scaling
    this.updateResponsiveVariables();
    
    // Then update all tile font sizes
    const tiles = document.querySelectorAll('.tile');
    tiles.forEach(tile => {
      this.adjustTileFontSize(tile);
    });
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

  // Game mechanics with enhanced move validation
  canMove(direction) {
    // Prevent checking moves during animations to avoid race conditions
    if (this.animationInProgress) {
      return false;
    }
    
    // Simulate the move to check if anything would change
    const originalBoard = this.board.map(row => [...row]);
    
    let hasMove = false;
    
    try {
      switch (direction) {
        case 'up':
          hasMove = this.simulateMoveUp();
          break;
        case 'down':
          hasMove = this.simulateMoveDown();
          break;
        case 'left':
          hasMove = this.simulateMoveLeft();
          break;
        case 'right':
          hasMove = this.simulateMoveRight();
          break;
        default:
          console.error('❌ Invalid direction in canMove:', direction);
          return false;
      }
    } catch (error) {
      console.error(`❌ Error checking move ${direction}:`, error);
      // Ensure board is restored even on error
      this.board = originalBoard;
      return false;
    }
    
    // Restore original board
    this.board = originalBoard;
    
    return hasMove;
  }
  
  // Fixed simulate moves to correctly check if moves are possible
  simulateMoveUp() {
    let moved = false;
    
    for (let col = 0; col < this.size; col++) {
      // Extract non-zero values from column (top to bottom)
      const column = [];
      for (let row = 0; row < this.size; row++) {
        if (this.board[row][col] !== 0) {
          column.push(this.board[row][col]);
        }
      }
      
      // If column is empty, no move possible
      if (column.length === 0) continue;
      
      // Check if tiles can slide up (if there are zeros above non-zero tiles)
      let firstNonZeroRow = -1;
      for (let row = 0; row < this.size; row++) {
        if (this.board[row][col] !== 0) {
          firstNonZeroRow = row;
          break;
        }
      }
      
      // If first non-zero tile is not at row 0, tiles can slide up
      if (firstNonZeroRow > 0) {
        moved = true;
        break;
      }
      
      // Check if adjacent tiles can merge
      for (let i = 0; i < column.length - 1; i++) {
        if (column[i] === column[i + 1]) {
          moved = true;
          break;
        }
      }
      
      if (moved) break;
    }
    
    return moved;
  }
  
  simulateMoveDown() {
    let moved = false;
    
    for (let col = 0; col < this.size; col++) {
      // Extract non-zero values from column (bottom to top)
      const column = [];
      for (let row = this.size - 1; row >= 0; row--) {
        if (this.board[row][col] !== 0) {
          column.push(this.board[row][col]);
        }
      }
      
      // If column is empty, no move possible
      if (column.length === 0) continue;
      
      // Check if tiles can slide down (if there are zeros below non-zero tiles)
      let lastNonZeroRow = -1;
      for (let row = this.size - 1; row >= 0; row--) {
        if (this.board[row][col] !== 0) {
          lastNonZeroRow = row;
          break;
        }
      }
      
      // If last non-zero tile is not at bottom row, tiles can slide down
      if (lastNonZeroRow < this.size - 1) {
        moved = true;
        break;
      }
      
      // Check if adjacent tiles can merge (when moving down, we check from bottom)
      for (let i = 0; i < column.length - 1; i++) {
        if (column[i] === column[i + 1]) {
          moved = true;
          break;
        }
      }
      
      if (moved) break;
    }
    
    return moved;
  }
  
  simulateMoveLeft() {
    let moved = false;
    
    for (let row = 0; row < this.size; row++) {
      // Extract non-zero values from row (left to right)
      const rowData = [];
      for (let col = 0; col < this.size; col++) {
        if (this.board[row][col] !== 0) {
          rowData.push(this.board[row][col]);
        }
      }
      
      // If row is empty, no move possible
      if (rowData.length === 0) continue;
      
      // Check if tiles can slide left (if there are zeros to the left of non-zero tiles)
      let firstNonZeroCol = -1;
      for (let col = 0; col < this.size; col++) {
        if (this.board[row][col] !== 0) {
          firstNonZeroCol = col;
          break;
        }
      }
      
      // If first non-zero tile is not at col 0, tiles can slide left
      if (firstNonZeroCol > 0) {
        moved = true;
        break;
      }
      
      // Check if adjacent tiles can merge
      for (let i = 0; i < rowData.length - 1; i++) {
        if (rowData[i] === rowData[i + 1]) {
          moved = true;
          break;
        }
      }
      
      if (moved) break;
    }
    
    return moved;
  }
  
  simulateMoveRight() {
    let moved = false;
    
    for (let row = 0; row < this.size; row++) {
      // Extract non-zero values from row (right to left)
      const rowData = [];
      for (let col = this.size - 1; col >= 0; col--) {
        if (this.board[row][col] !== 0) {
          rowData.push(this.board[row][col]);
        }
      }
      
      // If row is empty, no move possible
      if (rowData.length === 0) continue;
      
      // Check if tiles can slide right (if there are zeros to the right of non-zero tiles)
      let lastNonZeroCol = -1;
      for (let col = this.size - 1; col >= 0; col--) {
        if (this.board[row][col] !== 0) {
          lastNonZeroCol = col;
          break;
        }
      }
      
      // If last non-zero tile is not at rightmost col, tiles can slide right
      if (lastNonZeroCol < this.size - 1) {
        moved = true;
        break;
      }
      
      // Check if adjacent tiles can merge (when moving right, we check from right)
      for (let i = 0; i < rowData.length - 1; i++) {
        if (rowData[i] === rowData[i + 1]) {
          moved = true;
          break;
        }
      }
      
      if (moved) break;
    }
    
    return moved;
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
        
        // Automatically record move for AI learning (if learning system is available)
        if (this.aiLearningSystem && this.gameStateStack.length >= 2) {
          try {
            const previousState = this.gameStateStack[this.gameStateStack.length - 2];
            const currentState = this.board.flat();
            
            // Ensure we have valid states before recording
            if (previousState && previousState.board && Array.isArray(previousState.board)) {
              this.aiLearningSystem.recordMove(
                previousState.board.flat(),
                direction,
                currentState,
                this.scoreDelta
              );
              console.log('📊 Move recorded for AI learning:', direction, 'Score delta:', this.scoreDelta);
            }
          } catch (error) {
            console.warn('⚠️ Failed to record move for AI learning:', error);
          }
        }
        
        // Update UI first, then add new tile after animation
        this.updateUI();
        
        // Dispatch accessibility event for screen readers and audio feedback
        document.dispatchEvent(new CustomEvent('tilesMoved', {
          detail: { 
            direction, 
            score: this.score, 
            scoreDelta: this.scoreDelta,
            moved: true 
          }
        }));
        
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


  updateScoreDisplay() {
    // Use unified UI manager for consistent score updates
    this.uiManager.updateAllStats({
      score: this.score,
      bestScore: this.bestScore,
      moves: this.moves,
      time: this.formatTime(Math.floor((Date.now() - (this.startTime || Date.now())) / 1000))
    });
    
    // Update best score in data manager if needed
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      this.dataManager.setData('bestScore', this.bestScore);
    }
  }

  /**
   * Handle UI events from unified UI manager
   */
  handleUIEvent(event) {
    const { event: eventType, value, oldValue } = event;
    
    switch (eventType) {
      case 'score':
        // Handle score change animations or effects
        break;
      case 'bestScore':
        // Handle new best score effects
        if (value > oldValue && this.soundEnabled) {
          this.playSound('achievement');
        }
        break;
      case 'layout':
        // Handle layout changes (mobile/desktop)
        this.handleLayoutChange(value === 'desktop');
        break;
      case 'orientation':
        // Handle orientation changes
        this.handleOrientationChange();
        break;
      case 'resize':
        // Handle window resize
        this.handleResize(value);
        break;
    }
  }

  /**
   * Handle layout changes between mobile and desktop
   */
  handleLayoutChange(isDesktop) {
    // Update board sizing if needed
    this.refreshLayout();
    
    // Adjust AI speed for device
    if (!isDesktop && this.isAIPlaying) {
      this.aiSpeed = Math.max(this.aiSpeed, 800); // Slower on mobile
    }
  }

  // AI Learning Integration Methods

  /**
   * Record game completion for automatic AI learning
   */
  recordGameCompletion(won) {
    try {
      // Get max tile value
      let maxTile = 0;
      for (let row = 0; row < this.size; row++) {
        for (let col = 0; col < this.size; col++) {
          if (this.board[row][col] > maxTile) {
            maxTile = this.board[row][col];
          }
        }
      }

      // Automatically record with AI Learning System
      if (this.aiLearningSystem) {
        this.aiLearningSystem.recordGameEnd(this.score, maxTile, won, this.moves);
        
        if (window.debugAI) {
          console.log(`🧠 AI Learning: Automatically recorded game completion - Score: ${this.score}, Max Tile: ${maxTile}, Won: ${won}`);
        }
      }
    } catch (error) {
      console.warn('⚠️ Failed to record game completion for automatic learning:', error);
    }
  }

  /**
   * Get AI learning statistics (automatic system)
   */
  getAILearningStats() {
    try {
      if (this.aiLearningSystem) {
        return this.aiLearningSystem.getLearningStats();
      }
      
      return null;
    } catch (error) {
      console.warn('⚠️ Failed to get AI learning stats:', error);
      return null;
    }
  }

  /**
   * Export AI learning data
   */
  exportAILearningData() {
    try {
      let learningSystem = null;
      
      if (this.advancedAI && this.advancedAI.getLearningSystem) {
        learningSystem = this.advancedAI.getLearningSystem();
      } else if (this.enhancedAI && this.enhancedAI.getLearningSystem) {
        learningSystem = this.enhancedAI.getLearningSystem();
      }
      
      if (learningSystem && learningSystem.exportLearningData) {
        learningSystem.exportLearningData();
        return true;
      } else {
        console.warn('⚠️ No learning system available for export');
        return false;
      }
    } catch (error) {
      console.error('❌ Failed to export AI learning data:', error);
      return false;
    }
  }

  /**
   * Import AI learning data
   */
  async importAILearningData(file) {
    try {
      let learningSystem = null;
      
      if (this.advancedAI && this.advancedAI.getLearningSystem) {
        learningSystem = this.advancedAI.getLearningSystem();
      } else if (this.enhancedAI && this.enhancedAI.getLearningSystem) {
        learningSystem = this.enhancedAI.getLearningSystem();
      }
      
      if (learningSystem && learningSystem.importLearningData) {
        const result = await learningSystem.importLearningData(file);
        console.log('✅ AI learning data imported successfully');
        return result;
      } else {
        throw new Error('No learning system available for import');
      }
    } catch (error) {
      console.error('❌ Failed to import AI learning data:', error);
      throw error;
    }
  }

  /**
   * Toggle AI learning on/off
   */
  toggleAILearning() {
    try {
      if (this.advancedAI && this.advancedAI.setLearningEnabled) {
        const currentState = this.advancedAI.isLearningEnabled;
        this.advancedAI.setLearningEnabled(!currentState);
        
        console.log(`🧠 AI Learning ${!currentState ? 'enabled' : 'disabled'}`);
        return !currentState;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Failed to toggle AI learning:', error);
      return false;
    }
  }

  /**
   * Clear AI learning data
   */
  clearAILearningData() {
    try {
      let learningSystem = null;
      
      if (this.advancedAI && this.advancedAI.getLearningSystem) {
        learningSystem = this.advancedAI.getLearningSystem();
      } else if (this.enhancedAI && this.enhancedAI.getLearningSystem) {
        learningSystem = this.enhancedAI.getLearningSystem();
      }
      
      if (learningSystem && learningSystem.clearLearningData) {
        learningSystem.clearLearningData();
        console.log('🔄 AI learning data cleared');
        return true;
      } else {
        console.warn('⚠️ No learning system available to clear');
        return false;
      }
    } catch (error) {
      console.error('❌ Failed to clear AI learning data:', error);
      return false;
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

  // Comprehensive game over detection for all scenarios
  checkGameState() {
    // Skip game state check if game is already over or won
    if (this.gameState === 'over' || this.gameState === 'won') {
      return;
    }
    
    // Skip if animation is in progress to prevent race conditions
    if (this.animationInProgress) {
      console.log('⏳ Skipping game state check - animation in progress');
      return;
    }
    
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
    
    // Check if board is full first
    let emptyCount = 0;
    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        if (this.board[i][j] === 0) {
          emptyCount++;
        }
      }
    }
    
    // If board has empty spaces, game can continue
    if (emptyCount > 0) {
      console.log(`✅ Game continues - ${emptyCount} empty spaces available`);
      return;
    }
    
    // Board is full - check if any moves are possible
    console.log('🔍 Board is full, checking for valid moves...');
    
    const canMoveUp = this.canMove('up');
    const canMoveDown = this.canMove('down');
    const canMoveLeft = this.canMove('left');
    const canMoveRight = this.canMove('right');
    
    const canMoveAny = canMoveUp || canMoveDown || canMoveLeft || canMoveRight;
    
    // Enhanced debug logging for all play modes
    const playMode = this.isAutoPlaying ? 'AI' : (this.hasHumanMoves ? (this.isAutoPlayedGame ? 'Mixed' : 'Human') : 'Human');
    console.log(`🎮 Game Over Check [${playMode} Mode]:`, {
      up: canMoveUp,
      down: canMoveDown,
      left: canMoveLeft,
      right: canMoveRight,
      any: canMoveAny,
      boardFull: emptyCount === 0,
      gameState: this.gameState
    });
    
    if (!canMoveAny) {
      console.log(`💀 Game Over detected in ${playMode} mode - No valid moves available`);
      this.gameState = 'over';
      
      // Stop AI if running
      if (this.isAutoPlaying) {
        this.stopAutoPlay();
      }
      
      // Record game completion for statistics and AI learning
      this.recordGameCompletion(false);
      
      // Dispatch accessibility event for game over
      document.dispatchEvent(new CustomEvent('gameOver', {
        detail: { 
          finalScore: this.score, 
          moves: this.moves,
          playMode: playMode
        }
      }));
      
      // Show game over message
      this.showGameOver();
    } else {
      console.log(`✅ Valid moves available in ${playMode} mode, game continues`);
    }
  }

  showGameOver() {
    const gameOverElement = document.getElementById('game-over');
    
    // Record game completion for AI learning
    this.recordGameCompletion(false);
    
    if (this.isMobileDevice()) {
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
    
    // Record game completion for AI learning (win = true)
    this.recordGameCompletion(true);
    
    // Dispatch accessibility event for game won
    document.dispatchEvent(new CustomEvent('gameWon', {
      detail: { 
        finalScore: this.score, 
        moves: this.moves,
        tile: 2048
      }
    }));
    
    if (this.isMobileDevice()) {
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
        hasHumanMoves: this.hasHumanMoves,
        hueValue: this.hueValue,
        isLightMode: this.isLightMode,
        size: this.size,
        timestamp: Date.now()
      };
      
      try {
        this.dataManager.setData('currentGameState', gameState);
        console.log('📱 Game state saved for mobile resume');
      } catch (e) {
        console.warn('Failed to save game state:', e);
      }
    }
  }

  restoreGameStateIfNeeded() {
    try {
      const gameState = this.dataManager.getData('currentGameState');
      if (gameState) {
        
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
            this.hasHumanMoves = gameState.hasHumanMoves || false;
            
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
        this.dataManager.removeData('currentGameState');
      }
    } catch (e) {
      console.warn('Failed to restore game state:', e);
      this.dataManager.removeData('currentGameState');
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
    if (this.isMobileDevice()) {
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
    // Also prevent input during animations to avoid race conditions
    if (this.isPaused || this.animationInProgress || (this.gameState !== 'playing' && this.gameState !== 'won-continue')) {
      return;
    }
    
    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault();
        this.hasHumanMoves = true; // Track human move
        if (this.move('up')) {
          // Move succeeded - check game state after move completes
          setTimeout(() => {
            if (!this.animationInProgress) {
              this.checkGameState();
            }
          }, 250); // Wait for animations to complete
        }
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.hasHumanMoves = true; // Track human move
        if (this.move('down')) {
          setTimeout(() => {
            if (!this.animationInProgress) {
              this.checkGameState();
            }
          }, 250);
        }
        break;
      case 'ArrowLeft':
        event.preventDefault();
        this.hasHumanMoves = true; // Track human move
        if (this.move('left')) {
          setTimeout(() => {
            if (!this.animationInProgress) {
              this.checkGameState();
            }
          }, 250);
        }
        break;
      case 'ArrowRight':
        event.preventDefault();
        this.hasHumanMoves = true; // Track human move
        if (this.move('right')) {
          setTimeout(() => {
            if (!this.animationInProgress) {
              this.checkGameState();
            }
          }, 250);
        }
        break;
    }
  }

  // Enhanced touch handling for mobile with advanced gesture recognition
  handleTouchStart(event) {
    const now = Date.now();
    
    // Throttle rapid touches for performance
    if (this.lastTouchTime && now - this.lastTouchTime < this.touchThrottleDelay) {
      return;
    }
    this.lastTouchTime = now;

    if (this.isPaused || this.animationInProgress || (this.gameState !== 'playing' && this.gameState !== 'won-continue')) {
      return;
    }
    
    try {
      // Support multi-touch by using first touch only
      const touch = event.touches[0];
      this.touchStartX = touch.clientX;
      this.touchStartY = touch.clientY;
      this.touchStartTime = now;
      this.touchMoved = false;
      
      // Enhanced visual feedback for touch start
      const boardContainer = document.getElementById('board-container');
      if (boardContainer) {
        boardContainer.style.transform = 'scale(0.98)';
        boardContainer.style.transition = 'transform 0.1s cubic-bezier(0.2, 0, 0.2, 1)';
      }
      
      // Prevent default behavior to avoid scrolling and context menus
      event.preventDefault();
      
      // Add haptic feedback on supported devices
      if (navigator.vibrate && !this.isInBackground) {
        navigator.vibrate(10);
      }
    } catch (error) {
      console.error('Touch start error:', error);
      this.errorCount++;
    }
  }

  handleTouchMove(event) {
    if (!this.touchStartX || !this.touchStartY) return;
    
    // Mark that touch has moved (helps distinguish from taps)
    this.touchMoved = true;
    
    // Calculate movement for potential preview
    const touch = event.touches[0];
    const deltaX = touch.clientX - this.touchStartX;
    const deltaY = touch.clientY - this.touchStartY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    // Show subtle visual preview for large movements
    if (distance > 20) {
      const boardContainer = document.getElementById('board-container');
      if (boardContainer) {
        const maxOffset = 8;
        const offsetX = Math.max(-maxOffset, Math.min(maxOffset, deltaX * 0.1));
        const offsetY = Math.max(-maxOffset, Math.min(maxOffset, deltaY * 0.1));
        boardContainer.style.transform = `scale(0.98) translate(${offsetX}px, ${offsetY}px)`;
      }
    }
    
    // Prevent scrolling during swipe
    event.preventDefault();
  }

  handleTouchEnd(event) {
    if (!this.touchStartX || !this.touchStartY || this.isPaused || this.animationInProgress || (this.gameState !== 'playing' && this.gameState !== 'won-continue')) {
      this.resetTouchState();
      return;
    }
    
    const boardContainer = document.getElementById('board-container');
    if (boardContainer) {
      boardContainer.style.transform = '';
      boardContainer.style.transition = '';
    }
    
    try {
      const touch = event.changedTouches[0];
      const touchEndX = touch.clientX;
      const touchEndY = touch.clientY;
      const touchEndTime = Date.now();
      
      const deltaX = touchEndX - this.touchStartX;
      const deltaY = touchEndY - this.touchStartY;
      const deltaTime = touchEndTime - this.touchStartTime;
      
      // Enhanced swipe detection with improved accuracy
      const swipeDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const velocity = swipeDistance / deltaTime;
      
      // Adaptive thresholds based on screen size and device capabilities
      const screenMin = Math.min(window.innerWidth, window.innerHeight);
      const minSwipeDistance = Math.max(25, screenMin * 0.04);
      const maxSwipeTime = 800;
      const minVelocity = 0.08;
      
      // Enhanced validation for intentional swipes
      const isValidSwipe = 
        swipeDistance >= minSwipeDistance && 
        deltaTime <= maxSwipeTime && 
        velocity >= minVelocity &&
        this.touchMoved;
      
      if (!isValidSwipe) {
        this.showInvalidSwipe();
        this.resetTouchState();
        return;
      }
      
      // Determine direction with improved accuracy
      const absDeltaX = Math.abs(deltaX);
      const absDeltaY = Math.abs(deltaY);
      
      let direction = null;
      
      // Enhanced direction detection with bias correction
      if (absDeltaX > absDeltaY * 0.8) {
        // Horizontal swipe
        direction = deltaX > 0 ? 'right' : 'left';
      } else if (absDeltaY > absDeltaX * 0.8) {
        // Vertical swipe
        direction = deltaY > 0 ? 'down' : 'up';
      }
      
      if (direction) {
        const moveStartTime = performance.now();
        const moved = this.move(direction);
        const moveTime = performance.now() - moveStartTime;
        
        this.trackMovePerformance(moveTime);
        
        if (moved) {
          this.showMoveSuccess(direction);
          // Add haptic feedback for successful moves
          if (navigator.vibrate && !this.isInBackground) {
            navigator.vibrate([25, 10, 25]);
          }
          
          // Enhanced game state check with proper timing
          setTimeout(() => {
            if (!this.animationInProgress) {
              this.checkGameState();
            }
          }, this.isMobileDevice() ? 300 : 250);
          
        } else {
          this.showInvalidMove();
        }
      }
      
    } catch (error) {
      GameErrorHandler.handleError(error, 'Touch');
    } finally {
      this.resetTouchState();
    }
  }

  resetTouchState() {
    this.touchStartX = null;
    this.touchStartY = null;
    this.touchStartTime = null;
    this.touchMoved = false;
  }

  showSwipeIndicator(direction) {
    // Enhanced visual feedback for swipe direction
    const indicator = document.createElement('div');
    indicator.className = 'swipe-indicator';
    indicator.innerHTML = this.getDirectionIcon(direction);
    
    const boardContainer = document.getElementById('board-container');
    const rect = boardContainer.getBoundingClientRect();
    
    indicator.style.cssText = `
      position: fixed;
      left: ${rect.left + rect.width / 2}px;
      top: ${rect.top + rect.height / 2}px;
      transform: translate(-50%, -50%);
      font-size: 2.5rem;
      color: hsl(${this.hueValue}, 80%, 60%);
      opacity: 0.9;
      pointer-events: none;
      z-index: 1001;
      transition: all 0.4s cubic-bezier(0.2, 0, 0.2, 1);
      text-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
      filter: drop-shadow(0 0 8px hsl(${this.hueValue}, 80%, 60%));
    `;
    
    document.body.appendChild(indicator);
    
    // Animate out with direction-specific movement
    const offset = this.getDirectionOffset(direction, 30);
    setTimeout(() => {
      indicator.style.transform = `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) scale(1.2)`;
      indicator.style.opacity = '0';
    }, 50);
    
    setTimeout(() => {
      if (indicator.parentNode) {
        indicator.parentNode.removeChild(indicator);
      }
    }, 450);
  }

  showMoveSuccess() {
    // Subtle screen flash for successful moves
    const flash = document.createElement('div');
    flash.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%);
      pointer-events: none;
      z-index: 999;
      opacity: 0;
      transition: opacity 0.15s ease;
    `;
    
    document.body.appendChild(flash);
    
    setTimeout(() => flash.style.opacity = '1', 10);
    setTimeout(() => flash.style.opacity = '0', 100);
    setTimeout(() => {
      if (flash.parentNode) {
        flash.parentNode.removeChild(flash);
      }
    }, 250);
  }

  showInvalidSwipe() {
    // Visual feedback for invalid swipe gestures
    const boardContainer = document.getElementById('board-container');
    if (boardContainer) {
      boardContainer.style.animation = 'invalidSwipe 0.4s ease-in-out';
      boardContainer.style.borderColor = 'rgba(255, 150, 50, 0.8)';
      
      setTimeout(() => {
        boardContainer.style.animation = '';
        boardContainer.style.borderColor = '';
      }, 400);
    }
    
    // Add subtle haptic feedback for invalid swipe
    if (navigator.vibrate) {
      navigator.vibrate([50, 30, 50]);
    }
    
    // Show brief message to user
    this.showTemporaryMessage('Swipe further or try a different direction', 'warning');
  }

  showTemporaryMessage(message, type = 'info') {
    const messageEl = document.createElement('div');
    messageEl.className = `temporary-message ${type}`;
    messageEl.textContent = message;
    
    messageEl.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      padding: 12px 20px;
      background: ${type === 'warning' ? 'rgba(255, 150, 50, 0.95)' : 'rgba(100, 150, 255, 0.95)'};
      color: white;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      z-index: 1002;
      opacity: 0;
      transition: opacity 0.3s ease;
      pointer-events: none;
      text-align: center;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    `;
    
    document.body.appendChild(messageEl);
    
    setTimeout(() => messageEl.style.opacity = '1', 10);
    setTimeout(() => messageEl.style.opacity = '0', 1500);
    setTimeout(() => {
      if (messageEl.parentNode) {
        messageEl.parentNode.removeChild(messageEl);
      }
    }, 1800);
  }

  trackMovePerformance(moveTime) {
    // Track move performance metrics
    if (typeof GamePerformanceMonitor !== 'undefined') {
      GamePerformanceMonitor.logOperation('move', moveTime);
    }
    
    // Add to internal performance tracking
    if (!this.performanceMetrics) {
      this.performanceMetrics = {
        moveTimes: [],
        averageMoveTime: 0
      };
    }
    
    this.performanceMetrics.moveTimes.push(moveTime);
    
    // Keep only last 50 move times for rolling average
    if (this.performanceMetrics.moveTimes.length > 50) {
      this.performanceMetrics.moveTimes.shift();
    }
    
    // Update average
    this.performanceMetrics.averageMoveTime = 
      this.performanceMetrics.moveTimes.reduce((sum, time) => sum + time, 0) / 
      this.performanceMetrics.moveTimes.length;
    
    // Log performance issues if move is unusually slow
    if (moveTime > 100) {
      console.warn(`🐌 Slow move detected: ${moveTime.toFixed(2)}ms (avg: ${this.performanceMetrics.averageMoveTime.toFixed(2)}ms)`);
    }
  }

  getPerformanceMetrics() {
    return this.performanceMetrics || {
      moveTimes: [],
      averageMoveTime: 0
    };
  }

  showInvalidMove() {
    // Visual feedback for invalid move attempts
    const boardContainer = document.getElementById('board-container');
    if (boardContainer) {
      boardContainer.style.animation = 'shake 0.3s ease-in-out';
      boardContainer.style.borderColor = 'rgba(255, 100, 100, 0.8)';
      
      setTimeout(() => {
        boardContainer.style.animation = '';
        boardContainer.style.borderColor = '';
      }, 300);
    }
    
    // Add haptic feedback for invalid move
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }
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

  getDirectionOffset(direction, distance = 20) {
    const offsets = {
      up: { x: 0, y: -distance },
      down: { x: 0, y: distance },
      left: { x: -distance, y: 0 },
      right: { x: distance, y: 0 }
    };
    return offsets[direction] || { x: 0, y: 0 };
  }

  // Enhanced Mobile Optimization and Memory Management Methods
  scheduleDataCleanup() {
    // Initial cleanup after startup
    setTimeout(() => {
      this.performDataCleanup();
    }, 5000);
    
    // Periodic cleanup every 5 minutes
    setInterval(() => {
      this.performDataCleanup();
    }, 300000);
    
    console.log('📅 Data cleanup scheduled');
  }
  
  performDataCleanup() {
    try {
      // Clean up game statistics (keep recent + high scores)
      const stats = this.dataManager.getData('gameStats', []);
      if (stats.length > this.maxStoredStats) {
        const sortedStats = stats.sort((a, b) => parseInt(b.score) - parseInt(a.score));
        const topScores = sortedStats.slice(0, Math.floor(this.maxStoredStats * 0.3));
        const recentGames = stats.slice(-Math.floor(this.maxStoredStats * 0.7));
        const cleanedStats = [...topScores, ...recentGames.filter(game => 
          !topScores.some(top => top.date === game.date)
        )];
        this.dataManager.setData('gameStats', cleanedStats);
        console.log(`🧹 Cleaned stats: ${stats.length} → ${cleanedStats.length}`);
      }
      
      // Clean up AI learning data if available
      if (this.aiLearningSystem && this.aiLearningSystem.performMaintenanceCleanup) {
        this.aiLearningSystem.performMaintenanceCleanup();
      }
      
      // Memory management for mobile
      if (this.isMobileDevice()) {
        this.performMobileMemoryCleanup();
      }
      
    } catch (error) {
      console.warn('⚠️ Data cleanup failed:', error);
    }
  }
  
  performMobileMemoryCleanup() {
    // Aggressive cleanup for mobile devices
    if (this.gameStateStack.length > 5) {
      this.gameStateStack = this.gameStateStack.slice(-5);
    }
    
    // Clear old performance metrics
    if (this.performanceMetrics && this.performanceMetrics.moveTimes.length > 20) {
      this.performanceMetrics.moveTimes = this.performanceMetrics.moveTimes.slice(-20);
      this.performanceMetrics.averageMoveTime = 
        this.performanceMetrics.moveTimes.reduce((sum, time) => sum + time, 0) / 
        this.performanceMetrics.moveTimes.length;
    }
    
    // Clear AI cache if available
    if (this.enhancedAI && this.enhancedAI.clearCache) {
      this.enhancedAI.clearCache();
    }
    
    console.log('📱 Mobile memory cleanup completed');
  }
  
  getFormattedTime() {
    if (!this.startTime) return '00:00';
    
    const currentTime = new Date();
    let totalElapsed = Math.floor((currentTime - this.startTime) / 1000);
    
    // Subtract paused time
    let pausedTime = this.pausedTime || 0;
    if (this.isPaused && this.pauseStartTime) {
      pausedTime += Math.floor((currentTime - this.pauseStartTime) / 1000);
    }
    
    const actualGameTime = Math.max(0, totalElapsed - pausedTime);
    const minutes = Math.floor(actualGameTime / 60).toString().padStart(2, '0');
    const seconds = (actualGameTime % 60).toString().padStart(2, '0');
    
    return `${minutes}:${seconds}`;
  }
  
  // Enhanced mobile optimization methods
  enableAdvancedMobileOptimizations() {
    if (!this.isMobileDevice()) return;
    
    // Reduce visual effects on lower-end devices
    const hardwareConcurrency = navigator.hardwareConcurrency || 2;
    if (hardwareConcurrency < 4) {
      document.body.classList.add('reduced-animations');
      this.maxUndoSteps = 3; // Reduce memory usage
    }
    
    // Optimize touch responsiveness
    document.body.style.touchAction = 'pan-x pan-y';
    document.body.style.userSelect = 'none';
    
    // Enable hardware acceleration where possible
    const boardContainer = document.getElementById('board-container');
    if (boardContainer) {
      boardContainer.style.willChange = 'transform';
    }
    
    // Battery optimization for background handling
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.handleBackgroundState();
      } else {
        this.handleForegroundState();
      }
    });
    
    console.log('📱 Advanced mobile optimizations enabled');
  }
  
  handleBackgroundState() {
    this.isInBackground = true;
    
    // Pause auto-play when in background to save battery
    if (this.isAutoPlaying && !this.wasPausedByUser) {
      this.pauseForBackground = true;
      this.stopAutoPlay();
    }
    
    // Save game state
    this.saveCurrentGameState();
    
    // Reduce performance monitoring
    if (typeof GamePerformanceMonitor !== 'undefined') {
      GamePerformanceMonitor.stopMonitoring();
    }
  }
  
  handleForegroundState() {
    this.isInBackground = false;
    
    // Resume auto-play if it was paused for background
    if (this.pauseForBackground) {
      this.pauseForBackground = false;
      this.startAutoPlay();
    }
    
    // Resume performance monitoring
    if (typeof GamePerformanceMonitor !== 'undefined') {
      GamePerformanceMonitor.startMonitoring();
    }
    
    // Refresh layout in case of orientation change
    setTimeout(() => {
      this.refreshLayout();
    }, 100);
  }

  // Enhanced responsive layout management
  refreshLayout() {
    // Update CSS variables for responsive layout
    document.documentElement.style.setProperty('--size', this.size);
    
    // Add board size class to body for CSS targeting
    document.body.className = document.body.className.replace(/board-size-\d+/g, '');
    document.body.classList.add(`board-size-${this.size}`);
    
    // Enhanced responsive calculations
    this.updateResponsiveVariables();
    
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

  updateResponsiveVariables() {
    console.log('Updating responsive variables...');
    
    // Get current viewport dimensions
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const vmin = Math.min(vw, vh);
    const isMobile = this.isMobileDevice();
    const isPortrait = vh > vw;
    
    console.log(`Viewport: ${vw}x${vh}, Mobile: ${isMobile}, Portrait: ${isPortrait}`);
    
    // Calculate optimal board size and gap based on viewport and grid size
    let maxBoardSize, gapMultiplier;
    
    // Grid-specific optimizations with better scaling
    switch (this.size) {
      case 3:
        gapMultiplier = 1.6;
        if (isMobile) {
          maxBoardSize = isPortrait ? 
            Math.min(vw * 0.90, vh * 0.45, 300) :
            Math.min(vw * 0.50, vh * 0.70, 320);
        } else {
          maxBoardSize = Math.min(vw * 0.40, vh * 0.50, 350);
        }
        break;
      case 4:
        gapMultiplier = 1.0;
        if (isMobile) {
          maxBoardSize = isPortrait ? 
            Math.min(vw * 0.92, vh * 0.50, 340) :
            Math.min(vw * 0.55, vh * 0.75, 360);
        } else {
          maxBoardSize = Math.min(vw * 0.45, vh * 0.55, 420);
        }
        break;
      case 5:
        gapMultiplier = 0.6;
        if (isMobile) {
          maxBoardSize = isPortrait ? 
            Math.min(vw * 0.95, vh * 0.55, 380) :
            Math.min(vw * 0.60, vh * 0.80, 400);
        } else {
          maxBoardSize = Math.min(vw * 0.50, vh * 0.60, 480);
        }
        break;
      case 7:
        gapMultiplier = 0.5;
        if (isMobile) {
          maxBoardSize = isPortrait ? 
            Math.min(vw * 0.95, vh * 0.58, 420) :
            Math.min(vw * 0.65, vh * 0.85, 450);
        } else {
          maxBoardSize = Math.min(vw * 0.55, vh * 0.65, 520);
        }
        break;
      case 9:
        gapMultiplier = 0.3;
        if (isMobile) {
          maxBoardSize = isPortrait ? 
            Math.min(vw * 0.98, vh * 0.62, 480) :
            Math.min(vw * 0.70, vh * 0.90, 500);
        } else {
          maxBoardSize = Math.min(vw * 0.60, vh * 0.70, 580);
        }
        break;
      default:
        // Fallback for any unexpected grid size
        gapMultiplier = 1.0 / this.size;
        maxBoardSize = isMobile ? 
          Math.min(vw * 0.92, vh * 0.55, 400) :
          Math.min(vw * 0.50, vh * 0.60, 500);
        break;
    }
    
    // Calculate gap size with improved scaling
    const baseGap = isMobile ? 
      Math.max(2, Math.min(8, vmin * 0.010)) :
      Math.max(4, Math.min(12, vmin * 0.015));
    const gap = Math.round(baseGap * gapMultiplier);
    
    // Calculate tile size for perfect fit
    const availableSize = maxBoardSize - (gap * 2); // Account for padding
    const tileSize = Math.floor((availableSize - gap * (this.size - 1)) / this.size);
    
    // Ensure minimum tile size for usability
    const minTileSize = isMobile ? 30 : 40;
    let adjustedTileSize = Math.max(minTileSize, tileSize);
    
    // Recalculate board size to ensure perfect fit
    const adjustedBoardSize = (adjustedTileSize * this.size) + (gap * (this.size + 1));
    
    console.log(`Grid ${this.size}x${this.size}: BoardSize=${adjustedBoardSize}, TileSize=${adjustedTileSize}, Gap=${gap}`);
    
    // Update CSS variables
    document.documentElement.style.setProperty('--board-max-size', `${adjustedBoardSize}px`);
    document.documentElement.style.setProperty('--gap', `${gap}px`);
    document.documentElement.style.setProperty('--tile-size', `${adjustedTileSize}px`);
    
    // Adjust tile border radius based on tile size
    const borderRadius = Math.max(3, Math.min(10, Math.floor(adjustedTileSize * 0.08)));
    document.documentElement.style.setProperty('--tile-border-radius', `${borderRadius}px`);
    
    // Update font scale variables based on tile size
    this.updateFontScales(adjustedTileSize);
    
    console.log('✅ Responsive variables updated');
  }

  updateFontScales(tileSize) {
    console.log(`Updating font scales for tile size: ${tileSize}px`);
    
    // Calculate font scales based on actual tile size and grid size for better readability
    let baseFontScale, largeFontScale, megaFontScale;
    
    // Grid-specific font scaling with better proportions
    switch (this.size) {
      case 3:
        baseFontScale = Math.max(0.20, Math.min(0.45, tileSize / 80));
        largeFontScale = baseFontScale * 0.75;
        megaFontScale = baseFontScale * 0.60;
        break;
      case 4:
        baseFontScale = Math.max(0.18, Math.min(0.40, tileSize / 90));
        largeFontScale = baseFontScale * 0.80;
        megaFontScale = baseFontScale * 0.65;
        break;
      case 5:
        baseFontScale = Math.max(0.15, Math.min(0.35, tileSize / 100));
        largeFontScale = baseFontScale * 0.85;
        megaFontScale = baseFontScale * 0.70;
        break;
      default:
        baseFontScale = Math.max(0.18, Math.min(0.40, tileSize / 90));
        largeFontScale = baseFontScale * 0.80;
        megaFontScale = baseFontScale * 0.65;
    }
    
    console.log(`Font scales - Base: ${baseFontScale}, Large: ${largeFontScale}, Mega: ${megaFontScale}`);
    
    // Apply calculated font scales
    document.documentElement.style.setProperty('--font-scale-base', baseFontScale);
    document.documentElement.style.setProperty('--font-scale-large', largeFontScale);
    document.documentElement.style.setProperty('--font-scale-mega', megaFontScale);
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
    this.dataManager.setData('isLightMode', this.isLightMode);
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
    
    // Save to unified data manager
    this.dataManager.setData('hueValue', this.hueValue);
    
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

    // Update mobile pause button
    this.syncMobileButtonState('mobile-pause-button', 'pause-button');

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

    // Update mobile pause button
    this.syncMobileButtonState('mobile-pause-button', 'pause-button');

    // Hide pause overlay and messages
    this.hidePauseOverlay();

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
    // Cycle through board sizes (4x4, 5x5, 7x7, 9x9)
    const sizes = [4, 5, 7, 9];
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
    this.isAutoPlayedGame = true; // Track that AI was used in this game
    
    const makeMove = () => {
      // Check stopping conditions
      if (!this.isAutoPlaying) {
        console.log('🤖 Autoplay stopped: isAutoPlaying = false');
        this.stopAutoPlay();
        return;
      }
      
      if (this.gameState === 'over') {
        console.log('🤖 Autoplay stopped: game state = over');
        this.stopAutoPlay();
        return;
      }
      
      if (this.isPaused) {
        console.log('🤖 Autoplay paused: game is paused');
        // Don't stop autoplay, just skip this turn
        return;
      }
      
      // Prevent moves during animations to avoid race conditions
      if (this.animationInProgress) {
        console.log('🤖 Skipping AI move - animation in progress');
        return;
      }

      try {
        const move = this.getBestMove();
        
        if (!move) {
          console.log('🤖 AI could not determine a move');
          // Double-check if any moves are actually possible
          const hasValidMoves = this.canMove('up') || this.canMove('down') || 
                              this.canMove('left') || this.canMove('right');
          
          if (!hasValidMoves) {
            console.log('🤖 Confirmed: No valid moves available, stopping autoplay');
            this.stopAutoPlay();
          } else {
            console.log('⚠️ AI failed to find move, but moves are available. Retrying...');
            // Try again on next interval rather than stopping immediately
          }
          return;
        }
        
        if (!this.canMove(move)) {
          console.log(`🤖 AI suggested invalid move: ${move}`);
          // Double-check if any moves are actually possible
          const hasValidMoves = this.canMove('up') || this.canMove('down') || 
                              this.canMove('left') || this.canMove('right');
          
          if (!hasValidMoves) {
            console.log('🤖 Confirmed: No valid moves available, stopping autoplay');
            this.stopAutoPlay();
          } else {
            console.log('⚠️ AI suggested bad move, but other moves available. Retrying...');
          }
          return;
        }
        
        // Execute the move
        const moveSuccessful = this.move(move);
        
        if (moveSuccessful) {
          this.autoPlayMoves++;
          
          // Update UI
          this.updateAutoPlayButton();
          
          if (window.debugAI) {
            console.log(`🤖 AI made move: ${move} (total moves: ${this.autoPlayMoves})`);
          }
          
          // Check game state after move completes (AI-specific timing)
          setTimeout(() => {
            if (!this.animationInProgress && this.isAutoPlaying) {
              this.checkGameState();
            }
          }, 200); // Shorter delay for AI since it doesn't need visual feedback time
        } else {
          console.log(`🤖 Move ${move} failed to execute despite being valid`);
        }
        
      } catch (error) {
        console.error('🤖 Error in AI autoplay:', error);
        this.stopAutoPlay();
      }
    };

    // Start the autoplay loop
    const delay = this.getAutoPlayDelay();
    
    if (delay === 0) {
      // MAX speed - use requestAnimationFrame for maximum performance
      const maxSpeedLoop = () => {
        if (this.isAutoPlaying) {
          makeMove();
          // Use requestAnimationFrame for smooth, maximum speed execution
          requestAnimationFrame(maxSpeedLoop);
        }
      };
      requestAnimationFrame(maxSpeedLoop);
      this.autoPlayInterval = 'MAX_SPEED'; // Mark that we're using max speed mode
    } else {
      // Normal speed - use setInterval
      this.autoPlayInterval = setInterval(makeMove, delay);
    }
    
    this.updateAutoPlayButton();
    
    const speedText = this.speedMultipliers[this.currentSpeedIndex] === 'MAX' ? 'MAX speed' : `${this.speedMultipliers[this.currentSpeedIndex]}x speed`;
    console.log(`🤖 Enhanced AI autoplay started (difficulty: ${this.aiDifficulty}, ${speedText})`);
  }

  stopAutoPlay() {
    if (this.autoPlayInterval) {
      if (this.autoPlayInterval !== 'MAX_SPEED') {
        clearInterval(this.autoPlayInterval);
      }
      this.autoPlayInterval = null;
    }
    
    if (this.isAutoPlaying) {
      const duration = (Date.now() - this.autoPlayStartTime) / 1000;
      const movesPerSecond = (this.autoPlayMoves / duration).toFixed(2);
      
      const speedText = this.speedMultipliers[this.currentSpeedIndex] === 'MAX' ? 'MAX speed' : `${this.speedMultipliers[this.currentSpeedIndex]}x speed`;
      console.log(`🏁 AI autoplay stopped: ${this.autoPlayMoves} moves in ${duration.toFixed(1)}s (${movesPerSecond} moves/sec) at ${speedText}`);
      
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

    // Update mobile autoplay button
    this.syncMobileButtonState('mobile-autoplay-button', 'autoplay-button');
  }

  updateSpeedButton() {
    const speedButton = document.getElementById('speed-button');
    if (!speedButton) return;

    const speedText = speedButton.querySelector('.speed-text');
    if (!speedText) return;

    const multiplier = this.speedMultipliers[this.currentSpeedIndex];
    speedText.textContent = multiplier === 'MAX' ? 'MAX' : `${multiplier}x`;
    
    let tooltipText;
    if (multiplier === 'MAX') {
      tooltipText = 'Maximum speed (no delay between moves)';
    } else if (multiplier === 1) {
      tooltipText = 'Normal speed';
    } else {
      tooltipText = `${multiplier}x speed (${Math.round(this.autoPlaySpeed / multiplier)}ms between moves)`;
    }
    
    speedButton.setAttribute('data-tooltip', tooltipText);

    // Update mobile speed button
    this.syncMobileButtonState('mobile-speed-button', 'speed-button');
  }

  getAutoPlayDelay() {
    const multiplier = this.speedMultipliers[this.currentSpeedIndex];
    
    // MAX speed = no delay (immediate execution)
    if (multiplier === 'MAX') {
      return 0;
    }
    
    return Math.max(50, this.autoPlaySpeed / multiplier); // Minimum 50ms delay for other speeds
  }

  changeSpeed() {
    // Cycle through speed options
    this.currentSpeedIndex = (this.currentSpeedIndex + 1) % this.speedMultipliers.length;
    this.updateSpeedButton();
    
    // If autoplay is running, restart it with new speed
    if (this.isAutoPlaying) {
      // Stop current autoplay
      if (this.autoPlayInterval && this.autoPlayInterval !== 'MAX_SPEED') {
        clearInterval(this.autoPlayInterval);
      }
      this.autoPlayInterval = null;
      
      const makeMove = () => {
        // Check stopping conditions
        if (!this.isAutoPlaying) {
          console.log('🤖 Autoplay stopped: isAutoPlaying = false');
          this.stopAutoPlay();
          return;
        }
        
        if (this.gameState === 'over') {
          console.log('🤖 Autoplay stopped: game state = over');
          this.stopAutoPlay();
          return;
        }
        
        if (this.isPaused) {
          console.log('🤖 Autoplay paused: game is paused');
          return;
        }

        try {
          const move = this.getBestMove();
          
          if (!move) {
            console.log('🤖 AI could not determine a move');
            const hasValidMoves = this.canMove('up') || this.canMove('down') || 
                                this.canMove('left') || this.canMove('right');
            
            if (!hasValidMoves) {
              console.log('🤖 Confirmed: No valid moves available');
              this.stopAutoPlay();
            } else {
              console.log('⚠️ AI failed to find move, but moves are available. Retrying...');
            }
            return;
          }
          
          if (!this.canMove(move)) {
            console.log(`🤖 AI suggested invalid move: ${move}`);
            const hasValidMoves = this.canMove('up') || this.canMove('down') || 
                                this.canMove('left') || this.canMove('right');
            
            if (!hasValidMoves) {
              console.log('🤖 Confirmed: No valid moves available');
              this.stopAutoPlay();
            } else {
              console.log('⚠️ AI suggested bad move, but other moves available. Retrying...');
            }
            return;
          }
          
          // Execute the move
          this.move(move);
          this.autoPlayMoves++;
          this.updateAutoPlayButton();
          
          if (window.debugAI) {
            console.log(`🤖 AI made move: ${move} (total moves: ${this.autoPlayMoves})`);
          }
          
        } catch (error) {
          console.error('🤖 Error in AI autoplay:', error);
          this.stopAutoPlay();
        }
      };

      // Start with new speed
      const delay = this.getAutoPlayDelay();
      
      if (delay === 0) {
        // MAX speed - use requestAnimationFrame
        const maxSpeedLoop = () => {
          if (this.isAutoPlaying) {
            makeMove();
            requestAnimationFrame(maxSpeedLoop);
          }
        };
        requestAnimationFrame(maxSpeedLoop);
        this.autoPlayInterval = 'MAX_SPEED';
      } else {
        // Normal speed - use setInterval
        this.autoPlayInterval = setInterval(makeMove, delay);
      }
    }
    
    const multiplier = this.speedMultipliers[this.currentSpeedIndex];
    const speedText = multiplier === 'MAX' ? 'MAX' : `${multiplier}x`;
    console.log(`Speed changed to ${speedText}`);
  }

  // AI Algorithm for 2048 - Uses a simple heuristic approach
  getBestMove() {
    // Use enhanced AI if available, otherwise fall back to basic AI
    if (this.enhancedAI) {
      try {
        // Adjust AI difficulty dynamically
        this.adjustAIDifficulty();
        
        const startTime = performance.now();
        const move = this.enhancedAI.getBestMove();
        const endTime = performance.now();
        
        // Log performance for debugging
        if (window.debugAI) {
          console.log(`Enhanced AI move: ${move} (${(endTime - startTime).toFixed(2)}ms)`);
        }
        
        // Ensure the move is valid
        if (move && this.canMove(move)) {
          return move;
        } else if (move) {
          console.warn(`⚠️ Enhanced AI suggested invalid move: ${move}`);
        }
        
        // If Enhanced AI failed, try basic AI
        console.warn('⚠️ Enhanced AI failed, trying basic AI');
        return this.getBasicAIMove();
        
      } catch (error) {
        console.error('❌ Enhanced AI failed:', error);
        console.warn('⚠️ Falling back to basic AI');
        // Fallback to basic AI
        return this.getBasicAIMove();
      }
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

    // First, try to find the best valid move using evaluation
    for (const direction of directions) {
      if (this.canMove(direction)) {
        const score = this.evaluateMove(direction);
        if (score > bestScore) {
          bestScore = score;
          bestMove = direction;
        }
      }
    }

    // If we found a good move, return it
    if (bestMove) return bestMove;

    // Emergency fallback - just find any valid move
    for (const direction of directions) {
      if (this.canMove(direction)) {
        console.warn(`⚠️ Basic AI using emergency fallback move: ${direction}`);
        return direction;
      }
    }

    // No moves available
    console.warn('⚠️ No valid moves available for Basic AI');
    return null;
  }

  // Basic move evaluation for fallback AI
  evaluateMove(direction) {
    // Create a copy of the board and game state to simulate the move
    const originalBoard = this.board.map(row => [...row]);
    const originalScore = this.score;
    const originalAnimationInProgress = this.animationInProgress;
    const originalGameState = this.gameState;
    
    // Temporarily allow moves during simulation
    this.animationInProgress = false;
    if (this.gameState === 'over') this.gameState = 'playing';
    
    // Simulate the move
    const moveSuccessful = this.simulateMoveDirection(direction);
    
    if (!moveSuccessful) {
      // Restore state and return invalid score
      this.board = originalBoard;
      this.score = originalScore;
      this.animationInProgress = originalAnimationInProgress;
      this.gameState = originalGameState;
      return -Infinity;
    }
    
    // Calculate the score difference
    let score = this.score - originalScore;
    
    // Add heuristic scores
    score += this.countEmptyTiles(this.board) * 10; // Empty tiles bonus
    score += this.evaluateMonotonicity(this.board) * 5; // Monotonicity bonus
    score += this.evaluateSmoothness(this.board) * 3; // Smoothness bonus
    
    // Check if the move creates merge opportunities
    score += this.countMergeOpportunities(this.board) * 8;
    
    // Bonus for keeping max tile in corner
    const maxTile = this.getMaxTile();
    if (this.board[0][0] === maxTile || this.board[0][this.size-1] === maxTile || 
        this.board[this.size-1][0] === maxTile || this.board[this.size-1][this.size-1] === maxTile) {
      score += 15;
    }
    
    // Restore original state
    this.board = originalBoard;
    this.score = originalScore;
    this.animationInProgress = originalAnimationInProgress;
    this.gameState = originalGameState;
    
    return score;
  }

  // Simulate move without animations or side effects
  simulateMoveDirection(direction) {
    switch (direction) {
      case 'up':
        return this.moveUp();
      case 'down':
        return this.moveDown();
      case 'left':
        return this.moveLeft();
      case 'right':
        return this.moveRight();
      default:
        return false;
    }
  }

  // Count potential merge opportunities
  countMergeOpportunities(board) {
    let opportunities = 0;
    
    for (let row = 0; row < this.size; row++) {
      for (let col = 0; col < this.size; col++) {
        if (board[row][col] === 0) continue;
        
        const value = board[row][col];
        // Check adjacent tiles for merge opportunities
        const adjacent = [
          row > 0 ? board[row-1][col] : null,
          row < this.size-1 ? board[row+1][col] : null,
          col > 0 ? board[row][col-1] : null,
          col < this.size-1 ? board[row][col+1] : null
        ];
        
        for (const neighbor of adjacent) {
          if (neighbor === value) {
            opportunities++;
          }
        }
      }
    }
    
    return opportunities;
  }

  // Helper methods for basic AI evaluation
  countEmptyTiles(board) {
    let count = 0;
    for (let row = 0; row < this.size; row++) {
      for (let col = 0; col < this.size; col++) {
        if (board[row][col] === 0) count++;
      }
    }
    return count;
  }

  evaluateMonotonicity(board) {
    let score = 0;
    
    // Check rows
    for (let row = 0; row < this.size; row++) {
      let increasing = true, decreasing = true;
      for (let col = 1; col < this.size; col++) {
        if (board[row][col] < board[row][col-1]) increasing = false;
        if (board[row][col] > board[row][col-1]) decreasing = false;
      }
      if (increasing || decreasing) score += 10;
    }
    
    // Check columns
    for (let col = 0; col < this.size; col++) {
      let increasing = true, decreasing = true;
      for (let row = 1; row < this.size; row++) {
        if (board[row][col] < board[row-1][col]) increasing = false;
        if (board[row][col] > board[row-1][col]) decreasing = false;
      }
      if (increasing || decreasing) score += 10;
    }
    
    return score;
  }

  evaluateSmoothness(board) {
    let score = 0;
    
    for (let row = 0; row < this.size; row++) {
      for (let col = 0; col < this.size; col++) {
        if (board[row][col] === 0) continue;
        
        const value = board[row][col];
        // Check adjacent tiles
        const neighbors = [
          row > 0 ? board[row-1][col] : 0,
          row < this.size-1 ? board[row+1][col] : 0,
          col > 0 ? board[row][col-1] : 0,
          col < this.size-1 ? board[row][col+1] : 0
        ];
        
        for (const neighbor of neighbors) {
          if (neighbor === 0) continue;
          if (neighbor === value) score += 5; // Same value bonus
          else if (Math.abs(Math.log2(neighbor) - Math.log2(value)) <= 1) score += 2; // Close value bonus
        }
      }
    }
    
    return score;
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
    
    // Save preference to unified data manager
    this.dataManager.setData('aiDifficulty', this.aiDifficulty);
    
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

    // Update mobile AI difficulty button
    this.syncMobileButtonState('mobile-ai-difficulty-button', 'ai-difficulty-button');
    
    // Show notification with detailed info
    const difficultyInfo = this.getDifficultyInfo(this.aiDifficulty);
    this.showNotification(`AI Difficulty: ${this.aiDifficulty.toUpperCase()}\n${difficultyInfo}`, 3000);
    
    console.log(`🧠 AI difficulty changed to: ${this.aiDifficulty}`);
  }

  // Show notification/toast message
  showNotification(message, duration = 2000) {
    // Remove any existing notification
    const existingNotification = document.getElementById('game-notification');
    if (existingNotification) {
      existingNotification.remove();
    }

    // Create notification element
    const notification = document.createElement('div');
    notification.id = 'game-notification';
    notification.className = 'notification-toast';
    
    // Handle multiline messages
    const lines = message.split('\n');
    const content = lines.map(line => `<div>${line}</div>`).join('');
    notification.innerHTML = content;
    
    // Style the notification
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.85);
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      z-index: 10000;
      text-align: center;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      animation: slideInDown 0.3s ease-out;
    `;
    
    // Add to document
    document.body.appendChild(notification);
    
    // Auto-remove after duration
    setTimeout(() => {
      if (notification && notification.parentNode) {
        notification.style.animation = 'slideOutUp 0.3s ease-in forwards';
        setTimeout(() => {
          if (notification.parentNode) {
            notification.remove();
          }
        }, 300);
      }
    }, duration);
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

  /**
   * Enhanced initialization with comprehensive error handling and debugging
   */
  initializeEnhancedSystems() {
    console.log('🔧 Initializing Enhanced Systems...');
    
    try {
      // Initialize AI Learning System if available
      if (typeof AILearningSystem !== 'undefined') {
        this.aiLearningSystem = new AILearningSystem();
        console.log('✅ AI Learning System initialized automatically');
      } else {
        console.warn('⚠️ AILearningSystem not available - automatic learning disabled');
      }
      
      // Initialize Enhanced AI if available
      this.initializeEnhancedAI();
      
      // Validate game state
      this.validateGameState();
      
      console.log('✅ All enhanced systems initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize enhanced systems:', error);
    }
  }
  
  /**
   * Validate game state and fix any inconsistencies
   */
  validateGameState() {
    // Ensure board is valid
    if (!Array.isArray(this.board) || this.board.length !== this.size) {
      console.warn('⚠️ Invalid board detected, creating new board');
      this.board = this.createEmptyBoard();
    }
    
    // Ensure board rows are valid
    for (let i = 0; i < this.size; i++) {
      if (!Array.isArray(this.board[i]) || this.board[i].length !== this.size) {
        console.warn(`⚠️ Invalid board row ${i} detected, fixing`);
        this.board[i] = new Array(this.size).fill(0);
      }
    }
    
    // Ensure gameState is valid
    if (!['playing', 'won', 'won-continue', 'over'].includes(this.gameState)) {
      console.warn('⚠️ Invalid gameState detected, resetting to playing');
      this.gameState = 'playing';
    }
    
    // Ensure size is valid
    if (![4, 5, 7, 9].includes(this.size)) {
      console.warn('⚠️ Invalid board size detected, resetting to 4x4');
      this.size = 4;
    }
    
    // Ensure score is valid
    if (typeof this.score !== 'number' || this.score < 0) {
      console.warn('⚠️ Invalid score detected, resetting to 0');
      this.score = 0;
    }
    
    console.log('✅ Game state validation completed');
  }

  initializeEnhancedAI() {
    // Try to initialize the advanced AI first, fallback to enhanced AI
    try {
      console.log('🔍 Checking available AI classes...');
      console.log('AdvancedAI2048Solver available:', !!window.AdvancedAI2048Solver);
      console.log('Enhanced2048AI available:', !!window.Enhanced2048AI);
      console.log('AILearningSystem available:', !!window.AILearningSystem);
      
      if (window.AdvancedAI2048Solver) {
        console.log('🚀 Initializing Advanced AI Solver...');
        this.advancedAI = new window.AdvancedAI2048Solver(this);
        this.enhancedAI = this.advancedAI; // Keep compatibility
        console.log('✅ Advanced AI Solver initialized with Expectimax algorithm');
      } else if (window.Enhanced2048AI) {
        console.log('🚀 Initializing Enhanced AI...');
        this.enhancedAI = new window.Enhanced2048AI(this);
        console.log('✅ Enhanced AI initialized with Minimax algorithm');
      } else {
        console.warn('⚠️ No AI solvers loaded, falling back to basic AI');
        return;
      }
    } catch (error) {
      console.error('❌ Failed to initialize AI:', error);
      console.error('Error details:', error.message, error.stack);
      console.warn('⚠️ Falling back to basic AI');
      this.enhancedAI = null;
      this.advancedAI = null;
      return;
    }
      
    // Load saved difficulty preference
    const savedDifficulty = this.dataManager.getData('aiDifficulty', 'normal');
    this.aiDifficulty = savedDifficulty;
    
    // Adjust AI difficulty based on board size and performance
    try {
      this.adjustAIDifficulty();
      console.log(`AI difficulty set to: ${this.aiDifficulty}`);
    } catch (error) {
      console.error('❌ Failed to adjust AI difficulty:', error);
    }
    
    // Update button text to match loaded difficulty
    const aiDifficultyButton = document.getElementById('ai-difficulty-button');
    if (aiDifficultyButton) {
      const buttonText = aiDifficultyButton.querySelector('.button-text');
      if (buttonText) {
        const capitalizedDifficulty = this.aiDifficulty.charAt(0).toUpperCase() + this.aiDifficulty.slice(1);
        buttonText.textContent = capitalizedDifficulty;
      }
    }
    
    console.log('✅ AI initialization complete');
  }

  adjustAIDifficulty() {
    if (!this.enhancedAI) return;

    let weights;
    
    // Check if we're using the Advanced AI or Enhanced AI
    const isAdvancedAI = (this.advancedAI && window.AdvancedAI2048Solver && this.advancedAI instanceof window.AdvancedAI2048Solver);

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

// Enhanced initialization system with comprehensive error handling
function initializeFancy2048() {
  console.log('🚀 Starting Fancy2048 initialization...');
  
  let gameInitialized = false;
  let initAttempts = 0;
  const maxInitAttempts = 3;
  
  function attemptInitialization() {
    if (gameInitialized) return;
    
    initAttempts++;
    console.log(`🎮 Initialization attempt ${initAttempts}/${maxInitAttempts}`);
    
    try {
      // Comprehensive DOM readiness check
      if (document.readyState === 'loading') {
        console.log('⏳ DOM still loading, waiting...');
        setTimeout(attemptInitialization, 200);
        return;
      }
      
      // Ensure all required elements exist
      const requiredElements = ['board-container', 'score', 'best-score', 'moves', 'time'];
      const missingElements = requiredElements.filter(id => {
        const element = document.getElementById(id);
        if (!element) {
          console.warn(`❌ Missing element: ${id}`);
          return true;
        }
        return false;
      });
      
      if (missingElements.length > 0) {
        console.error('❌ Missing required elements:', missingElements);
        
        if (initAttempts < maxInitAttempts) {
          console.log('🔄 Retrying initialization in 500ms...');
          setTimeout(attemptInitialization, 500);
          return;
        } else {
          throw new Error(`Missing DOM elements after ${maxInitAttempts} attempts: ${missingElements.join(', ')}`);
        }
      }
      
      // Verify Game class is available
      if (typeof Game === 'undefined') {
        console.error('❌ Game class not found');
        if (initAttempts < maxInitAttempts) {
          console.log('🔄 Waiting for Game class to load...');
          setTimeout(attemptInitialization, 500);
          return;
        } else {
          throw new Error('Game class not loaded after maximum attempts');
        }
      }
      
      console.log('✅ All prerequisites met, creating game instance...');
      
      // Initialize the game
      window.game = new Game(4);
      gameInitialized = true;
      
      console.log('🎉 Fancy2048 initialized successfully!');
      
      // Dispatch initialization complete event
      document.dispatchEvent(new CustomEvent('gameInitialized', {
        detail: { game: window.game, attempts: initAttempts }
      }));
      
      // Optional: Remove any loading indicators
      const loadingIndicators = document.querySelectorAll('.loading-indicator, .init-status');
      loadingIndicators.forEach(indicator => {
        indicator.style.opacity = '0';
        setTimeout(() => indicator.remove(), 500);
      });
      
    } catch (error) {
      console.error(`❌ Initialization attempt ${initAttempts} failed:`, error);
      
      if (initAttempts < maxInitAttempts) {
        console.log(`🔄 Retrying in 1 second... (${maxInitAttempts - initAttempts} attempts remaining)`);
        setTimeout(attemptInitialization, 1000);
      } else {
        console.error('❌ All initialization attempts failed');
        showInitializationError(error, initAttempts);
      }
    }
  }
  
  function showInitializationError(error, attempts) {
    const boardContainer = document.getElementById('board-container');
    if (boardContainer) {
      boardContainer.innerHTML = `
        <div style="
          text-align: center; 
          padding: 2rem; 
          color: #ff6b6b;
          background: rgba(244, 67, 54, 0.1);
          border: 1px solid #ff6b6b;
          border-radius: 10px;
          margin: 20px;
        ">
          <h3 style="margin-top: 0; color: #ff6b6b;">
            <i class="fas fa-exclamation-triangle"></i>
            Game Initialization Failed
          </h3>
          <p style="margin: 15px 0;">
            The game could not be initialized after ${attempts} attempts.
          </p>
          <details style="margin: 15px 0; text-align: left;">
            <summary style="cursor: pointer; color: #ffcc00;">Technical Details</summary>
            <pre style="
              margin: 10px 0; 
              padding: 10px; 
              background: rgba(0,0,0,0.3); 
              border-radius: 5px; 
              font-size: 12px;
              overflow-x: auto;
              color: #f2f2f2;
            ">${error.message}
Stack: ${error.stack || 'Not available'}</pre>
          </details>
          <div style="margin-top: 20px;">
            <button onclick="location.reload()" style="
              margin: 5px; 
              padding: 10px 15px; 
              background: #ff6b6b; 
              color: white; 
              border: none; 
              border-radius: 5px; 
              cursor: pointer;
              font-weight: bold;
            ">
              <i class="fas fa-redo"></i> Refresh Page
            </button>
            <button onclick="window.location.href = window.location.href.replace('index.html', 'index_fixed.html')" style="
              margin: 5px; 
              padding: 10px 15px; 
              background: #4CAF50; 
              color: white; 
              border: none; 
              border-radius: 5px; 
              cursor: pointer;
              font-weight: bold;
            ">
              <i class="fas fa-tools"></i> Try Fixed Version
            </button>
          </div>
        </div>
      `;
    }
    
    // Also show a toast notification
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(244, 67, 54, 0.9);
      color: white;
      padding: 15px 20px;
      border-radius: 8px;
      font-weight: bold;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    toast.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px;">
        <i class="fas fa-exclamation-circle"></i>
        <span>Initialization Failed</span>
      </div>
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 5000);
  }
  
  // Start initialization
  attemptInitialization();
}

// Multiple initialization triggers to ensure the game starts
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeFancy2048);
} else {
  // DOM already loaded
  setTimeout(initializeFancy2048, 50);
}

// Additional safety initialization after window load
window.addEventListener('load', () => {
  if (!window.game) {
    console.log('🚨 Game not initialized after window load, attempting emergency initialization...');
    setTimeout(initializeFancy2048, 100);
  }
});

// Fallback initialization for edge cases
setTimeout(() => {
  if (!window.game && typeof Game !== 'undefined') {
    console.log('🆘 Running final fallback initialization...');
    try {
      window.game = new Game(4);
      console.log('✅ Fallback initialization successful');
    } catch (error) {
      console.error('❌ Even fallback initialization failed:', error);
    }
  }
}, 2000);

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
  },

  // Debug board state and move validation
  debugBoardState: () => {
    if (!window.game) {
      console.log('❌ Game not initialized yet');
      return;
    }
    
    const game = window.game;
    console.log('🔍 Board State Debug:');
    console.log('Board:', game.board.map(row => [...row]));
    console.log('Game State:', game.gameState);
    console.log('Is Auto Playing:', game.isAutoPlaying);
    console.log('Is Paused:', game.isPaused);
    
    // Check empty cells
    let emptyCount = 0;
    for (let i = 0; i < game.size; i++) {
      for (let j = 0; j < game.size; j++) {
        if (game.board[i][j] === 0) emptyCount++;
      }
    }
    console.log('Empty Cells:', emptyCount);
    
    // Test all move directions
    const moves = {
      up: game.canMove('up'),
      down: game.canMove('down'),
      left: game.canMove('left'),
      right: game.canMove('right')
    };
    console.log('Valid Moves:', moves);
    console.log('Any Valid Move:', Object.values(moves).some(v => v));
    
    // Check if board appears full vs actually full
    const appearsFull = emptyCount === 0;
    const actuallyBlocked = !Object.values(moves).some(v => v);
    
    console.log('Appears Full:', appearsFull);
    console.log('Actually Blocked:', actuallyBlocked);
    
    if (appearsFull && !actuallyBlocked) {
      console.log('⚠️ Board is full but moves are still possible!');
    } else if (!appearsFull && actuallyBlocked) {
      console.log('⚠️ Board has empty spaces but no moves detected!');
    } else if (appearsFull && actuallyBlocked) {
      console.log('💀 Board is legitimately game over');
    } else {
      console.log('✅ Board state is normal');
    }
  },

  // Force test game over detection
  testGameOverDetection: () => {
    if (!window.game) {
      console.log('❌ Game not initialized yet');
      return;
    }
    
    console.log('🧪 Testing game over detection...');
    window.game.checkGameState();
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

function setupLearningControls() {
  // Toggle Learning Button
  const toggleButton = document.getElementById('toggle-learning-button');
  if (toggleButton) {
    toggleButton.addEventListener('click', () => {
      if (window.game) {
        const newState = window.game.toggleAILearning();
        const icon = toggleButton.querySelector('i');
        const text = toggleButton.querySelector('span');
        
        if (newState) {
          icon.className = 'fas fa-toggle-on';
          text.textContent = 'Learning: On';
          toggleButton.style.background = 'linear-gradient(135deg, #4CAF50, #45a049)';
        } else {
          icon.className = 'fas fa-toggle-off';
          text.textContent = 'Learning: Off';
          toggleButton.style.background = 'linear-gradient(135deg, #f44336, #d32f2f)';
        }
      }
    });
  }
  
  // Export Data Button
  const exportButton = document.getElementById('export-learning-button');
  if (exportButton) {
    exportButton.addEventListener('click', () => {
      if (window.game) {
        const success = window.game.exportAILearningData();
        if (success) {
          showNotification('📁 Learning data exported successfully!', 'success');
        } else {
          showNotification('❌ Failed to export learning data', 'error');
        }
      }
    });
  }
  
  // Import Data Button
  const importButton = document.getElementById('import-learning-button');
  const fileInput = document.getElementById('learning-file-input');
  
  if (importButton && fileInput) {
    importButton.addEventListener('click', () => {
      fileInput.click();
    });
    
    fileInput.addEventListener('change', async (event) => {
      const file = event.target.files[0];
      if (file && window.game) {
        try {
          await window.game.importAILearningData(file);
          showNotification('📥 Learning data imported successfully!', 'success');
          updateAILearningStats();
        } catch (error) {
          showNotification('❌ Failed to import learning data: ' + error.message, 'error');
        }
        fileInput.value = ''; // Reset file input
      }
    });
  }
  
  // Clear Data Button
  const clearButton = document.getElementById('clear-learning-button');
  if (clearButton) {
    clearButton.addEventListener('click', () => {
      if (confirm('Are you sure you want to clear all AI learning data? This cannot be undone.')) {
        if (window.game) {
          const success = window.game.clearAILearningData();
          if (success) {
            showNotification('🔄 Learning data cleared', 'info');
            updateAILearningStats();
          } else {
            showNotification('❌ Failed to clear learning data', 'error');
          }
        }
      }
    });
  }
}

function updateAILearningStats() {
  if (!window.game) return;
  
  const stats = window.game.getAILearningStats();
  if (!stats) {
    updateStatsDisplay({
      totalGames: 0,
      performance: { averageScore: 0, winRate: 0, bestGame: { finalScore: 0 } },
      patternsLearned: 0,
      recentImprovement: 0
    });
    return;
  }
  
  updateStatsDisplay(stats);
  updateInsightsContent(stats);
}

function updateStatsDisplay(stats) {
  // Update stats display elements
  const elements = {
    'ai-total-games': stats.totalGames || 0,
    'ai-avg-score': Math.round(stats.performance?.averageScore || 0).toLocaleString(),
    'ai-win-rate': ((stats.performance?.winRate || 0) * 100).toFixed(1) + '%',
    'ai-best-score': (stats.performance?.bestGame?.finalScore || 0).toLocaleString(),
    'ai-patterns-learned': stats.patternsLearned || 0,
    'ai-recent-improvement': ((stats.recentImprovement || 0) >= 0 ? '+' : '') + 
                             (stats.recentImprovement || 0).toFixed(1) + '%'
  };
  
  Object.entries(elements).forEach(([id, value]) => {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = value;
      
      // Add color coding for improvement
      if (id === 'ai-recent-improvement') {
        const improvement = stats.recentImprovement || 0;
        if (improvement > 5) {
          element.style.color = '#4CAF50';
        } else if (improvement < -5) {
          element.style.color = '#f44336';
        } else {
          element.style.color = '#ffcc00';
        }
      }
    }
  });
}

function updateInsightsContent(stats) {
  const insightsElement = document.getElementById('ai-insights-content');
  if (!insightsElement) return;
  
  let insights = [];
  
  if (stats.totalGames === 0) {
    insights.push('🎮 No games played yet. Start playing to begin learning!');
  } else {
    if (stats.totalGames < 10) {
      insights.push(`🌱 Learning in progress... Play ${10 - stats.totalGames} more games for better insights.`);
    }
    
    if (stats.recentImprovement > 10) {
      insights.push('📈 Great progress! Your AI is improving significantly.');
    } else if (stats.recentImprovement < -10) {
      insights.push('📉 Performance declining. Consider adjusting strategy or difficulty.');
    }
    
    if (stats.performance?.winRate > 0.3) {
      insights.push('🏆 Excellent win rate! Your AI has learned effective strategies.');
    }
    
    if (stats.patternsLearned > 100) {
      insights.push('🧠 Rich pattern knowledge accumulated - AI is making sophisticated decisions.');
    }
    
    const topStrategies = stats.topStrategies || [];
    if (topStrategies.length > 0) {
      const bestStrategy = topStrategies[0];
      insights.push(`🎯 Most successful strategy: ${bestStrategy.move} moves (${(bestStrategy.weight * 100).toFixed(0)}% effectiveness)`);
    }
    
    if (insights.length === 0) {
      insights.push('🤖 AI is learning steadily. Keep playing to unlock more insights!');
    }
  }
  
  insightsElement.innerHTML = insights.map(insight => `<p>${insight}</p>`).join('');
}

function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 10001;
    max-width: 300px;
    font-weight: 500;
    animation: slideInRight 0.3s ease;
  `;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOutRight 0.3s ease forwards';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Add notification animations
const notificationStyle = document.createElement('style');
notificationStyle.textContent = `
  @keyframes slideInRight {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  
  @keyframes slideOutRight {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
`;
document.head.appendChild(notificationStyle);

// Initialize the game when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeFancy2048);
} else {
  // DOM is already loaded
  initializeFancy2048();
}

// Enhanced Error Handling and Recovery System
class GameErrorHandler {
  static handleError(error, context = 'Unknown') {
    console.error(`🚨 Game Error [${context}]:`, error);
    
    // Track error frequency
    if (!window.gameErrorStats) {
      window.gameErrorStats = { count: 0, contexts: {} };
    }
    window.gameErrorStats.count++;
    window.gameErrorStats.contexts[context] = (window.gameErrorStats.contexts[context] || 0) + 1;
    
    // Attempt recovery based on context
    switch (context) {
      case 'AI':
        GameErrorHandler.recoverFromAIError();
        break;
      case 'Touch':
        GameErrorHandler.recoverFromTouchError();
        break;
      case 'Animation':
        GameErrorHandler.recoverFromAnimationError();
        break;
      case 'Storage':
        GameErrorHandler.recoverFromStorageError();
        break;
      default:
        GameErrorHandler.recoverGeneral();
    }
  }
  
  static recoverFromAIError() {
    if (window.game) {
      window.game.stopAutoPlay();
      console.log('🔧 Recovered from AI error by stopping autoplay');
    }
  }
  
  static recoverFromTouchError() {
    if (window.game) {
      window.game.resetTouchState();
      console.log('🔧 Recovered from touch error by resetting touch state');
    }
  }
  
  static recoverFromAnimationError() {
    if (window.game) {
      window.game.animationInProgress = false;
      console.log('🔧 Recovered from animation error by resetting animation flag');
    }
  }
  
  static recoverFromStorageError() {
    console.log('🔧 Attempting storage recovery...');
    try {
      // Test basic localStorage functionality
      if (window.game && window.game.dataManager) {
        window.game.dataManager.setData('test', 'test');
        window.game.dataManager.removeData('test');
      } else {
        localStorage.setItem('test', 'test');
        localStorage.removeItem('test');
      }
      console.log('✅ Storage recovery successful');
    } catch (e) {
      console.warn('⚠️ Storage still unavailable, using memory-only mode');
    }
  }
  
  static recoverGeneral() {
    console.log('🔧 Attempting general game recovery...');
    if (window.game && typeof window.game.updateUI === 'function') {
      try {
        window.game.updateUI();
        console.log('✅ UI refresh successful');
      } catch (e) {
        console.error('❌ UI refresh failed:', e);
      }
    }
  }
  
  static getErrorReport() {
    if (!window.gameErrorStats) return 'No errors recorded';
    
    const report = {
      totalErrors: window.gameErrorStats.count,
      errorsByContext: window.gameErrorStats.contexts,
      timestamp: new Date().toISOString()
    };
    
    return JSON.stringify(report, null, 2);
  }
}

// Performance Monitoring System
class GamePerformanceMonitor {
  static metrics = {
    frameRate: [],
    memoryUsage: [],
    gameOperations: []
  };
  
  static startMonitoring() {
    if (GamePerformanceMonitor.isMonitoring) return;
    GamePerformanceMonitor.isMonitoring = true;
    
    // Monitor frame rate
    let lastTime = performance.now();
    let frameCount = 0;
    
    function measureFrameRate() {
      const now = performance.now();
      frameCount++;
      
      if (now - lastTime >= 1000) {
        const fps = Math.round((frameCount * 1000) / (now - lastTime));
        GamePerformanceMonitor.metrics.frameRate.push(fps);
        
        // Keep only last 60 seconds of data
        if (GamePerformanceMonitor.metrics.frameRate.length > 60) {
          GamePerformanceMonitor.metrics.frameRate.shift();
        }
        
        frameCount = 0;
        lastTime = now;
      }
      
      if (GamePerformanceMonitor.isMonitoring) {
        requestAnimationFrame(measureFrameRate);
      }
    }
    
    requestAnimationFrame(measureFrameRate);
    
    // Monitor memory usage (if available)
    if (performance.memory) {
      setInterval(() => {
        GamePerformanceMonitor.metrics.memoryUsage.push({
          used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
          total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
          timestamp: Date.now()
        });
        
        // Keep only last 5 minutes of memory data
        if (GamePerformanceMonitor.metrics.memoryUsage.length > 300) {
          GamePerformanceMonitor.metrics.memoryUsage.shift();
        }
      }, 1000);
    }
    
    console.log('📊 Performance monitoring started');
  }
  
  static stopMonitoring() {
    GamePerformanceMonitor.isMonitoring = false;
    console.log('📊 Performance monitoring stopped');
  }
  
  static getReport() {
    const frameRate = GamePerformanceMonitor.metrics.frameRate;
    const memoryUsage = GamePerformanceMonitor.metrics.memoryUsage;
    
    const avgFrameRate = frameRate.length > 0 ? 
      Math.round(frameRate.reduce((a, b) => a + b, 0) / frameRate.length) : 0;
    
    const latestMemory = memoryUsage[memoryUsage.length - 1] || { used: 0, total: 0 };
    
    return {
      performance: {
        averageFrameRate: avgFrameRate,
        currentMemoryUsage: `${latestMemory.used}MB / ${latestMemory.total}MB`,
        memoryUsagePercentage: latestMemory.total > 0 ? 
          Math.round((latestMemory.used / latestMemory.total) * 100) : 0
      },
      gameStats: window.game ? {
        moves: window.game.moves,
        score: window.game.score,
        gameTime: window.game.getFormattedTime(),
        boardSize: `${window.game.size}x${window.game.size}`,
        gameState: window.game.gameState
      } : null
    };
  }
  
  static logOperation(operation, duration) {
    GamePerformanceMonitor.metrics.gameOperations.push({
      operation,
      duration,
      timestamp: Date.now()
    });
    
    // Keep only last 100 operations
    if (GamePerformanceMonitor.metrics.gameOperations.length > 100) {
      GamePerformanceMonitor.metrics.gameOperations.shift();
    }
  }
}

// Accessibility Enhancement System
class AccessibilityEnhancer {
  static audioContext = null;
  static audioEnabled = true;
  
  static initialize() {
    AccessibilityEnhancer.setupKeyboardNavigation();
    AccessibilityEnhancer.setupScreenReaderSupport();
    AccessibilityEnhancer.setupHighContrastMode();
    AccessibilityEnhancer.setupFocusManagement();
    console.log('♿ Accessibility enhancements initialized');
  }
  
  static setupKeyboardNavigation() {
    document.addEventListener('keydown', (event) => {
      // Enhanced keyboard shortcuts
      if (event.target.tagName.toLowerCase() === 'input') return;
      
      const shortcuts = {
        'KeyR': () => window.game?.reset(),
        'KeyP': () => window.game?.togglePause(),
        'KeyU': () => window.game?.undo(),
        'KeyA': () => window.game?.toggleAutoPlay(),
        'KeyH': () => AccessibilityEnhancer.showHelpDialog(),
        'Digit1': () => window.game?.changeBoardSize(4),
        'Digit2': () => window.game?.changeBoardSize(5),
        'Digit3': () => window.game?.changeBoardSize(7),
        'Digit4': () => window.game?.changeBoardSize(9),
      };
      
      if (event.ctrlKey || event.metaKey) {
        const action = shortcuts[event.code];
        if (action) {
          event.preventDefault();
          action();
        }
      }
    });
  }
  
  static setupScreenReaderSupport() {
    // Enhanced ARIA live regions
    const gameContainer = document.getElementById('board-container');
    if (gameContainer && !gameContainer.getAttribute('aria-live')) {
      gameContainer.setAttribute('aria-live', 'polite');
      gameContainer.setAttribute('aria-atomic', 'false');
    }
    
    // Add score announcements
    const scoreContainer = document.getElementById('score-container');
    if (scoreContainer) {
      scoreContainer.setAttribute('aria-live', 'polite');
    }
    
    // Create enhanced screen reader announcements
    AccessibilityEnhancer.createAnnouncementRegion();
    
    // Listen for game events and provide audio/screen reader feedback
    document.addEventListener('tilesMoved', (event) => {
      const { direction, score, moved } = event.detail;
      if (moved) {
        AccessibilityEnhancer.announce(`Moved ${direction}, score is now ${score}`);
        AccessibilityEnhancer.playMoveSound(direction);
      }
    });
    
    document.addEventListener('gameWon', () => {
      AccessibilityEnhancer.announce('Congratulations! You reached 2048!');
      AccessibilityEnhancer.playSuccessSound();
    });
    
    document.addEventListener('gameOver', () => {
      AccessibilityEnhancer.announce('Game over. No more moves available.');
      AccessibilityEnhancer.playGameOverSound();
    });
  }
  
  static createAnnouncementRegion() {
    if (document.getElementById('sr-announcements')) return;
    
    const announcer = document.createElement('div');
    announcer.id = 'sr-announcements';
    announcer.setAttribute('aria-live', 'assertive');
    announcer.setAttribute('aria-atomic', 'true');
    announcer.style.cssText = `
      position: absolute;
      left: -10000px;
      width: 1px;
      height: 1px;
      overflow: hidden;
    `;
    document.body.appendChild(announcer);
  }
  
  static announce(message) {
    const announcer = document.getElementById('sr-announcements');
    if (announcer) {
      announcer.textContent = message;
    }
  }
  
  static playMoveSound(direction) {
    if (!AccessibilityEnhancer.audioEnabled) return;
    
    // Create simple audio feedback using Web Audio API
    try {
      const audioContext = AccessibilityEnhancer.getAudioContext();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      // Different frequencies for different directions
      const frequencies = {
        up: 440,    // A4
        down: 330,  // E4
        left: 293,  // D4
        right: 349  // F4
      };
      
      oscillator.frequency.setValueAtTime(frequencies[direction] || 440, audioContext.currentTime);
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch (error) {
      // Audio not supported or blocked, fail silently
    }
  }
  
  static playSuccessSound() {
    if (!AccessibilityEnhancer.audioEnabled) return;
    
    try {
      const audioContext = AccessibilityEnhancer.getAudioContext();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.frequency.setValueAtTime(523, audioContext.currentTime); // C5
      oscillator.frequency.setValueAtTime(659, audioContext.currentTime + 0.1); // E5
      oscillator.frequency.setValueAtTime(784, audioContext.currentTime + 0.2); // G5
      
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      // Audio not supported or blocked, fail silently
    }
  }
  
  static playGameOverSound() {
    if (!AccessibilityEnhancer.audioEnabled) return;
    
    try {
      const audioContext = AccessibilityEnhancer.getAudioContext();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.frequency.setValueAtTime(196, audioContext.currentTime); // G3
      oscillator.frequency.setValueAtTime(147, audioContext.currentTime + 0.15); // D3
      oscillator.frequency.setValueAtTime(123, audioContext.currentTime + 0.3); // B2
      
      gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      // Audio not supported or blocked, fail silently
    }
  }
  
  static getAudioContext() {
    if (!AccessibilityEnhancer.audioContext) {
      AccessibilityEnhancer.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return AccessibilityEnhancer.audioContext;
  }
  
  static toggleAudio() {
    AccessibilityEnhancer.audioEnabled = !AccessibilityEnhancer.audioEnabled;
    AccessibilityEnhancer.announce(
      AccessibilityEnhancer.audioEnabled ? 
      'Audio feedback enabled' : 
      'Audio feedback disabled'
    );
    return AccessibilityEnhancer.audioEnabled;
  }
  
  static setupHighContrastMode() {
    // Detect high contrast preference
    if (window.matchMedia('(prefers-contrast: high)').matches) {
      document.body.classList.add('high-contrast');
      console.log('🎨 High contrast mode enabled');
    }
    
    // Listen for changes
    window.matchMedia('(prefers-contrast: high)').addEventListener('change', (e) => {
      document.body.classList.toggle('high-contrast', e.matches);
    });
  }
  
  static setupFocusManagement() {
    // Enhanced focus management
    let lastFocusedElement = null;
    
    document.addEventListener('focusin', (event) => {
      lastFocusedElement = event.target;
    });
    
    // Restore focus after modal closes
    window.addEventListener('modalClosed', () => {
      if (lastFocusedElement) {
        lastFocusedElement.focus();
      }
    });
  }
  
  static showHelpDialog() {
    const helpContent = `
      <h2>Fancy2048 Keyboard Shortcuts</h2>
      <ul>
        <li><strong>Arrow Keys:</strong> Move tiles</li>
        <li><strong>R:</strong> Reset game</li>
        <li><strong>P:</strong> Pause/Resume</li>
        <li><strong>U:</strong> Undo last move</li>
        <li><strong>A:</strong> Toggle AI autoplay</li>
        <li><strong>1-4:</strong> Change board size (4x4, 5x5, 7x7, 9x9)</li>
        <li><strong>H:</strong> Show this help</li>
      </ul>
      <p>Swipe gestures work on touch devices.</p>
    `;
    
    // You would implement a modal here
    alert(helpContent.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim());
  }
}

// Initialize enhanced systems
window.addEventListener('DOMContentLoaded', () => {
  GamePerformanceMonitor.startMonitoring();
  AccessibilityEnhancer.initialize();
});

// Global error handler
window.addEventListener('error', (event) => {
  GameErrorHandler.handleError(event.error, 'Global');
});

// Unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  GameErrorHandler.handleError(event.reason, 'Promise');
});

// AI Debug Tools - Enhanced Version
window.aiDebugTools = {
  testAI: (moves = 5) => {
    if (window.game && window.game.getBestMove) {
      console.log('🧪 Testing AI for', moves, 'moves...');
      for (let i = 0; i < moves; i++) {
        try {
          const move = window.game.getBestMove();
          console.log(`Move ${i + 1}: ${move}`);
          if (move && window.game.canMove(move)) {
            window.game.move(move);
            // Wait for move to complete
            setTimeout(() => {}, 100);
          } else {
            console.log('Invalid move or no move available, stopping test');
            break;
          }
        } catch (error) {
          console.error('AI test failed at move', i + 1, ':', error);
          break;
        }
      }
    } else {
      console.error('Game or AI not available');
    }
  },
  
  testAutoplay: () => {
    if (window.game && window.game.toggleAutoPlay) {
      console.log('🧪 Testing autoplay...');
      window.game.toggleAutoPlay();
    } else {
      console.error('Autoplay not available');
    }
  },
  
  checkAI: () => {
    console.log('🔍 AI Status Check:');
    if (window.game) {
      console.log('- Game instance:', !!window.game);
      console.log('- Enhanced AI:', !!window.game.enhancedAI);
      console.log('- Advanced AI:', !!window.game.advancedAI);
      console.log('- getBestMove method:', typeof window.game.getBestMove);
      console.log('- AI Classes Available:');
      console.log('  * AdvancedAI2048Solver:', !!window.AdvancedAI2048Solver);
      console.log('  * Enhanced2048AI:', !!window.Enhanced2048AI);
      console.log('  * AILearningSystem:', !!window.AILearningSystem);
    } else {
      console.error('Game instance not available');
    }
  }
};
