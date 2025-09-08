/**
 * Fancy2048 - Game Engine
 * Core game logic and state management
 */

class GameEngine {
  constructor() {
    this.size = 4;
    this.board = [];
    this.score = 0;
    this.moves = 0;
    this.startTime = null;
    this.isGameOver = false;
    this.hasWon = false;
    this.continueAfterWin = false;
    
    // Game history for undo functionality
    this.history = [];
    this.maxHistorySize = 10;
    
    // Callbacks for UI updates
    this.callbacks = {
      onBoardUpdate: null,
      onScoreUpdate: null,
      onGameOver: null,
      onWin: null,
      onMove: null
    };
    
    this.initialize();
  }

  /**
   * Initialize the game
   */
  initialize() {
    this.createEmptyBoard();
    this.addRandomTile();
    this.addRandomTile();
    this.startTime = Date.now();
    this.isGameOver = false;
    this.hasWon = false;
    this.continueAfterWin = false;
    this.history = [];
    this.saveState();
  }

  /**
   * Set board size and reinitialize
   */
  setBoardSize(size) {
    this.size = size;
    this.initialize();
  }

  /**
   * Create empty board
   */
  createEmptyBoard() {
    this.board = Array(this.size).fill(null).map(() => 
      Array(this.size).fill(0)
    );
  }

