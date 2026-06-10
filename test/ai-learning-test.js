/**
 * AI Learning Test
 * Verifies the self-tuning learner: cold-start baseline, accepting
 * improvements, rejecting regressions, weight clamping, persistence, and that
 * it actually improves over generations against a known optimum.
 */

const path = require('path');
const AILearner = require(path.resolve(__dirname, '..', 'src/js/ai-learner.js'));

const results = { passed: 0, failed: 0, errors: [] };
function log(m) { console.log(`[AI-LEARN] ${m}`); }
function assert(cond, msg) {
  if (cond) { results.passed++; log(`✅ PASS: ${msg}`); }
  else { results.failed++; results.errors.push(msg); log(`❌ FAIL: ${msg}`); }
}

// Simple in-memory localStorage shim to test persistence.
function installMemoryStorage() {
  const store = {};
  global.localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; }
  };
  return store;
}

const DEFAULTS = {
  snakePattern: 0.018, cornerGradient: 0.06, monotonicity: 6.0,
  smoothness: 3.5, emptySpaces: 14.0, mergePotential: 0.4, clusteringPenalty: 1.2
};

(async () => {
  log('Starting AI learning test...');

  // === Test 1: Cold-start baseline ===
  log('\n=== Test 1: Cold start ===');
  installMemoryStorage();
  let learner = new AILearner({ defaultWeights: DEFAULTS, evalGames: 3 });
  const first = learner.beginGame(4);
  assert(JSON.stringify(first) === JSON.stringify(DEFAULTS), 'First trial uses default weights (baseline)');
  let evt;
  evt = learner.recordResult(4, { score: 1000 });
  evt = learner.recordResult(4, { score: 1000 });
  evt = learner.recordResult(4, { score: 1000 });
  assert(evt.type === 'baseline', 'Baseline established after evalGames games');
  assert(learner.getSizeState(4).bestFitness === 1000, 'Baseline fitness recorded (1000)');

  // === Test 2: Accept an improvement ===
  log('\n=== Test 2: Accept improvement ===');
  const trial2 = learner.beginGame(4);
  assert(JSON.stringify(trial2) !== JSON.stringify(DEFAULTS), 'Second trial is a mutated candidate');
  learner.recordResult(4, { score: 5000 });
  learner.recordResult(4, { score: 5000 });
  evt = learner.recordResult(4, { score: 5000 });
  assert(evt.type === 'improved', 'A better candidate is adopted');
  assert(learner.getSizeState(4).bestFitness === 5000, 'Best fitness updated to the better value');
  assert(JSON.stringify(learner.getBestWeights(4)) === JSON.stringify(trial2), 'Best weights are the improved candidate');

  // === Test 3: Reject a regression ===
  log('\n=== Test 3: Reject regression ===');
  const bestBefore = learner.getBestWeights(4);
  learner.beginGame(4);
  learner.recordResult(4, { score: 100 });
  learner.recordResult(4, { score: 100 });
  evt = learner.recordResult(4, { score: 100 });
  assert(evt.type === 'rejected', 'A worse candidate is rejected');
  assert(JSON.stringify(learner.getBestWeights(4)) === JSON.stringify(bestBefore), 'Best weights unchanged after rejection');

  // === Test 4: Weights stay positive and clamped ===
  log('\n=== Test 4: Mutation bounds ===');
  let allInBounds = true;
  for (let i = 0; i < 500; i++) {
    const m = learner.mutate(DEFAULTS);
    for (const k of Object.keys(DEFAULTS)) {
      if (m[k] < DEFAULTS[k] * 0.1 - 1e-9 || m[k] > DEFAULTS[k] * 10 + 1e-9 || m[k] <= 0) {
        allInBounds = false;
      }
    }
  }
  assert(allInBounds, 'Mutated weights stay positive and within [0.1x, 10x] of defaults');

  // === Test 5: Per-board-size separation ===
  log('\n=== Test 5: Per-size separation ===');
  learner.beginGame(5);
  learner.recordResult(5, { score: 42 });
  assert(learner.getSizeState(5).games === 1, 'Size 5 tracked separately');
  assert(learner.getSizeState(4).games > 1, 'Size 4 state untouched by size 5');

  // === Test 6: Persistence across "sessions" ===
  log('\n=== Test 6: Persistence ===');
  const reloaded = new AILearner({ defaultWeights: DEFAULTS, evalGames: 3 });
  assert(JSON.stringify(reloaded.getBestWeights(4)) === JSON.stringify(bestBefore),
         'Learned weights survive a reload (persisted to storage)');
  assert(reloaded.getSizeState(4).trial === null, 'In-progress trial is not resumed across sessions');

  // === Test 7: It actually improves toward an optimum ===
  log('\n=== Test 7: Improvement over generations ===');
  installMemoryStorage();
  const opt = new AILearner({ defaultWeights: DEFAULTS, evalGames: 2, stepSize: 0.2 });
  // Deterministic landscape: fitness peaks when every weight is ~3x its
  // default (reachable within the mutation clamp). Higher score == closer.
  const target = {};
  for (const k of Object.keys(DEFAULTS)) target[k] = DEFAULTS[k] * 3;
  const distTo = (w) => {
    let d = 0; for (const k of Object.keys(DEFAULTS)) d += Math.abs(Math.log(w[k] / target[k])); return d;
  };
  const fitnessOf = (w) => ({ score: 100000 - distTo(w) * 1000 });
  const startDist = distTo(opt.getBestWeights(4));
  let startFitness = null;
  for (let g = 0; g < 600; g++) {
    const trial = opt.beginGame(4);
    const e = opt.recordResult(4, fitnessOf(trial));
    if (e.type === 'baseline' && startFitness === null) startFitness = e.fitness;
  }
  const endState = opt.getSizeState(4);
  const endDist = distTo(opt.getBestWeights(4));
  log(`baseline fitness ${startFitness && startFitness.toFixed(0)}, best fitness ${endState.bestFitness.toFixed(0)}, generations ${endState.generation}`);
  log(`distance to optimum: start ${startDist.toFixed(3)} -> end ${endDist.toFixed(3)}`);
  assert(endState.bestFitness > startFitness, 'Best fitness improves over many generations');
  assert(endDist < startDist * 0.6, 'Learned weights move substantially closer to the optimum');
  assert(opt.getBestWeights(4).monotonicity > DEFAULTS.monotonicity, 'Learner increased weights toward the (3x) optimum');

  // === Summary ===
  log('\n=== AI Learning Test Results ===');
  log(`Total: ${results.passed + results.failed} | Passed: ${results.passed} | Failed: ${results.failed}`);
  if (results.failed > 0) {
    results.errors.forEach((e, i) => log(`${i + 1}. ${e}`));
    process.exit(1);
  } else {
    log('\n🎉 All AI learning tests passed!');
    process.exit(0);
  }
})().catch(err => { console.error('Learning test error:', err); process.exit(2); });
