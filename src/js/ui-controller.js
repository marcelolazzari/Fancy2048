/**
 * Fancy2048 - UI Controller
 * Manages all user interface interactions and updates
 */

class UIController {
  constructor(gameEngine) {
    this.gameEngine = gameEngine;
    this.currentTheme = 'auto';
    this.animations = true;
    this.soundEnabled = true;
    
    // DOM elements cache
    this.elements = {};
    
    // Animation queue for smooth updates
    this.animationQueue = [];
    this.isAnimating = false;
    
    this.initialize();
  }

  /**
   * Initialize UI controller
   */
  initialize() {
    this.cacheElements();
    this.setupEventListeners();
    this.setupTheme();
    this.updateDisplay();
    
    Utils.log('ui', 'UI Controller initialized');
  }

  /**
   * Cache frequently used DOM elements
   */
  cacheElements() {
    this.elements = {
      gameBoard: document.getElementById('game-board'),
      currentScore: document.getElementById('current-score'),
      bestScore: document.getElementById('best-score'),
      moveCount: document.getElementById('move-count'),
      newGameButton: document.getElementById('new-game'),
      undoButton: document.getElementById('undo-move'),
      themeToggle: document.getElementById('theme-toggle'),
      statsButton: document.getElementById('stats-button'),
      settingsButton: document.getElementById('settings-button'),
      gameOverOverlay: document.getElementById('game-over-overlay'),
      victoryOverlay: document.getElementById('victory-overlay'),
      finalScore: document.getElementById('final-score'),
      restartButton: document.getElementById('restart-game'),
      continueButton: document.getElementById('continue-game'),
      newGameVictoryButton: document.getElementById('new-game-victory'),
      loadingScreen: document.getElementById('loading-screen'),
      aiHintButton: document.getElementById('ai-hint'),
      aiAutoButton: document.getElementById('ai-auto'),
      aiDifficultySelect: document.getElementById('ai-difficulty')
    };

    // Cache size buttons
    this.elements.sizeButtons = document.querySelectorAll('.size-button');
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Game controls
    if (this.elements.newGameButton) {
      this.elements.newGameButton.addEventListener('click', () => this.newGame());
    }
    
    if (this.elements.undoButton) {
      this.elements.undoButton.addEventListener('click', () => this.undoMove());
    }
    
    // Theme toggle
    if (this.elements.themeToggle) {
      this.elements.themeToggle.addEventListener('click', () => this.toggleTheme());
    }
    
    // Navigation buttons
    if (this.elements.statsButton) {
      this.elements.statsButton.addEventListener('click', () => this.showStats());
    }
    
    if (this.elements.settingsButton) {
      this.elements.settingsButton.addEventListener('click', () => this.showSettings());
    }
    
    // Game over/victory overlays
    if (this.elements.restartButton) {
      this.elements.restartButton.addEventListener('click', () => this.newGame());
    }
    
    if (this.elements.continueButton) {
      this.elements.continueButton.addEventListener('click', () => this.continueGame());
    }
    
    if (this.elements.newGameVictoryButton) {
      this.elements.newGameVictoryButton.addEventListener('click', () => this.newGame());
    }
    
    // Board size selection
    this.elements.sizeButtons.forEach(button => {
      button.addEventListener('click', (e) => this.changeBoardSize(parseInt(e.target.dataset.size)));
    });
    
    // AI controls
    if (this.elements.aiHintButton) {
      this.elements.aiHintButton.addEventListener('click', () => this.getAIHint());
    }
    
    if (this.elements.aiAutoButton) {
      this.elements.aiAutoButton.addEventListener('click', () => this.toggleAutoPlay());
    }
    
    if (this.elements.aiDifficultySelect) {
      this.elements.aiDifficultySelect.addEventListener('change', (e) => this.setAIDifficulty(e.target.value));
    }
    
    // Keyboard controls
    document.addEventListener('keydown', (e) => this.handleKeyPress(e));
    
    // Window events
    window.addEventListener('beforeunload', () => this.saveGameState());
    window.addEventListener('resize', Utils.debounce(() => this.handleResize(), 250));
    
    // Focus management
    document.addEventListener('focusin', (e) => this.handleFocusIn(e));
  }

  /**
   * Setup theme system
   */
  setupTheme() {
    const savedTheme = Storage.getSettings().theme || 'auto';
    this.setTheme(savedTheme);
  }

