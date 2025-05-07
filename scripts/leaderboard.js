document.addEventListener('DOMContentLoaded', () => {
  const leaderboard = JSON.parse(localStorage.getItem('leaderboard')) || [];
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
  
  // Add event listeners for buttons
  document.getElementById('clear-leaderboard').addEventListener('click', () => {
    if (confirm('Are you sure you want to clear the leaderboard? This action cannot be undone.')) {
      localStorage.removeItem('leaderboard');
      location.reload();
    }
  });
  
  document.getElementById('save-leaderboard-csv').addEventListener('click', () => {
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
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "fancy2048_leaderboard.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });
});
