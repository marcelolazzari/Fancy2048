const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

(async () => {
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
    const filePath = path.resolve(__dirname, rel);
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

  console.log('Testing corner strategy...');

  // Test case: High value should stay in corner
  gameEngine.board = [
    [1024, 512, 0, 0],
    [256, 128, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0]
  ];
  gameEngine.isGameOver = false;

  console.log('Initial board:');
  gameEngine.board.forEach(row => console.log(row.join('\t')));

  console.log('\nEvaluating all possible moves...');
  const possibleMoves = aiSolver.getPossibleMoves(gameEngine.board);
  
  for (const move of possibleMoves) {
    const score = aiSolver.evaluateBoardAdvanced(move.board);
    console.log(`Move ${move.direction}: score = ${score.toFixed(2)}`);
    console.log('Result board:');
    move.board.forEach(row => console.log(row.join('\t')));
    console.log('Max tile in corner?', move.board[0][0] >= 1024);
    console.log('');
  }

  const bestMove = await aiSolver.getBestMove();
  console.log(`AI chose: ${bestMove}`);
  
  const testResult = aiSolver.simulateMove(gameEngine.board, bestMove);
  console.log('Final result:');
  testResult.forEach(row => console.log(row.join('\t')));
  console.log('Max tile still in corner?', testResult[0][0] >= 1024);
})();
