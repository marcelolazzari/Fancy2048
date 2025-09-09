/**
 * Fancy2048 - Python Backend Bridge
 * Connects the JavaScript frontend with the Python Flask backend
 */

class PythonBackendBridge {
  constructor() {
    this.apiBaseUrl = this.getApiBaseUrl();
    this.sessionId = this.generateSessionId();
    this.isConnected = false;
    
    // Initialize connection
    this.initializeConnection();
  }
  
  /**
   * Get API base URL (auto-detect development vs production)
   */
  getApiBaseUrl() {
    // Check if we're running locally
    if (window.location.hostname === 'localhost' || 
        window.location.hostname === '127.0.0.1' ||
        window.location.hostname.includes('gitpod') ||
        window.location.hostname.includes('codespace')) {
      return 'http://localhost:5000';
    }
    
    // For production, you'd set up a proper backend deployment
    // For now, fall back to same origin
    return window.location.origin;
  }
  
  /**
   * Generate unique session ID
   */
  generateSessionId() {
    return 'session_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  }
  
  /**
   * Initialize connection to Python backend
   */
  async initializeConnection() {
    try {
      const response = await this.apiCall('/api/health', 'GET');
      if (response.success) {
        this.isConnected = true;
        console.log('✓ Connected to Python backend:', response.data);
        
        // Initialize game state
        await this.initializeGame();
      }
    } catch (error) {
      console.warn('⚠️ Python backend not available, falling back to JavaScript implementation');
      this.isConnected = false;
    }
  }
  
  /**
   * Initialize game state
   */
  async initializeGame() {
    try {
      const response = await this.apiCall('/api/game/state', 'GET');
      return response.data;
    } catch (error) {
      console.error('Failed to initialize game:', error);
      throw error;
    }
  }
  
  /**
   * Make API call to Python backend
   */
  async apiCall(endpoint, method = 'GET', data = null) {
    const url = this.apiBaseUrl + endpoint;
    
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };
    
    if (data) {
      // Add session ID to all requests
      data.session_id = this.sessionId;
      options.body = JSON.stringify(data);
    } else if (method === 'GET' && endpoint.includes('?')) {
      // Add session ID to GET requests
      const separator = endpoint.includes('?') ? '&' : '?';
      endpoint += separator + 'session_id=' + this.sessionId;
    }
    
    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new Error(`API call failed: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  }
  
  /**
   * Make a move
   */
  async makeMove(direction) {
    if (!this.isConnected) {
      throw new Error('Python backend not available');
    }
    
    const response = await this.apiCall('/api/game/move', 'POST', {
      direction: direction
    });
    
    return response.data;
  }
  
  /**
   * Start new game
   */
  async newGame(boardSize = 4) {
    if (!this.isConnected) {
      throw new Error('Python backend not available');
    }
    
    const response = await this.apiCall('/api/game/new', 'POST', {
      board_size: boardSize
    });
    
    return response.data;
  }
  
  /**
   * Undo last move
   */
  async undoMove() {
    if (!this.isConnected) {
      throw new Error('Python backend not available');
    }
    
    const response = await this.apiCall('/api/game/undo', 'POST');
    return response.data;
  }
  
  /**
   * Get AI hint
   */
  async getAIHint() {
    if (!this.isConnected) {
      throw new Error('Python backend not available');
    }
    
    const response = await this.apiCall('/api/ai/hint', 'POST');
    return response.data;
  }
  
  /**
   * Toggle auto-play
   */
  async toggleAutoPlay(action = 'toggle') {
    if (!this.isConnected) {
      throw new Error('Python backend not available');
    }
    
    const response = await this.apiCall('/api/ai/auto-play', 'POST', {
      action: action
    });
    
    return response.data;
  }
  
  /**
   * Play auto move
   */
  async playAutoMove() {
    if (!this.isConnected) {
      throw new Error('Python backend not available');
    }
    
    const response = await this.apiCall('/api/ai/auto-move', 'POST');
    return response.data;
  }
  
  /**
   * Set AI difficulty
   */
  async setAIDifficulty(difficulty) {
    if (!this.isConnected) {
      throw new Error('Python backend not available');
    }
    
    const response = await this.apiCall('/api/ai/difficulty', 'POST', {
      difficulty: difficulty
    });
    
    return response.data;
  }
  
  /**
   * Set board size
   */
  async setBoardSize(size) {
    if (!this.isConnected) {
      throw new Error('Python backend not available');
    }
    
    const response = await this.apiCall('/api/game/board-size', 'POST', {
      size: size
    });
    
    return response.data;
  }
  
  /**
   * Get current game state
   */
  async getGameState() {
    if (!this.isConnected) {
      throw new Error('Python backend not available');
    }
    
    const response = await this.apiCall('/api/game/state', 'GET');
    return response.data;
  }
}

// Enhanced App class that can use either Python backend or JavaScript implementation
class EnhancedFancy2048App extends Fancy2048App {
  constructor() {
    super();
    
    // Initialize Python backend bridge
    this.pythonBridge = new PythonBackendBridge();
    this.usePythonBackend = false;
    
    // Wait for backend connection
    this.initializeBridge();
  }
  
  async initializeBridge() {
    // Wait a bit for the bridge to connect
    await Utils.sleep(1000);
    
    if (this.pythonBridge.isConnected) {
      this.usePythonBackend = true;
      console.log('🐍 Using Python backend for game logic');
      
      // Sync initial state
      await this.syncWithPythonBackend();
    } else {
      console.log('📱 Using JavaScript implementation');
    }
  }
  
  /**
   * Sync with Python backend state
   */
  async syncWithPythonBackend() {
    try {
      const state = await this.pythonBridge.getGameState();
      this.updateUIFromPythonState(state);
    } catch (error) {
      console.error('Failed to sync with Python backend:', error);
      this.usePythonBackend = false;
    }
  }
  
  /**
   * Update UI from Python game state
   */
  updateUIFromPythonState(pythonState) {
    if (!pythonState || !pythonState.game) return;
    
    const gameState = pythonState.game;
    
    // Update JavaScript game engine to match
    this.gameEngine.board = gameState.board;
    this.gameEngine.score = gameState.score;
    this.gameEngine.moves = gameState.moves;
    this.gameEngine.isGameOver = gameState.is_game_over;
    this.gameEngine.hasWon = gameState.has_won;
    
    // Update UI
    this.uiController.updateDisplay();
  }
  
  /**
   * Enhanced move method that uses Python backend if available
   */
  async enhancedMove(direction) {
    if (this.usePythonBackend) {
      try {
        const result = await this.pythonBridge.makeMove(direction);
        this.updateUIFromPythonState(result.game_state);
        return result.move_success;
      } catch (error) {
        console.error('Python backend move failed:', error);
        // Fall back to JavaScript
        this.usePythonBackend = false;
      }
    }
    
    // Use JavaScript implementation
    return this.gameEngine.move(direction);
  }
  
  /**
   * Enhanced new game
   */
  async enhancedNewGame(boardSize = 4) {
    if (this.usePythonBackend) {
      try {
        const result = await this.pythonBridge.newGame(boardSize);
        this.updateUIFromPythonState(result);
        return;
      } catch (error) {
        console.error('Python backend new game failed:', error);
        this.usePythonBackend = false;
      }
    }
    
    // Use JavaScript implementation
    if (boardSize !== this.gameEngine.size) {
      this.gameEngine.setBoardSize(boardSize);
    }
    this.gameEngine.newGame();
    this.uiController.updateDisplay();
  }
  
  /**
   * Enhanced undo
   */
  async enhancedUndo() {
    if (this.usePythonBackend) {
      try {
        const result = await this.pythonBridge.undoMove();
        this.updateUIFromPythonState(result.game_state);
        return result.undo_success;
      } catch (error) {
        console.error('Python backend undo failed:', error);
        this.usePythonBackend = false;
      }
    }
    
    // Use JavaScript implementation
    return this.gameEngine.undo();
  }
  
  /**
   * Enhanced AI hint
   */
  async enhancedGetAIHint() {
    if (this.usePythonBackend) {
      try {
        const result = await this.pythonBridge.getAIHint();
        return result.hint;
      } catch (error) {
        console.error('Python backend AI hint failed:', error);
        this.usePythonBackend = false;
      }
    }
    
    // Use JavaScript implementation
    return await this.getAIHint();
  }
  
  /**
   * Enhanced auto-play toggle
   */
  async enhancedToggleAutoPlay() {
    if (this.usePythonBackend) {
      try {
        const result = await this.pythonBridge.toggleAutoPlay();
        this.updateUIFromPythonState(result.game_state);
        return result.auto_play_active;
      } catch (error) {
        console.error('Python backend auto-play failed:', error);
        this.usePythonBackend = false;
      }
    }
    
    // Use JavaScript implementation
    this.toggleAutoPlay();
    return this.autoPlayActive;
  }
  
  /**
   * Enhanced auto-move for Python backend
   */
  async enhancedPlayAutoMove() {
    if (this.usePythonBackend) {
      try {
        const result = await this.pythonBridge.playAutoMove();
        this.updateUIFromPythonState(result.game_state);
        return result.move_success;
      } catch (error) {
        console.error('Python backend auto-move failed:', error);
        this.usePythonBackend = false;
      }
    }
    
    // Use JavaScript implementation
    return this.playAutoMove();
  }
  
  /**
   * Set AI difficulty
   */
  async enhancedSetAIDifficulty(difficulty) {
    if (this.usePythonBackend) {
      try {
        await this.pythonBridge.setAIDifficulty(difficulty);
        return true;
      } catch (error) {
        console.error('Python backend difficulty setting failed:', error);
        this.usePythonBackend = false;
      }
    }
    
    // Use JavaScript implementation
    if (this.aiSolver) {
      this.aiSolver.setDifficulty(difficulty);
    }
    return true;
  }
}

// Replace the global app instance if Python backend is available
if (typeof window !== 'undefined') {
  // Store original app for fallback
  window.originalFancy2048App = window.fancy2048App;
  
  // Create enhanced app
  const enhancedApp = new EnhancedFancy2048App();
  window.enhancedFancy2048App = enhancedApp;
  
  // Override global methods to use enhanced versions
  window.fancy2048 = {
    version: '2.0.0-python',
    newGame: (boardSize) => enhancedApp.enhancedNewGame(boardSize),
    move: (direction) => enhancedApp.enhancedMove(direction),
    undo: () => enhancedApp.enhancedUndo(),
    getHint: () => enhancedApp.enhancedGetAIHint(),
    toggleAutoPlay: () => enhancedApp.enhancedToggleAutoPlay(),
    setDifficulty: (diff) => enhancedApp.enhancedSetAIDifficulty(diff),
    getStats: () => enhancedApp.getAppStats(),
    usePythonBackend: () => enhancedApp.usePythonBackend
  };
  
  console.log('🚀 Enhanced Fancy2048 with Python backend support initialized');
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PythonBackendBridge, EnhancedFancy2048App };
}