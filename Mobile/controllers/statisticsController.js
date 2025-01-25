
const Statistics = require('../models/statistics');
const stats = new Statistics();

function updateStatistics(score, won) {
    stats.updateStats(score, won);
    stats.updateDateTime(); // Update date and time fields
    // ...existing code...
}

function getStatistics() {
    return stats.getStats();
    // ...existing code...
}

module.exports = {
    updateStatistics,
    getStatistics,
    // ...existing code...
};