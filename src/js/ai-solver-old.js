/**
 * Fancy2048 - Advanced AI Solver
 * Implementation based on state-of-the-art 2048 AI algorithms
 * Incorporates Expectimax, Monte Carlo methods, and advanced heuristics
 */

class AISolver {
  constructor(gameEngine) {
    this.gameEngine = gameEngine;
    this.difficulty = 'medium';
    this.isThinking = false;
    
    // Advanced difficulty settings with optimized parameters
    this.difficultySettings = {
      easy: { 
        depth: 3, 
        randomness: 0.15,
        mcTrials: 50,
        useIterativeDeepening: false,
        cacheEnabled: true
      },
      medium: { 
        depth: 4, 
        randomness: 0.05,
        mcTrials: 100,
        useIterativeDeepening: true,
        cacheEnabled: true
      },
      hard: { 
        depth: 5, 
        randomness: 0.02,
        mcTrials: 200,
        useIterativeDeepening: true,
        cacheEnabled: true
      },
      expert: { 
        depth: 6, 
        randomness: 0.005,
        mcTrials: 300,
        useIterativeDeepening: true,
        cacheEnabled: true
      }
    };
    
    // Precomputed position weights optimized for snake pattern
    this.positionWeights = this.generateAdvancedPositionWeights();
    
    // Enhanced caching system
    this.evaluationCache = new Map();
    this.moveCache = new Map();
    this.maxCacheSize = 50000;
    
    // Performance tracking
    this.stats = {
      evaluations: 0,
      cacheHits: 0,
      totalThinkingTime: 0,
      movesCalculated: 0
    };
    
    // Snake pattern weights for monotonicity
    this.snakeWeights = this.generateSnakeWeights();
    
    // Tile merge probability lookup
    this.mergeProbabilities = this.precomputeMergeProbabilities();
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
   * Get best move using advanced hybrid algorithm
   */
  async getBestMove() {
    if (this.isThinking) return null;
    
    this.isThinking = true;
    const startTime = Date.now();
    
    try {
      const board = this.gameEngine.board;
      
      // Quick game over check
      if (this.gameEngine.isGameOver) {
        return null;
      }
      
      // Get move from cache if available
      const boardKey = this.getBoardKey(board);
      if (this.moveCache.has(boardKey)) {
        this.stats.cacheHits++;
        return this.moveCache.get(boardKey);
      }
      
      const possibleMoves = this.getPossibleMoves(board);
      
      if (possibleMoves.length === 0) {
        return null;
      }
      
      // Single move optimization
      if (possibleMoves.length === 1) {
        return possibleMoves[0].direction;
      }
      
      let bestMove = null;
      let bestScore = -Infinity;
      const settings = this.difficultySettings[this.difficulty];
      
      // Use iterative deepening for better performance
      if (settings.useIterativeDeepening) {
        bestMove = await this.iterativeDeepeningSearch(possibleMoves, settings);
      } else {
        // Standard expectimax search
        for (const move of possibleMoves) {
          let score;
          
          // Hybrid approach: Use Monte Carlo for initial screening
          if (possibleMoves.length > 2) {
            const mcScore = await this.monteCarloEvaluation(move.board, settings.mcTrials);
            const expectimaxScore = await this.advancedExpectimax(move.board, settings.depth - 1, false, -Infinity, Infinity);
            score = 0.3 * mcScore + 0.7 * expectimaxScore;
          } else {
            score = await this.advancedExpectimax(move.board, settings.depth, false, -Infinity, Infinity);
          }
          
          // Apply strategic randomness
          const randomFactor = settings.randomness;
          const adjustedScore = score + (Math.random() - 0.5) * randomFactor * Math.abs(score);
          
          if (adjustedScore > bestScore) {
            bestScore = adjustedScore;
            bestMove = move.direction;
          }
          
          // Yield control for responsiveness
          if (possibleMoves.indexOf(move) % 2 === 0) {
            await Utils.sleep(0);
          }
        }
      }
      
      // Cache the result
      if (settings.cacheEnabled && this.moveCache.size < this.maxCacheSize) {
        this.moveCache.set(boardKey, bestMove);
      }
      
      // Update stats
      this.stats.movesCalculated++;
      this.stats.totalThinkingTime += Date.now() - startTime;
      
      return bestMove || possibleMoves[0].direction;
      
    } catch (error) {
      Utils.handleError(error, 'getBestMove');
      // Intelligent fallback based on corner strategy
      const possibleMoves = this.getPossibleMoves(this.gameEngine.board);
      if (possibleMoves.length > 0) {
        return this.getStrategicFallbackMove(possibleMoves);
      }
      return null;
    } finally {
      this.isThinking = false;
    }
  }

  /**
   * Advanced Expectimax with alpha-beta pruning and optimizations
   */
  async advancedExpectimax(board, depth, isMaximizing, alpha = -Infinity, beta = Infinity) {
    this.stats.evaluations++;
    
    // Yield control occasionally for better UI responsiveness
    if (this.stats.evaluations % 100 === 0) {
      await Utils.sleep(0);
    }
    
    // Base case or depth limit reached
    if (depth === 0) {
      return this.evaluateBoardAdvanced(board);
    }
    
    // Check cache
    const boardKey = this.getBoardKey(board) + '_' + depth + '_' + isMaximizing;
    if (this.evaluationCache.has(boardKey)) {
      this.stats.cacheHits++;
      return this.evaluationCache.get(boardKey);
    }
    
    let result;
    
    if (isMaximizing) {
      // Player's turn - maximize score
      const possibleMoves = this.getPossibleMoves(board);
      
      if (possibleMoves.length === 0) {
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
    const timeLimit = 5000; // 5 seconds max thinking time
    
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
    
    for (let i = 0; i < trials; i++) {
      totalScore += await this.simulateRandomGame(board);
      
      // Yield occasionally
      if (i % 20 === 0) {
        await Utils.sleep(0);
      }
    }
    
    return totalScore / trials;
  }

  /**
   * Simulate a random game from the given position
   */
  async simulateRandomGame(initialBoard) {
    let board = initialBoard.map(row => [...row]);
    let score = 0;
    let moves = 0;
    const maxMoves = 100; // Prevent infinite games
    
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
    score += this.evaluateSnakePattern(board) * 10.0;
    
    // 2. Corner strategy with gradient (prefers highest tile in corner)
    score += this.evaluateCornerGradient(board) * 8.0;
    
    // 3. Monotonicity in multiple directions
    score += this.evaluateAdvancedMonotonicity(board) * 5.0;
    
    // 4. Smoothness with logarithmic scaling
    score += this.evaluateLogSmoothness(board) * 3.0;
    
    // 5. Empty cells with exponential reward
    score += this.evaluateEmptySpaces(board) * 15.0;
    
    // 6. Merge potential (ability to create large merges)
    score += this.evaluateMergePotential(board) * 4.0;
    
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
   * Evaluate snake pattern (optimal tile arrangement)
   */
  evaluateSnakePattern(board) {
    const size = board.length;
    let score = 0;
    
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
    const isCorner = (maxPos.row === 0 || maxPos.row === size - 1) && 
                     (maxPos.col === 0 || maxPos.col === size - 1);
    const isEdge = maxPos.row === 0 || maxPos.row === size - 1 || 
                   maxPos.col === 0 || maxPos.col === size - 1;
    
    if (isCorner) {
      gradientScore += maxTile * 3;
    } else if (isEdge) {
      gradientScore += maxTile * 1.5;
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
   * Generate advanced position weights for snake patterns
   */
  generateAdvancedPositionWeights() {
    return {
      corner: this.generateCornerWeights(),
      edge: this.generateEdgeWeights(),
      center: this.generateCenterWeights()
    };
  }

  /**
   * Generate snake pattern weights for optimal tile arrangement
   */
  generateSnakeWeights() {
    const size = 4;
    
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
   * Precompute merge probabilities for better evaluation
   */
  precomputeMergeProbabilities() {
    const probabilities = new Map();
    
    // Cache common merge scenarios
    for (let value = 2; value <= 2048; value *= 2) {
      probabilities.set(value, {
        mergeValue: value * 2,
        probability: this.calculateMergeProbability(value)
      });
    }
    
    return probabilities;
  }

  /**
   * Calculate merge probability for a given tile value
   */
  calculateMergeProbability(value) {
    // Higher probability for merging smaller tiles
    return Math.max(0.1, 1.0 - Math.log2(value) / 20);
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
