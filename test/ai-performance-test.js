/**
 * AI Performance and Stress Test
 * Tests AI performance under various game scenarios
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

// Performance tracking
let totalMoves = 0;
let totalThinkingTime = 0;
let bestMoveTime = 0;
let worstMoveTime = 0;

function log(message) {
  console.log(`[AI-PERF] ${message}`);
}

(async () => {
  log('Starting AI performance test...');

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

  log('Environment setup complete. Starting performance tests...');

  // === Performance Test 1: Different Difficulties ===
  log('\n=== Performance Test 1: Different Difficulties ===');

  const difficulties = ['easy', 'medium', 'hard'];
  const testBoard = [
    [2, 4, 8, 16],
    [32, 64, 128, 256],
    [0, 0, 2, 4],
    [0, 0, 0, 0]
  ];

  gameEngine.board = testBoard.map(row => [...row]);
  gameEngine.isGameOver = false;

  for (const difficulty of difficulties) {
    aiSolver.setDifficulty(difficulty);
    
    const startTime = Date.now();
    const move = await aiSolver.getBestMove();
    const endTime = Date.now();
    const thinkingTime = endTime - startTime;
    
    log(`${difficulty.toUpperCase()}: Move=${move}, Time=${thinkingTime}ms, Depth=${aiSolver.difficultySettings[difficulty].depth}`);
    
    totalMoves++;
    totalThinkingTime += thinkingTime;
    
    if (bestMoveTime === 0 || thinkingTime < bestMoveTime) {
      bestMoveTime = thinkingTime;
    }
    if (thinkingTime > worstMoveTime) {
      worstMoveTime = thinkingTime;
    }
  }

  // === Performance Test 2: Full Game Simulation ===
  log('\n=== Performance Test 2: Full Game Simulation ===');

  aiSolver.setDifficulty('easy'); // Use easy for faster simulation
  gameEngine.initialize();
  
  let moveCount = 0;
  let gameScore = 0;
  const maxMoves = 50; // Limit to prevent infinite loops

  while (!gameEngine.isGameOver && moveCount < maxMoves) {
    const startTime = Date.now();
    const move = await aiSolver.getBestMove();
    const endTime = Date.now();
    
    if (move) {
      const moveResult = gameEngine.move(move);
      if (moveResult.moved) {
        gameScore = gameEngine.score;
        moveCount++;
        
        const thinkingTime = endTime - startTime;
        if (moveCount % 10 === 0) {
          log(`Move ${moveCount}: ${move}, Score=${gameScore}, Time=${thinkingTime}ms`);
        }
        
        totalMoves++;
        totalThinkingTime += thinkingTime;
        
        if (bestMoveTime === 0 || thinkingTime < bestMoveTime) {
          bestMoveTime = thinkingTime;
        }
        if (thinkingTime > worstMoveTime) {
          worstMoveTime = thinkingTime;
        }
      } else {
        log('Move failed - no valid moves available');
        break;
      }
    } else {
      log('AI returned null move');
      break;
    }
  }

  log(`Game completed: ${moveCount} moves, Final score: ${gameScore}`);

  // === Performance Test 3: Complex Board States ===
  log('\n=== Performance Test 3: Complex Board States ===');

  const complexBoards = [
    // Nearly full board
    [
      [2, 4, 8, 16],
      [32, 64, 128, 256],
      [512, 1024, 2, 4],
      [8, 16, 32, 0]
    ],
    // High-value corner strategy
    [
      [1024, 512, 256, 128],
      [64, 32, 16, 8],
      [4, 2, 0, 0],
      [0, 0, 0, 0]
    ],
    // Mixed high values
    [
      [2048, 1024, 512, 256],
      [128, 64, 32, 16],
      [8, 4, 2, 0],
      [0, 0, 0, 0]
    ]
  ];

  aiSolver.setDifficulty('medium');

  for (let i = 0; i < complexBoards.length; i++) {
    gameEngine.board = complexBoards[i].map(row => [...row]);
    gameEngine.isGameOver = false;
    
    const startTime = Date.now();
    const move = await aiSolver.getBestMove();
    const endTime = Date.now();
    const thinkingTime = endTime - startTime;
    
    const maxTile = Math.max(...complexBoards[i].flat());
    log(`Complex Board ${i + 1}: MaxTile=${maxTile}, Move=${move}, Time=${thinkingTime}ms`);
    
    totalMoves++;
    totalThinkingTime += thinkingTime;
    
    if (bestMoveTime === 0 || thinkingTime < bestMoveTime) {
      bestMoveTime = thinkingTime;
    }
    if (thinkingTime > worstMoveTime) {
      worstMoveTime = thinkingTime;
    }
  }

  // === Performance Test 4: Evaluation Function Stress Test ===
  log('\n=== Performance Test 4: Evaluation Function Stress Test ===');

  const iterations = 1000;
  const startTime = Date.now();

  for (let i = 0; i < iterations; i++) {
    // Generate random board
    const randomBoard = [];
    for (let row = 0; row < 4; row++) {
      randomBoard[row] = [];
      for (let col = 0; col < 4; col++) {
        const rand = Math.random();
        if (rand < 0.3) {
          randomBoard[row][col] = 0;
        } else if (rand < 0.6) {
          randomBoard[row][col] = 2;
        } else if (rand < 0.8) {
          randomBoard[row][col] = 4;
        } else {
          randomBoard[row][col] = Math.pow(2, Math.floor(Math.random() * 10) + 3);
        }
      }
    }
    
    const score = aiSolver.evaluateBoardAdvanced(randomBoard);
    if (i % 200 === 0) {
      log(`Evaluation ${i}: Score=${score.toFixed(2)}`);
    }
  }

  const endTime = Date.now();
  const evaluationTime = endTime - startTime;
  log(`${iterations} evaluations completed in ${evaluationTime}ms (${(evaluationTime/iterations).toFixed(2)}ms per evaluation)`);

  // === Performance Test 5: Cache Performance ===
  log('\n=== Performance Test 5: Cache Performance ===');

  aiSolver.clearCache();
  const testBoardForCache = [
    [2, 4, 8, 16],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0]
  ];

  // First evaluation (should cache)
  const firstEvalStart = Date.now();
  const firstScore = aiSolver.evaluateBoardAdvanced(testBoardForCache);
  const firstEvalTime = Date.now() - firstEvalStart;

  // Second evaluation (should use cache)
  const secondEvalStart = Date.now();
  const secondScore = aiSolver.evaluateBoardAdvanced(testBoardForCache);
  const secondEvalTime = Date.now() - secondEvalStart;

  log(`First evaluation: ${firstEvalTime}ms, Score: ${firstScore.toFixed(2)}`);
  log(`Cached evaluation: ${secondEvalTime}ms, Score: ${secondScore.toFixed(2)}`);
  log(`Cache speedup: ${firstEvalTime > 0 ? (firstEvalTime/Math.max(secondEvalTime, 1)).toFixed(2) : 'N/A'}x`);
  log(`Cache size: ${aiSolver.evaluationCache.size}`);

  // === Performance Test 6: Memory Usage ===
  log('\n=== Performance Test 6: Memory Usage ===');

  // Fill cache to near capacity
  for (let i = 0; i < 100; i++) {
    const randomBoard = [];
    for (let row = 0; row < 4; row++) {
      randomBoard[row] = [];
      for (let col = 0; col < 4; col++) {
        randomBoard[row][col] = Math.random() < 0.5 ? 0 : Math.pow(2, Math.floor(Math.random() * 5) + 1);
      }
    }
    aiSolver.evaluateBoardAdvanced(randomBoard);
  }

  log(`Cache size after stress test: ${aiSolver.evaluationCache.size}`);
  log(`Max cache size limit: ${aiSolver.maxCacheSize}`);

  // === Performance Summary ===
  log('\n=== Performance Summary ===');
  log(`Total moves tested: ${totalMoves}`);
  log(`Total thinking time: ${totalThinkingTime}ms`);
  log(`Average thinking time: ${totalMoves > 0 ? (totalThinkingTime / totalMoves).toFixed(2) : 0}ms per move`);
  log(`Fastest move: ${bestMoveTime}ms`);
  log(`Slowest move: ${worstMoveTime}ms`);

  const aiStats = aiSolver.getStats();
  log(`Final AI state: Difficulty=${aiStats.difficulty}, Depth=${aiStats.maxDepth}, CacheSize=${aiStats.cacheSize}`);

  log('\n🎯 AI Performance test completed successfully!');
})().catch(error => {
  console.error('Performance test error:', error);
  process.exit(1);
});
