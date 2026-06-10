/**
 * AI Decision Quality Test
 * Verifies the solver makes sound strategic decisions and plays a full game.
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const testResults = { passed: 0, failed: 0, errors: [] };

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

// Highest tile sits on the board perimeter (corner or edge)?
function maxTileOnPerimeter(board) {
  const size = board.length;
  let max = 0;
  for (const row of board) for (const v of row) if (v > max) max = v;
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      if (board[i][j] === max &&
          (i === 0 || j === 0 || i === size - 1 || j === size - 1)) {
        return true;
      }
    }
  }
  return false;
}

(async () => {
  log('Starting AI decision quality test...');

  const html = `<!doctype html><html><body>
    <div id="game-board"></div>
    <div id="current-score">0</div>
    <div id="best-score">0</div>
  </body></html>`;

  const dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable' });
  const { window } = dom;
  global.window = window;
  global.document = window.document;

  window.Utils = {
    sleep: (ms) => new Promise(r => setTimeout(r, ms)),
    log: () => {},
    handleError: (e) => { console.error('Utils.handleError', e); },
    debounce: (fn) => fn,
    formatNumber: (n) => String(n),
    vibrate: () => {}
  };

  const scripts = ['src/js/utils.js', 'src/js/game-engine.js', 'src/js/ai-solver.js'];
  for (const rel of scripts) {
    const code = fs.readFileSync(path.resolve(__dirname, '..', rel), 'utf8');
    const scriptEl = window.document.createElement('script');
    scriptEl.textContent = code;
    window.document.body.appendChild(scriptEl);
  }

  await new Promise(r => setTimeout(r, 100));

  const gameEngine = new window.GameEngine();
  const aiSolver = new window.AISolver(gameEngine);

  // Make the search deterministic and machine-independent for these checks:
  // no random tie-breaking, no time cutoff (always reaches the configured
  // depth), and a modest fixed depth so the suite stays fast.
  Object.values(aiSolver.algorithms.expectimax).forEach(cfg => {
    cfg.randomness = 0;
    cfg.timeBudget = 10 * 60 * 1000;
    cfg.depth = 4;
  });
  aiSolver.setDifficulty('medium');

  log('Environment ready. Running decision quality tests...');

  // === Test 1: Obvious merge ===
  log('\n=== Test 1: Obvious merge ===');
  gameEngine.board = [
    [2, 2, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0]
  ];
  gameEngine.isGameOver = false;
  const move1 = await aiSolver.getBestMove();
  const result1 = aiSolver.simulateMove(gameEngine.board, move1);
  assert(result1.flat().includes(4), 'AI merges 2+2 into a 4');

  // === Test 2: Keep the max tile on the perimeter ===
  log('\n=== Test 2: Corner / edge strategy ===');
  gameEngine.board = [
    [1024, 512, 0, 0],
    [256, 128, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0]
  ];
  gameEngine.isGameOver = false;
  const move2 = await aiSolver.getBestMove();
  const result2 = aiSolver.simulateMove(gameEngine.board, move2);
  assert(maxTileOnPerimeter(result2), 'AI keeps the highest tile on the board perimeter');

  // === Test 3: Maximize open space via merges ===
  log('\n=== Test 3: Open space ===');
  gameEngine.board = [
    [2, 2, 4, 4],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0]
  ];
  gameEngine.isGameOver = false;
  const move3 = await aiSolver.getBestMove();
  const result3 = aiSolver.simulateMove(gameEngine.board, move3);
  const empties3 = result3.flat().filter(c => c === 0).length;
  assert(empties3 >= 14, 'AI merges to keep the board open (>= 14 empty cells)');

  // === Test 4: Legal move on an organized board ===
  log('\n=== Test 4: Organized board ===');
  gameEngine.board = [
    [1024, 512, 256, 128],
    [64, 32, 16, 8],
    [4, 2, 0, 0],
    [0, 0, 0, 0]
  ];
  gameEngine.isGameOver = false;
  const move4 = await aiSolver.getBestMove();
  assert(['up', 'down', 'left', 'right'].includes(move4), 'AI returns a legal move for an organized board');

  // === Test 5: Difficult (checkerboard-ish) position ===
  log('\n=== Test 5: Difficult position ===');
  gameEngine.board = [
    [2, 4, 2, 0],
    [4, 2, 4, 0],
    [2, 4, 0, 0],
    [0, 0, 0, 0]
  ];
  gameEngine.isGameOver = false;
  const move5 = await aiSolver.getBestMove();
  assert(['up', 'down', 'left', 'right'].includes(move5), 'AI finds a move in a difficult position');

  // === Test 6: Nearly full board stays playable ===
  log('\n=== Test 6: Nearly full board ===');
  gameEngine.board = [
    [2, 4, 8, 16],
    [32, 64, 128, 256],
    [512, 1024, 2, 4],
    [8, 16, 32, 0]
  ];
  gameEngine.isGameOver = false;
  const move6 = await aiSolver.getBestMove();
  assert(move6 !== null, 'AI handles a nearly full board');
  const result6 = aiSolver.simulateMove(gameEngine.board, move6);
  assert(result6.flat().includes(0), 'AI move preserves at least one empty cell');

  // === Test 7: Determinism ===
  log('\n=== Test 7: Determinism ===');
  const detBoard = [
    [2, 4, 8, 16],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0]
  ];
  gameEngine.board = detBoard.map(r => [...r]);
  gameEngine.isGameOver = false;
  const detMove1 = await aiSolver.getBestMove();
  gameEngine.board = detBoard.map(r => [...r]);
  const detMove2 = await aiSolver.getBestMove();
  assert(detMove1 === detMove2, 'AI is deterministic with randomness disabled');

  // === Test 8: No move when the game is over ===
  log('\n=== Test 8: Game over ===');
  gameEngine.board = [
    [2, 4, 2, 4],
    [4, 2, 4, 2],
    [2, 4, 2, 4],
    [4, 2, 4, 2]
  ];
  gameEngine.isGameOver = true;
  const overMove = await aiSolver.getBestMove();
  assert(overMove === null, 'AI returns null once the game is over');

  // === Test 9: Full game (strongest quality signal) ===
  log('\n=== Test 9: Full game ===');
  const freshEngine = new window.GameEngine();
  const gameAI = new window.AISolver(freshEngine);
  gameAI.setDifficulty('medium'); // real time-budgeted config
  let moves = 0;
  let illegalMove = false;
  let threw = false;
  try {
    while (!freshEngine.isGameOver && moves < 5000) {
      const move = await gameAI.getBestMove();
      if (!move) break;
      if (!freshEngine.move(move)) { illegalMove = true; break; }
      moves++;
    }
  } catch (e) {
    threw = true;
    console.error('Full game threw:', e);
  }
  const maxTile = freshEngine.getHighestTile();
  log(`Full game: ${moves} moves, score ${freshEngine.score}, max tile ${maxTile}`);
  assert(!threw, 'AI plays a full game without throwing');
  assert(!illegalMove, 'Every move the AI made was legal');
  assert(moves >= 20, 'AI sustains a game for a reasonable number of moves');
  assert(maxTile >= 128, 'AI reaches at least the 128 tile');

  // === Summary ===
  log('\n=== AI Decision Quality Test Results ===');
  log(`Total tests: ${testResults.passed + testResults.failed}`);
  log(`Passed: ${testResults.passed}`);
  log(`Failed: ${testResults.failed}`);

  if (testResults.failed > 0) {
    log('\nFailed tests:');
    testResults.errors.forEach((error, index) => log(`${index + 1}. ${error}`));
    process.exit(1);
  } else {
    log('\n🎉 All AI decision quality tests passed!');
    process.exit(0);
  }
})().catch(error => {
  console.error('Decision quality test error:', error);
  process.exit(2);
});
