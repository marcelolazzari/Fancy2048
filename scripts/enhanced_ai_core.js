/**
 * Enhanced AI Core System for 2048 Game
 * Implements advanced AI algorithms with proper game logic integration
 */

class Enhanced2048AICore {
  constructor(gameCore) {
    this.gameCore = gameCore;
    this.searchDepth = 6;
    this.evaluationWeights = {
      score: 1.0,
      emptyCells: 2.0,
      monotonicity: 1.5,
      smoothness: 0.1,
      maxTile: 1.0,
      edgeBonus: 0.5
    };
    
    // Performance tracking
    this.movesEvaluated = 0;
    this.lastMoveTime = 0;
    this.difficulty = 'expert'; // 'easy', 'medium', 'hard', 'expert'
  }
  
  /**
   * Get the best move using minimax with alpha-beta pruning
   * @returns {string|null} Best direction or null if no moves possible
   */
  getBestMove() {
    const startTime = performance.now();
    this.movesEvaluated = 0;
    
    if (!this.gameCore.hasValidMoves()) {
      return null;
    }
    
    const directions = ['up', 'down', 'left', 'right'];
    const validMoves = directions.filter(dir => 
      this.gameCore.canMoveInDirection(dir)
    );
    
    if (validMoves.length === 0) return null;
    if (validMoves.length === 1) return validMoves[0];
    
    let bestMove = validMoves[0];
    let bestScore = -Infinity;
    
    // Evaluate each possible move
    for (const direction of validMoves) {
      const originalBoard = this.gameCore.cloneBoard();
      const originalScore = this.gameCore.score;
      
      // Make the move
      const moveResult = this.gameCore.makeMove(direction);
      
      if (moveResult.moved) {
        // Add a random tile (simulate)
        this.gameCore.addRandomTile();
        
        // Evaluate resulting position
        const score = this.minimax(this.searchDepth - 1, -Infinity, Infinity, false);
        
        if (score > bestScore) {
          bestScore = score;
          bestMove = direction;
        }
      }
      
      // Restore game state
      this.gameCore.board = originalBoard;
      this.gameCore.score = originalScore;
    }
    
    this.lastMoveTime = performance.now() - startTime;
    
    return bestMove;
  }
  
  /**
   * Minimax algorithm with alpha-beta pruning
   * @param {number} depth - Search depth remaining
   * @param {number} alpha - Alpha value for pruning
   * @param {number} beta - Beta value for pruning
   * @param {boolean} isPlayerTurn - True if player's turn, false if computer's turn
   * @returns {number} Evaluation score
   */
  minimax(depth, alpha, beta, isPlayerTurn) {
    this.movesEvaluated++;
    
    if (depth === 0 || this.gameCore.isGameOver()) {
      return this.evaluateBoard();
    }
    
    if (isPlayerTurn) {
      // Player's turn - maximize
      let maxEval = -Infinity;
      const directions = ['up', 'down', 'left', 'right'];
      
      for (const direction of directions) {
        if (!this.gameCore.canMoveInDirection(direction)) continue;
        
        const originalBoard = this.gameCore.cloneBoard();
        const originalScore = this.gameCore.score;
        
        const moveResult = this.gameCore.makeMove(direction);
        
        if (moveResult.moved) {
          const evaluation = this.minimax(depth - 1, alpha, beta, false);
          maxEval = Math.max(maxEval, evaluation);
          alpha = Math.max(alpha, evaluation);
          
          // Restore state
          this.gameCore.board = originalBoard;
          this.gameCore.score = originalScore;
          
          if (beta <= alpha) break; // Alpha-beta pruning
        } else {
          // Restore state
          this.gameCore.board = originalBoard;
          this.gameCore.score = originalScore;
        }
      }
      
      return maxEval;
    } else {
      // Computer's turn (add random tile) - minimize
      let minEval = Infinity;
      const emptyCells = this.gameCore.getEmptyCells();
      
      if (emptyCells.length === 0) {
        return this.evaluateBoard();
      }
      
      // Limit evaluation to most promising cells for performance
      const cellsToEvaluate = emptyCells.length > 6 ? 
        this.getPromissingCells(emptyCells, 6) : 
        emptyCells;
      
      for (const cell of cellsToEvaluate) {
        for (const value of [2, 4]) {
          const originalValue = this.gameCore.board[cell.row][cell.col];
          this.gameCore.board[cell.row][cell.col] = value;
          
          const evaluation = this.minimax(depth - 1, alpha, beta, true);
          minEval = Math.min(minEval, evaluation);
          beta = Math.min(beta, evaluation);
          
          // Restore state
          this.gameCore.board[cell.row][cell.col] = originalValue;
          
          if (beta <= alpha) break; // Alpha-beta pruning
        }
        
        if (beta <= alpha) break;
      }
      
      return minEval;
    }
  }
  
