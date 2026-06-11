/**
 * Fancy2048 - AI Solver
 *
 * Expectimax search using the heuristic from nneonneo's 2048-ai
 * (https://github.com/nneonneo/2048-ai), the strongest documented 2048 AI
 * (~100% win rate at 4x4). The board is scored per row and per column with
 * four terms — open space, available merges, monotonicity (a strong gradient
 * toward a corner) and a penalty on large scattered values — using the same
 * weights and exponents nneonneo tuned. Unlike the original (a 4x4-only bitboard
 * with lookup tables), this computes the heuristic directly so it works for
 * every board size the game offers (3-6).
 *
 * Search features:
 *  - Iterative deepening bounded by a hard per-move time budget, so a move is
 *    always returned quickly and the UI thread never freezes.
 *  - Probability-cutoff pruning (nneonneo's CPROB_THRESH_BASE): chance branches
 *    whose cumulative probability falls below a threshold are evaluated
 *    statically instead of expanded, which lets the search reach much deeper
 *    along the likely lines.
 *  - In-place chance-node expansion (mutate/undo) to avoid allocating a board
 *    per empty cell.
 *  - A transposition table (cleared each move) to skip repeated states.
 *  - A large penalty for states with no legal move, so the AI actively avoids
 *    dead ends.
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

    // nneonneo's heuristic weights (the linear terms the learner may tune).
    this.weights = {
      emptyWeight: 270.0,
      mergesWeight: 700.0,
      monotonicityWeight: 47.0,
      sumWeight: 11.0
    };

    // Fixed exponents from nneonneo (kept out of the learner: large powers are
    // numerically unstable to mutate). Ranks are integer log2 tile values, so
    // rank^power is precomputed into a small lookup table.
    this.monotonicityPower = 4.0;
    this.sumPower = 3.5;
    this.MAX_RANK = 20;
    this._powMono = [];
    this._powSum = [];
    for (let r = 0; r <= this.MAX_RANK; r++) {
      this._powMono[r] = Math.pow(r, this.monotonicityPower);
      this._powSum[r] = Math.pow(r, this.sumPower);
    }

    // Search tuning.
    this.probThreshold = 0.0001; // prune chance branches below this probability
    this.LOST_PENALTY = 1e6;     // strongly discourage dead-end (no-move) states

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
   *
   * After the player's move a random tile spawns, so the layer below the root
   * is a chance node (this is what makes it expectimax rather than a plain
   * two-ply max search).
   */
  searchRoot(moves, depth, randomness) {
    let bestScore = -Infinity;
    let bestMove = moves[0].direction;

    for (const move of moves) {
      let score = this.expectimax(move.board, depth - 1, true, 1);
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
   *
   * `cprob` is the cumulative probability of reaching this node. Chance
   * branches below `probThreshold` are scored statically instead of expanded,
   * concentrating the search budget on the lines that actually matter.
   * Aborts cooperatively once the deadline passes (sets `_timedOut`).
   */
  expectimax(board, depth, isChance, cprob) {
    if (this._timedOut) return 0;
    if (Date.now() >= this._deadline) {
      this._timedOut = true;
      return 0;
    }

    if (depth <= 0 || cprob < this.probThreshold) {
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
      const n = emptyCells.length;
      if (n === 0) {
        result = this.evaluateBoard(board);
      } else {
        let sum = 0;
        const p2 = 0.9 / n;
        const p4 = 0.1 / n;
        for (const cell of emptyCells) {
          board[cell.row][cell.col] = 2;
          const score2 = this.expectimax(board, depth - 1, false, cprob * p2);
          board[cell.row][cell.col] = 4;
          const score4 = this.expectimax(board, depth - 1, false, cprob * p4);
          board[cell.row][cell.col] = 0;

          if (this._timedOut) return 0;
          sum += 0.9 * score2 + 0.1 * score4;
        }
        result = sum / n;
      }
    } else {
      // Player's turn: maximize over the available moves.
      const moves = this.getPossibleMoves(board);
      if (moves.length === 0) {
        // No legal move: this line dead-ends. Penalize heavily so the AI
        // steers away from positions that can be forced into a loss.
        result = this.evaluateBoard(board) - this.LOST_PENALTY;
      } else {
        result = -Infinity;
        for (const move of moves) {
          const score = this.expectimax(move.board, depth - 1, true, cprob);
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
   * Static evaluation of a board (higher is better), summed over every row and
   * every column using nneonneo's heuristic. Rows and columns are scored with
   * the same per-line function, so structure along both axes is rewarded.
   */
  evaluateBoard(board) {
    const size = board.length;
    let score = 0;

    // Rows.
    for (let i = 0; i < size; i++) {
      score += this.evaluateLine(board[i]);
    }
    // Columns.
    for (let j = 0; j < size; j++) {
      const col = new Array(size);
      for (let i = 0; i < size; i++) col[i] = board[i][j];
      score += this.evaluateLine(col);
    }

    return score;
  }

  /**
   * nneonneo's per-line heuristic:
   *   emptyWeight * (empty cells)
   * + mergesWeight * (runs of equal adjacent tiles)
   * - monotonicityWeight * min(left-leaning, right-leaning gradient)
   * - sumWeight * (sum of rank^sumPower)
   * where rank = log2(value) and empty cells count as rank 0.
   */
  evaluateLine(line) {
    const n = line.length;
    const w = this.weights;
    const powMono = this._powMono;
    const powSum = this._powSum;

    let empty = 0;
    let sum = 0;
    let merges = 0;
    let prevRank = -1;
    let counter = 0;

    for (let i = 0; i < n; i++) {
      const v = line[i];
      if (v <= 0) {
        empty++;
        continue;
      }
      const rank = this.rankOf(v);
      sum += powSum[rank];

      if (prevRank === rank) {
        counter++;
      } else if (counter > 0) {
        merges += 1 + counter;
        counter = 0;
      }
      prevRank = rank;
    }
    if (counter > 0) merges += 1 + counter;

    // Monotonicity over adjacent ranks (empties contribute rank 0). We keep the
    // smaller of the two directional gradients so a line that is monotonic in
    // either direction is penalized least.
    let monoLeft = 0;
    let monoRight = 0;
    let prevPow = powMono[this.rankOf(line[0])];
    for (let i = 1; i < n; i++) {
      const curPow = powMono[this.rankOf(line[i])];
      if (prevPow > curPow) monoLeft += prevPow - curPow;
      else monoRight += curPow - prevPow;
      prevPow = curPow;
    }

    return w.emptyWeight * empty
         + w.mergesWeight * merges
         - w.monotonicityWeight * Math.min(monoLeft, monoRight)
         - w.sumWeight * sum;
  }

  /**
   * Integer rank (log2) of a tile value, 0 for empty, clamped to the pow table.
   */
  rankOf(value) {
    if (value <= 0) return 0;
    const r = Math.round(Math.log2(value));
    return r > this.MAX_RANK ? this.MAX_RANK : r;
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
