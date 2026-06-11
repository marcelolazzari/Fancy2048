/**
 * Comprehensive AI Functions Test Suite
 * Tests all AI-related functionality in Fancy2048
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  errors: []
};

function log(message) {
  console.log(`[AI-TEST] ${message}`);
}

function assert(condition, message) {
  if (condition) {
    testResults.passed++;
    log(`✅ PASS: ${message}`);
  } else {
    testResults.failed++;
    testResults.errors.push(message);
    log(`❌ FAIL: ${message}`);
  }
}

function assertClose(actual, expected, tolerance, message) {
  const diff = Math.abs(actual - expected);
  if (diff <= tolerance) {
    testResults.passed++;
    log(`✅ PASS: ${message} (${actual} ≈ ${expected})`);
  } else {
    testResults.failed++;
    testResults.errors.push(`${message} - Expected: ${expected}, Got: ${actual}, Diff: ${diff}`);
    log(`❌ FAIL: ${message} - Expected: ${expected}, Got: ${actual}, Diff: ${diff}`);
  }
}

(async () => {
  log('Starting comprehensive AI functions test...');

  // Setup JSDOM environment
  const html = `<!doctype html><html><body>
    <div id="game-board"></div>
    <div id="current-score">0</div>
    <div id="best-score">0</div>
  </body></html>`;

  const dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable' });
  const { window } = dom;
  global.window = window;
  global.document = window.document;

  // Provide Utils mock
  window.Utils = {
    sleep: (ms) => new Promise(r => setTimeout(r, ms)),
    log: () => {},
    handleError: (e) => { console.error('Utils.handleError', e); },
    debounce: (fn) => fn,
    formatNumber: (n) => String(n),
    vibrate: () => {}
  };

  // Load required scripts
  const scripts = [
    'src/js/utils.js',
    'src/js/game-engine.js',
    'src/js/ai-solver.js'
  ];

  for (const rel of scripts) {
    const filePath = path.resolve(__dirname, '..', rel);
    const code = fs.readFileSync(filePath, 'utf8');
    const scriptEl = window.document.createElement('script');
    scriptEl.textContent = code;
    window.document.body.appendChild(scriptEl);
  }

  await new Promise(r => setTimeout(r, 100));

  // Initialize game engine and AI
  const gameEngine = new window.GameEngine();
  const aiSolver = new window.AISolver(gameEngine);

  log('Environment setup complete. Starting tests...');

  // === Test 1: AI Solver Initialization ===
  log('\n=== Test 1: AI Solver Initialization ===');
  
  assert(aiSolver instanceof window.AISolver, 'AI Solver instance created');
  assert(aiSolver.gameEngine === gameEngine, 'Game engine reference set');
  assert(aiSolver.difficulty === 'medium', 'Default difficulty is medium');
  assert(aiSolver.algorithms.expectimax.medium.depth === 6, 'Default search depth is 6 for medium');
  assert(!aiSolver.isThinking, 'Initially not thinking');
  // Duck-typed check: jsdom runs the solver in a separate realm, so a direct
  // `instanceof Map` against the test realm's Map would be unreliable.
  assert(typeof aiSolver.evaluationCache.set === 'function' &&
         typeof aiSolver.evaluationCache.get === 'function' &&
         typeof aiSolver.evaluationCache.size === 'number',
         'Evaluation cache is a Map-like store');

  // === Test 2: Difficulty Settings ===
  log('\n=== Test 2: Difficulty Settings ===');

  const difficulties = ['easy', 'medium', 'hard', 'expert'];
  const expectedDepths = [3, 6, 8, 10];

  for (let i = 0; i < difficulties.length; i++) {
    aiSolver.setDifficulty(difficulties[i]);
    assert(aiSolver.difficulty === difficulties[i], `Set difficulty to ${difficulties[i]}`);
    assert(aiSolver.algorithms.expectimax[difficulties[i]].depth === expectedDepths[i],
           `Depth ${expectedDepths[i]} for ${difficulties[i]}`);
  }

  // Test invalid difficulty
  aiSolver.setDifficulty('invalid');
  assert(aiSolver.difficulty === 'expert', 'Invalid difficulty ignored');

  // Reset to medium for further tests
  aiSolver.setDifficulty('medium');

  // === Test 3: Heuristic configuration (nneonneo weights) ===
  log('\n=== Test 3: Heuristic configuration ===');

  assert(typeof aiSolver.weights.emptyWeight === 'number', 'Heuristic exposes an emptyWeight');
  assert(typeof aiSolver.weights.mergesWeight === 'number', 'Heuristic exposes a mergesWeight');
  assert(typeof aiSolver.weights.monotonicityWeight === 'number', 'Heuristic exposes a monotonicityWeight');
  assert(typeof aiSolver.weights.sumWeight === 'number', 'Heuristic exposes a sumWeight');

  // Rank helper converts a tile value to its log2 rank (empty -> 0).
  assert(aiSolver.rankOf(2) === 1, 'rankOf(2) === 1');
  assert(aiSolver.rankOf(2048) === 11, 'rankOf(2048) === 11');
  assert(aiSolver.rankOf(0) === 0, 'rankOf(empty) === 0');

  // An all-empty line is scored purely by the empty-cell reward.
  const emptyLineScore = aiSolver.evaluateLine([0, 0, 0, 0]);
  assert(emptyLineScore === aiSolver.weights.emptyWeight * 4,
         'Empty line scored by the empty-cell weight alone');

  // === Test 4: Board Evaluation Functions ===
  log('\n=== Test 4: Board Evaluation Functions ===');

  // Test empty board
  const emptyBoard = [
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0]
  ];

  const emptyScore = aiSolver.evaluateBoard(emptyBoard);
  assert(emptyScore >= 0, 'Empty board has non-negative score');

  // Test board with some tiles
  const testBoard1 = [
    [2, 4, 8, 16],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0]
  ];

  // A monotonic (ordered) arrangement should score higher than the same tiles
  // scattered. (An empty board legitimately scores well in 2048 thanks to all
  // the open space, so we compare two equally-full boards instead.)
  const orderedBoard = [
    [16, 8, 4, 2],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0]
  ];
  const scatteredBoard = [
    [2, 16, 4, 8],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0]
  ];
  assert(aiSolver.evaluateBoard(orderedBoard) > aiSolver.evaluateBoard(scatteredBoard),
         'Monotonic arrangement scores higher than a scattered one');

  // Test corner preference
  const cornerBoard = [
    [1024, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0]
  ];

  const centerBoard = [
    [0, 0, 0, 0],
    [0, 1024, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0]
  ];

  const cornerScore = aiSolver.evaluateBoard(cornerBoard);
  const centerScore = aiSolver.evaluateBoard(centerBoard);
  assert(cornerScore > centerScore, 'Corner placement scores higher than center');

  // === Test 5: Empty Cells Detection ===
  log('\n=== Test 5: Empty Cells Detection ===');

  const emptyCells1 = aiSolver.getEmptyCells(emptyBoard);
  assert(emptyCells1.length === 16, 'Empty board has 16 empty cells');

  const emptyCells2 = aiSolver.getEmptyCells(testBoard1);
  assert(emptyCells2.length === 12, 'Test board has 12 empty cells');

  assert(emptyCells2.every(cell => cell.hasOwnProperty('row') && cell.hasOwnProperty('col')), 
         'Empty cells have row and col properties');

  // === Test 6: Move Simulation ===
  log('\n=== Test 6: Move Simulation ===');

  const moveTestBoard = [
    [2, 2, 0, 0],
    [4, 4, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0]
  ];

  // Test left move
  const leftResult = aiSolver.simulateMove(moveTestBoard, 'left');
  assert(leftResult[0][0] === 4, 'Left move merges 2+2=4 in first row');
  assert(leftResult[1][0] === 8, 'Left move merges 4+4=8 in second row');
  assert(leftResult[0][1] === 0, 'Left move empties merged positions');

  // Test right move
  const rightResult = aiSolver.simulateMove(moveTestBoard, 'right');
  assert(rightResult[0][3] === 4, 'Right move merges to rightmost position');
  assert(rightResult[1][3] === 8, 'Right move merges 4+4=8 to right');

  // Test up move
  const upResult = aiSolver.simulateMove(moveTestBoard, 'up');
  assert(upResult[0][0] === 2, 'Up move keeps first column first row as 2');
  assert(upResult[0][1] === 2, 'Up move keeps second column first row as 2');

  // Test down move: column [2, 4] settles to the bottom as [.., 2, 4] (no merge)
  const downResult = aiSolver.simulateMove(moveTestBoard, 'down');
  assert(downResult[3][0] === 4, 'Down move settles column 0 with 4 at the bottom');
  assert(downResult[2][0] === 2, 'Down move keeps 2 above the bottom in column 0');
  assert(downResult[3][1] === 4, 'Down move settles column 1 with 4 at the bottom');

  // === Test 7: Board Comparison ===
  log('\n=== Test 7: Board Comparison ===');

  const board1 = [[2, 4], [0, 0]];
  const board2 = [[2, 4], [0, 0]];
  const board3 = [[4, 2], [0, 0]];

  assert(aiSolver.boardsEqual(board1, board2), 'Identical boards are equal');
  assert(!aiSolver.boardsEqual(board1, board3), 'Different boards are not equal');

  // === Test 8: Possible Moves Generation ===
  log('\n=== Test 8: Possible Moves Generation ===');

  const movesTestBoard = [
    [2, 0, 2, 0],
    [0, 4, 0, 4],
    [2, 0, 2, 0],
    [0, 4, 0, 4]
  ];

  const possibleMoves = aiSolver.getPossibleMoves(movesTestBoard);
  assert(possibleMoves.length > 0, 'Found possible moves');
  assert(possibleMoves.every(move => ['up', 'down', 'left', 'right'].includes(move.direction)), 
         'All moves have valid directions');
  assert(possibleMoves.every(move => Array.isArray(move.board)), 'All moves have board states');

  // === Test 9: Array Move and Merge ===
  log('\n=== Test 9: Array Move and Merge ===');

  const testArray1 = [2, 2, 4, 0];
  const result1 = aiSolver.moveAndMergeArray(testArray1);
  assert(result1[0] === 4, 'Merge 2+2=4');
  assert(result1[1] === 4, 'Keep remaining 4');
  assert(result1[2] === 0, 'Fill with zeros');
  assert(result1[3] === 0, 'Fill with zeros');

  const testArray2 = [2, 4, 8, 16];
  const result2 = aiSolver.moveAndMergeArray(testArray2);
  assert(JSON.stringify(result2) === JSON.stringify([2, 4, 8, 16]), 'No merge when all different');

  const testArray3 = [0, 0, 2, 2];
  const result3 = aiSolver.moveAndMergeArray(testArray3);
  assert(result3[0] === 4, 'Merge after filtering zeros');
  assert(result3[1] === 0, 'Fill with zeros after merge');

  // === Test 10: Board Copy Immutability ===
  log('\n=== Test 10: Board Copy Immutability ===');

  const originalBoard = [
    [2, 0],
    [0, 4]
  ];

  const newBoard = aiSolver.copyBoard(originalBoard);
  newBoard[0][1] = 8;
  assert(newBoard[0][1] === 8, 'Copied board can be modified');
  assert(originalBoard[0][1] === 0, 'Original board is unchanged after modifying the copy');
  assert(newBoard[1][1] === 4, 'Other tiles preserved in the copy');

  // === Test 11: Board Key Generation ===
  log('\n=== Test 11: Board Key Generation ===');

  const keyBoard = [
    [2, 4],
    [8, 16]
  ];

  const key = aiSolver.getBoardKey(keyBoard);
  assert(typeof key === 'string', 'Board key is a string');
  assert(key.includes('2,4'), 'Key contains first row');
  assert(key.includes('8,16'), 'Key contains second row');

  const sameKeyBoard = [
    [2, 4],
    [8, 16]
  ];

  const differentKeyBoard = [
    [4, 2],
    [8, 16]
  ];

  const sameKey = aiSolver.getBoardKey(sameKeyBoard);
  const differentKey = aiSolver.getBoardKey(differentKeyBoard);

  assert(key === sameKey, 'Same boards generate same keys');
  assert(key !== differentKey, 'Different boards generate different keys');

  // === Test 12: Monotonicity Preference ===
  log('\n=== Test 12: Monotonicity Preference ===');

  // A smooth gradient toward a corner should evaluate higher than the same
  // tiles jumbled out of order.
  const monotonicBoard = [
    [1024, 512, 256, 128],
    [64, 32, 16, 8],
    [4, 2, 0, 0],
    [0, 0, 0, 0]
  ];

  const jumbledBoard = [
    [2, 512, 8, 128],
    [256, 4, 1024, 16],
    [32, 64, 0, 0],
    [0, 0, 0, 0]
  ];

  const monotonicScore = aiSolver.evaluateBoard(monotonicBoard);
  const jumbledScore = aiSolver.evaluateBoard(jumbledBoard);

  assert(Number.isFinite(monotonicScore), 'Board evaluation is a finite number');
  assert(monotonicScore > jumbledScore,
         'A monotonic board scores higher than a jumbled board with the same tiles');

  // === Test 13: Merge Potential ===
  log('\n=== Test 13: Merge Potential ===');

  // Adjacent equal tiles (ready merges) should evaluate higher than the same
  // values arranged so nothing can merge.
  const mergeReadyBoard = [
    [4, 4, 8, 8],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0]
  ];

  const noMergeBoard = [
    [4, 8, 4, 8],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0]
  ];

  const mergeReadyScore = aiSolver.evaluateBoard(mergeReadyBoard);
  const noMergeScore = aiSolver.evaluateBoard(noMergeBoard);

  assert(mergeReadyScore > noMergeScore,
         'A board with adjacent equal tiles (ready merges) scores higher');

  // === Test 14: Max Tile Position ===
  log('\n=== Test 14: Max Tile Position ===');

  const cornerMaxBoard = [
    [1024, 2, 0, 0],
    [4, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0]
  ];

  const centerMaxBoard = [
    [2, 4, 0, 0],
    [0, 1024, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0]
  ];

  const cornerMaxScore = aiSolver.evaluateBoard(cornerMaxBoard);
  const centerMaxScore = aiSolver.evaluateBoard(centerMaxBoard);

  assert(cornerMaxScore > centerMaxScore,
         'Keeping the max tile in a corner scores higher than centering it');

  // === Test 15: AI Statistics ===
  log('\n=== Test 15: AI Statistics ===');

  const stats = aiSolver.getStats();
  assert(typeof stats === 'object', 'Stats returns an object');
  assert(stats.hasOwnProperty('difficulty'), 'Stats includes difficulty');
  assert(stats.hasOwnProperty('algorithm'), 'Stats includes algorithm');
  assert(stats.hasOwnProperty('cacheSize'), 'Stats includes cacheSize');
  assert(stats.hasOwnProperty('isThinking'), 'Stats includes isThinking');
  assert(stats.difficulty === 'medium', 'Stats shows correct difficulty');

  // === Test 16: Cache Management ===
  log('\n=== Test 16: Cache Management ===');

  // The evaluation cache is populated by the search; seed it directly here
  // to verify cache management without running an expensive deep search.
  aiSolver.evaluationCache.set(aiSolver.getBoardKey(testBoard1) + '_1_true', 100);
  aiSolver.evaluationCache.set(aiSolver.getBoardKey(cornerBoard) + '_1_true', 200);

  const initialCacheSize = aiSolver.evaluationCache.size;
  assert(initialCacheSize > 0, 'Cache has entries after seeding');

  aiSolver.clearCache();
  assert(aiSolver.evaluationCache.size === 0, 'Cache cleared successfully');

  // === Test 17: Get Best Move (Basic) ===
  log('\n=== Test 17: Get Best Move (Basic) ===');

  // Set up a simple board state
  gameEngine.board = [
    [2, 2, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0]
  ];

  gameEngine.isGameOver = false;

  // Set to easy difficulty for faster testing
  aiSolver.setDifficulty('easy');

  try {
    const bestMove = await aiSolver.getBestMove();
    assert(bestMove !== null, 'AI returns a best move');
    assert(['up', 'down', 'left', 'right'].includes(bestMove), 'Best move is a valid direction');
    assert(!aiSolver.isThinking, 'AI not thinking after getBestMove completes');
  } catch (error) {
    assert(false, `getBestMove threw error: ${error.message}`);
  }

  // === Test 18: Get Hint ===
  log('\n=== Test 18: Get Hint ===');

  try {
    const hint = await aiSolver.getHint();
    assert(hint !== null, 'AI returns a hint');
    assert(['up', 'down', 'left', 'right'].includes(hint), 'Hint is a valid direction');
  } catch (error) {
    assert(false, `getHint threw error: ${error.message}`);
  }

  // === Test 19: Game Over Handling ===
  log('\n=== Test 19: Game Over Handling ===');

  gameEngine.isGameOver = true;
  
  try {
    const moveWhenGameOver = await aiSolver.getBestMove();
    assert(moveWhenGameOver === null, 'AI returns null when game is over');
  } catch (error) {
    assert(false, `getBestMove when game over threw error: ${error.message}`);
  }

  gameEngine.isGameOver = false; // Reset for further tests

  // === Test 20: No Possible Moves ===
  log('\n=== Test 20: No Possible Moves ===');

  // Create a board with no possible moves (all same values, can't merge)
  const noMovesBoard = [
    [2, 4, 2, 4],
    [4, 2, 4, 2],
    [2, 4, 2, 4],
    [4, 2, 4, 2]
  ];

  gameEngine.board = noMovesBoard;
  
  try {
    const moveWhenNoMoves = await aiSolver.getBestMove();
    // Should return null or handle gracefully
    assert(moveWhenNoMoves === null || typeof moveWhenNoMoves === 'string', 
           'AI handles no possible moves gracefully');
  } catch (error) {
    assert(false, `getBestMove with no moves threw error: ${error.message}`);
  }

  // === Test Results Summary ===
  log('\n=== Test Results Summary ===');
  log(`Total tests: ${testResults.passed + testResults.failed}`);
  log(`Passed: ${testResults.passed}`);
  log(`Failed: ${testResults.failed}`);

  if (testResults.failed > 0) {
    log('\nFailed tests:');
    testResults.errors.forEach((error, index) => {
      log(`${index + 1}. ${error}`);
    });
    process.exit(1);
  } else {
    log('\n🎉 All AI function tests passed!');
    process.exit(0);
  }
})().catch(error => {
  console.error('Test suite error:', error);
  process.exit(2);
});
