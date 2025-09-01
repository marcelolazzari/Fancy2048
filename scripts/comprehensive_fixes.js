/**
 * COMPREHENSIVE SYSTEM FIXES FOR FANCY2048
 * This file contains all the fixes needed to merge and improve the game logic
 */

console.log('🔧 Loading Comprehensive System Fixes...');

// =============================================================================
// 1. UNIFIED INITIALIZATION SYSTEM FIX
// =============================================================================

/**
 * Fix multiple initialization conflicts by providing a single master initializer
 */
function fixInitializationSystem() {
  console.log('🔧 Fixing initialization system conflicts...');
  
  // Clear any existing initialization timers
  if (window.initializationTimer) {
    clearTimeout(window.initializationTimer);
  }
  
  // Prevent duplicate initializations
  if (window.gameInitializationFixed) {
    console.log('✅ Initialization already fixed');
    return;
  }
  
  window.gameInitializationFixed = true;
  
  // Enhanced dependency checker
  function checkDependencies() {
    const requiredClasses = [
      'UnifiedDataManager',
      'UnifiedUIManager', 
      'Enhanced2048AI',
      'Game'
    ];
    
    const availableClasses = requiredClasses.filter(className => 
      typeof window[className] !== 'undefined'
    );
    
    console.log(`📊 Dependencies: ${availableClasses.length}/${requiredClasses.length} available`);
    console.log('Available:', availableClasses);
    
    const missingClasses = requiredClasses.filter(className => 
      typeof window[className] === 'undefined'
    );
    
    if (missingClasses.length > 0) {
      console.log('Missing:', missingClasses);
    }
    
    return missingClasses.length === 0;
  }
  
  // Master initialization function with enhanced error handling
  window.masterGameInit = function() {
    if (window.game && window.game.gameState !== 'error') {
      console.log('✅ Game already properly initialized');
      return;
    }
    
    try {
      console.log('🎮 Running master game initialization...');
      
      // Check dependencies with retry logic
      if (!checkDependencies()) {
        console.warn('⏳ Some dependencies not yet available, retrying...');
        setTimeout(window.masterGameInit, 300);
        return;
      }
      
      // Ensure managers are available
      if (!window.unifiedDataManager) {
        if (typeof UnifiedDataManager !== 'undefined') {
          window.unifiedDataManager = new UnifiedDataManager();
          console.log('✅ UnifiedDataManager created');
        } else {
          console.warn('⚠️ UnifiedDataManager not available, using fallback');
        }
      }
      
      if (!window.unifiedUIManager) {
        if (typeof UnifiedUIManager !== 'undefined') {
          window.unifiedUIManager = new UnifiedUIManager();
          console.log('✅ UnifiedUIManager created');
        } else {
          console.warn('⚠️ UnifiedUIManager not available, using fallback');
        }
      }
      
      // Create or fix game instance
      if (!window.game || window.game.gameState === 'error') {
        if (typeof Game !== 'undefined') {
          window.game = new Game(4);
          console.log('✅ Game instance created/fixed successfully');
          
          // Verify game has required methods
          const requiredMethods = ['move', 'canMove', 'addRandomTile', 'isGameOver', 'updateUI'];
          const missingMethods = requiredMethods.filter(method => 
            typeof window.game[method] !== 'function'
          );
          
          if (missingMethods.length > 0) {
            console.error('❌ Game missing required methods:', missingMethods);
          } else {
            console.log('✅ All game methods verified');
          }
        } else {
          throw new Error('Game class not available');
        }
      }
      
      // Verify game is working
      if (window.game && typeof window.game.updateUI === 'function') {
        try {
          window.game.updateUI();
          console.log('✅ Game UI updated successfully');
        } catch (uiError) {
          console.warn('⚠️ UI update failed, but game created:', uiError.message);
        }
      }
      
      // Mark initialization as successful
      window.gameInitialized = true;
      
      // Dispatch success event
      document.dispatchEvent(new CustomEvent('gameInitializationComplete', {
        detail: { 
          success: true,
          timestamp: Date.now(),
          game: window.game
        }
      }));
      
    } catch (error) {
      console.error('❌ Master initialization failed:', error);
      
      // Enhanced fallback with better error reporting
      try {
        if (typeof Game !== 'undefined') {
          console.log('🔄 Attempting fallback game creation...');
          window.game = new Game(4);
          console.log('⚡ Fallback game creation succeeded');
          
          // Dispatch partial success event
          document.dispatchEvent(new CustomEvent('gameInitializationComplete', {
            detail: { 
              success: true,
              fallback: true,
              timestamp: Date.now(),
              game: window.game
            }
          }));
        } else {
          console.error('� Game class still not available for fallback');
          
          // Dispatch failure event
          document.dispatchEvent(new CustomEvent('gameInitializationFailed', {
            detail: { 
              error: 'Game class not available',
              timestamp: Date.now()
            }
          }));
        }
      } catch (fallbackError) {
        console.error('💥 Even fallback failed:', fallbackError);
        
        // Dispatch complete failure event
        document.dispatchEvent(new CustomEvent('gameInitializationFailed', {
          detail: { 
            error: fallbackError.message,
            timestamp: Date.now()
          }
        }));
      }
    }
  };
  
  // Execute master init based on current state
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', window.masterGameInit, { once: true });
  } else {
    // DOM ready - run immediately with small delay for script loading
    setTimeout(window.masterGameInit, 100);
  }
}

