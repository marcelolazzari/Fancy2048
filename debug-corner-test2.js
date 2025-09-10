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
  aiSolver.setDifficulty('easy');

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

  console.log('\nChecking ALL directions...');
  const directions = ['up', 'down', 'left', 'right'];
  
  for (const direction of directions) {
    const simResult = aiSolver.simulateMove(gameEngine.board, direction);
    const isValidMove = !aiSolver.boardsEqual(gameEngine.board, simResult);
    console.log(`\n${direction.toUpperCase()}: ${isValidMove ? 'VALID' : 'INVALID'}`);
    if (isValidMove) {
      simResult.forEach(row => console.log(row.join('\t')));
      console.log('Max tile in corner?', simResult[0][0] >= 1024);
      const score = aiSolver.evaluateBoardAdvanced(simResult);
      console.log('Score:', score.toFixed(2));
    }
  }

  const possibleMoves = aiSolver.getPossibleMoves(gameEngine.board);
  console.log(`\nPossible moves: ${possibleMoves.map(m => m.direction).join(', ')}`);
})();
