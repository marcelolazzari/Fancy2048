/**
 * Fancy2048 - Advanced AI Solver
 * Implementation based on state-of-the-art 2048 AI algorithms
 * References:
 * - https://maartenbaert.github.io/2048/ (Expectimax with optimizations)
 * - https://aj-r.github.io/2048-AI/ (Multiple algorithms comparison)
 * - https://www.game-2048.com/ai-2048 (Monte Carlo approach)
 */

class AISolver {
  constructor(gameEngine) {
    this.gameEngine = gameEngine;
    this.difficulty = 'medium';
    this.algorithm = 'expectimax'; // expectimax, montecarlo, priority, smart
    this.isThinking = false;
    
    // Algorithm-specific settings optimized for performance
    this.algorithms = {
      expectimax: {
        easy: { depth: 4, randomness: 0.1, cacheSize: 10000 },
        medium: { depth: 5, randomness: 0.05, cacheSize: 25000 },
        hard: { depth: 6, randomness: 0.02, cacheSize: 50000 },
        expert: { depth: 7, randomness: 0.01, cacheSize: 100000 }
      },
      montecarlo: {
        easy: { trials: 50, depth: 8, randomness: 0.2 },
        medium: { trials: 100, depth: 10, randomness: 0.1 },
        hard: { trials: 200, depth: 12, randomness: 0.05 },
        expert: { trials: 500, depth: 15, randomness: 0.02 }
      },
      priority: {
        easy: { lookahead: 2, cornerWeight: 1.0 },
        medium: { lookahead: 3, cornerWeight: 1.2 },
        hard: { lookahead: 4, cornerWeight: 1.5 },
        expert: { lookahead: 5, cornerWeight: 2.0 }
      },
      smart: {
        easy: { depth: 3, mcTrials: 25, hybridWeight: 0.3 },
        medium: { depth: 4, mcTrials: 50, hybridWeight: 0.4 },
        hard: { depth: 5, mcTrials: 100, hybridWeight: 0.5 },
        expert: { depth: 6, mcTrials: 200, hybridWeight: 0.6 }
      }
    };
    
    // Caching system
    this.evaluationCache = new Map();
    this.moveCache = new Map();
    this.maxCacheSize = 50000;
    
    // Performance tracking and statistics
    this.stats = {
      evaluations: 0,
      cacheHits: 0,
      totalThinkingTime: 0,
      movesCalculated: 0
    };
    
    // Snake pattern weights for monotonicity
    this.snakeWeights = this.generateSnakeWeights();
    
    // Initialize evaluation weights
    this.initializeWeights();
  }

  /**
   * Set AI difficulty and optimize parameters
   */
  setDifficulty(difficulty) {
    if (this.algorithms.expectimax[difficulty]) {
      this.difficulty = difficulty;
      this.clearCache();
    }
  }

  /**
   * Get the best move using current algorithm and difficulty
   */
  async getBestMove() {
    if (this.isThinking) {
      return null;
    }
    
    this.isThinking = true;
    const startTime = Date.now();
    
    try {
      const board = this.gameEngine.board;
      
      // Quick validation
      if (!board || !Array.isArray(board)) {
        throw new Error('Invalid board state');
      }
      
      // Get possible moves
      const possibleMoves = this.getPossibleMoves(board);
      
      if (possibleMoves.length === 0) {
        return null;
      }
      
      // Single move optimization
      if (possibleMoves.length === 1) {
        return possibleMoves[0].direction;
      }
      
      let bestMove = null;
      
      // Use the selected algorithm
      switch (this.algorithm) {
        case 'expectimax':
          bestMove = await this.expectimaxSearch(possibleMoves);
          break;
        case 'montecarlo':
          bestMove = await this.monteCarloSearch(possibleMoves);
          break;
        case 'priority':
          bestMove = await this.priorityBasedSearch(possibleMoves);
          break;
        case 'smart':
          bestMove = await this.smartHybridSearch(possibleMoves);
          break;
        default:
          bestMove = await this.expectimaxSearch(possibleMoves);
      }
      
      // Cache the result
      const settings = this.algorithms[this.algorithm][this.difficulty];
      if (settings.cacheSize && this.moveCache.size < settings.cacheSize) {
        const boardKey = this.getBoardKey(board);
        this.moveCache.set(boardKey, bestMove);
      }
      
      // Update stats
      this.stats.movesCalculated++;
      this.stats.totalThinkingTime += Date.now() - startTime;
      
      return bestMove || possibleMoves[0].direction;
      
    } catch (error) {
      console.error('AI Error:', error);
      // Intelligent fallback based on corner strategy
      const possibleMoves = this.getPossibleMoves(this.gameEngine.board);
      if (possibleMoves.length > 0) {
        return this.getCornerBasedMove(possibleMoves);
      }
      return null;
    } finally {
      this.isThinking = false;
    }
  }

