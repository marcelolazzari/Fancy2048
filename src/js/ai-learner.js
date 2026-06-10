/**
 * Fancy2048 - AI Learner
 *
 * Lets the AI improve from its own play. The expectimax solver scores boards
 * with a set of heuristic weights; this module treats those weights as
 * parameters and tunes them with a (1+1) evolution strategy:
 *
 *   1. Play a few games with a candidate ("trial") set of weights.
 *   2. Average the trial's fitness (score + tiles reached).
 *   3. If it beats the current best, adopt it; otherwise discard it and
 *      mutate the best again.
 *
 * The best weights and progress are persisted to localStorage, so the AI keeps
 * what it has learned across games and sessions. Weights are tracked per board
 * size (3-6) because the ideal balance differs by size; every difficulty shares
 * the learned weights for its size (they only change search depth).
 */

class AILearner {
  constructor(options = {}) {
    this.storageKey = options.storageKey || 'fancy2048_ai_learning';
    this.evalGames = options.evalGames || 3;     // games averaged per candidate
    this.stepSize = options.stepSize || 0.12;    // mutation strength

    // Defaults MUST match the solver's starting weights (passed in by the app).
    this.defaultWeights = { ...(options.defaultWeights || {
      snakePattern: 0.018,
      cornerGradient: 0.06,
      monotonicity: 6.0,
      smoothness: 3.5,
      emptySpaces: 14.0,
      mergePotential: 0.4,
      clusteringPenalty: 1.2
    }) };
    this.keys = Object.keys(this.defaultWeights);

    this.state = this.load();
  }

  defaultSizeState() {
    return {
      best: { ...this.defaultWeights },
      bestFitness: null,
      trial: null,
      results: [],
      generation: 0,
      games: 0
    };
  }

  getSizeState(size) {
    if (!this.state[size]) this.state[size] = this.defaultSizeState();
    return this.state[size];
  }

  /**
   * Best-known weights for a board size (used to seed the solver at startup).
   */
  getBestWeights(size) {
    return { ...this.getSizeState(size).best };
  }

  /**
   * Weights to use for the next game. The same trial is returned for every
   * game in its evaluation window so it gets a fair, averaged assessment.
   */
  beginGame(size) {
    const s = this.getSizeState(size);
    if (!s.trial) {
      // Cold start: evaluate the current best unmutated to set a baseline.
      s.trial = s.bestFitness === null ? { ...s.best } : this.mutate(s.best);
      s.results = [];
    }
    return { ...s.trial };
  }

  /**
   * Record a finished, AI-driven game. Returns an event describing what the
   * learner did (recorded / baseline / improved / rejected).
   */
  recordResult(size, result) {
    const s = this.getSizeState(size);
    if (!s.trial) s.trial = { ...s.best };

    const fitness = this.fitness(result);
    s.results.push(fitness);
    s.games++;

    let event = { type: 'recorded', fitness, generation: s.generation, gamesPlayed: s.games };

    if (s.results.length >= this.evalGames) {
      const mean = s.results.reduce((a, b) => a + b, 0) / s.results.length;

      if (s.bestFitness === null) {
        s.bestFitness = mean;
        event = { type: 'baseline', fitness: mean, generation: s.generation };
      } else if (mean > s.bestFitness) {
        s.best = { ...s.trial };
        s.bestFitness = mean;
        event = { type: 'improved', fitness: mean, generation: s.generation + 1 };
      } else {
        event = { type: 'rejected', fitness: mean, bestFitness: s.bestFitness, generation: s.generation + 1 };
      }

      s.generation++;
      s.trial = null;
      s.results = [];
    }

    this.save();
    event.gamesPlayed = s.games;
    return event;
  }

  /**
   * Mutate weights multiplicatively, clamped to a sane band around the default
   * so a bad streak can't drive the heuristic to a degenerate state.
   */
  mutate(weights) {
    const out = {};
    for (const k of this.keys) {
      const def = this.defaultWeights[k];
      const factor = 1 + this.gaussian() * this.stepSize;
      let v = (weights[k] ?? def) * factor;
      v = Math.max(def * 0.1, Math.min(def * 10, v));
      out[k] = v;
    }
    return out;
  }

  /**
   * Standard normal sample (Box-Muller).
   */
  gaussian() {
    let u = 0;
    let v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  /**
   * Fitness of a finished game: score, with a strong bonus for the highest
   * tile reached and a small bonus for surviving longer.
   */
  fitness(result) {
    const score = result.score || 0;
    const maxTile = result.highestTile || result.maxTile || 0;
    const moves = result.moves || 0;
    return score + 4 * maxTile + moves;
  }

  getStats(size) {
    const s = this.getSizeState(size);
    return {
      boardSize: Number(size),
      generation: s.generation,
      gamesPlayed: s.games,
      bestFitness: s.bestFitness,
      evaluating: s.results.length,
      evalGames: this.evalGames,
      best: { ...s.best }
    };
  }

  load() {
    try {
      if (typeof localStorage === 'undefined') return {};
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return (parsed && typeof parsed === 'object') ? this.sanitize(parsed) : {};
    } catch (e) {
      return {};
    }
  }

  /**
   * Validate loaded data and never resume an in-progress trial across sessions.
   */
  sanitize(state) {
    const clean = {};
    for (const size of Object.keys(state)) {
      const s = state[size];
      if (!s || typeof s !== 'object') continue;
      const best = {};
      for (const k of this.keys) {
        best[k] = (s.best && typeof s.best[k] === 'number') ? s.best[k] : this.defaultWeights[k];
      }
      clean[size] = {
        best,
        bestFitness: typeof s.bestFitness === 'number' ? s.bestFitness : null,
        trial: null,
        results: [],
        generation: typeof s.generation === 'number' ? s.generation : 0,
        games: typeof s.games === 'number' ? s.games : 0
      };
    }
    return clean;
  }

  save() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.storageKey, JSON.stringify(this.state));
      }
    } catch (e) {
      /* storage unavailable - learning persists for this session only */
    }
  }

  /**
   * Forget everything learned (reset to defaults).
   */
  reset() {
    this.state = {};
    this.save();
  }
}

// Make AILearner available globally
if (typeof window !== 'undefined') {
  window.AILearner = AILearner;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AILearner;
}
