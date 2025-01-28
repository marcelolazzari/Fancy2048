class Game {
  constructor(size = 4) {
    this.size = size;
    this.board = this.createEmptyBoard();
    this.score = 0;
    this.bestScore = localStorage.getItem('bestScore') || 0;
    this.isLightMode = localStorage.getItem('isLightMode') === 'true';
    this.previousBoard = null;
    this.hueValue = 0;
    this.addEventListeners();
    this.reset();
    this.updateUI();
    window.addEventListener('resize', () => this.refreshLayout());
    this.applyTheme();
    this.updateHue();
    this.applyButtonStyles();
  }

  createEmptyBoard() {
    return Array.from({ length: this.size }, () => Array(this.size).fill(''));
  }

  addRandomTile() {
    const emptyCells = [];
    for (let row = 0; row < this.size; row++) {
      for (let col = 0; col < this.size; col++) {
        if (this.board[row][col] === '') {
          emptyCells.push({ row, col });
        }
      }
    }
    if (emptyCells.length > 0) {
      const { row, col } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
      this.board[row][col] = Math.random() < 0.9 ? 2 : 4;
    }
  }

  addEventListeners() {
    document.getElementById('invert-button').addEventListener('click', this.toggleTheme.bind(this));
    document.getElementById('reset-button').addEventListener('click', this.reset.bind(this));
    window.addEventListener('keydown', this.handleKeyPress.bind(this));
    const boardContainer = document.querySelector('.board-container');
    boardContainer.addEventListener('touchstart', this.handleTouchStart.bind(this), false);
    boardContainer.addEventListener('touchend', this.handleTouchEnd.bind(this), false);
    document.getElementById('changeColor-button').addEventListener('click', this.changeHue.bind(this));
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
    const elements = [
      document.body,
      document.querySelector('.overlay'),
      document.querySelector('.board-container'),
      document.getElementById('score-container'),
      document.getElementById('invert-button'),
      document.getElementById('reset-button'),
      document.getElementById('best-score')
    ];

    elements.forEach(el => el?.classList.toggle('light-mode', this.isLightMode));
    document.querySelectorAll('.tile').forEach(tile => {
      tile.classList.toggle('light-mode', this.isLightMode);
      tile.style.color = this.isLightMode ? '#776e65' : '#f9f6f2';
    });
    this.updateUI();
    this.updateHue();
    this.applyButtonStyles();
  }

  handleKeyPress(e) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      this.move(e.key);
      setTimeout(() => {
        if (this.isGameOver()) document.getElementById('game-over').classList.remove('hidden');
      }, 0);
    }
  }

  handleTouchStart(e) {
    this.touchStartX = e.touches[0].clientX;
    this.touchStartY = e.touches[0].clientY;
  }

  handleTouchEnd(e) {
    const dx = e.changedTouches[0].clientX - this.touchStartX;
    const dy = e.changedTouches[0].clientY - this.touchStartY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (Math.max(absDx, absDy) > 50) {
      const direction = absDx > absDy 
        ? (dx > 0 ? 'ArrowRight' : 'ArrowLeft')
        : (dy > 0 ? 'ArrowDown' : 'ArrowUp');
      this.move(direction);
      setTimeout(() => {
        if (this.isGameOver()) document.getElementById('game-over').classList.remove('hidden');
      }, 0);
    }
  }

  updateTileSize() {
    const container = document.querySelector('.board-container');
    const containerSize = Math.min(container.clientWidth, container.clientHeight);
    const tileSize = (containerSize - (this.size - 1) * 10) / this.size;
    
    container.style.gridTemplateColumns = `repeat(${this.size}, ${tileSize}px)`;
    document.querySelectorAll('.tile').forEach(tile => {
      tile.style.width = tile.style.height = `${tileSize}px`;
      tile.style.fontSize = `${tileSize * 0.4}px`;
    });
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
    document.getElementById('game-over').classList.add('hidden');
    this.updateUI();
  }

  move(direction) {
    const vector = this.getVector(direction);
    const traversals = this.buildTraversals(vector);
    let moved = false;
    const merged = this.createEmptyBoard().map(row => row.map(() => false));

    traversals.x.forEach(x => {
      traversals.y.forEach(y => {
        const cell = { x, y };
        const value = this.board[x][y];
        
        if (value === '') return;

        const positions = this.findFarthestPosition(cell, vector);
        const next = this.board[positions.next.x]?.[positions.next.y];

        if (this.withinBounds(positions.next) && next === value && !merged[positions.next.x][positions.next.y]) {
          this.board[positions.next.x][positions.next.y] = value * 2;
          this.score += value * 2;
          merged[positions.next.x][positions.next.y] = true;
          this.board[x][y] = '';
          moved = true;
        } else if (!this.positionsEqual(cell, positions.farthest)) {
          this.board[positions.farthest.x][positions.farthest.y] = value;
          this.board[x][y] = '';
          moved = true;
        }
      });
    });

    if (moved) {
      this.addRandomTile();
      this.updateBestScore();
      this.updateUI();
    }
  }

  getVector(direction) {
    return {
      'ArrowUp': { x: -1, y: 0 },
      'ArrowRight': { x: 0, y: 1 },
      'ArrowDown': { x: 1, y: 0 },
      'ArrowLeft': { x: 0, y: -1 }
    }[direction];
  }

  buildTraversals(vector) {
    const traversals = { x: [], y: [] };
    for (let i = 0; i < this.size; i++) {
      traversals.x.push(i);
      traversals.y.push(i);
    }
    if (vector.x === 1) traversals.x = traversals.x.reverse();
    if (vector.y === 1) traversals.y = traversals.y.reverse();
    return traversals;
  }

  findFarthestPosition(cell, vector) {
    let previous = cell;
    let next = { x: cell.x + vector.x, y: cell.y + vector.y };
    while (this.withinBounds(next) && this.board[next.x][next.y] === '') {
      previous = next;
      next = { x: next.x + vector.x, y: next.y + vector.y };
    }
    return { farthest: previous, next };
  }

  withinBounds(cell) {
    return cell.x >= 0 && cell.x < this.size && cell.y >= 0 && cell.y < this.size;
  }

  positionsEqual(a, b) {
    return a.x === b.x && a.y === b.y;
  }

  isGameOver() {
    return !this.cellsAvailable() && !this.tileMatchesAvailable();
  }

  cellsAvailable() {
    return this.board.some(row => row.includes(''));
  }

  tileMatchesAvailable() {
    for (let x = 0; x < this.size; x++) {
      for (let y = 0; y < this.size; y++) {
        const current = this.board[x][y];
        if (current === '') continue;
        if ((x < this.size - 1 && current === this.board[x + 1][y]) ||
            (y < this.size - 1 && current === this.board[x][y + 1])) {
          return true;
        }
      }
    }
    return false;
  }

  updateUI() {
    const container = document.querySelector('.board-container');
    container.innerHTML = '';
    let maxValue = 0;

    this.board.flat().forEach(value => {
      const tile = document.createElement('div');
      tile.className = `tile${value ? ' active' : ''}${this.isLightMode ? ' light-mode' : ''}`;
      tile.textContent = value || '';
      tile.style.backgroundColor = this.getTileColor(value);
      tile.style.color = this.getTextColor(value);
      if (value) maxValue = Math.max(maxValue, value);
      container.appendChild(tile);
    });

    document.getElementById('score').textContent = this.score;
    document.getElementById('best-score').textContent = this.bestScore;
    this.updateTileSize();
    this.updateHeaderBackground(maxValue);
  }

  getTileColor(value) {
    if (!value) return 'transparent';
    const hue = 200 + (Math.log2(value) - 1) * 30;
    return `hsl(${hue}, 70%, 50%)`;
  }

  getTextColor(value) {
    return value <= 4 ? '#776e65' : '#f9f6f2';
  }

  updateHeaderBackground(value) {
    const header = document.querySelector('header h1');
    header.style.backgroundColor = this.getTileColor(value);
  }

  changeHue() {
    this.hueValue = (this.hueValue + 15) % 360;
    document.documentElement.style.setProperty('--hue', this.hueValue);
    document.querySelector('.game-section').style.filter = `hue-rotate(${this.hueValue}deg)`;
  }

  applyButtonStyles() {
    const buttons = ['changeColor-button', 'reset-button', 'invert-button']
      .map(id => document.getElementById(id))
      .filter(Boolean);

    buttons.forEach(button => {
      button.style.backgroundColor = this.isLightMode 
        ? 'rgba(224, 224, 224, 0.5)' 
        : 'rgba(0, 16, 71, 0.4)';
      button.style.color = this.isLightMode ? '#333' : '#fff';
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const game = new Game(4);
  game.refreshLayout();
});