// =============================================================================
// 2. GAME LOGIC IMPROVEMENTS
// =============================================================================

/**
 * Fix game logic issues and improve core gameplay
 */
function fixGameLogic() {
  console.log('🔧 Fixing game logic issues...');
  
  // Wait for game to be available
  function applyGameLogicFixes() {
    if (!window.game) {
      setTimeout(applyGameLogicFixes, 100);
      return;
    }
    
    // Fix move validation
    if (window.game && typeof window.game.canMove === 'function') {
      const originalCanMove = window.game.canMove.bind(window.game);
      window.game.canMove = function(direction) {
        try {
          return originalCanMove(direction);
        } catch (error) {
          console.warn('Move validation error:', error);
          return false;
        }
      };
    }
    
    // Improve game over detection
    if (window.game && typeof window.game.isGameOver === 'function') {
      const originalIsGameOver = window.game.isGameOver.bind(window.game);
      window.game.isGameOver = function() {
        try {
          // Check if there are empty cells first
          for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
              if (this.board[row][col] === 0) {
                return false; // Game not over - empty cells available
              }
            }
          }
          
          // Check if any moves are possible
          const directions = ['up', 'down', 'left', 'right'];
          for (const direction of directions) {
            if (this.canMove(direction)) {
              return false; // Game not over - move possible
            }
          }
          
          return true; // Game over - no moves possible
        } catch (error) {
          console.warn('Game over check error:', error);
          return originalIsGameOver();
        }
      };
    }
    
    // Enhanced AI integration fix
    if (window.game && !window.game.getBestMove) {
      window.game.getBestMove = function() {
        try {
          if (this.enhancedAI && typeof this.enhancedAI.getBestMove === 'function') {
            return this.enhancedAI.getBestMove();
          }
          
          if (window.Enhanced2048AI) {
            if (!this.enhancedAI) {
              this.enhancedAI = new Enhanced2048AI(this);
            }
            return this.enhancedAI.getBestMove();
          }
          
          // Fallback to basic AI logic
          const possibleMoves = ['up', 'down', 'left', 'right'];
          const validMoves = possibleMoves.filter(move => this.canMove(move));
          
          if (validMoves.length > 0) {
            return validMoves[Math.floor(Math.random() * validMoves.length)];
          }
          
          return null;
        } catch (error) {
          console.error('AI move generation failed:', error);
          return null;
        }
      };
    }
    
    console.log('✅ Game logic fixes applied');
  }
  
  applyGameLogicFixes();
}

// =============================================================================
// 3. UI AND RESPONSIVE FIXES
// =============================================================================

/**
 * Fix UI responsiveness and display issues
 */
function fixUIResponsiveness() {
  console.log('🔧 Fixing UI responsiveness...');
  
  // Fix score display synchronization
  function syncScoreDisplays() {
    if (!window.game) return;
    
    const scoreElements = ['score', 'mobile-score'];
    const bestScoreElements = ['best-score', 'mobile-best-score'];
    const movesElements = ['moves', 'mobile-moves'];
    const timeElements = ['time', 'mobile-time'];
    
    function updateElements(elementIds, value) {
      elementIds.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
          element.textContent = value;
        }
      });
    }
    
    // Override game's update methods to sync all displays
    if (typeof window.game.updateUI === 'function') {
      const originalUpdateUI = window.game.updateUI.bind(window.game);
      window.game.updateUI = function() {
        originalUpdateUI();
        
        // Sync all score displays
        updateElements(scoreElements, this.score);
        updateElements(bestScoreElements, this.bestScore);
        updateElements(movesElements, this.moves);
        
        // Update time display
        const timeStr = this.formatTime ? this.formatTime() : '00:00';
        updateElements(timeElements, timeStr);
      };
    }
  }
  
  // Apply responsive fixes when game is ready
  function applyResponsiveFixes() {
    if (!window.game) {
      setTimeout(applyResponsiveFixes, 100);
      return;
    }
    
    syncScoreDisplays();
    
    // Fix board scaling on different screen sizes
    if (typeof window.game.refreshLayout === 'function') {
      window.game.refreshLayout();
    }
    
    console.log('✅ UI responsiveness fixes applied');
  }
  
  applyResponsiveFixes();
}

// =============================================================================
// 4. DATA PERSISTENCE FIXES
// =============================================================================

/**
 * Fix data persistence and localStorage issues
 */
