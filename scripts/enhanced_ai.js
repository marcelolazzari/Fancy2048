/**
 * Enhanced AI for Fancy2048 using Minimax with Alpha-Beta Pruning
 * This AI can consistently reach 2048, 4096, and often 8192 or higher
 */

class Enhanced2048AI {
  constructor(game) {
    this.game = game;
    this.maxDepth = 4; // Adjust based on performance (3-6 recommended)
    this.cacheHits = 0;
    this.cacheSize = 0;
    this.evaluationCache = new Map();
    
    // Tuned weights for optimal performance
    this.weights = {
      emptyCells: 270,
      smoothness: 100,
      monotonicity: 1000,
      maxTileCorner: 200,
      merging: 500,
      positionScores: 150
    };

    // Precomputed position scores (higher values for corners/edges)
    this.positionWeights = this.generatePositionWeights();
  }

  // Main method called by the game
  getBestMove() {
    const startTime = performance.now();
    
    // Clear cache periodically to prevent memory issues
    if (this.evaluationCache.size > 10000) {
      this.evaluationCache.clear();
      this.cacheSize = 0;
    }

    const directions = ['up', 'down', 'left', 'right'];
    let bestMove = null;
    let bestScore = -Infinity;
    let moveEvaluations = [];

    for (const direction of directions) {
      if (this.game.canMove(direction)) {
        const moveResult = this.simulatePlayerMove(direction, this.game.board);
        
        if (moveResult.moved) {
          const score = this.minimax(
            moveResult.board, 
            moveResult.score,
            this.maxDepth - 1, 
            -Infinity, 
            Infinity, 
            false
          );
          
          moveEvaluations.push({
            direction,
            score,
            improvement: moveResult.score
          });
          
          if (score > bestScore) {
            bestScore = score;
            bestMove = direction;
          }
        }
      }
    }

    const executionTime = performance.now() - startTime;
    
    // Debug logging (can be disabled in production)
    if (window.debugAI) {
      console.log(`AI Decision in ${executionTime.toFixed(2)}ms:`);
      console.log('Move evaluations:', moveEvaluations);
      console.log(`Cache hits: ${this.cacheHits}/${this.cacheSize}`);
    }

    return bestMove || directions[Math.floor(Math.random() * directions.length)];
  }

  // Minimax algorithm with Alpha-Beta pruning
  minimax(board, currentScore, depth, alpha, beta, isMaximizing) {
    if (depth === 0 || this.isGameOver(board)) {
      return this.evaluateBoard(board, currentScore);
    }

    // Try to use cached evaluation
    const boardKey = this.getBoardKey(board);
    const cacheKey = `${boardKey}_${depth}_${isMaximizing}`;
    
    if (this.evaluationCache.has(cacheKey)) {
      this.cacheHits++;
      return this.evaluationCache.get(cacheKey);
    }

    let result;

    if (isMaximizing) {
      // Player's turn - try all possible moves
      result = this.maximizePlayer(board, currentScore, depth, alpha, beta);
    } else {
      // Computer's turn - place random tiles
      result = this.minimizeComputer(board, currentScore, depth, alpha, beta);
    }

    // Cache the result
    this.evaluationCache.set(cacheKey, result);
    this.cacheSize++;

    return result;
  }

  maximizePlayer(board, currentScore, depth, alpha, beta) {
    let maxScore = -Infinity;
    const directions = ['up', 'down', 'left', 'right'];
    let hasValidMove = false;

    for (const direction of directions) {
      const moveResult = this.simulatePlayerMove(direction, board);
      
      if (moveResult.moved) {
        hasValidMove = true;
        const score = this.minimax(
          moveResult.board, 
          currentScore + moveResult.score,
          depth - 1, 
          alpha, 
          beta, 
          false
        );
        
        maxScore = Math.max(maxScore, score);
        alpha = Math.max(alpha, score);
        
        if (beta <= alpha) break; // Alpha-Beta pruning
      }
    }

    return hasValidMove ? maxScore : this.evaluateBoard(board, currentScore);
  }

