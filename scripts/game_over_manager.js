/**
 * Game Over Detection and Management System
 * Handles all game state transitions and end conditions
 */

class GameOverManager {
  constructor(gameCore) {
    this.gameCore = gameCore;
    this.checkInterval = null;
    this.lastGameState = 'playing';
    
    // Game over callbacks
    this.onGameOver = null;
    this.onWin = null;
    this.onContinueAfterWin = null;
    
    // Performance tracking
    this.checksPerformed = 0;
    this.lastCheckTime = 0;
  }
  
  /**
   * Initialize game over monitoring
   */
  initialize() {
    this.startMonitoring();
  }
  
  /**
   * Start monitoring game state
   */
  startMonitoring() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
    
    // Check game state every 100ms
    this.checkInterval = setInterval(() => {
      this.checkGameState();
    }, 100);
  }
  
  /**
   * Stop monitoring game state
   */
  stopMonitoring() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }
  
  /**
   * Comprehensive game state check
   * @returns {Object} Detailed game state information
   */
  checkGameState() {
    const startTime = performance.now();
    this.checksPerformed++;
    
    const state = {
      isGameOver: false,
      hasWon: false,
      canContinue: true,
      reason: '',
      suggestions: [],
      stats: this.gameCore.getStats()
    };
    
    // Check for win condition
    if (this.hasPlayerWon()) {
      state.hasWon = true;
      state.reason = 'Congratulations! You reached 2048!';
      state.suggestions.push('Continue playing to reach higher tiles');
      
      if (this.gameCore.gameState === 'playing') {
        this.triggerWin();
      }
    }
    
    // Check for game over condition
    if (this.isGameCompletelyOver()) {
      state.isGameOver = true;
      state.canContinue = false;
      state.reason = this.getGameOverReason();
      state.suggestions = this.getGameOverSuggestions();
      
      if (this.gameCore.gameState !== 'over') {
        this.triggerGameOver();
      }
    }
    
    this.lastCheckTime = performance.now() - startTime;
    
    return state;
  }
  
  /**
   * Check if player has won (reached 2048)
   * @returns {boolean} True if player has won
   */
  hasPlayerWon() {
    return this.gameCore.hasWinningTile();
  }
  
  /**
   * Check if game is completely over (no moves possible)
   * @returns {boolean} True if game is over
   */
  isGameCompletelyOver() {
    // If there are empty cells, game is not over
    if (this.gameCore.getEmptyCells().length > 0) {
      return false;
    }
    
    // Check if any moves are possible
    return !this.canMakeAnyMove();
  }
  
  /**
   * Comprehensive check if any move is possible
   * @returns {boolean} True if at least one move is possible
   */
  canMakeAnyMove() {
    const directions = ['up', 'down', 'left', 'right'];
    
    for (const direction of directions) {
      if (this.canMoveInDirection(direction)) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Enhanced direction movement check
   * @param {string} direction - Direction to check
   * @returns {boolean} True if movement is possible in this direction
   */
  canMoveInDirection(direction) {
    const board = this.gameCore.board;
    const size = this.gameCore.size;
    
    switch (direction) {
      case 'up':
        return this.canMoveUp(board, size);
      case 'down':
        return this.canMoveDown(board, size);
      case 'left':
        return this.canMoveLeft(board, size);
      case 'right':
        return this.canMoveRight(board, size);
      default:
        return false;
    }
  }
  
  /**
   * Check if upward movement is possible
   * @param {Array} board - Game board
   * @param {number} size - Board size
   * @returns {boolean} True if upward movement possible
   */
  canMoveUp(board, size) {
    for (let col = 0; col < size; col++) {
      for (let row = 1; row < size; row++) {
        if (board[row][col] !== 0) {
          // Check if tile can move up
          if (board[row - 1][col] === 0 || 
              board[row - 1][col] === board[row][col]) {
            return true;
          }
        }
      }
    }
    return false;
  }
  
  /**
   * Check if downward movement is possible
   * @param {Array} board - Game board
   * @param {number} size - Board size
   * @returns {boolean} True if downward movement possible
   */
  canMoveDown(board, size) {
    for (let col = 0; col < size; col++) {
      for (let row = size - 2; row >= 0; row--) {
        if (board[row][col] !== 0) {
          // Check if tile can move down
          if (board[row + 1][col] === 0 || 
              board[row + 1][col] === board[row][col]) {
            return true;
          }
        }
      }
    }
    return false;
  }
  
  /**
   * Check if leftward movement is possible
   * @param {Array} board - Game board
   * @param {number} size - Board size
   * @returns {boolean} True if leftward movement possible
   */
  canMoveLeft(board, size) {
    for (let row = 0; row < size; row++) {
      for (let col = 1; col < size; col++) {
        if (board[row][col] !== 0) {
          // Check if tile can move left
          if (board[row][col - 1] === 0 || 
              board[row][col - 1] === board[row][col]) {
            return true;
          }
        }
      }
    }
    return false;
  }
  
  /**
   * Check if rightward movement is possible
   * @param {Array} board - Game board
   * @param {number} size - Board size
   * @returns {boolean} True if rightward movement possible
   */
  canMoveRight(board, size) {
    for (let row = 0; row < size; row++) {
      for (let col = size - 2; col >= 0; col--) {
        if (board[row][col] !== 0) {
          // Check if tile can move right
          if (board[row][col + 1] === 0 || 
              board[row][col + 1] === board[row][col]) {
            return true;
          }
        }
      }
    }
    return false;
  }
  
  /**
   * Get reason for game over
   * @returns {string} Game over reason
   */
  getGameOverReason() {
    const stats = this.gameCore.getStats();
    
    let reason = 'Game Over! ';
    
    if (stats.emptyCells === 0) {
      reason += 'No empty cells remaining and no valid moves possible.';
    } else {
      reason += 'No valid moves available.';
    }
    
    return reason;
  }
  
  /**
   * Get suggestions for game over state
   * @returns {Array} Array of suggestion strings
   */
  getGameOverSuggestions() {
    const stats = this.gameCore.getStats();
    const suggestions = [];
    
    suggestions.push('Try again with a different strategy');
    
    if (stats.highestTile < 512) {
      suggestions.push('Focus on keeping your highest tile in a corner');
      suggestions.push('Try to build chains of increasing tiles');
    } else if (stats.highestTile < 1024) {
      suggestions.push('You\'re getting close! Maintain monotonicity');
      suggestions.push('Keep your highest tiles along one edge');
    } else {
      suggestions.push('Excellent progress! You\'re very close to 2048');
      suggestions.push('Focus on the final merges carefully');
    }
    
    if (stats.moves < 100) {
      suggestions.push('Take more time to plan your moves');
    }
    
    return suggestions;
  }
  
  /**
   * Trigger win state
   */
  triggerWin() {
    this.gameCore.gameState = 'won';
    this.lastGameState = 'won';
    
    if (this.onWin) {
      this.onWin({
        score: this.gameCore.score,
        moves: this.gameCore.moves,
        highestTile: this.gameCore.getHighestTile(),
        time: Date.now()
      });
    }
    
    console.log('🎉 Player won! Reached 2048!');
  }
  
  /**
   * Trigger game over state
   */
  triggerGameOver() {
    this.gameCore.gameState = 'over';
    this.lastGameState = 'over';
    this.gameCore.saveBestScore();
    
    if (this.onGameOver) {
      this.onGameOver({
        score: this.gameCore.score,
        bestScore: this.gameCore.bestScore,
        moves: this.gameCore.moves,
        highestTile: this.gameCore.getHighestTile(),
        time: Date.now(),
        reason: this.getGameOverReason(),
        suggestions: this.getGameOverSuggestions()
      });
    }
    
    console.log('💀 Game Over!', {
      score: this.gameCore.score,
      moves: this.gameCore.moves,
      highestTile: this.gameCore.getHighestTile()
    });
  }
  
  /**
   * Allow player to continue after winning
   */
  continueAfterWin() {
    if (this.gameCore.gameState === 'won') {
      this.gameCore.gameState = 'won-continue';
      
      if (this.onContinueAfterWin) {
        this.onContinueAfterWin({
          score: this.gameCore.score,
          moves: this.gameCore.moves,
          highestTile: this.gameCore.getHighestTile()
        });
      }
      
      console.log('🚀 Continuing after win!');
    }
  }
  
  /**
   * Set callback for game over event
   * @param {Function} callback - Callback function
   */
  setOnGameOver(callback) {
    this.onGameOver = callback;
  }
  
  /**
   * Set callback for win event
   * @param {Function} callback - Callback function
   */
  setOnWin(callback) {
    this.onWin = callback;
  }
  
  /**
   * Set callback for continue after win event
   * @param {Function} callback - Callback function
   */
  setOnContinueAfterWin(callback) {
    this.onContinueAfterWin = callback;
  }
  
  /**
   * Get performance statistics
   * @returns {Object} Performance stats
   */
  getPerformanceStats() {
    return {
      checksPerformed: this.checksPerformed,
      lastCheckTime: this.lastCheckTime,
      averageCheckTime: this.checksPerformed > 0 ? 
        this.lastCheckTime / this.checksPerformed : 0,
      monitoringActive: this.checkInterval !== null
    };
  }
  
  /**
   * Reset manager state
   */
  reset() {
    this.lastGameState = 'playing';
    this.checksPerformed = 0;
    this.lastCheckTime = 0;
    this.startMonitoring();
  }
  
  /**
   * Clean up resources
   */
  destroy() {
    this.stopMonitoring();
    this.onGameOver = null;
    this.onWin = null;
    this.onContinueAfterWin = null;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GameOverManager;
}

// Make available globally
window.GameOverManager = GameOverManager;