  /**
   * Expectimax search algorithm - based on Maarten Baert's implementation
   */
  async expectimaxSearch(possibleMoves) {
    const settings = this.algorithms.expectimax[this.difficulty];
    let bestMove = null;
    let bestScore = -Infinity;
    
    for (const move of possibleMoves) {
      const score = await this.expectimax(move.board, settings.depth, false);
      
      // Add small randomness for variety
      const randomizedScore = score + (Math.random() - 0.5) * settings.randomness * score;
      
      if (randomizedScore > bestScore) {
        bestScore = randomizedScore;
        bestMove = move.direction;
      }
      
      // Yield control periodically
      await this.yieldControl();
    }
    
    return bestMove;
  }

  /**
   * Core Expectimax algorithm with alpha-beta pruning
   */
  async expectimax(board, depth, isPlayerTurn, alpha = -Infinity, beta = Infinity) {
    this.stats.evaluations++;
    
    // Base case
    if (depth === 0) {
      return this.evaluateBoard(board);
    }
    
    // Check cache
    const cacheKey = this.getBoardKey(board) + '_' + depth + '_' + isPlayerTurn;
    if (this.evaluationCache.has(cacheKey)) {
      this.stats.cacheHits++;
      return this.evaluationCache.get(cacheKey);
    }
    
    let result;
    
    if (isPlayerTurn) {
      // Player's turn - maximize
      result = -Infinity;
      const moves = this.getPossibleMoves(board);
      
      if (moves.length === 0) {
        result = this.evaluateBoard(board); // Game over
      } else {
        for (const move of moves) {
          const score = await this.expectimax(move.board, depth - 1, false, alpha, beta);
          result = Math.max(result, score);
          alpha = Math.max(alpha, result);
          
          if (beta <= alpha) {
            break; // Alpha-beta pruning
          }
        }
      }
    } else {
      // Computer's turn - calculate expectation
      result = 0;
      const emptyCells = this.getEmptyCells(board);
      
      if (emptyCells.length === 0) {
        result = this.evaluateBoard(board); // Board full
      } else {
        for (const cell of emptyCells) {
          // 90% chance of 2, 10% chance of 4
          const board2 = this.copyBoard(board);
          const board4 = this.copyBoard(board);
          
          board2[cell.row][cell.col] = 2;
          board4[cell.row][cell.col] = 4;
          
          const score2 = await this.expectimax(board2, depth - 1, true, alpha, beta);
          const score4 = await this.expectimax(board4, depth - 1, true, alpha, beta);
          
          result += (0.9 * score2 + 0.1 * score4) / emptyCells.length;
        }
      }
    }
    
    // Cache result
    if (this.evaluationCache.size < this.algorithms.expectimax[this.difficulty].cacheSize) {
      this.evaluationCache.set(cacheKey, result);
    }
    
    return result;
  }

  /**
   * Monte Carlo search algorithm
   */
  async monteCarloSearch(possibleMoves) {
    const settings = this.algorithms.montecarlo[this.difficulty];
    let bestMove = null;
    let bestScore = -Infinity;
    
    for (const move of possibleMoves) {
      let totalScore = 0;
      
      for (let trial = 0; trial < settings.trials; trial++) {
        const score = await this.simulateRandomGame(move.board, settings.depth);
        totalScore += score;
        
        if (trial % 10 === 0) await this.yieldControl();
      }
      
      const averageScore = totalScore / settings.trials;
      
      if (averageScore > bestScore) {
        bestScore = averageScore;
        bestMove = move.direction;
      }
    }
    
    return bestMove;
  }

  /**
   * Priority-based search algorithm
   */
  async priorityBasedSearch(possibleMoves) {
    const settings = this.algorithms.priority[this.difficulty];
    let bestMove = null;
    let bestScore = -Infinity;
    
    for (const move of possibleMoves) {
      const score = this.evaluateBoard(move.board) * settings.cornerWeight;
      
      if (score > bestScore) {
        bestScore = score;
        bestMove = move.direction;
      }
    }
    
    return bestMove;
  }

