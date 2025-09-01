/**
 * AI Learning System for 2048
 * Stores game history and learns from successful strategies
 */
class AILearningSystem {
  constructor() {
    this.storageKey = 'fancy2048_ai_learning_data';
    this.maxStoredGames = 1000; // Limit storage size
    this.learningData = this.loadLearningData();
    this.currentGameMoves = [];
    this.patternWeights = new Map();
    this.moveSuccessRates = new Map();
    this.positionStrategies = new Map();
    
    // Initialize learning parameters
    this.learningRate = 0.1;
    this.explorationRate = 0.15;
    this.decayRate = 0.995;
    
    console.log('🧠 AI Learning System initialized with', this.learningData.games.length, 'historical games');
  }

  /**
   * Load existing learning data from localStorage
   */
  loadLearningData() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        return {
          version: data.version || '1.0.0',
          created: data.created || new Date().toISOString(),
          lastUpdated: data.lastUpdated || new Date().toISOString(),
          games: data.games || [],
          patterns: data.patterns || {},
          moveStats: data.moveStats || {},
          positionWeights: data.positionWeights || {},
          performance: data.performance || {
            totalGames: 0,
            averageScore: 0,
            maxTileAchieved: 0,
            winRate: 0
          }
        };
      }
    } catch (error) {
      console.warn('⚠️ Error loading AI learning data:', error);
    }

    // Return default structure
    return {
      version: '1.0.0',
      created: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      games: [],
      patterns: {},
      moveStats: {},
      positionWeights: {},
      performance: {
        totalGames: 0,
        averageScore: 0,
        maxTileAchieved: 0,
        winRate: 0
      }
    };
  }

  /**
   * Save learning data to localStorage
   */
  saveLearningData() {
    try {
      this.learningData.lastUpdated = new Date().toISOString();
      localStorage.setItem(this.storageKey, JSON.stringify(this.learningData));
      console.log('💾 AI learning data saved successfully');
    } catch (error) {
      console.error('❌ Error saving AI learning data:', error);
    }
  }

  /**
   * Record a move during the current game
   */
  recordMove(boardState, move, resultState, scoreGained) {
    const moveData = {
      timestamp: Date.now(),
      boardHash: this.hashBoardState(boardState),
      move: move,
      boardState: [...boardState],
      resultState: [...resultState],
      scoreGained: scoreGained,
      emptyCells: this.countEmptyCells(boardState),
      maxTile: Math.max(...boardState),
      boardFillRatio: this.getBoardFillRatio(boardState)
    };

    this.currentGameMoves.push(moveData);
  }

  /**
   * Record the end of a game and analyze performance
   */
  recordGameEnd(finalScore, maxTile, won, totalMoves) {
    const gameData = {
      id: this.generateGameId(),
      timestamp: new Date().toISOString(),
      finalScore: finalScore,
      maxTile: maxTile,
      won: won,
      totalMoves: totalMoves,
      moves: [...this.currentGameMoves],
      duration: this.currentGameMoves.length > 0 ? 
        this.currentGameMoves[this.currentGameMoves.length - 1].timestamp - this.currentGameMoves[0].timestamp : 0,
      efficiency: totalMoves > 0 ? finalScore / totalMoves : 0
    };

    // Add game to learning data
    this.learningData.games.push(gameData);
    
    // Maintain storage limit
    if (this.learningData.games.length > this.maxStoredGames) {
      // Remove oldest games, but keep some high-scoring ones
      this.learningData.games.sort((a, b) => b.finalScore - a.finalScore);
      const topGames = this.learningData.games.slice(0, Math.floor(this.maxStoredGames * 0.3));
      const recentGames = this.learningData.games.slice(-Math.floor(this.maxStoredGames * 0.7));
      this.learningData.games = [...topGames, ...recentGames];
    }

    // Update performance statistics
    this.updatePerformanceStats();
    
    // Learn from this game
    this.learnFromGame(gameData);
    
    // Save the updated data
    this.saveLearningData();
    
    // Reset for next game
    this.currentGameMoves = [];

    console.log(`🎮 Game recorded: Score ${finalScore}, Max Tile ${maxTile}, ${won ? 'Won' : 'Lost'}`);
  }

  /**
   * Learn patterns and strategies from completed games
   */
  learnFromGame(gameData) {
    // Learn from successful moves
    gameData.moves.forEach((move, index) => {
      const pattern = this.extractPattern(move.boardState);
      const success = this.evaluateMoveSuccess(move, gameData.moves[index + 1]);
      
      // Update pattern weights
      this.updatePatternWeight(pattern, move.move, success);
      
      // Update move success rates
      this.updateMoveSuccessRate(move.boardHash, move.move, success);
      
      // Update position strategies
      this.updatePositionStrategy(move.boardState, move.move, success);
    });

    // Learn from game outcome
    this.updateGameOutcomeWeights(gameData);
  }

  /**
   * Extract board pattern for learning
   */
  extractPattern(boardState) {
    const size = Math.sqrt(boardState.length);
    const pattern = {
      corners: [],
      edges: [],
      center: [],
      maxTilePosition: -1,
      emptyCount: 0,
      tileDensity: this.calculateTileDensity(boardState)
    };

    // Extract corner positions
    pattern.corners = [
      boardState[0], // top-left
      boardState[size - 1], // top-right
      boardState[size * (size - 1)], // bottom-left
      boardState[size * size - 1] // bottom-right
    ];

    // Find max tile position
    const maxValue = Math.max(...boardState);
    pattern.maxTilePosition = boardState.indexOf(maxValue);

    // Count empty cells
    pattern.emptyCount = boardState.filter(cell => cell === 0).length;

    return pattern;
  }

  /**
   * Evaluate if a move was successful
   */
  evaluateMoveSuccess(currentMove, nextMove) {
    if (!nextMove) return { score: 0, factors: {} };

    const factors = {
      scoreGain: nextMove.scoreGained > 0 ? 1 : 0,
      emptyCellsIncreased: nextMove.emptyCells > currentMove.emptyCells ? 1 : 0,
      maxTileImproved: nextMove.maxTile > currentMove.maxTile ? 2 : 0,
      boardFillImproved: nextMove.boardFillRatio < currentMove.boardFillRatio ? 1 : 0
    };

    const successScore = Object.values(factors).reduce((sum, val) => sum + val, 0);
    return { score: successScore, factors };
  }

  /**
   * Update pattern weight based on success
   */
  updatePatternWeight(pattern, move, success) {
    const patternKey = this.hashPattern(pattern);
    const moveKey = `${patternKey}_${move}`;
    
    if (!this.learningData.patterns[moveKey]) {
      this.learningData.patterns[moveKey] = {
        pattern: pattern,
        move: move,
        successCount: 0,
        totalCount: 0,
        averageSuccess: 0,
        weight: 1.0
      };
    }

    const data = this.learningData.patterns[moveKey];
    data.totalCount++;
    data.successCount += success.score;
    data.averageSuccess = data.successCount / data.totalCount;
    
    // Update weight using learning rate
    const targetWeight = 0.5 + (data.averageSuccess * 0.5);
    data.weight += this.learningRate * (targetWeight - data.weight);
  }

  /**
   * Update move success rate for specific board positions
   */
  updateMoveSuccessRate(boardHash, move, success) {
    const key = `${boardHash}_${move}`;
    
    if (!this.learningData.moveStats[key]) {
      this.learningData.moveStats[key] = {
        move: move,
        attempts: 0,
        successSum: 0,
        averageSuccess: 0,
        confidence: 0
      };
    }

    const data = this.learningData.moveStats[key];
    data.attempts++;
    data.successSum += success.score;
    data.averageSuccess = data.successSum / data.attempts;
    data.confidence = Math.min(1.0, data.attempts / 10); // Confidence increases with attempts
  }

  /**
   * Update position-based strategy weights
   */
  updatePositionStrategy(boardState, move, success) {
    const maxTilePos = boardState.indexOf(Math.max(...boardState));
    const emptyCount = boardState.filter(cell => cell === 0).length;
    const strategyKey = `pos_${maxTilePos}_empty_${emptyCount}_move_${move}`;
    
    if (!this.learningData.positionWeights[strategyKey]) {
      this.learningData.positionWeights[strategyKey] = {
        position: maxTilePos,
        emptyCount: emptyCount,
        move: move,
        weight: 1.0,
        samples: 0
      };
    }

    const data = this.learningData.positionWeights[strategyKey];
    data.samples++;
    
    // Adjust weight based on success
    const adjustment = this.learningRate * (success.score - 2); // 2 is average success
    data.weight = Math.max(0.1, Math.min(3.0, data.weight + adjustment));
  }

  /**
   * Get AI recommendation based on learned patterns
   */
  getLearnedMoveRecommendation(boardState, possibleMoves) {
    const recommendations = possibleMoves.map(move => {
      let score = 1.0; // Base score
      let confidence = 0.1;

      // Pattern-based recommendation
      const pattern = this.extractPattern(boardState);
      const patternKey = `${this.hashPattern(pattern)}_${move}`;
      
      if (this.learningData.patterns[patternKey]) {
        const patternData = this.learningData.patterns[patternKey];
        score *= patternData.weight;
        confidence += patternData.averageSuccess * 0.3;
      }

      // Move statistics recommendation
      const boardHash = this.hashBoardState(boardState);
      const moveKey = `${boardHash}_${move}`;
      
      if (this.learningData.moveStats[moveKey]) {
        const moveData = this.learningData.moveStats[moveKey];
        score *= (1 + moveData.averageSuccess * 0.5);
        confidence += moveData.confidence * 0.4;
      }

      // Position strategy recommendation
      const maxTilePos = boardState.indexOf(Math.max(...boardState));
      const emptyCount = boardState.filter(cell => cell === 0).length;
      const strategyKey = `pos_${maxTilePos}_empty_${emptyCount}_move_${move}`;
      
      if (this.learningData.positionWeights[strategyKey]) {
        const posData = this.learningData.positionWeights[strategyKey];
        score *= posData.weight;
        confidence += Math.min(1.0, posData.samples / 20) * 0.3;
      }

      return {
        move: move,
        score: score,
        confidence: Math.min(1.0, confidence),
        recommendation: score > 1.2 ? 'highly_recommended' : 
                      score > 0.8 ? 'recommended' : 'neutral'
      };
    });

    // Sort by score
    recommendations.sort((a, b) => b.score - a.score);
    
    return recommendations;
  }

  /**
   * Get learning statistics for display
   */
  getLearningStats() {
    return {
      totalGames: this.learningData.games.length,
      performance: this.learningData.performance,
      patternsLearned: Object.keys(this.learningData.patterns).length,
      moveStatsCollected: Object.keys(this.learningData.moveStats).length,
      positionStrategies: Object.keys(this.learningData.positionWeights).length,
      averageGameLength: this.calculateAverageGameLength(),
      topStrategies: this.getTopStrategies(),
      recentImprovement: this.calculateRecentImprovement()
    };
  }

  // Helper methods
  hashBoardState(boardState) {
    return boardState.map(cell => cell.toString(36)).join('');
  }

  hashPattern(pattern) {
    return JSON.stringify({
      corners: pattern.corners,
      maxPos: pattern.maxTilePosition,
      empty: pattern.emptyCount
    });
  }

  countEmptyCells(boardState) {
    return boardState.filter(cell => cell === 0).length;
  }

  getBoardFillRatio(boardState) {
    const nonEmptyCells = boardState.filter(cell => cell > 0).length;
    return nonEmptyCells / boardState.length;
  }

  calculateTileDensity(boardState) {
    const nonZeroCells = boardState.filter(cell => cell > 0);
    if (nonZeroCells.length === 0) return 0;
    
    const sum = nonZeroCells.reduce((acc, val) => acc + Math.log2(val), 0);
    return sum / nonZeroCells.length;
  }

  generateGameId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }

  updatePerformanceStats() {
    const games = this.learningData.games;
    if (games.length === 0) return;

    const recent = games.slice(-50); // Last 50 games
    
    this.learningData.performance = {
      totalGames: games.length,
      averageScore: games.reduce((sum, g) => sum + g.finalScore, 0) / games.length,
      recentAverageScore: recent.reduce((sum, g) => sum + g.finalScore, 0) / recent.length,
      maxTileAchieved: Math.max(...games.map(g => g.maxTile)),
      winRate: games.filter(g => g.won).length / games.length,
      recentWinRate: recent.filter(g => g.won).length / recent.length,
      averageGameLength: games.reduce((sum, g) => sum + g.totalMoves, 0) / games.length,
      bestGame: games.reduce((best, current) => 
        current.finalScore > best.finalScore ? current : best, games[0])
    };
  }

  calculateAverageGameLength() {
    const games = this.learningData.games;
    if (games.length === 0) return 0;
    return games.reduce((sum, g) => sum + g.totalMoves, 0) / games.length;
  }

  getTopStrategies() {
    const strategies = Object.values(this.learningData.patterns)
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 5);
    
    return strategies.map(s => ({
      move: s.move,
      weight: s.weight,
      success: s.averageSuccess,
      samples: s.totalCount
    }));
  }

  calculateRecentImprovement() {
    const games = this.learningData.games;
    if (games.length < 20) return 0;

    const oldGames = games.slice(-40, -20);
    const newGames = games.slice(-20);

    const oldAvg = oldGames.reduce((sum, g) => sum + g.finalScore, 0) / oldGames.length;
    const newAvg = newGames.reduce((sum, g) => sum + g.finalScore, 0) / newGames.length;

    return ((newAvg - oldAvg) / oldAvg) * 100;
  }

  updateGameOutcomeWeights(gameData) {
    // Additional learning from overall game success
    const gameSuccess = gameData.won ? 3 : (gameData.finalScore > 10000 ? 2 : 1);
    
    // Boost weights for moves that led to successful games
    gameData.moves.forEach((move, index) => {
      if (index < gameData.moves.length * 0.8) { // Focus on early/mid game moves
        const pattern = this.extractPattern(move.boardState);
        const patternKey = `${this.hashPattern(pattern)}_${move.move}`;
        
        if (this.learningData.patterns[patternKey]) {
          this.learningData.patterns[patternKey].weight *= (1 + gameSuccess * 0.05);
          this.learningData.patterns[patternKey].weight = Math.min(3.0, this.learningData.patterns[patternKey].weight);
        }
      }
    });
  }

  /**
   * Export learning data for backup
   */
  exportLearningData() {
    const exportData = {
      ...this.learningData,
      exportDate: new Date().toISOString(),
      exportVersion: '1.0.0'
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `2048_ai_learning_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('📁 Learning data exported successfully');
  }

  /**
   * Import learning data from backup
   */
  async importLearningData(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedData = JSON.parse(e.target.result);
          
          // Validate and merge data
          if (importedData.version && importedData.games) {
            this.learningData = {
              ...this.learningData,
              ...importedData,
              lastUpdated: new Date().toISOString()
            };
            
            this.saveLearningData();
            console.log('📥 Learning data imported successfully');
            resolve(this.learningData);
          } else {
            reject(new Error('Invalid learning data format'));
          }
        } catch (error) {
          reject(error);
        }
      };
      reader.readAsText(file);
    });
  }

  /**
   * Clear all learning data (reset)
   */
  clearLearningData() {
    localStorage.removeItem(this.storageKey);
    this.learningData = this.loadLearningData();
    console.log('🔄 Learning data cleared');
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AILearningSystem;
}/**
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
    
    // Initialize learning system with error handling
    try {
      if (window.AILearningSystem) {
        this.learningSystem = new window.AILearningSystem();
        this.isLearningEnabled = true;
        console.log('✅ AI Learning System integrated with Advanced AI');
      } else {
        console.warn('⚠️ AI Learning System not available, using basic AI mode');
        this.learningSystem = null;
        this.isLearningEnabled = false;
      }
    } catch (error) {
      console.error('❌ Failed to initialize AI Learning System:', error);
      this.learningSystem = null;
      this.isLearningEnabled = false;
    }
    
    this.currentGameMoves = [];
    
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

    // Learning integration with error handling
    try {
      this.adaptWeightsFromLearning();
    } catch (error) {
      console.error('❌ Failed to adapt weights from learning:', error);
      // Continue without learning adaptation
    }
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
   * Enhanced AI decision method with adaptive depth, move ordering, and learning integration
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
    
    // Get learning-based recommendations if available
    let learningRecommendations = null;
    if (this.isLearningEnabled && this.learningSystem) {
      const validMoves = directions.filter(dir => 
        this.simulateMove(boardState, dir) !== boardState
      );
      
      if (validMoves.length > 0) {
        learningRecommendations = this.learningSystem.getLearnedMoveRecommendation(
          this.decodeBoardStateToArray(boardState), 
          validMoves
        );
      }
    }
    
    for (const direction of directions) {
      const nextState = this.simulateMove(boardState, direction);
      
      if (nextState !== boardState) { // Move is valid
        // Quick evaluation for move ordering
        const quickScore = this.evaluateBoard(nextState);
        
        // Deep evaluation with expectimax
        const deepScore = this.expectimax(nextState, searchDepth, false, 1.0);
        
        // Learning-based score adjustment
        let learningBonus = 0;
        if (learningRecommendations) {
          const recommendation = learningRecommendations.find(r => r.move === direction);
          if (recommendation) {
            learningBonus = (recommendation.score - 1.0) * 1000 * recommendation.confidence;
          }
        }
        
        // Combined score with quick, deep evaluation, and learning bonus
        const combinedScore = deepScore + (quickScore * 0.1) + learningBonus;
        
        moveScores[direction] = combinedScore;
        moveAnalysis[direction] = {
          quick: quickScore,
          deep: deepScore,
          learningBonus: learningBonus,
          combined: combinedScore
        };
        
        if (combinedScore > bestScore) {
          bestScore = combinedScore;
          bestMove = direction;
        }
      }
    }
    
    const executionTime = performance.now() - startTime;
    
    // Record move for learning (if enabled)
    if (this.isLearningEnabled && bestMove && this.learningSystem) {
      const currentBoard = this.decodeBoardStateToArray(boardState);
      const nextBoard = this.decodeBoardStateToArray(this.simulateMove(boardState, bestMove));
      const scoreGained = this.calculateScoreGain(currentBoard, nextBoard);
      
      this.learningSystem.recordMove(currentBoard, bestMove, nextBoard, scoreGained);
    }
    
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
        learningActive: this.isLearningEnabled,
        learningRecommendations: learningRecommendations,
        cacheHitRate: (this.cacheHits / Math.max(this.totalLookups, 1) * 100).toFixed(1) + '%'
      });
    }
    
    // Enhanced fallback logic - ensure we return a valid move
    if (!bestMove) {
      // Find any valid move as fallback
      for (const direction of directions) {
        const nextState = this.simulateMove(boardState, direction);
        if (nextState !== boardState) {
          console.warn(`⚠️ AI using fallback move: ${direction}`);
          return direction;
        }
      }
      console.warn('⚠️ No valid moves found by Advanced AI');
      return null; // No moves available
    }
    
    return bestMove;
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
    const baseStats = {
      cacheHits: this.cacheHits,
      totalLookups: this.totalLookups,
      cacheHitRate: this.totalLookups > 0 ? (this.cacheHits / this.totalLookups) : 0,
      transpositionTableSize: this.transpositionTable.size,
      weights: { ...this.weights }
    };

    // Add learning statistics if available
    if (this.isLearningEnabled && this.learningSystem) {
      const learningStats = this.learningSystem.getLearningStats();
      return {
        ...baseStats,
        learning: learningStats
      };
    }

    return baseStats;
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
    
    if (this.isLearningEnabled && this.learningSystem) {
      this.currentGameMoves = [];
    }
  }

  // Learning Integration Methods

  /**
   * Adapt AI weights based on learning data
   */
  adaptWeightsFromLearning() {
    if (!this.isLearningEnabled || !this.learningSystem) return;
    
    const learningStats = this.learningSystem.getLearningStats();
    const performance = learningStats.performance;
    
    if (learningStats.totalGames > 10) {
      // Adjust weights based on recent performance
      const recentImprovement = learningStats.recentImprovement || 0;
      
      if (recentImprovement > 5) {
        // Recent performance is good, slightly increase exploration
        this.weights.openness *= 1.05;
        this.weights.merging *= 1.02;
      } else if (recentImprovement < -5) {
        // Recent performance is poor, focus more on proven strategies
        this.weights.monotonicity *= 1.05;
        this.weights.maxTileCorner *= 1.03;
      }
      
      // Ensure weights stay within reasonable bounds
      Object.keys(this.weights).forEach(key => {
        this.weights[key] = Math.max(0.5, Math.min(20.0, this.weights[key]));
      });
      
      if (window.debugAI) {
        console.log('🎯 AI weights adapted based on learning data:', this.weights);
      }
    }
  }

  /**
   * Record game completion for learning
   */
  recordGameCompletion(finalScore, maxTile, won) {
    if (!this.isLearningEnabled || !this.learningSystem) return;
    
    const totalMoves = this.currentGameMoves.length;
    this.learningSystem.recordGameEnd(finalScore, maxTile, won, totalMoves);
    
    // Adapt weights after each game
    this.adaptWeightsFromLearning();
    
    if (window.debugAI) {
      console.log(`🎓 Game learning recorded: Score ${finalScore}, Max ${maxTile}, ${won ? 'Won' : 'Lost'}`);
    }
  }

  /**
   * Enable/disable learning system
   */
  setLearningEnabled(enabled) {
    this.isLearningEnabled = enabled;
    
    if (window.debugAI) {
      console.log(`🧠 AI Learning ${enabled ? 'enabled' : 'disabled'}`);
    }
  }

  /**
   * Get learning system reference for external access
   */
  getLearningSystem() {
    return this.learningSystem;
  }

  /**
   * Helper method to decode board state to array
   */
  decodeBoardStateToArray(boardState) {
    const board = [];
    for (let i = 0; i < 16; i++) {
      board[i] = this.extractTileValue(boardState, i);
    }
    return board;
  }

  /**
   * Calculate score gained from a move
   */
  calculateScoreGain(beforeBoard, afterBoard) {
    // Simple estimation based on tiles merged
    let scoreGain = 0;
    const size = Math.sqrt(beforeBoard.length);
    
    for (let i = 0; i < beforeBoard.length; i++) {
      if (afterBoard[i] > beforeBoard[i] && beforeBoard[i] > 0) {
        // Tile was merged
        scoreGain += afterBoard[i];
      }
    }
    
    return scoreGain;
  }

  /**
   * Extract tile value from encoded board state at position
   */
  extractTileValue(boardState, position) {
    const shift = position * 4;
    const mask = 0xF;
    const tileCode = (boardState >> shift) & mask;
    return tileCode === 0 ? 0 : Math.pow(2, tileCode);
  }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AdvancedAI2048Solver;
}

// Make available globally
window.AdvancedAI2048Solver = AdvancedAI2048Solver;
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
window.Enhanced2048AI = Enhanced2048AI;class Game {
  constructor(size = 4) {
    console.log(`Initializing game with size: ${size}x${size}`);
    
    // Core game properties
    this.size = size;
    this.board = this.createEmptyBoard();
    this.score = 0;
    this.bestScore = +localStorage.getItem('bestScore') || 0;
    this.moves = 0;
    this.startTime = null;

    // Game states
    this.gameState = 'playing';
    this.hasSavedStats = false;
    this.isPaused = false;
    this.wasPausedByUser = false;
    this.pausedTime = 0;
    this.pauseStartTime = null;
    
    // Animation and UI state
    this.animationInProgress = false;
    this.lastMoveDirection = null;
    this.lastMerged = [];
    
    // Game history for undo
    this.gameStateStack = [];
    this.maxUndoSteps = 10;
    
    // Visual settings
    this.isLightMode = localStorage.getItem('isLightMode') === 'true';
    this.hueValue = parseInt(localStorage.getItem('hueValue')) || 0;
    
    // Touch handling
    this.touchStartX = null;
    this.touchStartY = null;
    this.touchMoved = false;
    this.touchStartTime = null;
    
    // Timer
    this.timerInterval = null;
    
    // Stats
    this.stats = JSON.parse(localStorage.getItem('gameStats')) || [];
    
    // Performance optimization
    this.debounceTimeout = null;
    
    // Mobile state management
    this.lastSavedState = null;
    this.autoSaveInterval = null;
    this.pageVisibilityTimeout = null;
    this.mobileHiddenMessageTimeout = null;

    // Autoplay properties
    this.isAutoPlaying = false;
    this.autoPlayInterval = null;
    this.autoPlaySpeed = 800; // milliseconds between moves
    this.speedMultipliers = [1, 1.5, 2, 4, 8, 'MAX']; // Speed options including MAX
    this.currentSpeedIndex = 0; // Current speed index
    this.isAutoPlayedGame = false; // Track if current game used autoplay
    this.hasHumanMoves = false; // Track if current game has human moves

    // Initialize the game
    this.initializeUI();
    this.addEventListeners();
    this.applyTheme();
    this.updateHue();
    
    // Enhanced responsive handling
    this.setupResponsiveHandlers();
    
    // Initialize resize observer for better font scaling
    this.initializeResizeObserver();
    
    // Initialize autoplay button
    this.updateAutoPlayButton();
    this.updateSpeedButton();
    
    // Start the game
    this.addRandomTile();
    this.addRandomTile();
    this.updateUI();
    this.startTimer();
    
    // Initialize enhanced AI and learning systems automatically
    this.enhancedAI = null;
    this.aiLearningSystem = null;
    try {
      this.initializeEnhancedSystems();
    } catch (error) {
      console.error('❌ Failed to initialize enhanced systems in constructor:', error);
    }
    
    // AI performance settings
    this.aiDifficulty = localStorage.getItem('aiDifficulty') || 'normal';
    this.adaptiveDepth = true;
    
    // Enhanced game state persistence (improved mobile handling)
    this.startAutoSave();
    this.restoreGameStateIfNeeded();
    
    // Add message handler for test interface
    this.setupMessageHandler();
    
    console.log('✅ Game initialized successfully');
  }

  initializeUI() {
    console.log('Setting up UI...');
    
    // Set CSS custom property for board size
    document.documentElement.style.setProperty('--size', this.size);
    
    // Clear and setup board container
    this.setupBoardContainer();
    
    // Update score display
    this.updateScoreDisplay();
    
    console.log('✅ UI setup complete');
  }

  setupBoardContainer() {
    const boardContainer = document.getElementById('board-container');
    if (!boardContainer) {
      console.error('Board container not found!');
      return;
    }
    
    // Clear existing content
    boardContainer.innerHTML = '';
    
    // Update CSS custom properties for the current grid size
    document.documentElement.style.setProperty('--size', this.size);
    
    // Add board size class to body for CSS targeting
    document.body.className = document.body.className.replace(/board-size-\d+/g, '');
    document.body.classList.add(`board-size-${this.size}`);
    
    // Initialize responsive variables
    this.updateResponsiveVariables();
    
    // Create grid cells for the board
    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        const gridCell = document.createElement('div');
        gridCell.className = 'grid-cell';
        gridCell.setAttribute('data-row', i);
        gridCell.setAttribute('data-col', j);
        boardContainer.appendChild(gridCell);
      }
    }
    
    console.log(`✅ Board container setup for ${this.size}x${this.size} grid - Responsive sizing applied`);
  }

  setupMessageHandler() {
    // Handle messages from parent window (for test interface)
    window.addEventListener('message', (event) => {
      if (event.data.type === 'changeGridSize') {
        const newSize = event.data.size;
        if ([4, 5, 7, 9].includes(newSize) && newSize !== this.size) {
          console.log(`🔄 Changing grid size from ${this.size}x${this.size} to ${newSize}x${newSize}`);
          this.size = newSize;
          this.reset();
          this.refreshLayout();
          
          // Notify parent of the change
          window.parent.postMessage({
            type: 'gridSizeChanged',
            size: newSize
          }, '*');
        }
      }
    });
  }

  setupResponsiveHandlers() {
    // Enhanced window resize handling
    window.addEventListener('resize', this.debounce(() => {
      this.refreshLayout();
      this.updateTileFontSizes();
    }, 150));
    
    // Orientation change handling with delay for mobile
    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        this.refreshLayout();
        this.updateTileFontSizes();
      }, 300);
    });

    // Viewport meta tag adjustment for mobile
    if (this.isMobileDevice()) {
      this.adjustViewportForMobile();
    }

    // Enhanced state persistence - save game state when user is about to leave
    window.addEventListener('beforeunload', () => {
      this.saveCurrentGameState();
      this.stopAutoSave(); // Stop auto-save interval
    });

    // Mobile-specific events for better lifecycle management
    if (this.isMobileDevice()) {
      window.addEventListener('pagehide', () => {
        this.saveCurrentGameState();
      });
      
      window.addEventListener('pageshow', (event) => {
        if (event.persisted) {
          // Page was restored from cache, attempt to restore game state
          this.restoreGameStateIfNeeded();
        }
      });
    }
  }

  initializeResizeObserver() {
    // Enhanced responsive handling with viewport and orientation detection
    let resizeTimeout;
    let lastWidth = window.innerWidth;
    let lastHeight = window.innerHeight;
    let lastOrientation = window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
    
    // Unified resize handler
    const handleResize = () => {
      const currentWidth = window.innerWidth;
      const currentHeight = window.innerHeight;
      const currentOrientation = currentHeight > currentWidth ? 'portrait' : 'landscape';
      
      // Check for significant changes
      const widthChange = Math.abs(currentWidth - lastWidth) > 50;
      const heightChange = Math.abs(currentHeight - lastHeight) > 50;
      const orientationChange = currentOrientation !== lastOrientation;
      
      if (widthChange || heightChange || orientationChange) {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
          console.log(`📱 Viewport change detected: ${currentWidth}×${currentHeight} (${currentOrientation})`);
          
          // Update responsive variables first
          this.updateResponsiveVariables();
          
          // Then refresh layout
          this.refreshLayout();
          
          // Update stored values
          lastWidth = currentWidth;
          lastHeight = currentHeight;
          lastOrientation = currentOrientation;
        }, orientationChange ? 300 : 150); // Longer delay for orientation changes
      }
    };
    
    // Modern ResizeObserver for element-specific changes
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(this.debounce((entries) => {
        for (const entry of entries) {
          if (entry.target.id === 'board-container') {
            // Only update font sizes if the container actually resized
            const rect = entry.contentRect;
            if (rect.width > 0 && rect.height > 0) {
              setTimeout(() => this.updateTileFontSizes(), 50);
            }
          }
        }
      }, 100));

      // Observe both body and board container
      const boardContainer = document.getElementById('board-container');
      if (boardContainer) {
        this.resizeObserver.observe(boardContainer);
        this.resizeObserver.observe(document.body);
        console.log('✅ Enhanced ResizeObserver initialized');
      }
    }
    
    // Window resize events for viewport changes
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', () => {
      // Give time for the orientation change to complete
      setTimeout(handleResize, 100);
      setTimeout(handleResize, 500); // Double-check after animations
    });
    
    // Initial setup
    handleResize();
    
    console.log('✅ Enhanced responsive system initialized');
  }

  adjustViewportForMobile() {
    // Dynamic viewport adjustment for better mobile experience
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
    }

    // Prevent iOS Safari bounce scrolling
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.height = '100%';
  }

  addEventListeners() {
    // Add event listeners with null checks and improved touch handling
    const resetButton = document.getElementById('reset-button');
    if (resetButton) {
      resetButton.addEventListener('click', () => {
        this.reset();
        this.updateUI();
      });
    }
    
    window.addEventListener('keydown', this.handleKeyPress.bind(this));
    
    const boardContainer = document.getElementById('board-container');
    if (boardContainer) {
      // Enhanced touch event handling with passive options for better performance
      boardContainer.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
      boardContainer.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
      boardContainer.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
      boardContainer.addEventListener('touchcancel', this.resetTouchState.bind(this), { passive: true });
      
      // Add mouse events for desktop drag simulation (optional)
      boardContainer.addEventListener('mousedown', this.handleMouseStart.bind(this));
      boardContainer.addEventListener('mousemove', this.handleMouseMove.bind(this));
      boardContainer.addEventListener('mouseup', this.handleMouseEnd.bind(this));
      boardContainer.addEventListener('mouseleave', this.resetMouseState.bind(this));
    }
    
    // Prevent page scrolling and zooming on mobile during gameplay
    document.addEventListener('touchmove', this.preventScroll, { passive: false });
    document.addEventListener('gesturestart', e => e.preventDefault());
    document.addEventListener('gesturechange', e => e.preventDefault());
    document.addEventListener('gestureend', e => e.preventDefault());
    
    const changeColorButton = document.getElementById('changeColor-button');
    if (changeColorButton) {
      changeColorButton.addEventListener('click', this.changeHue.bind(this));
      // Add keyboard accessibility
      changeColorButton.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.changeHue();
        }
      });
    }
    
    const backButton = document.getElementById('back-button');
    if (backButton) {
      backButton.addEventListener('click', this.undoMove.bind(this));
      backButton.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.undoMove();
        }
      });
    }
    
    const leaderboardButton = document.getElementById('leaderboard-button');
    if (leaderboardButton) {
      leaderboardButton.addEventListener('click', this.openStatisticsPage.bind(this));
    }
    
    const exportStatsButton = document.getElementById('export-stats-button');
    if (exportStatsButton) {
      exportStatsButton.addEventListener('click', this.exportGameStatistics.bind(this));
      exportStatsButton.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.exportGameStatistics();
        }
      });
    }
    
    const pauseButton = document.getElementById('pause-button');
    if (pauseButton) {
      pauseButton.addEventListener('click', this.togglePause.bind(this));
      pauseButton.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.togglePause();
        }
      });
    }
    
    const boardSizeButton = document.getElementById('board-size-button');
    if (boardSizeButton) {
      boardSizeButton.addEventListener('click', this.changeBoardSize.bind(this));
    }
    
    const themeToggleButton = document.getElementById('theme-toggle-button');
    if (themeToggleButton) {
      themeToggleButton.addEventListener('click', this.toggleTheme.bind(this));
      themeToggleButton.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.toggleTheme();
        }
      });
    }
    
    const autoplayButton = document.getElementById('autoplay-button');
    if (autoplayButton) {
      autoplayButton.addEventListener('click', this.toggleAutoPlay.bind(this));
      autoplayButton.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.toggleAutoPlay();
        }
      });
    }
    
    const speedButton = document.getElementById('speed-button');
    if (speedButton) {
      speedButton.addEventListener('click', this.changeSpeed.bind(this));
      speedButton.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.changeSpeed();
        }
      });
    }
    
    // Add advanced keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'z':
            e.preventDefault();
            this.undoMove();
            break;
          case 'r':
            e.preventDefault();
            this.reset();
            break;
          case 'p':
            e.preventDefault();
            this.togglePause();
            break;
          case 'a':
            e.preventDefault();
            this.toggleAutoPlay();
            break;
        }
      }
    });
    
    // Add focus management for accessibility
    this.setupFocusManagement();

    // AI Difficulty button - Enhanced integration
    const aiDifficultyButton = document.getElementById('ai-difficulty-button');
    if (aiDifficultyButton) {
      aiDifficultyButton.addEventListener('click', () => {
        this.changeAIDifficulty();
        // Update button text immediately
        const buttonText = aiDifficultyButton.querySelector('.button-text');
        if (buttonText) {
          const capitalizedDifficulty = this.aiDifficulty.charAt(0).toUpperCase() + this.aiDifficulty.slice(1);
          buttonText.textContent = capitalizedDifficulty;
        }
      });

      // Initialize button text on startup
      const buttonText = aiDifficultyButton.querySelector('.button-text');
      if (buttonText) {
        const savedDifficulty = localStorage.getItem('aiDifficulty') || 'normal';
        this.aiDifficulty = savedDifficulty;
        const capitalizedDifficulty = this.aiDifficulty.charAt(0).toUpperCase() + this.aiDifficulty.slice(1);
        buttonText.textContent = capitalizedDifficulty;
      }
    }
  }

  setupFocusManagement() {
    // Improve focus management for screen readers and keyboard navigation
    const focusableElements = document.querySelectorAll('button, [tabindex]:not([tabindex="-1"])');
    
    focusableElements.forEach(element => {
      element.addEventListener('focus', (e) => {
        e.target.style.outline = '2px solid var(--highlight-color)';
        e.target.style.outlineOffset = '2px';
      });
      
      element.addEventListener('blur', (e) => {
        e.target.style.outline = '';
        e.target.style.outlineOffset = '';
      });
    });
    
    // Add board container focus for keyboard navigation
    const boardContainer = document.getElementById('board-container');
    if (boardContainer) {
      boardContainer.setAttribute('tabindex', '0');
      boardContainer.setAttribute('aria-label', `${this.size}x${this.size} game board`);
      boardContainer.addEventListener('focus', () => {
        boardContainer.style.boxShadow = `0 0 0 3px var(--highlight-color)`;
      });
      boardContainer.addEventListener('blur', () => {
        boardContainer.style.boxShadow = '';
      });
    }
  }

  // Mouse event handlers for desktop drag support (optional enhancement)
  handleMouseStart(event) {
    if (this.isPaused || (this.gameState !== 'playing' && this.gameState !== 'won-continue')) return;
    
    this.mouseStartX = event.clientX;
    this.mouseStartY = event.clientY;
    this.mouseStartTime = Date.now();
    this.isDragging = false;
    
    event.preventDefault();
  }

  handleMouseMove(event) {
    if (!this.mouseStartX || !this.mouseStartY) return;
    
    const deltaX = Math.abs(event.clientX - this.mouseStartX);
    const deltaY = Math.abs(event.clientY - this.mouseStartY);
    
    if (deltaX > 5 || deltaY > 5) {
      this.isDragging = true;
    }
    
    event.preventDefault();
  }

  handleMouseEnd(event) {
    if (!this.mouseStartX || !this.mouseStartY || this.isPaused || (this.gameState !== 'playing' && this.gameState !== 'won-continue')) return;
    
    const deltaX = event.clientX - this.mouseStartX;
    const deltaY = event.clientY - this.mouseStartY;
    const deltaTime = Date.now() - this.mouseStartTime;
    
    // Only process as swipe if mouse was dragged and released quickly
    if (this.isDragging && deltaTime < 500) {
      const minSwipeDistance = 30;
      const swipeDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      
      if (swipeDistance >= minSwipeDistance) {
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          this.move(deltaX > 0 ? 'right' : 'left');
        } else {
          this.move(deltaY > 0 ? 'down' : 'up');
        }
      }
    }
    
    this.resetMouseState();
    event.preventDefault();
  }

  resetMouseState() {
    this.mouseStartX = null;
    this.mouseStartY = null;
    this.mouseStartTime = null;
    this.isDragging = false;
  }

  preventScroll(event) {
    // Enhanced scroll prevention with better target detection
    const target = event.target;
    const gameArea = document.querySelector('main');
    
    if (gameArea && gameArea.contains(target)) {
      // Allow scrolling in score containers and controls, but prevent elsewhere
      const allowScrollElements = target.closest('#score-container, #controls-container, .stats-section');
      
      if (!allowScrollElements) {
        event.preventDefault();
      }
    }
  }

  updateBestScore() {
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      localStorage.setItem('bestScore', this.bestScore);
    }
  }

  openStatisticsPage() {
    window.location.href = '../pages/leaderboard.html';
  }

  exportGameStatistics() {
    try {
      let stats = [];
      try {
        stats = JSON.parse(localStorage.getItem('gameStats')) || [];
      } catch (e) {
        this.showNotification('No game statistics to export!', 'error');
        return;
      }
      
      const uniqueStats = Array.from(new Set(stats.map(stat => JSON.stringify(stat)))).map(stat => JSON.parse(stat));
      if (uniqueStats.length === 0) {
        this.showNotification('No game statistics to export!', 'error');
        return;
      }

      // Format date helper
      const formatDate = (date) => {
        return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear().toString().slice(-2)} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
      };

      // Create enhanced JSON structure with metadata
      const exportData = {
        exportInfo: {
          exportedAt: new Date().toISOString(),
          gameVersion: "Fancy2048",
          totalGames: uniqueStats.length,
          dataVersion: "1.0",
          exportedFrom: "Main Game Interface"
        },
        summary: {
          totalGames: uniqueStats.length,
          bestScore: Math.max(...uniqueStats.map(stat => parseInt(stat.score) || 0)),
          bestTile: Math.max(...uniqueStats.map(stat => parseInt(stat.bestTile) || 0)),
          totalMoves: uniqueStats.reduce((sum, stat) => sum + (parseInt(stat.moves) || 0), 0),
          averageScore: Math.round(uniqueStats.reduce((sum, stat) => sum + (parseInt(stat.score) || 0), 0) / uniqueStats.length),
          gamesWon: uniqueStats.filter(stat => parseInt(stat.bestTile) >= 2048).length,
          winRate: ((uniqueStats.filter(stat => parseInt(stat.bestTile) >= 2048).length / uniqueStats.length) * 100).toFixed(1) + '%',
          gamesByMode: {
            human: uniqueStats.filter(stat => (stat.playMode || (stat.isAutoPlayed ? 'AI' : 'Human')) === 'Human').length,
            ai: uniqueStats.filter(stat => (stat.playMode || (stat.isAutoPlayed ? 'AI' : 'Human')) === 'AI').length,
            mixed: uniqueStats.filter(stat => (stat.playMode || (stat.isAutoPlayed ? 'AI' : 'Human')) === 'Mixed').length
          },
          gamesByGridSize: uniqueStats.reduce((acc, stat) => {
            const gridSize = stat.gridSize || 4;
            acc[`${gridSize}x${gridSize}`] = (acc[`${gridSize}x${gridSize}`] || 0) + 1;
            return acc;
          }, {})
        },
        games: uniqueStats.map(stat => ({
          ...stat,
          // Ensure consistent field formatting
          date: stat.date,
          dateFormatted: formatDate(new Date(stat.date)),
          gridSize: stat.gridSize || 4,
          gridType: stat.gridType || `${stat.gridSize || 4}x${stat.gridSize || 4}`,
          playMode: stat.playMode || (stat.isAutoPlayed ? 'AI' : 'Human'),
          score: parseInt(stat.score) || 0,
          bestScore: parseInt(stat.bestScore) || 0,
          bestTile: parseInt(stat.bestTile) || 0,
          moves: parseInt(stat.moves) || 0,
          duration: stat.time,
          won: parseInt(stat.bestTile) >= 2048
        }))
      };

      const jsonContent = JSON.stringify(exportData, null, 2);
      const filename = `fancy2048_statistics_${new Date().toISOString().split('T')[0]}.json`;
      
      // Create download
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      this.showNotification(`Statistics exported to ${filename}`, 'success');
      
    } catch (error) {
      console.error('Failed to export statistics:', error);
      this.showNotification('Failed to export statistics', 'error');
    }
  }

  saveStats() {
    if (this.score > 0) {
      const endTime = new Date();
      let totalElapsed = Math.floor((endTime - this.startTime) / 1000);
      
      // Add current pause time if game is currently paused
      let currentPausedTime = this.pausedTime;
      if (this.isPaused && this.pauseStartTime) {
        const currentPauseDuration = Math.floor((endTime - this.pauseStartTime) / 1000);
        currentPausedTime += currentPauseDuration;
      }
      
      // Calculate actual game time (excluding paused time)
      const actualGameTime = Math.max(0, totalElapsed - currentPausedTime);
      const minutes = Math.floor(actualGameTime / 60).toString().padStart(2, '0');
      const seconds = (actualGameTime % 60).toString().padStart(2, '0');
      const time = `${minutes}:${seconds}`;

      const stat = {
        score: this.score,
        bestTile: Math.max(...this.board.flat()),
        bestScore: this.bestScore,
        date: new Date().toISOString(),
        time: time,
        moves: this.moves,
        gridSize: this.size, // Add grid size to stats
        gridType: `${this.size}x${this.size}`, // Add formatted grid type
        isAutoPlayed: this.isAutoPlayedGame, // Track if AI was used
        hasHumanMoves: this.hasHumanMoves, // Track if human moves were made
        playMode: this.getPlayModeString() // Get comprehensive play mode
      };
      
      this.stats.push(stat);
      localStorage.setItem('gameStats', JSON.stringify(this.stats));
    }
  }

  getPlayModeString() {
    // Determine the play mode based on which inputs were used
    if (this.isAutoPlayedGame && this.hasHumanMoves) {
      return 'AI + Human';
    } else if (this.isAutoPlayedGame) {
      return 'AI';
    } else if (this.hasHumanMoves) {
      return 'Human';
    } else {
      // Edge case: no moves made (shouldn't really happen in saved stats)
      return 'Human';
    }
  }

  startTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    
    this.startTime = new Date();
    this.pausedTime = 0; // Reset paused time
    const timeElement = document.getElementById('time');
    
    this.timerInterval = setInterval(() => {
      if (!this.isPaused && timeElement && this.gameState === 'playing') {
        const currentTime = new Date();
        const totalElapsed = Math.floor((currentTime - this.startTime) / 1000);
        const actualGameTime = totalElapsed - this.pausedTime; // Subtract paused time
        const minutes = Math.floor(actualGameTime / 60).toString().padStart(2, '0');
        const seconds = (actualGameTime % 60).toString().padStart(2, '0');
        timeElement.textContent = `${minutes}:${seconds}`;
      }
    }, 1000);
  }

  // Board manipulation functions with improved grid creation
  createEmptyBoard() {
    const board = [];
    for (let i = 0; i < this.size; i++) {
      const row = [];
      for (let j = 0; j < this.size; j++) {
        row.push(0);
      }
      board.push(row);
    }
    return board;
  }

  reset() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    
    // Stop autoplay if running
    if (this.isAutoPlaying) {
      this.stopAutoPlay();
    }
    
    // Clean up pause overlays and messages
    this.hidePauseOverlay();
    
    // Clear saved mobile state
    localStorage.removeItem('currentGameState');
    
    // Reset game state
    this.board = this.createEmptyBoard();
    this.score = 0;
    this.moves = 0;
    this.gameState = 'playing';
    this.hasSavedStats = false;
    this.isPaused = false;
    this.wasPausedByUser = false;
    this.pausedTime = 0;
    this.pauseStartTime = null;
    this.gameStateStack = [];
    this.lastMerged = [];
    this.isAutoPlayedGame = false; // Reset autoplay flag
    this.hasHumanMoves = false; // Reset human moves flag
    
    // Reset hue to 0
    this.hueValue = 0;
    this.updateHue();
    
    // Clear any existing tiles
    const boardContainer = document.getElementById('board-container');
    if (boardContainer) {
      boardContainer.innerHTML = '';
      boardContainer.style.pointerEvents = '';
      boardContainer.style.opacity = '';
      boardContainer.removeAttribute('aria-disabled');
      
      // Create the grid cells first for proper layout
      this.createGridCells();
    }
    
    // Reset pause button UI
    const pauseButton = document.getElementById('pause-button');
    if (pauseButton) {
      pauseButton.innerHTML = '<i class="fas fa-pause" aria-hidden="true"></i>';
      pauseButton.setAttribute('aria-label', 'Pause Game');
      pauseButton.title = 'Pause Game (Space)';
    }
    
    // Reset autoplay button UI
    this.updateAutoPlayButton();
    this.updateSpeedButton();
    
    // Add initial tiles
    this.addRandomTile();
    this.addRandomTile();
    
    // Update UI
    this.updateUI();
    
    // Hide game over message - ensure it's properly hidden
    const gameOverElement = document.getElementById('game-over');
    if (gameOverElement) {
      gameOverElement.classList.add('hidden');
      gameOverElement.classList.remove('win-state');
    }
    
    // Restart timer
    this.startTimer();

    // Enable back button if we have game states
    this.updateBackButtonState();
  }

  // Create grid cells for better visualization
  createGridCells() {
    const boardContainer = document.getElementById('board-container');
    
    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        const cell = document.createElement('div');
        cell.className = 'grid-cell';
        cell.dataset.row = i;
        cell.dataset.col = j;
        boardContainer.appendChild(cell);
      }
    }
  }

  addRandomTile() {
    const emptyCells = [];
    
    // Find all empty cells
    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        if (this.board[i][j] === 0) {
          emptyCells.push({ row: i, col: j });
        }
      }
    }
    
    // If there are no empty cells, return
    if (emptyCells.length === 0) return;
    
    // Choose a random empty cell
    const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    
    // Add a new tile (90% chance for 2, 10% chance for 4)
    this.board[randomCell.row][randomCell.col] = Math.random() < 0.9 ? 2 : 4;
    
    // Create and add the tile to the DOM
    this.createTileElement(randomCell.row, randomCell.col, this.board[randomCell.row][randomCell.col], true);
  }

  createTileElement(row, col, value, isNew = false) {
    const boardContainer = document.getElementById('board-container');
    const tile = document.createElement('div');
    tile.className = 'tile';
    tile.setAttribute('data-value', value);
    tile.dataset.row = row;
    tile.dataset.col = col;
    tile.textContent = value;
    
    // Position the tile in the grid
    const gridPosition = row * this.size + col;
    const gridCell = boardContainer.children[gridPosition];
    
    if (gridCell) {
      gridCell.appendChild(tile);
      // Apply dynamic font sizing instead of relying on CSS
      this.adjustTileFontSize(tile);
    } else {
      console.error(`No grid cell found at position ${row}, ${col}`);
      boardContainer.appendChild(tile);
    }
    
    if (isNew) {
      tile.classList.add('new-tile');
    }
    
    // Apply glow effect based on value
    this.applyTileGlow(tile, value);
    
    return tile;
  }

  applyTileGlow(tile, value) {
    // Apply enhanced glow effects based on tile value
    if (value >= 128) {
      const glowProperty = value >= 4096 ? '--tile-super-glow' : `--tile-${value}-glow`;
      const glowValue = getComputedStyle(document.documentElement).getPropertyValue(glowProperty);
      
      if (glowValue.trim()) {
        tile.style.boxShadow = glowValue;
        
        // Add pulsing effect for high-value tiles
        if (value >= 1024) {
          tile.style.animation = `pulse-glow 2s ease-in-out infinite alternate`;
        }
      }
    }
  }

  // New method to adjust font size based on tile value and size
  adjustTileFontSize(tileElement) {
    const value = parseInt(tileElement.getAttribute('data-value'));
    
    // Let CSS handle font sizing using our responsive variables
    // Remove any inline font-size styles to allow CSS to take over
    tileElement.style.fontSize = '';
    
    // Apply appropriate CSS class for font scaling based on value length
    if (value >= 4096) {
      // Use CSS variable --font-scale-mega for 5+ digit numbers
      tileElement.style.fontSize = `calc(var(--tile-size) * var(--font-scale-mega))`;
    } else if (value >= 1024) {
      // Use CSS variable --font-scale-large for 4-digit numbers
      tileElement.style.fontSize = `calc(var(--tile-size) * var(--font-scale-large))`;
    } else {
      // Use CSS variable --font-scale-base for 1-3 digit numbers
      tileElement.style.fontSize = `calc(var(--tile-size) * var(--font-scale-base))`;
    }
  }

  // Enhanced updateTileFontSizes that respects viewport changes
  updateTileFontSizes() {
    // First update the responsive variables to get current scaling
    this.updateResponsiveVariables();
    
    // Then update all tile font sizes
    const tiles = document.querySelectorAll('.tile');
    tiles.forEach(tile => {
      this.adjustTileFontSize(tile);
    });
  }

  isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           ('ontouchstart' in window) ||
           (navigator.maxTouchPoints > 0);
  }

  // Utility method for debouncing function calls
  debounce(func, wait) {
    return (...args) => {
      clearTimeout(this.debounceTimeout);
      this.debounceTimeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  // Game mechanics with enhanced move validation
  canMove(direction) {
    // Prevent checking moves during animations to avoid race conditions
    if (this.animationInProgress) {
      return false;
    }
    
    // Simulate the move to check if anything would change
    const originalBoard = this.board.map(row => [...row]);
    
    let hasMove = false;
    
    try {
      switch (direction) {
        case 'up':
          hasMove = this.simulateMoveUp();
          break;
        case 'down':
          hasMove = this.simulateMoveDown();
          break;
        case 'left':
          hasMove = this.simulateMoveLeft();
          break;
        case 'right':
          hasMove = this.simulateMoveRight();
          break;
        default:
          console.error('❌ Invalid direction in canMove:', direction);
          return false;
      }
    } catch (error) {
      console.error(`❌ Error checking move ${direction}:`, error);
      // Ensure board is restored even on error
      this.board = originalBoard;
      return false;
    }
    
    // Restore original board
    this.board = originalBoard;
    
    return hasMove;
  }
  
  // Fixed simulate moves to correctly check if moves are possible
  simulateMoveUp() {
    let moved = false;
    
    for (let col = 0; col < this.size; col++) {
      // Extract non-zero values from column (top to bottom)
      const column = [];
      for (let row = 0; row < this.size; row++) {
        if (this.board[row][col] !== 0) {
          column.push(this.board[row][col]);
        }
      }
      
      // If column is empty, no move possible
      if (column.length === 0) continue;
      
      // Check if tiles can slide up (if there are zeros above non-zero tiles)
      let firstNonZeroRow = -1;
      for (let row = 0; row < this.size; row++) {
        if (this.board[row][col] !== 0) {
          firstNonZeroRow = row;
          break;
        }
      }
      
      // If first non-zero tile is not at row 0, tiles can slide up
      if (firstNonZeroRow > 0) {
        moved = true;
        break;
      }
      
      // Check if adjacent tiles can merge
      for (let i = 0; i < column.length - 1; i++) {
        if (column[i] === column[i + 1]) {
          moved = true;
          break;
        }
      }
      
      if (moved) break;
    }
    
    return moved;
  }
  
  simulateMoveDown() {
    let moved = false;
    
    for (let col = 0; col < this.size; col++) {
      // Extract non-zero values from column (bottom to top)
      const column = [];
      for (let row = this.size - 1; row >= 0; row--) {
        if (this.board[row][col] !== 0) {
          column.push(this.board[row][col]);
        }
      }
      
      // If column is empty, no move possible
      if (column.length === 0) continue;
      
      // Check if tiles can slide down (if there are zeros below non-zero tiles)
      let lastNonZeroRow = -1;
      for (let row = this.size - 1; row >= 0; row--) {
        if (this.board[row][col] !== 0) {
          lastNonZeroRow = row;
          break;
        }
      }
      
      // If last non-zero tile is not at bottom row, tiles can slide down
      if (lastNonZeroRow < this.size - 1) {
        moved = true;
        break;
      }
      
      // Check if adjacent tiles can merge (when moving down, we check from bottom)
      for (let i = 0; i < column.length - 1; i++) {
        if (column[i] === column[i + 1]) {
          moved = true;
          break;
        }
      }
      
      if (moved) break;
    }
    
    return moved;
  }
  
  simulateMoveLeft() {
    let moved = false;
    
    for (let row = 0; row < this.size; row++) {
      // Extract non-zero values from row (left to right)
      const rowData = [];
      for (let col = 0; col < this.size; col++) {
        if (this.board[row][col] !== 0) {
          rowData.push(this.board[row][col]);
        }
      }
      
      // If row is empty, no move possible
      if (rowData.length === 0) continue;
      
      // Check if tiles can slide left (if there are zeros to the left of non-zero tiles)
      let firstNonZeroCol = -1;
      for (let col = 0; col < this.size; col++) {
        if (this.board[row][col] !== 0) {
          firstNonZeroCol = col;
          break;
        }
      }
      
      // If first non-zero tile is not at col 0, tiles can slide left
      if (firstNonZeroCol > 0) {
        moved = true;
        break;
      }
      
      // Check if adjacent tiles can merge
      for (let i = 0; i < rowData.length - 1; i++) {
        if (rowData[i] === rowData[i + 1]) {
          moved = true;
          break;
        }
      }
      
      if (moved) break;
    }
    
    return moved;
  }
  
  simulateMoveRight() {
    let moved = false;
    
    for (let row = 0; row < this.size; row++) {
      // Extract non-zero values from row (right to left)
      const rowData = [];
      for (let col = this.size - 1; col >= 0; col--) {
        if (this.board[row][col] !== 0) {
          rowData.push(this.board[row][col]);
        }
      }
      
      // If row is empty, no move possible
      if (rowData.length === 0) continue;
      
      // Check if tiles can slide right (if there are zeros to the right of non-zero tiles)
      let lastNonZeroCol = -1;
      for (let col = this.size - 1; col >= 0; col--) {
        if (this.board[row][col] !== 0) {
          lastNonZeroCol = col;
          break;
        }
      }
      
      // If last non-zero tile is not at rightmost col, tiles can slide right
      if (lastNonZeroCol < this.size - 1) {
        moved = true;
        break;
      }
      
      // Check if adjacent tiles can merge (when moving right, we check from right)
      for (let i = 0; i < rowData.length - 1; i++) {
        if (rowData[i] === rowData[i + 1]) {
          moved = true;
          break;
        }
      }
      
      if (moved) break;
    }
    
    return moved;
  }

  move(direction) {
    if (this.animationInProgress || (this.gameState !== 'playing' && this.gameState !== 'won-continue')) return false;
    
    // Start animation lock
    this.animationInProgress = true;
    
    this.lastMoveDirection = direction;
    this.saveGameState();
    
    let moved = false;
    this.lastMerged = []; // Reset merged tiles tracking
    this.lastMoveScore = this.score; // Store score before move
    
    // Create move promise for animation coordination
    const movePromise = new Promise((resolve) => {
      switch (direction) {
        case 'up':
          moved = this.moveUp();
          break;
        case 'down':
          moved = this.moveDown();
          break;
        case 'left':
          moved = this.moveLeft();
          break;
        case 'right':
          moved = this.moveRight();
          break;
      }
      resolve(moved);
    });
    
    movePromise.then((moved) => {
      if (moved) {
        this.moves++;
        
        // Calculate score delta for popup
        this.scoreDelta = this.score - this.lastMoveScore;
        if (this.scoreDelta > 0) {
          this.showScorePopup(this.scoreDelta);
        }
        
        // Automatically record move for AI learning (if learning system is available)
        if (this.aiLearningSystem && this.gameStateStack.length >= 2) {
          try {
            const previousState = this.gameStateStack[this.gameStateStack.length - 2];
            const currentState = this.board.flat();
            
            // Ensure we have valid states before recording
            if (previousState && previousState.board && Array.isArray(previousState.board)) {
              this.aiLearningSystem.recordMove(
                previousState.board.flat(),
                direction,
                currentState,
                this.scoreDelta
              );
              console.log('📊 Move recorded for AI learning:', direction, 'Score delta:', this.scoreDelta);
            }
          } catch (error) {
            console.warn('⚠️ Failed to record move for AI learning:', error);
          }
        }
        
        // Update UI first, then add new tile after animation
        this.updateUI();
        
        // Add slight delay for better visual feedback
        setTimeout(() => {
          this.addRandomTile();
          this.updateUI();
          
          // Check game state after move
          setTimeout(() => {
            this.checkGameState();
            this.animationInProgress = false;
          }, 100);
        }, 150);
      } else {
        this.animationInProgress = false;
      }
    });
    
    return movePromise;
  }

  // Enhanced UI update with smoother animations


  updateScoreDisplay() {
    const scoreElement = document.getElementById('score');
    const bestScoreElement = document.getElementById('best-score');
    const movesElement = document.getElementById('moves');
    
    if (scoreElement) {
      // Animate score changes
      const oldScore = parseInt(scoreElement.textContent) || 0;
      if (oldScore !== this.score) {
        this.animateNumberChange(scoreElement, oldScore, this.score);
      }
    }
    
    if (bestScoreElement) {
      const oldBestScore = parseInt(bestScoreElement.textContent) || 0;
      if (oldBestScore !== this.bestScore) {
        this.animateNumberChange(bestScoreElement, oldBestScore, this.bestScore);
        // Add highlight effect for new best score
        bestScoreElement.style.color = `hsl(${this.hueValue}, 80%, 60%)`;
        setTimeout(() => {
          bestScoreElement.style.color = '';
        }, 1000);
      }
    }
    
    if (movesElement) {
      movesElement.textContent = this.moves;
    }
  }

  // AI Learning Integration Methods

  /**
   * Record game completion for automatic AI learning
   */
  recordGameCompletion(won) {
    try {
      // Get max tile value
      let maxTile = 0;
      for (let row = 0; row < this.size; row++) {
        for (let col = 0; col < this.size; col++) {
          if (this.board[row][col] > maxTile) {
            maxTile = this.board[row][col];
          }
        }
      }

      // Automatically record with AI Learning System
      if (this.aiLearningSystem) {
        this.aiLearningSystem.recordGameEnd(this.score, maxTile, won, this.moves);
        
        if (window.debugAI) {
          console.log(`🧠 AI Learning: Automatically recorded game completion - Score: ${this.score}, Max Tile: ${maxTile}, Won: ${won}`);
        }
      }
    } catch (error) {
      console.warn('⚠️ Failed to record game completion for automatic learning:', error);
    }
  }

  /**
   * Get AI learning statistics (automatic system)
   */
  getAILearningStats() {
    try {
      if (this.aiLearningSystem) {
        return this.aiLearningSystem.getLearningStats();
      }
      
      return null;
    } catch (error) {
      console.warn('⚠️ Failed to get AI learning stats:', error);
      return null;
    }
  }

  /**
   * Export AI learning data
   */
  exportAILearningData() {
    try {
      let learningSystem = null;
      
      if (this.advancedAI && this.advancedAI.getLearningSystem) {
        learningSystem = this.advancedAI.getLearningSystem();
      } else if (this.enhancedAI && this.enhancedAI.getLearningSystem) {
        learningSystem = this.enhancedAI.getLearningSystem();
      }
      
      if (learningSystem && learningSystem.exportLearningData) {
        learningSystem.exportLearningData();
        return true;
      } else {
        console.warn('⚠️ No learning system available for export');
        return false;
      }
    } catch (error) {
      console.error('❌ Failed to export AI learning data:', error);
      return false;
    }
  }

  /**
   * Import AI learning data
   */
  async importAILearningData(file) {
    try {
      let learningSystem = null;
      
      if (this.advancedAI && this.advancedAI.getLearningSystem) {
        learningSystem = this.advancedAI.getLearningSystem();
      } else if (this.enhancedAI && this.enhancedAI.getLearningSystem) {
        learningSystem = this.enhancedAI.getLearningSystem();
      }
      
      if (learningSystem && learningSystem.importLearningData) {
        const result = await learningSystem.importLearningData(file);
        console.log('✅ AI learning data imported successfully');
        return result;
      } else {
        throw new Error('No learning system available for import');
      }
    } catch (error) {
      console.error('❌ Failed to import AI learning data:', error);
      throw error;
    }
  }

  /**
   * Toggle AI learning on/off
   */
  toggleAILearning() {
    try {
      if (this.advancedAI && this.advancedAI.setLearningEnabled) {
        const currentState = this.advancedAI.isLearningEnabled;
        this.advancedAI.setLearningEnabled(!currentState);
        
        console.log(`🧠 AI Learning ${!currentState ? 'enabled' : 'disabled'}`);
        return !currentState;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Failed to toggle AI learning:', error);
      return false;
    }
  }

  /**
   * Clear AI learning data
   */
  clearAILearningData() {
    try {
      let learningSystem = null;
      
      if (this.advancedAI && this.advancedAI.getLearningSystem) {
        learningSystem = this.advancedAI.getLearningSystem();
      } else if (this.enhancedAI && this.enhancedAI.getLearningSystem) {
        learningSystem = this.enhancedAI.getLearningSystem();
      }
      
      if (learningSystem && learningSystem.clearLearningData) {
        learningSystem.clearLearningData();
        console.log('🔄 AI learning data cleared');
        return true;
      } else {
        console.warn('⚠️ No learning system available to clear');
        return false;
      }
    } catch (error) {
      console.error('❌ Failed to clear AI learning data:', error);
      return false;
    }
  }

  animateNumberChange(element, fromValue, toValue) {
    const duration = 300;
    const steps = 20;
    const stepValue = (toValue - fromValue) / steps;
    let currentStep = 0;
    
    const animate = () => {
      if (currentStep < steps) {
        const currentValue = Math.round(fromValue + (stepValue * currentStep));
        element.textContent = currentValue;
        currentStep++;
        requestAnimationFrame(animate);
      } else {
        element.textContent = toValue;
      }
    };
    
    animate();
  }

  getOppositeDirection(direction) {
    const opposites = {
      'up': 'down',
      'down': 'up',
      'left': 'right',
      'right': 'left'
    };
    return opposites[direction] || direction;
  }

  moveUp() {
    let moved = false;
    for (let col = 0; col < this.size; col++) {
      for (let row = 1; row < this.size; row++) {
        if (this.board[row][col] !== 0) {
          let currentRow = row;
          while (currentRow > 0 && 
                (this.board[currentRow - 1][col] === 0 || 
                 this.board[currentRow - 1][col] === this.board[currentRow][col]) &&
                !this.isInMergedList(currentRow - 1, col)) {
            
            if (this.board[currentRow - 1][col] === 0) {
              // Move to empty space
              this.board[currentRow - 1][col] = this.board[currentRow][col];
              this.board[currentRow][col] = 0;
              currentRow--;
              moved = true;
            } else if (this.board[currentRow - 1][col] === this.board[currentRow][col]) {
              // Merge with matching tile
              this.board[currentRow - 1][col] *= 2;
              this.score += this.board[currentRow - 1][col];
              this.board[currentRow][col] = 0;
              this.lastMerged.push({ row: currentRow - 1, col: col });
              moved = true;
              break;
            }
          }
        }
      }
    }
    return moved;
  }

  moveDown() {
    let moved = false;
    for (let col = 0; col < this.size; col++) {
      for (let row = this.size - 2; row >= 0; row--) {
        if (this.board[row][col] !== 0) {
          let currentRow = row;
          while (currentRow < this.size - 1 && 
                (this.board[currentRow + 1][col] === 0 || 
                 this.board[currentRow + 1][col] === this.board[currentRow][col]) &&
                !this.isInMergedList(currentRow + 1, col)) {
            
            if (this.board[currentRow + 1][col] === 0) {
              // Move to empty space
              this.board[currentRow + 1][col] = this.board[currentRow][col];
              this.board[currentRow][col] = 0;
              currentRow++;
              moved = true;
            } else if (this.board[currentRow + 1][col] === this.board[currentRow][col]) {
              // Merge with matching tile
              this.board[currentRow + 1][col] *= 2;
              this.score += this.board[currentRow + 1][col];
              this.board[currentRow][col] = 0;
              this.lastMerged.push({ row: currentRow + 1, col: col });
              moved = true;
              break;
            }
          }
        }
      }
    }
    return moved;
  }

  moveLeft() {
    let moved = false;
    for (let row = 0; row < this.size; row++) {
      for (let col = 1; col < this.size; col++) {
        if (this.board[row][col] !== 0) {
          let currentCol = col;
          while (currentCol > 0 && 
                (this.board[row][currentCol - 1] === 0 || 
                 this.board[row][currentCol - 1] === this.board[row][currentCol]) &&
                !this.isInMergedList(row, currentCol - 1)) {
            
            if (this.board[row][currentCol - 1] === 0) {
              // Move to empty space
              this.board[row][currentCol - 1] = this.board[row][currentCol];
              this.board[row][currentCol] = 0;
              currentCol--;
              moved = true;
            } else if (this.board[row][currentCol - 1] === this.board[row][currentCol]) {
              // Merge with matching tile
              this.board[row][currentCol - 1] *= 2;
              this.score += this.board[row][currentCol - 1];
              this.board[row][currentCol] = 0;
              this.lastMerged.push({ row: row, col: currentCol - 1 });
              moved = true;
              break;
            }
          }
        }
      }
    }
    return moved;
  }

  moveRight() {
    let moved = false;
    for (let row = 0; row < this.size; row++) {
      for (let col = this.size - 2; col >= 0; col--) {
        if (this.board[row][col] !== 0) {
          let currentCol = col;
          while (currentCol < this.size - 1 && 
                (this.board[row][currentCol + 1] === 0 || 
                 this.board[row][currentCol + 1] === this.board[row][currentCol]) &&
                !this.isInMergedList(row, currentCol + 1)) {
            
            if (this.board[row][currentCol + 1] === 0) {
              // Move to empty space
              this.board[row][currentCol + 1] = this.board[row][currentCol];
              this.board[row][currentCol] = 0;
              currentCol++;
              moved = true;
            } else if (this.board[row][currentCol + 1] === this.board[row][currentCol]) {
              // Merge with matching tile
              this.board[row][currentCol + 1] *= 2;
              this.score += this.board[row][currentCol + 1];
              this.board[row][currentCol] = 0;
              this.lastMerged.push({ row: row, col: currentCol + 1 });
              moved = true;
              break;
            }
          }
        }
      }
    }
    return moved;
  }

  isInMergedList(row, col) {
    return this.lastMerged.some(pos => pos.row === row && pos.col === col);
  }

  // Comprehensive game over detection for all scenarios
  checkGameState() {
    // Skip game state check if game is already over or won
    if (this.gameState === 'over' || this.gameState === 'won') {
      return;
    }
    
    // Skip if animation is in progress to prevent race conditions
    if (this.animationInProgress) {
      console.log('⏳ Skipping game state check - animation in progress');
      return;
    }
    
    // Check if 2048 tile exists (win condition) - but only show once
    let has2048 = false;
    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        if (this.board[i][j] === 2048) {
          has2048 = true;
          break;
        }
      }
      if (has2048) break;
    }
    
    // Show win message only once when first reaching 2048
    if (has2048 && this.gameState !== 'won' && this.gameState !== 'won-continue') {
      this.gameState = 'won';
      this.showWinMessage();
      return;
    }
    
    // Check if board is full first
    let emptyCount = 0;
    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        if (this.board[i][j] === 0) {
          emptyCount++;
        }
      }
    }
    
    // If board has empty spaces, game can continue
    if (emptyCount > 0) {
      console.log(`✅ Game continues - ${emptyCount} empty spaces available`);
      return;
    }
    
    // Board is full - check if any moves are possible
    console.log('🔍 Board is full, checking for valid moves...');
    
    const canMoveUp = this.canMove('up');
    const canMoveDown = this.canMove('down');
    const canMoveLeft = this.canMove('left');
    const canMoveRight = this.canMove('right');
    
    const canMoveAny = canMoveUp || canMoveDown || canMoveLeft || canMoveRight;
    
    // Enhanced debug logging for all play modes
    const playMode = this.isAutoPlaying ? 'AI' : (this.hasHumanMoves ? (this.isAutoPlayedGame ? 'Mixed' : 'Human') : 'Human');
    console.log(`🎮 Game Over Check [${playMode} Mode]:`, {
      up: canMoveUp,
      down: canMoveDown,
      left: canMoveLeft,
      right: canMoveRight,
      any: canMoveAny,
      boardFull: emptyCount === 0,
      gameState: this.gameState
    });
    
    if (!canMoveAny) {
      console.log(`💀 Game Over detected in ${playMode} mode - No valid moves available`);
      this.gameState = 'over';
      
      // Stop AI if running
      if (this.isAutoPlaying) {
        this.stopAutoPlay();
      }
      
      // Record game completion for statistics and AI learning
      this.recordGameCompletion(false);
      
      // Show game over message
      this.showGameOver();
    } else {
      console.log(`✅ Valid moves available in ${playMode} mode, game continues`);
    }
  }

  showGameOver() {
    const gameOverElement = document.getElementById('game-over');
    
    // Record game completion for AI learning
    this.recordGameCompletion(false);
    
    if (this.isMobileDevice()) {
      // Smaller, mobile-friendly game over message
      gameOverElement.innerHTML = `
        <div class="mobile-game-over">
          <div class="game-over-icon">💀</div>
          <h3>Game Over!</h3>
          <div class="final-stats">
            <div class="stat">Score: ${this.score.toLocaleString()}</div>
            <div class="stat">Moves: ${this.moves}</div>
          </div>
          <div class="button-row">
            <button class="compact-btn primary" onclick="game.reset(); game.updateUI();">
              <i class="fas fa-redo"></i> New Game
            </button>
          </div>
        </div>
      `;
    } else {
      gameOverElement.textContent = 'Game Over!';
    }
    
    gameOverElement.classList.remove('hidden');
    gameOverElement.classList.remove('win-state');
    
    if (!this.hasSavedStats) {
      this.saveStats();
      this.hasSavedStats = true;
    }
  }

  showWinMessage() {
    const gameOverElement = document.getElementById('game-over');
    gameOverElement.innerHTML = ''; // Clear any existing content
    
    // Record game completion for AI learning (win = true)
    this.recordGameCompletion(true);
    
    if (this.isMobileDevice()) {
      // Compact mobile win message
      const winDiv = document.createElement('div');
      winDiv.className = 'mobile-win-message';
      winDiv.innerHTML = `
        <div class="win-icon">🎉</div>
        <h3>You Won!</h3>
        <p>You reached 2048!</p>
        <div class="win-buttons">
          <button class="compact-btn primary" onclick="document.getElementById('game-over').classList.add('hidden'); game.gameState = 'won-continue';">
            <i class="fas fa-play"></i> Keep Playing
          </button>
          <button class="compact-btn secondary" onclick="game.reset(); game.updateUI();">
            <i class="fas fa-redo"></i> New Game
          </button>
        </div>
      `;
      gameOverElement.appendChild(winDiv);
    } else {
      // Desktop version (keep existing)
      const messageDiv = document.createElement('div');
      messageDiv.style.marginBottom = '15px';
      messageDiv.innerHTML = `
        <h3 style="margin: 0 0 10px 0; color: #ffcc00;">🎉 Congratulations!</h3>
        <p style="margin: 0;">You reached 2048! Keep playing to reach even higher tiles!</p>
      `;
      
      // Add a continue button
      const continueButton = document.createElement('button');
      continueButton.textContent = 'Keep Playing';
      continueButton.style.cssText = `
        background: linear-gradient(45deg, #4CAF50, #45a049);
        color: white;
        border: none;
        padding: 10px 20px;
        margin: 0 5px;
        border-radius: 5px;
        cursor: pointer;
        font-size: 1rem;
        font-weight: bold;
      `;
      continueButton.addEventListener('click', () => {
        gameOverElement.classList.add('hidden');
        this.gameState = 'won-continue'; // Mark as won but continuing
      });
      
      // Add a new game button
      const newGameButton = document.createElement('button');
      newGameButton.textContent = 'New Game';
      newGameButton.style.cssText = `
        background: linear-gradient(45deg, #2196F3, #1976D2);
        color: white;
        border: none;
        padding: 10px 20px;
        margin: 0 5px;
        border-radius: 5px;
        cursor: pointer;
        font-size: 1rem;
        font-weight: bold;
      `;
      newGameButton.addEventListener('click', () => {
        this.reset();
        this.updateUI();
      });
      
      gameOverElement.appendChild(messageDiv);
      gameOverElement.appendChild(continueButton);
      gameOverElement.appendChild(newGameButton);
    }
    
    gameOverElement.classList.remove('hidden');
    gameOverElement.classList.add('win-state');
    
    if (!this.hasSavedStats) {
      this.saveStats();
      this.hasSavedStats = true;
    }
  }

  // Mobile state management methods
  saveCurrentGameState() {
    if (this.gameState === 'playing' || this.gameState === 'won-continue') {
      const gameState = {
        board: JSON.parse(JSON.stringify(this.board)),
        score: this.score,
        bestScore: this.bestScore,
        moves: this.moves,
        gameState: this.gameState,
        startTime: this.startTime,
        pausedTime: this.pausedTime,
        isAutoPlayedGame: this.isAutoPlayedGame,
        hasHumanMoves: this.hasHumanMoves,
        hueValue: this.hueValue,
        isLightMode: this.isLightMode,
        size: this.size,
        timestamp: Date.now()
      };
      
      try {
        localStorage.setItem('currentGameState', JSON.stringify(gameState));
        console.log('📱 Game state saved for mobile resume');
      } catch (e) {
        console.warn('Failed to save game state:', e);
      }
    }
  }

  restoreGameStateIfNeeded() {
    try {
      const savedState = localStorage.getItem('currentGameState');
      if (savedState) {
        const gameState = JSON.parse(savedState);
        
        // Only restore if the saved state is recent (within 24 hours)
        const timeDiff = Date.now() - gameState.timestamp;
        if (timeDiff < 24 * 60 * 60 * 1000) { // 24 hours in milliseconds
          
          // Only restore if current game is fresh (no moves made)
          if (this.moves === 0 && this.score === 0) {
            this.board = gameState.board;
            this.score = gameState.score;
            this.moves = gameState.moves;
            this.gameState = gameState.gameState;
            this.startTime = gameState.startTime;
            this.pausedTime = gameState.pausedTime || 0;
            this.isAutoPlayedGame = gameState.isAutoPlayedGame || false;
            this.hasHumanMoves = gameState.hasHumanMoves || false;
            
            // Restore visual settings if they match current settings
            if (gameState.size === this.size) {
              this.updateUI();
              console.log('📱 Game state restored successfully');
              
              // Show brief message about restoration
              this.showRestorationMessage();
            }
          }
        }
        
        // Clear old saved state
        localStorage.removeItem('currentGameState');
      }
    } catch (e) {
      console.warn('Failed to restore game state:', e);
      localStorage.removeItem('currentGameState');
    }
  }

  showRestorationMessage() {
    const message = document.createElement('div');
    message.className = 'restoration-toast';
    message.innerHTML = `
      <div class="toast-content">
        <i class="fas fa-history"></i>
        <span>Game restored</span>
      </div>
    `;
    
    message.style.cssText = `
      position: fixed;
      top: 80px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 10000;
      background: rgba(76, 175, 80, 0.9);
      color: white;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 13px;
      backdrop-filter: blur(10px);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      animation: slideInTop 0.3s ease-out;
    `;
    
    document.body.appendChild(message);
    
    setTimeout(() => {
      message.style.animation = 'slideOutTop 0.3s ease-in forwards';
      setTimeout(() => message.remove(), 300);
    }, 2000);
  }

  startAutoSave() {
    if (this.isMobileDevice()) {
      // Auto-save every 30 seconds for mobile devices
      this.autoSaveInterval = setInterval(() => {
        if (this.gameState === 'playing') {
          this.saveCurrentGameState();
        }
      }, 30000); // 30 seconds
    }
  }

  stopAutoSave() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }

  // UI and visual functions
  updateUI() {
    // Update score display with null checks
    const scoreElement = document.getElementById('score');
    const bestScoreElement = document.getElementById('best-score');
    const movesElement = document.getElementById('moves');
    
    if (scoreElement) scoreElement.textContent = this.score;
    if (bestScoreElement) bestScoreElement.textContent = this.bestScore;
    if (movesElement) movesElement.textContent = this.moves;
    
    // Update best score if needed
    this.updateBestScore();
    
    // Clear existing tiles but keep grid cells
    const boardContainer = document.getElementById('board-container');
    if (boardContainer) {
      const gridCells = boardContainer.querySelectorAll('.grid-cell');
      gridCells.forEach(cell => {
        while (cell.firstChild) {
          cell.removeChild(cell.firstChild);
        }
      });
    }
    
    // Create tile elements
    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        if (this.board[i][j] !== 0) {
          const tile = this.createTileElement(i, j, this.board[i][j]);
          
          // Add animation classes if needed
          if (this.lastMerged.some(pos => pos.row === i && pos.col === j)) {
            tile.classList.add('merged');
          } else if (this.lastMoveDirection) {
            tile.classList.add(`slide-${this.lastMoveDirection}`);
          }
        }
      }
    }
    
    // Make sure tile sizes are properly adjusted
    setTimeout(() => this.updateTileFontSizes(), 0);
    
    // Update back button state
    this.updateBackButtonState();
  }

  updateBackButtonState() {
    const backButton = document.getElementById('back-button');
    if (backButton) {
      backButton.style.display = this.gameStateStack.length > 0 ? 'flex' : 'none';
    }
  }

  showScorePopup(value) {
    const scorePopup = document.createElement('div');
    scorePopup.className = 'score-popup';
    scorePopup.textContent = `+${value}`;
    
    // Position the popup near the score display
    const scoreElement = document.getElementById('score');
    const scoreRect = scoreElement.getBoundingClientRect();
    
    scorePopup.style.position = 'absolute';
    scorePopup.style.left = `${scoreRect.left}px`;
    scorePopup.style.top = `${scoreRect.top - 30}px`;
    
    document.body.appendChild(scorePopup);
    
    // Remove the popup after animation completes
    setTimeout(() => {
      if (scorePopup.parentElement) {
        document.body.removeChild(scorePopup);
      }
    }, 1000);
  }

  // Event handlers
  handleKeyPress(event) {
    // Handle pause/resume with space key regardless of game state
    if (event.key === ' ' || event.code === 'Space') {
      event.preventDefault();
      if (this.gameState === 'playing' || this.gameState === 'paused') {
        this.togglePause();
      }
      return;
    }

    // Handle other keys only when not paused and game is playing
    // Also prevent input during animations to avoid race conditions
    if (this.isPaused || this.animationInProgress || (this.gameState !== 'playing' && this.gameState !== 'won-continue')) {
      return;
    }
    
    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault();
        this.hasHumanMoves = true; // Track human move
        if (this.move('up')) {
          // Move succeeded - check game state after move completes
          setTimeout(() => {
            if (!this.animationInProgress) {
              this.checkGameState();
            }
          }, 250); // Wait for animations to complete
        }
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.hasHumanMoves = true; // Track human move
        if (this.move('down')) {
          setTimeout(() => {
            if (!this.animationInProgress) {
              this.checkGameState();
            }
          }, 250);
        }
        break;
      case 'ArrowLeft':
        event.preventDefault();
        this.hasHumanMoves = true; // Track human move
        if (this.move('left')) {
          setTimeout(() => {
            if (!this.animationInProgress) {
              this.checkGameState();
            }
          }, 250);
        }
        break;
      case 'ArrowRight':
        event.preventDefault();
        this.hasHumanMoves = true; // Track human move
        if (this.move('right')) {
          setTimeout(() => {
            if (!this.animationInProgress) {
              this.checkGameState();
            }
          }, 250);
        }
        break;
    }
  }

  // Enhanced touch handling for mobile with advanced gesture recognition
  handleTouchStart(event) {
    if (this.isPaused || (this.gameState !== 'playing' && this.gameState !== 'won-continue')) return;
    
    // Support multi-touch by using first touch only
    const touch = event.touches[0];
    this.touchStartX = touch.clientX;
    this.touchStartY = touch.clientY;
    this.touchStartTime = Date.now();
    this.touchMoved = false;
    
    // Enhanced visual feedback for touch start
    const boardContainer = document.getElementById('board-container');
    if (boardContainer) {
      boardContainer.style.transform = 'scale(0.98)';
      boardContainer.style.transition = 'transform 0.1s cubic-bezier(0.2, 0, 0.2, 1)';
    }
    
    // Prevent default behavior to avoid scrolling and context menus
    event.preventDefault();
    
    // Add haptic feedback on supported devices
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
  }

  handleTouchMove(event) {
    if (!this.touchStartX || !this.touchStartY) return;
    
    // Mark that touch has moved (helps distinguish from taps)
    this.touchMoved = true;
    
    // Calculate movement for potential preview
    const touch = event.touches[0];
    const deltaX = touch.clientX - this.touchStartX;
    const deltaY = touch.clientY - this.touchStartY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    // Show subtle visual preview for large movements
    if (distance > 20) {
      const boardContainer = document.getElementById('board-container');
      if (boardContainer) {
        const maxOffset = 8;
        const offsetX = Math.max(-maxOffset, Math.min(maxOffset, deltaX * 0.1));
        const offsetY = Math.max(-maxOffset, Math.min(maxOffset, deltaY * 0.1));
        boardContainer.style.transform = `scale(0.98) translate(${offsetX}px, ${offsetY}px)`;
      }
    }
    
    // Prevent scrolling during swipe
    event.preventDefault();
  }

  handleTouchEnd(event) {
    if (!this.touchStartX || !this.touchStartY || this.isPaused || this.animationInProgress || (this.gameState !== 'playing' && this.gameState !== 'won-continue')) {
      this.resetTouchState();
      return;
    }
    
    const boardContainer = document.getElementById('board-container');
    if (boardContainer) {
      boardContainer.style.transform = '';
      boardContainer.style.transition = '';
    }
    
    const touch = event.changedTouches[0];
    const touchEndX = touch.clientX;
    const touchEndY = touch.clientY;
    const touchEndTime = Date.now();
    
    const deltaX = touchEndX - this.touchStartX;
    const deltaY = touchEndY - this.touchStartY;
    const deltaTime = touchEndTime - this.touchStartTime;
    
    // Enhanced swipe detection with improved accuracy
    const swipeDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const velocity = swipeDistance / deltaTime;
    
    // Adaptive thresholds based on screen size
    const screenMin = Math.min(window.innerWidth, window.innerHeight);
    const minSwipeDistance = Math.max(25, screenMin * 0.04);
    const maxSwipeTime = 800;
    const minVelocity = 0.08;
    
    // Enhanced validation for intentional swipes
    const isValidSwipe = 
      swipeDistance >= minSwipeDistance && 
      deltaTime <= maxSwipeTime && 
      velocity >= minVelocity &&
      this.touchMoved;
    
    if (!isValidSwipe) {
      this.resetTouchState();
      return;
    }
    
    // Advanced direction detection with deadzone
    const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
    const absAngle = Math.abs(angle);
    const deadzone = 20; // Degrees of deadzone around diagonals
    
    let direction = null;
    
    // Use refined angle-based direction detection
    if (absAngle <= 45 - deadzone || absAngle >= 135 + deadzone) {
      // Horizontal movement
      direction = deltaX > 0 ? 'right' : 'left';
    } else if (angle > 45 + deadzone && angle < 135 - deadzone) {
      direction = 'down';
    } else if (angle < -45 - deadzone && angle > -135 + deadzone) {
      direction = 'up';
    }
    
    if (direction) {
      // Add haptic feedback on supported devices
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
      
      // Track human move for statistics
      this.hasHumanMoves = true;
      
      // Perform the move with enhanced visual feedback and game state checking
      const moved = this.move(direction);
      
      if (moved) {
        // Add enhanced swipe direction indicator
        this.showSwipeIndicator(direction);
        
        // Add subtle screen flash for successful moves
        this.showMoveSuccess();
        
        // Check game state after move completes (mobile-specific timing)
        setTimeout(() => {
          if (!this.animationInProgress) {
            this.checkGameState();
          }
        }, 300); // Slightly longer delay for mobile to account for slower rendering
      } else {
        // Visual feedback for invalid move
        this.showInvalidMove();
      }
    }
    
    this.resetTouchState();
    event.preventDefault();
  }

  resetTouchState() {
    this.touchStartX = null;
    this.touchStartY = null;
    this.touchStartTime = null;
    this.touchMoved = false;
  }

  showSwipeIndicator(direction) {
    // Enhanced visual feedback for swipe direction
    const indicator = document.createElement('div');
    indicator.className = 'swipe-indicator';
    indicator.innerHTML = this.getDirectionIcon(direction);
    
    const boardContainer = document.getElementById('board-container');
    const rect = boardContainer.getBoundingClientRect();
    
    indicator.style.cssText = `
      position: fixed;
      left: ${rect.left + rect.width / 2}px;
      top: ${rect.top + rect.height / 2}px;
      transform: translate(-50%, -50%);
      font-size: 2.5rem;
      color: hsl(${this.hueValue}, 80%, 60%);
      opacity: 0.9;
      pointer-events: none;
      z-index: 1001;
      transition: all 0.4s cubic-bezier(0.2, 0, 0.2, 1);
      text-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
      filter: drop-shadow(0 0 8px hsl(${this.hueValue}, 80%, 60%));
    `;
    
    document.body.appendChild(indicator);
    
    // Animate out with direction-specific movement
    const offset = this.getDirectionOffset(direction, 30);
    setTimeout(() => {
      indicator.style.transform = `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) scale(1.2)`;
      indicator.style.opacity = '0';
    }, 50);
    
    setTimeout(() => {
      if (indicator.parentNode) {
        indicator.parentNode.removeChild(indicator);
      }
    }, 450);
  }

  showMoveSuccess() {
    // Subtle screen flash for successful moves
    const flash = document.createElement('div');
    flash.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%);
      pointer-events: none;
      z-index: 999;
      opacity: 0;
      transition: opacity 0.15s ease;
    `;
    
    document.body.appendChild(flash);
    
    setTimeout(() => flash.style.opacity = '1', 10);
    setTimeout(() => flash.style.opacity = '0', 100);
    setTimeout(() => {
      if (flash.parentNode) {
        flash.parentNode.removeChild(flash);
      }
    }, 250);
  }

  showInvalidMove() {
    // Visual feedback for invalid move attempts
    const boardContainer = document.getElementById('board-container');
    if (boardContainer) {
      boardContainer.style.animation = 'shake 0.3s ease-in-out';
      boardContainer.style.borderColor = 'rgba(255, 100, 100, 0.8)';
      
      setTimeout(() => {
        boardContainer.style.animation = '';
        boardContainer.style.borderColor = '';
      }, 300);
    }
    
    // Add haptic feedback for invalid move
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }
  }

  getDirectionIcon(direction) {
    const icons = {
      up: '↑',
      down: '↓',
      left: '←',
      right: '→'
    };
    return icons[direction] || '•';
  }

  getDirectionOffset(direction, distance = 20) {
    const offsets = {
      up: { x: 0, y: -distance },
      down: { x: 0, y: distance },
      left: { x: -distance, y: 0 },
      right: { x: distance, y: 0 }
    };
    return offsets[direction] || { x: 0, y: 0 };
  }

  // Enhanced responsive layout management
  refreshLayout() {
    // Update CSS variables for responsive layout
    document.documentElement.style.setProperty('--size', this.size);
    
    // Add board size class to body for CSS targeting
    document.body.className = document.body.className.replace(/board-size-\d+/g, '');
    document.body.classList.add(`board-size-${this.size}`);
    
    // Enhanced responsive calculations
    this.updateResponsiveVariables();
    
    // Update mobile-specific measurements
    if (this.isMobileDevice()) {
      this.applyMobileOptimizations();
    } else {
      this.applyDesktopOptimizations();
    }
    
    // Clear and redraw the board
    this.updateUI();
    
    // Ensure proper font sizing after layout change
    setTimeout(() => this.updateTileFontSizes(), 100);
  }

  updateResponsiveVariables() {
    console.log('Updating responsive variables...');
    
    // Get current viewport dimensions
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const vmin = Math.min(vw, vh);
    const isMobile = this.isMobileDevice();
    const isPortrait = vh > vw;
    
    console.log(`Viewport: ${vw}x${vh}, Mobile: ${isMobile}, Portrait: ${isPortrait}`);
    
    // Calculate optimal board size and gap based on viewport and grid size
    let maxBoardSize, gapMultiplier;
    
    // Grid-specific optimizations with better scaling
    switch (this.size) {
      case 3:
        gapMultiplier = 1.6;
        if (isMobile) {
          maxBoardSize = isPortrait ? 
            Math.min(vw * 0.90, vh * 0.45, 300) :
            Math.min(vw * 0.50, vh * 0.70, 320);
        } else {
          maxBoardSize = Math.min(vw * 0.40, vh * 0.50, 350);
        }
        break;
      case 4:
        gapMultiplier = 1.0;
        if (isMobile) {
          maxBoardSize = isPortrait ? 
            Math.min(vw * 0.92, vh * 0.50, 340) :
            Math.min(vw * 0.55, vh * 0.75, 360);
        } else {
          maxBoardSize = Math.min(vw * 0.45, vh * 0.55, 420);
        }
        break;
      case 5:
        gapMultiplier = 0.6;
        if (isMobile) {
          maxBoardSize = isPortrait ? 
            Math.min(vw * 0.95, vh * 0.55, 380) :
            Math.min(vw * 0.60, vh * 0.80, 400);
        } else {
          maxBoardSize = Math.min(vw * 0.50, vh * 0.60, 480);
        }
        break;
      case 7:
        gapMultiplier = 0.5;
        if (isMobile) {
          maxBoardSize = isPortrait ? 
            Math.min(vw * 0.95, vh * 0.58, 420) :
            Math.min(vw * 0.65, vh * 0.85, 450);
        } else {
          maxBoardSize = Math.min(vw * 0.55, vh * 0.65, 520);
        }
        break;
      case 9:
        gapMultiplier = 0.3;
        if (isMobile) {
          maxBoardSize = isPortrait ? 
            Math.min(vw * 0.98, vh * 0.62, 480) :
            Math.min(vw * 0.70, vh * 0.90, 500);
        } else {
          maxBoardSize = Math.min(vw * 0.60, vh * 0.70, 580);
        }
        break;
      default:
        // Fallback for any unexpected grid size
        gapMultiplier = 1.0 / this.size;
        maxBoardSize = isMobile ? 
          Math.min(vw * 0.92, vh * 0.55, 400) :
          Math.min(vw * 0.50, vh * 0.60, 500);
        break;
    }
    
    // Calculate gap size with improved scaling
    const baseGap = isMobile ? 
      Math.max(2, Math.min(8, vmin * 0.010)) :
      Math.max(4, Math.min(12, vmin * 0.015));
    const gap = Math.round(baseGap * gapMultiplier);
    
    // Calculate tile size for perfect fit
    const availableSize = maxBoardSize - (gap * 2); // Account for padding
    const tileSize = Math.floor((availableSize - gap * (this.size - 1)) / this.size);
    
    // Ensure minimum tile size for usability
    const minTileSize = isMobile ? 30 : 40;
    let adjustedTileSize = Math.max(minTileSize, tileSize);
    
    // Recalculate board size to ensure perfect fit
    const adjustedBoardSize = (adjustedTileSize * this.size) + (gap * (this.size + 1));
    
    console.log(`Grid ${this.size}x${this.size}: BoardSize=${adjustedBoardSize}, TileSize=${adjustedTileSize}, Gap=${gap}`);
    
    // Update CSS variables
    document.documentElement.style.setProperty('--board-max-size', `${adjustedBoardSize}px`);
    document.documentElement.style.setProperty('--gap', `${gap}px`);
    document.documentElement.style.setProperty('--tile-size', `${adjustedTileSize}px`);
    
    // Adjust tile border radius based on tile size
    const borderRadius = Math.max(3, Math.min(10, Math.floor(adjustedTileSize * 0.08)));
    document.documentElement.style.setProperty('--tile-border-radius', `${borderRadius}px`);
    
    // Update font scale variables based on tile size
    this.updateFontScales(adjustedTileSize);
    
    console.log('✅ Responsive variables updated');
  }

  updateFontScales(tileSize) {
    console.log(`Updating font scales for tile size: ${tileSize}px`);
    
    // Calculate font scales based on actual tile size and grid size for better readability
    let baseFontScale, largeFontScale, megaFontScale;
    
    // Grid-specific font scaling with better proportions
    switch (this.size) {
      case 3:
        baseFontScale = Math.max(0.20, Math.min(0.45, tileSize / 80));
        largeFontScale = baseFontScale * 0.75;
        megaFontScale = baseFontScale * 0.60;
        break;
      case 4:
        baseFontScale = Math.max(0.18, Math.min(0.40, tileSize / 90));
        largeFontScale = baseFontScale * 0.80;
        megaFontScale = baseFontScale * 0.65;
        break;
      case 5:
        baseFontScale = Math.max(0.15, Math.min(0.35, tileSize / 100));
        largeFontScale = baseFontScale * 0.85;
        megaFontScale = baseFontScale * 0.70;
        break;
      default:
        baseFontScale = Math.max(0.18, Math.min(0.40, tileSize / 90));
        largeFontScale = baseFontScale * 0.80;
        megaFontScale = baseFontScale * 0.65;
    }
    
    console.log(`Font scales - Base: ${baseFontScale}, Large: ${largeFontScale}, Mega: ${megaFontScale}`);
    
    // Apply calculated font scales
    document.documentElement.style.setProperty('--font-scale-base', baseFontScale);
    document.documentElement.style.setProperty('--font-scale-large', largeFontScale);
    document.documentElement.style.setProperty('--font-scale-mega', megaFontScale);
  }

  applyMobileOptimizations() {
    // Mobile-specific optimizations
    const controlsContainer = document.getElementById('controls-container');
    const scoreContainer = document.getElementById('score-container');
    
    if (controlsContainer) {
      controlsContainer.style.gap = '8px';
      controlsContainer.style.padding = '8px';
    }
    
    if (scoreContainer) {
      scoreContainer.style.fontSize = '0.9rem';
      scoreContainer.style.padding = '8px';
    }
    
    // Adjust header for mobile
    const header = document.querySelector('header');
    if (header) {
      header.style.padding = '8px 16px';
    }
    
    // Enable touch-friendly button sizes
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
      button.style.minWidth = '44px';
      button.style.minHeight = '44px';
      button.style.padding = '8px 12px';
    });
    
    // Optimize main layout for mobile
    const main = document.querySelector('main');
    if (main) {
      main.style.padding = '8px';
      main.style.gap = '12px';
    }
  }

  applyDesktopOptimizations() {
    // Desktop-specific optimizations
    const controlsContainer = document.getElementById('controls-container');
    const scoreContainer = document.getElementById('score-container');
    
    if (controlsContainer) {
      controlsContainer.style.gap = '15px';
      controlsContainer.style.padding = '10px';
    }
    
    if (scoreContainer) {
      scoreContainer.style.fontSize = '1rem';
      scoreContainer.style.padding = '15px';
    }
    
    // Reset header for desktop
    const header = document.querySelector('header');
    if (header) {
      header.style.padding = '10px 20px';
    }
    
    // Reset button sizes for desktop
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
      button.style.minWidth = '';
      button.style.minHeight = '';
      button.style.padding = '10px 20px';
    });
    
    // Optimize main layout for desktop
    const main = document.querySelector('main');
    if (main) {
      main.style.padding = '10px';
      main.style.gap = '20px';
    }
  }

  // Game state management
  saveGameState() {
    // Create a deep copy of the current board
    const boardCopy = JSON.parse(JSON.stringify(this.board));
    
    // Save the current game state
    this.gameStateStack.push({
      board: boardCopy,
      score: this.score,
      moves: this.moves
    });
    
    // Limit the undo history
    if (this.gameStateStack.length > this.maxUndoSteps) {
      this.gameStateStack.shift();
    }
  }

  undoMove() {
    if (this.gameStateStack.length === 0 || this.animationInProgress) return;
    
    // Get the last game state
    const lastState = this.gameStateStack.pop();
    
    // Restore the game state
    this.board = lastState.board;
    this.score = lastState.score;
    this.moves = lastState.moves;
    
    // Update the UI
    this.updateUI();
    
    // If game was over, set it back to playing
    if (this.gameState === 'over' || this.gameState === 'won') {
      this.gameState = 'playing';
      document.getElementById('game-over').classList.add('hidden');
    }
  }

  // Theme and visual effects
  applyTheme() {
    if (this.isLightMode) {
      document.body.classList.add('light-mode');
    } else {
      document.body.classList.remove('light-mode');
    }
  }

  toggleTheme() {
    this.isLightMode = !this.isLightMode;
    localStorage.setItem('isLightMode', this.isLightMode);
    this.applyTheme();
    // Update tile colors for the new theme
    this.updateTileColors();
  }

  updateHue() {
    // Update the CSS custom property with smooth transition
    document.documentElement.style.setProperty('--hue-value', this.hueValue);
    
    // Update color button with animated gradient to reflect current hue
    const colorButton = document.getElementById('changeColor-button');
    if (colorButton) {
      const currentHue = this.hueValue;
      const nextHue = (this.hueValue + 30) % 360;
      colorButton.style.background = `linear-gradient(45deg, hsl(${currentHue}, 70%, 50%) 30%, hsl(${nextHue}, 70%, 50%) 70%)`;
      colorButton.style.color = '#ffffff';
      colorButton.style.textShadow = '0 1px 2px rgba(0,0,0,0.5)';
    }
    
    // Update background elements with subtle hue shift
    this.updateBackgroundHue();
    
    // Update all tile colors dynamically based on hue
    this.updateTileColors();
  }

  updateBackgroundHue() {
    // Apply subtle hue shifts to game elements for cohesive theming
    const gameSection = document.querySelector('.game-section');
    const scoreContainer = document.getElementById('score-container');
    const boardContainer = document.getElementById('board-container');
    
    if (gameSection) {
      gameSection.style.filter = `hue-rotate(${this.hueValue * 0.1}deg) brightness(${1 + this.hueValue * 0.0002})`;
    }
    
    if (scoreContainer) {
      scoreContainer.style.background = `rgba(${this.getHueRGB()}, 0.1)`;
      scoreContainer.style.boxShadow = `0 0 15px rgba(${this.getHueRGB()}, 0.3)`;
    }
    
    if (boardContainer) {
      boardContainer.style.boxShadow = `0 0 20px rgba(${this.getHueRGB()}, 0.4)`;
    }
  }

  getHueRGB() {
    // Convert current hue to RGB values for use in rgba()
    const hsl = { h: this.hueValue, s: 70, l: 50 };
    const rgb = this.hslToRgb(hsl.h, hsl.s, hsl.l);
    return `${rgb.r}, ${rgb.g}, ${rgb.b}`;
  }

  hslToRgb(h, s, l) {
    h /= 360;
    s /= 100;
    l /= 100;
    const a = s * Math.min(l, 1 - l);
    const f = n => {
      const k = (n + h * 12) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color);
    };
    return { r: f(0), g: f(8), b: f(4) };
  }

  updateTileColors() {
    // Enhanced tile color configurations with better visual progression
    const tileColorConfig = {
      2: { 
        baseHue: 200, saturation: 50, lightness: 95, 
        textColor: this.isLightMode ? 'hsl(0, 0%, 20%)' : 'hsl(30, 20%, 30%)',
        glowIntensity: 0.1
      },
      4: { 
        baseHue: 190, saturation: 55, lightness: 90, 
        textColor: this.isLightMode ? 'hsl(0, 0%, 15%)' : 'hsl(30, 25%, 25%)',
        glowIntensity: 0.15
      },
      8: { 
        baseHue: 35, saturation: 85, lightness: this.isLightMode ? 70 : 65, 
        textColor: 'hsl(0, 0%, 100%)',
        glowIntensity: 0.2
      },
      16: { 
        baseHue: 25, saturation: 85, lightness: this.isLightMode ? 65 : 60, 
        textColor: 'hsl(0, 0%, 100%)',
        glowIntensity: 0.25
      },
      32: { 
        baseHue: 15, saturation: 90, lightness: this.isLightMode ? 65 : 60, 
        textColor: 'hsl(0, 0%, 100%)',
        glowIntensity: 0.3
      },
      64: { 
        baseHue: 5, saturation: 90, lightness: this.isLightMode ? 65 : 60, 
        textColor: 'hsl(0, 0%, 100%)',
        glowIntensity: 0.35
      },
      128: { 
        baseHue: 50, saturation: 75, lightness: this.isLightMode ? 75 : 65, 
        textColor: 'hsl(0, 0%, 100%)',
        glowIntensity: 0.4
      },
      256: { 
        baseHue: 50, saturation: 80, lightness: this.isLightMode ? 70 : 60, 
        textColor: 'hsl(0, 0%, 100%)',
        glowIntensity: 0.45
      },
      512: { 
        baseHue: 50, saturation: 85, lightness: this.isLightMode ? 65 : 55, 
        textColor: 'hsl(0, 0%, 100%)',
        glowIntensity: 0.5
      },
      1024: { 
        baseHue: 50, saturation: 90, lightness: this.isLightMode ? 60 : 50, 
        textColor: 'hsl(0, 0%, 100%)',
        glowIntensity: 0.6
      },
      2048: { 
        baseHue: 45, saturation: 95, lightness: this.isLightMode ? 55 : 45, 
        textColor: 'hsl(0, 0%, 100%)',
        glowIntensity: 0.7
      },
      super: { 
        baseHue: 280, saturation: 80, lightness: this.isLightMode ? 50 : 40, 
        textColor: 'hsl(0, 0%, 100%)',
        glowIntensity: 0.8
      }
    };

    // Update CSS custom properties with enhanced visual effects
    Object.entries(tileColorConfig).forEach(([value, config]) => {
      const adjustedHue = (config.baseHue + this.hueValue) % 360;
      const glowColor = `hsl(${adjustedHue}, ${config.saturation}%, ${Math.min(config.lightness + 20, 95)}%)`;
      
      if (value === 'super') {
        // Enhanced super tiles with gradient and glow
        document.documentElement.style.setProperty(
          '--tile-super-bg', 
          `linear-gradient(135deg, 
            hsl(${adjustedHue}, ${config.saturation}%, ${config.lightness}%) 0%,
            hsl(${(adjustedHue + 15) % 360}, ${config.saturation}%, ${config.lightness - 5}%) 100%)`
        );
        document.documentElement.style.setProperty('--tile-super-text', config.textColor);
        document.documentElement.style.setProperty('--tile-super-glow', 
          `0 0 ${20 * config.glowIntensity}px ${glowColor}`);
      } else {
        // Enhanced regular tiles with subtle gradients for higher values
        const isHighValue = parseInt(value) >= 128;
        const bgValue = isHighValue ? 
          `linear-gradient(135deg, 
            hsl(${adjustedHue}, ${config.saturation}%, ${config.lightness}%) 0%,
            hsl(${(adjustedHue + 10) % 360}, ${config.saturation}%, ${config.lightness - 3}%) 100%)` :
          `hsl(${adjustedHue}, ${config.saturation}%, ${config.lightness}%)`;
        
        document.documentElement.style.setProperty(`--tile-${value}-bg`, bgValue);
        document.documentElement.style.setProperty(`--tile-${value}-text`, config.textColor);
        document.documentElement.style.setProperty(`--tile-${value}-glow`, 
          `0 0 ${15 * config.glowIntensity}px ${glowColor}`);
      }
    });

    // Update tiles with glow effects
    this.applyTileGlowEffects();
  }

  applyTileGlowEffects() {
    // Apply glow effects to existing tiles
    const tiles = document.querySelectorAll('.tile');
    tiles.forEach(tile => {
      const value = tile.getAttribute('data-value');
      const glowProperty = value >= 4096 ? '--tile-super-glow' : `--tile-${value}-glow`;
      const glowValue = getComputedStyle(document.documentElement).getPropertyValue(glowProperty);
      if (glowValue.trim()) {
        tile.style.boxShadow = glowValue;
      }
    });
  }

  // Enhanced hue change with smooth animation
  changeHue() {
    // Enhanced hue change with smooth animation
    const oldHue = this.hueValue;
    this.hueValue = (this.hueValue + 30) % 360;
    
    // Save to localStorage
    localStorage.setItem('hueValue', this.hueValue);
    
    // Animate the hue transition
    this.animateHueTransition(oldHue, this.hueValue);
    
    // Update immediately but also set up transition
    this.updateHue();
    
    // Force a UI update to refresh tile colors after a brief delay
    setTimeout(() => this.updateUI(), 100);
  }

  animateHueTransition(fromHue, toHue) {
    // Add transition class to body for smooth color changes
    document.body.classList.add('hue-transitioning');
    
    // Remove transition class after animation completes
    setTimeout(() => {
      document.body.classList.remove('hue-transitioning');
    }, 500);
    
    // Create ripple effect from color button
    this.createColorChangeRipple();
  }

  createColorChangeRipple() {
    const colorButton = document.getElementById('changeColor-button');
    if (!colorButton) return;
    
    const ripple = document.createElement('div');
    ripple.className = 'color-change-ripple';
    
    const rect = colorButton.getBoundingClientRect();
    ripple.style.position = 'fixed';
    ripple.style.left = `${rect.left + rect.width / 2}px`;
    ripple.style.top = `${rect.top + rect.height / 2}px`;
    ripple.style.width = '0px';
    ripple.style.height = '0px';
    ripple.style.borderRadius = '50%';
    ripple.style.background = `radial-gradient(circle, 
      hsla(${this.hueValue}, 70%, 50%, 0.3) 0%,
      hsla(${this.hueValue}, 70%, 50%, 0.1) 50%,
      transparent 100%)`;
    ripple.style.pointerEvents = 'none';
    ripple.style.zIndex = '1000';
    ripple.style.transform = 'translate(-50%, -50%)';
    ripple.style.transition = 'width 0.6s ease-out, height 0.6s ease-out, opacity 0.6s ease-out';
    
    document.body.appendChild(ripple);
    
    // Animate ripple expansion
    requestAnimationFrame(() => {
      ripple.style.width = '200px';
      ripple.style.height = '200px';
      ripple.style.opacity = '0';
    });
    
    // Remove ripple after animation
    setTimeout(() => {
      if (ripple.parentNode) {
        ripple.parentNode.removeChild(ripple);
      }
    }, 600);
  }

  togglePause() {
    if (this.isPaused) {
      this.resumeGame();
    } else {
      this.pauseGame(true); // User-initiated pause
    }
  }

  pauseGame(isUserInitiated = true) {
    if (this.isPaused) return; // Already paused

    this.isPaused = true;
    this.wasPausedByUser = isUserInitiated;
    this.pauseStartTime = new Date();
    this.gameState = 'paused';
    
    const boardContainer = document.getElementById('board-container');
    const pauseButton = document.getElementById('pause-button');
    
    if (boardContainer) {
      boardContainer.style.pointerEvents = 'none';
      boardContainer.style.opacity = '0.5';
      boardContainer.setAttribute('aria-disabled', 'true');
    }
    
    if (pauseButton) {
      pauseButton.innerHTML = '<i class="fas fa-play" aria-hidden="true"></i>';
      pauseButton.setAttribute('aria-label', 'Resume Game');
      pauseButton.title = 'Resume Game (Space)';
    }

    // Show pause overlay
    this.showPauseOverlay(isUserInitiated);

    // Dispatch pause event
    document.dispatchEvent(new CustomEvent('gamePaused', {
      detail: { userInitiated: isUserInitiated }
    }));
  }

  resumeGame() {
    if (!this.isPaused) return; // Not paused

    // Calculate and add paused time
    if (this.pauseStartTime) {
      const pauseDuration = Math.floor((new Date() - this.pauseStartTime) / 1000);
      this.pausedTime += pauseDuration;
      this.pauseStartTime = null;
    }

    this.isPaused = false;
    this.wasPausedByUser = false;
    this.gameState = 'playing';
    
    const boardContainer = document.getElementById('board-container');
    const pauseButton = document.getElementById('pause-button');
    
    if (boardContainer) {
      boardContainer.style.pointerEvents = '';
      boardContainer.style.opacity = '';
      boardContainer.removeAttribute('aria-disabled');
    }
    
    if (pauseButton) {
      pauseButton.innerHTML = '<i class="fas fa-pause" aria-hidden="true"></i>';
      pauseButton.setAttribute('aria-label', 'Pause Game');
      pauseButton.title = 'Pause Game (Space)';
    }

    // Hide pause overlay and messages
    this.hidePauseOverlay();

    // Dispatch resume event
    document.dispatchEvent(new CustomEvent('gameResumed'));
  }

  showPauseOverlay(isUserInitiated) {
    // Remove existing overlay
    this.hidePauseOverlay();

    const overlay = document.createElement('div');
    overlay.id = 'pause-overlay';
    overlay.className = 'pause-overlay';
    overlay.innerHTML = `
      <div class="pause-content">
        <div class="pause-icon">
          <i class="fas fa-${isUserInitiated ? 'pause' : 'eye-slash'}"></i>
        </div>
        <h2>${isUserInitiated ? 'Game Paused' : 'Game Auto-Paused'}</h2>
        <p>${isUserInitiated 
          ? 'Click the pause button or press Space to resume'
          : 'Game paused due to tab switch. Return to resume automatically.'
        }</p>
        ${isUserInitiated ? '<button id="resume-from-overlay" class="resume-btn">Resume Game</button>' : ''}
      </div>
    `;

    document.body.appendChild(overlay);

    // Add click handler for resume button
    const resumeBtn = document.getElementById('resume-from-overlay');
    if (resumeBtn) {
      resumeBtn.addEventListener('click', () => this.resumeGame());
    }

    // Focus management
    overlay.setAttribute('tabindex', '-1');
    overlay.focus();
  }

  hidePauseOverlay() {
    const overlay = document.getElementById('pause-overlay');
    if (overlay) {
      overlay.remove();
    }
  }

  changeBoardSize() {
    // Cycle through board sizes (4x4, 5x5, 7x7, 9x9)
    const sizes = [4, 5, 7, 9];
    const currentIndex = sizes.indexOf(this.size);
    const nextIndex = (currentIndex + 1) % sizes.length;
    this.size = sizes[nextIndex];
    
    // Reset the game with the new board size
    this.reset();
    this.refreshLayout();
  }

  // Autoplay functionality
  toggleAutoPlay() {
    if (this.isAutoPlaying) {
      this.stopAutoPlay();
    } else {
      this.startAutoPlay();
    }
  }

  startAutoPlay() {
    if (this.autoPlayInterval) return;

    this.isAutoPlaying = true;
    this.autoPlayMoves = 0;
    this.autoPlayStartTime = Date.now();
    
    // Mark this as AI gameplay for stats
    this.playMode = 'AI';
    this.isAutoPlayedGame = true; // Track that AI was used in this game
    
    const makeMove = () => {
      // Check stopping conditions
      if (!this.isAutoPlaying) {
        console.log('🤖 Autoplay stopped: isAutoPlaying = false');
        this.stopAutoPlay();
        return;
      }
      
      if (this.gameState === 'over') {
        console.log('🤖 Autoplay stopped: game state = over');
        this.stopAutoPlay();
        return;
      }
      
      if (this.isPaused) {
        console.log('🤖 Autoplay paused: game is paused');
        // Don't stop autoplay, just skip this turn
        return;
      }
      
      // Prevent moves during animations to avoid race conditions
      if (this.animationInProgress) {
        console.log('🤖 Skipping AI move - animation in progress');
        return;
      }

      try {
        const move = this.getBestMove();
        
        if (!move) {
          console.log('🤖 AI could not determine a move');
          // Double-check if any moves are actually possible
          const hasValidMoves = this.canMove('up') || this.canMove('down') || 
                              this.canMove('left') || this.canMove('right');
          
          if (!hasValidMoves) {
            console.log('🤖 Confirmed: No valid moves available, stopping autoplay');
            this.stopAutoPlay();
          } else {
            console.log('⚠️ AI failed to find move, but moves are available. Retrying...');
            // Try again on next interval rather than stopping immediately
          }
          return;
        }
        
        if (!this.canMove(move)) {
          console.log(`🤖 AI suggested invalid move: ${move}`);
          // Double-check if any moves are actually possible
          const hasValidMoves = this.canMove('up') || this.canMove('down') || 
                              this.canMove('left') || this.canMove('right');
          
          if (!hasValidMoves) {
            console.log('🤖 Confirmed: No valid moves available, stopping autoplay');
            this.stopAutoPlay();
          } else {
            console.log('⚠️ AI suggested bad move, but other moves available. Retrying...');
          }
          return;
        }
        
        // Execute the move
        const moveSuccessful = this.move(move);
        
        if (moveSuccessful) {
          this.autoPlayMoves++;
          
          // Update UI
          this.updateAutoPlayButton();
          
          if (window.debugAI) {
            console.log(`🤖 AI made move: ${move} (total moves: ${this.autoPlayMoves})`);
          }
          
          // Check game state after move completes (AI-specific timing)
          setTimeout(() => {
            if (!this.animationInProgress && this.isAutoPlaying) {
              this.checkGameState();
            }
          }, 200); // Shorter delay for AI since it doesn't need visual feedback time
        } else {
          console.log(`🤖 Move ${move} failed to execute despite being valid`);
        }
        
      } catch (error) {
        console.error('🤖 Error in AI autoplay:', error);
        this.stopAutoPlay();
      }
    };

    // Start the autoplay loop
    const delay = this.getAutoPlayDelay();
    
    if (delay === 0) {
      // MAX speed - use requestAnimationFrame for maximum performance
      const maxSpeedLoop = () => {
        if (this.isAutoPlaying) {
          makeMove();
          // Use requestAnimationFrame for smooth, maximum speed execution
          requestAnimationFrame(maxSpeedLoop);
        }
      };
      requestAnimationFrame(maxSpeedLoop);
      this.autoPlayInterval = 'MAX_SPEED'; // Mark that we're using max speed mode
    } else {
      // Normal speed - use setInterval
      this.autoPlayInterval = setInterval(makeMove, delay);
    }
    
    this.updateAutoPlayButton();
    
    const speedText = this.speedMultipliers[this.currentSpeedIndex] === 'MAX' ? 'MAX speed' : `${this.speedMultipliers[this.currentSpeedIndex]}x speed`;
    console.log(`🤖 Enhanced AI autoplay started (difficulty: ${this.aiDifficulty}, ${speedText})`);
  }

  stopAutoPlay() {
    if (this.autoPlayInterval) {
      if (this.autoPlayInterval !== 'MAX_SPEED') {
        clearInterval(this.autoPlayInterval);
      }
      this.autoPlayInterval = null;
    }
    
    if (this.isAutoPlaying) {
      const duration = (Date.now() - this.autoPlayStartTime) / 1000;
      const movesPerSecond = (this.autoPlayMoves / duration).toFixed(2);
      
      const speedText = this.speedMultipliers[this.currentSpeedIndex] === 'MAX' ? 'MAX speed' : `${this.speedMultipliers[this.currentSpeedIndex]}x speed`;
      console.log(`🏁 AI autoplay stopped: ${this.autoPlayMoves} moves in ${duration.toFixed(1)}s (${movesPerSecond} moves/sec) at ${speedText}`);
      
      // Show AI performance stats
      if (this.enhancedAI && window.debugAI) {
        const stats = this.enhancedAI.getStats();
        console.log('AI Performance Stats:', stats);
      }
    }
    
    this.isAutoPlaying = false;
    this.playMode = 'Human';
    this.updateAutoPlayButton();
  }

  updateAutoPlayButton() {
    const autoplayButton = document.getElementById('autoplay-button');
    if (!autoplayButton) return;

    const icon = autoplayButton.querySelector('i');
    if (!icon) return;

    if (this.isAutoPlaying) {
      icon.className = 'fas fa-pause';
      autoplayButton.setAttribute('data-tooltip', 'Stop auto play');
      autoplayButton.classList.add('active');
    } else {
      icon.className = 'fas fa-play';
      autoplayButton.setAttribute('data-tooltip', 'Start auto play');
      autoplayButton.classList.remove('active');
    }
  }

  updateSpeedButton() {
    const speedButton = document.getElementById('speed-button');
    if (!speedButton) return;

    const speedText = speedButton.querySelector('.speed-text');
    if (!speedText) return;

    const multiplier = this.speedMultipliers[this.currentSpeedIndex];
    speedText.textContent = multiplier === 'MAX' ? 'MAX' : `${multiplier}x`;
    
    let tooltipText;
    if (multiplier === 'MAX') {
      tooltipText = 'Maximum speed (no delay between moves)';
    } else if (multiplier === 1) {
      tooltipText = 'Normal speed';
    } else {
      tooltipText = `${multiplier}x speed (${Math.round(this.autoPlaySpeed / multiplier)}ms between moves)`;
    }
    
    speedButton.setAttribute('data-tooltip', tooltipText);
  }

  getAutoPlayDelay() {
    const multiplier = this.speedMultipliers[this.currentSpeedIndex];
    
    // MAX speed = no delay (immediate execution)
    if (multiplier === 'MAX') {
      return 0;
    }
    
    return Math.max(50, this.autoPlaySpeed / multiplier); // Minimum 50ms delay for other speeds
  }

  changeSpeed() {
    // Cycle through speed options
    this.currentSpeedIndex = (this.currentSpeedIndex + 1) % this.speedMultipliers.length;
    this.updateSpeedButton();
    
    // If autoplay is running, restart it with new speed
    if (this.isAutoPlaying) {
      // Stop current autoplay
      if (this.autoPlayInterval && this.autoPlayInterval !== 'MAX_SPEED') {
        clearInterval(this.autoPlayInterval);
      }
      this.autoPlayInterval = null;
      
      const makeMove = () => {
        // Check stopping conditions
        if (!this.isAutoPlaying) {
          console.log('🤖 Autoplay stopped: isAutoPlaying = false');
          this.stopAutoPlay();
          return;
        }
        
        if (this.gameState === 'over') {
          console.log('🤖 Autoplay stopped: game state = over');
          this.stopAutoPlay();
          return;
        }
        
        if (this.isPaused) {
          console.log('🤖 Autoplay paused: game is paused');
          return;
        }

        try {
          const move = this.getBestMove();
          
          if (!move) {
            console.log('🤖 AI could not determine a move');
            const hasValidMoves = this.canMove('up') || this.canMove('down') || 
                                this.canMove('left') || this.canMove('right');
            
            if (!hasValidMoves) {
              console.log('🤖 Confirmed: No valid moves available');
              this.stopAutoPlay();
            } else {
              console.log('⚠️ AI failed to find move, but moves are available. Retrying...');
            }
            return;
          }
          
          if (!this.canMove(move)) {
            console.log(`🤖 AI suggested invalid move: ${move}`);
            const hasValidMoves = this.canMove('up') || this.canMove('down') || 
                                this.canMove('left') || this.canMove('right');
            
            if (!hasValidMoves) {
              console.log('🤖 Confirmed: No valid moves available');
              this.stopAutoPlay();
            } else {
              console.log('⚠️ AI suggested bad move, but other moves available. Retrying...');
            }
            return;
          }
          
          // Execute the move
          this.move(move);
          this.autoPlayMoves++;
          this.updateAutoPlayButton();
          
          if (window.debugAI) {
            console.log(`🤖 AI made move: ${move} (total moves: ${this.autoPlayMoves})`);
          }
          
        } catch (error) {
          console.error('🤖 Error in AI autoplay:', error);
          this.stopAutoPlay();
        }
      };

      // Start with new speed
      const delay = this.getAutoPlayDelay();
      
      if (delay === 0) {
        // MAX speed - use requestAnimationFrame
        const maxSpeedLoop = () => {
          if (this.isAutoPlaying) {
            makeMove();
            requestAnimationFrame(maxSpeedLoop);
          }
        };
        requestAnimationFrame(maxSpeedLoop);
        this.autoPlayInterval = 'MAX_SPEED';
      } else {
        // Normal speed - use setInterval
        this.autoPlayInterval = setInterval(makeMove, delay);
      }
    }
    
    const multiplier = this.speedMultipliers[this.currentSpeedIndex];
    const speedText = multiplier === 'MAX' ? 'MAX' : `${multiplier}x`;
    console.log(`Speed changed to ${speedText}`);
  }

  // AI Algorithm for 2048 - Uses a simple heuristic approach
  getBestMove() {
    // Use enhanced AI if available, otherwise fall back to basic AI
    if (this.enhancedAI) {
      try {
        // Adjust AI difficulty dynamically
        this.adjustAIDifficulty();
        
        const startTime = performance.now();
        const move = this.enhancedAI.getBestMove();
        const endTime = performance.now();
        
        // Log performance for debugging
        if (window.debugAI) {
          console.log(`Enhanced AI move: ${move} (${(endTime - startTime).toFixed(2)}ms)`);
        }
        
        // Ensure the move is valid
        if (move && this.canMove(move)) {
          return move;
        } else if (move) {
          console.warn(`⚠️ Enhanced AI suggested invalid move: ${move}`);
        }
        
        // If Enhanced AI failed, try basic AI
        console.warn('⚠️ Enhanced AI failed, trying basic AI');
        return this.getBasicAIMove();
        
      } catch (error) {
        console.error('❌ Enhanced AI failed:', error);
        console.warn('⚠️ Falling back to basic AI');
        // Fallback to basic AI
        return this.getBasicAIMove();
      }
    } else {
      // Fallback to your existing basic AI
      return this.getBasicAIMove();
    }
  }

  // Keep your existing AI as fallback
  getBasicAIMove() {
    const directions = ['up', 'down', 'left', 'right'];
    let bestMove = null;
    let bestScore = -Infinity;

    // First, try to find the best valid move using evaluation
    for (const direction of directions) {
      if (this.canMove(direction)) {
        const score = this.evaluateMove(direction);
        if (score > bestScore) {
          bestScore = score;
          bestMove = direction;
        }
      }
    }

    // If we found a good move, return it
    if (bestMove) return bestMove;

    // Emergency fallback - just find any valid move
    for (const direction of directions) {
      if (this.canMove(direction)) {
        console.warn(`⚠️ Basic AI using emergency fallback move: ${direction}`);
        return direction;
      }
    }

    // No moves available
    console.warn('⚠️ No valid moves available for Basic AI');
    return null;
  }

  // Basic move evaluation for fallback AI
  evaluateMove(direction) {
    // Create a copy of the board and game state to simulate the move
    const originalBoard = this.board.map(row => [...row]);
    const originalScore = this.score;
    const originalAnimationInProgress = this.animationInProgress;
    const originalGameState = this.gameState;
    
    // Temporarily allow moves during simulation
    this.animationInProgress = false;
    if (this.gameState === 'over') this.gameState = 'playing';
    
    // Simulate the move
    const moveSuccessful = this.simulateMoveDirection(direction);
    
    if (!moveSuccessful) {
      // Restore state and return invalid score
      this.board = originalBoard;
      this.score = originalScore;
      this.animationInProgress = originalAnimationInProgress;
      this.gameState = originalGameState;
      return -Infinity;
    }
    
    // Calculate the score difference
    let score = this.score - originalScore;
    
    // Add heuristic scores
    score += this.countEmptyTiles(this.board) * 10; // Empty tiles bonus
    score += this.evaluateMonotonicity(this.board) * 5; // Monotonicity bonus
    score += this.evaluateSmoothness(this.board) * 3; // Smoothness bonus
    
    // Check if the move creates merge opportunities
    score += this.countMergeOpportunities(this.board) * 8;
    
    // Bonus for keeping max tile in corner
    const maxTile = this.getMaxTile();
    if (this.board[0][0] === maxTile || this.board[0][this.size-1] === maxTile || 
        this.board[this.size-1][0] === maxTile || this.board[this.size-1][this.size-1] === maxTile) {
      score += 15;
    }
    
    // Restore original state
    this.board = originalBoard;
    this.score = originalScore;
    this.animationInProgress = originalAnimationInProgress;
    this.gameState = originalGameState;
    
    return score;
  }

  // Simulate move without animations or side effects
  simulateMoveDirection(direction) {
    switch (direction) {
      case 'up':
        return this.moveUp();
      case 'down':
        return this.moveDown();
      case 'left':
        return this.moveLeft();
      case 'right':
        return this.moveRight();
      default:
        return false;
    }
  }

  // Count potential merge opportunities
  countMergeOpportunities(board) {
    let opportunities = 0;
    
    for (let row = 0; row < this.size; row++) {
      for (let col = 0; col < this.size; col++) {
        if (board[row][col] === 0) continue;
        
        const value = board[row][col];
        // Check adjacent tiles for merge opportunities
        const adjacent = [
          row > 0 ? board[row-1][col] : null,
          row < this.size-1 ? board[row+1][col] : null,
          col > 0 ? board[row][col-1] : null,
          col < this.size-1 ? board[row][col+1] : null
        ];
        
        for (const neighbor of adjacent) {
          if (neighbor === value) {
            opportunities++;
          }
        }
      }
    }
    
    return opportunities;
  }

  // Helper methods for basic AI evaluation
  countEmptyTiles(board) {
    let count = 0;
    for (let row = 0; row < this.size; row++) {
      for (let col = 0; col < this.size; col++) {
        if (board[row][col] === 0) count++;
      }
    }
    return count;
  }

  evaluateMonotonicity(board) {
    let score = 0;
    
    // Check rows
    for (let row = 0; row < this.size; row++) {
      let increasing = true, decreasing = true;
      for (let col = 1; col < this.size; col++) {
        if (board[row][col] < board[row][col-1]) increasing = false;
        if (board[row][col] > board[row][col-1]) decreasing = false;
      }
      if (increasing || decreasing) score += 10;
    }
    
    // Check columns
    for (let col = 0; col < this.size; col++) {
      let increasing = true, decreasing = true;
      for (let row = 1; row < this.size; row++) {
        if (board[row][col] < board[row-1][col]) increasing = false;
        if (board[row][col] > board[row-1][col]) decreasing = false;
      }
      if (increasing || decreasing) score += 10;
    }
    
    return score;
  }

  evaluateSmoothness(board) {
    let score = 0;
    
    for (let row = 0; row < this.size; row++) {
      for (let col = 0; col < this.size; col++) {
        if (board[row][col] === 0) continue;
        
        const value = board[row][col];
        // Check adjacent tiles
        const neighbors = [
          row > 0 ? board[row-1][col] : 0,
          row < this.size-1 ? board[row+1][col] : 0,
          col > 0 ? board[row][col-1] : 0,
          col < this.size-1 ? board[row][col+1] : 0
        ];
        
        for (const neighbor of neighbors) {
          if (neighbor === 0) continue;
          if (neighbor === value) score += 5; // Same value bonus
          else if (Math.abs(Math.log2(neighbor) - Math.log2(value)) <= 1) score += 2; // Close value bonus
        }
      }
    }
    
    return score;
  }

  // Add helper method to get max tile
  getMaxTile() {
    let maxTile = 0;
    for (let row = 0; row < this.size; row++) {
      for (let col = 0; col < this.size; col++) {
        maxTile = Math.max(maxTile, this.board[row][col]);
      }
    }
    return maxTile;
  }

  // Add method to change AI difficulty
  changeAIDifficulty() {
    const difficulties = ['easy', 'normal', 'hard', 'expert'];
    const currentIndex = difficulties.indexOf(this.aiDifficulty);
    const nextIndex = (currentIndex + 1) % difficulties.length;
    this.aiDifficulty = difficulties[nextIndex];
    
    // Save preference to localStorage
    localStorage.setItem('aiDifficulty', this.aiDifficulty);
    
    // Update AI settings immediately if AI is available
    this.adjustAIDifficulty();
    
    // Update button appearance
    const aiDifficultyButton = document.getElementById('ai-difficulty-button');
    if (aiDifficultyButton) {
      const buttonText = aiDifficultyButton.querySelector('.button-text');
      if (buttonText) {
        const capitalizedDifficulty = this.aiDifficulty.charAt(0).toUpperCase() + this.aiDifficulty.slice(1);
        buttonText.textContent = capitalizedDifficulty;
      }
      
      // Add visual feedback
      aiDifficultyButton.style.transform = 'scale(1.1)';
      setTimeout(() => {
        aiDifficultyButton.style.transform = '';
      }, 150);
    }
    
    // Show notification with detailed info
    const difficultyInfo = this.getDifficultyInfo(this.aiDifficulty);
    this.showNotification(`AI Difficulty: ${this.aiDifficulty.toUpperCase()}\n${difficultyInfo}`, 3000);
    
    console.log(`🧠 AI difficulty changed to: ${this.aiDifficulty}`);
  }

  // Show notification/toast message
  showNotification(message, duration = 2000) {
    // Remove any existing notification
    const existingNotification = document.getElementById('game-notification');
    if (existingNotification) {
      existingNotification.remove();
    }

    // Create notification element
    const notification = document.createElement('div');
    notification.id = 'game-notification';
    notification.className = 'notification-toast';
    
    // Handle multiline messages
    const lines = message.split('\n');
    const content = lines.map(line => `<div>${line}</div>`).join('');
    notification.innerHTML = content;
    
    // Style the notification
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.85);
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      z-index: 10000;
      text-align: center;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      animation: slideInDown 0.3s ease-out;
    `;
    
    // Add to document
    document.body.appendChild(notification);
    
    // Auto-remove after duration
    setTimeout(() => {
      if (notification && notification.parentNode) {
        notification.style.animation = 'slideOutUp 0.3s ease-in forwards';
        setTimeout(() => {
          if (notification.parentNode) {
            notification.remove();
          }
        }, 300);
      }
    }, duration);
  }

  // Helper method to get difficulty information
  getDifficultyInfo(difficulty) {
    const info = {
      easy: 'Fast moves, 2-depth search',
      normal: 'Balanced performance, 3-depth search', 
      hard: 'Strong play, 4-depth search',
      expert: 'Maximum strength, 5-6 depth search'
    };
    return info[difficulty] || '';
  }

  /**
   * Enhanced initialization with comprehensive error handling and debugging
   */
  initializeEnhancedSystems() {
    console.log('🔧 Initializing Enhanced Systems...');
    
    try {
      // Initialize AI Learning System if available
      if (typeof AILearningSystem !== 'undefined') {
        this.aiLearningSystem = new AILearningSystem();
        console.log('✅ AI Learning System initialized automatically');
      } else {
        console.warn('⚠️ AILearningSystem not available - automatic learning disabled');
      }
      
      // Initialize Enhanced AI if available
      this.initializeEnhancedAI();
      
      // Validate game state
      this.validateGameState();
      
      console.log('✅ All enhanced systems initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize enhanced systems:', error);
    }
  }
  
  /**
   * Validate game state and fix any inconsistencies
   */
  validateGameState() {
    // Ensure board is valid
    if (!Array.isArray(this.board) || this.board.length !== this.size) {
      console.warn('⚠️ Invalid board detected, creating new board');
      this.board = this.createEmptyBoard();
    }
    
    // Ensure board rows are valid
    for (let i = 0; i < this.size; i++) {
      if (!Array.isArray(this.board[i]) || this.board[i].length !== this.size) {
        console.warn(`⚠️ Invalid board row ${i} detected, fixing`);
        this.board[i] = new Array(this.size).fill(0);
      }
    }
    
    // Ensure gameState is valid
    if (!['playing', 'won', 'won-continue', 'over'].includes(this.gameState)) {
      console.warn('⚠️ Invalid gameState detected, resetting to playing');
      this.gameState = 'playing';
    }
    
    // Ensure size is valid
    if (![4, 5, 7, 9].includes(this.size)) {
      console.warn('⚠️ Invalid board size detected, resetting to 4x4');
      this.size = 4;
    }
    
    // Ensure score is valid
    if (typeof this.score !== 'number' || this.score < 0) {
      console.warn('⚠️ Invalid score detected, resetting to 0');
      this.score = 0;
    }
    
    console.log('✅ Game state validation completed');
  }

  initializeEnhancedAI() {
    // Try to initialize the advanced AI first, fallback to enhanced AI
    try {
      console.log('🔍 Checking available AI classes...');
      console.log('AdvancedAI2048Solver available:', !!window.AdvancedAI2048Solver);
      console.log('Enhanced2048AI available:', !!window.Enhanced2048AI);
      console.log('AILearningSystem available:', !!window.AILearningSystem);
      
      if (window.AdvancedAI2048Solver) {
        console.log('🚀 Initializing Advanced AI Solver...');
        this.advancedAI = new window.AdvancedAI2048Solver(this);
        this.enhancedAI = this.advancedAI; // Keep compatibility
        console.log('✅ Advanced AI Solver initialized with Expectimax algorithm');
      } else if (window.Enhanced2048AI) {
        console.log('🚀 Initializing Enhanced AI...');
        this.enhancedAI = new window.Enhanced2048AI(this);
        console.log('✅ Enhanced AI initialized with Minimax algorithm');
      } else {
        console.warn('⚠️ No AI solvers loaded, falling back to basic AI');
        return;
      }
    } catch (error) {
      console.error('❌ Failed to initialize AI:', error);
      console.error('Error details:', error.message, error.stack);
      console.warn('⚠️ Falling back to basic AI');
      this.enhancedAI = null;
      this.advancedAI = null;
      return;
    }
      
    // Load saved difficulty preference
    const savedDifficulty = localStorage.getItem('aiDifficulty') || 'normal';
    this.aiDifficulty = savedDifficulty;
    
    // Adjust AI difficulty based on board size and performance
    try {
      this.adjustAIDifficulty();
      console.log(`AI difficulty set to: ${this.aiDifficulty}`);
    } catch (error) {
      console.error('❌ Failed to adjust AI difficulty:', error);
    }
    
    // Update button text to match loaded difficulty
    const aiDifficultyButton = document.getElementById('ai-difficulty-button');
    if (aiDifficultyButton) {
      const buttonText = aiDifficultyButton.querySelector('.button-text');
      if (buttonText) {
        const capitalizedDifficulty = this.aiDifficulty.charAt(0).toUpperCase() + this.aiDifficulty.slice(1);
        buttonText.textContent = capitalizedDifficulty;
      }
    }
    
    console.log('✅ AI initialization complete');
  }

  adjustAIDifficulty() {
    if (!this.enhancedAI) return;

    let weights;
    
    // Check if we're using the Advanced AI or Enhanced AI
    const isAdvancedAI = (this.advancedAI && window.AdvancedAI2048Solver && this.advancedAI instanceof window.AdvancedAI2048Solver);

    switch (this.aiDifficulty) {
      case 'easy':
        if (isAdvancedAI) {
          weights = { 
            openness: 0.8,      // Lower priority on empty cells
            smoothness: 3.0,    // Reduced smoothness focus
            monotonicity: 3.0,  // Reduced monotonicity
            maxTileCorner: 0.05 // Lower corner bonus
          };
        } else {
          // Legacy Enhanced AI weights
          weights = { 
            emptyCells: 200, 
            smoothness: 50, 
            monotonicity: 500,
            maxTileCorner: 100,
            merging: 300,
            positionScores: 100
          };
        }
        break;
        
      case 'normal':
        if (isAdvancedAI) {
          weights = { 
            openness: 1.0,      // Balanced empty cells priority
            smoothness: 5.0,    // Standard smoothness
            monotonicity: 5.0,  // Standard monotonicity
            maxTileCorner: 0.1  // Standard corner bonus
          };
        } else {
          weights = { 
            emptyCells: 270, 
            smoothness: 100, 
            monotonicity: 1000,
            maxTileCorner: 200,
            merging: 500,
            positionScores: 150
          };
        }
        break;
        
      case 'hard':
        if (isAdvancedAI) {
          weights = { 
            openness: 1.2,      // Higher priority on empty cells
            smoothness: 6.0,    // Increased smoothness focus
            monotonicity: 6.0,  // Increased monotonicity
            maxTileCorner: 0.15 // Higher corner bonus
          };
        } else {
          weights = { 
            emptyCells: 300, 
            smoothness: 150, 
            monotonicity: 1200,
            maxTileCorner: 250,
            merging: 600,
            positionScores: 200
          };
        }
        break;
        
      case 'expert':
        if (isAdvancedAI) {
          weights = { 
            openness: 1.5,      // Maximum priority on empty cells
            smoothness: 8.0,    // Maximum smoothness focus
            monotonicity: 8.0,  // Maximum monotonicity
            maxTileCorner: 0.2  // Maximum corner bonus
          };
        } else {
          weights = { 
            emptyCells: 350, 
            smoothness: 200, 
            monotonicity: 1500,
            maxTileCorner: 300,
            merging: 700,
            positionScores: 250
          };
        }
        break;
    }

    // Apply the weights
    this.enhancedAI.adjustWeights(weights);
    
    console.log(`🔧 AI adjusted: ${this.aiDifficulty} difficulty with ${isAdvancedAI ? 'Advanced' : 'Enhanced'} AI`);
    if (window.debugAI) {
      console.log('Applied weights:', weights);
    }
  }

  // Helper method to count empty cells
  countEmptyCells() {
    let count = 0;
    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        if (this.board[i][j] === 0) count++;
      }
    }
    return count;
  }
}

// Add CSS animations for notifications
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
`;
document.head.appendChild(style);

