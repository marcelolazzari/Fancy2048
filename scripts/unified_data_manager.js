/**
 * Unified Data Manager for Fancy2048
 * Centralizes all data operations: game stats, AI learning, leaderboard, and settings
 * Eliminates duplicated data handling across multiple files
 */

class UnifiedDataManager {
  constructor() {
    this.storageKeys = {
      gameStats: 'fancy2048_gameStats',
      leaderboard: 'fancy2048_leaderboard', 
      aiLearning: 'fancy2048_aiLearning',
      settings: 'fancy2048_settings',
      bestScore: 'fancy2048_bestScore',
      currentGame: 'fancy2048_currentGame'
    };
    
    this.cache = new Map();
    this.listeners = new Map();
    this.initialized = false;
    
    this.init();
  }

  /**
   * Initialize data manager with error handling
   */
  init() {
    try {
      this.migrateOldData();
      this.validateStorage();
      this.initialized = true;
      console.log('📊 Unified Data Manager initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Unified Data Manager:', error);
    }
  }

  /**
   * Migrate existing localStorage data to unified format
   */
  migrateOldData() {
    const migrations = [
      { old: 'gameStats', new: this.storageKeys.gameStats },
      { old: 'leaderboard', new: this.storageKeys.leaderboard },
      { old: 'aiLearningData', new: this.storageKeys.aiLearning },
      { old: 'bestScore', new: this.storageKeys.bestScore }
    ];

    migrations.forEach(({ old, new: newKey }) => {
      try {
        const oldData = localStorage.getItem(old);
        if (oldData && !localStorage.getItem(newKey)) {
          localStorage.setItem(newKey, oldData);
          console.log(`📦 Migrated ${old} → ${newKey}`);
        }
      } catch (error) {
        console.warn(`⚠️ Failed to migrate ${old}:`, error);
      }
    });
  }

