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
    this.leaderboard = JSON.parse(localStorage.getItem('leaderboard')) || [];
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
    document.getElementById('leaderboard-button').addEventListener('click', this.openLeaderboardPage.bind(this));
    document.getElementById('rainbowMode-button').addEventListener('click', this.toggleRainbowMode.bind(this));
    document.getElementById('pause-button').addEventListener('click', this.togglePause.bind(this));
    document.getElementById('board-size-button').addEventListener('click', this.changeBoardSize.bind(this));
    document.getElementById('theme-toggle-button').addEventListener('click', this.toggleTheme.bind(this));
  }

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  preventScroll(e) {
    if (e.target.closest('#board-container')) {
      e.preventDefault();
    }
  }

  toggleRainbowMode() {
    this.isRainbowMode = !this.isRainbowMode;
    if (this.isRainbowMode) {
      this.startRainbowEffect();
    } else {
      clearInterval(this.rainbowInterval);
      this.updateHue();
    }
  }

  startRainbowEffect() {
    clearInterval(this.rainbowInterval);
    this.rainbowInterval = setInterval(() => {
      this.hueValue = (this.hueValue + 5) % 360;
      this.updateHue();
    }, 300);
  }

  refreshLayout() {
    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;
    const isLandscape = windowWidth > windowHeight;

    document.documentElement.style.setProperty('--window-height', `${windowHeight}px`);
    document.documentElement.style.setProperty('--window-width', `${windowWidth}px`);

    this.updateTileSize();
    this.updateUI();

    document.body.style.height = `${windowHeight}px`;
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
      if (element) element.classList.toggle('light-mode', this.isLightMode);
    });

    document.querySelectorAll('.tile').forEach(tile => {
      tile.classList.toggle('light-mode', this.isLightMode);
      this.invertTileDigits(tile);
    });

    this.updateUI();
    this.updateHue();

    document.getElementById('theme-toggle-button').innerHTML = this.isLightMode
      ? '<i class="fas fa-sun"></i>'
      : '<i class="fas fa-moon"></i>';
  }

  invertTileDigits(tile) {
    const value = parseInt(tile.dataset.value || '0');
    if (this.isLightMode) {
      if (value <= 4) {
        tile.style.color = 'var(--tile-' + value + '-text)';
      }
    }
  }

  handleKeyPress(event) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
      this.move(event.key);
      this.updateUI();
      setTimeout(() => {
        if (this.isGameOver()) {
          document.getElementById('game-over').classList.remove('hidden');
          this.showGameState('game-over');
          clearInterval(this.timerInterval);
        }
      }, 0);
    }
  }

  handleTouchStart(e) {
    this.touchStartX = e.touches[0].clientX;
    this.touchStartY = e.touches[0].clientY;
    this.touchStartTime = Date.now();

    if (e.target.closest('#board-container')) {
      e.preventDefault();
    }
  }

  handleTouchEnd(e) {
    if (this.isPaused) return;

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const touchEndTime = Date.now();

    const dx = touchEndX - this.touchStartX;
    const dy = touchEndY - this.touchStartY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    const swipeTime = touchEndTime - this.touchStartTime;

    const swipeSpeed = Math.max(absDx, absDy) / swipeTime;

    const boardSize = document.getElementById('board-container').offsetWidth;
    const minSwipeDistance = boardSize * 0.1;

    if ((swipeSpeed > 0.2 && Math.max(absDx, absDy) > 10) || Math.max(absDx, absDy) > minSwipeDistance) {
      let direction = '';

      if (absDx > absDy * 0.8) {
        direction = dx > 0 ? 'ArrowRight' : 'ArrowLeft';
      } else if (absDy > absDx * 0.8) {
        direction = dy > 0 ? 'ArrowDown' : 'ArrowUp';
      } else {
        direction = absDx > absDy ?
          (dx > 0 ? 'ArrowRight' : 'ArrowLeft') :
          (dy > 0 ? 'ArrowDown' : 'ArrowUp');
      }

      this.move(direction);
      this.updateUI();

      setTimeout(() => {
        if (this.isGameOver()) {
          document.getElementById('game-over').classList.remove('hidden');
          this.showGameState('game-over');
          clearInterval(this.timerInterval);
        }
      }, 0);
    }
  }

  createEmptyBoard() {
    return Array.from({ length: this.size }, () => Array(this.size).fill(''));
  }

  updateTileSize() {
    const boardContainer = document.getElementById('board-container');
    const headerHeight = document.querySelector('header').offsetHeight;
    const scoreHeight = document.getElementById('score-container').offsetHeight;
    const footerHeight = document.querySelector('footer').offsetHeight;

    const availableHeight = window.innerHeight - headerHeight - scoreHeight - footerHeight - 40;
    const availableWidth = window.innerWidth - 40;

    let containerSize = Math.min(availableHeight, availableWidth, 0.8 * window.innerWidth);
    containerSize = Math.max(containerSize, 280);

    boardContainer.style.width = `${containerSize}px`;
    boardContainer.style.height = `${containerSize}px`;

    const gap = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--gap'));
    const tileSize = (containerSize - (this.size + 1) * gap) / this.size;

    document.documentElement.style.setProperty('--tile-size', `${tileSize}px`);

    document.querySelectorAll('.tile').forEach((tile) => {
      const value = tile.textContent;
      let fontSize = tileSize * 0.4;

      if (value && value.length > 3) {
        fontSize = tileSize * (0.4 - (value.length - 3) * 0.05);
      }

      tile.style.fontSize = `${fontSize}px`;
    });

    boardContainer.style.margin = '0 auto';
  }

  addRandomTile() {
    const emptySpots = this.board.flatMap((row, x) => 
      row.map((cell, y) => (cell === '' ? { x, y } : null)).filter(Boolean)
    );
    
    if (emptySpots.length === 0) return false;
    
    const spot = emptySpots[Math.floor(Math.random() * emptySpots.length)];
    
    let probability = 0.9;
    const highTileCount = this.board.flat().filter(cell => cell >= 16).length;
    
    if (highTileCount > 0) {
      probability -= highTileCount * 0.05;
      probability = Math.max(0.7, probability);
    }
    
    this.board[spot.x][spot.y] = Math.random() < probability ? 2 : 4;
    
    this.newTilePosition = { x: spot.x, y: spot.y };
    
    return true;
  }

  updateBestScore() {
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      localStorage.setItem('bestScore', this.bestScore);
      this.updateLeaderboard();
    }
  }

  reset() {
    this.clearAnimations();
    
    this.board = this.createEmptyBoard();
    this.gameState = 'playing';
    this.score = 0;
    this.lastMoveScore = 0;
    this.scoreDelta = 0;
    this.startTime = new Date();
    this.moves = 0;
    this.hasSavedStats = false;
    this.gameStateStack = [];
    this.lastMerged = [];
    
    this.addRandomTile();
    this.addRandomTile();
    
    this.updateUI();
    document.getElementById('game-over').classList.add('hidden');
    this.applyTheme();
    this.updateHue();
    this.startTimer();
  }

  clearAnimations() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.animationInProgress = false;
  }

  slideAndCombine(row) {
    const mergedIndices = [];
    const originalRow = [...row];
    
    let newRow = row.filter(val => val);
    
    for (let i = 0; i < newRow.length - 1; i++) {
      if (newRow[i] === newRow[i + 1]) {
        newRow[i] *= 2;
        
        const scoreIncrement = newRow[i];
        this.scoreDelta += scoreIncrement;
        
        mergedIndices.push(i);
        
        newRow[i + 1] = 0;
        
        if (newRow[i] >= 2048 && this.gameState !== 'won') {
          this.gameState = 'won';
          setTimeout(() => this.showGameState('won'), 500);
        }
      }
    }
    
    newRow = newRow.filter(val => val);
    
    while (newRow.length < this.size) {
      newRow.push('');
    }
    
    return {
      row: newRow,
      changed: JSON.stringify(originalRow) !== JSON.stringify(newRow),
      mergedIndices
    };
  }

  isGameOver() {
    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        if (this.board[i][j] === '') return false;
      }
    }
    
    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        if (j < this.size - 1 && this.board[i][j] === this.board[i][j + 1]) return false;
        if (i < this.size - 1 && this.board[i][j] === this.board[i + 1][j]) return false;
      }
    }
    
    if (this.score > 0 && !this.hasSavedStats) {
      this.saveStats();
      this.hasSavedStats = true;
    }
    
    this.gameState = 'over';
    return true;
  }

  move(direction) {
    if (this.isPaused || this.animationInProgress || this.gameState === 'over' || this.gameState === 'won') return;
    
    this.lastMoveDirection = direction;
    this.lastMoveScore = this.score;
    this.scoreDelta = 0;
    this.lastMerged = [];
    
    this.saveState();
    
    let hasChanged = false;
    let mergedPositions = [];
    
    if (['ArrowUp', 'ArrowDown'].includes(direction)) {
      this.board = this.transpose(this.board);
    }
    if (['ArrowDown', 'ArrowRight'].includes(direction)) {
      this.board = this.board.map(row => row.reverse());
    }
    
    this.board = this.board.map((row, rowIndex) => {
      const result = this.slideAndCombine(row);
      
      if (result.changed) {
        hasChanged = true;
        
        if (result.mergedIndices.length > 0) {
          let positions = result.mergedIndices.map(colIndex => {
            let pos = { row: rowIndex, col: colIndex };
            if (['ArrowDown', 'ArrowRight'].includes(direction)) {
              pos.col = this.size - 1 - colIndex;
            }
            if (['ArrowUp', 'ArrowDown'].includes(direction)) {
              [pos.row, pos.col] = [pos.col, pos.row];
            }
            return pos;
          });
          
          mergedPositions = [...mergedPositions, ...positions];
        }
      }
      
      return result.row;
    });
    
    if (['ArrowDown', 'ArrowRight'].includes(direction)) {
      this.board = this.board.map(row => row.reverse());
    }
    if (['ArrowUp', 'ArrowDown'].includes(direction)) {
      this.board = this.transpose(this.board);
    }
    
    if (hasChanged) {
      this.lastMerged = mergedPositions;
      
      this.score += this.scoreDelta;
      this.updateBestScore();
      
      this.addRandomTile();
      
      this.moves++;
      
      if (this.isRainbowMode) {
        this.startRainbowEffect();
      }
      
      if (this.isGameOver()) {
        document.getElementById('game-over').classList.remove('hidden');
        this.showGameState('game-over');
        clearInterval(this.timerInterval);
      }
    }
    
    this.animateBoard(() => this.updateUI());
  }

  animateBoard(callback) {
    this.animationInProgress = true;
    
    requestAnimationFrame(() => {
      this.updateUI();
      
      this.lastMerged.forEach(pos => {
        const tileElement = this.getTileElement(pos.row, pos.col);
        if (tileElement) {
          tileElement.classList.add('merged');
          
          const flash = document.createElement('div');
          flash.classList.add('merge-flash');
          tileElement.appendChild(flash);
          
          setTimeout(() => {
            tileElement.classList.remove('merged');
            if (flash.parentNode === tileElement) {
              tileElement.removeChild(flash);
            }
          }, 300);
        }
      });
      
      const direction = this.lastMoveDirection;
      if (direction) {
        document.querySelectorAll('.tile').forEach(tile => {
          if (!tile.classList.contains('new-tile')) {
            const slideClass = {
              'ArrowUp': 'slide-up',
              'ArrowDown': 'slide-down',
              'ArrowLeft': 'slide-left',
              'ArrowRight': 'slide-right'
            }[direction];
            
            if (slideClass) {
              tile.classList.add(slideClass);
              setTimeout(() => {
                tile.classList.remove(slideClass);
              }, 200);
            }
          }
        });
      }
      
      if (this.newTilePosition) {
        const tileElement = this.getTileElement(this.newTilePosition.x, this.newTilePosition.y);
        if (tileElement) {
          tileElement.classList.add('new-tile');
          setTimeout(() => {
            tileElement.classList.remove('new-tile');
          }, 300);
        }
        this.newTilePosition = null;
      }
      
      if (this.scoreDelta > 0) {
        const scorePopup = document.createElement('div');
        scorePopup.classList.add('score-popup');
        scorePopup.textContent = `+${this.scoreDelta}`;
        
        const scoreContainer = document.getElementById('score-container');
        const boardContainer = document.getElementById('board-container');
        
        scorePopup.style.top = `${boardContainer.offsetTop + 20}px`;
        scorePopup.style.left = `${boardContainer.offsetLeft + boardContainer.offsetWidth / 2}px`;
        scorePopup.style.transform = 'translateX(-50%)';
        
        document.body.appendChild(scorePopup);
        
        setTimeout(() => {
          if (scorePopup.parentNode) {
            scorePopup.parentNode.removeChild(scorePopup);
          }
        }, 1000);
      }
      
      setTimeout(() => {
        this.animationInProgress = false;
        if (callback) callback();
      }, 300);
    });
  }

  getTileElement(row, col) {
    const tiles = document.querySelectorAll('.tile');
    for (let tile of tiles) {
      if (parseInt(tile.dataset.row) === row && parseInt(tile.dataset.col) === col) {
        return tile;
      }
    }
    return null;
  }

  transpose(matrix) {
    return matrix[0].map((_, i) => matrix.map(row => row[i]));
  }

  updateUI() {
    const boardContainer = document.getElementById('board-container');
    boardContainer.innerHTML = '';
    let highestValue = 0;
    
    this.board.forEach((row, rowIndex) => {
      row.forEach((value, colIndex) => {
        const tile = document.createElement('div');
        tile.classList.add('tile');
        tile.textContent = value !== '' ? value : '';
        
        if (value) {
          tile.setAttribute('data-value', value);
          highestValue = Math.max(highestValue, value);
        }
        
        if (this.isLightMode) {
          tile.classList.add('light-mode');
        }
        
        tile.dataset.row = rowIndex;
        tile.dataset.col = colIndex;
        tile.style.gridRowStart = rowIndex + 1;
        tile.style.gridColumnStart = colIndex + 1;
        boardContainer.appendChild(tile);
      });
    });
    
    const scoreElement = document.getElementById('score');
    const currentScore = parseInt(scoreElement.textContent);
    if (this.score !== currentScore) {
      if (this.scoreDelta > 0) {
        const scorePopup = document.createElement('div');
        scorePopup.classList.add('score-popup');
        scorePopup.textContent = `+${this.scoreDelta}`;
        document.getElementById('score-container').appendChild(scorePopup);
        
        setTimeout(() => {
          scorePopup.remove();
        }, 1000);
      }
      
      scoreElement.textContent = this.score;
      scoreElement.style.color = this.getScoreColor(this.score);
    }
    
    document.getElementById('best-score').textContent = this.bestScore;
    document.getElementById('moves').textContent = this.moves;
    
    this.updateTileSize();
    this.updateHeaderBackground(highestValue);
    this.updateHue();
    
    if (this.isRainbowMode) {
      this.startRainbowEffect();
    }
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
    if (value === '') return 'transparent';
    if (value >= 4096) return 'var(--tile-super-text)';
    return `var(--tile-${value}-text)`;
  }

  getTileColor(value) {
    if (value === '') return 'transparent';
    if (value >= 4096) return 'var(--tile-super-bg)';
    return `var(--tile-${value}-bg)`;
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
      button.style.filter = this.isLightMode ? 'none' : `hue-rotate(${hueRotation}deg)`;
    });
  }

  saveState() {
    const state = {
      board: JSON.stringify(this.board),
      score: this.score,
      moves: this.moves
    };
    
    this.gameStateStack.push(state);
    
    while (this.gameStateStack.length > this.maxUndoSteps) {
      this.gameStateStack.shift();
    }
  }

  undoMove() {
    if (this.gameStateStack.length > 0 && !this.animationInProgress) {
      const previousState = this.gameStateStack.pop();
      this.board = JSON.parse(previousState.board);
      this.score = previousState.score;
      this.moves = previousState.moves;
      
      this.clearAnimations();
      this.newTilePosition = null;
      this.lastMerged = [];
      
      this.updateUI();
    }
  }

  togglePause() {
    this.isPaused = !this.isPaused;
    const boardContainer = document.getElementById('board-container');
    boardContainer.style.pointerEvents = this.isPaused ? 'none' : 'auto';
    if (this.isPaused) {
      clearInterval(this.timerInterval);
      document.getElementById('pause-button').innerHTML = '<i class="fas fa-play"></i>';
    } else {
      this.startTimer();
      document.getElementById('pause-button').innerHTML = '<i class="fas fa-pause"></i>';
    }
  }

  changeBoardSize() {
    const newSize = prompt('Enter board size (e.g., 3 for 3x3, 4 for 4x4):', this.size);
    if (newSize && !isNaN(newSize) && newSize > 2 && newSize < 10) {
      this.size = parseInt(newSize, 10);
      this.reset();
    } else {
      alert('Invalid board size. Please enter a number between 3 and 9.');
    }
  }

  openLeaderboardPage() {
    window.location.href = '../pages/leaderboard.html';
  }

  updateLeaderboard() {
    const entry = { 
      name: 'Player', 
      score: this.score,
      bestTile: Math.max(...this.board.flat()),
      date: new Date().toISOString(),
      moves: this.moves
    };
    
    this.leaderboard = JSON.parse(localStorage.getItem('leaderboard')) || [];
    this.leaderboard.push(entry);
    this.leaderboard.sort((a, b) => b.score - a.score);
    
    if (this.leaderboard.length > 20) {
      this.leaderboard = this.leaderboard.slice(0, 20);
    }
    
    localStorage.setItem('leaderboard', JSON.stringify(this.leaderboard));
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
        moves: this.moves,
        name: 'Player'
      };
      
      this.stats.push(stat);
      localStorage.setItem('gameStats', JSON.stringify(this.stats));
    }
  }

  showGameState(state) {
    if (state === 'game-over') {
      const stateContainer = document.createElement('div');
      stateContainer.classList.add('game-state');
      stateContainer.textContent = 'Game Over!';
      document.body.appendChild(stateContainer);
      setTimeout(() => {
        stateContainer.remove();
      }, 2000);
    } else if (state === 'won') {
      const stateContainer = document.createElement('div');
      stateContainer.classList.add('game-state', 'win-state');
      stateContainer.textContent = 'You Win! Continue playing?';
      
      const continueButton = document.createElement('button');
      continueButton.textContent = 'Continue';
      continueButton.addEventListener('click', () => {
        this.gameState = 'playing';
        stateContainer.remove();
      });
      
      stateContainer.appendChild(continueButton);
      document.body.appendChild(stateContainer);
    }
  }
}

