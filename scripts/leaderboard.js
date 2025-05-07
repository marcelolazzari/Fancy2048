document.addEventListener('DOMContentLoaded', () => {
  const leaderboard = JSON.parse(localStorage.getItem('leaderboard')) || [];
  const leaderboardList = document.getElementById('leaderboardList');
  
  // Clear the list
  leaderboardList.innerHTML = '';
  
  // Add entries to the leaderboard
  if (leaderboard.length > 0) {
    leaderboard.forEach((entry, index) => {
      const listItem = document.createElement('li');
      listItem.textContent = `${index + 1}. ${entry.name}: ${entry.score}`;
      leaderboardList.appendChild(listItem);
    });
  } else {
    const listItem = document.createElement('li');
    listItem.textContent = 'No scores yet. Play a game to be the first!';
    leaderboardList.appendChild(listItem);
  }
});
