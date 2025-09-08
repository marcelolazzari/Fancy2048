/**
 * Fancy2048 - Touch Handler
 * Advanced touch gesture recognition with haptic feedback
 */

class TouchHandler {
  constructor(gameEngine, uiController) {
    this.gameEngine = gameEngine;
    this.uiController = uiController;
    
    // Touch state
    this.touchStartX = null;
    this.touchStartY = null;
    this.touchStartTime = null;
    this.isTouch = false;
    this.isDragging = false;
    
    // Configuration
    this.minSwipeDistance = 30;
    this.maxSwipeTime = 300;
    this.tapTimeout = 200;
    
    // Feature detection
    this.hasTouch = 'ontouchstart' in window;
    this.hasHaptic = 'vibrate' in navigator;
    
    // Settings
    this.settings = {
      hapticEnabled: true,
      gestureIndicators: true,
      swipeSensitivity: 1.0
    };
    
    this.initialize();
  }

  /**
   * Initialize touch event handlers
   */
  initialize() {
    const gameBoard = document.getElementById('game-board');
    if (!gameBoard) return;
    
    // Add touch event listeners
    if (this.hasTouch) {
      gameBoard.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
      gameBoard.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
      gameBoard.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
      gameBoard.addEventListener('touchcancel', this.handleTouchCancel.bind(this));
    }
    
    // Add mouse event listeners for desktop testing
    gameBoard.addEventListener('mousedown', this.handleMouseDown.bind(this));
    gameBoard.addEventListener('mousemove', this.handleMouseMove.bind(this));
    gameBoard.addEventListener('mouseup', this.handleMouseUp.bind(this));
    gameBoard.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
    
    // Prevent context menu on long press
    gameBoard.addEventListener('contextmenu', (e) => e.preventDefault());
    
    Utils.log('touch', 'Touch handler initialized', {
      hasTouch: this.hasTouch,
      hasHaptic: this.hasHaptic
    });
  }

  /**
   * Handle touch start
   */
  handleTouchStart(event) {
    event.preventDefault();
    
    const touch = event.touches[0];
    this.startGesture(touch.clientX, touch.clientY, true);
    
    // Visual feedback
    this.addTouchFeedback(event.target);
  }

  /**
   * Handle touch move
   */
  handleTouchMove(event) {
    event.preventDefault();
    
    if (!this.isTouch || !this.touchStartX || !this.touchStartY) return;
    
    const touch = event.touches[0];
    this.updateGesture(touch.clientX, touch.clientY);
  }

  /**
   * Handle touch end
   */
  handleTouchEnd(event) {
    event.preventDefault();
    
    if (!this.isTouch) return;
    
    const touch = event.changedTouches[0];
    this.endGesture(touch.clientX, touch.clientY);
    
    // Remove visual feedback
    this.removeTouchFeedback();
  }

  /**
   * Handle touch cancel
   */
  handleTouchCancel() {
    this.cancelGesture();
    this.removeTouchFeedback();
  }

  /**
   * Handle mouse down (for desktop)
   */
  handleMouseDown(event) {
    event.preventDefault();
    this.startGesture(event.clientX, event.clientY, false);
    this.addTouchFeedback(event.target);
  }

  /**
   * Handle mouse move (for desktop)
   */
  handleMouseMove(event) {
    if (!this.touchStartX || !this.touchStartY) return;
    this.updateGesture(event.clientX, event.clientY);
  }

  /**
   * Handle mouse up (for desktop)
   */
  handleMouseUp(event) {
    if (!this.touchStartX || !this.touchStartY) return;
    this.endGesture(event.clientX, event.clientY);
    this.removeTouchFeedback();
  }

  /**
   * Handle mouse leave (for desktop)
   */
  handleMouseLeave() {
    this.cancelGesture();
    this.removeTouchFeedback();
  }

  /**
   * Start gesture tracking
   */
  startGesture(x, y, isTouch) {
    this.touchStartX = x;
    this.touchStartY = y;
    this.touchStartTime = Date.now();
    this.isTouch = isTouch;
    this.isDragging = false;
    
    // Show gesture indicator if enabled
    if (this.settings.gestureIndicators) {
      this.showGestureIndicator(x, y);
    }
  }

  /**
   * Update gesture tracking
   */
  updateGesture(x, y) {
    const deltaX = x - this.touchStartX;
    const deltaY = y - this.touchStartY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    // Check if we've moved far enough to be considered dragging
    if (distance > 10 && !this.isDragging) {
      this.isDragging = true;
    }
    
    // Update gesture indicator
    if (this.settings.gestureIndicators && this.isDragging) {
      this.updateGestureIndicator(deltaX, deltaY);
    }
  }

