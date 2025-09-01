document.addEventListener('DOMContentLoaded', () => {
  // Initialize unified data manager
  const dataManager = new UnifiedDataManager();
  window.dataManager = dataManager;
  
  // Tab switching functionality
  const tabs = document.querySelectorAll('.tab');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = tab.getAttribute('data-tab');
      
      // Update active tab
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      // Show corresponding content
      tabContents.forEach(content => {
        content.classList.remove('active');
        if (content.id === `${targetTab}-tab`) {
          content.classList.add('active');
        }
      });
    });
  });

  // Leaderboard functionality
  loadLeaderboard();
  
  document.getElementById('clear-leaderboard').addEventListener('click', () => {
    if (confirm('Are you sure you want to clear the leaderboard? This action cannot be undone.')) {
      dataManager.removeData('leaderboard');
      loadLeaderboard();
    }
  });
  
  document.getElementById('save-leaderboard-csv').addEventListener('click', exportLeaderboardCSV);
  
  // Stats functionality
  loadStats();
  
  document.getElementById('save-csv-button').addEventListener('click', exportStatsCSV);
  
  document.getElementById('clear-stats-button').addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all statistics? This action cannot be undone.')) {
      dataManager.removeData('gameStats');
      loadStats();
    }
  });
    if (confirm('Are you sure you want to reset all game statistics? This action cannot be undone.')) {
      localStorage.removeItem('gameStats');
      loadStats();
    }
  });
  
  // Loading functions
  function loadLeaderboard() {
    const leaderboard = dataManager.getData('leaderboard', []);
    const leaderboardTable = document.getElementById('leaderboardTable').querySelector('tbody');
    
    // Clear the table first
    leaderboardTable.innerHTML = '';
    
    // Add entries to the leaderboard
    if (leaderboard.length > 0) {
      leaderboard.forEach((entry, index) => {
        const row = document.createElement('tr');
        
        // Format date if it exists
        let formattedDate = 'N/A';
        if (entry.date) {
          const date = new Date(entry.date);
          formattedDate = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear().toString().slice(-2)} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
        }
        
        row.innerHTML = `
          <td>${index + 1}</td>
          <td>${entry.name || 'Player'}</td>
          <td>${entry.score}</td>
          <td>${entry.bestTile || 'N/A'}</td>
          <td>${formattedDate}</td>
          <td>${entry.moves || 'N/A'}</td>
        `;
        leaderboardTable.appendChild(row);
      });
    } else {
      const row = document.createElement('tr');
      row.innerHTML = '<td colspan="6">No scores yet. Play a game to be the first!</td>';
      leaderboardTable.appendChild(row);
    }
  }
  
  function loadStats() {
    const stats = dataManager.getData('gameStats', []);
    const uniqueStats = Array.from(new Set(stats.map(stat => JSON.stringify(stat)))).map(stat => JSON.parse(stat));
    const statsTableBody = document.getElementById('statsTable').querySelector('tbody');
    
    // Clear the table first
    statsTableBody.innerHTML = '';
    
    if (uniqueStats.length === 0) {
      // Add a message if no stats are available
      const row = document.createElement('tr');
      row.innerHTML = `<td colspan="6">No game statistics available yet. Play a game to see your stats here!</td>`;
      statsTableBody.appendChild(row);
    } else {
      uniqueStats.forEach((stat) => {
        const row = document.createElement('tr');
        const date = new Date(stat.date);
        const formattedDate = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear().toString().slice(-2)} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
        row.innerHTML = `
          <td>${formattedDate}</td>
          <td>${stat.bestTile}</td>
          <td>${stat.score}</td>
          <td>${stat.bestScore}</td>
          <td>${stat.time}</td>
          <td>${stat.moves}</td>
        `;
        statsTableBody.appendChild(row);
      });
    }
  }
  
  // Export functions
  function exportLeaderboardCSV() {
    const leaderboard = dataManager.getData('leaderboard', []);
    if (leaderboard.length === 0) {
      alert('No leaderboard entries to export!');
      return;
    }
    
    const csvContent = "data:text/csv;charset=utf-8,"
      + "Rank,Player,Score,Best Tile,Date,Moves\n"
      + leaderboard.map((entry, index) => {
        const date = entry.date ? new Date(entry.date) : new Date();
        const formattedDate = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear().toString().slice(-2)} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
        return `${index + 1},"${entry.name || 'Player'}",${entry.score},${entry.bestTile || 'N/A'},"${formattedDate}",${entry.moves || 'N/A'}`;
      }).join("\n");
      
    downloadCSV(csvContent, "fancy2048_leaderboard.csv");
  }
  
  function exportStatsCSV() {
    const stats = dataManager.getData('gameStats', []);
    const uniqueStats = Array.from(new Set(stats.map(stat => JSON.stringify(stat)))).map(stat => JSON.parse(stat));
    
    if (uniqueStats.length === 0) {
      alert('No game statistics to export!');
      return;
    }
    
    const csvContent = "data:text/csv;charset=utf-8,"
      + "Session,Best Tile,Score,Best Score,Time,Moves\n"
      + uniqueStats.map(stat => {
        const date = new Date(stat.date);
        const formattedDate = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear().toString().slice(-2)} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
        return `${formattedDate},${stat.bestTile},${stat.score},${stat.bestScore},${stat.time},${stat.moves}`;
      }).join("\n");
      
    downloadCSV(csvContent, "game_stats.csv");
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
});
