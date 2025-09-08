/**
 * Fancy2048 - Statistics Page
 * Displays comprehensive game statistics and analytics
 */

class StatsPage {
  constructor() {
    this.isLoading = false;
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initialize());
    } else {
      this.initialize();
    }
  }

  /**
   * Initialize the statistics page
   */
  initialize() {
    this.setupEventListeners();
    this.loadStatistics();
    
    Utils.log('stats', 'Statistics page initialized');
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Export stats button
    const exportButton = document.getElementById('export-stats');
    if (exportButton) {
      exportButton.addEventListener('click', () => this.exportStatistics());
    }
    
    // Clear stats button
    const clearButton = document.getElementById('clear-stats');
    if (clearButton) {
      clearButton.addEventListener('click', () => this.clearStatistics());
    }
  }

  /**
   * Load and display statistics
   */
  loadStatistics() {
    if (this.isLoading) return;
    
    this.isLoading = true;
    
    try {
      const stats = Storage.getStatistics();
      const gameHistory = Storage.getGameHistory();
      
      this.displayOverviewStats(stats);
      this.displayPerformanceStats(stats, gameHistory);
      this.displayRecentGames(gameHistory.slice(0, 10));
      this.displayBoardSizeStats(stats.boardSizes);
      
      Utils.log('stats', 'Statistics loaded successfully');
    } catch (error) {
      Utils.handleError(error, 'loadStatistics');
      this.showError('Failed to load statistics');
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Display overview statistics
   */
  displayOverviewStats(stats) {
    const elements = {
      totalGames: document.getElementById('total-games'),
      gamesWon: document.getElementById('games-won'),
      bestScore: document.getElementById('best-score'),
      winRate: document.getElementById('win-rate')
    };

    if (elements.totalGames) {
      elements.totalGames.textContent = Utils.formatNumber(stats.totalGames || 0);
    }

    if (elements.gamesWon) {
      elements.gamesWon.textContent = Utils.formatNumber(stats.gamesWon || 0);
    }

    if (elements.bestScore) {
      elements.bestScore.textContent = Utils.formatNumber(stats.bestScore || 0);
    }

    if (elements.winRate) {
      const winRate = stats.totalGames > 0 
        ? Utils.percentage(stats.gamesWon || 0, stats.totalGames)
        : 0;
      elements.winRate.textContent = `${winRate}%`;
    }
  }

  /**
   * Display performance statistics
   */
  displayPerformanceStats(stats, gameHistory) {
    const elements = {
      avgScore: document.getElementById('avg-score'),
      avgMoves: document.getElementById('avg-moves'),
      bestTime: document.getElementById('best-time'),
      highestTile: document.getElementById('highest-tile'),
      totalTime: document.getElementById('total-time'),
      aiGames: document.getElementById('ai-games')
    };

    // Calculate averages
    const avgScore = stats.totalGames > 0 
      ? Math.round(stats.totalScore / stats.totalGames)
      : 0;

    const avgMoves = stats.totalGames > 0 
      ? Math.round(stats.totalMoves / stats.totalGames)
      : 0;

    // Find best time from game history
    const completedGames = gameHistory.filter(game => game.duration);
    const bestTime = completedGames.length > 0
      ? Math.min(...completedGames.map(game => game.duration))
      : 0;

    if (elements.avgScore) {
      elements.avgScore.textContent = Utils.formatNumber(avgScore);
    }

    if (elements.avgMoves) {
      elements.avgMoves.textContent = avgMoves.toString();
    }

    if (elements.bestTime) {
      elements.bestTime.textContent = Utils.formatTime(bestTime);
    }

    if (elements.highestTile) {
      elements.highestTile.textContent = Utils.formatNumber(stats.highestTile || 0);
    }

    if (elements.totalTime) {
      elements.totalTime.textContent = Utils.formatTime(stats.totalTime / 1000 || 0);
    }

    if (elements.aiGames) {
      elements.aiGames.textContent = Utils.formatNumber(stats.aiGames || 0);
    }
  }

  /**
   * Display recent games
   */
  displayRecentGames(recentGames) {
    const container = document.getElementById('recent-games-list');
    if (!container) return;

    container.innerHTML = '';

    if (recentGames.length === 0) {
      this.showEmptyState(container, '🎮', 'No games played yet', 'Start playing to see your game history here');
      return;
    }

    recentGames.forEach(game => {
      const gameItem = this.createGameItem(game);
      container.appendChild(gameItem);
    });
  }

  /**
   * Create game item element
   */
  createGameItem(game) {
    const item = document.createElement('div');
    item.className = 'game-item';
    
    const status = game.won ? 'win' : 'lose';
    const statusIcon = game.won ? '🏆' : '❌';
    
    item.innerHTML = `
      <div class="game-info-left">
        <div class="game-status ${status}" title="${game.won ? 'Won' : 'Lost'}"></div>
        <div class="game-details">
          <div class="game-score">${Utils.formatNumber(game.score)}</div>
          <div class="game-meta">
            ${game.moves || 0} moves • ${game.boardSize || 4}×${game.boardSize || 4}
            ${game.duration ? ` • ${Utils.formatTime(game.duration)}` : ''}
            ${game.isAI ? ' • AI' : ''}
          </div>
        </div>
      </div>
      <div class="game-date">
        ${Utils.formatDate(game.timestamp || Date.now())}
      </div>
    `;

    return item;
  }

  /**
   * Display board size statistics
   */
  displayBoardSizeStats(boardSizes) {
    const container = document.getElementById('board-size-stats');
    if (!container) return;

    container.innerHTML = '';

    const sizes = Object.keys(boardSizes).sort((a, b) => {
      const sizeA = parseInt(a.replace('size', ''));
      const sizeB = parseInt(b.replace('size', ''));
      return sizeA - sizeB;
    });

    if (sizes.length === 0) {
      this.showEmptyState(container, '📊', 'No size statistics yet', 'Play games on different board sizes to see statistics');
      return;
    }

    sizes.forEach(sizeKey => {
      const sizeNum = sizeKey.replace('size', '');
      const stats = boardSizes[sizeKey];
      
      if (stats.games > 0) {
        const sizeItem = this.createBoardSizeItem(sizeNum, stats);
        container.appendChild(sizeItem);
      }
    });
  }

  /**
   * Create board size statistics item
   */
  createBoardSizeItem(size, stats) {
    const item = document.createElement('div');
    item.className = 'board-size-item';
    
    const winRate = Utils.percentage(stats.wins || 0, stats.games);
    const avgScore = stats.games > 0 ? Math.round(stats.totalScore / stats.games) : 0;
    
    item.innerHTML = `
      <div class="board-size-label">${size}×${size}</div>
      <div class="board-size-stats">
        <div class="board-stat">
          <span class="board-stat-label">Games:</span>
          <span class="board-stat-value">${stats.games}</span>
        </div>
        <div class="board-stat">
          <span class="board-stat-label">Wins:</span>
          <span class="board-stat-value">${stats.wins || 0}</span>
        </div>
        <div class="board-stat">
          <span class="board-stat-label">Win Rate:</span>
          <span class="board-stat-value">${winRate}%</span>
        </div>
        <div class="board-stat">
          <span class="board-stat-label">Best:</span>
          <span class="board-stat-value">${Utils.formatNumber(stats.bestScore || 0)}</span>
        </div>
        <div class="board-stat">
          <span class="board-stat-label">Avg:</span>
          <span class="board-stat-value">${Utils.formatNumber(avgScore)}</span>
        </div>
      </div>
    `;

    return item;
  }

  /**
   * Show empty state
   */
  showEmptyState(container, icon, title, subtitle) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">${icon}</div>
        <div class="empty-state-text">${title}</div>
        <div class="empty-state-subtext">${subtitle}</div>
      </div>
    `;
  }

  /**
   * Export statistics as JSON
   */
  async exportStatistics() {
    try {
      const data = Storage.exportData();
      const blob = new Blob([data], { type: 'application/json' });
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `fancy2048-stats-${new Date().toISOString().split('T')[0]}.json`;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      URL.revokeObjectURL(url);
      
      this.showNotification('Statistics exported successfully!', 'success');
      
      Utils.log('stats', 'Statistics exported');
    } catch (error) {
      Utils.handleError(error, 'exportStatistics');
      this.showNotification('Failed to export statistics', 'error');
    }
  }

  /**
   * Clear all statistics with confirmation
   */
  clearStatistics() {
    const confirmed = confirm(
      'Are you sure you want to clear all statistics? This action cannot be undone.'
    );
    
    if (!confirmed) return;
    
    const doubleConfirmed = confirm(
      'This will permanently delete all your game history and statistics. Are you absolutely sure?'
    );
    
    if (!doubleConfirmed) return;
    
    try {
      Storage.resetStatistics();
      this.loadStatistics(); // Reload the display
      this.showNotification('All statistics cleared', 'success');
      
      Utils.log('stats', 'Statistics cleared');
    } catch (error) {
      Utils.handleError(error, 'clearStatistics');
      this.showNotification('Failed to clear statistics', 'error');
    }
  }

  /**
   * Show notification
   */
  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: var(--surface-color);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 12px 16px;
      box-shadow: 0 4px 8px var(--shadow-color);
      z-index: 1000;
      animation: slideIn 0.3s ease;
    `;
    
    // Color based on type
    const colors = {
      success: '#4caf50',
      error: '#f44336',
      warning: '#ff9800',
      info: '#2196f3'
    };
    
    if (colors[type]) {
      notification.style.borderLeftColor = colors[type];
      notification.style.borderLeftWidth = '4px';
    }
    
    document.body.appendChild(notification);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 300);
      }
    }, 3000);
  }

  /**
   * Show error message
   */
  showError(message) {
    this.showNotification(message, 'error');
  }

  /**
   * Refresh statistics display
   */
  refresh() {
    this.loadStatistics();
  }
}

// Initialize statistics page
const statsPage = new StatsPage();

// Make available globally
if (typeof window !== 'undefined') {
  window.StatsPage = StatsPage;
  window.statsPage = statsPage;
}