// Enhanced initialization system with comprehensive error handling
function initializeFancy2048() {
  console.log('🚀 Starting Fancy2048 initialization...');
  
  let gameInitialized = false;
  let initAttempts = 0;
  const maxInitAttempts = 3;
  
  function attemptInitialization() {
    if (gameInitialized) return;
    
    initAttempts++;
    console.log(`🎮 Initialization attempt ${initAttempts}/${maxInitAttempts}`);
    
    try {
      // Comprehensive DOM readiness check
      if (document.readyState === 'loading') {
        console.log('⏳ DOM still loading, waiting...');
        setTimeout(attemptInitialization, 200);
        return;
      }
      
      // Ensure all required elements exist
      const requiredElements = ['board-container', 'score', 'best-score', 'moves', 'time'];
      const missingElements = requiredElements.filter(id => {
        const element = document.getElementById(id);
        if (!element) {
          console.warn(`❌ Missing element: ${id}`);
          return true;
        }
        return false;
      });
      
      if (missingElements.length > 0) {
        console.error('❌ Missing required elements:', missingElements);
        
        if (initAttempts < maxInitAttempts) {
          console.log('🔄 Retrying initialization in 500ms...');
          setTimeout(attemptInitialization, 500);
          return;
        } else {
          throw new Error(`Missing DOM elements after ${maxInitAttempts} attempts: ${missingElements.join(', ')}`);
        }
      }
      
      // Verify Game class is available
      if (typeof Game === 'undefined') {
        console.error('❌ Game class not found');
        if (initAttempts < maxInitAttempts) {
          console.log('🔄 Waiting for Game class to load...');
          setTimeout(attemptInitialization, 500);
          return;
        } else {
          throw new Error('Game class not loaded after maximum attempts');
        }
      }
      
      console.log('✅ All prerequisites met, creating game instance...');
      
      // Initialize the game
      window.game = new Game(4);
      gameInitialized = true;
      
      console.log('🎉 Fancy2048 initialized successfully!');
      
      // Dispatch initialization complete event
      document.dispatchEvent(new CustomEvent('gameInitialized', {
        detail: { game: window.game, attempts: initAttempts }
      }));
      
      // Optional: Remove any loading indicators
      const loadingIndicators = document.querySelectorAll('.loading-indicator, .init-status');
      loadingIndicators.forEach(indicator => {
        indicator.style.opacity = '0';
        setTimeout(() => indicator.remove(), 500);
      });
      
    } catch (error) {
      console.error(`❌ Initialization attempt ${initAttempts} failed:`, error);
      
      if (initAttempts < maxInitAttempts) {
        console.log(`🔄 Retrying in 1 second... (${maxInitAttempts - initAttempts} attempts remaining)`);
        setTimeout(attemptInitialization, 1000);
      } else {
        console.error('❌ All initialization attempts failed');
        showInitializationError(error, initAttempts);
      }
    }
  }
  
  function showInitializationError(error, attempts) {
    const boardContainer = document.getElementById('board-container');
    if (boardContainer) {
      boardContainer.innerHTML = `
        <div style="
          text-align: center; 
          padding: 2rem; 
          color: #ff6b6b;
          background: rgba(244, 67, 54, 0.1);
          border: 1px solid #ff6b6b;
          border-radius: 10px;
          margin: 20px;
        ">
          <h3 style="margin-top: 0; color: #ff6b6b;">
            <i class="fas fa-exclamation-triangle"></i>
            Game Initialization Failed
          </h3>
          <p style="margin: 15px 0;">
            The game could not be initialized after ${attempts} attempts.
          </p>
          <details style="margin: 15px 0; text-align: left;">
            <summary style="cursor: pointer; color: #ffcc00;">Technical Details</summary>
            <pre style="
              margin: 10px 0; 
              padding: 10px; 
              background: rgba(0,0,0,0.3); 
              border-radius: 5px; 
              font-size: 12px;
              overflow-x: auto;
              color: #f2f2f2;
            ">${error.message}
Stack: ${error.stack || 'Not available'}</pre>
          </details>
          <div style="margin-top: 20px;">
            <button onclick="location.reload()" style="
              margin: 5px; 
              padding: 10px 15px; 
              background: #ff6b6b; 
              color: white; 
              border: none; 
              border-radius: 5px; 
              cursor: pointer;
              font-weight: bold;
            ">
              <i class="fas fa-redo"></i> Refresh Page
            </button>
            <button onclick="window.location.href = window.location.href.replace('index.html', 'index_fixed.html')" style="
              margin: 5px; 
              padding: 10px 15px; 
              background: #4CAF50; 
              color: white; 
              border: none; 
              border-radius: 5px; 
              cursor: pointer;
              font-weight: bold;
            ">
              <i class="fas fa-tools"></i> Try Fixed Version
            </button>
          </div>
        </div>
      `;
    }
    
    // Also show a toast notification
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(244, 67, 54, 0.9);
      color: white;
      padding: 15px 20px;
      border-radius: 8px;
      font-weight: bold;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    toast.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px;">
        <i class="fas fa-exclamation-circle"></i>
        <span>Initialization Failed</span>
      </div>
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 5000);
  }
  
  // Start initialization
  attemptInitialization();
}