  /**
   * Evaluate the current board position
   * @returns {number} Board evaluation score
   */
  evaluateBoard() {
    if (this.gameCore.isGameOver()) {
      return -100000; // Very bad score for game over
    }
    
    const weights = this.evaluationWeights;
    let score = 0;
    
    // Score component
    score += this.gameCore.score * weights.score;
    
    // Empty cells component (more empty cells = better)
    const emptyCells = this.gameCore.getEmptyCells().length;
    score += emptyCells * emptyCells * weights.emptyCells;
    
    // Monotonicity component
    score += this.getMonotonicity() * weights.monotonicity;
    
    // Smoothness component
    score += this.getSmoothness() * weights.smoothness;
    
    // Max tile component
    score += Math.log2(this.gameCore.getHighestTile()) * weights.maxTile;
    
    // Edge bonus (highest tile should be on edge)
    score += this.getEdgeBonus() * weights.edgeBonus;
    
    return score;
  }
  
  /**
   * Calculate monotonicity of the board
   * @returns {number} Monotonicity score
   */
  getMonotonicity() {
    const board = this.gameCore.board;
    let monotonicity = 0;
    
    // Check rows
    for (let row = 0; row < this.gameCore.size; row++) {
      let increasing = 0;
      let decreasing = 0;
      
      for (let col = 0; col < this.gameCore.size - 1; col++) {
        const current = board[row][col];
        const next = board[row][col + 1];
        
        if (current > next) {
          decreasing += Math.log2(current) - Math.log2(next || 1);
        } else if (current < next) {
          increasing += Math.log2(next) - Math.log2(current || 1);
        }
      }
      
      monotonicity += Math.max(increasing, decreasing);
    }
    
    // Check columns
    for (let col = 0; col < this.gameCore.size; col++) {
      let increasing = 0;
      let decreasing = 0;
      
      for (let row = 0; row < this.gameCore.size - 1; row++) {
        const current = board[row][col];
        const next = board[row + 1][col];
        
        if (current > next) {
          decreasing += Math.log2(current) - Math.log2(next || 1);
        } else if (current < next) {
          increasing += Math.log2(next) - Math.log2(current || 1);
        }
      }
      
      monotonicity += Math.max(increasing, decreasing);
    }
    
    return monotonicity;
  }
  
  /**
   * Calculate smoothness of the board
   * @returns {number} Smoothness score (higher = smoother)
   */
  getSmoothness() {
    const board = this.gameCore.board;
    let smoothness = 0;
    
    for (let row = 0; row < this.gameCore.size; row++) {
      for (let col = 0; col < this.gameCore.size; col++) {
        if (board[row][col] === 0) continue;
        
        const currentValue = Math.log2(board[row][col]);
        
        // Check right neighbor
        if (col < this.gameCore.size - 1 && board[row][col + 1] !== 0) {
          const rightValue = Math.log2(board[row][col + 1]);
          smoothness -= Math.abs(currentValue - rightValue);
        }
        
        // Check down neighbor
        if (row < this.gameCore.size - 1 && board[row + 1][col] !== 0) {
          const downValue = Math.log2(board[row + 1][col]);
          smoothness -= Math.abs(currentValue - downValue);
        }
      }
    }
    
    return smoothness;
  }
  