  /**
   * End gesture and determine action
   */
  endGesture(x, y) {
    const deltaX = x - this.touchStartX;
    const deltaY = y - this.touchStartY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const duration = Date.now() - this.touchStartTime;
    
    // Hide gesture indicator
    this.hideGestureIndicator();
    
    // Adjust sensitivity
    const adjustedMinDistance = this.minSwipeDistance / this.settings.swipeSensitivity;
    
    if (distance >= adjustedMinDistance && duration <= this.maxSwipeTime) {
      // This is a swipe gesture
      const direction = this.getSwipeDirection(deltaX, deltaY);
      this.handleSwipe(direction);
    } else if (!this.isDragging && duration <= this.tapTimeout) {
      // This is a tap
      this.handleTap(x, y);
    }
    
    this.resetGesture();
  }

  /**
   * Cancel current gesture
   */
  cancelGesture() {
    this.hideGestureIndicator();
    this.resetGesture();
  }

  /**
   * Reset gesture state
   */
  resetGesture() {
    this.touchStartX = null;
    this.touchStartY = null;
    this.touchStartTime = null;
    this.isTouch = false;
    this.isDragging = false;
  }

  /**
   * Determine swipe direction from deltas
   */
  getSwipeDirection(deltaX, deltaY) {
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);
    
    if (absDeltaX > absDeltaY) {
      return deltaX > 0 ? 'right' : 'left';
    } else {
      return deltaY > 0 ? 'down' : 'up';
    }
  }

  /**
   * Handle swipe gesture
   */
  handleSwipe(direction) {
    Utils.log('touch', `Swipe detected: ${direction}`);
    
    // Haptic feedback
    this.hapticFeedback('light');
    
    // Execute move
    const success = this.gameEngine.move(direction);
    
    if (success) {
      this.hapticFeedback('medium');
      this.showMoveSuccess(direction);
    } else {
      this.hapticFeedback('error');
    }
  }

  /**
   * Handle tap gesture
   */
  handleTap(x, y) {
    Utils.log('touch', 'Tap detected', { x, y });
    
    // Light haptic feedback for tap
    this.hapticFeedback('light');
    
    // You could add tap functionality here (e.g., show hints, toggle UI)
    // For now, we'll just provide feedback
  }

  /**
   * Add visual touch feedback
   */
  addTouchFeedback(element) {
    if (element && element.classList) {
      element.classList.add('touch-active');
    }
    
    // Add ripple effect
    this.createRippleEffect(element);
  }

  /**
   * Remove visual touch feedback
   */
  removeTouchFeedback() {
    const activeElements = document.querySelectorAll('.touch-active');
    activeElements.forEach(el => el.classList.remove('touch-active'));
  }

  /**
   * Create ripple effect
   */
  createRippleEffect(element) {
    if (!element) return;
    
    const ripple = document.createElement('div');
    ripple.className = 'touch-ripple';
    
    const rect = element.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = (this.touchStartX - rect.left - size / 2) + 'px';
    ripple.style.top = (this.touchStartY - rect.top - size / 2) + 'px';
    
    element.appendChild(ripple);
    
    // Remove ripple after animation
    setTimeout(() => {
      if (ripple.parentNode) {
        ripple.parentNode.removeChild(ripple);
      }
    }, 600);
  }

  /**
   * Show gesture indicator
   */
  showGestureIndicator(x, y) {
    let indicator = document.getElementById('gesture-indicator');
    
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'gesture-indicator';
      indicator.className = 'gesture-indicator';
      document.body.appendChild(indicator);
    }
    
    indicator.style.left = (x - 20) + 'px';
    indicator.style.top = (y - 20) + 'px';
    indicator.style.opacity = '1';
    indicator.innerHTML = '•';
  }

  /**
   * Update gesture indicator
   */
  updateGestureIndicator(deltaX, deltaY) {
    const indicator = document.getElementById('gesture-indicator');
    if (!indicator) return;
    
    const direction = this.getSwipeDirection(deltaX, deltaY);
    const arrows = {
      up: '↑',
      down: '↓',
      left: '←',
      right: '→'
    };
    
    indicator.innerHTML = arrows[direction] || '•';
    
    // Update opacity based on distance
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const opacity = Math.min(1, distance / (this.minSwipeDistance * 2));
    indicator.style.opacity = opacity;
  }

  /**
   * Hide gesture indicator
   */
  hideGestureIndicator() {
    const indicator = document.getElementById('gesture-indicator');
    if (indicator) {
      indicator.style.opacity = '0';
      setTimeout(() => {
        if (indicator.parentNode) {
          indicator.parentNode.removeChild(indicator);
        }
      }, 200);
    }
  }

  /**
   * Show move success animation
   */
  showMoveSuccess(direction) {
    const gameBoard = document.getElementById('game-board');
    if (!gameBoard) return;
    
    gameBoard.classList.add(`move-${direction}`);
    
    setTimeout(() => {
      gameBoard.classList.remove(`move-${direction}`);
    }, 200);
  }

  /**
   * Haptic feedback
   */
  hapticFeedback(type = 'light') {
    if (!this.settings.hapticEnabled || !this.hasHaptic) return;
    
    const patterns = {
      light: 10,
      medium: 20,
      heavy: 50,
      error: [50, 50, 50]
    };
    
    const pattern = patterns[type] || patterns.light;
    navigator.vibrate(pattern);
  }

  /**
   * Update settings
   */
  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    Utils.log('touch', 'Touch settings updated', this.settings);
  }

  /**
   * Set swipe sensitivity
   */
  setSwipeSensitivity(sensitivity) {
    this.settings.swipeSensitivity = Math.max(0.5, Math.min(2.0, sensitivity));
  }

  /**
   * Enable/disable haptic feedback
   */
  setHapticEnabled(enabled) {
    this.settings.hapticEnabled = enabled;
  }

  /**
   * Enable/disable gesture indicators
   */
  setGestureIndicators(enabled) {
    this.settings.gestureIndicators = enabled;
  }

  /**
   * Get touch handler statistics
   */
  getStats() {
    return {
      hasTouch: this.hasTouch,
      hasHaptic: this.hasHaptic,
      settings: this.settings,
      isActive: this.touchStartX !== null
    };
  }

  /**
   * Destroy touch handler
   */
  destroy() {
    const gameBoard = document.getElementById('game-board');
    if (gameBoard) {
      // Remove all event listeners
      gameBoard.removeEventListener('touchstart', this.handleTouchStart);
      gameBoard.removeEventListener('touchmove', this.handleTouchMove);
      gameBoard.removeEventListener('touchend', this.handleTouchEnd);
      gameBoard.removeEventListener('touchcancel', this.handleTouchCancel);
      gameBoard.removeEventListener('mousedown', this.handleMouseDown);
      gameBoard.removeEventListener('mousemove', this.handleMouseMove);
      gameBoard.removeEventListener('mouseup', this.handleMouseUp);
      gameBoard.removeEventListener('mouseleave', this.handleMouseLeave);
    }
    
    // Clean up any remaining indicators
    this.hideGestureIndicator();
    this.removeTouchFeedback();
    
    Utils.log('touch', 'Touch handler destroyed');
  }
}

