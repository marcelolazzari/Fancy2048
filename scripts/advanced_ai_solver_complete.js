/**
 * 🧠 Advanced AI Solver for Fancy2048
 * Implementation of sophisticated 2048 AI algorithms
 */
class AdvancedAI2048Solver {
  constructor(options = {}) {
    this.maxDepth = options.maxDepth || 4;
    this.algorithm = options.algorithm || 'expectimax';
    this.transpositionTable = new Map();
    this.maxTableSize = 100000;
    this.heuristicWeights = {
      emptyCells: 2.7,
      maxTile: 1.0,
      smoothness: 0.1,
      monotonicity: 1.0,
      cornerBonus: 0.35
    };
    
    console.log('✅ Advanced AI Solver initialized');
  }

  // Main method to get the best move
  getBestMove(board) {
    if (!board || !Array.isArray(board)) {
      console.error('Invalid board provided to AI');
      return null;
    }

    try {
      const directions = ['up', 'down', 'left', 'right'];
      const moves = [];
      
      for (const direction of directions) {
        const testBoard = this.cloneBoard(board);
        const { moved, score } = this.simulateMove(testBoard, direction);
        
        if (moved) {
          const heuristic = this.expectimax(testBoard, this.maxDepth - 1, false);
          moves.push({ direction, score: heuristic });
        }
      }
      
      if (moves.length === 0) return null;
      
      // Sort moves by score (descending) and return the best
      moves.sort((a, b) => b.score - a.score);
      
      const bestMove = moves[0].direction;
      console.log(`AI suggests: ${bestMove} (score: ${moves[0].score.toFixed(2)})`);
      
      return bestMove;
    } catch (error) {
      console.error('AI error:', error);
      return this.getRandomMove(board);
    }
  }

  // Expectimax algorithm implementation
  expectimax(board, depth, isPlayerTurn) {
    if (depth === 0 || this.isGameOver(board)) {
      return this.evaluateBoard(board);
    }

    const boardKey = this.getBoardKey(board);
    if (this.transpositionTable.has(boardKey)) {
      return this.transpositionTable.get(boardKey);
    }

    let result;
    
    if (isPlayerTurn) {
      // Player turn - maximize score
      result = -Infinity;
      const directions = ['up', 'down', 'left', 'right'];
      
      for (const direction of directions) {
        const testBoard = this.cloneBoard(board);
        const { moved } = this.simulateMove(testBoard, direction);
        
        if (moved) {
          const value = this.expectimax(testBoard, depth - 1, false);
          result = Math.max(result, value);
        }
      }
      
      if (result === -Infinity) {
        result = this.evaluateBoard(board);
      }
    } else {
      // Computer turn - expected value of random tile placement
      result = 0;
      const emptyCells = this.getEmptyCells(board);
      
      if (emptyCells.length === 0) {
        return this.evaluateBoard(board);
      }
      
      for (const { row, col } of emptyCells) {
        // Try placing a 2
        const board2 = this.cloneBoard(board);
        board2[row][col] = 2;
        const value2 = this.expectimax(board2, depth - 1, true);
        result += 0.9 * value2; // 90% chance of 2
        
        // Try placing a 4
        const board4 = this.cloneBoard(board);
        board4[row][col] = 4;
        const value4 = this.expectimax(board4, depth - 1, true);
        result += 0.1 * value4; // 10% chance of 4
      }
      
      result /= emptyCells.length;
    }

    // Store in transposition table
    if (this.transpositionTable.size < this.maxTableSize) {
      this.transpositionTable.set(boardKey, result);
    }

    return result;
  }

