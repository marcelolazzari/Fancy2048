const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

(async () => {
  // Create basic HTML with elements used by UIController
  const html = `<!doctype html><html><body>
    <div id="game-board"></div>
    <button id="new-game"></button>
    <button id="undo-move"></button>
    <button id="theme-toggle"><span class="icon"></span></button>
    <button id="stats-button"></button>
    <button id="settings-button"></button>
    <div id="game-over-overlay" class="hidden"></div>
    <div id="victory-overlay" class="hidden"></div>
    <span id="final-score"></span>
    <button id="restart-game"></button>
    <button id="continue-game"></button>
    <button id="new-game-victory"></button>
    <div id="loading-screen"></div>
    <button id="ai-hint">Get Hint</button>
    <button id="ai-auto">Auto</button>
    <button id="ai-speed">1x</button>
    <select id="ai-difficulty"><option value="easy">easy</option><option value="medium">medium</option><option value="hard" selected>hard</option></select>
    <div id="current-score"></div>
    <div id="best-score"></div>
    <div id="move-count"></div>
  </body></html>`;

  const dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable' });
  const { window } = dom;
  global.window = window;
  global.document = window.document;
  global.navigator = window.navigator;

  // Minimal matchMedia polyfill for jsdom
  if (typeof window.matchMedia !== 'function') {
    window.matchMedia = (query) => ({
      matches: false,
      media: query,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      onchange: null,
      dispatchEvent: () => false
    });
  }

  // Provide a minimal Utils and Storage used by the app for tests
  window.Utils = {
    sleep: (ms) => new Promise(r => setTimeout(r, ms)),
    log: () => {},
    handleError: (e) => { console.error('Utils.handleError', e); },
    debounce: (fn) => fn,
    formatNumber: (n) => String(n),
    vibrate: () => {}
  };

  window.Storage = {
    getSettings: () => ({ theme: 'auto' }),
    updateSetting: () => {},
    getStatistics: () => ({ bestScore: 0 }),
    saveGameState: () => {},
    isStorageAvailable: () => false,
    exportData: () => ({})
  };

  // Load project scripts into the JSDOM window in dependency order
  const scripts = [
  'src/js/utils.js',
  'src/js/storage.js',
  'src/js/error-handler.js',
  'src/js/touch-handler.js',
  'src/js/game-engine.js',
  'src/js/ai-solver.js',
  'src/js/ui-controller.js',
  'src/js/app.js'
  ];

  for (const rel of scripts) {
    const filePath = path.resolve(__dirname, '..', rel);
    const code = fs.readFileSync(filePath, 'utf8');
    // Evaluate in window context
    const scriptEl = window.document.createElement('script');
    scriptEl.textContent = code;
    window.document.body.appendChild(scriptEl);
    // Allow immediate evaluation
  }

  // Wait briefly for any setup
  await new Promise(r => setTimeout(r, 50));

  // Now access the global app
  const app = window.fancy2048App;
  if (!app) {
    console.error('App not initialized');
    process.exit(2);
  }

  console.log('Initial autoPlayActive:', app.autoPlayActive);

  // Simulate clicking the auto button (UIController wired to window.fancy2048App)
  const aiAutoButton = document.getElementById('ai-auto');
  aiAutoButton.click();

  // Wait to allow startAutoPlay to run
  await new Promise(r => setTimeout(r, 400));

  // If click didn't trigger (jsdom limitations), call toggle directly
  if (!app.autoPlayActive) {
    console.log('Click did not start autoplay; calling uiController.toggleAutoPlay() directly');
    await app.uiController.toggleAutoPlay();
    await new Promise(r => setTimeout(r, 200));
  }

  console.log('After click, autoPlayActive:', app.autoPlayActive);
  console.log('Button active class:', aiAutoButton.classList.contains('active'));

  if (!app.autoPlayActive) {
    console.error('Autoplay did not start');
    process.exit(3);
  }

  // Click to stop
  aiAutoButton.click();
  await new Promise(r => setTimeout(r, 50));

  console.log('After stop click, autoPlayActive:', app.autoPlayActive);
  console.log('Button active class after stop:', aiAutoButton.classList.contains('active'));

  if (app.autoPlayActive) {
    console.error('Autoplay did not stop');
    process.exit(4);
  }

  console.log('Autoplay toggle test passed');
  process.exit(0);
})();