  /**
   * Get empty cells
   */
  getEmptyCells() {
    const emptyCells = [];
    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        if (this.board[i][j] === 0) {
          emptyCells.push({ row: i, col: j });
        }
      }
    }
    return emptyCells;
  }

  /**
   * Add random tile (2 or 4) to empty cell
   */
  addRandomTile() {
    const emptyCells = this.getEmptyCells();
    if (emptyCells.length === 0) return false;
    
    const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    const value = Math.random() < 0.9 ? 2 : 4;
    
    this.board[randomCell.row][randomCell.col] = value;
    return true;
  }

  /**
   * Save current state for undo
   */
  saveState() {
    const state = {
      board: this.board.map(row => [...row]),
      score: this.score,
      moves: this.moves
    };
    
    this.history.push(state);
    
    // Limit history size
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }
  }

  /**
   * Undo last move
   */
  undo() {
    if (this.history.length < 2) return false;
    
    // Remove current state
    this.history.pop();
    
    // Restore previous state
    const previousState = this.history[this.history.length - 1];
    this.board = previousState.board.map(row => [...row]);
    this.score = previousState.score;
    this.moves = previousState.moves;
    
    this.isGameOver = false;
    this.notifyBoardUpdate();
    this.notifyScoreUpdate();
    
    return true;
  }

  /**
   * Check if undo is available
   */
  canUndo() {
    return this.history.length > 1 && !this.isGameOver;
  }

  /**
   * Move tiles in specified direction
   */
  move(direction) {
    if (this.isGameOver) return false;
    
    const previousBoard = this.board.map(row => [...row]);
    const previousScore = this.score;
    let moved = false;
    
    switch (direction) {
      case 'up':
        moved = this.moveUp();
        break;
      case 'down':
        moved = this.moveDown();
        break;
      case 'left':
        moved = this.moveLeft();
        break;
      case 'right':
        moved = this.moveRight();
        break;
      default:
        return false;
    }
    
    if (moved) {
      this.moves++;
      this.saveState();
      this.addRandomTile();
      this.notifyBoardUpdate();
      this.notifyScoreUpdate();
      this.notifyMove(direction);
      
      // Check for win condition
      if (!this.hasWon && this.checkWin()) {
        this.hasWon = true;
        this.notifyWin();
      }
      
      // Check for game over
      if (this.checkGameOver()) {
        this.isGameOver = true;
        this.notifyGameOver();
      }
    }
    
    return moved;
  }

  /**
   * Move tiles up
   */
  moveUp() {
    let moved = false;
    
    for (let col = 0; col < this.size; col++) {
      const column = this.getColumn(col);
      const newColumn = this.moveAndMergeArray(column);
      
      if (!this.arraysEqual(column, newColumn)) {
        moved = true;
        this.setColumn(col, newColumn);
      }
    }
    
    return moved;
  }

  /**
   * Move tiles down
   */
  moveDown() {
    let moved = false;
    
    for (let col = 0; col < this.size; col++) {
      const column = this.getColumn(col);
      const reversedColumn = [...column].reverse();
      const newReversedColumn = this.moveAndMergeArray(reversedColumn);
      const newColumn = [...newReversedColumn].reverse();
      
      if (!this.arraysEqual(column, newColumn)) {
        moved = true;
        this.setColumn(col, newColumn);
      }
    }
    
    return moved;
  }

  /**
   * Move tiles left
   */
  moveLeft() {
    let moved = false;
    
    for (let row = 0; row < this.size; row++) {
      const rowArray = [...this.board[row]];
      const newRow = this.moveAndMergeArray(rowArray);
      
      if (!this.arraysEqual(rowArray, newRow)) {
        moved = true;
        this.board[row] = newRow;
      }
    }
    
    return moved;
  }

  /**
   * Move tiles right
   */
  moveRight() {
    let moved = false;
    
    for (let row = 0; row < this.size; row++) {
      const rowArray = [...this.board[row]];
      const reversedRow = [...rowArray].reverse();
      const newReversedRow = this.moveAndMergeArray(reversedRow);
      const newRow = [...newReversedRow].reverse();
      
      if (!this.arraysEqual(rowArray, newRow)) {
        moved = true;
        this.board[row] = newRow;
      }
    }
    
    return moved;
  }

  /**
   * Move and merge array (core algorithm)
   */
  moveAndMergeArray(array) {
    // Remove zeros
    const filtered = array.filter(val => val !== 0);
    const result = [];
    let i = 0;
    
    while (i < filtered.length) {
      if (i < filtered.length - 1 && filtered[i] === filtered[i + 1]) {
        // Merge tiles
        const mergedValue = filtered[i] * 2;
        result.push(mergedValue);
        this.score += mergedValue;
        i += 2;
      } else {
        result.push(filtered[i]);
        i++;
      }
    }
    
    // Fill with zeros
    while (result.length < this.size) {
      result.push(0);
    }
    
    return result;
  }

  /**
   * Get column as array
   */
  getColumn(colIndex) {
    return this.board.map(row => row[colIndex]);
  }

  /**
   * Set column from array
   */
  setColumn(colIndex, column) {
    for (let i = 0; i < this.size; i++) {
      this.board[i][colIndex] = column[i];
    }
  }

  /**
   * Check if two arrays are equal
   */
  arraysEqual(a, b) {
    return a.length === b.length && a.every((val, i) => val === b[i]);
  }

  /**
   * Check win condition (2048 tile reached)
   */
  checkWin() {
    if (this.continueAfterWin) return false;
    
    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        if (this.board[i][j] === 2048) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Continue game after winning
   */
  continueGame() {
    this.continueAfterWin = true;
  }

  /**
   * Check game over condition
   */
  checkGameOver() {
    // If there are empty cells, game is not over
    if (this.getEmptyCells().length > 0) {
      return false;
    }
    
    // Check for possible merges
    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        const currentValue = this.board[i][j];
        
        // Check adjacent cells
        const adjacent = [
          { row: i - 1, col: j },
          { row: i + 1, col: j },
          { row: i, col: j - 1 },
          { row: i, col: j + 1 }
        ];
        
        for (const adj of adjacent) {
          if (adj.row >= 0 && adj.row < this.size && 
              adj.col >= 0 && adj.col < this.size &&
              this.board[adj.row][adj.col] === currentValue) {
            return false; // Merge is possible
          }
        }
      }
    }
    
    return true; // No moves possible
  }

  /**
   * Get highest tile value
   */
  getHighestTile() {
    let highest = 0;
    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        highest = Math.max(highest, this.board[i][j]);
      }
    }
    return highest;
  }

  /**
   * Get game duration in seconds
   */
  getDuration() {
    if (!this.startTime) return 0;
    return Math.floor((Date.now() - this.startTime) / 1000);
  }

  /**
   * Get game state for saving/loading
   */
  getGameState() {
    return {
      board: this.board.map(row => [...row]),
      score: this.score,
      moves: this.moves,
      size: this.size,
      startTime: this.startTime,
      isGameOver: this.isGameOver,
      hasWon: this.hasWon,
      continueAfterWin: this.continueAfterWin,
      history: this.history
    };
  }

  /**
   * Load game state
   */
  loadGameState(state) {
    this.board = state.board.map(row => [...row]);
    this.score = state.score || 0;
    this.moves = state.moves || 0;
    this.size = state.size || 4;
    this.startTime = state.startTime || Date.now();
    this.isGameOver = state.isGameOver || false;
    this.hasWon = state.hasWon || false;
    this.continueAfterWin = state.continueAfterWin || false;
    this.history = state.history || [];
    
    this.notifyBoardUpdate();
    this.notifyScoreUpdate();
  }

  /**
   * Get all possible moves for AI
   */
  getPossibleMoves() {
    const moves = [];
    const directions = ['up', 'down', 'left', 'right'];
    
    for (const direction of directions) {
      const testEngine = new GameEngine();
      testEngine.board = this.board.map(row => [...row]);
      testEngine.score = this.score;
      testEngine.size = this.size;
      
      if (testEngine.move(direction)) {
        moves.push({
          direction,
          board: testEngine.board,
          score: testEngine.score
        });
      }
    }
    
    return moves;
  }

  /**
   * Callback registration methods
   */
  onBoardUpdate(callback) {
    this.callbacks.onBoardUpdate = callback;
  }

  onScoreUpdate(callback) {
    this.callbacks.onScoreUpdate = callback;
  }

  onGameOver(callback) {
    this.callbacks.onGameOver = callback;
  }

  onWin(callback) {
    this.callbacks.onWin = callback;
  }

  onMove(callback) {
    this.callbacks.onMove = callback;
  }

  /**
   * Notification methods
   */
  notifyBoardUpdate() {
    if (this.callbacks.onBoardUpdate) {
      this.callbacks.onBoardUpdate(this.board);
    }
  }

  notifyScoreUpdate() {
    if (this.callbacks.onScoreUpdate) {
      this.callbacks.onScoreUpdate(this.score, this.moves);
    }
  }

  notifyGameOver() {
    if (this.callbacks.onGameOver) {
      const result = {
        score: this.score,
        moves: this.moves,
        duration: this.getDuration(),
        highestTile: this.getHighestTile(),
        boardSize: this.size,
        won: false,
        isAI: false
      };
      this.callbacks.onGameOver(result);
    }
  }

  notifyWin() {
    if (this.callbacks.onWin) {
      const result = {
        score: this.score,
        moves: this.moves,
        duration: this.getDuration(),
        highestTile: this.getHighestTile(),
        boardSize: this.size,
        won: true,
        isAI: false
      };
      this.callbacks.onWin(result);
    }
  }

  notifyMove(direction) {
    if (this.callbacks.onMove) {
      this.callbacks.onMove(direction, this.moves);
    }
  }

  /**
   * New game
   */
  newGame() {
    this.score = 0;
    this.moves = 0;
    this.initialize();
    this.notifyBoardUpdate();
    this.notifyScoreUpdate();
  }
}

// Make GameEngine available globally
if (typeof window !== 'undefined') {
  window.GameEngine = GameEngine;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GameEngine;
}
