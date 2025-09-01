/**
 * UNIFIED INITIALIZATION FIX FOR FANCY2048
 * This file fixes the multiple initialization conflicts and provides a single, reliable initialization system
 */

console.log('🔧 Loading Unified Initialization Fix...');

// Global initialization state
window.gameInitializationState = {
  completed: false,
  inProgress: false,
  attempts: 0,
  maxAttempts: 3
};

// Override any existing initialization to prevent conflicts
if (window.initializationComplete !== undefined) {
  console.log('⚠️ Found existing initialization state, consolidating...');
}

// Unified initialization function
function unifiedGameInitialization() {
  const state = window.gameInitializationState;
  
  // Prevent multiple simultaneous initializations
  if (state.completed || state.inProgress) {
    console.log('🎮 Game initialization already completed or in progress');
    return Promise.resolve(window.game);
  }
  
  state.inProgress = true;
  state.attempts++;
  
  console.log(`🚀 Starting unified initialization (attempt ${state.attempts}/${state.maxAttempts})`);
  
  return new Promise((resolve, reject) => {
    try {
      // Check DOM readiness
      if (document.readyState === 'loading') {
        console.log('⏳ DOM still loading, waiting for DOMContentLoaded...');
        document.addEventListener('DOMContentLoaded', () => {
          unifiedGameInitialization().then(resolve).catch(reject);
        }, { once: true });
        state.inProgress = false;
        return;
      }
      
      // Verify required DOM elements exist
      const requiredElements = ['board-container', 'score', 'best-score', 'moves', 'time'];
      const missingElements = requiredElements.filter(id => !document.getElementById(id));
      
      if (missingElements.length > 0) {
        throw new Error(`Missing required DOM elements: ${missingElements.join(', ')}`);
      }
      
      // Initialize or use existing game instance
      if (!window.game) {
        const savedSize = localStorage.getItem('boardSize') || '4';
        const size = parseInt(savedSize, 10);
        
        console.log(`🎮 Creating new game instance (${size}×${size})`);
        window.game = new Game(size);
      } else {
        console.log('ℹ️ Using existing game instance');
      }
      
      // Initialize supporting systems
      initializeSupportingSystems();
      
      // Mark initialization as complete
      state.completed = true;
      state.inProgress = false;
      
      console.log('✅ Unified initialization completed successfully!');
      
      // Dispatch initialization complete event
      document.dispatchEvent(new CustomEvent('unifiedGameInitialized', {
        detail: { 
          game: window.game, 
          timestamp: Date.now(),
          attempts: state.attempts
        }
      }));
      
      resolve(window.game);
      
    } catch (error) {
      console.error('❌ Unified initialization failed:', error);
      state.inProgress = false;
      
      // Retry logic
      if (state.attempts < state.maxAttempts) {
        console.log(`🔄 Retrying initialization in 1 second... (${state.attempts}/${state.maxAttempts})`);
        setTimeout(() => {
          unifiedGameInitialization().then(resolve).catch(reject);
        }, 1000);
      } else {
        console.error('❌ Max initialization attempts reached');
        reject(error);
      }
    }
  });
}

// Initialize supporting systems
function initializeSupportingSystems() {
  // Initialize performance monitoring if available
  if (typeof GamePerformanceMonitor !== 'undefined' && GamePerformanceMonitor.startMonitoring) {
    try {
      GamePerformanceMonitor.startMonitoring();
      console.log('📊 Performance monitoring initialized');
    } catch (error) {
      console.warn('⚠️ Performance monitoring initialization failed:', error);
    }
  }
  
  // Initialize accessibility enhancements if available
  if (typeof AccessibilityEnhancer !== 'undefined' && AccessibilityEnhancer.initialize) {
    try {
      AccessibilityEnhancer.initialize();
      console.log('♿ Accessibility enhancements initialized');
    } catch (error) {
      console.warn('⚠️ Accessibility enhancements initialization failed:', error);
    }
  }
  
  // Initialize unified managers if not already done
  if (window.game) {
    if (!window.game.dataManager && window.UnifiedDataManager) {
      try {
        window.game.dataManager = new UnifiedDataManager();
        console.log('📊 Data manager initialized');
      } catch (error) {
        console.warn('⚠️ Data manager initialization failed:', error);
      }
    }
    
    if (!window.game.uiManager && window.UnifiedUIManager) {
      try {
        window.game.uiManager = new UnifiedUIManager();
        console.log('🎨 UI manager initialized');
      } catch (error) {
        console.warn('⚠️ UI manager initialization failed:', error);
      }
    }
  }
}

// Enhanced error recovery
function handleInitializationError(error) {
  console.error('🚨 Critical initialization error:', error);
  
  // Try to show a user-friendly error message
  const boardContainer = document.getElementById('board-container');
  if (boardContainer) {
    boardContainer.innerHTML = `
      <div style="
        text-align: center;
        padding: 40px 20px;
        background: rgba(244, 67, 54, 0.1);
        border: 2px solid #f44336;
        border-radius: 10px;
        color: #f44336;
      ">
        <h3>⚠️ Initialization Error</h3>
        <p>The game failed to initialize properly.</p>
        <button onclick="window.location.reload()" style="
          background: #f44336;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 5px;
          cursor: pointer;
          margin-top: 10px;
        ">
          Reload Page
        </button>
      </div>
    `;
  }
}

// Auto-start initialization
function startUnifiedInitialization() {
  unifiedGameInitialization()
    .then((game) => {
      console.log('🎉 Game ready!', game);
    })
    .catch(handleInitializationError);
}

// Trigger initialization based on document state
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startUnifiedInitialization, { once: true });
} else {
  // Document already loaded, start immediately
  setTimeout(startUnifiedInitialization, 100);
}

// Expose utility functions globally
window.unifiedGameInitialization = unifiedGameInitialization;
window.startUnifiedInitialization = startUnifiedInitialization;

console.log('✅ Unified Initialization Fix loaded');
