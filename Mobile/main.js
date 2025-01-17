class Game {
  constructor(size) {
    this.size = size;
    this.board = this.createEmptyBoard();
    this.score = 0;
    this.bestScore = localStorage.getItem('bestScore') || 0;
    this.isLightMode = localStorage.getItem('isLightMode') === 'true';
    this.previousBoard = null;
    this.overrideTheme = localStorage.getItem('overrideTheme') || 'auto';
    this.addEventListeners();
    this.reset();
    window.addEventListener('resize', () => this.updateTileSize());
    this.applyTheme();
  }

  addEventListeners() {
    document.getElementById('invert-button').addEventListener('click', this.toggleTheme.bind(this));
    document.getElementById('reset-button').addEventListener('click', this.reset.bind(this));
    document.getElementById('back-button').addEventListener('click', this.undo.bind(this));
    window.addEventListener('keydown', this.handleKeyPress.bind(this));
    document.querySelector('.game-container').addEventListener('touchstart', this.handleTouchStart.bind(this), false);
    document.querySelector('.game-container').addEventListener('touchend', this.handleTouchEnd.bind(this), false);
    document.getElementById('hue-slider').addEventListener('input', this.updateHue.bind(this));
    document.getElementById('theme-override-select').addEventListener('change', this.setThemeOverride.bind(this));
  }

  setThemeOverride(event) {
    this.overrideTheme = event.target.value;
    localStorage.setItem('overrideTheme', this.overrideTheme);
    this.applyTheme();
  }

  toggleTheme() {
    if (this.overrideTheme === 'auto') {
      this.isLightMode = !this.isLightMode;
      localStorage.setItem('isLightMode', this.isLightMode);
    }
    this.applyTheme();
  }

  applyTheme() {
    let isLightMode = this.isLightMode;
    if (this.overrideTheme === 'light') {
      isLightMode = true;
    } else if (this.overrideTheme === 'dark') {
      isLightMode = false;
    }
    document.body.classList.toggle('light-mode', isLightMode);
    document.querySelector('.overlay').classList.toggle('light-mode', isLightMode);
    document.querySelector('.game-container').classList.toggle('light-mode', isLightMode);
    document.querySelectorAll('.tile').forEach(tile => {
      tile.classList.toggle('light-mode', isLightMode);
      this.invertTileDigits(tile);
    });
  }

  invertTileDigits(tile) {
    tile.style.color = this.isLightMode ? '#000000' : '#f9f6f2';
  }

  handleTouchStart(e) {
    this.touchStartX = e.touches[0].clientX;
    this.touchStartY = e.touches[0].clientY;
  }

  handleTouchEnd(e) {
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
    const gameContainer = document.querySelector('.game-container');
    const containerSize = Math.min(gameContainer.clientWidth, gameContainer.clientHeight);
    const gap = parseInt(getComputedStyle(gameContainer).getPropertyValue('gap'));
    const tileSize = (containerSize - (this.size - 1) * gap) / this.size;

    document.querySelectorAll('.tile').forEach(tile => {
      tile.style.width = `${tileSize}px`;
      tile.style.height = `${tileSize}px`;
      tile.style.fontSize = `${tileSize * 0.4}px`;
      if (tile.textContent.length > 3) {
        tile.style.fontSize = `${tileSize * 0.3}px`;
      }
    });

    gameContainer.style.gridTemplateColumns = `repeat(${this.size}, ${tileSize}px)`;
    gameContainer.style.gridTemplateRows = `repeat(${this.size}, ${tileSize}px)`;
  }

  calculateTileSize() {
    const viewportSize = Math.min(window.innerWidth, window.innerHeight);
    const boardPadding = 20;
    const maxBoardSize = viewportSize - boardPadding * 2;
    return maxBoardSize / this.size;
  }

  addRandomTile() {
    const emptySpots = this.board.flatMap((row, x) => row.map((cell, y) => (cell === '' ? { x, y } : null)).filter(Boolean));
    const spot = emptySpots[Math.floor(Math.random() * emptySpots.length)];
    const newValue = Math.random() < 0.9 ? 2 : 4;
    this.board[spot.x][spot.y] = newValue;
    this.updateTileColor(spot.x, spot.y, newValue);
  }

  updateTileColor(x, y, value) {
    const tile = document.querySelector(`.tile[data-x="${x}"][data-y="${y}"]`);
    if (tile) {
      tile.style.backgroundColor = this.getTileColor(value);
      tile.style.color = this.getTextColor(value);
    }
  }

  updateBestScore() {
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      localStorage.setItem('bestScore', this.bestScore);
    }
  }

  reset() {
    this.board = this.createEmptyBoard();
    this.addRandomTile();
    this.addRandomTile();
    this.score = 0;
    this.updateUI();
    document.getElementById('game-over').classList.add('hidden');
  }

  undo() {
    if (this.previousBoard) {
      this.board = this.previousBoard;
      this.previousBoard = null;
      this.updateUI();
    }
  }

  slideAndCombine(row) {
    let newRow = Array(this.size).fill('');
    let index = 0;
    for (let i = 0; i < this.size; i++) {
      if (row[i] !== '') {
        if (row[i] === newRow[index - 1]) {
          newRow[index - 1] *= 2;
          this.score += newRow[index - 1];
        } else {
          newRow[index] = row[i];
          index++;
        }
      }
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
    return true;
  }

  move(direction) {
    this.previousBoard = this.board.map(row => [...row]);
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
    }

    this.updateUI();
  }

  transpose(matrix) {
    return matrix[0].map((_, i) => matrix.map(row => row[i]));
  }

  updateUI() {
    const gameContainer = document.querySelector('.game-container');
    gameContainer.innerHTML = '';
    let highestValue = 0;
    this.board.forEach((row, x) => {
      row.forEach((value, y) => {
        const tile = document.createElement('div');
        tile.classList.add('tile');
        tile.textContent = value !== '' ? value : '';
        tile.style.backgroundColor = this.getTileColor(value);
        tile.style.color = this.getTextColor(value);
        tile.setAttribute('data-x', x);
        tile.setAttribute('data-y', y);
        if (value) {
          tile.setAttribute('data-value', value);
          highestValue = Math.max(highestValue, value);
        }
        if (this.isLightMode) {
          tile.classList.add('light-mode');
          this.invertTileDigits(tile);
        }
        gameContainer.appendChild(tile);
      });
    });
    document.getElementById('score').textContent = this.score;
    document.getElementById('score').style.color = this.getScoreColor(this.score);
    document.getElementById('best-score').textContent = this.bestScore;
    this.updateTileSize();
    this.updateHeaderBackground(highestValue);
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
    return value >= 8 ? '#f9f6f2' : '#776e65';
  }

  getTileColor(value) {
    const colorMap = {
      '': 'transparent',
      '2': '#eee4da',
      '4': '#ede0c8',
      '8': '#f2b179',
      '16': '#f59563',
      '32': '#f67c5f',
      '64': '#f65e3b',
      '128': '#edcf72',
      '256': '#edcc61',
      '512': '#edc850',
      '1024': '#edc53f',
      '2048': '#edc22e',
      '4096': '#3c3a32',
      '8192': '#3c3a32',
      '16384': '#3c3a32',
      '32768': '#3c3a32',
      '65536': '#3c3a32',
    };
    return colorMap[value];
  }

  updateHue(event) {
    const hueValue = event.target.value;
    document.querySelector('.game-section').style.filter = `hue-rotate(${hueValue}deg)`;
    document.querySelector('.overlay').style.filter = `hue-rotate(${hueValue}deg)`;
    document.querySelector('.game-container').style.filter = `hue-rotate(${hueValue}deg)`;
    document.querySelector('header h1').style.filter = `hue-rotate(${hueValue}deg)`;
  }
}

// Instantiate the game
document.addEventListener('DOMContentLoaded', () => {
  const game = new Game(4);
  game.updateTileSize();
  game.applyTheme();
  document.getElementById('hue-slider').value = 0;
});