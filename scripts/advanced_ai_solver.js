/**
 * Advanced AI Solver for Fancy2048 
 * Based on Michael Kim's implementation with Expectimax and optimized heuristics
 * Uses 64-bit board encoding for performance and advanced evaluation functions
 */

class AdvancedAI2048Solver {
  constructor(game) {
    this.game = game;
    this.transpositionTable = new Map();
    this.cacheHits = 0;
    this.totalLookups = 0;
    
    // Enhanced heuristic weights optimized for better performance
    this.weights = {
      openness: 2.7,        // Increased weight for empty cells
      smoothness: 8.0,      // Higher weight for tile smoothness
      monotonicity: 12.0,   // Much higher weight for monotonicity
      maxTileCorner: 3.0,   // Increased corner preference
      merging: 4.0,         // New: weight for merge potential
      positioning: 2.0      // New: weight for tile positioning strategy
    };
    
    // Performance optimization settings
    this.maxCacheSize = 50000;
    this.cleanupThreshold = 40000;
    
    // Enhanced monotonicity patterns for better evaluation
    this.monotonicityPatterns = this.generateMonotonicityPatterns();
    
    // Position scoring matrix for strategic tile placement
    this.positionWeights = this.generatePositionWeights(game.size);
    
    // Precomputed lookup tables for performance
    this.initializeLookupTables();
  }

  /**
   * Generate enhanced monotonicity patterns for better evaluation
   */
  generateMonotonicityPatterns() {
    return {
      // Corner strategies - prioritize corners for max tile
      topLeft: { row: [1, 1, 1, 1], col: [1, 1, 1, 1] },
      topRight: { row: [1, 1, 1, 1], col: [-1, -1, -1, -1] },
      bottomLeft: { row: [-1, -1, -1, -1], col: [1, 1, 1, 1] },
      bottomRight: { row: [-1, -1, -1, -1], col: [-1, -1, -1, -1] }
    };
  }

  /**
   * Generate position weight matrix for strategic evaluation
   */
  generatePositionWeights(size) {
    const weights = [];
    for (let row = 0; row < size; row++) {
      weights[row] = [];
      for (let col = 0; col < size; col++) {
        // Higher weights for corners and edges
        const edgeBonus = (row === 0 || row === size - 1 || col === 0 || col === size - 1) ? 1.5 : 1.0;
        const cornerBonus = ((row === 0 || row === size - 1) && (col === 0 || col === size - 1)) ? 2.0 : 1.0;
        weights[row][col] = edgeBonus * cornerBonus;
      }
    }
    return weights;
  }

  /**
   * Initialize precomputed lookup tables for fast move simulation
   */
  initializeLookupTables() {
    this.leftSlideTable = new Array(65536);
    this.rightSlideTable = new Array(65536);
    this.heuristicTable = new Array(65536);
    
    // Precompute all possible row movements and heuristics
    for (let row = 0; row < 65536; row++) {
      const tiles = this.unpackRow(row);
      
      // Calculate left slide
      const leftResult = this.slideRowLeft(tiles);
      this.leftSlideTable[row] = this.packRow(leftResult.tiles);
      
      // Calculate right slide
      const rightResult = this.slideRowRight(tiles);
      this.rightSlideTable[row] = this.packRow(rightResult.tiles);
      
      // Calculate heuristic for this row
      this.heuristicTable[row] = this.calculateRowHeuristic(tiles);
    }
  }

