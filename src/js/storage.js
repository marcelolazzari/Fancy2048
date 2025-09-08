/**
 * Fancy2048 - Storage Manager
 * Handles all localStorage operations with fallbacks and error handling
 */

class StorageManager {
  constructor() {
    this.prefix = 'fancy2048_';
    this.isAvailable = this.checkAvailability();
    this.cache = new Map();
    
    // Initialize default settings
    this.defaultSettings = {
      theme: 'auto',
      boardSize: 4,
      aiDifficulty: 'medium',
      soundEnabled: true,
      animationsEnabled: true,
      highContrastMode: false,
      autoSave: true,
      showHints: true
    };
    
    this.initializeSettings();
  }

  /**
   * Check if localStorage is available
   */
  checkAvailability() {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      Utils.log('storage', 'localStorage not available, using memory fallback');
      return false;
    }
  }

  /**
   * Initialize settings with defaults
   */
  initializeSettings() {
    const currentSettings = this.get('settings', {});
    const mergedSettings = { ...this.defaultSettings, ...currentSettings };
    this.set('settings', mergedSettings);
  }

  /**
   * Generate storage key with prefix
   */
  getKey(key) {
    return `${this.prefix}${key}`;
  }

  /**
   * Get value from storage
   */
  get(key, defaultValue = null) {
    try {
      const storageKey = this.getKey(key);
      
      // Check cache first
      if (this.cache.has(storageKey)) {
        return this.cache.get(storageKey);
      }
      
      let value;
      
      if (this.isAvailable) {
        const stored = localStorage.getItem(storageKey);
        value = stored ? JSON.parse(stored) : defaultValue;
      } else {
        // Fallback to cache for non-localStorage environments
        value = this.cache.get(storageKey) || defaultValue;
      }
      
      // Update cache
      this.cache.set(storageKey, value);
      
      return value;
    } catch (error) {
      Utils.handleError(error, `Storage.get(${key})`);
      return defaultValue;
    }
  }

  /**
   * Set value in storage
   */
  set(key, value) {
    try {
      const storageKey = this.getKey(key);
      
      // Update cache
      this.cache.set(storageKey, value);
      
      if (this.isAvailable) {
        localStorage.setItem(storageKey, JSON.stringify(value));
      }
      
      return true;
    } catch (error) {
      Utils.handleError(error, `Storage.set(${key})`);
      return false;
    }
  }

  /**
   * Remove value from storage
   */
  remove(key) {
    try {
      const storageKey = this.getKey(key);
      
      // Remove from cache
      this.cache.delete(storageKey);
      
      if (this.isAvailable) {
        localStorage.removeItem(storageKey);
      }
      
      return true;
    } catch (error) {
      Utils.handleError(error, `Storage.remove(${key})`);
      return false;
    }
  }

  /**
   * Clear all storage data
   */
  clear() {
    try {
      if (this.isAvailable) {
        // Only remove keys with our prefix
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(this.prefix)) {
            keysToRemove.push(key);
          }
        }
        
        keysToRemove.forEach(key => localStorage.removeItem(key));
      }
      
      // Clear cache
      this.cache.clear();
      
      // Reinitialize settings
      this.initializeSettings();
      
      return true;
    } catch (error) {
      Utils.handleError(error, 'Storage.clear');
      return false;
    }
  }

  /**
   * Get all keys with prefix
   */
  getAllKeys() {
    const keys = [];
    
    if (this.isAvailable) {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.prefix)) {
          keys.push(key.substring(this.prefix.length));
        }
      }
    } else {
      // From cache
      for (const key of this.cache.keys()) {
        if (key.startsWith(this.prefix)) {
          keys.push(key.substring(this.prefix.length));
        }
      }
    }
    
    return keys;
  }

  /**
   * Get storage usage information
   */
  getStorageInfo() {
    let totalSize = 0;
    let itemCount = 0;
    
    if (this.isAvailable) {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.prefix)) {
          const value = localStorage.getItem(key);
          totalSize += key.length + (value ? value.length : 0);
          itemCount++;
        }
      }
    }
    
    return {
      itemCount,
      totalSize,
      formattedSize: this.formatBytes(totalSize),
      isAvailable: this.isAvailable
    };
  }

  /**
   * Format bytes to human readable format
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Game-specific methods
   */

  /**
   * Save game state
   */
  saveGameState(gameState) {
    return this.set('currentGame', {
      ...gameState,
      timestamp: Date.now()
    });
  }

  /**
   * Load game state
   */
  loadGameState() {
    return this.get('currentGame');
  }

  /**
   * Clear current game state
   */
  clearGameState() {
    return this.remove('currentGame');
  }

  /**
   * Save game result
   */
  saveGameResult(result) {
    const games = this.getGameHistory();
    games.unshift({
      ...result,
      id: Utils.generateId(),
      timestamp: Date.now()
    });
    
    // Keep only last 100 games
    if (games.length > 100) {
      games.splice(100);
    }
    
    this.set('gameHistory', games);
    this.updateStatistics(result);
  }

  /**
   * Get game history
   */
  getGameHistory() {
    return this.get('gameHistory', []);
  }

  /**
   * Update statistics
   */
  updateStatistics(result) {
    const stats = this.getStatistics();
    
    stats.totalGames++;
    stats.totalScore += result.score;
    
    if (result.won) {
      stats.gamesWon++;
    }
    
    if (result.score > stats.bestScore) {
      stats.bestScore = result.score;
    }
    
    if (result.highestTile > stats.highestTile) {
      stats.highestTile = result.highestTile;
    }
    
    stats.totalMoves += result.moves;
    stats.totalTime += result.duration;
    
    // Board size specific stats
    const sizeKey = `size${result.boardSize}`;
    if (!stats.boardSizes[sizeKey]) {
      stats.boardSizes[sizeKey] = {
        games: 0,
        wins: 0,
        bestScore: 0,
        totalScore: 0
      };
    }
    
    const sizeStats = stats.boardSizes[sizeKey];
    sizeStats.games++;
    sizeStats.totalScore += result.score;
    
    if (result.won) {
      sizeStats.wins++;
    }
    
    if (result.score > sizeStats.bestScore) {
      sizeStats.bestScore = result.score;
    }
    
    // AI game tracking
    if (result.isAI) {
      stats.aiGames++;
    }
    
    this.set('statistics', stats);
  }

  /**
   * Get statistics
   */
  getStatistics() {
    return this.get('statistics', {
      totalGames: 0,
      gamesWon: 0,
      bestScore: 0,
      totalScore: 0,
      highestTile: 0,
      totalMoves: 0,
      totalTime: 0,
      aiGames: 0,
      boardSizes: {},
      firstGameDate: Date.now()
    });
  }

  /**
   * Get settings
   */
  getSettings() {
    return this.get('settings', this.defaultSettings);
  }

  /**
   * Update settings
   */
  updateSetting(key, value) {
    const settings = this.getSettings();
    settings[key] = value;
    return this.set('settings', settings);
  }

  /**
   * Export all data as JSON
   */
  exportData() {
    const data = {
      version: '2.0.0',
      exportDate: new Date().toISOString(),
      gameHistory: this.getGameHistory(),
      statistics: this.getStatistics(),
      settings: this.getSettings(),
      currentGame: this.loadGameState()
    };
    
    return JSON.stringify(data, null, 2);
  }

  /**
   * Import data from JSON
   */
  importData(jsonData) {
    try {
      const data = JSON.parse(jsonData);
      
      if (data.gameHistory) {
        this.set('gameHistory', data.gameHistory);
      }
      
      if (data.statistics) {
        this.set('statistics', data.statistics);
      }
      
      if (data.settings) {
        // Merge with defaults to ensure all settings exist
        const mergedSettings = { ...this.defaultSettings, ...data.settings };
        this.set('settings', mergedSettings);
      }
      
      if (data.currentGame) {
        this.set('currentGame', data.currentGame);
      }
      
      return true;
    } catch (error) {
      Utils.handleError(error, 'Storage.importData');
      return false;
    }
  }

  /**
   * Reset all statistics but keep settings
   */
  resetStatistics() {
    this.remove('gameHistory');
    this.remove('statistics');
    this.clearGameState();
    return true;
  }
}

// Create global instance
const Storage = new StorageManager();

// Make Storage available globally
if (typeof window !== 'undefined') {
  window.Storage = Storage;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Storage;
}
