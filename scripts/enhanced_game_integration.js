/**
 * Enhanced Game Integration System
 * Integrates all improved components: Game2048Core, Enhanced2048AI, and GameOverManager
 */

// Check if Game class is available
if (typeof Game === 'undefined') {
  console.log('⚠️ Enhanced Game Integration: Game class not yet loaded, deferring...');
  // This file will be executed again when game.js loads
} else {
  
class EnhancedGame extends Game {
  constructor(size = 4) {
    super(size);
    
    // Initialize enhanced components
    this.gameCore = new Game2048Core();
    this.enhancedAI = new Enhanced2048AI(this.gameCore);
    this.gameOverManager = new GameOverManager(this.gameCore);
    
    // Override original game state with enhanced core
    this.migrateToEnhancedCore();
    
    // Setup enhanced event handlers
    this.setupEnhancedHandlers();
    
    console.log('✅ Enhanced Game System Initialized');
  }
  
  /**
   * Migrate existing game state to enhanced core
   */
  migrateToEnhancedCore() {
    try {
      // Sync existing game state with enhanced core
      this.gameCore.score = this.score;
      this.gameCore.bestScore = this.bestScore;
      this.gameCore.moves = this.moves;
      
      // Transfer board state if it exists
      if (this.board && this.board.length > 0) {
        this.gameCore.board = this.board.map(row => [...row]);
      }
      
      // Update UI references to use enhanced core
      this.board = this.gameCore.board;
      this.score = this.gameCore.score;
      
      console.log('✅ Successfully migrated to enhanced core');
    } catch (error) {
      console.error('❌ Error migrating to enhanced core:', error);
      // Fallback: reset enhanced core
      this.gameCore.reset();
      this.gameCore.addRandomTile();
      this.gameCore.addRandomTile();
    }
  }
  
  /**
   * Setup enhanced event handlers and callbacks
   */
  setupEnhancedHandlers() {
    // Game over callbacks
    this.gameOverManager.setOnGameOver((data) => {
      this.handleEnhancedGameOver(data);
    });
    
    this.gameOverManager.setOnWin((data) => {
      this.handleEnhancedWin(data);
    });
    
    this.gameOverManager.setOnContinueAfterWin((data) => {
      this.handleContinueAfterWin(data);
    });
    
    // Initialize monitoring
    this.gameOverManager.initialize();
  }
  
  /**
   * Enhanced move method using improved game logic
   * @param {string} direction - Movement direction
   * @returns {boolean} True if move was successful
   */
  makeMove(direction) {
    if (this.animationInProgress || this.gameCore.gameState === 'over') {
      return false;
    }
    
    const startTime = performance.now();
    
    try {
      // Record state for undo functionality
      this.saveGameState();
      
      // Make move using enhanced core
      const moveResult = this.gameCore.makeMove(direction);
      
      if (moveResult.moved) {
        // Update game state
        this.moves = this.gameCore.moves + 1;
        this.gameCore.moves = this.moves;
        this.score = this.gameCore.score;
        this.board = this.gameCore.board;
        
        // Add random tile
        const tileAdded = this.gameCore.addRandomTile();
        
        if (!tileAdded) {
          console.warn('⚠️ Could not add random tile - board may be full');
        }
        
        // Update UI
        this.animateMove(direction, moveResult.mergedTiles);
        this.updateUI();
        
        // Update best score
        this.gameCore.saveBestScore();
        this.bestScore = this.gameCore.bestScore;
        
        // Track performance
        this.updatePerformanceMetrics(performance.now() - startTime);
        
        // Update game state
        this.gameCore.updateGameState();
        
        // Auto-save
        this.autoSave();
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Error in enhanced move:', error);
      this.handleMoveError(error);
      return false;
    }
  }
  
  /**
   * Enhanced AI move with improved decision making
   */
  makeAIMove() {
    if (this.animationInProgress || this.gameCore.gameState === 'over') {
      return;
    }
    
    try {
      const bestMove = this.enhancedAI.getBestMove();
      
      if (bestMove) {
        console.log(`🤖 AI suggests: ${bestMove}`);
        this.makeMove(bestMove);
        
        // Log AI performance
        const stats = this.enhancedAI.getPerformanceStats();
        console.log('🧠 AI Performance:', {
          difficulty: stats.difficulty,
          evaluatedMoves: stats.movesEvaluated,
          timeMs: stats.lastMoveTime.toFixed(2)
        });
      } else {
        console.log('🤖 AI: No valid moves available');
      }
    } catch (error) {
      console.error('❌ AI Move Error:', error);
    }
  }
  
  /**
   * Enhanced autoplay with improved AI integration
   */
  toggleAutoPlay() {
    this.isAutoPlaying = !this.isAutoPlaying;
    
    if (this.isAutoPlaying) {
      this.startEnhancedAutoPlay();
    } else {
      this.stopAutoPlay();
    }
    
    this.updateAutoPlayButton();
  }
  
  /**
   * Start enhanced autoplay
   */
  startEnhancedAutoPlay() {
    if (this.autoPlayInterval) {
      clearInterval(this.autoPlayInterval);
    }
    
    const speed = this.getAutoPlaySpeed();
    
    this.autoPlayInterval = setInterval(() => {
      if (this.gameCore.gameState === 'over' || this.animationInProgress) {
        return;
      }
      
      this.makeAIMove();
    }, speed);
    
    console.log(`🤖 Enhanced autoplay started (speed: ${speed}ms)`);
  }
  
  /**
   * Check if game is over using enhanced detection
   * @returns {boolean} True if game is over
   */
  isGameOver() {
    return this.gameCore.isGameOver();
  }
  
  /**
   * Reset game using enhanced core
   */
  resetGame() {
    try {
      // Stop any running processes
      this.stopAutoPlay();
      this.gameOverManager.stopMonitoring();
      
      // Reset enhanced core
      this.gameCore.reset();
      
      // Sync with original game state
      this.board = this.gameCore.board;
      this.score = this.gameCore.score;
      this.moves = this.gameCore.moves;
      this.gameState = this.gameCore.gameState;
      
      // Reset UI and timers
      this.animationInProgress = false;
      this.resetTimer();
      this.clearGameStateStack();
      
      // Restart monitoring
      this.gameOverManager.reset();
      
      // Update UI
      this.updateUI();
      
      console.log('🔄 Enhanced game reset complete');
    } catch (error) {
      console.error('❌ Error resetting enhanced game:', error);
      // Fallback to original reset
      super.resetGame();
    }
  }
  
  /**
   * Handle enhanced game over event
   * @param {Object} data - Game over data
   */
  handleEnhancedGameOver(data) {
    console.log('💀 Enhanced Game Over:', data);
    
    this.gameState = 'over';
    this.stopAutoPlay();
    
    // Show enhanced game over message
    this.showEnhancedGameOverMessage(data);
    
    // Save enhanced statistics
    this.saveEnhancedStats(data);
  }
  
  /**
   * Handle enhanced win event
   * @param {Object} data - Win data
   */
  handleEnhancedWin(data) {
    console.log('🎉 Enhanced Win:', data);
    
    this.gameState = 'won';
    
    // Show win message with continue option
    this.showEnhancedWinMessage(data);
  }
  
  /**
   * Handle continue after win
   * @param {Object} data - Continue data
   */
  handleContinueAfterWin(data) {
    console.log('🚀 Continuing after win:', data);
    this.gameState = 'won-continue';
  }
  
  /**
   * Show enhanced game over message
   * @param {Object} data - Game over data
   */
  showEnhancedGameOverMessage(data) {
    const message = document.createElement('div');
    message.className = 'enhanced-game-over-message';
    message.innerHTML = `
      <div class="game-over-content">
        <h2>💀 Game Over!</h2>
        <p><strong>Final Score:</strong> ${data.score.toLocaleString()}</p>
        <p><strong>Best Score:</strong> ${data.bestScore.toLocaleString()}</p>
        <p><strong>Moves:</strong> ${data.moves.toLocaleString()}</p>
        <p><strong>Highest Tile:</strong> ${data.highestTile}</p>
        <div class="game-over-reason">
          <p>${data.reason}</p>
        </div>
        <div class="game-over-suggestions">
          <h3>💡 Suggestions:</h3>
          <ul>
            ${data.suggestions.map(s => `<li>${s}</li>`).join('')}
          </ul>
        </div>
        <div class="game-over-actions">
          <button onclick="game.resetGame()" class="button-primary">🔄 Play Again</button>
          <button onclick="this.parentElement.parentElement.parentElement.remove()" class="button-secondary">✕ Close</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(message);
    
    // Auto-remove after 30 seconds
    setTimeout(() => {
      if (message.parentElement) {
        message.remove();
      }
    }, 30000);
  }
  
  /**
   * Show enhanced win message
   * @param {Object} data - Win data
   */
  showEnhancedWinMessage(data) {
    const message = document.createElement('div');
    message.className = 'enhanced-win-message';
    message.innerHTML = `
      <div class="win-content">
        <h2>🎉 Congratulations!</h2>
        <p>You reached <strong>2048</strong>!</p>
        <p><strong>Score:</strong> ${data.score.toLocaleString()}</p>
        <p><strong>Moves:</strong> ${data.moves.toLocaleString()}</p>
        <div class="win-actions">
          <button onclick="game.gameOverManager.continueAfterWin(); this.parentElement.parentElement.parentElement.remove();" class="button-primary">🚀 Continue</button>
          <button onclick="game.resetGame(); this.parentElement.parentElement.parentElement.remove();" class="button-secondary">🔄 New Game</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(message);
  }
  
  /**
   * Save enhanced statistics
   * @param {Object} data - Statistics data
   */
  saveEnhancedStats(data) {
    try {
      const enhancedStats = {
        ...data,
        timestamp: Date.now(),
        gameVersion: '2.0-enhanced',
        aiPerformance: this.enhancedAI.getPerformanceStats(),
        gameOverPerformance: this.gameOverManager.getPerformanceStats()
      };
      
      // Save to original stats system
      this.saveGameToStats();
      
      // Save enhanced stats separately
      const enhancedStatsHistory = JSON.parse(localStorage.getItem('enhancedGameStats') || '[]');
      enhancedStatsHistory.push(enhancedStats);
      
      // Keep only last 100 enhanced stats
      if (enhancedStatsHistory.length > 100) {
        enhancedStatsHistory.splice(0, enhancedStatsHistory.length - 100);
      }
      
      localStorage.setItem('enhancedGameStats', JSON.stringify(enhancedStatsHistory));
    } catch (error) {
      console.error('❌ Error saving enhanced stats:', error);
    }
  }
  
  /**
   * Update performance metrics
   * @param {number} moveTime - Time taken for move in milliseconds
   */
  updatePerformanceMetrics(moveTime) {
    this.performanceMetrics.moveCount++;
    this.performanceMetrics.totalMoveTime += moveTime;
    this.performanceMetrics.averageMoveTime = 
      this.performanceMetrics.totalMoveTime / this.performanceMetrics.moveCount;
  }
  
  /**
   * Handle move errors
   * @param {Error} error - The error that occurred
   */
  handleMoveError(error) {
    this.errorCount++;
    
    if (this.errorCount > this.maxErrors) {
      console.error('❌ Too many errors, resetting game');
      this.resetGame();
    } else {
      console.warn(`⚠️ Move error ${this.errorCount}/${this.maxErrors}:`, error);
    }
  }
  
  /**
   * Get enhanced game statistics
   * @returns {Object} Comprehensive game statistics
   */
  getEnhancedStats() {
    return {
      core: this.gameCore.getStats(),
      ai: this.enhancedAI.getPerformanceStats(),
      gameOver: this.gameOverManager.getPerformanceStats(),
      performance: this.performanceMetrics,
      errors: this.errorCount
    };
  }
  
  /**
   * Cleanup enhanced components
   */
  destroy() {
    try {
      this.gameOverManager.destroy();
      this.stopAutoPlay();
      
      // Call original cleanup if it exists
      if (super.destroy) {
        super.destroy();
      }
    } catch (error) {
      console.error('❌ Error destroying enhanced game:', error);
    }
  }
}

// CSS styles for enhanced messages
const enhancedStyles = `
<style>
.enhanced-game-over-message,
.enhanced-win-message {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  animation: fadeIn 0.3s ease;
}

.game-over-content,
.win-content {
  background: var(--bg-primary, #faf8ef);
  color: var(--text-primary, #776e65);
  padding: 2rem;
  border-radius: 12px;
  max-width: 500px;
  width: 90%;
  text-align: center;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.game-over-content h2,
.win-content h2 {
  margin: 0 0 1rem 0;
  font-size: 2rem;
}

.game-over-reason {
  margin: 1.5rem 0;
  padding: 1rem;
  background: rgba(255, 0, 0, 0.1);
  border-radius: 8px;
}

.game-over-suggestions {
  margin: 1.5rem 0;
  text-align: left;
}

.game-over-suggestions ul {
  margin: 0.5rem 0;
  padding-left: 1.5rem;
}

.game-over-actions,
.win-actions {
  margin-top: 2rem;
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

.button-primary,
.button-secondary {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.button-primary {
  background: #8f7a66;
  color: white;
}

.button-primary:hover {
  background: #9f896b;
}

.button-secondary {
  background: #edcf72;
  color: #776e65;
}

.button-secondary:hover {
  background: #f2d785;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@media (max-width: 768px) {
  .game-over-content,
  .win-content {
    padding: 1.5rem;
    margin: 1rem;
  }
  
  .game-over-actions,
  .win-actions {
    flex-direction: column;
  }
  
  .button-primary,
  .button-secondary {
    width: 100%;
  }
}
</style>
`;

// Inject enhanced styles
if (!document.querySelector('#enhanced-game-styles')) {
  const styleElement = document.createElement('div');
  styleElement.id = 'enhanced-game-styles';
  styleElement.innerHTML = enhancedStyles;
  document.head.appendChild(styleElement);
}

// Export for global use
window.EnhancedGame = EnhancedGame;

} // End Game class check