  /**
   * Enhanced AI decision method with adaptive depth and move ordering
   */
  getBestMove() {
    const startTime = performance.now();
    
    // Convert board to optimized representation
    const boardState = this.encodeBoardState(this.game.board);
    
    // Get adaptive search depth based on game state
    const searchDepth = this.getAdaptiveSearchDepth(boardState);
    
    // Find best move using enhanced Expectimax algorithm
    let bestMove = null;
    let bestScore = -Infinity;
    const moveScores = {};
    const moveAnalysis = {};
    
    // Evaluate moves in strategic order (corners first, then edges)
    const directions = this.getMoveOrderByStrategy(boardState);
    
    for (const direction of directions) {
      const nextState = this.simulateMove(boardState, direction);
      
      if (nextState !== boardState) { // Move is valid
        // Quick evaluation for move ordering
        const quickScore = this.evaluateBoard(nextState);
        
        // Deep evaluation with expectimax
        const deepScore = this.expectimax(nextState, searchDepth, false, 1.0);
        
        // Combined score with quick and deep evaluation
        const combinedScore = deepScore + (quickScore * 0.1);
        
        moveScores[direction] = combinedScore;
        moveAnalysis[direction] = {
          quick: quickScore,
          deep: deepScore,
          combined: combinedScore
        };
        
        if (combinedScore > bestScore) {
          bestScore = combinedScore;
          bestMove = direction;
        }
      }
    }
    
    const executionTime = performance.now() - startTime;
    
    // Periodic cache cleanup for memory management
    if (this.transpositionTable.size > this.maxCacheSize) {
      this.cleanupTranspositionTable();
    }
    
    // Debug logging for development
    if (window.debugAI) {
      console.log(`🤖 Advanced AI Analysis (${executionTime.toFixed(1)}ms):`, {
        depth: searchDepth,
        bestMove,
        scores: moveScores,
        analysis: moveAnalysis,
        cacheHitRate: (this.cacheHits / Math.max(this.totalLookups, 1) * 100).toFixed(1) + '%'
      });
    }
    
    return bestMove || directions[0]; // Fallback to first available direction
  }

  /**
   * Expectimax algorithm - handles randomness better than pure minimax
   */
  expectimax(boardState, depth, isPlayerTurn, probability = 1.0) {
    this.totalLookups++;
    
    // Base cases
    if (depth === 0 || probability < 0.001) {
      return this.evaluateBoard(boardState);
    }
    
    // Check transposition table
    const tableKey = `${boardState}_${depth}_${isPlayerTurn}`;
    if (this.transpositionTable.has(tableKey)) {
      this.cacheHits++;
      return this.transpositionTable.get(tableKey).score;
    }
    
    let result;
    
    if (isPlayerTurn) {
      // Player turn - maximize expected value over all possible moves
      result = this.maximizePlayerTurn(boardState, depth, probability);
    } else {
      // Computer turn - calculate expected value of random tile placement
      result = this.expectRandomTiles(boardState, depth, probability);
    }
    
    // Store in transposition table
    this.transpositionTable.set(tableKey, { 
      score: result, 
      depth: depth,
      timestamp: Date.now()
    });
    
    // Cleanup old entries periodically
    if (this.transpositionTable.size > 100000) {
      this.cleanupTranspositionTable();
    }
    
    return result;
  }

  /**
   * Maximize player turn - try all possible moves
   */
  maximizePlayerTurn(boardState, depth, probability) {
    let maxScore = -Infinity;
    const directions = ['up', 'down', 'left', 'right'];
    let hasValidMove = false;
    
    for (const direction of directions) {
      const nextState = this.simulateMove(boardState, direction);
      
      if (nextState !== boardState) {
        hasValidMove = true;
        const score = this.expectimax(nextState, depth - 1, false, probability);
        maxScore = Math.max(maxScore, score);
      }
    }
    
    return hasValidMove ? maxScore : this.evaluateBoard(boardState);
  }

  /**
   * Expected value calculation for random tile placement
   */
  expectRandomTiles(boardState, depth, probability) {
    const emptyCells = this.getEmptyCells(boardState);
    
    if (emptyCells.length === 0) {
      return this.evaluateBoard(boardState);
    }
    
    let expectedValue = 0;
    const numEmpty = emptyCells.length;
    
    // Limit cells considered for performance
    const cellsToConsider = numEmpty > 6 ? 
      this.selectBestEmptyCells(boardState, emptyCells, 6) : 
      emptyCells;
    
    for (const cellIndex of cellsToConsider) {
      // Place tile with value 2 (90% probability)
      const state2 = this.placeTile(boardState, cellIndex, 1); // log2(2) = 1
      const prob2 = 0.9 * probability / cellsToConsider.length;
      expectedValue += prob2 * this.expectimax(state2, depth - 1, true, prob2);
      
      // Place tile with value 4 (10% probability)
      const state4 = this.placeTile(boardState, cellIndex, 2); // log2(4) = 2
      const prob4 = 0.1 * probability / cellsToConsider.length;
      expectedValue += prob4 * this.expectimax(state4, depth - 1, true, prob4);
    }
    
    return expectedValue;
  }