// Multiple initialization triggers to ensure the game starts
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeFancy2048);
} else {
  // DOM already loaded
  setTimeout(initializeFancy2048, 50);
}

// Additional safety initialization after window load
window.addEventListener('load', () => {
  if (!window.game) {
    console.log('🚨 Game not initialized after window load, attempting emergency initialization...');
    setTimeout(initializeFancy2048, 100);
  }
});

// Fallback initialization for edge cases
setTimeout(() => {
  if (!window.game && typeof Game !== 'undefined') {
    console.log('🆘 Running final fallback initialization...');
    try {
      window.game = new Game(4);
      console.log('✅ Fallback initialization successful');
    } catch (error) {
      console.error('❌ Even fallback initialization failed:', error);
    }
  }
}, 2000);

// Additional debugging helpers
window.debugGame = {
  // Helper function to test win condition (for development/testing only)
  testWinCondition: () => {
    if (window.game) {
      // Add a 2048 tile to test the win message
      window.game.board[0][0] = 2048;
      window.game.updateUI();
      console.log('🧪 Added 2048 tile for testing. Next move will trigger win message.');
    } else {
      console.log('❌ Game not initialized yet');
    }
  },

  // Helper to test continue after win
  testContinueAfterWin: () => {
    if (window.game) {
      window.game.gameState = 'won-continue';
      console.log('🧪 Set game state to "won-continue". You can now move tiles after winning.');
    } else {
      console.log('❌ Game not initialized yet');
    }
  },

  // Debug board state and move validation
  debugBoardState: () => {
    if (!window.game) {
      console.log('❌ Game not initialized yet');
      return;
    }
    
    const game = window.game;
    console.log('🔍 Board State Debug:');
    console.log('Board:', game.board.map(row => [...row]));
    console.log('Game State:', game.gameState);
    console.log('Is Auto Playing:', game.isAutoPlaying);
    console.log('Is Paused:', game.isPaused);
    
    // Check empty cells
    let emptyCount = 0;
    for (let i = 0; i < game.size; i++) {
      for (let j = 0; j < game.size; j++) {
        if (game.board[i][j] === 0) emptyCount++;
      }
    }
    console.log('Empty Cells:', emptyCount);
    
    // Test all move directions
    const moves = {
      up: game.canMove('up'),
      down: game.canMove('down'),
      left: game.canMove('left'),
      right: game.canMove('right')
    };
    console.log('Valid Moves:', moves);
    console.log('Any Valid Move:', Object.values(moves).some(v => v));
    
    // Check if board appears full vs actually full
    const appearsFull = emptyCount === 0;
    const actuallyBlocked = !Object.values(moves).some(v => v);
    
    console.log('Appears Full:', appearsFull);
    console.log('Actually Blocked:', actuallyBlocked);
    
    if (appearsFull && !actuallyBlocked) {
      console.log('⚠️ Board is full but moves are still possible!');
    } else if (!appearsFull && actuallyBlocked) {
      console.log('⚠️ Board has empty spaces but no moves detected!');
    } else if (appearsFull && actuallyBlocked) {
      console.log('💀 Board is legitimately game over');
    } else {
      console.log('✅ Board state is normal');
    }
  },

  // Force test game over detection
  testGameOverDetection: () => {
    if (!window.game) {
      console.log('❌ Game not initialized yet');
      return;
    }
    
    console.log('🧪 Testing game over detection...');
    window.game.checkGameState();
  }
};

