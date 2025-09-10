/**
 * Vision2048 - Main Application Controller
 * Manages the vision-controlled 2048 game
 */

class Vision2048App {
  constructor() {
    this.gameEngine = null;
    this.uiController = null;
    this.visionHandler = null;
    
    this.isInitialized = false;
    
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
      console.log('Vision2048: Starting initialization...');
      
      // Check if DOM is ready
      if (document.readyState === 'loading') {
        console.warn('DOM still loading, waiting for readyState change...');
        await new Promise(resolve => {
          const checkReady = () => {
            if (document.readyState !== 'loading') {
              resolve();
            } else {
              setTimeout(checkReady, 10);
            }
          };
          checkReady();
        });
      }
      
      // Check if required classes are available with retries
      const maxRetries = 10;
      let retries = 0;
      
      while (retries < maxRetries) {
        const missingClasses = [];
        
        if (typeof Utils === 'undefined') missingClasses.push('Utils');
        if (typeof GameEngine === 'undefined') missingClasses.push('GameEngine');
        if (typeof UIController === 'undefined') missingClasses.push('UIController');
        if (typeof VisionHandler === 'undefined') missingClasses.push('VisionHandler');
        
        if (missingClasses.length === 0) {
          break; // All classes available
        }
        
        if (retries === maxRetries - 1) {
          throw new Error(`Required classes not available: ${missingClasses.join(', ')} - script load order issue`);
        }
        
        console.log(`Waiting for classes to load... Missing: ${missingClasses.join(', ')} (attempt ${retries + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 100));
        retries++;
      }
      
      // Check if required DOM elements exist
      const gameBoard = document.getElementById('game-board');
      if (!gameBoard) {
        throw new Error('Game board element not found');
      }
      
      const cameraVideo = document.getElementById('camera-video');
      if (!cameraVideo) {
        throw new Error('Camera video element not found');
      }
      
      Utils.log('vision-app', 'Initializing Vision2048...');
      
      // Show loading screen
      this.showLoadingScreen();
      
      // Initialize core systems
      await this.initializeGameSystems();
      
      // Setup callbacks and event handlers
      this.setupGameCallbacks();
      this.setupVisionCallbacks();
      this.setupUIEventListeners();
      
      // Load saved game state if available
      this.loadSavedGame();
      
      // Check camera support
      this.checkCameraSupport();
      
      // Hide loading screen
      this.hideLoadingScreen();
      
      this.isInitialized = true;
      
      Utils.log('vision-app', 'Vision2048 initialized successfully');
      
    } catch (error) {
      console.error('Vision2048 initialization error:', error);
      if (typeof Utils !== 'undefined' && Utils.handleError) {
        Utils.handleError(error, 'Vision App initialization');
      }
      this.showInitializationError(error);
    }
  }

  /**
   * Initialize game systems
   */
  async initializeGameSystems() {
    try {
      // Initialize game engine (4x4 board only for vision mode)
      this.gameEngine = new GameEngine();
      if (typeof this.gameEngine.setBoardSize === 'function') {
        this.gameEngine.setBoardSize(4); // Fixed 4x4 for vision mode
      }
      
      // Initialize UI controller with vision-specific settings
      this.uiController = new VisionUIController(this.gameEngine);
      
      // Initialize vision handler
      this.visionHandler = new VisionHandler();
      
      console.log('Vision2048: Game systems initialized successfully');
      
      // Small delay to ensure everything is ready
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error('Vision2048: Error initializing game systems:', error);
      throw error;
    }
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
    this.gameEngine.onGameOver((score, moves, timeElapsed) => {
      this.uiController.showGameOver(score, moves, timeElapsed);
    });
    
    // Win callback
    this.gameEngine.onWin((score, moves, timeElapsed) => {
      this.uiController.showVictory(score, moves, timeElapsed);
    });
    
    // Move callback
    this.gameEngine.onMove((direction, successful) => {
      if (successful) {
        this.uiController.animateMove(direction);
      }
    });
  }

  /**
   * Setup vision-specific callbacks
   */
  setupVisionCallbacks() {
    // Gesture detection callback
    this.visionHandler.setGestureCallback((gesture, confidence) => {
      this.handleGesture(gesture, confidence);
    });
    
    // Camera status callback
    this.visionHandler.setCameraStatusCallback((isActive, error) => {
      this.handleCameraStatusChange(isActive, error);
    });
  }

  /**
   * Setup UI event listeners
   */
  setupUIEventListeners() {
    // Camera controls
    const startCameraBtn = document.getElementById('start-camera');
    const stopCameraBtn = document.getElementById('stop-camera');
    
    if (startCameraBtn) {
      startCameraBtn.addEventListener('click', () => this.startCamera());
    }
    
    if (stopCameraBtn) {
      stopCameraBtn.addEventListener('click', () => this.stopCamera());
    }
    
    // Game controls
    const newGameBtn = document.getElementById('new-game');
    const undoBtn = document.getElementById('undo-move');
    const backBtn = document.getElementById('back-button');
    
    if (newGameBtn) {
      newGameBtn.addEventListener('click', () => this.newGame());
    }
    
    if (undoBtn) {
      undoBtn.addEventListener('click', () => this.undoMove());
    }
    
    if (backBtn) {
      backBtn.addEventListener('click', () => this.goBack());
    }
    
    // Theme toggle
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', () => this.toggleTheme());
    }
    
    // Overlay buttons
    const restartBtn = document.getElementById('restart-game');
    const continueBtn = document.getElementById('continue-game');
    const newGameVictoryBtn = document.getElementById('new-game-victory');
    
    if (restartBtn) {
      restartBtn.addEventListener('click', () => this.newGame());
    }
    
    if (continueBtn) {
      continueBtn.addEventListener('click', () => this.continueGame());
    }
    
    if (newGameVictoryBtn) {
      newGameVictoryBtn.addEventListener('click', () => this.newGame());
    }
    
    // Keyboard controls (as backup)
    document.addEventListener('keydown', (e) => this.handleKeyPress(e));
    
    // Window events
    window.addEventListener('beforeunload', () => this.handleBeforeUnload());
    window.addEventListener('resize', Utils.debounce(() => this.handleResize(), 250));
  }

  /**
   * Handle detected gestures
   */
  handleGesture(gesture, confidence) {
    if (!this.gameEngine || this.gameEngine.isGameOver) {
      return;
    }

    Utils.log('vision-app', `Processing gesture: ${gesture} (${confidence.toFixed(2)})`);

    // Map gestures to game moves
    let direction;
    switch (gesture) {
      case 'up':
        direction = 'up';
        break;
      case 'down':
        direction = 'down';
        break;
      case 'left':
        direction = 'left';
        break;
      case 'right':
        direction = 'right';
        break;
      default:
        Utils.log('vision-app', `Unknown gesture: ${gesture}`);
        return;
    }

    // Execute the move
    const success = this.gameEngine.move(direction);
    if (success) {
      // Add visual feedback for successful gesture
      this.showGestureSuccess(gesture);
      
      // Update UI
      this.updateUI();
      
      Utils.log('vision-app', `Move executed: ${direction}`);
    } else {
      Utils.log('vision-app', `Invalid move: ${direction}`);
    }
  }

  /**
   * Show visual feedback for successful gesture
   */
  showGestureSuccess(gesture) {
    const gameContainer = document.querySelector('.game-container');
    if (gameContainer) {
      gameContainer.classList.add('gesture-detected');
      setTimeout(() => {
        gameContainer.classList.remove('gesture-detected');
      }, 300);
    }
  }

  /**
   * Handle camera status changes
   */
  handleCameraStatusChange(isActive, error) {
    Utils.log('vision-app', `Camera status changed: ${isActive ? 'active' : 'inactive'}${error ? ` (${error})` : ''}`);
    
    if (error) {
      this.showCameraError(error);
    }
  }

  /**
   * Show camera error notification
   */
  showCameraError(error) {
    // Create error notification
    let message = 'Camera access error';
    
    if (error.includes('Permission denied')) {
      message = 'Camera permission denied. Please allow camera access and try again.';
    } else if (error.includes('not found')) {
      message = 'No camera found. Please connect a camera and try again.';
    } else if (error.includes('not supported')) {
      message = 'Camera not supported by this browser. Try using Chrome, Firefox, or Safari.';
    }
    
    this.showNotification(message, 'error', 5000);
  }

  /**
   * Start camera
   */
  async startCamera() {
    try {
      const success = await this.visionHandler.startCamera();
      if (success) {
        this.showNotification('Camera started! You can now control the game with hand gestures.', 'success');
      }
    } catch (error) {
      console.error('Failed to start camera:', error);
      Utils.handleError(error, 'Camera start');
    }
  }

  /**
   * Stop camera
   */
  stopCamera() {
    try {
      this.visionHandler.stopCamera();
      this.showNotification('Camera stopped', 'info');
    } catch (error) {
      console.error('Failed to stop camera:', error);
      Utils.handleError(error, 'Camera stop');
    }
  }

  /**
   * Check camera support
   */
  checkCameraSupport() {
    if (!VisionHandler.isCameraSupported()) {
      this.showNotification('Camera not supported by this browser', 'error', 0);
      return;
    }
    
    if (VisionHandler.requiresHTTPS()) {
      this.showNotification('HTTPS required for camera access. Please use https:// or localhost', 'warning', 0);
      return;
    }
  }

  /**
   * Start new game
   */
  newGame() {
    if (this.gameEngine) {
      this.gameEngine.initialize();
      this.updateUI();
      Utils.log('vision-app', 'New game started');
    }
  }

  /**
   * Undo last move
   */
  undoMove() {
    if (this.gameEngine && this.gameEngine.canUndo()) {
      this.gameEngine.undo();
      this.updateUI();
      Utils.log('vision-app', 'Move undone');
    }
  }

  /**
   * Continue game after win
   */
  continueGame() {
    if (this.gameEngine) {
      this.gameEngine.continueAfterWin = true;
      this.uiController.hideVictory();
      Utils.log('vision-app', 'Continuing after win');
    }
  }

  /**
   * Go back to main game
   */
  goBack() {
    window.location.href = './index.html';
  }

  /**
   * Toggle theme
   */
  toggleTheme() {
    if (this.uiController && this.uiController.toggleTheme) {
      this.uiController.toggleTheme();
    } else {
      // Fallback theme toggle
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('fancy2048-theme', newTheme);
    }
  }

  /**
   * Handle keyboard input (backup controls)
   */
  handleKeyPress(event) {
    if (!this.gameEngine || this.gameEngine.isGameOver) return;

    switch (event.key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        event.preventDefault();
        this.gameEngine.move('up');
        this.updateUI();
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        event.preventDefault();
        this.gameEngine.move('down');
        this.updateUI();
        break;
      case 'ArrowLeft':
      case 'a':
      case 'A':
        event.preventDefault();
        this.gameEngine.move('left');
        this.updateUI();
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        event.preventDefault();
        this.gameEngine.move('right');
        this.updateUI();
        break;
      case 'r':
      case 'R':
        event.preventDefault();
        this.newGame();
        break;
      case 'u':
      case 'U':
        event.preventDefault();
        this.undoMove();
        break;
    }
  }

  /**
   * Update UI elements
   */
  updateUI() {
    if (!this.gameEngine || !this.uiController) return;

    // Update score display
    const scoreElement = document.getElementById('current-score');
    const bestElement = document.getElementById('best-score');
    const movesElement = document.getElementById('move-count');

    if (scoreElement) {
      scoreElement.textContent = this.gameEngine.score.toLocaleString();
    }

    if (bestElement) {
      const bestScore = parseInt(localStorage.getItem('fancy2048-best-score') || '0');
      const currentBest = Math.max(bestScore, this.gameEngine.score);
      bestElement.textContent = currentBest.toLocaleString();
      localStorage.setItem('fancy2048-best-score', currentBest.toString());
    }

    if (movesElement) {
      movesElement.textContent = this.gameEngine.moves.toString();
    }

    // Update undo button
    const undoButton = document.getElementById('undo-move');
    if (undoButton) {
      undoButton.disabled = !this.gameEngine.canUndo();
    }

    // Update board through UI controller
    if (this.uiController.updateBoard) {
      this.uiController.updateBoard();
    }
  }

  /**
   * Show notification
   */
  showNotification(message, type = 'info', duration = 3000) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Style the notification
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'error' ? '#f44336' : type === 'success' ? '#4caf50' : type === 'warning' ? '#ff9800' : '#2196f3'};
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      z-index: 10000;
      font-family: var(--font-family-primary);
      font-size: 14px;
      max-width: 300px;
      opacity: 0;
      transform: translateX(100%);
      transition: all 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
      notification.style.opacity = '1';
      notification.style.transform = 'translateX(0)';
    }, 10);
    
    // Auto remove (if duration > 0)
    if (duration > 0) {
      setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
          if (notification.parentElement) {
            notification.remove();
          }
        }, 300);
      }, duration);
    }
  }

  /**
   * Load saved game state
   */
  loadSavedGame() {
    // For vision mode, we'll start fresh each time
    // but we can still load theme and settings
    const savedTheme = localStorage.getItem('fancy2048-theme');
    if (savedTheme) {
      document.documentElement.setAttribute('data-theme', savedTheme);
    }
  }

  /**
   * Handle before unload
   */
  handleBeforeUnload() {
    // Stop camera before leaving
    if (this.visionHandler) {
      this.visionHandler.stopCamera();
    }
  }

  /**
   * Handle window resize
   */
  handleResize() {
    // Update canvas size if camera is active
    if (this.visionHandler && this.visionHandler.isActive) {
      // Canvas will be resized automatically by the vision handler
    }
  }

  /**
   * Show loading screen
   */
  showLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
      loadingScreen.style.display = 'flex';
    }
  }

  /**
   * Hide loading screen
   */
  hideLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
      setTimeout(() => {
        loadingScreen.style.opacity = '0';
        setTimeout(() => {
          loadingScreen.style.display = 'none';
        }, 300);
      }, 500);
    }
  }

  /**
   * Show initialization error
   */
  showInitializationError(error) {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
      const loadingText = loadingScreen.querySelector('.loading-text');
      if (loadingText) {
        loadingText.textContent = `Initialization Error: ${error.message}`;
        loadingText.style.color = '#f44336';
      }
    }
    
    console.error('Vision2048 initialization failed:', error);
  }

  /**
   * Cleanup and destroy
   */
  destroy() {
    // Stop camera
    if (this.visionHandler) {
      this.visionHandler.destroy();
    }
    
    // Clear references
    this.gameEngine = null;
    this.uiController = null;
    this.visionHandler = null;
    
    this.isInitialized = false;
    
    Utils.log('vision-app', 'Vision2048 app destroyed');
  }
}

/**
 * Vision-specific UI Controller
 * Extends the base functionality for vision mode
 */
class VisionUIController extends UIController {
  constructor(gameEngine) {
    super(gameEngine);
    
    // Override some settings for vision mode
    this.disableBoardSizeChange();
  }
  
  /**
   * Disable board size changes in vision mode
   */
  disableBoardSizeChange() {
    const sizeButtons = document.querySelectorAll('.size-button');
    sizeButtons.forEach(button => {
      button.style.display = 'none';
    });
  }
}

// Global event listeners for vision app
document.addEventListener('keydown', (event) => {
  if (window.vision2048App) {
    // Let the app handle keyboard events
  }
});

document.addEventListener('visibilitychange', () => {
  if (window.vision2048App && document.hidden) {
    // Stop camera when page becomes hidden
    if (window.vision2048App.visionHandler) {
      window.vision2048App.visionHandler.stopCamera();
    }
  }
});

window.addEventListener('beforeunload', () => {
  if (window.vision2048App) {
    window.vision2048App.handleBeforeUnload();
  }
});

// Initialize the vision application
const vision2048App = new Vision2048App();

// Make available globally
if (typeof window !== 'undefined') {
  window.Vision2048App = Vision2048App;
  window.VisionUIController = VisionUIController;
  window.vision2048App = vision2048App;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Vision2048App, VisionUIController };
}