// Add CSS for touch effects
const touchStyles = `
  .touch-active {
    transform: scale(0.98);
    opacity: 0.8;
  }
  
  .touch-ripple {
    position: absolute;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.3);
    pointer-events: none;
    transform: scale(0);
    animation: ripple 0.6s linear;
  }
  
  .gesture-indicator {
    position: fixed;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: rgba(255, 204, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    font-weight: bold;
    color: #1a1a1a;
    pointer-events: none;
    z-index: 1000;
    transition: opacity 0.2s ease;
  }
  
  .game-board.move-up {
    animation: moveUp 0.2s ease;
  }
  
  .game-board.move-down {
    animation: moveDown 0.2s ease;
  }
  
  .game-board.move-left {
    animation: moveLeft 0.2s ease;
  }
  
  .game-board.move-right {
    animation: moveRight 0.2s ease;
  }
  
  @keyframes ripple {
    to {
      transform: scale(2);
      opacity: 0;
    }
  }
  
  @keyframes moveUp {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-3px); }
  }
  
  @keyframes moveDown {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(3px); }
  }
  
  @keyframes moveLeft {
    0%, 100% { transform: translateX(0); }
    50% { transform: translateX(-3px); }
  }
  
  @keyframes moveRight {
    0%, 100% { transform: translateX(0); }
    50% { transform: translateX(3px); }
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = touchStyles;
  document.head.appendChild(styleSheet);
}

// Make TouchHandler available globally
if (typeof window !== 'undefined') {
  window.TouchHandler = TouchHandler;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TouchHandler;
}