// Add to your game.js or create a separate debug file
window.debugAI = true; // Set to false to disable AI debugging

window.aiDebugTools = {
  testAI: (moves = 10) => {
    console.log(`Testing AI for ${moves} moves...`);
    const startTime = performance.now();
    
    for (let i = 0; i < moves; i++) {
      const move = game.getBestMove();
      console.log(`Move ${i + 1}: ${move}`);
    }
    
    const endTime = performance.now();
    console.log(`AI test completed in ${(endTime - startTime).toFixed(2)}ms`);
    console.log(`Average time per move: ${((endTime - startTime) / moves).toFixed(2)}ms`);
  },
  
  compareAI: () => {
    console.log('Comparing AI performance...');
    const enhanced = game.enhancedAI?.getBestMove();
    const basic = game.getBasicAIMove();
    console.log(`Enhanced AI suggests: ${enhanced}`);
    console.log(`Basic AI suggests: ${basic}`);
  },
  
  benchmarkAI: (depth = 4) => {
    if (game.enhancedAI) {
      const originalDepth = game.enhancedAI.maxDepth;
      game.enhancedAI.setDepth(depth);
      
      const startTime = performance.now();
      const move = game.enhancedAI.getBestMove();
      const endTime = performance.now();
      
      console.log(`Depth ${depth}: ${move} (${(endTime - startTime).toFixed(2)}ms)`);
      
      game.enhancedAI.setDepth(originalDepth);
      return endTime - startTime;
    }
  }
};

