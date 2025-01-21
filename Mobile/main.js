class Game {
  constructor(size) {
    this.size = size;
    this.board = this.createEmptyBoard();
    this.score = 0;
    this.bestScore = localStorage.getItem('bestScore') || 0;
    this.isLightMode = localStorage.getItem('isLightMode') === 'true';
    this.previousBoard = null;
    this.addEventListeners();
    this.reset();
    window.addEventListener('resize', () => this.refreshLayout());
    this.applyTheme();
  }

  addEventListeners() {
    document.getElementById('invert-button').addEventListener('click', this.toggleTheme.bind(this));
    document.getElementById('reset-button').addEventListener('click', this.reset.bind(this));
    window.addEventListener('keydown', this.handleKeyPress.bind(this));
    const gameContainer = document.querySelector('.game-container');
    gameContainer.addEventListener('touchstart', this.handleTouchStart.bind(this), false);
    gameContainer.addEventListener('touchend', this.handleTouchEnd.bind(this), false);
    document.getElementById('hue-slider').addEventListener('input', this.updateHue.bind(this));
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
      document.querySelector('.game-container'),
      document.getElementById('score-box'),
      document.getElementById('invert-button'),
      document.getElementById('reset-button')
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

    this.updateUI(); // Ensure UI is updated with the correct theme
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
    this.board[spot.x][spot.y] = Math.random() < 0.9 ? 2 : 4;
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
        gameContainer.appendChild(tile);
      });
    });
    document.getElementById('score').textContent = this.score;
    document.getElementById('score').style.color = this.getScoreColor(this.score);
    document.getElementById('best-score').textContent = this.bestScore;
    this.updateTileSize();
    this.updateHeaderBackground(highestValue);
    this.updateHue({ target: { value: document.getElementById('hue-slider').value } }); // Ensure hue is applied
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
    if (value === 2 || value === 4) return '#776e65'; // Darker color for better contrast
    return value >= 8 ? '#f9f6f2' : '#776e65'; // Fix number value contrast ratio
  }

  getTileColor(value) {
    if (value === '') return 'transparent';

    if (value === 2) return '#add8e6'; // Light blue for value 2

    const baseHue = 200; // Starting hue for the color '4'
    const hueStep = 30; // Step to rotate the hue for each value

    const hue = baseHue + (Math.log2(value) - 2) * hueStep;
    return `hsl(${hue}, 70%, 50%)`;
  }

  updateHue(event) {
    const hueValue = event.target.value;
    document.querySelector('.game-section').style.filter = `hue-rotate(${hueValue}deg)`;
    document.querySelector('.overlay').style.filter = `hue-rotate(${hueValue}deg)`;
    document.querySelector('.game-container').style.filter = `hue-rotate(${hueValue}deg)`;
    document.querySelector('header h1').style.filter = `hue-rotate(${hueValue}deg)`;
    document.getElementById('score-box').style.filter = `hue-rotate(${hueValue}deg)`;
    document.getElementById('score').style.filter = `hue-rotate(${hueValue}deg)`;
    document.getElementById('best-score').style.filter = `hue-rotate(${hueValue}deg)`;
    document.getElementById('hue-slider').style.filter = `hue-rotate(${hueValue}deg)`;
  }
}

// Instantiate the game
document.addEventListener('DOMContentLoaded', () => {
  const game = new Game(4);
  game.refreshLayout();
  game.applyTheme();
  document.getElementById('hue-slider').value = 0;
});