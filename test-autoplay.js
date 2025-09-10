// Test autoplay functionality
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

// Setup DOM environment
const dom = new JSDOM(`
<!DOCTYPE html>
<html>
<head><title>Test</title></head>
<body>
<div id="game-board"></div>
<button id="ai-auto">Auto Play</button>
<div id="current-score">0</div>
<div id="best-score">0</div>
<div id="move-count">0</div>
</body>
</html>
`);

global.window = dom.window;
global.document = dom.window.document;
global.console = console;

// Load the required JavaScript files
const jsFiles = [
  'src/js/utils.js',
  'src/js/storage.js',
  'src/js/game-engine.js',
  'src/js/ai-solver.js',
  'src/js/ui-controller.js',
  'src/js/app.js'
];

console.log('Loading JavaScript files...');
for (const jsFile of jsFiles) {
  const filePath = path.join(__dirname, jsFile);
  if (fs.existsSync(filePath)) {
    const jsCode = fs.readFileSync(filePath, 'utf8');
    try {
      eval(jsCode);
      console.log(`✓ Loaded ${jsFile}`);
    } catch (error) {
      console.error(`✗ Error loading ${jsFile}:`, error.message);
    }
  } else {
    console.error(`✗ File not found: ${jsFile}`);
  }
}

// Test the classes
console.log('\nTesting classes...');
try {
  console.log('Utils available:', typeof Utils !== 'undefined');
  console.log('GameEngine available:', typeof GameEngine !== 'undefined');
  console.log('AISolver available:', typeof AISolver !== 'undefined');
  console.log('UIController available:', typeof UIController !== 'undefined');
  console.log('Fancy2048App available:', typeof Fancy2048App !== 'undefined');
  
  // Create instances
  const gameEngine = new GameEngine();
  console.log('✓ GameEngine created');
  
  const aiSolver = new AISolver(gameEngine);
  console.log('✓ AISolver created');
  
  // Test getting a move
  gameEngine.newGame();
  console.log('✓ New game started');
  
  aiSolver.getBestMove().then(move => {
    console.log('✓ AI suggested move:', move);
  }).catch(error => {
    console.error('✗ AI move failed:', error.message);
  });
  
} catch (error) {
  console.error('Test failed:', error.message);
}
