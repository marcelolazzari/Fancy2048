const express = require('express');
const router = express.Router();
const statisticsController = require('../controllers/statisticsController');

router.get('/api/statistics', (req, res) => {
    const stats = statisticsController.getStatistics();
    res.json(stats);
});

module.exports = router;