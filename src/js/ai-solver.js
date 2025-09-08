/**
 * Fancy2048 - AI Solver
 * Advanced AI implementation using Expectimax algorithm with heuristics
 */

class AISolver {
  constructor(gameEngine) {
    this.gameEngine = gameEngine;
    this.difficulty = 'medium';
    this.maxDepth = 4;
    this.isThinking = false;
    
    // Difficulty settings
    this.difficultySettings = {
      easy: { depth: 2, randomness: 0.3 },
      medium: { depth: 4, randomness: 0.15 },
      hard: { depth: 6, randomness: 0.05 },
      expert: { depth: 8, randomness: 0.01 }
    };
    
    // Precomputed weights for position evaluation
    this.positionWeights = this.generatePositionWeights();
    
    // Cache for board evaluations
    this.evaluationCache = new Map();
    this.maxCacheSize = 10000;
  }

  /**
   * Set AI difficulty
   */
  setDifficulty(difficulty) {
    if (this.difficultySettings[difficulty]) {
      this.difficulty = difficulty;
      this.maxDepth = this.difficultySettings[difficulty].depth;
      this.evaluationCache.clear();
    }
  }

  /**
   * Get best move using Expectimax algorithm
   */
  async getBestMove() {
    if (this.isThinking) return null;
    
    this.isThinking = true;
    
    try {
      const board = this.gameEngine.board;
      const possibleMoves = this.getPossibleMoves(board);
      
      if (possibleMoves.length === 0) {
        return null;
      }
      
      let bestMove = null;
      let bestScore = -Infinity;
      
      // Evaluate each possible move
      for (const move of possibleMoves) {
        const score = await this.expectimax(move.board, this.maxDepth - 1, false);
        
        // Add some randomness for lower difficulties
        const randomFactor = this.difficultySettings[this.difficulty].randomness;
        const adjustedScore = score + (Math.random() - 0.5) * randomFactor * score;
        
        if (adjustedScore > bestScore) {
          bestScore = adjustedScore;
          bestMove = move.direction;
        }
      }
      
      return bestMove;
    } finally {
      this.isThinking = false;
    }
  }

  /**
   * Expectimax algorithm implementation
   */
  async expectimax(board, depth, isMaximizing) {
    // Yield control periodically to prevent blocking
    if (depth % 2 === 0) {
      await Utils.sleep(0);
    }
    
    // Base case
    if (depth === 0) {
      return this.evaluateBoard(board);
    }
    
    if (isMaximizing) {
      // Player's turn - maximize score
      const possibleMoves = this.getPossibleMoves(board);
      
      if (possibleMoves.length === 0) {
        return this.evaluateBoard(board);
      }
      
      let maxScore = -Infinity;
      
      for (const move of possibleMoves) {
        const score = await this.expectimax(move.board, depth - 1, false);
        maxScore = Math.max(maxScore, score);
      }
      
      return maxScore;
    } else {
      // Random tile placement - calculate expected value
      const emptyCells = this.getEmptyCells(board);
      
      if (emptyCells.length === 0) {
        return this.evaluateBoard(board);
      }
      
      let expectedScore = 0;
      const totalCells = emptyCells.length;
      
      // Consider placing both 2 and 4 tiles in each empty cell
      for (const cell of emptyCells) {
        // 90% chance of 2, 10% chance of 4
        for (const value of [2, 4]) {
          const probability = value === 2 ? 0.9 : 0.1;
          const newBoard = this.placeTile(board, cell.row, cell.col, value);
          const score = await this.expectimax(newBoard, depth - 1, true);
          expectedScore += (probability / totalCells) * score;
        }
      }
      
      return expectedScore;
    }
  }

  /**
   * Evaluate board position using multiple heuristics
   */
  evaluateBoard(board) {
    const boardKey = this.getBoardKey(board);
    
    if (this.evaluationCache.has(boardKey)) {
      return this.evaluationCache.get(boardKey);
    }
    
    const size = board.length;
    let score = 0;
    
    // 1. Weighted position score (corner strategy)
    score += this.evaluatePositions(board) * 1.0;
    
    // 2. Monotonicity (tiles should be arranged in order)
    score += this.evaluateMonotonicity(board) * 1.2;
    
    // 3. Smoothness (adjacent tiles should be similar)
    score += this.evaluateSmoothness(board) * 0.1;
    
    // 4. Empty cells (more empty cells = better)
    score += this.evaluateEmptyCells(board) * 2.7;
    
    // 5. Max tile position (prefer corners)
    score += this.evaluateMaxTilePosition(board) * 1.0;
    
    // Cache the result
    if (this.evaluationCache.size >= this.maxCacheSize) {
      this.evaluationCache.clear();
    }
    this.evaluationCache.set(boardKey, score);
    
    return score;
  }

