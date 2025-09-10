/**
 * AI Decision Quality Test
 * Tests whether AI makes good strategic decisions
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
  console.log(`[AI-QUALITY] ${message}`);
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

(async () => {
  log('Starting AI decision quality test...');

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
  aiSolver.setDifficulty('easy'); // Use easy for faster testing

  log('Environment setup complete. Starting decision quality tests...');

  // === Quality Test 1: Obvious Merge Opportunities ===
  log('\n=== Quality Test 1: Obvious Merge Opportunities ===');

  // Test case: Should merge 2+2 when possible
  gameEngine.board = [
    [2, 2, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0]
  ];
  gameEngine.isGameOver = false;

  const move1 = await aiSolver.getBestMove();
  const testResult1 = aiSolver.simulateMove(gameEngine.board, move1);
  const hasCreated4 = testResult1.flat().includes(4);
  assert(hasCreated4, 'AI should merge 2+2 to create 4');

  // === Quality Test 2: Corner Strategy ===
  log('\n=== Quality Test 2: Corner Strategy ===');

  // Test case: High value should stay in corner
  gameEngine.board = [
    [1024, 512, 0, 0],
    [256, 128, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0]
  ];
  gameEngine.isGameOver = false;

  const move2 = await aiSolver.getBestMove();
  const testResult2 = aiSolver.simulateMove(gameEngine.board, move2);
  const maxTileInCorner = testResult2[0][0] >= 1024;
  assert(maxTileInCorner, 'AI should maintain high value tiles in corner');

  // === Quality Test 3: Avoid Blocking High Tiles ===
  log('\n=== Quality Test 3: Avoid Blocking High Tiles ===');

  // Test case: Don't block the highest tile
  gameEngine.board = [
    [1024, 512, 256, 128],
    [64, 32, 16, 8],
    [4, 2, 0, 0],
    [0, 0, 0, 0]
  ];
  gameEngine.isGameOver = false;

  const move3 = await aiSolver.getBestMove();
  // The AI should not make a move that would block the 1024 tile
  assert(move3 !== null, 'AI should find a valid move for organized board');
  assert(['down', 'right'].includes(move3), 'AI should prefer moves that maintain organization');

  // === Quality Test 4: Maximize Empty Spaces ===
  log('\n=== Quality Test 4: Maximize Empty Spaces ===');

  // Test case: Choose move that creates more empty spaces
  gameEngine.board = [
    [2, 2, 4, 4],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0]
  ];
  gameEngine.isGameOver = false;

  const move4 = await aiSolver.getBestMove();
  const testResult4 = aiSolver.simulateMove(gameEngine.board, move4);
  const emptySpaces = testResult4.flat().filter(cell => cell === 0).length;
  assert(emptySpaces >= 14, 'AI should create merges that maximize empty spaces');

  // === Quality Test 5: Monotonicity Preference ===
  log('\n=== Quality Test 5: Monotonicity Preference ===');

  // Test case: Prefer monotonic arrangements
  gameEngine.board = [
    [512, 256, 128, 64],
    [32, 16, 8, 4],
    [2, 0, 0, 0],
    [0, 0, 0, 0]
  ];
  gameEngine.isGameOver = false;

  const move5 = await aiSolver.getBestMove();
  const testResult5 = aiSolver.simulateMove(gameEngine.board, move5);
  
  // Check if monotonicity is maintained (values should generally decrease from corner)
  const topRowDescending = testResult5[0][0] >= testResult5[0][1] &&
                           testResult5[0][1] >= testResult5[0][2];
  const leftColDescending = testResult5[0][0] >= testResult5[1][0] &&
                            testResult5[1][0] >= testResult5[2][0];
  
  assert(topRowDescending || leftColDescending, 'AI should maintain some monotonicity');

  // === Quality Test 6: Avoid Creating Unmergeable Patterns ===
  log('\n=== Quality Test 6: Avoid Creating Unmergeable Patterns ===');

  // Test case: Don't create checkerboard patterns
  gameEngine.board = [
    [2, 4, 2, 0],
    [4, 2, 4, 0],
    [2, 4, 0, 0],
    [0, 0, 0, 0]
  ];
  gameEngine.isGameOver = false;

  const move6 = await aiSolver.getBestMove();
  assert(move6 !== null, 'AI should find moves even in difficult patterns');

  // === Quality Test 7: Emergency Situations ===
  log('\n=== Quality Test 7: Emergency Situations ===');

  // Test case: Handle nearly full board
  gameEngine.board = [
    [2, 4, 8, 16],
    [32, 64, 128, 256],
    [512, 1024, 2, 4],
    [8, 16, 32, 0]
  ];
  gameEngine.isGameOver = false;

  const move7 = await aiSolver.getBestMove();
  assert(move7 !== null, 'AI should handle nearly full boards');

  const testResult7 = aiSolver.simulateMove(gameEngine.board, move7);
  const stillHasEmptySpace = testResult7.flat().includes(0);
  assert(stillHasEmptySpace, 'AI move should preserve at least some empty space');

  // === Quality Test 8: Score Maximization ===
  log('\n=== Quality Test 8: Score Maximization ===');

  // Test case: Choose move that maximizes immediate score
  gameEngine.board = [
    [2, 2, 4, 4],
    [8, 8, 16, 16],
    [0, 0, 0, 0],
    [0, 0, 0, 0]
  ];
  gameEngine.isGameOver = false;

  const originalScore = gameEngine.score;
  const move8 = await aiSolver.getBestMove();
  
  // Simulate all possible moves to see which gives best score
  const possibleMoves = ['up', 'down', 'left', 'right'];
  let bestScore = -1;
  let bestPossibleMove = null;
  
  for (const testMove of possibleMoves) {
    const result = aiSolver.simulateMove(gameEngine.board, testMove);
    if (!aiSolver.boardsEqual(gameEngine.board, result)) {
      // Calculate score difference (simple approximation)
      const scoreIncrease = result.flat().reduce((sum, val) => sum + val, 0) - 
                           gameEngine.board.flat().reduce((sum, val) => sum + val, 0);
      if (scoreIncrease > bestScore) {
        bestScore = scoreIncrease;
        bestPossibleMove = testMove;
      }
    }
  }

  assert(move8 === bestPossibleMove, `AI should choose highest scoring move (chose ${move8}, best was ${bestPossibleMove})`);

  // === Quality Test 9: Multiple Valid Options ===
  log('\n=== Quality Test 9: Multiple Valid Options ===');

  // Test case: When multiple moves are valid, choose strategically
  gameEngine.board = [
    [2, 0, 2, 0],
    [0, 4, 0, 4],
    [2, 0, 2, 0],
    [0, 4, 0, 4]
  ];
  gameEngine.isGameOver = false;

  const move9 = await aiSolver.getBestMove();
  const validMoves = ['up', 'down', 'left', 'right'];
  assert(validMoves.includes(move9), 'AI should return a valid move direction');

  // === Quality Test 10: Consistency ===
  log('\n=== Quality Test 10: Consistency ===');

  // Test case: Same board state should generally produce same move
  const consistencyBoard = [
    [2, 4, 8, 16],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0]
  ];

  gameEngine.board = consistencyBoard.map(row => [...row]);
  gameEngine.isGameOver = false;

  const consistencyMove1 = await aiSolver.getBestMove();
  await new Promise(r => setTimeout(r, 10)); // Small delay
  
  gameEngine.board = consistencyBoard.map(row => [...row]);
  const consistencyMove2 = await aiSolver.getBestMove();

  // Due to randomness in lower difficulties, we allow some variation
  const isConsistent = consistencyMove1 === consistencyMove2;
  if (isConsistent) {
    assert(true, 'AI shows good consistency in decision making');
  } else {
    // For easy difficulty, some randomness is expected
    assert(aiSolver.difficulty === 'easy', 'AI shows expected randomness for easy difficulty');
  }

  // === Test Results Summary ===
  log('\n=== AI Decision Quality Test Results ===');
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
    log('\n🎉 All AI decision quality tests passed!');
    process.exit(0);
  }
})().catch(error => {
  console.error('Decision quality test error:', error);
  process.exit(2);
});
