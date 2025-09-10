/**
 * Test the new AI algorithms
 */

// Create a simple HTML test page
console.log('Testing AI Solver...');

// Test board configuration
const testBoard = [
  [2, 4, 8, 16],
  [0, 2, 4, 8],
  [0, 0, 2, 4],
  [0, 0, 0, 2]
];

// Mock GameEngine for testing
class MockGameEngine {
  constructor() {
    this.board = testBoard;
  }
}

// Test all algorithms
async function testAI() {
  const gameEngine = new MockGameEngine();
  const ai = new AISolver(gameEngine);
  
  console.log('Initial board:', testBoard);
  
  // Test Expectimax
  console.log('\nTesting Expectimax Algorithm:');
  ai.setAlgorithm('expectimax');
  for (const difficulty of ['easy', 'medium', 'hard', 'expert']) {
    ai.setDifficulty(difficulty);
    const start = Date.now();
    const move = await ai.getBestMove();
    const time = Date.now() - start;
    console.log(`${difficulty}: ${move} (${time}ms)`);
  }
  
  // Test Monte Carlo
  console.log('\nTesting Monte Carlo Algorithm:');
  ai.setAlgorithm('montecarlo');
  for (const difficulty of ['easy', 'medium', 'hard']) {
    ai.setDifficulty(difficulty);
    const start = Date.now();
    const move = await ai.getBestMove();
    const time = Date.now() - start;
    console.log(`${difficulty}: ${move} (${time}ms)`);
  }
  
  // Test Priority-based
  console.log('\nTesting Priority-based Algorithm:');
  ai.setAlgorithm('priority');
  for (const difficulty of ['easy', 'medium', 'hard', 'expert']) {
    ai.setDifficulty(difficulty);
    const start = Date.now();
    const move = await ai.getBestMove();
    const time = Date.now() - start;
    console.log(`${difficulty}: ${move} (${time}ms)`);
  }
  
  // Test Smart Hybrid
  console.log('\nTesting Smart Hybrid Algorithm:');
  ai.setAlgorithm('smart');
  for (const difficulty of ['easy', 'medium', 'hard']) {
    ai.setDifficulty(difficulty);
    const start = Date.now();
    const move = await ai.getBestMove();
    const time = Date.now() - start;
    console.log(`${difficulty}: ${move} (${time}ms)`);
  }
  
  // Show final statistics
  console.log('\nFinal AI Statistics:', ai.getStats());
}

// Run the test
if (typeof window !== 'undefined') {
  // Browser environment
  window.addEventListener('load', () => {
    setTimeout(() => {
      if (typeof AISolver !== 'undefined') {
        testAI().catch(console.error);
      } else {
        console.error('AISolver not available');
      }
    }, 1000);
  });
} else {
  // Node.js environment
  testAI().catch(console.error);
}
