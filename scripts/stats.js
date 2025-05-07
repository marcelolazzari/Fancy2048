document.addEventListener('DOMContentLoaded', () => {
  const stats = JSON.parse(localStorage.getItem('gameStats')) || [];
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

  document.getElementById('save-csv-button').addEventListener('click', () => {
    const csvContent = "data:text/csv;charset=utf-8,"
      + "Session,Best Tile,Score,Best Score,Time,Moves\n"
      + uniqueStats.map(stat => {
        const date = new Date(stat.date);
        const formattedDate = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear().toString().slice(-2)} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
        return `${formattedDate},${stat.bestTile},${stat.score},${stat.bestScore},${stat.time},${stat.moves}`;
      }).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "game_stats.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });

  document.getElementById('reset-data-button').addEventListener('click', () => {
    localStorage.removeItem('gameStats');
    location.reload();
  });
});
