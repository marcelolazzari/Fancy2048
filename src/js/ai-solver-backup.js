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
    if (this.difficultySettings[difficulty]) {
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
  }  /**
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
        result = this.evaluateBoardAdvanced(board);
      } else {
        let maxScore = -Infinity;
        
        // Sort moves by quick heuristic evaluation for better pruning
        const sortedMoves = this.sortMovesByPotential(possibleMoves);
        
        for (const move of sortedMoves) {
          const score = await this.advancedExpectimax(move.board, depth - 1, false, alpha, beta);
          maxScore = Math.max(maxScore, score);
          alpha = Math.max(alpha, score);
          
          // Alpha-beta pruning
          if (beta <= alpha) {
            break;
          }
        }
        
        result = maxScore;
      }
    } else {
      // Random tile placement - calculate expected value with optimizations
      const emptyCells = this.getEmptyCells(board);
      
      if (emptyCells.length === 0) {
        result = this.evaluateBoardAdvanced(board);
      } else {
        let expectedScore = 0;
        
        // Limit the number of cells to consider for performance
        const cellsToConsider = Math.min(emptyCells.length, 6);
        const selectedCells = this.selectStrategicCells(emptyCells, board, cellsToConsider);
        
        for (const cell of selectedCells) {
          // Consider both 2 and 4 tiles with proper probabilities
          for (const value of [2, 4]) {
            const probability = value === 2 ? 0.9 : 0.1;
            const newBoard = this.placeTile(board, cell.row, cell.col, value);
            const score = await this.advancedExpectimax(newBoard, depth - 1, true, alpha, beta);
            expectedScore += (probability / selectedCells.length) * score;
          }
        }
        
        result = expectedScore;
      }
    }
    
    // Cache the result
    if (this.evaluationCache.size < this.maxCacheSize) {
      this.evaluationCache.set(boardKey, result);
    }
    
    return result;
  }

  /**
   * Iterative deepening search for better time management
   */
  async iterativeDeepeningSearch(possibleMoves, settings) {
    let bestMove = possibleMoves[0].direction;
    let maxDepth = Math.min(settings.depth, 4); // Start conservative
    
    const startTime = Date.now();
    const timeLimit = 3000; // 3 seconds max thinking time
    
    for (let depth = 1; depth <= maxDepth; depth++) {
      if (Date.now() - startTime > timeLimit) break;
      
      let currentBest = null;
      let currentBestScore = -Infinity;
      
      for (const move of possibleMoves) {
        if (Date.now() - startTime > timeLimit) break;
        
        const score = await this.advancedExpectimax(move.board, depth, false, -Infinity, Infinity);
        
        if (score > currentBestScore) {
          currentBestScore = score;
          currentBest = move.direction;
        }
      }
      
      if (currentBest) {
        bestMove = currentBest;
      }
    }
    
    return bestMove;
  }

  /**
   * Monte Carlo evaluation for quick move screening
   */
  async monteCarloEvaluation(board, trials) {
    let totalScore = 0;
    const maxTrials = Math.min(trials, 50); // Limit for performance
    
    for (let i = 0; i < maxTrials; i++) {
      totalScore += await this.simulateRandomGame(board);
      
      // Yield occasionally
      if (i % 10 === 0) {
        await Utils.sleep(0);
      }
    }
    
    return totalScore / maxTrials;
  }

  /**
   * Simulate a random game from the given position
   */
  async simulateRandomGame(initialBoard) {
    let board = initialBoard.map(row => [...row]);
    let moves = 0;
    const maxMoves = 50; // Limit for performance
    
    while (moves < maxMoves) {
      const possibleMoves = this.getPossibleMoves(board);
      if (possibleMoves.length === 0) break;
      
      // Choose random move
      const randomMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
      board = randomMove.board;
      
      // Add random tile
      if (!this.addRandomTileToBoard(board)) break;
      
      moves++;
    }
    
    return this.evaluateBoardAdvanced(board);
  }

  /**
   * Advanced board evaluation using state-of-the-art heuristics
   */
  evaluateBoardAdvanced(board) {
    const size = board.length;
    let score = 0;
    
    // 1. Snake pattern evaluation (heavily weighted)
    score += this.evaluateSnakePattern(board) * 12.0;
    
    // 2. Corner strategy with gradient (prefers highest tile in corner)
    score += this.evaluateCornerGradient(board) * 10.0;
    
    // 3. Monotonicity in multiple directions
    score += this.evaluateAdvancedMonotonicity(board) * 8.0;
    
    // 4. Smoothness with logarithmic scaling
    score += this.evaluateLogSmoothness(board) * 4.0;
    
    // 5. Empty cells with exponential reward
    score += this.evaluateEmptySpaces(board) * 18.0;
    
    // 6. Merge potential (ability to create large merges)
    score += this.evaluateMergePotential(board) * 8.0;
    
    // 7. Tile clustering penalty
    score -= this.evaluateClustering(board) * 2.0;
    
    // 8. Edge preference for high tiles
    score += this.evaluateEdgePreference(board) * 3.0;
    
    // 9. Anti-fragmentation bonus
    score += this.evaluateCompactness(board) * 2.0;
    
    // 10. Survival metric (how likely the position is to survive)
    score += this.evaluateSurvival(board) * 6.0;
    
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
      mergePotential: 4.0,
      clustering: -2.0,
      edgePreference: 3.0,
      compactness: 2.0,
      survival: 6.0
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
    
    // Specific corner preferences (top-left is best)
    const isTopLeft = maxPos.row === 0 && maxPos.col === 0;
    const isTopRight = maxPos.row === 0 && maxPos.col === size - 1;
    const isBottomLeft = maxPos.row === size - 1 && maxPos.col === 0;
    const isBottomRight = maxPos.row === size - 1 && maxPos.col === size - 1;
    const isCorner = isTopLeft || isTopRight || isBottomLeft || isBottomRight;
    const isEdge = maxPos.row === 0 || maxPos.row === size - 1 || 
                   maxPos.col === 0 || maxPos.col === size - 1;
    
    // Reward corner placement with preference for top-left
    if (isTopLeft) {
      gradientScore += maxTile * 10; // Best position
    } else if (isBottomLeft) {
      gradientScore += maxTile * 8; // Second best
    } else if (isTopRight) {
      gradientScore += maxTile * 6; // Third best
    } else if (isBottomRight) {
      gradientScore += maxTile * 4; // Fourth best
    } else if (isEdge) {
      gradientScore += maxTile * 2;
    } else {
      // Penalty for high tiles not on edges
      gradientScore -= maxTile * 1;
    }
    
    // Extra bonus for keeping very high tiles in preferred corners
    if (maxTile >= 512) {
      if (isTopLeft) {
        gradientScore += maxTile * 5;
      } else if (isBottomLeft) {
        gradientScore += maxTile * 3;
      }
    }
    
    // Bonus for gradient emanating from max tile
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        if (board[i][j] > 0) {
          const distance = Math.abs(i - maxPos.row) + Math.abs(j - maxPos.col);
          const expectedValue = maxTile / Math.pow(2, distance + 1);
          const actualValue = board[i][j];
          
          if (actualValue <= expectedValue) {
            gradientScore += actualValue * (4 - distance);
          }
        }
      }
    }
    
    return gradientScore;
  }

  /**
   * Advanced monotonicity evaluation
   */
  evaluateAdvancedMonotonicity(board) {
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
   * Evaluate logarithmic smoothness
   */
  evaluateLogSmoothness(board) {
    const size = board.length;
    let smoothness = 0;
    
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        if (board[i][j] > 0) {
          const currentLog = Math.log2(board[i][j]);
          
          // Check right neighbor
          if (j < size - 1 && board[i][j + 1] > 0) {
            const rightLog = Math.log2(board[i][j + 1]);
            const diff = Math.abs(currentLog - rightLog);
            smoothness -= diff * diff; // Quadratic penalty for large differences
          }
          
          // Check bottom neighbor
          if (i < size - 1 && board[i + 1][j] > 0) {
            const bottomLog = Math.log2(board[i + 1][j]);
            const diff = Math.abs(currentLog - bottomLog);
            smoothness -= diff * diff;
          }
        }
      }
    }
    
    return smoothness;
  }

  /**
   * Evaluate empty spaces with exponential reward
   */
  evaluateEmptySpaces(board) {
    const emptyCells = this.getEmptyCells(board);
    return Math.pow(emptyCells.length, 2.5);
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
          const neighbors = [
            [i-1, j], [i+1, j], [i, j-1], [i, j+1]
          ];
          
          for (const [ni, nj] of neighbors) {
            if (ni >= 0 && ni < size && nj >= 0 && nj < size && board[ni][nj] === value) {
              mergePotential += value * 2; // Reward potential merges
            }
          }
          
          // Bonus for tiles that can form chains
          mergePotential += this.evaluateChainPotential(board, i, j, value);
        }
      }
    }
    
    return mergePotential;
  }

  /**
   * Evaluate chain potential for a tile
   */
  evaluateChainPotential(board, row, col, value) {
    const size = board.length;
    let chainScore = 0;
    
    // Look for potential merge chains
    const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
    
    for (const [dr, dc] of directions) {
      let chainLength = 1;
      let r = row + dr;
      let c = col + dc;
      
      // Count consecutive tiles of same value
      while (r >= 0 && r < size && c >= 0 && c < size && board[r][c] === value) {
        chainLength++;
        r += dr;
        c += dc;
      }
      
      if (chainLength > 1) {
        chainScore += value * chainLength * chainLength;
      }
    }
    
    return chainScore;
  }

  /**
   * Evaluate clustering penalty
   */
  evaluateClustering(board) {
    const size = board.length;
    let clusterPenalty = 0;
    
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        if (board[i][j] > 0) {
          const value = board[i][j];
          let similarNeighbors = 0;
          
          const neighbors = [
            [i-1, j], [i+1, j], [i, j-1], [i, j+1]
          ];
          
          for (const [ni, nj] of neighbors) {
            if (ni >= 0 && ni < size && nj >= 0 && nj < size) {
              const neighborValue = board[ni][nj];
              if (neighborValue > 0 && Math.abs(Math.log2(value) - Math.log2(neighborValue)) <= 1) {
                similarNeighbors++;
              }
            }
          }
          
          // Penalty for too many similar neighbors (creates fragmentation)
          if (similarNeighbors > 2) {
            clusterPenalty += value * (similarNeighbors - 2);
          }
        }
      }
    }
    
    return clusterPenalty;
  }

  /**
   * Evaluate edge preference for high tiles
   */
  evaluateEdgePreference(board) {
    const size = board.length;
    let edgeScore = 0;
    
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        if (board[i][j] > 0) {
          const value = board[i][j];
          const isEdge = i === 0 || i === size - 1 || j === 0 || j === size - 1;
          const isCorner = (i === 0 || i === size - 1) && (j === 0 || j === size - 1);
          
          if (value >= 64) { // Only for higher tiles
            if (isCorner) {
              edgeScore += value * 1.5;
            } else if (isEdge) {
              edgeScore += value * 0.8;
            }
          }
        }
      }
    }
    
    return edgeScore;
  }

  /**
   * Evaluate board compactness
   */
  evaluateCompactness(board) {
    const size = board.length;
    let compactness = 0;
    let totalTiles = 0;
    let minRow = size, maxRow = -1, minCol = size, maxCol = -1;
    
    // Find bounding box of non-empty tiles
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        if (board[i][j] > 0) {
          totalTiles++;
          minRow = Math.min(minRow, i);
          maxRow = Math.max(maxRow, i);
          minCol = Math.min(minCol, j);
          maxCol = Math.max(maxCol, j);
        }
      }
    }
    
    if (totalTiles === 0) return 0;
    
    const boundingBoxArea = (maxRow - minRow + 1) * (maxCol - minCol + 1);
    compactness = totalTiles / boundingBoxArea;
    
    return compactness * 1000; // Scale appropriately
  }

  /**
   * Evaluate survival probability
   */
  evaluateSurvival(board) {
    const possibleMoves = this.getPossibleMoves(board);
    const emptyCells = this.getEmptyCells(board);
    
    let survivalScore = 0;
    
    // More possible moves = better survival
    survivalScore += possibleMoves.length * 100;
    
    // More empty cells = better survival
    survivalScore += emptyCells.length * 200;
    
    // Penalty for being close to game over
    if (possibleMoves.length <= 1) {
      survivalScore -= 1000;
    }
    
    if (emptyCells.length <= 2) {
      survivalScore -= 500;
    }
    
    return survivalScore;
  }

  /**
   * Sort moves by potential for better pruning
   */
  sortMovesByPotential(possibleMoves) {
    return possibleMoves.sort((a, b) => {
      const scoreA = this.quickEvaluateMove(a.board);
      const scoreB = this.quickEvaluateMove(b.board);
      return scoreB - scoreA;
    });
  }

  /**
   * Quick evaluation for move sorting
   */
  quickEvaluateMove(board) {
    const emptyCells = this.getEmptyCells(board);
    const cornerScore = this.evaluateCornerGradient(board);
    return emptyCells.length * 100 + cornerScore * 0.1;
  }

  /**
   * Select strategic cells for tile placement consideration
   */
  selectStrategicCells(emptyCells, board, maxCells) {
    if (emptyCells.length <= maxCells) {
      return emptyCells;
    }
    
    // Prioritize cells based on strategic importance
    const scoredCells = emptyCells.map(cell => {
      let score = 0;
      
      // Prefer corner and edge cells
      const isCorner = (cell.row === 0 || cell.row === 3) && (cell.col === 0 || cell.col === 3);
      const isEdge = cell.row === 0 || cell.row === 3 || cell.col === 0 || cell.col === 3;
      
      if (isCorner) score += 100;
      else if (isEdge) score += 50;
      
      // Prefer cells near high-value tiles
      const neighbors = [
        [cell.row-1, cell.col], [cell.row+1, cell.col],
        [cell.row, cell.col-1], [cell.row, cell.col+1]
      ];
      
      for (const [nr, nc] of neighbors) {
        if (nr >= 0 && nr < 4 && nc >= 0 && nc < 4 && board[nr][nc] > 0) {
          score += Math.log2(board[nr][nc]);
        }
      }
      
      return { cell, score };
    });
    
    // Sort by score and take top cells
    scoredCells.sort((a, b) => b.score - a.score);
    return scoredCells.slice(0, maxCells).map(item => item.cell);
  }

  /**
   * Strategic fallback move selection
   */
  getStrategicFallbackMove(possibleMoves) {
    // Evaluate each move for corner strategy preservation
    let bestMove = possibleMoves[0];
    let bestScore = -Infinity;
    
    for (const move of possibleMoves) {
      const score = this.evaluateCornerGradient(move.board);
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }
    
    return bestMove.direction;
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
   * Clear evaluation cache
   */
  clearCache() {
    this.evaluationCache.clear();
    this.moveCache.clear();
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
      maxDepth: this.difficultySettings[this.difficulty].depth,
      cacheSize: this.evaluationCache.size,
      moveCacheSize: this.moveCache.size,
      isThinking: this.isThinking,
      evaluations: this.stats.evaluations,
      cacheHits: this.stats.cacheHits,
      averageThinkingTime: this.stats.movesCalculated > 0 ? 
        this.stats.totalThinkingTime / this.stats.movesCalculated : 0
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