// Add CSS for new animations
const style = document.createElement('style');
style.textContent = `
  .tile.merged {
    animation: merge-animation 0.3s ease;
  }
  
  .tile.new-tile {
    animation: new-tile-animation 0.3s ease;
  }
  
  .score-popup {
    position: absolute;
    top: -20px;
    color: var(--highlight-color);
    font-weight: bold;
    animation: score-popup 1s ease-out;
    pointer-events: none;
  }
  
  @keyframes merge-animation {
    0% { transform: scale(1); }
    50% { transform: scale(1.2); }
    100% { transform: scale(1); }
  }
  
  @keyframes new-tile-animation {
    0% { transform: scale(0); }
    50% { transform: scale(1.1); }
    100% { transform: scale(1); }
  }
  
  @keyframes score-popup {
    0% { opacity: 1; transform: translateY(0); }
    100% { opacity: 0; transform: translateY(-30px); }
  }
  
  .game-state.win-state {
    background-color: rgba(0, 100, 0, 0.7);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 15px;
  }
  
  .game-state button {
    padding: 8px 16px;
    background-color: var(--highlight-color);
    color: black;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
`;
document.head.appendChild(style);

// Instantiate the game 
document.addEventListener('DOMContentLoaded', () => {
  const game = new Game(4);
  game.refreshLayout();
  game.applyTheme();
  game.updateHue();
  window.addEventListener('beforeunload', () => game.saveStats());
  window.addEventListener('orientationchange', () => {
    setTimeout(() => game.refreshLayout(), 300);
  });
  document.body.addEventListener('touchmove', function(e) {
    if (e.target.closest('#board-container')) {
      e.preventDefault();
    }
  }, { passive: false });
});