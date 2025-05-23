document.addEventListener('DOMContentLoaded', () => {
  // Load and display game statistics
  loadAndDisplayStats();
  
  // Set up event listeners
  document.getElementById('save-csv-button').addEventListener('click', exportStatsCSV);
  
  document.getElementById('reset-data-button').addEventListener('click', () => {
    if (confirm('Are you sure you want to reset all game statistics? This action cannot be undone.')) {
      localStorage.removeItem('gameStats');
      localStorage.removeItem('bestScore');
      loadAndDisplayStats();
    }
  });
  
  // Main function to load and display all stats
  function loadAndDisplayStats() {
    const stats = JSON.parse(localStorage.getItem('gameStats')) || [];
    const uniqueStats = Array.from(new Set(stats.map(stat => JSON.stringify(stat)))).map(stat => JSON.parse(stat));
    const statsTable = document.getElementById('statsTable');
    const statsTableBody = statsTable.querySelector('tbody');
    const noStatsMessage = document.getElementById('no-stats-message');
    
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
          <td>${stat.time}</td>
          <td>${stat.moves}</td>
        `;
        
        // Highlight rows with high scores
        if (stat.score === findMaxScore(uniqueStats)) {
          row.classList.add('highlight-row');
        }
        
        statsTableBody.appendChild(row);
      });
    }
  }
  
  // Helper function to update the statistics summary cards
  function updateStatsSummary(stats) {
    const topScoreElement = document.getElementById('top-score');
    const bestTileElement = document.getElementById('best-tile');
    const gamesPlayedElement = document.getElementById('games-played');
    
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
  
  // Export stats to CSV
  function exportStatsCSV() {
    const stats = JSON.parse(localStorage.getItem('gameStats')) || [];
    const uniqueStats = Array.from(new Set(stats.map(stat => JSON.stringify(stat)))).map(stat => JSON.parse(stat));
    
    if (uniqueStats.length === 0) {
      alert('No game statistics to export!');
      return;
    }
    
    const csvContent = "data:text/csv;charset=utf-8,"
      + "Date,Best Tile,Score,Best Score,Time,Moves\n"
      + uniqueStats.map(stat => {
        const date = new Date(stat.date);
        const formattedDate = formatDate(date);
        return `"${formattedDate}",${stat.bestTile},${stat.score},${stat.bestScore},"${stat.time}",${stat.moves}`;
      }).join("\n");
      
    downloadCSV(csvContent, "fancy2048_statistics.csv");
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