  /**
   * Smart hybrid search combining multiple approaches
   */
  async smartHybridSearch(possibleMoves) {
    const settings = this.algorithms.smart[this.difficulty];
    let bestMove = null;
    let bestScore = -Infinity;
    
    for (const move of possibleMoves) {
      // Combine expectimax and monte carlo
      const expectimaxScore = await this.expectimax(move.board, settings.depth, false);
      const mcScore = await this.simulateRandomGame(move.board, settings.depth);
      
      const hybridScore = expectimaxScore * settings.hybridWeight + 
                         mcScore * (1 - settings.hybridWeight);
      
      if (hybridScore > bestScore) {
        bestScore = hybridScore;
        bestMove = move.direction;
      }
      
      await this.yieldControl();
    }
    
    return bestMove;
  }

  /**
   * Simulate a random game from the given position
   */
  async simulateRandomGame(board, maxMoves = 50) {
    let currentBoard = this.copyBoard(board);
    let moves = 0;
    
    while (moves < maxMoves) {
      const possibleMoves = this.getPossibleMoves(currentBoard);
      if (possibleMoves.length === 0) break;
      
      // Choose random move
      const randomMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
      currentBoard = randomMove.board;
      
      // Add random tile
      if (!this.addRandomTileToBoard(currentBoard)) break;
      
      moves++;
    }
    
    return this.evaluateBoard(currentBoard);
  }

  /**
   * Board evaluation using advanced heuristics
   */
  evaluateBoard(board) {
    let score = 0;
    
    // 1. Snake pattern evaluation (heavily weighted)
    score += this.evaluateSnakePattern(board) * this.weights.snakePattern;
    
    // 2. Corner strategy with gradient
    score += this.evaluateCornerGradient(board) * this.weights.cornerGradient;
    
    // 3. Monotonicity in multiple directions
    score += this.evaluateMonotonicity(board) * this.weights.monotonicity;
    
    // 4. Smoothness
    score += this.evaluateSmoothness(board) * this.weights.smoothness;
    
    // 5. Empty cells with exponential reward
    score += this.evaluateEmptySpaces(board) * this.weights.emptySpaces;
    
    // 6. Merge potential
    score += this.evaluateMergePotential(board) * this.weights.mergePotential;
    
    return score;
  }

  /**
   * Initialize evaluation weights
   */
  initializeWeights() {
    this.weights = {
      snakePattern: 10.0,
      cornerGradient: 8.0,
      monotonicity: 5.0,
      smoothness: 3.0,
      emptySpaces: 15.0,
      mergePotential: 4.0
    };
  }

  /**
   * Generate snake pattern weights for optimal tile arrangement
   */
  generateSnakeWeights() {
    return {
      topLeft: [
        [15, 14, 13, 12],
        [8,  9,  10, 11],
        [7,  6,  5,  4],
        [0,  1,  2,  3]
      ],
      topRight: [
        [12, 13, 14, 15],
        [11, 10, 9,  8],
        [4,  5,  6,  7],
        [3,  2,  1,  0]
      ],
      bottomLeft: [
        [0,  1,  2,  3],
        [7,  6,  5,  4],
        [8,  9,  10, 11],
        [15, 14, 13, 12]
      ],
      bottomRight: [
        [3,  2,  1,  0],
        [4,  5,  6,  7],
        [11, 10, 9,  8],
        [12, 13, 14, 15]
      ]
    };
  }

