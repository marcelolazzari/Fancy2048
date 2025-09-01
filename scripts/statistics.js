document.addEventListener('DOMContentLoaded', () => {
  // Initialize unified data manager if not already available
  if (!window.dataManager) {
    window.dataManager = new UnifiedDataManager();
  }
  const dataManager = window.dataManager;
  
  // Accessibility: focus main heading on load
  const mainHeading = document.querySelector('h1');
  if (mainHeading) mainHeading.setAttribute('tabindex', '0');

  // Utility: safely get element by ID
  function $(id) {
    const el = document.getElementById(id);
    if (!el) {
      console.warn(`Element #${id} not found.`);
    }
    return el;
  }

  // Load and display game statistics
  function loadAndDisplayStats() {
    let stats = [];
    try {
      stats = dataManager.getData('gameStats', []);
    } catch (e) {
      console.error('Error reading gameStats from data manager:', e);
      stats = [];
    }
    const uniqueStats = Array.from(new Set(stats.map(stat => JSON.stringify(stat)))).map(stat => JSON.parse(stat));
    const statsTable = $('statsTable');
    if (!statsTable) return;
    const statsTableBody = statsTable.querySelector('tbody');
    const noStatsMessage = $('no-stats-message');
    if (!statsTableBody || !noStatsMessage) return;
    // Clear the table first
    statsTableBody.innerHTML = '';
    // Update summary statistics
    updateStatsSummary(uniqueStats);
    if (uniqueStats.length === 0) {
      // Show message if no stats available
      statsTable.style.display = 'none';
      noStatsMessage.style.display = 'flex';
    } else {
      // Show table and populate with stats
      statsTable.style.display = 'table';
      noStatsMessage.style.display = 'none';
      // Sort stats by grid size first, then by date (newest first)
      uniqueStats.sort((a, b) => {
        // First sort by grid size (larger grids first)
        const gridA = a.gridSize || 4; // Default to 4 for older entries
        const gridB = b.gridSize || 4;
        if (gridA !== gridB) {
          return gridB - gridA;
        }
        // Then sort by date within same grid size
        return new Date(b.date) - new Date(a.date);
      });
      
      uniqueStats.forEach((stat) => {
        const row = document.createElement('tr');
        const date = new Date(stat.date);
        const formattedDate = formatDate(date);
        const gridType = stat.gridType || `${stat.gridSize || 4}x${stat.gridSize || 4}`;
        const gridSize = stat.gridSize || 4;
        
        // Add grid-specific class for styling
        row.classList.add(`grid-${gridSize}`);
        
        // Determine play mode - use new playMode field if available, fallback to old logic
        let playMode, modeIcon;
        if (stat.playMode) {
          // New comprehensive play mode
          playMode = stat.playMode;
          if (playMode === 'AI + Human') {
            modeIcon = '🤖👤';
          } else if (playMode === 'AI') {
            modeIcon = '🤖';
          } else {
            modeIcon = '👤';
          }
        } else {
          // Fallback to old logic for backwards compatibility
          playMode = stat.isAutoPlayed ? 'AI' : 'Human';
          modeIcon = stat.isAutoPlayed ? '🤖' : '👤';
        }
        
        // Determine CSS class for mode badge
        let modeClass;
        if (playMode === 'AI + Human') {
          modeClass = 'mixed-mode';
        } else if (playMode === 'AI') {
          modeClass = 'ai-mode';
        } else {
          modeClass = 'human-mode';
        }
        
        row.innerHTML = `
          <td>${formattedDate}</td>
          <td><span class="grid-badge">${gridType}</span></td>
          <td>${stat.bestTile}</td>
          <td>${stat.score}</td>
          <td>${stat.bestScore}</td>
          <td>${stat.time}</td>
          <td>${stat.moves}</td>
          <td><span class="mode-badge ${modeClass}" title="${playMode} player">${modeIcon} ${playMode}</span></td>
        `;
        // Highlight rows with high scores
        if (stat.score === findMaxScore(uniqueStats)) {
          row.classList.add('highlight-row');
        }
        // Add grid size class for styling
        row.classList.add(`grid-${stat.gridSize || 4}`);
        statsTableBody.appendChild(row);
      });
    }
  }

  // Helper function to update the statistics summary cards
  function updateStatsSummary(stats) {
    const topScoreElement = $('top-score');
    const bestTileElement = $('best-tile');
    const gamesPlayedElement = $('games-played');
    if (!topScoreElement || !bestTileElement || !gamesPlayedElement) return;
    if (stats.length === 0) {
      topScoreElement.textContent = '0';
      bestTileElement.textContent = '0';
      gamesPlayedElement.textContent = '0';
      return;
    }
    const topScore = findMaxScore(stats);
    const bestTile = Math.max(...stats.map(stat => parseInt(stat.bestTile) || 0));
    const totalGames = stats.length;
    
    // Group games by grid size for additional insight
    const gamesByGrid = stats.reduce((acc, stat) => {
      const gridSize = stat.gridSize || 4;
      acc[gridSize] = (acc[gridSize] || 0) + 1;
      return acc;
    }, {});
    
    const gridBreakdown = Object.entries(gamesByGrid)
      .map(([size, count]) => `${size}x${size}: ${count}`)
      .join(', ');
    
    topScoreElement.textContent = topScore;
    bestTileElement.textContent = bestTile;
    gamesPlayedElement.textContent = totalGames;
    
    // Add grid breakdown as a tooltip or additional info
    gamesPlayedElement.setAttribute('title', `Games by grid size: ${gridBreakdown}`);
    
    // Add animation to the stats cards
    document.querySelectorAll('.stats-card').forEach(card => {
      card.classList.add('animate-in');
      card.setAttribute('aria-live', 'polite');
    });
  }

  // Helper function to find the maximum score
  function findMaxScore(stats) {
    return Math.max(...stats.map(stat => parseInt(stat.score) || 0));
  }

  // Format date helper
  function formatDate(date) {
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear().toString().slice(-2)} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  }

  // Export stats to CSV
  function exportStatsCSV() {
    let stats = [];
    try {
      stats = dataManager.getData('gameStats', []);
    } catch (e) {
      alert('No game statistics to export!');
      return;
    }
    const uniqueStats = Array.from(new Set(stats.map(stat => JSON.stringify(stat)))).map(stat => JSON.parse(stat));
    if (uniqueStats.length === 0) {
      alert('No game statistics to export!');
      return;
    }
    const csvContent = "data:text/csv;charset=utf-8," +
      "Date,Grid Size,Best Tile,Score,Best Score,Time,Moves,Mode\n" +
      uniqueStats.map(stat => {
        const date = new Date(stat.date);
        const formattedDate = formatDate(date);
        const gridType = stat.gridType || `${stat.gridSize || 4}x${stat.gridSize || 4}`;
        // Use new playMode field if available, fallback to old logic
        const playMode = stat.playMode || (stat.isAutoPlayed ? 'AI' : 'Human');
        return `"${formattedDate}","${gridType}",${stat.bestTile},${stat.score},${stat.bestScore},"${stat.time}",${stat.moves},"${playMode}"`;
      }).join("\n");
    downloadCSV(csvContent, "fancy2048_statistics.csv");
  }

  // Export stats to JSON
  function exportStatsJSON() {
    let stats = [];
    try {
      stats = dataManager.getData('gameStats', []);
    } catch (e) {
      alert('No game statistics to export!');
      return;
    }
    const uniqueStats = Array.from(new Set(stats.map(stat => JSON.stringify(stat)))).map(stat => JSON.parse(stat));
    if (uniqueStats.length === 0) {
      alert('No game statistics to export!');
      return;
    }

    // Create enhanced JSON structure with metadata
    const exportData = {
      exportInfo: {
        exportedAt: new Date().toISOString(),
        gameVersion: "Fancy2048",
        totalGames: uniqueStats.length,
        dataVersion: "1.0"
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

    const jsonContent = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const filename = `fancy2048_statistics_${new Date().toISOString().split('T')[0]}.json`;
    downloadFile(jsonContent, filename);
  }

  // Helper function for CSV download
  function downloadCSV(csvContent, filename) {
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Helper function for file download (JSON, CSV, etc.)
  function downloadFile(dataUri, filename) {
    const link = document.createElement("a");
    link.setAttribute("href", dataUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Set up event listeners safely
  function safeAddEventListener(id, event, handler) {
    const el = $(id);
    if (el) {
      el.addEventListener(event, handler);
      el.setAttribute('tabindex', '0');
    }
  }

    // DOMContentLoaded main logic
  loadAndDisplayStats();
  safeAddEventListener('save-csv-button', 'click', exportStatsCSV);
  safeAddEventListener('save-json-button', 'click', exportStatsJSON);
  safeAddEventListener('reset-data-button', 'click', () => {
    if (confirm('Are you sure you want to reset all game statistics? This action cannot be undone.')) {
      dataManager.removeData('gameStats');
      loadAndDisplayStats();
    }
  });
});
