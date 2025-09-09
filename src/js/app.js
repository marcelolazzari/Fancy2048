/**
 * Fancy2048 - Main Application Controller
 * Initializes and coordinates all game systems
 */

class Fancy2048App {
  constructor() {
    this.gameEngine = null;
    this.uiController = null;
    this.touchHandler = null;
    this.aiSolver = null;
    
    this.isInitialized = false;
    this.autoPlayActive = false;
    this.autoPlayInterval = null;
    this.autoPlaySpeed = 1; // Speed multiplier (1x, 2x, 4x, 8x, MAX)
    
    // Initialize when DOM is ready
    this.waitForReadyState();
  }
  
  /**
   * Wait for DOM and all scripts to be ready
   */
  waitForReadyState() {
    const checkReady = () => {
      if (document.readyState === 'complete' || 
          (document.readyState === 'interactive' && document.getElementById('game-board'))) {
        // Add a small delay to ensure all scripts have executed
        setTimeout(() => this.initialize(), 100);
      } else {
        setTimeout(checkReady, 50);
      }
    };
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', checkReady);
    } else {
      checkReady();
    }
  }

  /**
   * Initialize the application
   */
  async initialize() {
    try {
      console.log('Fancy2048: Starting initialization...');
      
      // Check if DOM is ready
      if (document.readyState === 'loading') {
        throw new Error('DOM not ready - this should not happen');
      }
      
      // Check if required classes are available
      if (typeof Utils === 'undefined') {
        throw new Error('Utils class not available - script load order issue');
      }
      if (typeof GameEngine === 'undefined') {
        throw new Error('GameEngine class not available - script load order issue');
      }
      if (typeof UIController === 'undefined') {
        throw new Error('UIController class not available - script load order issue');
      }
      if (typeof TouchHandler === 'undefined') {
        throw new Error('TouchHandler class not available - script load order issue');
      }
      
      // Check if required DOM elements exist
      const gameBoard = document.getElementById('game-board');
      if (!gameBoard) {
        throw new Error('Game board element not found');
      }
      
      Utils.log('app', 'Initializing Fancy2048...');
      
      // Show loading screen
      this.showLoadingScreen();
      
      // Initialize core systems
      await this.initializeGameSystems();
      
      // Setup callbacks and event handlers
      this.setupGameCallbacks();
      
      // Load saved game state if available
      this.loadSavedGame();
      
      // Hide loading screen
      this.hideLoadingScreen();
      
      this.isInitialized = true;
      
      Utils.log('app', 'Fancy2048 initialized successfully');
      
      // Announce readiness
      this.announceReady();
      
    } catch (error) {
      console.error('Fancy2048 initialization error:', error);
      if (typeof Utils !== 'undefined' && Utils.handleError) {
        Utils.handleError(error, 'App initialization');
      }
      this.showInitializationError(error);
    }
  }

  /**
   * Initialize game systems
   */
  async initializeGameSystems() {
    // Initialize game engine
    this.gameEngine = new GameEngine();
    
    // Initialize UI controller
    this.uiController = new UIController(this.gameEngine);
    
    // Initialize touch handler
    this.touchHandler = new TouchHandler(this.gameEngine, this.uiController);
    
    // Initialize AI solver (if available)
    if (typeof AISolver !== 'undefined') {
      this.aiSolver = new AISolver(this.gameEngine);
      // Set AI to hard difficulty for better performance
      this.aiSolver.setDifficulty('hard');
      Utils.log('app', 'AI Solver initialized with hard difficulty');
    } else {
      Utils.log('app', 'AI Solver not available');
    }
    
    // Apply saved settings
    this.applySettings();
    
    // Small delay to ensure everything is ready
    await Utils.sleep(100);
  }

  /**
   * Setup game engine callbacks
   */
  setupGameCallbacks() {
    // Board update callback
    this.gameEngine.onBoardUpdate((board) => {
      this.uiController.updateBoard();
    });
    
    // Score update callback
    this.gameEngine.onScoreUpdate((score, moves) => {
      this.uiController.updateScore();
    });
    
    // Game over callback
    this.gameEngine.onGameOver((result) => {
      this.handleGameOver(result);
    });
    
    // Win callback
    this.gameEngine.onWin((result) => {
      this.handleGameWin(result);
    });
    
    // Move callback
    this.gameEngine.onMove((direction, moves) => {
      this.handleMove(direction, moves);
    });
  }

  /**
   * Apply saved settings
   */
  applySettings() {
    const settings = Storage.getSettings();
    
    // Apply board size
    if (settings.boardSize && settings.boardSize !== this.gameEngine.size) {
      this.gameEngine.setBoardSize(settings.boardSize);
    }
    
    // Apply theme
    if (settings.theme) {
      this.uiController.setTheme(settings.theme);
    }
    
    // Apply AI difficulty
    if (this.aiSolver && settings.aiDifficulty) {
      this.aiSolver.setDifficulty(settings.aiDifficulty);
    }
    
    // Apply touch settings
    if (this.touchHandler) {
      this.touchHandler.updateSettings({
        hapticEnabled: settings.hapticEnabled !== false,
        gestureIndicators: settings.gestureIndicators !== false
      });
    }
    
    Utils.log('app', 'Settings applied', settings);
  }

  /**
   * Handle game over
   */
  handleGameOver(result) {
    // Stop auto-play if active
    this.stopAutoPlay();
    
    // Show game over UI
    this.uiController.showGameOver(result);
    
    // Auto-save game state
    this.saveGameState();
    
    Utils.log('app', 'Game over', result);
  }

  /**
   * Handle game win
   */
  handleGameWin(result) {
    // Show victory UI
    this.uiController.showVictory(result);
    
    // Auto-save game state
    this.saveGameState();
    
    Utils.log('app', 'Game won', result);
  }

  /**
   * Handle move
   */
  handleMove(direction, moves) {
    // Auto-save periodically
    if (moves % 5 === 0) {
      this.saveGameState();
    }
    
    // Update UI
    this.uiController.updateControls();
    
    // Play sound effect
    this.uiController.playSound('move');
  }

  /**
   * Get AI hint
   */
  async getAIHint() {
    if (!this.aiSolver || !this.isInitialized) {
      return null;
    }
    
    try {
      const hint = await this.aiSolver.getHint();
      Utils.log('app', `AI hint: ${hint}`);
      return hint;
    } catch (error) {
      Utils.handleError(error, 'getAIHint');
      return null;
    }
  }

  /**
   * Toggle auto-play
   */
  toggleAutoPlay() {
    if (this.autoPlayActive) {
      this.stopAutoPlay();
    } else {
      this.startAutoPlay();
    }
  }

  /**
   * Start auto-play
   */
  async startAutoPlay() {
    if (!this.aiSolver) {
      Utils.log('app', 'Cannot start autoplay: AI solver not available');
      return false;
    }
    
    if (this.autoPlayActive) {
      Utils.log('app', 'Cannot start autoplay: already active');
      return false;
    }
    
    if (this.gameEngine.isGameOver) {
      Utils.log('app', 'Cannot start autoplay: game is over');
      return false;
    }
    
    this.autoPlayActive = true;
    Utils.log('app', 'Auto-play started');

    // Ensure UI reflects autoplay state when started programmatically
    if (this.uiController && this.uiController.elements && this.uiController.elements.aiAutoButton) {
      this.uiController.elements.aiAutoButton.classList.add('active');
    }
    
    // Auto-play loop
    const playMove = async () => {
      if (!this.autoPlayActive || this.gameEngine.isGameOver) {
        this.stopAutoPlay();
        return;
      }
      
      try {
        Utils.log('app', 'Getting best move from AI...');
        const bestMove = await this.aiSolver.getBestMove();
        Utils.log('app', 'AI suggested move:', bestMove);
        
        if (bestMove && this.autoPlayActive) {
          const success = this.gameEngine.move(bestMove);
          Utils.log('app', 'Move execution result:', success);
          
          if (success) {
            // Update UI
            this.uiController.updateDisplay();
            // Schedule next move with speed control
            const baseDelay = 200;
            const delay = this.autoPlaySpeed === 'MAX' ? 0 : Math.max(25, baseDelay / this.autoPlaySpeed);
            this.autoPlayInterval = setTimeout(playMove, delay);
          } else {
            // No valid moves, stop auto-play
            Utils.log('app', 'Move failed, stopping autoplay');
            this.stopAutoPlay();
          }
        } else {
          Utils.log('app', 'No best move available, stopping autoplay');
          this.stopAutoPlay();
        }
      } catch (error) {
        Utils.handleError(error, 'Auto-play move');
        this.stopAutoPlay();
      }
    };
    
    // Start the first move
    setTimeout(playMove, 100);
    
    return true;
  }

  /**
   * Stop auto-play
   */
  stopAutoPlay() {
    if (this.autoPlayInterval) {
      clearTimeout(this.autoPlayInterval);
      this.autoPlayInterval = null;
    }
    
    this.autoPlayActive = false;
    
    // Update UI button state
    if (this.uiController && this.uiController.elements && this.uiController.elements.aiAutoButton) {
      this.uiController.elements.aiAutoButton.classList.remove('active');
    }
    
    Utils.log('app', 'Auto-play stopped');
  }

  /**
   * Cycle through autoplay speeds
   */
  cycleAutoPlaySpeed() {
    const speeds = [1, 2, 4, 8, 'MAX'];
    const currentIndex = speeds.indexOf(this.autoPlaySpeed);
    const nextIndex = (currentIndex + 1) % speeds.length;
    this.autoPlaySpeed = speeds[nextIndex];
    
    // Update speed button display
    if (this.uiController && this.uiController.elements && this.uiController.elements.speedButton) {
      const speedText = this.autoPlaySpeed === 'MAX' ? 'MAX' : `${this.autoPlaySpeed}x`;
      this.uiController.elements.speedButton.textContent = speedText;
      this.uiController.elements.speedButton.setAttribute('data-speed', speedText);
    }
    
    Utils.log('app', `Auto-play speed changed to: ${this.autoPlaySpeed}`);
    return this.autoPlaySpeed;
  }

  /**
   * New game
   */
  newGame() {
    this.stopAutoPlay();
    this.gameEngine.newGame();
    this.uiController.updateDisplay();
    this.saveGameState();
    
    Utils.log('app', 'New game started');
  }

  /**
   * Save current game state
   */
  saveGameState() {
    if (!this.isInitialized) return;
    
    try {
      const gameState = this.gameEngine.getGameState();
      Storage.saveGameState(gameState);
    } catch (error) {
      Utils.handleError(error, 'saveGameState');
    }
  }

  /**
   * Load saved game
   */
  loadSavedGame() {
    try {
      const success = this.uiController.loadGameState();
      if (success) {
        Utils.log('app', 'Saved game loaded');
      } else {
        // Start new game if no saved state
        this.gameEngine.initialize();
        this.uiController.updateDisplay();
      }
    } catch (error) {
      Utils.handleError(error, 'loadSavedGame');
      // Fallback to new game
      this.gameEngine.initialize();
      this.uiController.updateDisplay();
    }
  }

  /**
   * Show loading screen
   */
  showLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
      loadingScreen.classList.remove('hidden');
    }
  }

  /**
   * Hide loading screen
   */
  hideLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
      Utils.animate(300, (progress) => {
        loadingScreen.style.opacity = 1 - progress;
      }, Utils.easing.easeOutQuad);
      
      setTimeout(() => {
        loadingScreen.classList.add('hidden');
        if (loadingScreen.parentNode) {
          loadingScreen.parentNode.removeChild(loadingScreen);
        }
      }, 300);
    }
  }

  /**
   * Show initialization error
   */
  showInitializationError(error) {
    // Hide loading screen if it's still visible
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
      loadingScreen.style.display = 'none';
    }
    
    const errorMessage = document.createElement('div');
    errorMessage.className = 'initialization-error';
    errorMessage.innerHTML = `
      <div class="error-content">
        <h2>⚠️ Initialization Error</h2>
        <p>Failed to load Fancy2048. Please try refreshing the page.</p>
        ${error ? `<p class="error-details">Error: ${error.message || error}</p>` : ''}
        <button onclick="window.location.reload()" class="retry-button">
          Retry
        </button>
      </div>
    `;
    
    errorMessage.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: #1a1a1a;
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    `;
    
    // Style the content
    const style = document.createElement('style');
    style.textContent = `
      .error-content {
        text-align: center;
        padding: 2rem;
        background: #2d2d2d;
        border-radius: 8px;
        max-width: 500px;
        margin: 1rem;
      }
      .error-details {
        background: #3d1a00;
        color: #ffaa88;
        padding: 1rem;
        border-radius: 4px;
        margin: 1rem 0;
        font-family: monospace;
        font-size: 0.9rem;
        overflow-wrap: break-word;
      }
      .retry-button {
        background: #ffcc00;
        color: #1a1a1a;
        border: none;
        padding: 0.75rem 2rem;
        border-radius: 4px;
        font-size: 1rem;
        cursor: pointer;
        margin-top: 1rem;
      }
      .retry-button:hover {
        background: #e6b800;
      }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(errorMessage);
  }

  /**
   * Announce app ready
   */
  announceReady() {
    // Dispatch ready event
    const readyEvent = new CustomEvent('fancy2048Ready', {
      detail: {
        version: '2.0.1-js',
        features: {
          aiSolver: !!this.aiSolver,
          touchSupport: !!this.touchHandler,
          storageSupport: Storage.isStorageAvailable()
        }
      }
    });
    
    window.dispatchEvent(readyEvent);
    
    // Global accessibility
    window.fancy2048 = {
      version: '2.0.1-js',
      newGame: () => this.newGame(),
      getHint: () => this.getAIHint(),
      toggleAutoPlay: () => this.toggleAutoPlay(),
      cycleSpeed: () => this.cycleAutoPlaySpeed(),
      exportStats: () => Storage.exportData(),
      getStats: () => ({
        game: this.gameEngine.getGameState(),
        storage: Storage.getStatistics(),
        ui: this.uiController.getStats(),
        touch: this.touchHandler?.getStats(),
        ai: this.aiSolver?.getStats()
      })
    };
    
    Utils.log('app', 'Fancy2048 ready for interaction');
  }

  /**
   * Handle keyboard shortcuts
   */
  handleKeyboardShortcuts(event) {
    // Global shortcuts that work everywhere
    if (event.ctrlKey || event.metaKey) {
      switch (event.code) {
        case 'KeyH':
          event.preventDefault();
          this.getAIHint();
          break;
        case 'Space':
          event.preventDefault();
          this.toggleAutoPlay();
          break;
        case 'KeyS':
          event.preventDefault();
          this.cycleAutoPlaySpeed();
          break;
      }
    }
  }

  /**
   * Handle visibility change (page focus/blur)
   */
  handleVisibilityChange() {
    if (document.hidden) {
      // Page is hidden - pause auto-play and save state
      this.stopAutoPlay();
      this.saveGameState();
    }
  }

  /**
   * Handle page unload
   */
  handleBeforeUnload() {
    this.stopAutoPlay();
    this.saveGameState();
  }

  /**
   * Get application statistics
   */
  getAppStats() {
    return {
      initialized: this.isInitialized,
      autoPlayActive: this.autoPlayActive,
      systemStats: {
        gameEngine: this.gameEngine?.getGameState(),
        storage: Storage.getStorageInfo(),
        ui: this.uiController?.getStats(),
        touch: this.touchHandler?.getStats(),
        ai: this.aiSolver?.getStats()
      }
    };
  }

  /**
   * Destroy application (cleanup)
   */
  destroy() {
    Utils.log('app', 'Destroying Fancy2048 app...');
    
    // Stop auto-play
    this.stopAutoPlay();
    
    // Save final state
    this.saveGameState();
    
    // Cleanup handlers
    if (this.touchHandler) {
      this.touchHandler.destroy();
    }
    
    // Clear references
    this.gameEngine = null;
    this.uiController = null;
    this.touchHandler = null;
    this.aiSolver = null;
    
    this.isInitialized = false;
    
    Utils.log('app', 'Fancy2048 app destroyed');
  }
}

// Global event listeners
document.addEventListener('keydown', (event) => {
  if (window.fancy2048App) {
    window.fancy2048App.handleKeyboardShortcuts(event);
  }
});

document.addEventListener('visibilitychange', () => {
  if (window.fancy2048App) {
    window.fancy2048App.handleVisibilityChange();
  }
});

window.addEventListener('beforeunload', () => {
  if (window.fancy2048App) {
    window.fancy2048App.handleBeforeUnload();
  }
});

// Initialize the application
const fancy2048App = new Fancy2048App();

// Make available globally
if (typeof window !== 'undefined') {
  window.Fancy2048App = Fancy2048App;
  window.fancy2048App = fancy2048App;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Fancy2048App;
}
