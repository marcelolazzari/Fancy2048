/**
 * Enhanced 2048 Game Logic Core
 * Implements proper 2048 game rules with improved tile mechanics and game state management
 */

class Game2048Core {
  constructor(dataManager = null) {
    // Core game state
    this.board = [];
    this.size = 4;
    this.score = 0;
    this.dataManager = dataManager || (window.dataManager || new UnifiedDataManager());
    this.bestScore = parseInt(this.dataManager.getData('bestScore', '0'));
    this.moves = 0;
    this.gameState = 'playing'; // 'playing', 'won', 'won-continue', 'over'
    
    // Tile merge tracking - prevent double merges in single move
    this.mergedTiles = new Set();
    
    // Animation and UI state
    this.animationInProgress = false;
    this.moveAnimationDuration = 150;
    
    // Initialize empty board
    this.initializeBoard();
  }
  
  /**
   * Initialize empty game board
   */
  initializeBoard() {
    this.board = Array(this.size).fill().map(() => Array(this.size).fill(0));
  }
  
  /**
   * Add a random tile (2 or 4) to an empty cell
   * @returns {boolean} True if tile was added, false if no empty cells
   */
  addRandomTile() {
    const emptyCells = this.getEmptyCells();
    if (emptyCells.length === 0) return false;
    
    // Select random empty cell
    const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    
    // 90% chance for 2, 10% chance for 4 (original 2048 rules)
    const value = Math.random() < 0.9 ? 2 : 4;
    
    this.board[randomCell.row][randomCell.col] = value;
    return true;
  }
  
  /**
   * Get all empty cells on the board
   * @returns {Array} Array of {row, col} objects representing empty cells
   */
  getEmptyCells() {
    const emptyCells = [];
    for (let row = 0; row < this.size; row++) {
      for (let col = 0; col < this.size; col++) {
        if (this.board[row][col] === 0) {
          emptyCells.push({ row, col });
        }
      }
    }
    return emptyCells;
  }
  
  /**
   * Check if the game is over (no empty cells and no valid moves)
   * @returns {boolean} True if game is over
   */
  isGameOver() {
    // If there are empty cells, game is not over
    if (this.getEmptyCells().length > 0) {
      return false;
    }
    
    // Check if any moves are possible
    return !this.hasValidMoves();
  }
  
  /**
   * Check if any valid moves are possible
   * @returns {boolean} True if at least one direction allows movement
   */
  hasValidMoves() {
    return this.canMoveInDirection('up') || 
           this.canMoveInDirection('down') || 
           this.canMoveInDirection('left') || 
           this.canMoveInDirection('right');
  }
  
  /**
   * Check if movement is possible in a specific direction
   * @param {string} direction - 'up', 'down', 'left', 'right'
   * @returns {boolean} True if movement is possible
   */
  canMoveInDirection(direction) {
    // Create a copy of the board to test
    const originalBoard = this.cloneBoard();
    
    // Try to make the move
    const result = this.makeMove(direction, true); // true = simulation mode
    
    // Restore original board
    this.board = originalBoard;
    
    return result.moved;
  }
  
  /**
   * Make a move in the specified direction
   * @param {string} direction - 'up', 'down', 'left', 'right'
   * @param {boolean} simulate - If true, don't modify game state
   * @returns {Object} {moved: boolean, scoreGained: number, mergedTiles: Array}
   */
  makeMove(direction, simulate = false) {
    if (this.animationInProgress && !simulate) {
      return { moved: false, scoreGained: 0, mergedTiles: [] };
    }
    
    const originalScore = this.score;
    const originalBoard = this.cloneBoard();
    this.mergedTiles.clear();
    
    let moved = false;
    
    switch (direction) {
      case 'up':
        moved = this.moveVertical(-1);
        break;
      case 'down':
        moved = this.moveVertical(1);
        break;
      case 'left':
        moved = this.moveHorizontal(-1);
        break;
      case 'right':
        moved = this.moveHorizontal(1);
        break;
      default:
        console.error('Invalid direction:', direction);
        return { moved: false, scoreGained: 0, mergedTiles: [] };
    }
    
    const scoreGained = this.score - originalScore;
    const mergedTiles = Array.from(this.mergedTiles);
    
    // If simulation or no movement, restore state
    if (simulate || !moved) {
      this.board = originalBoard;
      this.score = originalScore;
      this.mergedTiles.clear();
    }
    
    return { moved, scoreGained, mergedTiles };
  }
  
  /**
   * Handle vertical movement (up/down)
   * @param {number} direction - -1 for up, 1 for down
   * @returns {boolean} True if any tiles moved
   */
  moveVertical(direction) {
    let moved = false;
    
    for (let col = 0; col < this.size; col++) {
      // Extract column values
      const column = [];
      for (let row = 0; row < this.size; row++) {
        if (this.board[row][col] !== 0) {
          column.push(this.board[row][col]);
        }
      }
      
      // Process column based on direction
      const processedColumn = direction === -1 ? 
        this.processLine(column) : 
        this.processLine(column.reverse()).reverse();
      
      // Update board column
      for (let row = 0; row < this.size; row++) {
        const newValue = processedColumn[row] || 0;
        if (this.board[row][col] !== newValue) {
          moved = true;
        }
        this.board[row][col] = newValue;
      }
    }
    
    return moved;
  }
  
