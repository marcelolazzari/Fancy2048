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
    window.addEventListener('resize', () => this.handleResize());
    this.applyTheme();
    window.addEventListener('orientationchange', () => this.handleResize());
  }

  addEventListeners() {
    document.getElementById('invert-button').addEventListener('click', this.toggleTheme.bind(this));
    document.getElementById('reset-button').addEventListener('click', this.reset.bind(this));
    window.addEventListener('keydown', this.handleKeyPress.bind(this));
    document.querySelector('.game-container').addEventListener('touchstart', this.handleTouchStart.bind(this), false);
    document.querySelector('.game-container').addEventListener('touchend', this.handleTouchEnd.bind(this), false);
    document.getElementById('hue-slider').addEventListener('input', this.updateHue.bind(this));
  }

  toggleTheme() {
    this.isLightMode = !this.isLightMode;
    localStorage.setItem('isLightMode', this.isLightMode);
    this.applyTheme();
  }

  applyTheme() {
    if (this.isLightMode) {
      document.body.classList.add('light-mode');
      document.querySelector('.overlay').classList.add('light-mode');
      document.querySelector('.game-container').classList.add('light-mode');
      document.querySelectorAll('.tile').forEach(tile => {
        tile.classList.add('light-mode');
        this.invertTileDigits(tile);
      });
      document.querySelectorAll('.score-container').forEach(container => {
        container.classList.add('light-mode');
      });
    } else {
      document.body.classList.remove('light-mode');
      document.querySelector('.overlay').classList.remove('light-mode');
      document.querySelector('.game-container').classList.remove('light-mode');
      document.querySelectorAll('.tile').forEach(tile => {
        tile.classList.remove('light-mode');
        this.invertTileDigits(tile);
      });
      document.querySelectorAll('.score-container').forEach(container => {
        container.classList.remove('light-mode');
      });
    }
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
    const gameContainer = document.querySelector('.game-container');
    if (!gameContainer.contains(e.target)) return;

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
      tile.style.fontSize = `${tileSize * 0.5}px`; // Adjust font size for better readability
      if (tile.textContent.length > 3) {
        tile.style.fontSize = `${tileSize * 0.4}px`; // Adjust font size for larger numbers
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
    const newRow = [];
    let previousTile = null;
    row.forEach(tile => {
      if (tile !== '') {
        if (previousTile === null) {
          previousTile = tile;
        } else if (previousTile === tile) {
          newRow.push(tile * 2);
          this.score += tile * 2;
          previousTile = null;
        } else {
          newRow.push(previousTile);
          previousTile = tile;
        }
      }
    });
    if (previousTile !== null) {
      newRow.push(previousTile);
    }
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
    return true;
  }

  move(direction) {
    this.previousBoard = this.board.map(row => [...row]);
    let hasChanged = false;
    if (direction === 'ArrowUp' || direction === 'ArrowDown') {
      this.board = this.transpose(this.board);
    }
    if (direction === 'ArrowDown' || direction === 'ArrowRight') {
      this.board = this.board.map(row => row.reverse());
    }
    this.board = this.board.map(row => {
      const newRow = this.slideAndCombine(row);
      if (!hasChanged && JSON.stringify(newRow) !== JSON.stringify(row)) {
        hasChanged = true;
      }
      return newRow;
    });
    if (direction === 'ArrowDown' || direction === 'ArrowRight') {
      this.board = this.board.map(row => row.reverse());
    }
    if (direction === 'ArrowUp' || direction === 'ArrowDown') {
      this.board = this.transpose(this.board);
    }
    if (hasChanged) {
      this.addRandomTile();
      this.updateBestScore();
    }
    this.updateUI(); // Ensure UI is updated after move
  }

  transpose(matrix) {
    return matrix[0].map((_, i) => matrix.map(row => row[i]));
  }

  updateUI() {
    const gameContainer = document.querySelector('.game-container');
    const fragment = document.createDocumentFragment(); // Use a document fragment to minimize reflows
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
        fragment.appendChild(tile); // Append tile to fragment
      });
    });

    gameContainer.innerHTML = ''; // Clear the container once
    gameContainer.appendChild(fragment); // Append the fragment to the container

    this.updateScoreDisplay();
    this.updateTileSize();
  }

  updateScoreDisplay() {
    const scoreElement = document.getElementById('score');
    const bestScoreElement = document.getElementById('best-score');
    scoreElement.textContent = this.score;
    bestScoreElement.textContent = this.bestScore;
    scoreElement.style.filter = `hue-rotate(${(this.score / 10) % 360}deg)`; // Slower hue change based on score
  }

  getTextColor(value) {
    if (this.isLightMode) {
      return value >= 8 ? '#f9f6f2' : '#776e65';
    } else {
      return value >= 8 ? '#f9f6f2' : '#000000';
    }
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
    const elementsToUpdate = [
      document.querySelector('.game-section'),
      document.querySelector('.overlay'),
      document.querySelector('.game-container'),
      document.querySelector('header h1'),
      document.body,
      document.querySelector('main') // Add main to elements to update
    ];
    elementsToUpdate.forEach(element => {
      element.style.filter = `hue-rotate(${hueValue}deg)`;
    });
  }

  handleResize() {
    this.updateTileSize();
    this.adjustGameContainer();
    this.adjustMainLayout();
  }

  adjustGameContainer() {
    const gameContainer = document.querySelector('.game-container');
    const aspectRatio = window.innerWidth / window.innerHeight;
    if (aspectRatio > 1) {
      // Landscape
      gameContainer.style.width = `${window.innerHeight * 0.8}px`;
      gameContainer.style.height = `${window.innerHeight * 0.8}px`;
      gameContainer.style.transform = 'scale(0.9)'; // Scale the game container
    } else {
      // Portrait
      gameContainer.style.width = `${window.innerWidth * 0.9}px`;
      gameContainer.style.height = `${window.innerWidth * 0.9}px`;
      gameContainer.style.transform = 'scale(0.95)'; // Scale the game container
    }
    this.updateTileSize();
  }

  adjustMainLayout() {
    const mainElement = document.querySelector('main');
    const buttonContainer = document.querySelector('.button-container');
    const aspectRatio = window.innerWidth / window.innerHeight;
    if (aspectRatio > 1) {
      // Landscape
      mainElement.style.flexDirection = 'row';
      mainElement.style.alignItems = 'flex-start';
      mainElement.style.justifyContent = 'space-between';
      buttonContainer.style.flexDirection = 'column';
      buttonContainer.style.alignItems = 'flex-end';
    } else {
      // Portrait
      mainElement.style.flexDirection = 'column';
      mainElement.style.alignItems = 'center';
      mainElement.style.justifyContent = 'center';
      buttonContainer.style.flexDirection = 'row';
      buttonContainer.style.alignItems = 'center';
    }
  }
}

// Instantiate the game
document.addEventListener('DOMContentLoaded', () => {
  const game = new Game(4);
  game.updateTileSize();
  game.applyTheme();
  game.reset();
  document.getElementById('hue-slider').value = 0;

  const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
  if (prefersDarkScheme.matches) {
    document.body.classList.remove('light-mode');
    game.isLightMode = false;
  } else {
    document.body.classList.add('light-mode');
    game.isLightMode = true;
  }

  prefersDarkScheme.addEventListener('change', (e) => {
    if (e.matches) {
      document.body.classList.remove('light-mode');
      game.isLightMode = false;
    } else {
      document.body.classList.add('light-mode');
      game.isLightMode = true;
    }
    game.applyTheme();
  });

  window.addEventListener('resize', () => game.handleResize());
  window.addEventListener('orientationchange', () => game.handleResize());
});