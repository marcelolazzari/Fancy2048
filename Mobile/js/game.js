class Game {
  constructor(size) {
    this.size = size;
    this.board = this.createEmptyBoard();
    this.score = 0;
    this.bestScore = localStorage.getItem('bestScore') || 0;
    this.isLightMode = localStorage.getItem('isLightMode') === 'true';
    this.hueValue = 0;
    this.gameStateStack = [];
    this.leaderboard = JSON.parse(localStorage.getItem('leaderboard')) || [];
    this.stats = JSON.parse(localStorage.getItem('gameStats')) || [];
    this.startTime = null;
    this.hasSavedStats = false;
    this.moves = 0;
    this.addEventListeners();
    this.reset();
    window.addEventListener('resize', () => this.refreshLayout());
    this.applyTheme();
    this.updateHue();
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
    document.getElementById('changeColor-button').addEventListener('click', this.changeHue.bind(this));
    document.getElementById('back-button').addEventListener('click', this.undoMove.bind(this));
    document.getElementById('leaderboard-button').addEventListener('click', this.openLeaderboardPage.bind(this));
  }

  refreshLayout() {
    this.updateTileSize();
    this.updateUI();
  }

  toggleTheme() {
    this.isLightMode = !this.isLightMode;
    localStorage.setItem('isLightMode', this.isLightMode);
    this.applyTheme();
  }

  applyTheme() {
    const elementsToToggle = [
      document.body,
      document.querySelector('.overlay'),
      document.getElementById('board-container'),
      document.getElementById('score-container'),
      document.getElementById('reset-button'),
      document.getElementById('best-score')
    ];

    elementsToToggle.forEach(element => {
      if (element) {
        element.classList.toggle('light-mode', this.isLightMode);
      }
    });

    document.querySelectorAll('.tile').forEach(tile => {
      tile.classList.toggle('light-mode', this.isLightMode);
      this.invertTileDigits(tile);
    });

    this.updateUI();
    this.updateHue();
  }

  invertTileDigits(tile) {
    tile.style.color = this.isLightMode ? '#000000' : '#f9f6f2';
  }

  handleKeyPress(event) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
      this.move(event.key);
      this.updateUI();
      setTimeout(() => {
        if (this.isGameOver()) {
          document.getElementById('game-over').classList.remove('hidden');
        }
      }, 0);
    }
  }

  handleTouchStart(e) {
    this.touchStartX = e.touches[0].clientX;
    this.touchStartY = e.touches[0].clientY;
  }

  handleTouchEnd(e) {
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const dx = touchEndX - this.touchStartX;
    const dy = touchEndY - this.touchStartY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    let direction = '';
    if (absDx > absDy) {
      direction = dx > 0 ? 'ArrowRight' : 'ArrowLeft';
    } else {
      direction = dy > 0 ? 'ArrowDown' : 'ArrowUp';
    }

    if (Math.max(absDx, absDy) > 50) {
      this.move(direction);
      this.updateUI();
      setTimeout(() => {
        if (this.isGameOver()) {
          document.getElementById('game-over').classList.remove('hidden');
        }
      }, 0);
    }
  }

  createEmptyBoard() {
    return Array.from({ length: this.size }, () => Array(this.size).fill(''));
  }

  updateTileSize() {
    const boardContainer = document.getElementById('board-container');
    const containerSize = Math.min(boardContainer.clientWidth, boardContainer.clientHeight);
    const gap = parseInt(getComputedStyle(boardContainer).getPropertyValue('gap'));
    const tileSize = (containerSize - (this.size - 1) * gap) / this.size;

    document.querySelectorAll('.tile').forEach((tile, index) => {
      tile.style.width = `${tileSize}px`;
      tile.style.height = `${tileSize}px`;
      tile.style.fontSize = `${tileSize * 0.4}px`;
      if (tile.textContent.length > 3) {
        tile.style.fontSize = `${tileSize * 0.3}px`;
      }
      tile.style.msGridRow = Math.floor(index / this.size) + 1;
      tile.style.msGridColumn = (index % this.size) + 1;
    });

    boardContainer.style.gridTemplateColumns = `repeat(${this.size}, ${tileSize}px)`;
    boardContainer.style.msGridColumns = `repeat(${this.size}, ${tileSize}px)`;
    boardContainer.style.gridTemplateRows = `repeat(${this.size}, ${tileSize}px)`;
    boardContainer.style.msGridRows = `repeat(${this.size}, ${tileSize}px)`;
  }

  addRandomTile() {
    const emptySpots = this.board.flatMap((row, x) => row.map((cell, y) => (cell === '' ? { x, y } : null)).filter(Boolean));
    if (emptySpots.length > 0) {
      const spot = emptySpots[Math.floor(Math.random() * emptySpots.length)];
      this.board[spot.x][spot.y] = Math.random() < 0.9 ? 2 : 4;
    }
  }

  updateBestScore() {
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      localStorage.setItem('bestScore', this.bestScore);
      this.updateLeaderboard();
    }
  }

  reset() {
    this.board = this.createEmptyBoard();
    this.addRandomTile();
    this.addRandomTile();
    this.score = 0;
    this.startTime = new Date();
    this.hasSavedStats = false;
    this.moves = 0;
    this.updateUI();
    document.getElementById('game-over').classList.add('hidden');
    this.applyTheme();
    this.updateHue();
  }

  slideAndCombine(row) {
    let newRow = row.filter(val => val);
    for (let i = 0; i < newRow.length - 1; i++) {
      if (newRow[i] === newRow[i + 1]) {
        newRow[i] *= 2;
        this.score += newRow[i];
        newRow[i + 1] = 0;
      }
    }
    newRow = newRow.filter(val => val);
    while (newRow.length < this.size) {
      newRow.push('');
    }
    return newRow;
  }

  isGameOver() {
    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        if (this.board[i][j] === '') return false;
        if (j < this.size - 1 && this.board[i][j] === this.board[i][j + 1]) return false;
        if (i < this.size - 1 && this.board[i][j] === this.board[i + 1][j]) return false;
      }
    }
    const gameOver = true;
    if (gameOver && this.score > 0 && !this.hasSavedStats) {
      this.saveStats();
      this.hasSavedStats = true;
    }
    return gameOver;
  }

  move(direction) {
    this.saveState();
    let hasChanged = false;

    if (['ArrowUp', 'ArrowDown'].includes(direction)) {
      this.board = this.transpose(this.board);
    }
    if (['ArrowDown', 'ArrowRight'].includes(direction)) {
      this.board = this.board.map(row => row.reverse());
    }

    this.board = this.board.map(row => {
      const newRow = this.slideAndCombine(row);
      if (!hasChanged && JSON.stringify(newRow) !== JSON.stringify(row)) {
        hasChanged = true;
      }
      return newRow;
    });

    if (['ArrowDown', 'ArrowRight'].includes(direction)) {
      this.board = this.board.map(row => row.reverse());
    }
    if (['ArrowUp', 'ArrowDown'].includes(direction)) {
      this.board = this.transpose(this.board);
    }

    if (hasChanged) {
      this.addRandomTile();
      this.updateBestScore();
      this.moves++;
    }

    this.updateUI();
  }

  transpose(matrix) {
    return matrix[0].map((_, i) => matrix.map(row => row[i]));
  }

  updateUI() {
    const boardContainer = document.getElementById('board-container');
    boardContainer.innerHTML = '';
    let highestValue = 0;
    this.board.forEach(row => {
      row.forEach(value => {
        const tile = document.createElement('div');
        tile.classList.add('tile');
        tile.textContent = value !== '' ? value : '';
        tile.style.backgroundColor = this.getTileColor(value);
        tile.style.color = this.getTextColor(value);
        if (value) {
          tile.setAttribute('data-value', value);
          highestValue = Math.max(highestValue, value);
        }
        if (this.isLightMode) {
          tile.classList.add('light-mode');
          this.invertTileDigits(tile);
        }
        boardContainer.appendChild(tile);
      });
    });
    document.getElementById('score').textContent = this.score;
    document.getElementById('score').style.color = this.getScoreColor(this.score);
    document.getElementById('best-score').textContent = this.bestScore;
    document.getElementById('moves').textContent = this.moves;
    this.updateTileSize();
    this.updateHeaderBackground(highestValue);
    this.updateHue();
  }

  getScoreColor(score) {
    if (score < 100) return '#ffcc00';
    if (score < 500) return '#ff9900';
    if (score < 1000) return '#ff6600';
    if (score < 2000) return '#ff3300';
    return '#ff0000';
  }

  updateHeaderBackground(highestValue) {
    const header = document.querySelector('header h1');
    const backgroundColor = this.getTileColor(highestValue);
    header.style.backgroundColor = backgroundColor;
    header.style.color = this.getTextColor(highestValue);
  }

  getTextColor(value) {
    if (value === 2) return '#776e65';
    if (value === 4) return '#776e65';
    return value >= 8 ? '#f9f6f2' : '#776e65';
  }

  getTileColor(value) {
    if (value === '') return 'transparent';

    if (value === 2) return '#e0f7fa';
    if (value === 4) return '#add8e6';

    const baseHue = 200;
    const hueStep = 30;

    const hue = baseHue + (Math.log2(value) - 3) * hueStep;
    return `hsl(${hue}, 70%, 50%)`;
  }

  changeHue() {
    this.hueValue = (this.hueValue + 15) % 360;
    this.updateHue();
  }

  updateHue() {
    const hueValue = this.hueValue;
    const hueRotation = this.isLightMode ? -hueValue : hueValue;
    document.documentElement.style.setProperty('--hue-value', hueValue);
    document.querySelector('.game-section').style.filter = `hue-rotate(${hueRotation}deg)`;
    document.querySelector('.overlay').style.filter = `hue-rotate(${hueRotation}deg)`;
    document.getElementById('board-container').style.filter = `hue-rotate(${hueRotation}deg)`;
    document.querySelector('header h1').style.filter = `hue-rotate(${hueRotation}deg)`;
    document.getElementById('score-container').style.filter = `hue-rotate(${hueRotation}deg)`;
    document.getElementById('score').style.filter = `hue-rotate(${hueRotation}deg)`;
    document.getElementById('best-score').style.filter = `hue-rotate(${hueRotation}deg)`;
    const buttons = [document.getElementById('changeColor-button'), document.getElementById('reset-button')];
    buttons.forEach(button => {
      if (!this.isLightMode) {
        button.style.filter = `hue-rotate(${hueRotation}deg)`;
      } else {
        button.style.filter = 'none';
      }
    });
  }

  saveState() {
    this.gameStateStack.push(JSON.stringify(this.board));
  }

  undoMove() {
    if (this.gameStateStack.length > 0) {
      this.board = JSON.parse(this.gameStateStack.pop());
      this.updateUI();
    }
  }

  openLeaderboardPage() {
    window.location.href = 'Stats/leaderboard.html';
  }

  updateLeaderboard() {
    this.leaderboard.push({ name: 'Player', score: this.score });
    this.leaderboard.sort((a, b) => b.score - a.score);
    localStorage.setItem('leaderboard', JSON.stringify(this.leaderboard));
    this.updateLeaderboardModal();
  }

  updateLeaderboardModal() {
    const leaderboardList = document.getElementById('leaderboardList');
    leaderboardList.innerHTML = '';
    this.leaderboard.forEach((entry, index) => {
      const listItem = document.createElement('li');
      listItem.textContent = `${index + 1}. ${entry.name}: ${entry.score}`;
      leaderboardList.appendChild(listItem);
    });
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
        time: time
      };
      this.stats.push(stat);
      localStorage.setItem('gameStats', JSON.stringify(this.stats));
    }
  }
}

// Instantiate the game
document.addEventListener('DOMContentLoaded', () => {
  const game = new Game(4);
  game.refreshLayout();
  game.applyTheme();
  game.updateHue();
  window.addEventListener('beforeunload', () => game.saveStats());
});
