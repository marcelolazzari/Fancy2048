/**
 * 🚀 Enhanced AI System for Fancy2048
 * Provides multiple AI algorithms and performance optimizations
 */
class EnhancedAI {
  constructor() {
    this.algorithms = {
      basic: this.basicAI.bind(this),
      advanced: this.advancedAI.bind(this),
      expectimax: this.expectimaxAI.bind(this)
    };
    
    this.currentAlgorithm = 'expectimax';
    this.difficulty = 'normal';
    this.depthSettings = {
      easy: 2,
      normal: 3,
      hard: 4,
      expert: 5
    };
    
    console.log('✅ Enhanced AI System initialized');
  }

  // Main AI interface
  getBestMove(board, algorithm = null) {
    const alg = algorithm || this.currentAlgorithm;
    
    if (this.algorithms[alg]) {
      return this.algorithms[alg](board);
    }
    
    return this.basicAI(board);
  }

  // Basic AI implementation
  basicAI(board) {
    const moves = this.getAllValidMoves(board);
    if (moves.length === 0) return null;

    // Simple heuristic: prefer moves that create the most empty cells
    let bestMove = moves[0];
    let bestScore = -1;

    for (const move of moves) {
      const testBoard = this.cloneBoard(board);
      this.simulateMove(testBoard, move.direction);
      const emptyCells = this.countEmptyCells(testBoard);
      const cornerScore = this.getCornerScore(testBoard);
      const score = emptyCells * 10 + cornerScore;

      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }

    return bestMove.direction;
  }

  // Advanced AI with multiple heuristics
  advancedAI(board) {
    const moves = this.getAllValidMoves(board);
    if (moves.length === 0) return null;

    let bestMove = moves[0];
    let bestScore = -Infinity;

    for (const move of moves) {
      const testBoard = this.cloneBoard(board);
      this.simulateMove(testBoard, move.direction);
      
      const score = this.evaluateAdvancedBoard(testBoard);
      
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }

    return bestMove.direction;
  }

  // Expectimax AI (uses AdvancedAI2048Solver if available)
  expectimaxAI(board) {
    if (typeof AdvancedAI2048Solver !== 'undefined') {
      if (!this.advancedSolver) {
        this.advancedSolver = new AdvancedAI2048Solver({
          maxDepth: this.depthSettings[this.difficulty]
        });
      }
      
      return this.advancedSolver.getBestMove(board);
    }
    
    // Fallback to advanced AI
    return this.advancedAI(board);
  }

  // Board evaluation for advanced AI
  evaluateAdvancedBoard(board) {
    let score = 0;
    
    // Empty cells bonus
    score += this.countEmptyCells(board) * 100;
    
    // Maximum tile bonus
    const maxTile = Math.max(...board.flat());
    score += Math.log2(maxTile || 1) * 50;
    
    // Corner bonus
    score += this.getCornerScore(board);
    
    // Monotonicity bonus
    score += this.getMonotonicityScore(board);
    
    // Smoothness bonus
    score += this.getSmoothnessScore(board);
    
    return score;
  }

  // Heuristic functions
  countEmptyCells(board) {
    let count = 0;
    for (let row = 0; row < board.length; row++) {
      for (let col = 0; col < board[row].length; col++) {
        if (board[row][col] === 0) count++;
      }
    }
    return count;
  }

  getCornerScore(board) {
    const size = board.length;
    const corners = [
      board[0][0],
      board[0][size - 1],
      board[size - 1][0],
      board[size - 1][size - 1]
    ];
    
    const maxTile = Math.max(...board.flat());
    const maxCorner = Math.max(...corners);
    
    return maxCorner === maxTile ? maxTile * 2 : 0;
  }

  getMonotonicityScore(board) {
    const size = board.length;
    let totalScore = 0;

    // Check horizontal monotonicity
    for (let row = 0; row < size; row++) {
      let increasing = 0;
      let decreasing = 0;
      
      for (let col = 0; col < size - 1; col++) {
        const current = board[row][col];
        const next = board[row][col + 1];
        
        if (current > 0 && next > 0) {
          if (current <= next) increasing++;
          if (current >= next) decreasing++;
        }
      }
      
      totalScore += Math.max(increasing, decreasing) * 10;
    }

    // Check vertical monotonicity
    for (let col = 0; col < size; col++) {
      let increasing = 0;
      let decreasing = 0;
      
      for (let row = 0; row < size - 1; row++) {
        const current = board[row][col];
        const next = board[row + 1][col];
        
        if (current > 0 && next > 0) {
          if (current <= next) increasing++;
          if (current >= next) decreasing++;
        }
      }
      
      totalScore += Math.max(increasing, decreasing) * 10;
    }

    return totalScore;
  }