function setupLearningControls() {
  // Toggle Learning Button
  const toggleButton = document.getElementById('toggle-learning-button');
  if (toggleButton) {
    toggleButton.addEventListener('click', () => {
      if (window.game) {
        const newState = window.game.toggleAILearning();
        const icon = toggleButton.querySelector('i');
        const text = toggleButton.querySelector('span');
        
        if (newState) {
          icon.className = 'fas fa-toggle-on';
          text.textContent = 'Learning: On';
          toggleButton.style.background = 'linear-gradient(135deg, #4CAF50, #45a049)';
        } else {
          icon.className = 'fas fa-toggle-off';
          text.textContent = 'Learning: Off';
          toggleButton.style.background = 'linear-gradient(135deg, #f44336, #d32f2f)';
        }
      }
    });
  }
  
  // Export Data Button
  const exportButton = document.getElementById('export-learning-button');
  if (exportButton) {
    exportButton.addEventListener('click', () => {
      if (window.game) {
        const success = window.game.exportAILearningData();
        if (success) {
          showNotification('📁 Learning data exported successfully!', 'success');
        } else {
          showNotification('❌ Failed to export learning data', 'error');
        }
      }
    });
  }
  
  // Import Data Button
  const importButton = document.getElementById('import-learning-button');
  const fileInput = document.getElementById('learning-file-input');
  
  if (importButton && fileInput) {
    importButton.addEventListener('click', () => {
      fileInput.click();
    });
    
    fileInput.addEventListener('change', async (event) => {
      const file = event.target.files[0];
      if (file && window.game) {
        try {
          await window.game.importAILearningData(file);
          showNotification('📥 Learning data imported successfully!', 'success');
          updateAILearningStats();
        } catch (error) {
          showNotification('❌ Failed to import learning data: ' + error.message, 'error');
        }
        fileInput.value = ''; // Reset file input
      }
    });
  }
  
  // Clear Data Button
  const clearButton = document.getElementById('clear-learning-button');
  if (clearButton) {
    clearButton.addEventListener('click', () => {
      if (confirm('Are you sure you want to clear all AI learning data? This cannot be undone.')) {
        if (window.game) {
          const success = window.game.clearAILearningData();
          if (success) {
            showNotification('🔄 Learning data cleared', 'info');
            updateAILearningStats();
          } else {
            showNotification('❌ Failed to clear learning data', 'error');
          }
        }
      }
    });
  }
}