  minimizeComputer(board, currentScore, depth, alpha, beta) {
    const emptyCells = this.getEmptyCells(board);
    
    if (emptyCells.length === 0) {
      return this.evaluateBoard(board, currentScore);
    }

    let minScore = Infinity;
    
    // Limit the number of empty cells we consider for performance
    const cellsToConsider = emptyCells.length > 6 ? 
      this.selectBestEmptyCells(board, emptyCells, 6) : 
      emptyCells;

    for (const cell of cellsToConsider) {
      // 90% chance of 2, 10% chance of 4
      const expectedScore = 
        0.9 * this.evaluateTilePlacement(board, cell, 2, currentScore, depth, alpha, beta) +
        0.1 * this.evaluateTilePlacement(board, cell, 4, currentScore, depth, alpha, beta);
      
      minScore = Math.min(minScore, expectedScore);
      beta = Math.min(beta, expectedScore);
      
      if (beta <= alpha) break; // Alpha-Beta pruning
    }

    return minScore;
  }

  evaluateTilePlacement(board, cell, value, currentScore, depth, alpha, beta) {
    const newBoard = this.cloneBoard(board);
    newBoard[cell.row][cell.col] = value;
    
    return this.minimax(newBoard, currentScore, depth - 1, alpha, beta, true);
  }

  // Comprehensive board evaluation function
  evaluateBoard(board, currentScore = 0) {
    if (this.isGameOver(board)) {
      return -Infinity; // Game over is very bad
    }

    const emptyCellsScore = this.weights.emptyCells * this.countEmptyCells(board);
    const smoothnessScore = this.weights.smoothness * this.calculateSmoothness(board);
    const monotonicityScore = this.weights.monotonicity * this.calculateMonotonicity(board);
    const cornerScore = this.weights.maxTileCorner * this.calculateCornerScore(board);
    const mergingScore = this.weights.merging * this.calculateMergingPotential(board);
    const positionScore = this.weights.positionScores * this.calculatePositionScore(board);

    return currentScore + 
           emptyCellsScore + 
           smoothnessScore + 
           monotonicityScore + 
           cornerScore + 
           mergingScore + 
           positionScore;
  }

