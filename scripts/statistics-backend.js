document.addEventListener('DOMContentLoaded', () => {
  // Accessibility: focus main heading on load
  const mainHeading = document.querySelector('h1');
  if (mainHeading) mainHeading.setAttribute('tabindex', '0');

  // API base URL
  const apiBase = window.location.origin;

  // Utility: safely get element by ID
  function $(id) {
    const el = document.getElementById(id);
    if (!el) {
      console.warn(`Element #${id} not found.`);
    }
    return el;
  }

  // Load and display game statistics from backend
  async function loadAndDisplayStats() {
    try {
      const response = await fetch(`${apiBase}/api/get_stats`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }
      
      const data = await response.json();
      const stats = data.stats || [];
      
      // Remove duplicates
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
        
        // Sort stats by date, newest first
        uniqueStats.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        uniqueStats.forEach((stat) => {
          const row = document.createElement('tr');
          const date = new Date(stat.date);
          const formattedDate = formatDate(date);
          row.innerHTML = `
            <td>${formattedDate}</td>
            <td>${stat.bestTile}</td>
            <td>${stat.score}</td>
            <td>${stat.bestScore}</td>
            <td>${stat.time || '00:00'}</td>
            <td>${stat.moves}</td>
          `;
          statsTableBody.appendChild(row);
        });
      }
    } catch (error) {
      console.error('Error loading stats:', error);
      showError('Failed to load statistics');
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
    
    topScoreElement.textContent = topScore;
    bestTileElement.textContent = bestTile;
    gamesPlayedElement.textContent = stats.length;
    
    // Add animation to the stats cards
    document.querySelectorAll('.stats-card').forEach(card => {
      card.classList.add('animate-in');
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

  // Export stats to CSV using backend data
  async function exportStatsCSV() {
    try {
      const response = await fetch(`${apiBase}/api/get_stats`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }
      
      const data = await response.json();
      const stats = data.stats || [];
      const uniqueStats = Array.from(new Set(stats.map(stat => JSON.stringify(stat)))).map(stat => JSON.parse(stat));
      
      if (uniqueStats.length === 0) {
        alert('No statistics available to export.');
        return;
      }
      
      const csvContent = "data:text/csv;charset=utf-8," +
        "Date,Best Tile,Score,Best Score,Time,Moves\n" +
        uniqueStats.map(stat => {
          const date = new Date(stat.date);
          const formattedDate = formatDate(date);
          return `"${formattedDate}",${stat.bestTile},${stat.score},${stat.bestScore},"${stat.time || '00:00'}",${stat.moves}`;
        }).join("\n");
        
      downloadCSV(csvContent, "fancy2048_statistics.csv");
    } catch (error) {
      console.error('Error exporting stats:', error);
      showError('Failed to export statistics');
    }
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

  // Reset stats using backend API
  async function resetStats() {
    if (!confirm('Are you sure you want to reset all game statistics? This action cannot be undone.')) {
      return;
    }
    
    try {
      const response = await fetch(`${apiBase}/api/reset_stats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to reset stats');
      }
      
      // Reload the stats display
      loadAndDisplayStats();
    } catch (error) {
      console.error('Error resetting stats:', error);
      showError('Failed to reset statistics');
    }
  }

  // Show error message to user
  function showError(message) {
    alert(message); // Simple error display, could be improved with a toast/notification
  }

  // Set up event listeners safely
  function safeAddEventListener(id, event, handler) {
    const el = $(id);
    if (el) {
      el.addEventListener(event, handler);
      console.log(`Event listener added for #${id}`);
    } else {
      console.warn(`Could not add event listener for #${id} - element not found`);
    }
  }

  // DOMContentLoaded main logic
  loadAndDisplayStats();
  safeAddEventListener('save-csv-button', 'click', exportStatsCSV);
  safeAddEventListener('reset-data-button', 'click', resetStats);
});
