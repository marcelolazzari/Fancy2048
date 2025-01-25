class Statistics {
    constructor() {
        this.gamesPlayed = 0;
        this.totalScore = 0;
        this.highestScore = 0;
        this.averageScore = 0;
        this.wins = 0;
        this.losses = 0;
        this.lastUpdated = null;
        // ...existing code...
    }

    updateStats(score, won) {
        this.gamesPlayed++;
        this.totalScore += score;
        this.highestScore = Math.max(this.highestScore, score);
        this.averageScore = this.totalScore / this.gamesPlayed;
        if (won) {
            this.wins++;
        } else {
            this.losses++;
        }
        this.lastUpdated = new Date().toLocaleString();
        // ...existing code...
    }

    getStats() {
        return {
            gamesPlayed: this.gamesPlayed,
            totalScore: this.totalScore,
            highestScore: this.highestScore,
            averageScore: this.averageScore,
            wins: this.wins,
            losses: this.losses,
            lastUpdated: this.lastUpdated,
            // ...existing code...
        };
    }
}