  /**
   * Handle horizontal movement (left/right)
   * @param {number} direction - -1 for left, 1 for right
   * @returns {boolean} True if any tiles moved
   */
  moveHorizontal(direction) {
    let moved = false;
    
    for (let row = 0; row < this.size; row++) {
      // Extract row values
      const rowValues = [];
      for (let col = 0; col < this.size; col++) {
        if (this.board[row][col] !== 0) {
          rowValues.push(this.board[row][col]);
        }
      }
      
      // Process row based on direction
      const processedRow = direction === -1 ? 
        this.processLine(rowValues) : 
        this.processLine(rowValues.reverse()).reverse();
      
      // Update board row
      for (let col = 0; col < this.size; col++) {
        const newValue = processedRow[col] || 0;
        if (this.board[row][col] !== newValue) {
          moved = true;
        }
        this.board[row][col] = newValue;
      }
    }
    
    return moved;
  }
  
  /**
   * Process a line of tiles (merge and compact)
   * @param {Array} line - Array of non-zero tile values
   * @returns {Array} Processed line with merges and correct positioning
   */
  processLine(line) {
    if (line.length === 0) {
      return Array(this.size).fill(0);
    }
    
    const result = [];
    let i = 0;
    
    while (i < line.length) {
      if (i < line.length - 1 && line[i] === line[i + 1]) {
        // Merge tiles
        const mergedValue = line[i] * 2;
        result.push(mergedValue);
        this.score += mergedValue;
        
        // Track merged tile for animation
        this.mergedTiles.add({ value: mergedValue, merged: true });
        
        i += 2; // Skip both merged tiles
      } else {
        // No merge, just move tile
        result.push(line[i]);
        i++;
      }
    }
    
    // Pad with zeros to maintain line size
    while (result.length < this.size) {
      result.push(0);
    }
    
    return result;
  }
  
  /**
   * Check if 2048 tile exists (win condition)
   * @returns {boolean} True if 2048 tile exists
   */
  hasWinningTile() {
    for (let row = 0; row < this.size; row++) {
      for (let col = 0; col < this.size; col++) {
        if (this.board[row][col] >= 2048) {
          return true;
        }
      }
    }
    return false;
  }
  
  /**
   * Get the highest tile value on the board
   * @returns {number} Highest tile value
   */
  getHighestTile() {
    let highest = 0;
    for (let row = 0; row < this.size; row++) {
      for (let col = 0; col < this.size; col++) {
        highest = Math.max(highest, this.board[row][col]);
      }
    }
    return highest;
  }
  
  /**
   * Clone the current board state
   * @returns {Array} Deep copy of the board
   */
  cloneBoard() {
    return this.board.map(row => [...row]);
  }
  
  /**
   * Reset the game to initial state
   */
  reset() {
    this.initializeBoard();
    this.score = 0;
    this.moves = 0;
    this.gameState = 'playing';
    this.mergedTiles.clear();
    this.animationInProgress = false;
    
    // Add initial tiles
    this.addRandomTile();
    this.addRandomTile();
  }
  
  /**
   * Update game state based on current board
   */
  updateGameState() {
    if (this.gameState === 'over') return;
    
    // Check for win condition (only trigger once)
    if (this.hasWinningTile() && this.gameState === 'playing') {
      this.gameState = 'won';
      return;
    }
    
    // Check for game over
    if (this.isGameOver()) {
      this.gameState = 'over';
      return;
    }
    
    // Game continues
    if (this.gameState === 'won') {
      // Player can continue after winning
      this.gameState = 'won-continue';
    }
  }
  
  /**
   * Get board state as flat array (useful for AI)
   * @returns {Array} Flattened board array
   */
  getBoardState() {
    return this.board.flat();
  }
  
  /**
   * Set board state from flat array
   * @param {Array} state - Flattened board array
   */
  setBoardState(state) {
    if (state.length !== this.size * this.size) {
      throw new Error('Invalid board state length');
    }
    
    for (let i = 0; i < state.length; i++) {
      const row = Math.floor(i / this.size);
      const col = i % this.size;
      this.board[row][col] = state[i];
    }
  }
  
  /**
   * Get game statistics
   * @returns {Object} Game statistics
   */
  getStats() {
    return {
      score: this.score,
      bestScore: this.bestScore,
      moves: this.moves,
      gameState: this.gameState,
      highestTile: this.getHighestTile(),
      emptyCells: this.getEmptyCells().length,
      canMove: this.hasValidMoves()
    };
  }
  
  /**
   * Save best score using unified data manager
   */
  saveBestScore() {
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      this.dataManager.setData('bestScore', this.bestScore.toString());
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Game2048Core;
}

// Make available globally
window.Game2048Core = Game2048Core;
