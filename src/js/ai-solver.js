/**
 * Fancy2048 - AI Solver
 *
 * Expectimax search with:
 *  - Iterative deepening bounded by a hard per-move time budget, so a move is
 *    always returned quickly and the UI thread never freezes (the previous
 *    fixed-depth search could block for seconds on near-empty boards).
 *  - In-place chance-node expansion (mutate/undo) to avoid allocating a board
 *    per empty cell.
 *  - A transposition table (cleared each move) to skip repeated states.
 *  - A cheap positional heuristic (no per-leaf move generation).
 */

class AISolver {
  constructor(gameEngine) {
    this.gameEngine = gameEngine;
    this.difficulty = 'medium';
    this.algorithm = 'expectimax';
    this.isThinking = false;

    // Per-difficulty limits. `depth` caps search depth; `timeBudget` (ms) hard
    // caps thinking time so the UI never locks up; `randomness` adds a little
    // variety to the chosen move at lower difficulties.
    this.algorithms = {
      expectimax: {
        easy:   { depth: 3, timeBudget: 45,  randomness: 0.22 },
        medium: { depth: 6, timeBudget: 110, randomness: 0.05 },
        hard:   { depth: 8, timeBudget: 220, randomness: 0 },
        expert: { depth: 10, timeBudget: 450, randomness: 0 }
      }
    };

    // Transposition table (board+depth+node-type -> score), cleared each move.
    this.evaluationCache = new Map();
    this.maxCacheSize = 200000;

    // Heuristic weights. Raw positional terms (snake/corner) are scaled down so
    // the log-space terms (monotonicity/smoothness) still influence the score.
    this.weights = {
      snakePattern: 0.018,
      cornerGradient: 0.06,
      monotonicity: 6.0,
      smoothness: 3.5,
      emptySpaces: 14.0,
      mergePotential: 0.4,
      clusteringPenalty: 1.2
    };

    // Snake weights are generated lazily per board size and cached.
    this.snakeWeightCache = {};

    // Performance / quality statistics.
    this.stats = {
      evaluations: 0,
      cacheHits: 0,
      totalThinkingTime: 0,
      movesCalculated: 0,
      lastDepth: 0
    };

    // Internal search state.
    this._deadline = 0;
    this._timedOut = false;
  }

  /**
   * Settings for the active difficulty.
   */
  get settings() {
    return this.algorithms.expectimax[this.difficulty];
  }

  /**
   * Set AI difficulty.
   */
  setDifficulty(difficulty) {
    if (this.algorithms.expectimax[difficulty]) {
      this.difficulty = difficulty;
      this.clearCache();
    }
  }

  /**
   * Compute the best move for the current game board.
   * Always resolves quickly (bounded by the difficulty's time budget).
   */
  async getBestMove() {
    if (this.isThinking) return null;
    if (this.gameEngine && this.gameEngine.isGameOver) return null;

    this.isThinking = true;
    const start = Date.now();

    try {
      const board = this.gameEngine.board;
      if (!Array.isArray(board)) {
        throw new Error('Invalid board state');
      }

      const moves = this.getPossibleMoves(board);
      if (moves.length === 0) return null;
      if (moves.length === 1) return moves[0].direction;

      const settings = this.settings;
      this._deadline = start + settings.timeBudget;
      this.evaluationCache.clear();

      // Iterative deepening: keep the best move from the deepest depth that
      // completed before the deadline. Depth 1 is cheap and always completes,
      // guaranteeing a sensible move even under a tiny budget.
      let bestMove = moves[0].direction;
      let completedDepth = 0;

      for (let depth = 1; depth <= settings.depth; depth++) {
        this._timedOut = false;
        const result = this.searchRoot(moves, depth, settings.randomness);

        if (this._timedOut) break; // discard this incomplete depth
        bestMove = result.move;
        completedDepth = depth;

        if (Date.now() >= this._deadline) break;
        // Let the UI thread breathe between depths.
        await this.yieldControl();
      }

      this.stats.movesCalculated++;
      this.stats.totalThinkingTime += Date.now() - start;
      this.stats.lastDepth = completedDepth;

      return bestMove;
    } catch (error) {
      console.error('AI Error:', error);
      const moves = this.getPossibleMoves(this.gameEngine.board);
      return moves.length > 0 ? this.getCornerBasedMove(moves) : null;
    } finally {
      this.isThinking = false;
    }
  }

  /**
   * Evaluate every root move at the given depth and return the best one.
   */
  searchRoot(moves, depth, randomness) {
    let bestScore = -Infinity;
    let bestMove = moves[0].direction;

    for (const move of moves) {
      let score = this.expectimax(move.board, depth - 1, false);
      if (this._timedOut) {
        return { move: bestMove, score: bestScore };
      }

      if (randomness > 0) {
        score += (Math.random() - 0.5) * randomness * Math.abs(score);
      }

      if (score > bestScore) {
        bestScore = score;
        bestMove = move.direction;
      }
    }

    return { move: bestMove, score: bestScore };
  }