  getSmoothnessScore(board) {
    const size = board.length;
    let smoothness = 0;

    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        if (board[row][col] === 0) continue;
        
        const value = Math.log2(board[row][col]);
        
        // Check adjacent cells
        const neighbors = [];
        if (row > 0) neighbors.push(board[row - 1][col]);
        if (row < size - 1) neighbors.push(board[row + 1][col]);
        if (col > 0) neighbors.push(board[row][col - 1]);
        if (col < size - 1) neighbors.push(board[row][col + 1]);
        
        for (const neighbor of neighbors) {
          if (neighbor > 0) {
            const neighborValue = Math.log2(neighbor);
            smoothness -= Math.abs(value - neighborValue);
          }
        }
      }
    }

    return smoothness;
  }

  // Utility functions
  getAllValidMoves(board) {
    const directions = ['up', 'down', 'left', 'right'];
    const validMoves = [];

    for (const direction of directions) {
      const testBoard = this.cloneBoard(board);
      const moved = this.simulateMove(testBoard, direction);
      
      if (moved) {
        validMoves.push({ direction, board: testBoard });
      }
    }

    return validMoves;
  }

  simulateMove(board, direction) {
    const size = board.length;
    let moved = false;

    switch (direction) {
      case 'up':
        for (let col = 0; col < size; col++) {
          const column = [];
          for (let row = 0; row < size; row++) {
            if (board[row][col] !== 0) {
              column.push(board[row][col]);
            }
          }
          
          const merged = this.mergeArray(column);
          for (let row = 0; row < size; row++) {
            const newValue = merged[row] || 0;
            if (board[row][col] !== newValue) moved = true;
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
          
          const merged = this.mergeArray(column);
          for (let row = size - 1; row >= 0; row--) {
            const newValue = merged[size - 1 - row] || 0;
            if (board[row][col] !== newValue) moved = true;
            board[row][col] = newValue;
          }
        }
        break;

      case 'left':
        for (let row = 0; row < size; row++) {
          const rowData = board[row].filter(cell => cell !== 0);
          const merged = this.mergeArray(rowData);
          
          for (let col = 0; col < size; col++) {
            const newValue = merged[col] || 0;
            if (board[row][col] !== newValue) moved = true;
            board[row][col] = newValue;
          }
        }
        break;

      case 'right':
        for (let row = 0; row < size; row++) {
          const rowData = board[row].filter(cell => cell !== 0).reverse();
          const merged = this.mergeArray(rowData);
          
          // Pad with zeros and reverse
          while (merged.length < size) merged.push(0);
          merged.reverse();
          
          for (let col = 0; col < size; col++) {
            if (board[row][col] !== merged[col]) moved = true;
            board[row][col] = merged[col];
          }
        }
        break;
    }

    return moved;
  }

  mergeArray(array) {
    const result = [...array];
    
    for (let i = 0; i < result.length - 1; i++) {
      if (result[i] !== 0 && result[i] === result[i + 1]) {
        result[i] *= 2;
        result[i + 1] = 0;
      }
    }
    
    return result.filter(value => value !== 0);
  }

  cloneBoard(board) {
    return board.map(row => [...row]);
  }

  // Configuration methods
  setAlgorithm(algorithm) {
    if (this.algorithms[algorithm]) {
      this.currentAlgorithm = algorithm;
      console.log(`AI algorithm changed to: ${algorithm}`);
    }
  }

  setDifficulty(difficulty) {
    if (this.depthSettings[difficulty]) {
      this.difficulty = difficulty;
      
      if (this.advancedSolver) {
        this.advancedSolver.setDepth(this.depthSettings[difficulty]);
      }
      
      console.log(`AI difficulty changed to: ${difficulty}`);
    }
  }

  getAvailableAlgorithms() {
    return Object.keys(this.algorithms);
  }

  getCurrentSettings() {
    return {
      algorithm: this.currentAlgorithm,
      difficulty: this.difficulty,
      depth: this.depthSettings[this.difficulty]
    };
  }
}

// Performance testing utilities
class AIPerformanceTester {
  constructor(ai) {
    this.ai = ai;
  }

  async testMove(board, iterations = 10) {
    const times = [];
    let totalTime = 0;

    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      this.ai.getBestMove(board);
      const endTime = performance.now();
      
      const duration = endTime - startTime;
      times.push(duration);
      totalTime += duration;
    }

    return {
      average: totalTime / iterations,
      min: Math.min(...times),
      max: Math.max(...times),
      times
    };
  }

  async benchmarkAlgorithms(board) {
    const algorithms = this.ai.getAvailableAlgorithms();
    const results = {};

    for (const algorithm of algorithms) {
      const originalAlg = this.ai.currentAlgorithm;
      this.ai.setAlgorithm(algorithm);
      
      results[algorithm] = await this.testMove(board, 5);
      
      this.ai.setAlgorithm(originalAlg);
    }

    return results;
  }
}

// Make available globally
if (typeof window !== 'undefined') {
  window.EnhancedAI = EnhancedAI;
  window.AIPerformanceTester = AIPerformanceTester;
}

console.log('✅ Enhanced AI System loaded successfully');
