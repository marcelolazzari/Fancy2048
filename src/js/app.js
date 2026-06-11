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

    // --- Auto-play state (single source of truth) ---
    this.autoPlayActive = false;
    this.autoPlayTimer = null;
    this.isAutoMoving = false; // true while the AI is computing a move
    // Ordered speed steps; `delay` is the pause (ms) between moves. MAX = run
    // as fast as the AI can compute.
    this.autoPlaySpeeds = [
      { label: '1x', delay: 350 },
      { label: '2x', delay: 180 },
      { label: '4x', delay: 90 },
      { label: '8x', delay: 35 },
      { label: 'MAX', delay: 0 }
    ];
    this.autoPlaySpeedIndex = 0;

    // Initialize when DOM is ready
    this.waitForReadyState();
  }
  
  /**
   * Wait for DOM and all scripts to be ready
   */
  waitForReadyState() {
    const checkReady = () => {
      const hasRequiredClasses = typeof Utils !== 'undefined' && 
                                 typeof GameEngine !== 'undefined' && 
                                 typeof UIController !== 'undefined' && 
                                 typeof TouchHandler !== 'undefined';
      
      if ((document.readyState === 'complete' || 
           (document.readyState === 'interactive' && document.getElementById('game-board'))) &&
          hasRequiredClasses) {
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

      // Seed the solver with the learned weights for this board size
      this.prepareLearningForGame();

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

      // Self-improvement: load learned heuristic weights and keep tuning them
      // from the AI's own games (per board size, shared across difficulties).
      if (typeof AILearner !== 'undefined') {
        this.aiLearner = new AILearner({ defaultWeights: this.aiSolver.weights });
        this.gameAiMoves = 0;
        Utils.log('app', 'AI Learner enabled');
      }
    } else {
      Utils.log('app', 'AI Solver not available');
    }

    // Apply saved settings
    this.applySettings();

    // Small delay to ensure everything is ready
    await Utils.sleep(100);
  }

  /**
   * Apply the weights for the upcoming game and reset per-game learning
   * counters. The learner returns the current best weights (or a mutated
   * candidate it is currently evaluating).
   */
  prepareLearningForGame() {
    this.gameAiMoves = 0;
    this.currentGameRecorded = false; // whether this game is already in the stats history
    this.pendingAiWin = false;        // never carry an AI-win prompt into a fresh game
    if (!this.aiLearner || !this.aiSolver) return;
    const size = this.gameEngine.size;
    this.aiSolver.weights = this.aiLearner.beginGame(size);
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
    
    // Apply AI difficulty and keep the difficulty selector in sync with it
    if (this.aiSolver) {
      const difficulty = settings.aiDifficulty || this.aiSolver.difficulty;
      this.aiSolver.setDifficulty(difficulty);
      const select = this.uiController?.elements?.aiDifficultySelect;
      if (select) {
        select.value = difficulty;
      }
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
    // Was the AI driving this game? (used for both learning and stats)
    const wasAutoPlaying = this.autoPlayActive;
    const totalMoves = this.gameEngine.moves || 0;
    const aiDriven = this.aiLearner &&
      this.gameAiMoves >= 10 &&
      this.gameAiMoves >= 0.6 * totalMoves;

    // Tag the result so stats can distinguish AI-played games, and treat a game
    // that reached 2048 at any point as a win even if it later filled up.
    result.isAI = wasAutoPlaying;
    result.won = result.won || this.gameEngine.hasWon;

    // Stop auto-play if active. We do NOT auto-restart: the AI plays one game,
    // records what it learned, and leaves the final board on screen for review.
    this.stopAutoPlay();
    this.pendingAiWin = false;

    if (wasAutoPlaying) {
      // No blocking game-over card in AI mode; persist the result to the stats
      // history directly (the overlay is what normally saves it) unless this
      // game was already recorded when it hit 2048. Show a brief, non-blocking
      // summary instead of an overlay.
      if (!this.currentGameRecorded) {
        Storage.saveGameResult(result);
        this.currentGameRecorded = true;
      }
      this.uiController.showNotification(
        `AI game over — score ${Utils.formatNumber(result.score)}, best tile ${Utils.formatNumber(result.highestTile)}`,
        'info', 3500);
    } else {
      // Human play: the overlay handles persistence.
      this.uiController.showGameOver(result);
    }

    // Auto-save current game state
    this.saveGameState();

    // Learn from the AI's own play (stores the best-performing weights so the
    // AI keeps improving from every game it plays).
    if (aiDriven) {
      const event = this.aiLearner.recordResult(result.boardSize || this.gameEngine.size, result);
      Utils.log('app', 'AI learning', event);
      if (event.type === 'improved') {
        this.uiController.showNotification(
          `AI improved itself (gen ${event.generation})`, 'success', 2500);
      }
    }

    Utils.log('app', 'Game over', result);
  }

  /**
   * Handle game win (a 2048 tile appeared)
   */
  handleGameWin(result) {
    result.isAI = this.autoPlayActive;

    if (this.autoPlayActive) {
      // Record the AI's win to the stats history now (so it counts even if the
      // player starts a new game from here), then pause and ask whether the AI
      // should keep going. The per-game guard stops game-over double-counting.
      result.won = true;
      if (!this.currentGameRecorded) {
        Storage.saveGameResult(result);
        this.currentGameRecorded = true;
      }
      this.pendingAiWin = true;
      this.stopAutoPlay();
      this.uiController.showVictory(result, { ai: true });
    } else {
      this.uiController.showVictory(result);
    }

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
   * Current speed label (e.g. '2x', 'MAX')
   */
  get autoPlaySpeedLabel() {
    return this.autoPlaySpeeds[this.autoPlaySpeedIndex].label;
  }

  /**
   * Delay (ms) between auto-play moves for the current speed
   */
  get autoPlayMoveDelay() {
    return this.autoPlaySpeeds[this.autoPlaySpeedIndex].delay;
  }

  /**
   * Toggle auto-play on/off
   */
  toggleAutoPlay() {
    if (this.autoPlayActive) {
      this.stopAutoPlay();
      return false;
    }
    return this.startAutoPlay();
  }

  /**
   * Start auto-play. Returns true if it actually started.
   */
  startAutoPlay() {
    if (this.autoPlayActive) return true;

    if (!this.aiSolver) {
      Utils.log('app', 'Cannot start autoplay: AI solver not available');
      return false;
    }
    if (this.gameEngine.isGameOver) {
      Utils.log('app', 'Cannot start autoplay: game is over');
      return false;
    }

    this.clearSelfPlayTimer();
    // No overlays should linger while the AI is auto-playing
    if (this.uiController) this.uiController.hideOverlays();
    this.autoPlayActive = true;
    this.syncAutoPlayUI();
    Utils.log('app', 'Auto-play started');

    // Kick off the loop (small initial delay so the UI updates first)
    this.scheduleAutoMove(80);
    return true;
  }

  /**
   * Stop auto-play (also cancels any pending self-play restart)
   */
  stopAutoPlay() {
    if (this.autoPlayTimer) {
      clearTimeout(this.autoPlayTimer);
      this.autoPlayTimer = null;
    }
    this.clearSelfPlayTimer();

    const wasActive = this.autoPlayActive;
    this.autoPlayActive = false;
    this.syncAutoPlayUI();

    if (wasActive) {
      Utils.log('app', 'Auto-play stopped');
    }
  }

  /**
   * Cancel a pending continuous-self-play restart, if any.
   */
  clearSelfPlayTimer() {
    if (this.selfPlayTimer) {
      clearTimeout(this.selfPlayTimer);
      this.selfPlayTimer = null;
    }
  }

  /**
   * Schedule the next auto-play move after `delay` ms (clears any pending one)
   */
  scheduleAutoMove(delay) {
    if (!this.autoPlayActive) return;
    if (this.autoPlayTimer) {
      clearTimeout(this.autoPlayTimer);
    }
    this.autoPlayTimer = setTimeout(() => this.autoMoveStep(), Math.max(0, delay));
  }

  /**
   * Perform a single auto-play move, then schedule the next using the current
   * speed. Reading the speed each tick means changes apply on the very next
   * move with no restart needed.
   */
  async autoMoveStep() {
    this.autoPlayTimer = null;

    if (!this.autoPlayActive) return;
    if (this.isAutoMoving) return; // a previous step is still computing
    if (this.gameEngine.isGameOver) {
      this.stopAutoPlay();
      return;
    }

    this.isAutoMoving = true;
    try {
      const move = await this.aiSolver.getBestMove();

      // The user may have stopped auto-play while the AI was thinking
      if (!this.autoPlayActive) return;

      if (!move || !this.gameEngine.move(move)) {
        Utils.log('app', 'No further moves available, stopping autoplay');
        this.stopAutoPlay();
        return;
      }

      // Count moves the AI actually made (used to learn only from self-play).
      this.gameAiMoves = (this.gameAiMoves || 0) + 1;
      this.uiController.updateDisplay();

      // The move may have ended the game; handleGameOver owns what happens next
      // (learning + self-play restart), so don't schedule another move here.
      if (this.gameEngine.isGameOver) return;

      // Schedule the next move using the latest speed setting
      this.scheduleAutoMove(this.autoPlayMoveDelay);
    } catch (error) {
      Utils.handleError(error, 'Auto-play move');
      this.stopAutoPlay();
    } finally {
      this.isAutoMoving = false;
    }
  }

  /**
   * Advance to the next auto-play speed. Applies immediately, even mid-run.
   */
  cycleAutoPlaySpeed() {
    this.autoPlaySpeedIndex = (this.autoPlaySpeedIndex + 1) % this.autoPlaySpeeds.length;
    this.syncSpeedUI();

    // If running and currently waiting between moves, reschedule the pending
    // move with the new delay so the change is felt right away. If the AI is
    // mid-computation, autoMoveStep will pick up the new delay when it finishes.
    if (this.autoPlayActive && !this.isAutoMoving) {
      this.scheduleAutoMove(this.autoPlayMoveDelay);
    }

    Utils.log('app', `Auto-play speed changed to: ${this.autoPlaySpeedLabel}`);
    return this.autoPlaySpeedLabel;
  }

  /**
   * Reflect the auto-play on/off state on its button
   */
  syncAutoPlayUI() {
    const button = this.uiController?.elements?.aiAutoButton;
    if (!button) return;
    button.classList.toggle('active', this.autoPlayActive);
    button.textContent = this.autoPlayActive ? 'Stop' : 'Auto Play';
    button.setAttribute('aria-pressed', String(this.autoPlayActive));
  }

  /**
   * Reflect the current speed on the speed button (text + data-speed styling)
   */
  syncSpeedUI() {
    const button = this.uiController?.elements?.speedButton;
    if (!button) return;
    const label = this.autoPlaySpeedLabel;
    button.textContent = label;
    button.setAttribute('data-speed', label);
  }

  /**
   * New game
   */
  newGame() {
    this.stopAutoPlay();
    this.pendingAiWin = false;
    this.gameEngine.newGame();
    this.prepareLearningForGame();
    this.uiController.hideOverlays();
    this.uiController.updateDisplay();
    this.saveGameState();

    Utils.log('app', 'New game started');
  }

  /**
   * The player chose "Keep Playing" after the AI hit 2048: resume auto-play
   * from the current board so the AI continues toward a higher tile.
   */
  resumeAfterAiWin() {
    if (!this.pendingAiWin) return false;
    this.pendingAiWin = false;
    return this.startAutoPlay();
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
      try {
        Utils.animate(300, (progress) => {
          loadingScreen.style.opacity = 1 - progress;
        }, Utils.easing.easeOutQuad);
        
        setTimeout(() => {
          loadingScreen.classList.add('hidden');
          if (loadingScreen.parentNode) {
            loadingScreen.parentNode.removeChild(loadingScreen);
          }
        }, 300);
      } catch (error) {
        // Fallback for environments without animation support
        loadingScreen.classList.add('hidden');
        if (loadingScreen.parentNode) {
          loadingScreen.parentNode.removeChild(loadingScreen);
        }
      }
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
      resetLearning: () => this.aiLearner?.reset(),
      getLearning: () => this.aiLearner?.getStats(this.gameEngine.size),
      getStats: () => ({
        game: this.gameEngine.getGameState(),
        storage: Storage.getStatistics(),
        ui: this.uiController.getStats(),
        touch: this.touchHandler?.getStats(),
        ai: this.aiSolver?.getStats(),
        learning: this.aiLearner?.getStats(this.gameEngine.size)
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