  /**
   * Expectimax with alternating max (player) and chance (random tile) nodes.
   * Aborts cooperatively once the deadline passes (sets `_timedOut`).
   */
  expectimax(board, depth, isChance) {
    if (this._timedOut) return 0;
    if (Date.now() >= this._deadline) {
      this._timedOut = true;
      return 0;
    }

    if (depth <= 0) {
      this.stats.evaluations++;
      return this.evaluateBoard(board);
    }

    const cacheKey = this.getBoardKey(board) + '|' + depth + '|' + (isChance ? 'c' : 'm');
    const cached = this.evaluationCache.get(cacheKey);
    if (cached !== undefined) {
      this.stats.cacheHits++;
      return cached;
    }

    let result;

    if (isChance) {
      // Computer's turn: expected value over each empty cell getting a 2 (90%)
      // or 4 (10%). Mutate the board in place and undo to avoid allocations.
      const emptyCells = this.getEmptyCells(board);
      if (emptyCells.length === 0) {
        result = this.evaluateBoard(board);
      } else {
        let sum = 0;
        for (const cell of emptyCells) {
          board[cell.row][cell.col] = 2;
          const score2 = this.expectimax(board, depth - 1, false);
          board[cell.row][cell.col] = 4;
          const score4 = this.expectimax(board, depth - 1, false);
          board[cell.row][cell.col] = 0;

          if (this._timedOut) return 0;
          sum += 0.9 * score2 + 0.1 * score4;
        }
        result = sum / emptyCells.length;
      }
    } else {
      // Player's turn: maximize over the available moves.
      const moves = this.getPossibleMoves(board);
      if (moves.length === 0) {
        result = this.evaluateBoard(board); // no moves available
      } else {
        result = -Infinity;
        for (const move of moves) {
          const score = this.expectimax(move.board, depth - 1, true);
          if (this._timedOut) return 0;
          if (score > result) result = score;
        }
      }
    }

    if (this.evaluationCache.size < this.maxCacheSize) {
      this.evaluationCache.set(cacheKey, result);
    }
    return result;
  }

  /**
   * Static positional evaluation of a board (higher is better).
   *
   * Combines a snake gradient + corner anchoring (which force a monotonic
   * chain toward one corner), monotonicity and smoothness (in log2 space),
   * open space, ready merges, and a clustering penalty. Weights keep the
   * positional and log-space terms on a comparable scale so each matters.
   */
  evaluateBoard(board) {
    const phase = this.getGamePhase(board);

    // Phase-aware weighting: value open space early, structure late.
    const w = { ...this.weights };
    if (phase === 'early') {
      w.emptySpaces += 6;
    } else if (phase === 'mid') {
      w.monotonicity += 2;
    } else { // late / end
      w.monotonicity += 3;
      w.snakePattern += 0.01;
      w.cornerGradient += 0.04;
    }

    let score = 0;
    score += this.evaluateSnakePattern(board) * w.snakePattern;
    score += this.evaluateCornerGradient(board) * w.cornerGradient;
    score += this.evaluateMonotonicity(board) * w.monotonicity;
    score += this.evaluateSmoothness(board) * w.smoothness;
    score += this.evaluateEmptySpaces(board) * w.emptySpaces;
    score += this.evaluateMergePotential(board) * w.mergePotential;
    score -= this.evaluateClusteringPenalty(board) * w.clusteringPenalty;
    return score;
  }

  /**
   * Determine game phase for dynamic weighting.
   */
  getGamePhase(board) {
    const maxTile = Math.max(...board.flat());
    const empty = this.getEmptyCells(board).length;
    if (maxTile < 128) return 'early';
    if (maxTile < 1024) return empty > 4 ? 'mid' : 'late';
    return empty > 2 ? 'late' : 'end';
  }

  /**
   * Generate snake (boustrophedon) weights for any board size, cached per size.
   * The maximum weight sits in a corner and decreases along a snake path,
   * encouraging a monotonic chain toward that corner. Returns all four
   * corner orientations.
   */
  generateSnakeWeights(size = 4) {
    if (this.snakeWeightCache[size]) {
      return this.snakeWeightCache[size];
    }

    const topLeft = [];
    for (let i = 0; i < size; i++) {
      const row = [];
      const rowFromBottom = size - 1 - i;
      const base = size * rowFromBottom;
      for (let j = 0; j < size; j++) {
        row.push(rowFromBottom % 2 === 0 ? base + j : base + (size - 1 - j));
      }
      topLeft.push(row);
    }

    const mirrorCols = grid => grid.map(row => [...row].reverse());
    const mirrorRows = grid => [...grid].reverse();

    const weights = {
      topLeft,
      topRight: mirrorCols(topLeft),
      bottomLeft: mirrorRows(topLeft),
      bottomRight: mirrorRows(mirrorCols(topLeft))
    };

    this.snakeWeightCache[size] = weights;
    return weights;
  }

