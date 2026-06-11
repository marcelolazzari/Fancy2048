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

    // Snapshot of the previous board, used to animate only changed tiles
    this.previousBoard = null;

    this.initialize();
  }

  /**
   * Initialize UI controller
   */
  initialize() {
    this.cacheElements();
    this.setupEventListeners();
    this.setupTheme();
    this.applySavedTileHue();
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
      speedButton: document.getElementById('ai-speed'),
      aiDifficultySelect: document.getElementById('ai-difficulty'),
      settingsOverlay: document.getElementById('settings-overlay'),
      settingsClose: document.getElementById('settings-close'),
      tileHueSlider: document.getElementById('tile-hue-slider'),
      tileHueValue: document.getElementById('tile-hue-value'),
      tileHuePreview: document.getElementById('tile-hue-preview')
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
    
    if (this.elements.speedButton) {
      this.elements.speedButton.addEventListener('click', () => this.cycleSpeed());
    }
    
    if (this.elements.aiDifficultySelect) {
      this.elements.aiDifficultySelect.addEventListener('change', (e) => this.setAIDifficulty(e.target.value));
    }

    // Settings panel (tile-hue picker)
    if (this.elements.settingsClose) {
      this.elements.settingsClose.addEventListener('click', () => this.hideSettings());
    }
    if (this.elements.settingsOverlay) {
      // Click on the dimmed backdrop (outside the panel) closes the dialog
      this.elements.settingsOverlay.addEventListener('click', (e) => {
        if (e.target === this.elements.settingsOverlay) this.hideSettings();
      });
    }
    if (this.elements.tileHueSlider) {
      this.elements.tileHueSlider.addEventListener('input', (e) => this.onTileHueInput(e.target.value));
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

    const gameBoard = this.elements.gameBoard;
    const board = this.gameEngine.board;
    const size = this.gameEngine.size;
    const prev = this.previousBoard;
    const sameAsPrev = !!prev && prev.length === size;

    // Drive grid layout and cell-relative font sizing from the board size
    gameBoard.style.setProperty('--size', size);
    gameBoard.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
    gameBoard.style.gridTemplateRows = `repeat(${size}, 1fr)`;
    gameBoard.className = `game-board board-size-${size}`;

    // Rebuild the static background cells only when the board size changes.
    // On a normal move we keep them in place and swap just the tiles, so the
    // whole grid isn't torn down every move (a source of flicker on mobile).
    const placeholders = gameBoard.querySelectorAll('.tile-placeholder');
    if (placeholders.length !== size * size) {
      gameBoard.innerHTML = '';
      const fragment = document.createDocumentFragment();
      for (let i = 0; i < size * size; i++) {
        const placeholder = document.createElement('div');
        placeholder.className = 'tile-placeholder';
        fragment.appendChild(placeholder);
      }
      gameBoard.appendChild(fragment);
    } else {
      gameBoard.querySelectorAll('.tile').forEach(tile => tile.remove());
    }

    // Create tiles, animating only what changed since the previous render
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        const value = board[row][col];
        if (value <= 0) continue;

        let animation = null;
        if (this.animations) {
          if (!sameAsPrev) {
            // Fresh board (new game / size change / load): gently appear
            animation = 'new';
          } else if (prev[row][col] > 0 && value > prev[row][col]) {
            // A tile grew here -> a merge happened: pop it
            animation = 'merged';
          }
        }

        this.createTile(value, row, col, animation);
      }
    }

    // Remember this board so the next render can diff against it
    this.previousBoard = board.map(rowArr => [...rowArr]);
  }

  /**
   * Create tile element. `animation` is one of 'new', 'merged' or null.
   */
  createTile(value, row, col, animation = null) {
    const tile = document.createElement('div');
    tile.className = 'tile';
    tile.setAttribute('data-value', value);
    tile.textContent = Utils.formatNumber(value);

    // Position the tile within the CSS grid (1-based lines)
    tile.style.gridRow = row + 1;
    tile.style.gridColumn = col + 1;

    if (animation === 'new') {
      tile.classList.add('new-tile');
    } else if (animation === 'merged') {
      tile.classList.add('merged-tile');
    }

    this.elements.gameBoard.appendChild(tile);
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
   * Show victory overlay. In AI auto mode (`options.ai`) the overlay asks
   * whether the AI should keep playing; persistence is deferred to game over to
   * avoid double-counting, and the message is tailored to the AI.
   */
  showVictory(result, options = {}) {
    if (!this.elements.victoryOverlay) return;

    const message = this.elements.victoryOverlay.querySelector('.overlay-message');
    const continueBtn = this.elements.continueButton;
    if (options.ai) {
      if (message) message.textContent = 'The AI reached 2048! Keep playing for a higher tile?';
      if (continueBtn) continueBtn.textContent = 'Keep AI Playing';
    } else {
      if (message) message.textContent = 'You reached 2048!';
      if (continueBtn) continueBtn.textContent = 'Keep Playing';
      // Human win: record it now (AI wins are saved when the game ends).
      Storage.saveGameResult(result);
    }

    this.elements.victoryOverlay.classList.remove('hidden');

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
    // A fresh game should never keep the AI playing the previous one
    if (window.fancy2048App) window.fancy2048App.stopAutoPlay();
    this.gameEngine.newGame();
    // Apply the AI's learned weights for the new game
    if (window.fancy2048App) window.fancy2048App.prepareLearningForGame();
    this.hideOverlays();
    // Start from a clean slate so the opening tiles animate in
    this.previousBoard = null;
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

    // If the AI hit 2048 and the player chose to keep playing, resume auto-play
    // from the current board.
    const app = window.fancy2048App;
    if (app && app.pendingAiWin) {
      app.resumeAfterAiWin();
    }

    Utils.log('ui', 'Game continued after victory');
  }

  /**
   * Change board size
   */
  changeBoardSize(size) {
    if (size === this.gameEngine.size) return;

    // Changing the board mid auto-play would leave it running on a new grid
    if (window.fancy2048App) window.fancy2048App.stopAutoPlay();
    this.gameEngine.setBoardSize(size);
    // Load the learned weights for the new board size
    if (window.fancy2048App) window.fancy2048App.prepareLearningForGame();
    // Board dimensions changed; avoid diffing against the old size
    this.previousBoard = null;
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
    // The app owns auto-play state; the UI just delegates and reports.
    const app = window.fancy2048App;
    if (!app) {
      this.showNotification('Auto-play system not available', 'error');
      return;
    }
    if (!app.aiSolver) {
      this.showNotification('AI solver not available', 'error');
      return;
    }

    if (app.autoPlayActive) {
      app.stopAutoPlay();
      this.showNotification('Auto-play stopped', 'info', 1200);
      return;
    }

    if (app.gameEngine && app.gameEngine.isGameOver) {
      this.showNotification('Cannot start auto-play - game is over', 'error');
      return;
    }

    const started = app.startAutoPlay();
    this.showNotification(
      started ? `Auto-play running (${app.autoPlaySpeedLabel})` : 'Cannot start auto-play',
      started ? 'success' : 'error',
      1200
    );
    Utils.log('ui', `Auto-play ${app.autoPlayActive ? 'enabled' : 'disabled'}`);
  }

  /**
   * Cycle autoplay speed
   */
  cycleSpeed() {
    const app = window.fancy2048App;
    if (!app) return;

    const label = app.cycleAutoPlaySpeed();
    this.showNotification(`Speed: ${label}`, 'info', 1000);
  }

  /**
   * Set AI difficulty
   */
  setAIDifficulty(difficulty) {
    // Update storage setting
    Storage.updateSetting('aiDifficulty', difficulty);
    
    // Apply to AI solver if available
    const app = window.fancy2048App;
    if (app && app.aiSolver) {
      app.aiSolver.setDifficulty(difficulty);
      Utils.log('ui', `AI difficulty applied to solver: ${difficulty}`);
    }
    
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
    // While the settings dialog is open, swallow game keys; Escape closes it.
    if (this.elements.settingsOverlay && !this.elements.settingsOverlay.classList.contains('hidden')) {
      if (event.key === 'Escape') this.hideSettings();
      return;
    }

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
  showNotification(message, type = 'info', duration = 3000) {
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

    // Auto remove after the requested duration
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 300);
      }
    }, duration);
  }

  /**
   * Show statistics page
   */
  showStats() {
    window.location.href = './stats.html';
  }



  /**
   * Open the settings dialog (tile-hue picker).
   */
  showSettings() {
    if (!this.elements.settingsOverlay) {
      this.showNotification('Settings unavailable', 'error');
      return;
    }

    // Build the live sample board once.
    this.buildHuePreview();

    // Reflect the current hue on the slider.
    const hue = this.tileHue != null ? this.tileHue : (Storage.getSettings().tileHue ?? 30);
    if (this.elements.tileHueSlider) this.elements.tileHueSlider.value = hue;
    if (this.elements.tileHueValue) this.elements.tileHueValue.textContent = `${hue}°`;

    this.elements.settingsOverlay.classList.remove('hidden');
    Utils.log('ui', 'Settings opened');
  }

  /**
   * Close the settings dialog.
   */
  hideSettings() {
    if (this.elements.settingsOverlay) {
      this.elements.settingsOverlay.classList.add('hidden');
    }
  }

  /**
   * Slider moved: recolour the board live and auto-save.
   */
  onTileHueInput(value) {
    const hue = this.applyTileHue(value, true);
    if (this.elements.tileHueValue) this.elements.tileHueValue.textContent = `${hue}°`;
  }

  /**
   * Apply the saved tile hue at startup (no save, just render the palette).
   */
  applySavedTileHue() {
    const hue = Storage.getSettings().tileHue;
    this.applyTileHue(hue == null ? 30 : hue, false);
  }

  /**
   * Generate and install the tile colour palette for `hue` (0-360).
   *
   * Tiles share one hue (chosen here) and ramp from light/desaturated for small
   * values to dark/saturated for large ones, so every value stays visually
   * distinct. The number colour is picked per tile as whichever of near-black
   * or near-white has the higher WCAG contrast ratio against that tile, so the
   * digits are always legible — in light and dark theme alike. The rules are
   * injected with `!important`, overriding the static per-theme tile colours.
   * The same rules colour both the real board and the settings preview, which
   * is why sliding updates the board itself live.
   *
   * Returns the normalised hue.
   */
  applyTileHue(hue, save = true) {
    hue = ((Math.round(Number(hue)) || 0) % 360 + 360) % 360;
    this.tileHue = hue;

    let styleEl = document.getElementById('tile-hue-style');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'tile-hue-style';
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = this.buildTilePaletteCSS(hue);

    if (save) Storage.updateSetting('tileHue', hue);
    return hue;
  }

  /**
   * Build the CSS text for the tile palette at a given hue.
   */
  buildTilePaletteCSS(hue) {
    const values = [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192];
    let css = '';
    values.forEach((v, i) => {
      const t = i / (values.length - 1);          // 0..1 across the ramp
      const light = Math.round(86 - t * 48);        // 86% -> 38%
      const sat = Math.round(48 + t * 40);          // 48% -> 88%
      const bg = `hsl(${hue}, ${sat}%, ${light}%)`;
      const text = this.contrastText(hue, sat, light);
      css += `.tile[data-value="${v}"]{background:${bg} !important;color:${text} !important;}\n`;
    });
    return css;
  }

  /**
   * Pick the most legible text colour (near-black vs near-white) for an HSL
   * background by comparing WCAG contrast ratios.
   */
  contrastText(h, s, l) {
    const [r, g, b] = this.hslToRgb(h, s / 100, l / 100);
    const bgLum = this.relativeLuminance(r, g, b);
    // Pure black/white maximize the contrast ratio; whichever is higher keeps
    // every tile's digits legible (the worst case across all hues is ~4.58:1,
    // which clears WCAG AA for normal text — and these digits are large/bold).
    const contrastWhite = (1.0 + 0.05) / (bgLum + 0.05);
    const contrastBlack = (bgLum + 0.05) / (0.0 + 0.05);
    return contrastBlack >= contrastWhite ? '#000000' : '#ffffff';
  }

  /**
   * HSL (h in degrees, s/l in 0..1) -> [r, g, b] each 0..255.
   */
  hslToRgb(h, s, l) {
    h = (h % 360) / 360;
    let r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }

  /**
   * sRGB relative luminance (0..1) per the WCAG definition.
   */
  relativeLuminance(r, g, b) {
    const channel = (c) => {
      c /= 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  }

  /**
   * Build the small sample board shown in the settings dialog. The tiles are
   * real `.tile[data-value]` elements so the injected palette colours them in
   * sync with the live board.
   */
  buildHuePreview() {
    const container = this.elements.tileHuePreview;
    if (!container || container.childElementCount > 0) return;

    const values = [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048];
    const fragment = document.createDocumentFragment();
    for (const v of values) {
      const tile = document.createElement('div');
      tile.className = 'tile';
      tile.setAttribute('data-value', v);
      tile.textContent = Utils.formatNumber(v);
      fragment.appendChild(tile);
    }
    container.appendChild(fragment);
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
      this.previousBoard = null;
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
    0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
    20% { transform: translate(-50%, -50%) scale(1.05); opacity: 1; }
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
