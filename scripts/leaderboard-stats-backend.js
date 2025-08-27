document.addEventListener('DOMContentLoaded', () => {
  // API base URL
  const apiBase = window.location.origin;

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
        if (content.id === `${targetTab}-content`) {
          content.style.display = 'block';
        } else {
          content.style.display = 'none';
        }
      });
    });
  });

  // Leaderboard functionality
  loadLeaderboard();
  
  document.getElementById('clear-leaderboard').addEventListener('click', async () => {
    if (confirm('Are you sure you want to clear the leaderboard? This action cannot be undone.')) {
      try {
        const response = await fetch(`${apiBase}/api/reset_leaderboard`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          loadLeaderboard();
        } else {
          throw new Error('Failed to clear leaderboard');
        }
      } catch (error) {
        console.error('Error clearing leaderboard:', error);
        alert('Failed to clear leaderboard');
      }
    }
  });
  
  document.getElementById('save-leaderboard-csv').addEventListener('click', exportLeaderboardCSV);
  
  // Stats functionality
  loadStats();
  
  document.getElementById('save-csv-button').addEventListener('click', exportStatsCSV);
  
  document.getElementById('reset-data-button').addEventListener('click', async () => {
    if (confirm('Are you sure you want to reset all game statistics? This action cannot be undone.')) {
      try {
        const response = await fetch(`${apiBase}/api/reset_stats`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          loadStats();
        } else {
          throw new Error('Failed to reset stats');
        }
      } catch (error) {
        console.error('Error resetting stats:', error);
        alert('Failed to reset statistics');
      }
    }
  });
  
  // Loading functions
  async function loadLeaderboard() {
    try {
      const response = await fetch(`${apiBase}/api/get_leaderboard`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch leaderboard');
      }
      
      const data = await response.json();
      const leaderboard = data.leaderboard || [];
      
      const leaderboardTable = document.getElementById('leaderboardTable');
      if (!leaderboardTable) {
        console.warn('Leaderboard table not found');
        return;
      }
      
      const tbody = leaderboardTable.querySelector('tbody');
      if (!tbody) {
        console.warn('Leaderboard table body not found');
        return;
      }
      
      // Clear the table first
      tbody.innerHTML = '';
      
      // Add entries to the leaderboard
      if (leaderboard.length > 0) {
        leaderboard.forEach((entry, index) => {
          const row = document.createElement('tr');
          const date = new Date(entry.date);
          const formattedDate = formatDate(date);
          
          row.innerHTML = `
            <td>${index + 1}</td>
            <td>${entry.name || 'Anonymous'}</td>
            <td>${entry.score}</td>
            <td>${entry.bestTile}</td>
            <td>${formattedDate}</td>
            <td>${entry.moves}</td>
          `;
          tbody.appendChild(row);
        });
      } else {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="6">No scores yet. Play a game to be the first!</td>';
        tbody.appendChild(row);
      }
    } catch (error) {
      console.error('Error loading leaderboard:', error);
      alert('Failed to load leaderboard');
    }
  }
  
  async function loadStats() {
    try {
      const response = await fetch(`${apiBase}/api/get_stats`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }
      
      const data = await response.json();
      const stats = data.stats || [];
      const uniqueStats = Array.from(new Set(stats.map(stat => JSON.stringify(stat)))).map(stat => JSON.parse(stat));
      
      const statsTable = document.getElementById('statsTable');
      if (!statsTable) {
        console.warn('Stats table not found');
        return;
      }
      
      const statsTableBody = statsTable.querySelector('tbody');
      if (!statsTableBody) {
        console.warn('Stats table body not found');
        return;
      }
      
      // Clear the table first
      statsTableBody.innerHTML = '';
      
      if (uniqueStats.length === 0) {
        // Add a message if no stats are available
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="6">No game statistics available yet. Play a game to see your stats here!</td>`;
        statsTableBody.appendChild(row);
      } else {
        // Sort by date, newest first
        uniqueStats.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        uniqueStats.forEach(stat => {
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
      alert('Failed to load statistics');
    }
  }
  
  // Export functions
  async function exportLeaderboardCSV() {
    try {
      const response = await fetch(`${apiBase}/api/get_leaderboard`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch leaderboard');
      }
      
      const data = await response.json();
      const leaderboard = data.leaderboard || [];
      
      if (leaderboard.length === 0) {
        alert('No leaderboard data available to export.');
        return;
      }
      
      const csvContent = "data:text/csv;charset=utf-8,"
        + "Rank,Player,Score,Best Tile,Date,Moves\n"
        + leaderboard.map((entry, index) => {
            const date = new Date(entry.date);
            const formattedDate = formatDate(date);
            return `${index + 1},"${entry.name || 'Anonymous'}",${entry.score},${entry.bestTile},"${formattedDate}",${entry.moves}`;
          }).join("\n");
          
      downloadCSV(csvContent, "fancy2048_leaderboard.csv");
    } catch (error) {
      console.error('Error exporting leaderboard:', error);
      alert('Failed to export leaderboard');
    }
  }
  
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
      
      const csvContent = "data:text/csv;charset=utf-8,"
        + "Date,Best Tile,Score,Best Score,Time,Moves\n"
        + uniqueStats.map(stat => {
            const date = new Date(stat.date);
            const formattedDate = formatDate(date);
            return `"${formattedDate}",${stat.bestTile},${stat.score},${stat.bestScore},"${stat.time || '00:00'}",${stat.moves}`;
          }).join("\n");
          
      downloadCSV(csvContent, "game_stats.csv");
    } catch (error) {
      console.error('Error exporting stats:', error);
      alert('Failed to export statistics');
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
  
  // Format date helper
  function formatDate(date) {
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear().toString().slice(-2)} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  }
});