function fixDataPersistence() {
  console.log('🔧 Fixing data persistence...');
  
  // Ensure localStorage is working
  try {
    localStorage.setItem('fancy2048_test', 'test');
    localStorage.removeItem('fancy2048_test');
    console.log('✅ localStorage is available');
  } catch (error) {
    console.warn('⚠️ localStorage not available:', error);
    return;
  }
  
  // Fix data manager integration
  function applyDataFixes() {
    if (!window.game) {
      setTimeout(applyDataFixes, 100);
      return;
    }
    
    // Ensure game has proper data manager
    if (!window.game.dataManager) {
      if (window.unifiedDataManager) {
        window.game.dataManager = window.unifiedDataManager;
      } else {
        // Create minimal fallback data manager
        window.game.dataManager = {
          getData: (key, defaultValue) => {
            try {
              const data = localStorage.getItem(key);
              return data ? JSON.parse(data) : defaultValue;
            } catch (error) {
              return defaultValue;
            }
          },
          setData: (key, value) => {
            try {
              localStorage.setItem(key, JSON.stringify(value));
            } catch (error) {
              console.warn('Failed to save data:', error);
            }
          }
        };
      }
    }
    
    // Auto-save game state periodically
    if (!window.game.autoSaveInterval) {
      window.game.autoSaveInterval = setInterval(() => {
        if (window.game && window.game.gameState === 'playing') {
          try {
            const gameState = {
              board: window.game.board,
              score: window.game.score,
              moves: window.game.moves,
              time: Date.now() - (window.game.startTime || Date.now())
            };
            window.game.dataManager.setData('currentGame', gameState);
          } catch (error) {
            console.warn('Auto-save failed:', error);
          }
        }
      }, 10000); // Save every 10 seconds
    }
    
    console.log('✅ Data persistence fixes applied');
  }
  
  applyDataFixes();
}

// =============================================================================
// 5. PERFORMANCE OPTIMIZATIONS
// =============================================================================

/**
 * Apply performance optimizations
 */
function applyPerformanceOptimizations() {
  console.log('🔧 Applying performance optimizations...');
  
  // Debounce resize events
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      if (window.game && typeof window.game.refreshLayout === 'function') {
        window.game.refreshLayout();
      }
    }, 250);
  });
  
  // Optimize touch handling on mobile
  if ('ontouchstart' in window) {
    // Passive event listeners for better scroll performance
    document.addEventListener('touchstart', () => {}, { passive: true });
    document.addEventListener('touchmove', () => {}, { passive: true });
  }
  
  console.log('✅ Performance optimizations applied');
}

// =============================================================================
// MAIN EXECUTION
// =============================================================================

/**
 * Apply all fixes in the correct order
 */
function applyComprehensiveFixes() {
  console.log('🚀 Applying comprehensive system fixes...');
  
  // Prevent multiple executions
  if (window.systemFixesApplied) {
    console.log('✅ System fixes already applied, skipping...');
    return;
  }
  
  try {
    // Apply fixes in order
    fixInitializationSystem();
    
    // Apply other fixes after initialization with enhanced timing
    const initDelay = document.readyState === 'complete' ? 200 : 800;
    
    setTimeout(() => {
      try {
        fixGameLogic();
        fixUIResponsiveness(); 
        fixDataPersistence();
        applyPerformanceOptimizations();
        
        // Mark as complete
        window.systemFixesApplied = true;
        
        console.log('🎉 Comprehensive system fixes completed!');
        
        // Trigger master initialization after all fixes
        setTimeout(() => {
          if (typeof window.masterGameInit === 'function') {
            console.log('🎯 Triggering master initialization after all fixes...');
            window.masterGameInit();
          } else {
            console.warn('⚠️ masterGameInit not available, using direct initialization');
            try {
              if (typeof Game !== 'undefined' && !window.game) {
                window.game = new Game(4);
                console.log('✅ Direct game initialization succeeded');
              }
            } catch (directError) {
              console.error('💥 Direct initialization failed:', directError);
            }
          }
        }, 100);
        
        // Dispatch completion event
        document.dispatchEvent(new CustomEvent('systemFixesComplete', {
          detail: { 
            timestamp: Date.now(),
            gameInitialized: !!window.game
          }
        }));
        
      } catch (error) {
        console.error('❌ Error applying secondary fixes:', error);
        
        // Emergency game creation if everything else failed
        setTimeout(() => {
          if (!window.game && typeof Game !== 'undefined') {
            try {
              window.game = new Game(4);
              console.log('🆘 Emergency game creation succeeded');
            } catch (emergencyError) {
              console.error('🚨 Emergency creation failed:', emergencyError);
            }
          }
        }, 1000);
      }
    }, initDelay);
    
  } catch (error) {
    console.error('❌ Error applying primary fixes:', error);
    
    // Fallback for critical failures
    setTimeout(() => {
      try {
        if (typeof Game !== 'undefined' && !window.game) {
          window.game = new Game(4);
          console.log('🔄 Critical failure recovery succeeded');
        }
      } catch (recoveryError) {
        console.error('💀 Complete system failure:', recoveryError);
      }
    }, 2000);
  }
}

// Execute fixes based on current DOM state
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', applyComprehensiveFixes, { once: true });
} else {
  // DOM already ready
  setTimeout(applyComprehensiveFixes, 50);
}

// Backup execution after full page load
window.addEventListener('load', () => {
  if (!window.systemFixesApplied) {
    console.log('🚨 Running backup system fixes...');
    applyComprehensiveFixes();
  }
}, { once: true });

console.log('📦 Comprehensive System Fixes loaded and ready');