  /**
   * Validate localStorage availability and integrity
   */
  validateStorage() {
    try {
      const testKey = 'fancy2048_test';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch (error) {
      console.error('❌ localStorage not available:', error);
      return false;
    }
  }

  // ===========================================
  // CORE DATA OPERATIONS
  // ===========================================

  /**
   * Get data with caching and error handling
   */
  getData(key, defaultValue = null) {
    try {
      // Check cache first
      if (this.cache.has(key)) {
        return this.cache.get(key);
      }

      // Get from localStorage
      const storageKey = this.storageKeys[key] || key;
      const rawData = localStorage.getItem(storageKey);
      
      if (!rawData) {
        this.cache.set(key, defaultValue);
        return defaultValue;
      }

      const parsedData = JSON.parse(rawData);
      this.cache.set(key, parsedData);
      return parsedData;
      
    } catch (error) {
      console.error(`❌ Failed to get data for ${key}:`, error);
      return defaultValue;
    }
  }

  /**
   * Set data with caching and validation
   */
  setData(key, value, notify = true) {
    try {
      const storageKey = this.storageKeys[key] || key;
      
      // Validate data before storing
      if (!this.validateData(key, value)) {
        throw new Error(`Invalid data for key: ${key}`);
      }

      // Store in localStorage
      localStorage.setItem(storageKey, JSON.stringify(value));
      
      // Update cache
      this.cache.set(key, value);
      
      // Notify listeners
      if (notify) {
        this.notifyListeners(key, value);
      }
      
      return true;
    } catch (error) {
      console.error(`❌ Failed to set data for ${key}:`, error);
      return false;
    }
  }

  /**
   * Remove data from both cache and storage
   */
  removeData(key) {
    try {
      const storageKey = this.storageKeys[key] || key;
      localStorage.removeItem(storageKey);
      this.cache.delete(key);
      this.notifyListeners(key, null);
      return true;
    } catch (error) {
      console.error(`❌ Failed to remove data for ${key}:`, error);
      return false;
    }
  }

  // ===========================================
  // GAME STATISTICS MANAGEMENT
  // ===========================================

  /**
   * Get all game statistics
   */
  getGameStats() {
    const stats = this.getData('gameStats', []);
    return Array.isArray(stats) ? stats : [];
  }

  /**
   * Add new game statistic
   */
  addGameStat(statData) {
    try {
      const stats = this.getGameStats();
      
      // Validate required fields
      const requiredFields = ['score', 'maxTile', 'moves', 'time', 'gridSize', 'mode'];
      const isValid = requiredFields.every(field => statData.hasOwnProperty(field));
      
      if (!isValid) {
        throw new Error('Missing required fields in game stat');
      }

      // Add timestamp and unique ID
      const newStat = {
        ...statData,
        id: Date.now() + Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toISOString(),
        date: new Date().toLocaleDateString()
      };

      stats.push(newStat);
      
      // Keep only last 1000 games for performance
      if (stats.length > 1000) {
        stats.splice(0, stats.length - 1000);
      }

      this.setData('gameStats', stats);
      this.updateLeaderboard(newStat);
      
      return newStat;
    } catch (error) {
      console.error('❌ Failed to add game stat:', error);
      return null;
    }
  }

  /**
   * Clear all game statistics
   */
  clearGameStats() {
    this.setData('gameStats', []);
    this.setData('leaderboard', []);
  }

  // ===========================================
  // LEADERBOARD MANAGEMENT
  // ===========================================

  /**
   * Get leaderboard data
   */
  getLeaderboard(limit = 50) {
    const leaderboard = this.getData('leaderboard', []);
    return leaderboard.slice(0, limit);
  }

  /**
   * Update leaderboard with new game result
   */
  updateLeaderboard(gameResult) {
    try {
      const leaderboard = this.getLeaderboard();
      
      // Check if this score qualifies for leaderboard
      if (leaderboard.length < 50 || gameResult.score > leaderboard[leaderboard.length - 1]?.score) {
        leaderboard.push({
          score: gameResult.score,
          maxTile: gameResult.maxTile,
          moves: gameResult.moves,
          time: gameResult.time,
          gridSize: gameResult.gridSize,
          mode: gameResult.mode,
          date: gameResult.date,
          timestamp: gameResult.timestamp
        });

        // Sort by score (descending)
        leaderboard.sort((a, b) => b.score - a.score);
        
        // Keep only top 50
        leaderboard.splice(50);
        
        this.setData('leaderboard', leaderboard);
      }
    } catch (error) {
      console.error('❌ Failed to update leaderboard:', error);
    }
  }

  // ===========================================
  // AI LEARNING MANAGEMENT
  // ===========================================

  /**
   * Get AI learning data
   */
  getAILearningData() {
    return this.getData('aiLearning', {
      gamesPlayed: 0,
      totalScore: 0,
      patterns: {},
      strategies: {},
      moveHistory: [],
      performance: {
        averageScore: 0,
        bestScore: 0,
        winRate: 0
      }
    });
  }

  /**
   * Update AI learning data
   */
  updateAILearning(learningData) {
    const current = this.getAILearningData();
    const updated = { ...current, ...learningData };
    this.setData('aiLearning', updated);
  }

  /**
   * Add AI move to learning history
   */
  addAIMove(boardState, move, result) {
    try {
      const aiData = this.getAILearningData();
      
      const moveData = {
        boardState: this.encodeBoardState(boardState),
        move,
        result,
        timestamp: Date.now()
      };

      aiData.moveHistory.push(moveData);
      
      // Keep only last 10000 moves for performance
      if (aiData.moveHistory.length > 10000) {
        aiData.moveHistory.splice(0, aiData.moveHistory.length - 10000);
      }

      this.setData('aiLearning', aiData);
    } catch (error) {
      console.error('❌ Failed to add AI move:', error);
    }
  }

  // ===========================================
  // SETTINGS MANAGEMENT
  // ===========================================

  /**
   * Get user settings
   */
  getSettings() {
    return this.getData('settings', {
      theme: 'dark',
      soundEnabled: false, // Sound disabled by default
      vibrationEnabled: true,
      animationsEnabled: true,
      gridSize: 4,
      aiDifficulty: 'normal',
      autoSave: true,
      showHints: true
    });
  }

  /**
   * Update settings
   */
  updateSettings(newSettings) {
    const current = this.getSettings();
    const updated = { ...current, ...newSettings };
    this.setData('settings', updated);
  }

  // ===========================================
  // CURRENT GAME STATE MANAGEMENT
  // ===========================================

  /**
   * Save current game state
   */
  saveGameState(gameState) {
    try {
      const stateData = {
        board: gameState.board,
        score: gameState.score,
        bestScore: gameState.bestScore,
        moves: gameState.moves,
        time: gameState.time || 0,
        gameMode: gameState.gameMode || 'human',
        gridSize: gameState.gridSize || 4,
        timestamp: Date.now()
      };

      this.setData('currentGame', stateData);
      return true;
    } catch (error) {
      console.error('❌ Failed to save game state:', error);
      return false;
    }
  }

  /**
   * Load current game state
   */
  loadGameState() {
    const state = this.getData('currentGame');
    
    // Validate state age (don't load games older than 7 days)
    if (state && state.timestamp) {
      const age = Date.now() - state.timestamp;
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
      
      if (age > maxAge) {
        this.removeData('currentGame');
        return null;
      }
    }
    
    return state;
  }

  /**
   * Clear saved game state
   */
  clearGameState() {
    this.removeData('currentGame');
  }

  // ===========================================
  // UTILITY METHODS
  // ===========================================

  /**
   * Validate data before storing
   */
  validateData(key, value) {
    try {
      // Basic validation
      if (value === undefined) return false;
      
      // Specific validations
      switch (key) {
        case 'gameStats':
          return Array.isArray(value);
        case 'leaderboard':
          return Array.isArray(value);
        case 'settings':
          return typeof value === 'object' && value !== null;
        default:
          return true;
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * Encode board state for efficient storage
   */
  encodeBoardState(board) {
    try {
      return board.map(row => row.join(',')).join(';');
    } catch (error) {
      return '';
    }
  }

  /**
   * Subscribe to data changes
   */
  subscribe(key, callback) {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key).add(callback);
    
    return () => {
      const listeners = this.listeners.get(key);
      if (listeners) {
        listeners.delete(callback);
      }
    };
  }

  /**
   * Notify all listeners of data changes
   */
  notifyListeners(key, value) {
    const listeners = this.listeners.get(key);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(value, key);
        } catch (error) {
          console.error(`❌ Error in listener for ${key}:`, error);
        }
      });
    }
  }

  /**
   * Export all data for backup
   */
  exportAllData() {
    try {
      const data = {};
      Object.keys(this.storageKeys).forEach(key => {
        data[key] = this.getData(key);
      });
      
      return {
        version: '1.0',
        exportDate: new Date().toISOString(),
        data
      };
    } catch (error) {
      console.error('❌ Failed to export data:', error);
      return null;
    }
  }

  /**
   * Import data from backup
   */
  importAllData(importData) {
    try {
      if (!importData || !importData.data) {
        throw new Error('Invalid import data');
      }

      Object.keys(importData.data).forEach(key => {
        if (this.storageKeys.hasOwnProperty(key)) {
          this.setData(key, importData.data[key], false);
        }
      });

      console.log('✅ Data import completed successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to import data:', error);
      return false;
    }
  }

  /**
   * Get storage usage information
   */
  getStorageInfo() {
    try {
      let totalSize = 0;
      const info = {};

      Object.entries(this.storageKeys).forEach(([key, storageKey]) => {
        const data = localStorage.getItem(storageKey);
        const size = data ? data.length : 0;
        totalSize += size;
        info[key] = {
          size: size,
          sizeFormatted: this.formatBytes(size),
          exists: !!data
        };
      });

      return {
        total: {
          size: totalSize,
          sizeFormatted: this.formatBytes(totalSize)
        },
        breakdown: info,
        available: this.isStorageAvailable()
      };
    } catch (error) {
      console.error('❌ Failed to get storage info:', error);
      return null;
    }
  }

  /**
   * Format bytes to human readable format
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Check if localStorage is available
   */
  isStorageAvailable() {
    return this.validateStorage();
  }
}

// Create global instance
const unifiedDataManager = new UnifiedDataManager();

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = UnifiedDataManager;
}

// Make available globally
window.UnifiedDataManager = UnifiedDataManager;
window.unifiedDataManager = unifiedDataManager;

console.log('📊 Unified Data Manager loaded successfully');