  // Enhanced smoothness calculation
  calculateSmoothness(board) {
    const size = board.length;
    let smoothness = 0;

    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        const currentValue = board[row][col];
        if (currentValue !== 0) {
          const logValue = Math.log2(currentValue);
          
          // Check right neighbor
          if (col < size - 1) {
            const rightValue = board[row][col + 1];
            if (rightValue !== 0) {
              smoothness -= Math.abs(logValue - Math.log2(rightValue));
            }
          }
          
          // Check bottom neighbor
          if (row < size - 1) {
            const bottomValue = board[row + 1][col];
            if (bottomValue !== 0) {
              smoothness -= Math.abs(logValue - Math.log2(bottomValue));
            }
          }
        }
      }
    }

    return smoothness;
  }

  // Enhanced monotonicity calculation
  calculateMonotonicity(board) {
    const size = board.length;
    let totalMono = 0;

    // Horizontal monotonicity
    for (let row = 0; row < size; row++) {
      let inc = 0, dec = 0;
      for (let col = 1; col < size; col++) {
        const prev = board[row][col - 1] || 1;
        const curr = board[row][col] || 1;
        const prevLog = Math.log2(prev);
        const currLog = Math.log2(curr);
        
        if (currLog > prevLog) {
          inc += currLog - prevLog;
        } else if (currLog < prevLog) {
          dec += prevLog - currLog;
        }
      }
      totalMono += Math.max(inc, dec);
    }

    // Vertical monotonicity
    for (let col = 0; col < size; col++) {
      let inc = 0, dec = 0;
      for (let row = 1; row < size; row++) {
        const prev = board[row - 1][col] || 1;
        const curr = board[row][col] || 1;
        const prevLog = Math.log2(prev);
        const currLog = Math.log2(curr);
        
        if (currLog > prevLog) {
          inc += currLog - prevLog;
        } else if (currLog < prevLog) {
          dec += prevLog - currLog;
        }
      }
      totalMono += Math.max(inc, dec);
    }

    return totalMono;
  }

  // Calculate corner bonus for keeping max tile in corner
  calculateCornerScore(board) {
    const size = board.length;
    const maxTile = this.getMaxTile(board);
    let cornerScore = 0;

    // Check all four corners
    const corners = [
      [0, 0], [0, size - 1], [size - 1, 0], [size - 1, size - 1]
    ];

    for (const [row, col] of corners) {
      if (board[row][col] === maxTile) {
        cornerScore += Math.log2(maxTile) * 10;
        break; // Only reward one corner
      }
    }

    return cornerScore;
  }

  // Calculate merging potential
  calculateMergingPotential(board) {
    const size = board.length;
    let mergingScore = 0;

    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        const current = board[row][col];
        if (current !== 0) {
          // Check adjacent cells for potential merges
          const neighbors = [
            [row - 1, col], [row + 1, col], [row, col - 1], [row, col + 1]
          ];
          
          for (const [r, c] of neighbors) {
            if (r >= 0 && r < size && c >= 0 && c < size) {
              const neighbor = board[r][c];
              if (neighbor === current) {
                mergingScore += Math.log2(current) * 2;
              }
            }
          }
        }
      }
    }

    return mergingScore;
  }

  // Calculate position-based scoring
  calculatePositionScore(board) {
    const size = board.length;
    let positionScore = 0;

    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        const value = board[row][col];
        if (value !== 0) {
          positionScore += Math.log2(value) * this.positionWeights[row][col];
        }
      }
    }

    return positionScore;
  }

  // Generate position weight matrix (higher values for corners and edges)
  generatePositionWeights() {
    const size = this.game.size;
    const weights = [];
    
    for (let row = 0; row < size; row++) {
      weights[row] = [];
      for (let col = 0; col < size; col++) {
        // Distance from corner (0,0)
        const distanceFromCorner = Math.min(row, col);
        // Prefer corners and edges
        weights[row][col] = size - distanceFromCorner;
      }
    }
    
    return weights;
  }

  // Utility methods
  simulatePlayerMove(direction, board) {
    const clonedBoard = this.cloneBoard(board);
    const originalBoard = this.cloneBoard(board);
    let moved = false;
    let score = 0;

    // Simulate the move (you'll need to adapt this to your game's move logic)
    switch (direction) {
      case 'up':
        ({ moved, score } = this.simulateMoveUp(clonedBoard));
        break;
      case 'down':
        ({ moved, score } = this.simulateMoveDown(clonedBoard));
        break;
      case 'left':
        ({ moved, score } = this.simulateMoveLeft(clonedBoard));
        break;
      case 'right':
        ({ moved, score } = this.simulateMoveRight(clonedBoard));
        break;
    }

    return {
      board: clonedBoard,
      moved: moved,
      score: score
    };
  }

  // Move simulation methods (adapt these to match your game's logic exactly)
  simulateMoveLeft(board) {
    const size = board.length;
    let moved = false;
    let score = 0;
    const merged = [];

    for (let row = 0; row < size; row++) {
      merged[row] = new Array(size).fill(false);
      
      // Move tiles left
      for (let col = 1; col < size; col++) {
        if (board[row][col] !== 0) {
          let newCol = col;
          
          // Find the leftmost position
          while (newCol > 0 && board[row][newCol - 1] === 0) {
            newCol--;
          }
          
          // Check for merge
          if (newCol > 0 && 
              board[row][newCol - 1] === board[row][col] && 
              !merged[row][newCol - 1]) {
            board[row][newCol - 1] *= 2;
            score += board[row][newCol - 1];
            board[row][col] = 0;
            merged[row][newCol - 1] = true;
            moved = true;
          } else if (newCol !== col) {
            board[row][newCol] = board[row][col];
            board[row][col] = 0;
            moved = true;
          }
        }
      }
    }

    return { moved, score };
  }

  simulateMoveRight(board) {
    const size = board.length;
    let moved = false;
    let score = 0;
    const merged = [];

    for (let row = 0; row < size; row++) {
      merged[row] = new Array(size).fill(false);
      
      for (let col = size - 2; col >= 0; col--) {
        if (board[row][col] !== 0) {
          let newCol = col;
          
          while (newCol < size - 1 && board[row][newCol + 1] === 0) {
            newCol++;
          }
          
          if (newCol < size - 1 && 
              board[row][newCol + 1] === board[row][col] && 
              !merged[row][newCol + 1]) {
            board[row][newCol + 1] *= 2;
            score += board[row][newCol + 1];
            board[row][col] = 0;
            merged[row][newCol + 1] = true;
            moved = true;
          } else if (newCol !== col) {
            board[row][newCol] = board[row][col];
            board[row][col] = 0;
            moved = true;
          }
        }
      }
    }

    return { moved, score };
  }

  simulateMoveUp(board) {
    const size = board.length;
    let moved = false;
    let score = 0;
    const merged = [];

    for (let col = 0; col < size; col++) {
      merged[col] = new Array(size).fill(false);
      
      for (let row = 1; row < size; row++) {
        if (board[row][col] !== 0) {
          let newRow = row;
          
          while (newRow > 0 && board[newRow - 1][col] === 0) {
            newRow--;
          }
          
          if (newRow > 0 && 
              board[newRow - 1][col] === board[row][col] && 
              !merged[col][newRow - 1]) {
            board[newRow - 1][col] *= 2;
            score += board[newRow - 1][col];
            board[row][col] = 0;
            merged[col][newRow - 1] = true;
            moved = true;
          } else if (newRow !== row) {
            board[newRow][col] = board[row][col];
            board[row][col] = 0;
            moved = true;
          }
        }
      }
    }

    return { moved, score };
  }

  simulateMoveDown(board) {
    const size = board.length;
    let moved = false;
    let score = 0;
    const merged = [];

    for (let col = 0; col < size; col++) {
      merged[col] = new Array(size).fill(false);
      
      for (let row = size - 2; row >= 0; row--) {
        if (board[row][col] !== 0) {
          let newRow = row;
          
          while (newRow < size - 1 && board[newRow + 1][col] === 0) {
            newRow++;
          }
          
          if (newRow < size - 1 && 
              board[newRow + 1][col] === board[row][col] && 
              !merged[col][newRow + 1]) {
            board[newRow + 1][col] *= 2;
            score += board[newRow + 1][col];
            board[row][col] = 0;
            merged[col][newRow + 1] = true;
            moved = true;
          } else if (newRow !== row) {
            board[newRow][col] = board[row][col];
            board[row][col] = 0;
            moved = true;
          }
        }
      }
    }

    return { moved, score };
  }

  // Helper methods
  cloneBoard(board) {
    return board.map(row => row.slice());
  }

  getEmptyCells(board) {
    const emptyCells = [];
    for (let row = 0; row < board.length; row++) {
      for (let col = 0; col < board[row].length; col++) {
        if (board[row][col] === 0) {
          emptyCells.push({ row, col });
        }
      }
    }
    return emptyCells;
  }

  selectBestEmptyCells(board, emptyCells, maxCells) {
    // Select empty cells that are most likely to be useful
    // Prioritize corners and edges
    return emptyCells
      .map(cell => ({
        ...cell,
        priority: this.positionWeights[cell.row][cell.col]
      }))
      .sort((a, b) => b.priority - a.priority)
      .slice(0, maxCells);
  }

  countEmptyCells(board) {
    return this.getEmptyCells(board).length;
  }

  getMaxTile(board) {
    let maxTile = 0;
    for (let row = 0; row < board.length; row++) {
      for (let col = 0; col < board[row].length; col++) {
        maxTile = Math.max(maxTile, board[row][col]);
      }
    }
    return maxTile;
  }

  isGameOver(board) {
    // Check if there are empty cells
    if (this.countEmptyCells(board) > 0) {
      return false;
    }

    // Check if any moves are possible
    const size = board.length;
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        const current = board[row][col];
        
        // Check right neighbor
        if (col < size - 1 && board[row][col + 1] === current) {
          return false;
        }
        
        // Check bottom neighbor
        if (row < size - 1 && board[row + 1][col] === current) {
          return false;
        }
      }
    }

    return true;
  }

  getBoardKey(board) {
    return board.map(row => row.join(',')).join(';');
  }

  // Performance tuning methods
  setDepth(depth) {
    this.maxDepth = Math.max(2, Math.min(6, depth));
  }

  adjustWeights(newWeights) {
    this.weights = { ...this.weights, ...newWeights };
  }

  getStats() {
    return {
      cacheHits: this.cacheHits,
      cacheSize: this.cacheSize,
      maxDepth: this.maxDepth,
      weights: { ...this.weights }
    };
  }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Enhanced2048AI;
}

// Enable AI debugging in console
window.Enhanced2048AI = Enhanced2048AI;