  /**
   * Generate position weights matrix (higher values for corners/edges)
   */
  generatePositionWeights() {
    const weights = [];
    const size = 4; // Default size, will adapt to board size
    
    for (let i = 0; i < size; i++) {
      weights[i] = [];
      for (let j = 0; j < size; j++) {
        // Higher weights for corners and edges
        const edgeDistance = Math.min(Math.min(i, size - 1 - i), Math.min(j, size - 1 - j));
        weights[i][j] = Math.pow(size - edgeDistance, 2);
      }
    }
    
    return weights;
  }

  /**
   * Evaluate position-based score
   */
  evaluatePositions(board) {
    let score = 0;
    const size = board.length;
    
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        if (board[i][j] > 0) {
          const positionWeight = this.getPositionWeight(i, j, size);
          score += board[i][j] * Math.log2(board[i][j]) * positionWeight;
        }
      }
    }
    
    return score;
  }

  /**
   * Get position weight for coordinates
   */
  getPositionWeight(row, col, size) {
    const edgeDistance = Math.min(Math.min(row, size - 1 - row), Math.min(col, size - 1 - col));
    return Math.pow(size - edgeDistance, 1.5);
  }

  /**
   * Evaluate monotonicity (tiles should be in ascending/descending order)
   */
  evaluateMonotonicity(board) {
    const size = board.length;
    let score = 0;
    
    // Check rows and columns for monotonicity
    for (let i = 0; i < size; i++) {
      // Row monotonicity
      score += this.getMonotonicityScore(board[i]);
      
      // Column monotonicity
      const column = board.map(row => row[i]);
      score += this.getMonotonicityScore(column);
    }
    
    return score;
  }

  /**
   * Get monotonicity score for an array
   */
  getMonotonicityScore(array) {
    let increasing = 0;
    let decreasing = 0;
    
    for (let i = 0; i < array.length - 1; i++) {
      const current = array[i] > 0 ? Math.log2(array[i]) : 0;
      const next = array[i + 1] > 0 ? Math.log2(array[i + 1]) : 0;
      
      if (current > next) {
        decreasing += current - next;
      } else if (current < next) {
        increasing += next - current;
      }
    }
    
    return -Math.min(increasing, decreasing);
  }

  /**
   * Evaluate smoothness (penalty for large differences between adjacent tiles)
   */
  evaluateSmoothness(board) {
    const size = board.length;
    let smoothness = 0;
    
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        if (board[i][j] > 0) {
          const currentLog = Math.log2(board[i][j]);
          
          // Check right neighbor
          if (j < size - 1 && board[i][j + 1] > 0) {
            const rightLog = Math.log2(board[i][j + 1]);
            smoothness -= Math.abs(currentLog - rightLog);
          }
          
          // Check bottom neighbor
          if (i < size - 1 && board[i + 1][j] > 0) {
            const bottomLog = Math.log2(board[i + 1][j]);
            smoothness -= Math.abs(currentLog - bottomLog);
          }
        }
      }
    }
    
    return smoothness;
  }

  /**
   * Evaluate empty cells (more empty cells = better)
   */
  evaluateEmptyCells(board) {
    const emptyCells = this.getEmptyCells(board);
    return Math.pow(emptyCells.length, 2);
  }

  /**
   * Evaluate max tile position (prefer corners for highest tile)
   */
  evaluateMaxTilePosition(board) {
    const size = board.length;
    let maxTile = 0;
    let maxRow = -1;
    let maxCol = -1;
    
    // Find the maximum tile
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        if (board[i][j] > maxTile) {
          maxTile = board[i][j];
          maxRow = i;
          maxCol = j;
        }
      }
    }
    
    if (maxTile === 0) return 0;
    
    // Reward corner positions for max tile
    const isCorner = (maxRow === 0 || maxRow === size - 1) && 
                     (maxCol === 0 || maxCol === size - 1);
    
    const isEdge = maxRow === 0 || maxRow === size - 1 || 
                   maxCol === 0 || maxCol === size - 1;
    
    if (isCorner) {
      return maxTile * 2;
    } else if (isEdge) {
      return maxTile;
    } else {
      return 0;
    }
  }

  /**
   * Get all possible moves from current board state
   */
  getPossibleMoves(board) {
    const moves = [];
    const directions = ['up', 'down', 'left', 'right'];
    
    for (const direction of directions) {
      const newBoard = this.simulateMove(board, direction);
      if (!this.boardsEqual(board, newBoard)) {
        moves.push({
          direction,
          board: newBoard
        });
      }
    }
    
    return moves;
  }

  /**
   * Simulate a move without affecting the actual game
   */
  simulateMove(board, direction) {
    const size = board.length;
    const newBoard = board.map(row => [...row]);
    
    switch (direction) {
      case 'up':
        return this.simulateMoveUp(newBoard);
      case 'down':
        return this.simulateMoveDown(newBoard);
      case 'left':
        return this.simulateMoveLeft(newBoard);
      case 'right':
        return this.simulateMoveRight(newBoard);
      default:
        return newBoard;
    }
  }

  /**
   * Simulate move up
   */
  simulateMoveUp(board) {
    const size = board.length;
    
    for (let col = 0; col < size; col++) {
      const column = board.map(row => row[col]);
      const newColumn = this.moveAndMergeArray(column);
      
      for (let row = 0; row < size; row++) {
        board[row][col] = newColumn[row];
      }
    }
    
    return board;
  }

  /**
   * Simulate move down
   */
  simulateMoveDown(board) {
    const size = board.length;
    
    for (let col = 0; col < size; col++) {
      const column = board.map(row => row[col]);
      const reversedColumn = [...column].reverse();
      const newReversedColumn = this.moveAndMergeArray(reversedColumn);
      const newColumn = [...newReversedColumn].reverse();
      
      for (let row = 0; row < size; row++) {
        board[row][col] = newColumn[row];
      }
    }
    
    return board;
  }

  /**
   * Simulate move left
   */
  simulateMoveLeft(board) {
    const size = board.length;
    
    for (let row = 0; row < size; row++) {
      board[row] = this.moveAndMergeArray([...board[row]]);
    }
    
    return board;
  }

  /**
   * Simulate move right
   */
  simulateMoveRight(board) {
    const size = board.length;
    
    for (let row = 0; row < size; row++) {
      const reversedRow = [...board[row]].reverse();
      const newReversedRow = this.moveAndMergeArray(reversedRow);
      board[row] = [...newReversedRow].reverse();
    }
    
    return board;
  }

  /**
   * Move and merge array (same algorithm as GameEngine)
   */
  moveAndMergeArray(array) {
    const size = array.length;
    const filtered = array.filter(val => val !== 0);
    const result = [];
    let i = 0;
    
    while (i < filtered.length) {
      if (i < filtered.length - 1 && filtered[i] === filtered[i + 1]) {
        result.push(filtered[i] * 2);
        i += 2;
      } else {
        result.push(filtered[i]);
        i++;
      }
    }
    
    while (result.length < size) {
      result.push(0);
    }
    
    return result;
  }

  /**
   * Get empty cells from board
   */
  getEmptyCells(board) {
    const emptyCells = [];
    const size = board.length;
    
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        if (board[i][j] === 0) {
          emptyCells.push({ row: i, col: j });
        }
      }
    }
    
    return emptyCells;
  }

  /**
   * Place tile on board (returns new board)
   */
  placeTile(board, row, col, value) {
    const newBoard = board.map(row => [...row]);
    newBoard[row][col] = value;
    return newBoard;
  }

  /**
   * Check if two boards are equal
   */
  boardsEqual(board1, board2) {
    const size = board1.length;
    
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        if (board1[i][j] !== board2[i][j]) {
          return false;
        }
      }
    }
    
    return true;
  }

  /**
   * Generate unique key for board state (for caching)
   */
  getBoardKey(board) {
    return board.map(row => row.join(',')).join(';');
  }

  /**
   * Get hint for next best move
   */
  async getHint() {
    const bestMove = await this.getBestMove();
    return bestMove;
  }

  /**
   * Clear evaluation cache
   */
  clearCache() {
    this.evaluationCache.clear();
  }

  /**
   * Get AI statistics
   */
  getStats() {
    return {
      difficulty: this.difficulty,
      maxDepth: this.maxDepth,
      cacheSize: this.evaluationCache.size,
      isThinking: this.isThinking
    };
  }
}

// Make AISolver available globally
if (typeof window !== 'undefined') {
  window.AISolver = AISolver;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AISolver;
}