  /**
   * Reward tiles arranged along a snake path toward a corner.
   */
  evaluateSnakePattern(board) {
    const size = board.length;
    const snakeWeights = this.generateSnakeWeights(size);
    const patterns = [
      snakeWeights.topLeft,
      snakeWeights.topRight,
      snakeWeights.bottomLeft,
      snakeWeights.bottomRight
    ];

    let bestPatternScore = -Infinity;
    for (const pattern of patterns) {
      let patternScore = 0;
      for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
          if (board[i][j] > 0) {
            patternScore += board[i][j] * pattern[i][j];
          }
        }
      }
      if (patternScore > bestPatternScore) bestPatternScore = patternScore;
    }

    return bestPatternScore;
  }

  /**
   * Reward keeping the maximum tile in a corner (or at least on an edge).
   */
  evaluateCornerGradient(board) {
    const size = board.length;
    let maxTile = 0;
    let maxPos = { row: -1, col: -1 };

    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        if (board[i][j] > maxTile) {
          maxTile = board[i][j];
          maxPos = { row: i, col: j };
        }
      }
    }

    if (maxTile === 0) return 0;

    const onTopOrBottom = maxPos.row === 0 || maxPos.row === size - 1;
    const onLeftOrRight = maxPos.col === 0 || maxPos.col === size - 1;

    if (onTopOrBottom && onLeftOrRight) return maxTile * 10; // corner
    if (onTopOrBottom || onLeftOrRight) return maxTile * 5;  // edge
    return 0;
  }

  /**
   * Reward monotonic (ordered) rows and columns.
   */
  evaluateMonotonicity(board) {
    const size = board.length;
    let total = 0;

    for (let i = 0; i < size; i++) {
      total += this.calculateDirectionalMonotonicity(board[i]);
    }
    for (let j = 0; j < size; j++) {
      const column = board.map(row => row[j]);
      total += this.calculateDirectionalMonotonicity(column);
    }

    return total;
  }

  calculateDirectionalMonotonicity(array) {
    let increasing = 0;
    let decreasing = 0;

    for (let i = 0; i < array.length - 1; i++) {
      const current = array[i] > 0 ? Math.log2(array[i]) : 0;
      const next = array[i + 1] > 0 ? Math.log2(array[i + 1]) : 0;

      if (current > next) decreasing += current - next;
      else if (current < next) increasing += next - current;
    }

    return Math.max(increasing, decreasing);
  }

  /**
   * Reward neighbouring tiles with similar values (easier merges). Returned as
   * a non-negative "smoothness" value (higher is smoother).
   */
  evaluateSmoothness(board) {
    const size = board.length;
    let penalty = 0;

    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        if (board[i][j] <= 0) continue;
        const currentLog = Math.log2(board[i][j]);

        if (j < size - 1 && board[i][j + 1] > 0) {
          penalty += Math.abs(currentLog - Math.log2(board[i][j + 1]));
        }
        if (i < size - 1 && board[i + 1][j] > 0) {
          penalty += Math.abs(currentLog - Math.log2(board[i + 1][j]));
        }
      }
    }

    // Higher = smoother. Negative penalty offset so smoother boards score more.
    return -penalty;
  }

  /**
   * Reward open space (quadratic so the difference grows as the board fills).
   */
  evaluateEmptySpaces(board) {
    const empty = this.getEmptyCells(board).length;
    return empty * empty;
  }

  /**
   * Reward adjacent equal tiles (immediate merge potential).
   */
  evaluateMergePotential(board) {
    const size = board.length;
    let mergePotential = 0;

    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        const value = board[i][j];
        if (value <= 0) continue;
        if (j < size - 1 && board[i][j + 1] === value) mergePotential += value;
        if (i < size - 1 && board[i + 1][j] === value) mergePotential += value;
      }
    }

    return mergePotential;
  }

  /**
   * Penalize spreading high-value tiles apart (prefer keeping them grouped).
   */
  evaluateClusteringPenalty(board) {
    const size = board.length;
    const highTiles = [];

    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        if (board[i][j] >= 128) highTiles.push([i, j]);
      }
    }

    let penalty = 0;
    for (let a = 0; a < highTiles.length; a++) {
      for (let b = a + 1; b < highTiles.length; b++) {
        penalty += Math.abs(highTiles[a][0] - highTiles[b][0]) +
                   Math.abs(highTiles[a][1] - highTiles[b][1]);
      }
    }

    return penalty;
  }

  /**
   * Fallback move favouring a stable corner strategy.
   */
  getCornerBasedMove(possibleMoves) {
    const priorities = ['down', 'left', 'right', 'up'];
    for (const direction of priorities) {
      const found = possibleMoves.find(move => move.direction === direction);
      if (found) return found.direction;
    }
    return possibleMoves[0].direction;
  }

  /**
   * Every move that actually changes the board, with the resulting board.
   */
  getPossibleMoves(board) {
    const moves = [];
    const directions = ['up', 'down', 'left', 'right'];

    for (const direction of directions) {
      const newBoard = this.simulateMove(board, direction);
      if (!this.boardsEqual(board, newBoard)) {
        moves.push({ direction, board: newBoard });
      }
    }

    return moves;
  }

  /**
   * Simulate a move without touching the live game, returning a new board.
   */
  simulateMove(board, direction) {
    const newBoard = this.copyBoard(board);
    switch (direction) {
      case 'up': return this.simulateMoveUp(newBoard);
      case 'down': return this.simulateMoveDown(newBoard);
      case 'left': return this.simulateMoveLeft(newBoard);
      case 'right': return this.simulateMoveRight(newBoard);
      default: return newBoard;
    }
  }

  simulateMoveUp(board) {
    const size = board.length;
    for (let col = 0; col < size; col++) {
      const column = board.map(row => row[col]);
      const newColumn = this.moveAndMergeArray(column);
      for (let row = 0; row < size; row++) board[row][col] = newColumn[row];
    }
    return board;
  }

  simulateMoveDown(board) {
    const size = board.length;
    for (let col = 0; col < size; col++) {
      const column = board.map(row => row[col]).reverse();
      const newColumn = this.moveAndMergeArray(column).reverse();
      for (let row = 0; row < size; row++) board[row][col] = newColumn[row];
    }
    return board;
  }

  simulateMoveLeft(board) {
    const size = board.length;
    for (let row = 0; row < size; row++) {
      board[row] = this.moveAndMergeArray([...board[row]]);
    }
    return board;
  }

  simulateMoveRight(board) {
    const size = board.length;
    for (let row = 0; row < size; row++) {
      const reversed = [...board[row]].reverse();
      board[row] = this.moveAndMergeArray(reversed).reverse();
    }
    return board;
  }

  /**
   * Slide and merge a single line toward index 0 (same rules as the engine).
   */
  moveAndMergeArray(array) {
    const size = array.length;
    const filtered = array.filter(val => val !== 0);
    const result = [];
    let i = 0;

    while (i < filtered.length) {
      if (i < filtered.length - 1 && filtered[i] === filtered[i + 1]) {
        result.push(filtered[i] * 2);
        i += 2;
      } else {
        result.push(filtered[i]);
        i++;
      }
    }

    while (result.length < size) result.push(0);
    return result;
  }

  copyBoard(board) {
    return board.map(row => [...row]);
  }

  getEmptyCells(board) {
    const emptyCells = [];
    const size = board.length;
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        if (board[i][j] === 0) emptyCells.push({ row: i, col: j });
      }
    }
    return emptyCells;
  }

  boardsEqual(board1, board2) {
    const size = board1.length;
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        if (board1[i][j] !== board2[i][j]) return false;
      }
    }
    return true;
  }

  getBoardKey(board) {
    return board.map(row => row.join(',')).join(';');
  }

  clearCache() {
    this.evaluationCache.clear();
  }

  /**
   * Yield to the event loop so the UI can update between search depths.
   */
  yieldControl() {
    return new Promise(resolve => setTimeout(resolve, 0));
  }

  /**
   * Best move as a hint (same computation as auto-play).
   */
  async getHint() {
    return this.getBestMove();
  }

  /**
   * Solver statistics.
   */
  getStats() {
    return {
      difficulty: this.difficulty,
      algorithm: this.algorithm,
      depth: this.settings.depth,
      timeBudget: this.settings.timeBudget,
      lastDepth: this.stats.lastDepth,
      cacheSize: this.evaluationCache.size,
      isThinking: this.isThinking,
      evaluations: this.stats.evaluations,
      cacheHits: this.stats.cacheHits,
      averageThinkingTime: this.stats.movesCalculated > 0
        ? this.stats.totalThinkingTime / this.stats.movesCalculated : 0,
      cacheHitRate: this.stats.evaluations > 0
        ? (this.stats.cacheHits / this.stats.evaluations * 100).toFixed(1) + '%' : '0%'
    };
  }
}

// Make AISolver available globally
if (typeof window !== 'undefined') {
  window.AISolver = AISolver;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AISolver;
}
