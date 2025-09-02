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
}

// Make available globally
window.AILearningSystem = AILearningSystem;
window.AILearningSystem = AILearningSystem;