class Game {
  constructor(size) {
    // Core game properties
    this.size = size;
    this.board = this.createEmptyBoard();
    this.score = 0;
    this.bestScore = +localStorage.getItem('bestScore') || 0;
    this.moves = 0;
    this.startTime = null;

    // Game states
    this.gameState = 'ready'; // ready, playing, paused, over, won
    this.hasSavedStats = false;
    this.isPaused = false;

    // Visual settings
    this.isLightMode = localStorage.getItem('isLightMode') === 'true';
    this.hueValue = 0;
    this.isRainbowMode = false;

    // Game history and stats
    this.gameStateStack = [];
    this.maxUndoSteps = 20; // Allow multiple undos up to a limit
    this.lastMoveScore = 0;
    this.scoreDelta = 0;
    this.lastMerged = []; // Track merged positions for animations
    this.stats = JSON.parse(localStorage.getItem('gameStats')) || [];
    this.timerInterval = null;

    // Animation properties
    this.animationInProgress = false;
    this.animationFrameId = null;
    this.lastMoveDirection = null;

    // Initialize the game
    this.addEventListeners();
    this.reset();
    window.addEventListener('resize', this.debounce(() => this.refreshLayout(), 100));
    window.addEventListener('orientationchange', () => setTimeout(() => this.refreshLayout(), 300));
    this.applyTheme();
    this.updateHue();
    this.startTimer();
  }

  addEventListeners() {
    document.getElementById('reset-button').addEventListener('click', () => {
      this.reset();
      this.updateUI();
    });
    window.addEventListener('keydown', this.handleKeyPress.bind(this));
    const boardContainer = document.getElementById('board-container');
    boardContainer.addEventListener('touchstart', this.handleTouchStart.bind(this), false);
    boardContainer.addEventListener('touchend', this.handleTouchEnd.bind(this), false);
    document.addEventListener('touchmove', this.preventScroll, { passive: false });
    document.getElementById('changeColor-button').addEventListener('click', this.changeHue.bind(this));
    document.getElementById('back-button').addEventListener('click', this.undoMove.bind(this));
    document.getElementById('leaderboard-button').addEventListener('click', this.openStatisticsPage.bind(this));
    document.getElementById('rainbowMode-button').addEventListener('click', this.toggleRainbowMode.bind(this));
    document.getElementById('pause-button').addEventListener('click', this.togglePause.bind(this));
    document.getElementById('board-size-button').addEventListener('click', this.changeBoardSize.bind(this));
    document.getElementById('theme-toggle-button').addEventListener('click', this.toggleTheme.bind(this));
  }

  updateBestScore() {
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      localStorage.setItem('bestScore', this.bestScore);
    }
  }

  openStatisticsPage() {
    window.location.href = '../pages/leaderboard.html';
  }

  saveStats() {
    if (this.score > 0) {
      const endTime = new Date();
      const timeDiff = Math.floor((endTime - this.startTime) / 1000);
      const minutes = Math.floor(timeDiff / 60).toString().padStart(2, '0');
      const seconds = (timeDiff % 60).toString().padStart(2, '0');
      const time = `${minutes}:${seconds}`;

      const stat = {
        score: this.score,
        bestTile: Math.max(...this.board.flat()),
        bestScore: this.bestScore,
        date: new Date().toISOString(),
        time: time,
        moves: this.moves
      };
      
      this.stats.push(stat);
      localStorage.setItem('gameStats', JSON.stringify(this.stats));
    }
  }

  startTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    
    this.startTime = new Date();
    const timeElement = document.getElementById('time');
    
    this.timerInterval = setInterval(() => {
      if (!this.isPaused) {
        const currentTime = new Date();
        const timeDiff = Math.floor((currentTime - this.startTime) / 1000);
        const minutes = Math.floor(timeDiff / 60).toString().padStart(2, '0');
        const seconds = (timeDiff % 60).toString().padStart(2, '0');
        timeElement.textContent = `${minutes}:${seconds}`;
      }
    }, 1000);
  }
}