function updateAILearningStats() {
  if (!window.game) return;
  
  const stats = window.game.getAILearningStats();
  if (!stats) {
    updateStatsDisplay({
      totalGames: 0,
      performance: { averageScore: 0, winRate: 0, bestGame: { finalScore: 0 } },
      patternsLearned: 0,
      recentImprovement: 0
    });
    return;
  }
  
  updateStatsDisplay(stats);
  updateInsightsContent(stats);
}

function updateStatsDisplay(stats) {
  // Update stats display elements
  const elements = {
    'ai-total-games': stats.totalGames || 0,
    'ai-avg-score': Math.round(stats.performance?.averageScore || 0).toLocaleString(),
    'ai-win-rate': ((stats.performance?.winRate || 0) * 100).toFixed(1) + '%',
    'ai-best-score': (stats.performance?.bestGame?.finalScore || 0).toLocaleString(),
    'ai-patterns-learned': stats.patternsLearned || 0,
    'ai-recent-improvement': ((stats.recentImprovement || 0) >= 0 ? '+' : '') + 
                             (stats.recentImprovement || 0).toFixed(1) + '%'
  };
  
  Object.entries(elements).forEach(([id, value]) => {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = value;
      
      // Add color coding for improvement
      if (id === 'ai-recent-improvement') {
        const improvement = stats.recentImprovement || 0;
        if (improvement > 5) {
          element.style.color = '#4CAF50';
        } else if (improvement < -5) {
          element.style.color = '#f44336';
        } else {
          element.style.color = '#ffcc00';
        }
      }
    }
  });
}