  /**
   * Calculate edge bonus (reward for keeping high tiles on edges)
   * @returns {number} Edge bonus score
   */
  getEdgeBonus() {
    const board = this.gameCore.board;
    let bonus = 0;
    const size = this.gameCore.size;
    
    // Corners get highest bonus
    const corners = [
      board[0][0], board[0][size-1],
      board[size-1][0], board[size-1][size-1]
    ];
    
    for (const value of corners) {
      if (value > 0) {
        bonus += Math.log2(value) * 4;
      }
    }
    
    // Edges get medium bonus
    for (let i = 1; i < size - 1; i++) {
      const edges = [
        board[0][i], board[i][0],
        board[size-1][i], board[i][size-1]
      ];
      
      for (const value of edges) {
        if (value > 0) {
          bonus += Math.log2(value) * 2;
        }
      }
    }
    
    return bonus;
  }
  
  /**
   * Get most promising empty cells for evaluation
   * @param {Array} emptyCells - Array of empty cell positions
   * @param {number} limit - Maximum number of cells to return
   * @returns {Array} Most promising cells
   */
  getPromissingCells(emptyCells, limit) {
    if (emptyCells.length <= limit) {
      return emptyCells;
    }
    
    // Score cells based on their strategic value
    const scoredCells = emptyCells.map(cell => {
      let score = 0;
      
      // Prefer corners
      if ((cell.row === 0 || cell.row === this.gameCore.size - 1) &&
          (cell.col === 0 || cell.col === this.gameCore.size - 1)) {
        score += 100;
      }
      
      // Prefer edges
      if (cell.row === 0 || cell.row === this.gameCore.size - 1 ||
          cell.col === 0 || cell.col === this.gameCore.size - 1) {
        score += 50;
      }
      
      // Prefer cells near high-value tiles
      const neighbors = this.getNeighbors(cell);
      for (const neighbor of neighbors) {
        if (neighbor.value > 0) {
          score += Math.log2(neighbor.value);
        }
      }
      
      return { cell, score };
    });
    
    // Sort by score and return top cells
    scoredCells.sort((a, b) => b.score - a.score);
    return scoredCells.slice(0, limit).map(item => item.cell);
  }
  
  /**
   * Get neighboring cells and their values
   * @param {Object} cell - Cell position {row, col}
   * @returns {Array} Array of neighbor objects with values
   */
  getNeighbors(cell) {
    const neighbors = [];
    const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    
    for (const [dRow, dCol] of directions) {
      const newRow = cell.row + dRow;
      const newCol = cell.col + dCol;
      
      if (newRow >= 0 && newRow < this.gameCore.size &&
          newCol >= 0 && newCol < this.gameCore.size) {
        neighbors.push({
          row: newRow,
          col: newCol,
          value: this.gameCore.board[newRow][newCol]
        });
      }
    }
    
    return neighbors;
  }
  
  /**
   * Adjust AI difficulty
   * @param {string} difficulty - 'easy', 'medium', 'hard', 'expert'
   */
  setDifficulty(difficulty) {
    this.difficulty = difficulty;
    
    switch (difficulty) {
      case 'easy':
        this.searchDepth = 2;
        this.evaluationWeights.emptyCells = 1.0;
        break;
      case 'medium':
        this.searchDepth = 4;
        this.evaluationWeights.emptyCells = 1.5;
        break;
      case 'hard':
        this.searchDepth = 6;
        this.evaluationWeights.emptyCells = 2.0;
        break;
      case 'expert':
        this.searchDepth = 8;
        this.evaluationWeights.emptyCells = 2.5;
        break;
      default:
        console.warn('Unknown difficulty level:', difficulty);
    }
  }
  
  /**
   * Get AI performance statistics
   * @returns {Object} Performance stats
   */
  getPerformanceStats() {
    return {
      difficulty: this.difficulty,
      searchDepth: this.searchDepth,
      movesEvaluated: this.movesEvaluated,
      lastMoveTime: this.lastMoveTime,
      evaluationWeights: { ...this.evaluationWeights }
    };
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Enhanced2048AICore;
}

// Make available globally
window.Enhanced2048AICore = Enhanced2048AICore;
