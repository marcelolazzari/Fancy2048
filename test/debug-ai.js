/**
 * Debug AI Functions - Investigate failing tests
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

(async () => {
  console.log('Debugging AI functions...');

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

  // Debug issue 1: maxDepth
  console.log('AI difficulty:', aiSolver.difficulty);
  console.log('AI maxDepth (actual):', aiSolver.maxDepth);
  console.log('Expected maxDepth for medium:', aiSolver.difficultySettings.medium.depth);

  // Debug issue 2: evaluationCache type
  console.log('evaluationCache type:', typeof aiSolver.evaluationCache);
  console.log('evaluationCache instanceof Map:', aiSolver.evaluationCache instanceof Map);
  console.log('evaluationCache constructor:', aiSolver.evaluationCache.constructor.name);

  // Debug issue 3 & 4: Down move simulation
  const moveTestBoard = [
    [2, 2, 0, 0],
    [4, 4, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0]
  ];

  console.log('Original board:');
  console.log(moveTestBoard);

  const downResult = aiSolver.simulateMove(moveTestBoard, 'down');
  console.log('Down move result:');
  console.log(downResult);

  console.log('Expected: bottom row should have [2, 2, 0, 0], actual bottom row:', downResult[3]);
})().catch(error => {
  console.error('Debug error:', error);
});