  /**
   * Board encoding for efficient storage and computation
   */
  encodeBoardState(board) {
    let state = 0n;
    const size = board.length;
    
    for (let i = 0; i < size * size; i++) {
      const row = Math.floor(i / size);
      const col = i % size;
      const value = board[row][col];
      
      // Convert value to log representation (0 for empty, log2(value) for tiles)
      let logValue = 0;
      if (value > 0) {
        logValue = Math.log2(value);
      }
      
      // Pack into 4 bits per tile
      state = state | (BigInt(logValue) << (BigInt(i) * 4n));
    }
    
    return state;
  }

  /**
   * Decode board state back to 2D array
   */
  decodeBoardState(state) {
    const size = this.game.size;
    const board = [];
    
    for (let row = 0; row < size; row++) {
      board[row] = [];
      for (let col = 0; col < size; col++) {
        const index = row * size + col;
        const logValue = Number((state >> (BigInt(index) * 4n)) & 0xFn);
        board[row][col] = logValue === 0 ? 0 : Math.pow(2, logValue);
      }
    }
    
    return board;
  }

  /**
   * Simulate a move in the given direction
   */
  simulateMove(boardState, direction) {
    const size = this.game.size;
    let newState = boardState;
    
    if (size === 4) {
      // Optimized 4x4 simulation using lookup tables
      switch (direction) {
        case 'left':
          newState = this.simulateMoveLeft4x4(boardState);
          break;
        case 'right':
          newState = this.simulateMoveRight4x4(boardState);
          break;
        case 'up':
          newState = this.simulateMoveUp4x4(boardState);
          break;
        case 'down':
          newState = this.simulateMoveDown4x4(boardState);
          break;
      }
    } else {
      // General case for other board sizes
      const board = this.decodeBoardState(boardState);
      const result = this.simulateGeneralMove(board, direction);
      newState = this.encodeBoardState(result.board);
    }
    
    return newState;
  }

  /**
   * Optimized left move for 4x4 board using lookup tables
   */
  simulateMoveLeft4x4(boardState) {
    let newState = 0n;
    
    for (let row = 0; row < 4; row++) {
      // Extract row (16 bits)
      const rowBits = Number((boardState >> (BigInt(row) * 16n)) & 0xFFFFn);
      
      // Use lookup table for slide
      const newRowBits = this.leftSlideTable[rowBits];
      
      // Pack back into state
      newState = newState | (BigInt(newRowBits) << (BigInt(row) * 16n));
    }
    
    return newState;
  }

  /**
   * Optimized right move for 4x4 board using lookup tables
   */
  simulateMoveRight4x4(boardState) {
    let newState = 0n;
    
    for (let row = 0; row < 4; row++) {
      const rowBits = Number((boardState >> (BigInt(row) * 16n)) & 0xFFFFn);
      const newRowBits = this.rightSlideTable[rowBits];
      newState = newState | (BigInt(newRowBits) << (BigInt(row) * 16n));
    }
    
    return newState;
  }

  /**
   * Optimized up move for 4x4 board
   */
  simulateMoveUp4x4(boardState) {
    // Transpose, slide left, transpose back
    const transposed = this.transpose4x4(boardState);
    const moved = this.simulateMoveLeft4x4(transposed);
    return this.transpose4x4(moved);
  }

  /**
   * Optimized down move for 4x4 board
   */
  simulateMoveDown4x4(boardState) {
    // Transpose, slide right, transpose back
    const transposed = this.transpose4x4(boardState);
    const moved = this.simulateMoveRight4x4(transposed);
    return this.transpose4x4(moved);
  }

