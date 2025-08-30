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
    this.pageVisibilityTimeout = null;
    this.mobileHiddenMessageTimeout = null;
 
    // Autoplay properties
    this.isAutoPlaying = false;
    this.autoPlayInterval = null;
    this.autoPlaySpeed = 800; // milliseconds between moves
    this.speedMultipliers = [1, 1.5, 2, 4, 8]; // Speed options including x8
    this.currentSpeedIndex = 0; // Current speed index
    this.isAutoPlayedGame = false; // Track if current game used autoplay
    this.hasHumanMoves = false; // Track if current game has human moves
 
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
    
    // Add message handler for test interface
    this.setupMessageHandler();
  }

  refreshLayout() {
    // Update CSS variables for responsive layout
    document.documentElement.style.setProperty('--size', this.size);
     
    // Add board size class to body for CSS targeting
    document.body.className = document.body.className.replace(/board-size-\d+/g, '');
    document.body.classList.add(`board-size-${this.size}`);
     
    // Recalculate board container dimensions
    this.setupBoardContainer(); // Crucial call to setup the board container
     
    // Clear and redraw the board
    this.updateUI();
     
    // Ensure proper font sizing after layout change
    setTimeout(() => this.updateTileFontSizes(), 100);
  }
}