  /**
   * Evaluate snake pattern (optimal tile arrangement)
   */
  evaluateSnakePattern(board) {
    const size = board.length;
    
    // Check multiple snake patterns
    const patterns = [
      this.snakeWeights.topLeft,
      this.snakeWeights.topRight,
      this.snakeWeights.bottomLeft,
      this.snakeWeights.bottomRight
    ];
    
    let bestPatternScore = -Infinity;
    
    for (const pattern of patterns) {
      let patternScore = 0;
      for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
          if (board[i][j] > 0) {
            patternScore += board[i][j] * pattern[i][j];
          }
        }
      }
      bestPatternScore = Math.max(bestPatternScore, patternScore);
    }
    
    return bestPatternScore;
  }

  /**
   * Evaluate corner gradient (highest tiles should be in corners/edges)
   */
  evaluateCornerGradient(board) {
    const size = board.length;
    let maxTile = 0;
    let maxPos = { row: -1, col: -1 };
    
    // Find maximum tile
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        if (board[i][j] > maxTile) {
          maxTile = board[i][j];
          maxPos = { row: i, col: j };
        }
      }
    }
    
    if (maxTile === 0) return 0;
    
    // Calculate gradient from max tile position
    let gradientScore = 0;
    
    // Prefer corners
    const isCorner = (maxPos.row === 0 || maxPos.row === size - 1) && 
                     (maxPos.col === 0 || maxPos.col === size - 1);
    const isEdge = maxPos.row === 0 || maxPos.row === size - 1 || 
                   maxPos.col === 0 || maxPos.col === size - 1;
    
    if (isCorner) {
      gradientScore += maxTile * 10;
    } else if (isEdge) {
      gradientScore += maxTile * 5;
    }
    
    return gradientScore;
  }

  /**
   * Evaluate monotonicity
   */
  evaluateMonotonicity(board) {
    const size = board.length;
    let totalMono = 0;
    
    // Horizontal monotonicity
    for (let i = 0; i < size; i++) {
      totalMono += this.calculateDirectionalMonotonicity(board[i]);
    }
    
    // Vertical monotonicity
    for (let j = 0; j < size; j++) {
      const column = board.map(row => row[j]);
      totalMono += this.calculateDirectionalMonotonicity(column);
    }
    
    return totalMono;
  }

  /**
   * Calculate monotonicity in one direction
   */
  calculateDirectionalMonotonicity(array) {
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
    
    return Math.max(increasing, decreasing);
  }

  /**
   * Evaluate smoothness
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
   * Evaluate empty spaces
   */
  evaluateEmptySpaces(board) {
    const emptyCells = this.getEmptyCells(board);
    return Math.pow(emptyCells.length, 2);
  }

  /**
   * Evaluate merge potential
   */
  evaluateMergePotential(board) {
    const size = board.length;
    let mergePotential = 0;
    
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        if (board[i][j] > 0) {
          const value = board[i][j];
          
          // Check for adjacent identical tiles
          const neighbors = [[i-1, j], [i+1, j], [i, j-1], [i, j+1]];
          
          for (const [ni, nj] of neighbors) {
            if (ni >= 0 && ni < size && nj >= 0 && nj < size && board[ni][nj] === value) {
              mergePotential += value;
            }
          }
        }
      }
    }
    
    return mergePotential;
  }

  /**
   * Get corner-based move as fallback
   */
  getCornerBasedMove(possibleMoves) {
    // Simple corner strategy: prefer keeping high tiles in corners
    const priorities = ['left', 'up', 'right', 'down'];
    
    for (const direction of priorities) {
      const found = possibleMoves.find(move => move.direction === direction);
      if (found) return found.direction;
    }
    
    return possibleMoves[0].direction;
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
    const newBoard = this.copyBoard(board);
    
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
   * Copy board
   */
  copyBoard(board) {
    return board.map(row => [...row]);
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
   * Add random tile to board (utility function)
   */
  addRandomTileToBoard(board) {
    const emptyCells = this.getEmptyCells(board);
    if (emptyCells.length === 0) return false;
    
    const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    const value = Math.random() < 0.9 ? 2 : 4;
    board[randomCell.row][randomCell.col] = value;
    return true;
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
   * Clear evaluation cache
   */
  clearCache() {
    this.evaluationCache.clear();
    this.moveCache.clear();
  }

  /**
   * Yield control to prevent blocking
   */
  async yieldControl() {
    return new Promise(resolve => setTimeout(resolve, 0));
  }

  /**
   * Get hint for next best move
   */
  async getHint() {
    const bestMove = await this.getBestMove();
    return bestMove;
  }

  /**
   * Get AI statistics
   */
  getStats() {
    return {
      difficulty: this.difficulty,
      algorithm: this.algorithm,
      cacheSize: this.evaluationCache.size,
      moveCacheSize: this.moveCache.size,
      isThinking: this.isThinking,
      evaluations: this.stats.evaluations,
      cacheHits: this.stats.cacheHits,
      averageThinkingTime: this.stats.movesCalculated > 0 ? 
        this.stats.totalThinkingTime / this.stats.movesCalculated : 0,
      cacheHitRate: this.stats.evaluations > 0 ? 
        (this.stats.cacheHits / this.stats.evaluations * 100).toFixed(1) + '%' : '0%'
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
