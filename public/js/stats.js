document.addEventListener('DOMContentLoaded', () => {
  const statsTableBody = document.getElementById('stats-table-body');
  const stats = JSON.parse(localStorage.getItem('stats')) || [];

  stats.forEach((session) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${new Date(session.date).toLocaleString()}</td>
      <td>${session.bestScore}</td>
      <td>${session.bestTime}</td>
      <td>${session.highestNumber}</td>
    `;
    statsTableBody.appendChild(row);
  });

  document.getElementById('back-button').addEventListener('click', () => {
    window.location.href = 'index.html';
  });

  document.getElementById('clear-history-button').addEventListener('click', () => {
    localStorage.removeItem('stats');
    statsTableBody.innerHTML = ''; // Clear the table
  });

  document.getElementById('export-button').addEventListener('click', () => {
    const csvContent = "data:text/csv;charset=utf-8,"
      + ["Date & Time,Best Score,Best Time,Highest Number"]
        .concat(stats.map(session => [
          new Date(session.date).toLocaleString(),
          session.bestScore,
          session.bestTime,
          session.highestNumber
        ].join(',')))
        .join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'stats.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });
});