  /**
   * Transpose 4x4 board state for efficient up/down moves
   */
  transpose4x4(boardState) {
    let result = 0n;
    
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        const srcIndex = row * 4 + col;
        const dstIndex = col * 4 + row;
        
        const tile = (boardState >> (BigInt(srcIndex) * 4n)) & 0xFn;
        result = result | (tile << (BigInt(dstIndex) * 4n));
      }
    }
    
    return result;
  }

  /**
   * General move simulation for non-4x4 boards
   */
  simulateGeneralMove(board, direction) {
    const size = board.length;
    const newBoard = board.map(row => [...row]);
    let moved = false;
    let score = 0;
    
    // Implementation similar to your existing move logic
    // but adapted for the AI simulation context
    
    switch (direction) {
      case 'left':
        ({ moved, score } = this.simulateGeneralMoveLeft(newBoard));
        break;
      case 'right':
        ({ moved, score } = this.simulateGeneralMoveRight(newBoard));
        break;
      case 'up':
        ({ moved, score } = this.simulateGeneralMoveUp(newBoard));
        break;
      case 'down':
        ({ moved, score } = this.simulateGeneralMoveDown(newBoard));
        break;
    }
    
    return { board: newBoard, moved, score };
  }

  /**
   * Pack 4 tile values into a 16-bit row representation
   */
  packRow(tiles) {
    return tiles[0] | (tiles[1] << 4) | (tiles[2] << 8) | (tiles[3] << 12);
  }

  /**
   * Unpack 16-bit row into 4 tile values
   */
  unpackRow(row) {
    return [
      row & 0xF,
      (row >> 4) & 0xF,
      (row >> 8) & 0xF,
      (row >> 12) & 0xF
    ];
  }

  /**
   * Slide a row of tiles left with merging
   */
  slideRowLeft(tiles) {
    const result = [...tiles];
    let score = 0;
    let writeIndex = 0;
    let lastMerged = false;
    
    for (let i = 0; i < 4; i++) {
      if (result[i] !== 0) {
        if (writeIndex > 0 && 
            result[writeIndex - 1] === result[i] && 
            !lastMerged) {
          // Merge tiles
          result[writeIndex - 1]++;
          score += Math.pow(2, result[writeIndex - 1]);
          result[i] = 0;
          lastMerged = true;
        } else {
          // Move tile
          if (i !== writeIndex) {
            result[writeIndex] = result[i];
            result[i] = 0;
          }
          writeIndex++;
          lastMerged = false;
        }
      }
    }
    
    return { tiles: result, score };
  }

  /**
   * Slide a row of tiles right with merging
   */
  slideRowRight(tiles) {
    const reversed = [...tiles].reverse();
    const result = this.slideRowLeft(reversed);
    return { 
      tiles: result.tiles.reverse(), 
      score: result.score 
    };
  }

  /**
   * Calculate heuristic value for a single row
   */
  calculateRowHeuristic(tiles) {
    let heuristic = 0;
    
    // Count empty cells (openness)
    let emptyCells = 0;
    for (const tile of tiles) {
      if (tile === 0) emptyCells++;
    }
    heuristic += this.weights.openness * emptyCells;
    
    // Calculate smoothness
    let smoothness = 0;
    for (let i = 0; i < 3; i++) {
      if (tiles[i] !== 0 && tiles[i + 1] !== 0) {
        smoothness -= Math.abs(tiles[i] - tiles[i + 1]);
      }
    }
    heuristic += this.weights.smoothness * smoothness;
    
    // Calculate monotonicity
    let leftMono = 0, rightMono = 0;
    for (let i = 0; i < 3; i++) {
      if (tiles[i] > tiles[i + 1]) {
        leftMono += tiles[i + 1] - tiles[i];
      } else {
        rightMono += tiles[i] - tiles[i + 1];
      }
    }
    heuristic += this.weights.monotonicity * Math.max(leftMono, rightMono);
    
    // Max tile bonus
    const maxTile = Math.max(...tiles);
    heuristic += this.weights.maxTileCorner * maxTile;
    
    return heuristic;
  }

  /**
   * Evaluate board state using precomputed heuristics
   */
  evaluateBoard(boardState) {
    let score = 0;
    
    if (this.game.size === 4) {
      // Optimized evaluation for 4x4 boards
      for (let row = 0; row < 4; row++) {
        const rowBits = Number((boardState >> (BigInt(row) * 16n)) & 0xFFFFn);
        score += this.heuristicTable[rowBits];
      }
      
      // Add column heuristics
      const transposed = this.transpose4x4(boardState);
      for (let row = 0; row < 4; row++) {
        const rowBits = Number((transposed >> (BigInt(row) * 16n)) & 0xFFFFn);
        score += this.heuristicTable[rowBits];
      }
    } else {
      // General evaluation for other board sizes
      const board = this.decodeBoardState(boardState);
      score = this.evaluateGeneralBoard(board);
    }
    
    return score;
  }

  /**
   * General board evaluation for non-4x4 boards
   */
  evaluateGeneralBoard(board) {
    const size = board.length;
    let score = 0;
    
    // Empty cells bonus
    let emptyCells = 0;
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        if (board[row][col] === 0) emptyCells++;
      }
    }
    score += this.weights.openness * emptyCells;
    
    // Smoothness and monotonicity
    score += this.weights.smoothness * this.calculateGeneralSmoothness(board);
    score += this.weights.monotonicity * this.calculateGeneralMonotonicity(board);
    
    // Max tile corner bonus
    const maxTile = this.getMaxTile(board);
    if (this.isMaxTileInCorner(board, maxTile)) {
      score += this.weights.maxTileCorner * Math.log2(maxTile);
    }
    
    return score;
  }

  /**
   * Get empty cell positions from board state
   */
  getEmptyCells(boardState) {
    const emptyCells = [];
    const size = this.game.size;
    
    for (let i = 0; i < size * size; i++) {
      const tile = Number((boardState >> (BigInt(i) * 4n)) & 0xFn);
      if (tile === 0) {
        emptyCells.push(i);
      }
    }
    
    return emptyCells;
  }

  /**
   * Select best empty cells for tile placement consideration
   */
  selectBestEmptyCells(boardState, emptyCells, maxCells) {
    // For now, just return first maxCells empty cells
    // Could be enhanced with position-based scoring
    return emptyCells.slice(0, maxCells);
  }

  /**
   * Place a tile at the specified position
   */
  placeTile(boardState, cellIndex, logValue) {
    const mask = ~(0xFn << (BigInt(cellIndex) * 4n));
    const newState = boardState & BigInt(mask);
    return newState | (BigInt(logValue) << (BigInt(cellIndex) * 4n));
  }

  /**
   * Get adaptive search depth based on game state
   */
  getSearchDepth(boardState) {
    const emptyCells = this.getEmptyCells(boardState);
    const maxTileLog = this.getMaxTileLog(boardState);
    
    // Increase depth as game progresses
    if (maxTileLog < 11) { // Before 2048 tile
      return 3;
    } else if (maxTileLog < 12) { // Before 4096 tile
      return 4;
    } else {
      // After 4096, adjust depth based on empty cells
      if (emptyCells.length > 4) return 4;
      if (emptyCells.length > 3) return 5;
      return 6;
    }
  }

  /**
   * Get maximum tile log value from board state
   */
  getMaxTileLog(boardState) {
    let maxLog = 0;
    const size = this.game.size;
    
    for (let i = 0; i < size * size; i++) {
      const tile = Number((boardState >> (BigInt(i) * 4n)) & 0xFn);
      maxLog = Math.max(maxLog, tile);
    }
    
    return maxLog;
  }

  /**
   * Get maximum tile value from regular board
   */
  getMaxTile(board) {
    let maxTile = 0;
    for (const row of board) {
      for (const tile of row) {
        maxTile = Math.max(maxTile, tile);
      }
    }
    return maxTile;
  }

  /**
   * Check if max tile is in corner
   */
  isMaxTileInCorner(board, maxTile) {
    const size = board.length;
    const corners = [
      [0, 0], [0, size - 1], [size - 1, 0], [size - 1, size - 1]
    ];
    
    return corners.some(([row, col]) => board[row][col] === maxTile);
  }

  /**
   * Calculate smoothness for general board
   */
  calculateGeneralSmoothness(board) {
    const size = board.length;
    let smoothness = 0;
    
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        if (board[row][col] !== 0) {
          const logValue = Math.log2(board[row][col]);
          
          // Check right neighbor
          if (col < size - 1 && board[row][col + 1] !== 0) {
            smoothness -= Math.abs(logValue - Math.log2(board[row][col + 1]));
          }
          
          // Check down neighbor
          if (row < size - 1 && board[row + 1][col] !== 0) {
            smoothness -= Math.abs(logValue - Math.log2(board[row + 1][col]));
          }
        }
      }
    }
    
    return smoothness;
  }

  /**
   * Calculate monotonicity for general board
   */
  calculateGeneralMonotonicity(board) {
    const size = board.length;
    let totalMono = 0;
    
    // Horizontal monotonicity
    for (let row = 0; row < size; row++) {
      let leftMono = 0, rightMono = 0;
      for (let col = 1; col < size; col++) {
        const prev = board[row][col - 1] || 1;
        const curr = board[row][col] || 1;
        const diff = Math.log2(curr) - Math.log2(prev);
        
        if (diff > 0) leftMono += diff;
        else rightMono -= diff;
      }
      totalMono += Math.max(leftMono, rightMono);
    }
    
    // Vertical monotonicity  
    for (let col = 0; col < size; col++) {
      let upMono = 0, downMono = 0;
      for (let row = 1; row < size; row++) {
        const prev = board[row - 1][col] || 1;
        const curr = board[row][col] || 1;
        const diff = Math.log2(curr) - Math.log2(prev);
        
        if (diff > 0) upMono += diff;
        else downMono -= diff;
      }
      totalMono += Math.max(upMono, downMono);
    }
    
    return totalMono;
  }

  /**
   * General move simulation methods (simplified versions)
   */
  simulateGeneralMoveLeft(board) {
    const size = board.length;
    let moved = false;
    let score = 0;
    
    for (let row = 0; row < size; row++) {
      const rowResult = this.slideRowLeft(board[row].map(v => v === 0 ? 0 : Math.log2(v)));
      
      for (let col = 0; col < size; col++) {
        const newValue = rowResult.tiles[col] === 0 ? 0 : Math.pow(2, rowResult.tiles[col]);
        if (board[row][col] !== newValue) {
          moved = true;
        }
        board[row][col] = newValue;
      }
      score += rowResult.score;
    }
    
    return { moved, score };
  }

  simulateGeneralMoveRight(board) {
    const size = board.length;
    let moved = false;
    let score = 0;
    
    for (let row = 0; row < size; row++) {
      const rowResult = this.slideRowRight(board[row].map(v => v === 0 ? 0 : Math.log2(v)));
      
      for (let col = 0; col < size; col++) {
        const newValue = rowResult.tiles[col] === 0 ? 0 : Math.pow(2, rowResult.tiles[col]);
        if (board[row][col] !== newValue) {
          moved = true;
        }
        board[row][col] = newValue;
      }
      score += rowResult.score;
    }
    
    return { moved, score };
  }

  simulateGeneralMoveUp(board) {
    const size = board.length;
    let moved = false;
    let score = 0;
    
    for (let col = 0; col < size; col++) {
      const column = [];
      for (let row = 0; row < size; row++) {
        column.push(board[row][col] === 0 ? 0 : Math.log2(board[row][col]));
      }
      
      const colResult = this.slideRowLeft(column);
      
      for (let row = 0; row < size; row++) {
        const newValue = colResult.tiles[row] === 0 ? 0 : Math.pow(2, colResult.tiles[row]);
        if (board[row][col] !== newValue) {
          moved = true;
        }
        board[row][col] = newValue;
      }
      score += colResult.score;
    }
    
    return { moved, score };
  }

  simulateGeneralMoveDown(board) {
    const size = board.length;
    let moved = false;
    let score = 0;
    
    for (let col = 0; col < size; col++) {
      const column = [];
      for (let row = 0; row < size; row++) {
        column.push(board[row][col] === 0 ? 0 : Math.log2(board[row][col]));
      }
      
      const colResult = this.slideRowRight(column);
      
      for (let row = 0; row < size; row++) {
        const newValue = colResult.tiles[row] === 0 ? 0 : Math.pow(2, colResult.tiles[row]);
        if (board[row][col] !== newValue) {
          moved = true;
        }
        board[row][col] = newValue;
      }
      score += colResult.score;
    }
    
    return { moved, score };
  }

  /**
   * Get strategic move order based on current board state
   */
  getMoveOrderByStrategy(boardState) {
    const directions = ['up', 'down', 'left', 'right'];
    const board = this.decodeBoardState(boardState);
    const maxTile = this.getMaxTile(board);
    
    // Find where the max tile is located
    let maxTilePosition = null;
    for (let row = 0; row < this.game.size; row++) {
      for (let col = 0; col < this.game.size; col++) {
        if (board[row][col] === maxTile) {
          maxTilePosition = { row, col };
          break;
        }
      }
      if (maxTilePosition) break;
    }
    
    // Order moves to maintain max tile in corner
    if (maxTilePosition) {
      const { row, col } = maxTilePosition;
      const isTopRow = row === 0;
      const isBottomRow = row === this.game.size - 1;
      const isLeftCol = col === 0;
      const isRightCol = col === this.game.size - 1;
      
      // Prioritize moves that keep max tile in corner
      if (isTopRow && isLeftCol) {
        return ['left', 'up', 'right', 'down'];
      } else if (isTopRow && isRightCol) {
        return ['right', 'up', 'left', 'down'];
      } else if (isBottomRow && isLeftCol) {
        return ['left', 'down', 'right', 'up'];
      } else if (isBottomRow && isRightCol) {
        return ['right', 'down', 'left', 'up'];
      }
    }
    
    // Default strategic order
    return ['up', 'left', 'right', 'down'];
  }

  /**
   * Get adaptive search depth based on game complexity
   */
  getAdaptiveSearchDepth(boardState) {
    const emptyCells = this.getEmptyCells(boardState);
    const maxTileLog = this.getMaxTileLog(boardState);
    const boardSize = this.game.size * this.game.size;
    const fillRatio = (boardSize - emptyCells.length) / boardSize;
    
    // Base depth increases with game progression
    let baseDepth = 3;
    
    // Increase depth based on max tile achieved
    if (maxTileLog >= 11) baseDepth = 4; // 2048 tile
    if (maxTileLog >= 12) baseDepth = 5; // 4096 tile
    if (maxTileLog >= 13) baseDepth = 6; // 8192 tile
    
    // Increase depth as board fills up (critical decisions)
    if (fillRatio > 0.8) baseDepth += 1;
    if (fillRatio > 0.9) baseDepth += 1;
    
    // Decrease depth if performance is critical (many empty cells)
    if (emptyCells.length > 8) baseDepth = Math.max(3, baseDepth - 1);
    
    // Cap depth based on board size to maintain performance
    const maxDepth = this.game.size === 3 ? 6 : this.game.size === 4 ? 8 : 6;
    
    return Math.min(baseDepth, maxDepth);
  }

  /**
   * Clean up old transposition table entries
   */
  cleanupTranspositionTable() {
    const cutoffTime = Date.now() - 30000; // 30 seconds ago
    const keysToDelete = [];
    
    for (const [key, value] of this.transpositionTable.entries()) {
      if (value.timestamp < cutoffTime) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.transpositionTable.delete(key));
    
    if (window.debugAI) {
      console.log(`🧹 Cleaned ${keysToDelete.length} old cache entries`);
    }
  }

  /**
   * Decode board state to 2D array
   */
  decodeBoardState(boardState) {
    const board = [];
    for (let row = 0; row < this.game.size; row++) {
      board[row] = [];
      for (let col = 0; col < this.game.size; col++) {
        board[row][col] = boardState[row * this.game.size + col];
      }
    }
    return board;
  }

  /**
   * Get maximum tile value on the board
   */
  getMaxTile(board) {
    let max = 0;
    for (let row = 0; row < this.game.size; row++) {
      for (let col = 0; col < this.game.size; col++) {
        if (board[row][col] > max) {
          max = board[row][col];
        }
      }
    }
    return max;
  }

  /**
   * Get maximum tile value log2 on the board state
   */
  getMaxTileLog(boardState) {
    let max = 0;
    for (let i = 0; i < boardState.length; i++) {
      if (boardState[i] > max) {
        max = boardState[i];
      }
    }
    return max === 0 ? 0 : Math.log2(max);
  }

  /**
   * Check monotonicity patterns in the board
   */
  checkMonotonicityPatterns(board) {
    const size = this.game.size;
    
    // Check for snake patterns (zigzag)
    const patterns = {
      snakeDown: true,
      snakeRight: true,
      cornerTopLeft: true,
      cornerTopRight: true,
      cornerBottomLeft: true,
      cornerBottomRight: true
    };
    
    // Snake down pattern (columns decreasing left to right, rows increasing top to bottom)
    for (let col = 0; col < size - 1; col++) {
      for (let row = 0; row < size - 1; row++) {
        if (board[row][col] < board[row][col + 1] || board[row][col] < board[row + 1][col]) {
          patterns.snakeDown = false;
          break;
        }
      }
    }
    
    // Check corner patterns
    const corners = [
      { pattern: 'cornerTopLeft', row: 0, col: 0 },
      { pattern: 'cornerTopRight', row: 0, col: size - 1 },
      { pattern: 'cornerBottomLeft', row: size - 1, col: 0 },
      { pattern: 'cornerBottomRight', row: size - 1, col: size - 1 }
    ];
    
    corners.forEach(({ pattern, row, col }) => {
      const cornerValue = board[row][col];
      let isCornerMax = true;
      
      // Check if corner has the maximum or near-maximum value
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (board[r][c] > cornerValue * 2) {
            isCornerMax = false;
            break;
          }
        }
        if (!isCornerMax) break;
      }
      
      patterns[pattern] = isCornerMax;
    });
    
    return patterns;
  }

  /**
   * Calculate position-based tile weights
   */
  getPositionWeights(board) {
    const size = this.game.size;
    const weights = [];
    
    // Create weight matrix favoring corners and edges
    for (let row = 0; row < size; row++) {
      weights[row] = [];
      for (let col = 0; col < size; col++) {
        let weight = 1;
        
        // Corner bonus
        if ((row === 0 || row === size - 1) && (col === 0 || col === size - 1)) {
          weight += 3;
        }
        // Edge bonus
        else if (row === 0 || row === size - 1 || col === 0 || col === size - 1) {
          weight += 1;
        }
        
        // Distance from corners (penalty for center)
        const distanceFromCorner = Math.min(
          Math.min(row, size - 1 - row) + Math.min(col, size - 1 - col),
          Math.min(row, size - 1 - row) + Math.min(col, size - 1 - col)
        );
        
        weight -= distanceFromCorner * 0.5;
        
        weights[row][col] = Math.max(0.1, weight);
      }
    }
    
    return weights;
  }

  /**
   * Calculate strategic board evaluation
   */
  calculateStrategicEvaluation(board) {
    const patterns = this.checkMonotonicityPatterns(board);
    const positionWeights = this.getPositionWeights(board);
    const size = this.game.size;
    
    let strategicScore = 0;
    
    // Monotonicity bonus
    if (patterns.snakeDown) strategicScore += 1000;
    if (patterns.snakeRight) strategicScore += 500;
    
    // Corner strategy bonus
    Object.keys(patterns).forEach(pattern => {
      if (pattern.startsWith('corner') && patterns[pattern]) {
        strategicScore += 2000;
      }
    });
    
    // Position-weighted tile values
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        if (board[row][col] > 0) {
          strategicScore += board[row][col] * positionWeights[row][col];
        }
      }
    }
    
    return strategicScore;
  }

  /**
   * Get performance statistics
   */
  getStats() {
    return {
      cacheHits: this.cacheHits,
      totalLookups: this.totalLookups,
      cacheHitRate: this.totalLookups > 0 ? (this.cacheHits / this.totalLookups) : 0,
      transpositionTableSize: this.transpositionTable.size,
      weights: { ...this.weights }
    };
  }

  /**
   * Adjust heuristic weights
   */
  adjustWeights(newWeights) {
    this.weights = { ...this.weights, ...newWeights };
    
    // Recalculate heuristic table if weights changed
    for (let row = 0; row < 65536; row++) {
      const tiles = this.unpackRow(row);
      this.heuristicTable[row] = this.calculateRowHeuristic(tiles);
    }
  }

  /**
   * Clear caches and reset statistics
   */
  reset() {
    this.transpositionTable.clear();
    this.cacheHits = 0;
    this.totalLookups = 0;
  }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AdvancedAI2048Solver;
}

// Make available globally
window.AdvancedAI2048Solver = AdvancedAI2048Solver;