  /**
   * Set theme
   */
  setTheme(theme) {
    this.currentTheme = theme;
    
    // Remove existing theme classes
    document.body.classList.remove('light-theme', 'dark-theme');
    
    if (theme === 'light') {
      document.body.classList.add('light-theme');
      document.documentElement.setAttribute('data-theme', 'light');
    } else if (theme === 'dark') {
      document.body.classList.add('dark-theme');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      // Auto theme - use system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    }
    
    // Update theme toggle icon
    this.updateThemeToggleIcon();
    
    // Save preference
    Storage.updateSetting('theme', theme);
    
    Utils.log('ui', `Theme changed to: ${theme}`);
  }

  /**
   * Toggle theme
   */
  toggleTheme() {
    const themes = ['auto', 'light', 'dark'];
    const currentIndex = themes.indexOf(this.currentTheme);
    const nextTheme = themes[(currentIndex + 1) % themes.length];
    this.setTheme(nextTheme);
  }

  /**
   * Update theme toggle icon
   */
  updateThemeToggleIcon() {
    if (!this.elements.themeToggle) return;
    
    const icons = {
      auto: '🌗',
      light: '☀️',
      dark: '🌙'
    };
    
    const iconElement = this.elements.themeToggle.querySelector('.icon');
    if (iconElement) {
      iconElement.textContent = icons[this.currentTheme] || icons.auto;
    }
  }

  /**
   * Update game display
   */
  updateDisplay() {
    this.updateScore();
    this.updateBoard();
    this.updateControls();
  }

  /**
   * Update score display
   */
  updateScore() {
    if (this.elements.currentScore) {
      this.elements.currentScore.textContent = Utils.formatNumber(this.gameEngine.score);
    }
    
    if (this.elements.bestScore) {
      const bestScore = Storage.getStatistics().bestScore;
      this.elements.bestScore.textContent = Utils.formatNumber(bestScore);
    }
    
    if (this.elements.moveCount) {
      this.elements.moveCount.textContent = this.gameEngine.moves.toString();
    }
  }

  /**
   * Update board display
   */
  updateBoard() {
    if (!this.elements.gameBoard) return;
    
    const board = this.gameEngine.board;
    const size = this.gameEngine.size;
    
    // Update CSS grid template
    this.elements.gameBoard.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
    this.elements.gameBoard.style.gridTemplateRows = `repeat(${size}, 1fr)`;
    this.elements.gameBoard.className = `game-board board-size-${size}`;
    
    // Clear existing tiles
    this.elements.gameBoard.innerHTML = '';
    
    // Create tile placeholders first
    for (let i = 0; i < size * size; i++) {
      const placeholder = document.createElement('div');
      placeholder.className = 'tile-placeholder';
      this.elements.gameBoard.appendChild(placeholder);
    }
    
    // Create tiles
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        const value = board[row][col];
        if (value > 0) {
          this.createTile(value, row, col, size);
        }
      }
    }
  }

  /**
   * Create tile element
   */
  createTile(value, row, col, size) {
    const tile = document.createElement('div');
    tile.className = 'tile';
    tile.setAttribute('data-value', value);
    tile.textContent = Utils.formatNumber(value);
    
    // Position tile
    tile.style.gridRow = row + 1;
    tile.style.gridColumn = col + 1;
    
    // Add animation class for new tiles
    if (this.animations) {
      tile.classList.add('new-tile');
    }
    
    // Calculate font size based on value
    this.updateTileFont(tile, value);
    
    this.elements.gameBoard.appendChild(tile);
  }

  /**
   * Update tile font size based on value
   */
  updateTileFont(tile, value) {
    const digits = value.toString().length;
    let fontSize = '1.5em';
    
    if (digits <= 2) {
      fontSize = '1.8em';
    } else if (digits <= 3) {
      fontSize = '1.5em';
    } else if (digits <= 4) {
      fontSize = '1.2em';
    } else if (digits <= 5) {
      fontSize = '1em';
    } else {
      fontSize = '0.8em';
    }
    
    tile.style.fontSize = fontSize;
  }

  /**
   * Update control states
   */
  updateControls() {
    // Update undo button state
    if (this.elements.undoButton) {
      this.elements.undoButton.disabled = !this.gameEngine.canUndo();
    }
    
    // Update board size buttons
    this.elements.sizeButtons.forEach(button => {
      const size = parseInt(button.dataset.size);
      button.classList.toggle('active', size === this.gameEngine.size);
    });
  }

  /**
   * Show game over overlay
   */
  showGameOver(result) {
    if (!this.elements.gameOverOverlay || !this.elements.finalScore) return;
    
    this.elements.finalScore.textContent = Utils.formatNumber(result.score);
    this.elements.gameOverOverlay.classList.remove('hidden');
    
    // Save game result
    Storage.saveGameResult(result);
    
    // Play sound effect
    this.playSound('gameOver');
    
    // Haptic feedback
    Utils.vibrate([100, 50, 100]);
    
    Utils.log('ui', 'Game over displayed', result);
  }

  /**
   * Show victory overlay
   */
  showVictory(result) {
    if (!this.elements.victoryOverlay) return;
    
    this.elements.victoryOverlay.classList.remove('hidden');
    
    // Save game result
    Storage.saveGameResult(result);
    
    // Play victory sound
    this.playSound('victory');
    
    // Haptic feedback
    Utils.vibrate([50, 50, 50, 50, 100]);
    
    Utils.log('ui', 'Victory displayed', result);
  }

  /**
   * Hide overlays
   */
  hideOverlays() {
    if (this.elements.gameOverOverlay) {
      this.elements.gameOverOverlay.classList.add('hidden');
    }
    
    if (this.elements.victoryOverlay) {
      this.elements.victoryOverlay.classList.add('hidden');
    }
  }

  /**
   * New game
   */
  newGame() {
    this.gameEngine.newGame();
    this.hideOverlays();
    this.updateDisplay();
    
    // Play sound
    this.playSound('newGame');
    
    // Haptic feedback
    Utils.vibrate(30);
    
    Utils.log('ui', 'New game started');
  }

  /**
   * Undo move
   */
  undoMove() {
    if (this.gameEngine.undo()) {
      this.updateDisplay();
      
      // Play sound
      this.playSound('undo');
      
      // Haptic feedback
      Utils.vibrate(20);
      
      Utils.log('ui', 'Move undone');
    }
  }

  /**
   * Continue game after victory
   */
  continueGame() {
    this.gameEngine.continueGame();
    this.hideOverlays();
    
    Utils.log('ui', 'Game continued after victory');
  }

  /**
   * Change board size
   */
  changeBoardSize(size) {
    if (size === this.gameEngine.size) return;
    
    this.gameEngine.setBoardSize(size);
    this.updateDisplay();
    
    // Save preference
    Storage.updateSetting('boardSize', size);
    
    // Play sound
    this.playSound('sizeChange');
    
    Utils.log('ui', `Board size changed to: ${size}x${size}`);
  }

  /**
   * Get AI hint
   */
  async getAIHint() {
    if (!window.AISolver) {
      this.showNotification('AI solver not available', 'error');
      return;
    }
    
    try {
      this.elements.aiHintButton.disabled = true;
      this.elements.aiHintButton.textContent = 'Thinking...';
      
      const ai = new AISolver(this.gameEngine);
      const hint = await ai.getHint();
      
      if (hint) {
        this.showHintAnimation(hint);
        this.showNotification(`AI suggests: ${hint.toUpperCase()}`, 'success');
      } else {
        this.showNotification('No moves available', 'warning');
      }
    } catch (error) {
      Utils.handleError(error, 'getAIHint');
      this.showNotification('Error getting AI hint', 'error');
    } finally {
      this.elements.aiHintButton.disabled = false;
      this.elements.aiHintButton.textContent = 'Get Hint';
    }
  }

  /**
   * Toggle auto play
   */
  toggleAutoPlay() {
    // This would be implemented with the AI auto-play system
    const isActive = this.elements.aiAutoButton.classList.contains('active');
    this.elements.aiAutoButton.classList.toggle('active');
    
    if (isActive) {
      this.showNotification('Auto-play disabled', 'info');
    } else {
      this.showNotification('Auto-play enabled', 'info');
    }
    
    Utils.log('ui', `Auto-play ${isActive ? 'disabled' : 'enabled'}`);
  }

  /**
   * Set AI difficulty
   */
  setAIDifficulty(difficulty) {
    Storage.updateSetting('aiDifficulty', difficulty);
    this.showNotification(`AI difficulty: ${difficulty}`, 'info');
    
    Utils.log('ui', `AI difficulty set to: ${difficulty}`);
  }

  /**
   * Show hint animation
   */
  showHintAnimation(direction) {
    const arrows = {
      up: '↑',
      down: '↓',
      left: '←',
      right: '→'
    };
    
    const hint = document.createElement('div');
    hint.className = 'ai-hint';
    hint.textContent = arrows[direction] || '?';
    hint.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 4em;
      color: var(--secondary-color);
      font-weight: bold;
      pointer-events: none;
      z-index: 1000;
      animation: hintPulse 2s ease-out;
    `;
    
    document.body.appendChild(hint);
    
    setTimeout(() => {
      if (hint.parentNode) {
        hint.parentNode.removeChild(hint);
      }
    }, 2000);
  }

  /**
   * Handle keyboard input
   */
  handleKeyPress(event) {
    // Prevent default for arrow keys to avoid page scrolling
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
      event.preventDefault();
    }
    
    // Don't handle keyboard events if overlays are shown or input is focused
    if (!this.elements.gameOverOverlay?.classList.contains('hidden') ||
        !this.elements.victoryOverlay?.classList.contains('hidden') ||
        document.activeElement.tagName === 'INPUT' ||
        document.activeElement.tagName === 'SELECT') {
      return;
    }
    
    const keyMappings = {
      ArrowUp: 'up',
      ArrowDown: 'down',
      ArrowLeft: 'left',
      ArrowRight: 'right',
      KeyW: 'up',
      KeyS: 'down',
      KeyA: 'left',
      KeyD: 'right'
    };
    
    const direction = keyMappings[event.code];
    if (direction) {
      this.gameEngine.move(direction);
    }
    
    // Other shortcuts
    switch (event.code) {
      case 'KeyN':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          this.newGame();
        }
        break;
      case 'KeyZ':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          this.undoMove();
        }
        break;
      case 'KeyT':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          this.toggleTheme();
        }
        break;
    }
  }

  /**
   * Handle window resize
   */
  handleResize() {
    // Update board size if needed
    this.updateBoard();
    
    // Update any responsive elements
    Utils.log('ui', 'Window resized, UI updated');
  }

  /**
   * Handle focus events for accessibility
   */
  handleFocusIn(event) {
    // Add visual focus indicators if needed
    if (event.target.matches('button, select, [tabindex]')) {
      event.target.classList.add('keyboard-focus');
      
      // Remove on blur
      event.target.addEventListener('blur', () => {
        event.target.classList.remove('keyboard-focus');
      }, { once: true });
    }
  }

  /**
   * Show notification
   */
  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: var(--surface-color);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 12px 16px;
      box-shadow: 0 4px 8px var(--shadow-color);
      z-index: 1000;
      animation: slideIn 0.3s ease;
    `;
    
    // Color based on type
    const colors = {
      success: '#4caf50',
      error: '#f44336',
      warning: '#ff9800',
      info: '#2196f3'
    };
    
    if (colors[type]) {
      notification.style.borderLeftColor = colors[type];
      notification.style.borderLeftWidth = '4px';
    }
    
    document.body.appendChild(notification);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 300);
      }
    }, 3000);
  }

  /**
   * Show statistics page
   */
  showStats() {
    window.location.href = './stats.html';
  }

  /**
   * Show settings (could be modal or separate page)
   */
  showSettings() {
    // For now, just show notification
    this.showNotification('Settings coming soon!', 'info');
  }

  /**
   * Play sound effect
   */
  playSound(soundType) {
    if (!this.soundEnabled) return;
    
    // Web Audio API implementation would go here
    // For now, we'll just use a simple beep
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      const frequencies = {
        move: 200,
        merge: 300,
        newGame: 400,
        gameOver: 150,
        victory: 500,
        undo: 250,
        sizeChange: 350
      };
      
      oscillator.frequency.value = frequencies[soundType] || 200;
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (error) {
      // Audio not supported or blocked
    }
  }

  /**
   * Save current game state
   */
  saveGameState() {
    const gameState = this.gameEngine.getGameState();
    Storage.saveGameState(gameState);
    
    Utils.log('ui', 'Game state saved');
  }

  /**
   * Load game state
   */
  loadGameState() {
    const gameState = Storage.loadGameState();
    if (gameState && gameState.board) {
      this.gameEngine.loadGameState(gameState);
      this.updateDisplay();
      
      Utils.log('ui', 'Game state loaded');
      return true;
    }
    
    return false;
  }

  /**
   * Hide loading screen
   */
  hideLoadingScreen() {
    if (this.elements.loadingScreen) {
      this.elements.loadingScreen.classList.add('hidden');
      
      setTimeout(() => {
        if (this.elements.loadingScreen.parentNode) {
          this.elements.loadingScreen.parentNode.removeChild(this.elements.loadingScreen);
        }
      }, 500);
    }
  }

  /**
   * Get UI controller statistics
   */
  getStats() {
    return {
      theme: this.currentTheme,
      animations: this.animations,
      soundEnabled: this.soundEnabled,
      boardSize: this.gameEngine.size
    };
  }
}

// Add CSS for UI animations
const uiStyles = `
  @keyframes hintPulse {
    0% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
    20% { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
    80% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
    100% { transform: translate(-50%, -50%) scale(1); opacity: 0; }
  }
  
  .keyboard-focus {
    outline: 2px solid var(--secondary-color);
    outline-offset: 2px;
  }
  
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = uiStyles;
  document.head.appendChild(styleSheet);
}

// Make UIController available globally
if (typeof window !== 'undefined') {
  window.UIController = UIController;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = UIController;
}
