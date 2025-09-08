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
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initialize());
    } else {
      this.initialize();
    }
  }

  /**
   * Initialize the application
   */
  async initialize() {
    try {
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
      Utils.handleError(error, 'App initialization');
      this.showInitializationError();
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
      Utils.log('app', 'AI Solver initialized');
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
    if (!this.aiSolver || this.autoPlayActive || this.gameEngine.isGameOver) {
      return false;
    }
    
    this.autoPlayActive = true;
    Utils.log('app', 'Auto-play started');
    
    // Auto-play loop
    const playMove = async () => {
      if (!this.autoPlayActive || this.gameEngine.isGameOver) {
        this.stopAutoPlay();
        return;
      }
      
      try {
        const bestMove = await this.aiSolver.getBestMove();
        
        if (bestMove && this.autoPlayActive) {
          const success = this.gameEngine.move(bestMove);
          
          if (success) {
            // Schedule next move
            this.autoPlayInterval = setTimeout(playMove, 500);
          } else {
            // No valid moves, stop auto-play
            this.stopAutoPlay();
          }
        } else {
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
    Utils.log('app', 'Auto-play stopped');
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
  showInitializationError() {
    const errorMessage = document.createElement('div');
    errorMessage.className = 'initialization-error';
    errorMessage.innerHTML = `
      <div class="error-content">
        <h2>⚠️ Initialization Error</h2>
        <p>Failed to load Fancy2048. Please try refreshing the page.</p>
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
      background: var(--background-color);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `;
    
    document.body.appendChild(errorMessage);
  }

  /**
   * Announce app ready
   */
  announceReady() {
    // Dispatch ready event
    const readyEvent = new CustomEvent('fancy2048Ready', {
      detail: {
        version: '2.0.0',
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
      version: '2.0.0',
      newGame: () => this.newGame(),
      getHint: () => this.getAIHint(),
      toggleAutoPlay: () => this.toggleAutoPlay(),
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
