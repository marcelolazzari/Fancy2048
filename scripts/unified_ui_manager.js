/**
 * Unified UI Manager for Fancy2048
 * Manages all UI elements, eliminates duplicate divs, and ensures consistent data display
 * Handles mobile/desktop score containers, timer synchronization, and responsive layouts
 */

class UnifiedUIManager {
  constructor() {
    this.elements = new Map();
    this.observers = new Set();
    this.syncedElements = new Map();
    this.initialized = false;
    
    this.currentValues = {
      score: 0,
      bestScore: 0,
      moves: 0,
      time: '00:00',
      gameMode: 'human',
      gridSize: 4
    };

    this.init();
  }

  /**
   * Initialize UI Manager
   */
  init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setupElements());
    } else {
      this.setupElements();
    }
  }

  /**
   * Setup and cache all UI elements
   */
  setupElements() {
    try {
      // Map all score-related elements
      this.mapScoreElements();
      
      // Map game state elements
      this.mapGameElements();
      
      // Map control elements
      this.mapControlElements();
      
      // Setup responsive handlers
      this.setupResponsiveHandlers();
      
      // Setup observers for dynamic elements
      this.setupObservers();
      
      this.initialized = true;
      console.log('🎨 Unified UI Manager initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize UI Manager:', error);
    }
  }

  /**
   * Map all score-related elements (mobile and desktop)
   */
  mapScoreElements() {
    // Desktop score elements
    this.addSyncedElement('score', [
      'score',           // Desktop score
      'mobile-score'     // Mobile score
    ]);

    this.addSyncedElement('bestScore', [
      'best-score',      // Desktop best score
      'mobile-best-score' // Mobile best score
    ]);

    this.addSyncedElement('moves', [
      'moves',           // Desktop moves
      'mobile-moves'     // Mobile moves
    ]);

    this.addSyncedElement('time', [
      'time',            // Desktop time
      'mobile-time'      // Mobile time
    ]);

    // Score containers
    this.cacheElement('scoreContainer', 'score-container');
    this.cacheElement('mobileScoreContainer', 'mobile-score-container');
  }

  /**
   * Map game-related elements
   */
  mapGameElements() {
    this.cacheElement('boardContainer', 'board-container');
    this.cacheElement('gameOver', 'game-over');
    this.cacheElement('winMessage', 'win-message');
    this.cacheElement('continueButton', 'continue-button');
    this.cacheElement('newGameButton', 'new-game-button');
  }

  /**
   * Map control elements
   */
  mapControlElements() {
    // Navigation buttons
    this.cacheElement('resetButton', 'reset-button');
    this.cacheElement('undoButton', 'undo-button');
    this.cacheElement('changeSizeButton', 'change-size-button');
    this.cacheElement('changeColorButton', 'change-color-button');
    this.cacheElement('aiToggleButton', 'ai-toggle-button');
    this.cacheElement('aiModeButton', 'ai-mode-button');
    this.cacheElement('statsButton', 'stats-button');
    this.cacheElement('themeToggleButton', 'theme-toggle-button');

    // AI controls
    this.cacheElement('aiSpeedRange', 'ai-speed-range');
    this.cacheElement('aiSpeedDisplay', 'ai-speed-display');
  }

  /**
   * Add element to cache
   */
  cacheElement(key, id) {
    const element = document.getElementById(id);
    if (element) {
      this.elements.set(key, element);
    }
    return element;
  }

  /**
   * Add synced element group (elements that should always show same value)
   */
  addSyncedElement(key, elementIds) {
    const elements = elementIds
      .map(id => document.getElementById(id))
      .filter(el => el !== null);
    
    if (elements.length > 0) {
      this.syncedElements.set(key, elements);
    }
  }

  /**
   * Get cached element
   */
  getElement(key) {
    return this.elements.get(key);
  }

  /**
   * Get all synced elements for a key
   */
  getSyncedElements(key) {
    return this.syncedElements.get(key) || [];
  }

  // ===========================================
  // UNIFIED UPDATE METHODS
  // ===========================================

  /**
   * Update score across all containers
   */
  updateScore(newScore, animate = true) {
    if (newScore === this.currentValues.score) return;
    
    const oldScore = this.currentValues.score;
    this.currentValues.score = newScore;
    
    const elements = this.getSyncedElements('score');
    elements.forEach(element => {
      if (animate && oldScore !== newScore) {
        this.animateNumberChange(element, oldScore, newScore);
      } else {
        element.textContent = this.formatNumber(newScore);
      }
    });

    this.notifyObservers('score', newScore, oldScore);
  }

  /**
   * Update best score across all containers
   */
  updateBestScore(newBestScore, animate = true) {
    if (newBestScore === this.currentValues.bestScore) return;
    
    const oldBestScore = this.currentValues.bestScore;
    this.currentValues.bestScore = newBestScore;
    
    const elements = this.getSyncedElements('bestScore');
    elements.forEach(element => {
      if (animate && oldBestScore !== newBestScore) {
        this.animateNumberChange(element, oldBestScore, newBestScore);
        // Highlight new best score
        this.highlightNewBest(element);
      } else {
        element.textContent = this.formatNumber(newBestScore);
      }
    });

    this.notifyObservers('bestScore', newBestScore, oldBestScore);
  }

  /**
   * Update moves counter across all containers
   */
  updateMoves(newMoves) {
    if (newMoves === this.currentValues.moves) return;
    
    const oldMoves = this.currentValues.moves;
    this.currentValues.moves = newMoves;
    
    const elements = this.getSyncedElements('moves');
    elements.forEach(element => {
      element.textContent = newMoves.toString();
    });

    this.notifyObservers('moves', newMoves, oldMoves);
  }

  /**
   * Update timer across all containers
   */
  updateTime(newTime) {
    if (newTime === this.currentValues.time) return;
    
    const oldTime = this.currentValues.time;
    this.currentValues.time = newTime;
    
    const elements = this.getSyncedElements('time');
    elements.forEach(element => {
      element.textContent = newTime;
    });

    this.notifyObservers('time', newTime, oldTime);
  }

  /**
   * Update all stats at once
   */
  updateAllStats(stats) {
    const { score, bestScore, moves, time } = stats;
    
    if (score !== undefined) this.updateScore(score, false);
    if (bestScore !== undefined) this.updateBestScore(bestScore, false);
    if (moves !== undefined) this.updateMoves(moves);
    if (time !== undefined) this.updateTime(time);
  }

  // ===========================================
  // ANIMATION METHODS
  // ===========================================

  /**
   * Animate number change with smooth counting effect
   */
  animateNumberChange(element, from, to, duration = 500) {
    if (!element || from === to) return;

    const startTime = performance.now();
    const difference = to - from;
    
    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Use easing function for smooth animation
      const easeProgress = this.easeOutCubic(progress);
      const currentValue = Math.round(from + difference * easeProgress);
      
      element.textContent = this.formatNumber(currentValue);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        element.textContent = this.formatNumber(to);
      }
    };
    
    requestAnimationFrame(animate);
  }

  /**
   * Highlight new best score with special effect
   */
  highlightNewBest(element) {
    if (!element) return;

    // Add highlight class
    element.classList.add('new-best-score');
    
    // Add glow effect
    element.style.transition = 'all 0.3s ease';
    element.style.textShadow = '0 0 10px currentColor';
    element.style.transform = 'scale(1.1)';
    
    // Remove effects after animation
    setTimeout(() => {
      element.style.textShadow = '';
      element.style.transform = '';
      element.classList.remove('new-best-score');
    }, 1500);
  }

  /**
   * Animate element appearance
   */
  animateElementIn(element, animationType = 'fadeIn') {
    if (!element) return;

    element.style.opacity = '0';
    element.style.transform = 'translateY(20px)';
    
    requestAnimationFrame(() => {
      element.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      element.style.opacity = '1';
      element.style.transform = 'translateY(0)';
    });
  }

  // ===========================================
  // RESPONSIVE LAYOUT MANAGEMENT
  // ===========================================

  /**
   * Setup responsive handlers
   */
  setupResponsiveHandlers() {
    // Watch for screen size changes
    const mediaQuery = window.matchMedia('(min-width: 769px)');
    mediaQuery.addEventListener('change', (e) => {
      this.handleLayoutChange(e.matches);
    });
    
    // Initial layout setup
    this.handleLayoutChange(mediaQuery.matches);

    // Watch for orientation changes
    window.addEventListener('orientationchange', () => {
      setTimeout(() => this.handleOrientationChange(), 150);
    });

    // Resize handler with debouncing
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => this.handleResize(), 150);
    });
  }

  /**
   * Handle desktop vs mobile layout changes
   */
  handleLayoutChange(isDesktop) {
    const mobileContainer = this.getElement('mobileScoreContainer');
    const desktopContainer = this.getElement('scoreContainer');
    
    if (isDesktop) {
      // Desktop layout
      if (mobileContainer) mobileContainer.style.display = 'none';
      if (desktopContainer) desktopContainer.style.display = 'block';
    } else {
      // Mobile layout
      if (mobileContainer) mobileContainer.style.display = 'block';
      if (desktopContainer) desktopContainer.style.display = 'none';
    }

    this.notifyObservers('layout', isDesktop ? 'desktop' : 'mobile');
  }

  /**
   * Handle orientation changes
   */
  handleOrientationChange() {
    // Force layout recalculation
    const boardContainer = this.getElement('boardContainer');
    if (boardContainer) {
      boardContainer.style.height = 'auto';
      requestAnimationFrame(() => {
        boardContainer.style.height = '';
      });
    }
    
    this.notifyObservers('orientation', screen.orientation?.angle || 0);
  }

  /**
   * Handle window resize
   */
  handleResize() {
    // Update viewport height for mobile browsers
    document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
    
    this.notifyObservers('resize', {
      width: window.innerWidth,
      height: window.innerHeight
    });
  }

  // ===========================================
  // GAME STATE VISUAL MANAGEMENT
  // ===========================================

  /**
   * Show game over state
   */
  showGameOver(message = 'Game Over!', actions = []) {
    const gameOverElement = this.getElement('gameOver');
    if (gameOverElement) {
      gameOverElement.textContent = message;
      gameOverElement.classList.remove('hidden');
      this.animateElementIn(gameOverElement);
    }

    this.notifyObservers('gameState', 'gameOver');
  }

  /**
   * Hide game over state
   */
  hideGameOver() {
    const gameOverElement = this.getElement('gameOver');
    if (gameOverElement) {
      gameOverElement.classList.add('hidden');
    }

    this.notifyObservers('gameState', 'playing');
  }

  /**
   * Show win message
   */
  showWinMessage(canContinue = true) {
    const winElement = this.getElement('winMessage');
    if (winElement) {
      winElement.classList.remove('hidden');
      this.animateElementIn(winElement);
    }

    this.notifyObservers('gameState', 'won');
  }

  /**
   * Hide win message
   */
  hideWinMessage() {
    const winElement = this.getElement('winMessage');
    if (winElement) {
      winElement.classList.add('hidden');
    }
  }

  /**
   * Update AI mode display
   */
  updateAIMode(mode, isActive = false) {
    const aiButton = this.getElement('aiModeButton');
    if (aiButton) {
      aiButton.textContent = `AI: ${mode}`;
      aiButton.classList.toggle('active', isActive);
    }

    this.notifyObservers('aiMode', { mode, isActive });
  }

  /**
   * Update grid size display
   */
  updateGridSize(size) {
    if (size === this.currentValues.gridSize) return;
    
    this.currentValues.gridSize = size;
    
    const sizeButton = this.getElement('changeSizeButton');
    if (sizeButton) {
      sizeButton.textContent = `${size}×${size}`;
    }

    // Update board container class
    const boardContainer = this.getElement('boardContainer');
    if (boardContainer) {
      // Remove old size classes
      boardContainer.className = boardContainer.className.replace(/board-size-\d+/g, '');
      // Add new size class
      boardContainer.classList.add(`board-size-${size}`);
    }

    this.notifyObservers('gridSize', size);
  }

  // ===========================================
  // UTILITY METHODS
  // ===========================================

  /**
   * Format number for display
   */
  formatNumber(num) {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    } else {
      return num.toString();
    }
  }

  /**
   * Format time for display
   */
  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Easing function for animations
   */
  easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  // ===========================================
  // OBSERVER PATTERN
  // ===========================================

  /**
   * Subscribe to UI changes
   */
  subscribe(callback) {
    this.observers.add(callback);
    return () => this.observers.delete(callback);
  }

  /**
   * Notify all observers of UI changes
   */
  notifyObservers(event, value, oldValue = null) {
    this.observers.forEach(observer => {
      try {
        observer({ event, value, oldValue, timestamp: Date.now() });
      } catch (error) {
        console.error('❌ Error in UI observer:', error);
      }
    });
  }

  /**
   * Setup mutation observers for dynamic content
   */
  setupObservers() {
    // Watch for dynamically added elements
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        if (mutation.type === 'childList') {
          // Re-cache elements if new ones are added
          this.recheckElements();
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  /**
   * Recheck for new elements after DOM changes
   */
  recheckElements() {
    // Re-setup elements that might have been added dynamically
    this.mapScoreElements();
    this.mapGameElements();
    this.mapControlElements();
  }

  // ===========================================
  // CLEANUP METHODS
  // ===========================================

  /**
   * Clean up resources
   */
  destroy() {
    this.elements.clear();
    this.syncedElements.clear();
    this.observers.clear();
    this.initialized = false;
  }

  /**
   * Reset all displays
   */
  reset() {
    this.updateAllStats({
      score: 0,
      bestScore: this.currentValues.bestScore,
      moves: 0,
      time: '00:00'
    });
    
    this.hideGameOver();
    this.hideWinMessage();
  }
}

// Create global instance
const unifiedUIManager = new UnifiedUIManager();

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = UnifiedUIManager;
}

// Make available globally
window.UnifiedUIManager = UnifiedUIManager;
window.unifiedUIManager = unifiedUIManager;

console.log('🎨 Unified UI Manager loaded successfully');