function updateInsightsContent(stats) {
  const insightsElement = document.getElementById('ai-insights-content');
  if (!insightsElement) return;
  
  let insights = [];
  
  if (stats.totalGames === 0) {
    insights.push('🎮 No games played yet. Start playing to begin learning!');
  } else {
    if (stats.totalGames < 10) {
      insights.push(`🌱 Learning in progress... Play ${10 - stats.totalGames} more games for better insights.`);
    }
    
    if (stats.recentImprovement > 10) {
      insights.push('📈 Great progress! Your AI is improving significantly.');
    } else if (stats.recentImprovement < -10) {
      insights.push('📉 Performance declining. Consider adjusting strategy or difficulty.');
    }
    
    if (stats.performance?.winRate > 0.3) {
      insights.push('🏆 Excellent win rate! Your AI has learned effective strategies.');
    }
    
    if (stats.patternsLearned > 100) {
      insights.push('🧠 Rich pattern knowledge accumulated - AI is making sophisticated decisions.');
    }
    
    const topStrategies = stats.topStrategies || [];
    if (topStrategies.length > 0) {
      const bestStrategy = topStrategies[0];
      insights.push(`🎯 Most successful strategy: ${bestStrategy.move} moves (${(bestStrategy.weight * 100).toFixed(0)}% effectiveness)`);
    }
    
    if (insights.length === 0) {
      insights.push('🤖 AI is learning steadily. Keep playing to unlock more insights!');
    }
  }
  
  insightsElement.innerHTML = insights.map(insight => `<p>${insight}</p>`).join('');
}