  // Board evaluation heuristic
  evaluateBoard(board) {
    const size = board.length;
    let score = 0;

    // Empty cells bonus
    const emptyCells = this.getEmptyCells(board).length;
    score += emptyCells * this.heuristicWeights.emptyCells;

    // Maximum tile value
    const maxTile = Math.max(...board.flat());
    score += Math.log2(maxTile || 1) * this.heuristicWeights.maxTile;

    // Smoothness - prefer adjacent tiles with similar values
    let smoothness = 0;
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        if (board[row][col] === 0) continue;
        
        const value = Math.log2(board[row][col]);
        
        // Check right neighbor
        if (col < size - 1 && board[row][col + 1] !== 0) {
          const neighborValue = Math.log2(board[row][col + 1]);
          smoothness -= Math.abs(value - neighborValue);
        }
        
        // Check bottom neighbor
        if (row < size - 1 && board[row + 1][col] !== 0) {
          const neighborValue = Math.log2(board[row + 1][col]);
          smoothness -= Math.abs(value - neighborValue);
        }
      }
    }
    score += smoothness * this.heuristicWeights.smoothness;

    // Monotonicity - prefer decreasing values in one direction
    let monotonicity = 0;
    
    // Horizontal monotonicity
    for (let row = 0; row < size; row++) {
      let increasing = 0, decreasing = 0;
      for (let col = 0; col < size - 1; col++) {
        if (board[row][col] !== 0 && board[row][col + 1] !== 0) {
          const current = Math.log2(board[row][col]);
          const next = Math.log2(board[row][col + 1]);
          
          if (current < next) increasing += next - current;
          else if (current > next) decreasing += current - next;
        }
      }
      monotonicity += Math.max(increasing, decreasing);
    }
    
    // Vertical monotonicity
    for (let col = 0; col < size; col++) {
      let increasing = 0, decreasing = 0;
      for (let row = 0; row < size - 1; row++) {
        if (board[row][col] !== 0 && board[row + 1][col] !== 0) {
          const current = Math.log2(board[row][col]);
          const next = Math.log2(board[row + 1][col]);
          
          if (current < next) increasing += next - current;
          else if (current > next) decreasing += current - next;
        }
      }
      monotonicity += Math.max(increasing, decreasing);
    }
    score += monotonicity * this.heuristicWeights.monotonicity;

    // Corner bonus - prefer keeping highest tile in corner
    const corners = [board[0][0], board[0][size-1], board[size-1][0], board[size-1][size-1]];
    const maxCorner = Math.max(...corners);
    if (maxCorner === maxTile) {
      score += maxTile * this.heuristicWeights.cornerBonus;
    }

    return score;
  }

  // Simulate a move on a board
  simulateMove(board, direction) {
    const size = board.length;
    let moved = false;
    let score = 0;

    switch (direction) {
      case 'up':
        for (let col = 0; col < size; col++) {
          const column = [];
          for (let row = 0; row < size; row++) {
            if (board[row][col] !== 0) {
              column.push(board[row][col]);
            }
          }

          const { merged, addedScore } = this.mergeArray(column);
          score += addedScore;

          for (let row = 0; row < size; row++) {
            const newValue = merged[row] || 0;
            if (board[row][col] !== newValue) {
              moved = true;
            }
            board[row][col] = newValue;
          }
        }
        break;

      case 'down':
        for (let col = 0; col < size; col++) {
          const column = [];
          for (let row = size - 1; row >= 0; row--) {
            if (board[row][col] !== 0) {
              column.push(board[row][col]);
            }
          }

          const { merged, addedScore } = this.mergeArray(column);
          score += addedScore;

          for (let row = size - 1; row >= 0; row--) {
            const newValue = merged[size - 1 - row] || 0;
            if (board[row][col] !== newValue) {
              moved = true;
            }
            board[row][col] = newValue;
          }
        }
        break;

      case 'left':
        for (let row = 0; row < size; row++) {
          const rowArray = board[row].filter(cell => cell !== 0);
          const { merged, addedScore } = this.mergeArray(rowArray);
          score += addedScore;

          for (let col = 0; col < size; col++) {
            const newValue = merged[col] || 0;
            if (board[row][col] !== newValue) {
              moved = true;
            }
            board[row][col] = newValue;
          }
        }
        break;

      case 'right':
        for (let row = 0; row < size; row++) {
          const rowArray = board[row].filter(cell => cell !== 0).reverse();
          const { merged, addedScore } = this.mergeArray(rowArray);
          score += addedScore;

          merged.reverse();
          while (merged.length < size) {
            merged.unshift(0);
          }

          for (let col = 0; col < size; col++) {
            if (board[row][col] !== merged[col]) {
              moved = true;
            }
            board[row][col] = merged[col];
          }
        }
        break;
    }

    return { moved, score };
  }

  // Merge an array (row or column)
  mergeArray(array) {
    const merged = [...array];
    let addedScore = 0;

    for (let i = 0; i < merged.length - 1; i++) {
      if (merged[i] !== 0 && merged[i] === merged[i + 1]) {
        merged[i] *= 2;
        addedScore += merged[i];
        merged[i + 1] = 0;
      }
    }

    const result = merged.filter(cell => cell !== 0);
    return { merged: result, addedScore };
  }

  // Utility methods
  cloneBoard(board) {
    return board.map(row => [...row]);
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

  isGameOver(board) {
    // Check for empty cells
    if (this.getEmptyCells(board).length > 0) return false;

    // Check for possible merges
    const size = board.length;
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        const current = board[row][col];
        
        // Check right
        if (col < size - 1 && board[row][col + 1] === current) return false;
        
        // Check down
        if (row < size - 1 && board[row + 1][col] === current) return false;
      }
    }

    return true;
  }

  getBoardKey(board) {
    return board.map(row => row.join(',')).join('|');
  }

  getRandomMove(board) {
    const directions = ['up', 'down', 'left', 'right'];
    const validMoves = [];

    for (const direction of directions) {
      const testBoard = this.cloneBoard(board);
      const { moved } = this.simulateMove(testBoard, direction);
      if (moved) {
        validMoves.push(direction);
      }
    }

    return validMoves.length > 0 
      ? validMoves[Math.floor(Math.random() * validMoves.length)]
      : null;
  }

  // Configuration methods
  setDepth(depth) {
    this.maxDepth = Math.max(1, Math.min(6, depth));
  }

  setAlgorithm(algorithm) {
    this.algorithm = algorithm;
  }

  clearCache() {
    this.transpositionTable.clear();
  }

  getStats() {
    return {
      cacheSize: this.transpositionTable.size,
      maxDepth: this.maxDepth,
      algorithm: this.algorithm
    };
  }
}

// Make available globally
if (typeof window !== 'undefined') {
  window.AdvancedAI2048Solver = AdvancedAI2048Solver;
}

console.log('✅ Advanced AI Solver loaded successfully');