function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 10001;
    max-width: 300px;
    font-weight: 500;
    animation: slideInRight 0.3s ease;
  `;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOutRight 0.3s ease forwards';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Add notification animations
const notificationStyle = document.createElement('style');
notificationStyle.textContent = `
  @keyframes slideInRight {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  
  @keyframes slideOutRight {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
`;
document.head.appendChild(notificationStyle);

// Initialize the game when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeFancy2048);
} else {
  // DOM is already loaded
  initializeFancy2048();
}

// AI Debug Tools - Enhanced Version
window.aiDebugTools = {
  testAI: (moves = 5) => {
    if (window.game && window.game.getBestMove) {
      console.log('🧪 Testing AI for', moves, 'moves...');
      for (let i = 0; i < moves; i++) {
        try {
          const move = window.game.getBestMove();
          console.log(`Move ${i + 1}: ${move}`);
          if (move && window.game.canMove(move)) {
            window.game.move(move);
            // Wait for move to complete
            setTimeout(() => {}, 100);
          } else {
            console.log('Invalid move or no move available, stopping test');
            break;
          }
        } catch (error) {
          console.error('AI test failed at move', i + 1, ':', error);
          break;
        }
      }
    } else {
      console.error('Game or AI not available');
    }
  },
  
  testAutoplay: () => {
    if (window.game && window.game.toggleAutoPlay) {
      console.log('🧪 Testing autoplay...');
      window.game.toggleAutoPlay();
    } else {
      console.error('Autoplay not available');
    }
  },
  
  checkAI: () => {
    console.log('🔍 AI Status Check:');
    if (window.game) {
      console.log('- Game instance:', !!window.game);
      console.log('- Enhanced AI:', !!window.game.enhancedAI);
      console.log('- Advanced AI:', !!window.game.advancedAI);
      console.log('- getBestMove method:', typeof window.game.getBestMove);
      console.log('- AI Classes Available:');
      console.log('  * AdvancedAI2048Solver:', !!window.AdvancedAI2048Solver);
      console.log('  * Enhanced2048AI:', !!window.Enhanced2048AI);
      console.log('  * AILearningSystem:', !!window.AILearningSystem);
    } else {
      console.error('Game instance not available');
    }
  }
};
