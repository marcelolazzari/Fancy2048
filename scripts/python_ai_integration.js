/**
 * 🧠 Python AI Integration Layer for Fancy2048
 * Replaces JavaScript AI with sophisticated Python-based algorithms
 */

class PythonAIIntegration {
    constructor() {
        this.currentGameId = null;
        this.isAutoPlaying = false;
        this.autoPlaySpeed = 1000; // milliseconds
        this.autoPlayInterval = null;
        this.algorithm = 'expectimax';
        this.difficulty = 'expert';
        
        // Performance tracking
        this.moveCount = 0;
        this.totalComputationTime = 0;
        this.aiStats = {
            wins: 0,
            losses: 0,
            averageScore: 0,
            bestScore: 0,
            gamesPlayed: 0
        };
        
        // UI Elements
        this.aiStatusElement = null;
        this.aiControlsElement = null;
        
        this.initializeUI();
    }
    
    initializeUI() {
        // Create AI status display
        this.createAIStatusDisplay();
        
        // Create AI controls
        this.createAIControls();
        
        // Update existing buttons
        this.updateExistingControls();
    }
    
    createAIStatusDisplay() {
        const statusContainer = document.createElement('div');
        statusContainer.id = 'ai-status-display';
        statusContainer.className = 'ai-status-container';
        statusContainer.innerHTML = `
            <div class="ai-status-header">
                <h3><i class="fas fa-brain"></i> Python AI Assistant</h3>
                <div class="ai-toggle">
                    <label class="switch">
                        <input type="checkbox" id="ai-enabled-toggle">
                        <span class="slider"></span>
                    </label>
                    <span>AI Enabled</span>
                </div>
            </div>
            <div class="ai-status-content">
                <div class="ai-metric">
                    <span class="metric-label">Algorithm:</span>
                    <span class="metric-value" id="current-algorithm">Expectimax</span>
                </div>
                <div class="ai-metric">
                    <span class="metric-label">Difficulty:</span>
                    <span class="metric-value" id="current-difficulty">Expert</span>
                </div>
                <div class="ai-metric">
                    <span class="metric-label">Last Move Time:</span>
                    <span class="metric-value" id="last-computation-time">-</span>
                </div>
                <div class="ai-metric">
                    <span class="metric-label">Nodes Evaluated:</span>
                    <span class="metric-value" id="nodes-evaluated">-</span>
                </div>
                <div class="ai-metric">
                    <span class="metric-label">Position Evaluation:</span>
                    <span class="metric-value" id="position-evaluation">-</span>
                </div>
            </div>
        `;
        
        // Add to page
        const mainElement = document.querySelector('main') || document.body;
        mainElement.insertBefore(statusContainer, mainElement.firstChild);
        
        this.aiStatusElement = statusContainer;
    }
    
    createAIControls() {
        const controlsContainer = document.createElement('div');
        controlsContainer.id = 'ai-controls-panel';
        controlsContainer.className = 'ai-controls-container';
        controlsContainer.innerHTML = `
            <div class="ai-controls-header">
                <h4><i class="fas fa-cogs"></i> AI Configuration</h4>
            </div>
            <div class="ai-controls-content">
                <div class="control-group">
                    <label for="ai-algorithm-select">Algorithm:</label>
                    <select id="ai-algorithm-select" class="ai-select">
                        <option value="expectimax" selected>Expectimax (Recommended)</option>
                        <option value="alpha_beta">Alpha-Beta Pruning</option>
                        <option value="monte_carlo">Monte Carlo Tree Search</option>
                        <option value="minimax">Minimax</option>
                        <option value="neural">Neural Heuristic</option>
                    </select>
                </div>
                <div class="control-group">
                    <label for="ai-difficulty-select">Difficulty:</label>
                    <select id="ai-difficulty-select" class="ai-select">
                        <option value="easy">Easy (Depth 3)</option>
                        <option value="normal">Normal (Depth 4)</option>
                        <option value="hard">Hard (Depth 5)</option>
                        <option value="expert" selected>Expert (Depth 6)</option>
                    </select>
                </div>
                <div class="control-group">
                    <label for="ai-speed-select">Auto-Play Speed:</label>
                    <select id="ai-speed-select" class="ai-select">
                        <option value="2000">Slow (2s)</option>
                        <option value="1000" selected>Normal (1s)</option>
                        <option value="500">Fast (0.5s)</option>
                        <option value="200">Very Fast (0.2s)</option>
                        <option value="100">Turbo (0.1s)</option>
                    </select>
                </div>
                <div class="control-buttons">
                    <button id="ai-get-hint" class="ai-btn ai-btn-primary">
                        <i class="fas fa-lightbulb"></i> Get Hint
                    </button>
                    <button id="ai-analyze-position" class="ai-btn ai-btn-secondary">
                        <i class="fas fa-chart-bar"></i> Analyze
                    </button>
                    <button id="ai-auto-play" class="ai-btn ai-btn-success">
                        <i class="fas fa-play"></i> Auto Play
                    </button>
                    <button id="ai-benchmark" class="ai-btn ai-btn-info">
                        <i class="fas fa-stopwatch"></i> Benchmark
                    </button>
                </div>
            </div>
        `;
        
        // Add after status display
        this.aiStatusElement.insertAdjacentElement('afterend', controlsContainer);
        this.aiControlsElement = controlsContainer;
        
        this.bindControlEvents();
    }
    
    bindControlEvents() {
        // Algorithm change
        document.getElementById('ai-algorithm-select').addEventListener('change', (e) => {
            this.setAlgorithm(e.target.value);
        });
        
        // Difficulty change
        document.getElementById('ai-difficulty-select').addEventListener('change', (e) => {
            this.setDifficulty(e.target.value);
        });
        
        // Speed change
        document.getElementById('ai-speed-select').addEventListener('change', (e) => {
            this.autoPlaySpeed = parseInt(e.target.value);
        });
        
        // Control buttons
        document.getElementById('ai-get-hint').addEventListener('click', () => this.getHint());
        document.getElementById('ai-analyze-position').addEventListener('click', () => this.analyzePosition());
        document.getElementById('ai-auto-play').addEventListener('click', () => this.toggleAutoPlay());
        document.getElementById('ai-benchmark').addEventListener('click', () => this.runBenchmark());
        
        // AI toggle
        document.getElementById('ai-enabled-toggle').addEventListener('change', (e) => {
            this.setAIEnabled(e.target.checked);
        });
    }
    
    updateExistingControls() {
        // Replace existing autoplay button functionality if it exists
        const existingAutoPlayBtn = document.getElementById('autoplay-button');
        if (existingAutoPlayBtn) {
            existingAutoPlayBtn.addEventListener('click', () => this.toggleAutoPlay());
        }
        
        // Add AI hint to existing controls if space allows
        const controlsContainer = document.getElementById('controls-container');
        if (controlsContainer) {
            const hintButton = document.createElement('li');
            hintButton.innerHTML = `
                <button type="button" id="ai-hint-button" aria-label="AI Hint" tabindex="0" data-tooltip="Get AI move suggestion">
                    <i class="fas fa-lightbulb" aria-hidden="true"></i>
                </button>
            `;
            controlsContainer.appendChild(hintButton);
            
            document.getElementById('ai-hint-button').addEventListener('click', () => this.getHint());
        }
    }
    
    setGameId(gameId) {
        this.currentGameId = gameId;
    }
    
    async setAlgorithm(algorithm) {
        this.algorithm = algorithm;
        
        if (this.currentGameId) {
            try {
                const response = await fetch('/api/ai/set_algorithm', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        gameId: this.currentGameId,
                        algorithm: algorithm,
                        difficulty: this.difficulty
                    })
                });
                
                if (response.ok) {
                    this.updateStatusDisplay({ algorithm });
                    this.showToast(`AI algorithm changed to ${algorithm}`, 'success');
                }
            } catch (error) {
                console.error('Failed to set AI algorithm:', error);
                this.showToast('Failed to update AI settings', 'error');
            }
        }
    }
    
    async setDifficulty(difficulty) {
        this.difficulty = difficulty;
        
        if (this.currentGameId) {
            try {
                const response = await fetch('/api/ai/set_algorithm', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        gameId: this.currentGameId,
                        algorithm: this.algorithm,
                        difficulty: difficulty
                    })
                });
                
                if (response.ok) {
                    this.updateStatusDisplay({ difficulty });
                    this.showToast(`AI difficulty changed to ${difficulty}`, 'success');
                }
            } catch (error) {
                console.error('Failed to set AI difficulty:', error);
                this.showToast('Failed to update AI settings', 'error');
            }
        }
    }
    
    async getHint() {
        if (!this.currentGameId) {
            this.showToast('No active game session', 'warning');
            return;
        }
        
        try {
            this.showToast('AI is thinking...', 'info');
            
            const response = await fetch('/api/ai/get_move', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    gameId: this.currentGameId,
                    algorithm: this.algorithm,
                    difficulty: this.difficulty
                })
            });
            
            const data = await response.json();
            
            if (response.ok && data.bestMove) {
                this.updateStatusDisplay({
                    lastComputationTime: data.computationTime,
                    nodesEvaluated: data.nodesEvaluated,
                    positionEvaluation: data.evaluation
                });
                
                this.highlightSuggestedMove(data.bestMove);
                this.showToast(
                    `AI suggests: ${data.bestMove.toUpperCase()} (${data.computationTime}ms, ${data.confidence}% confidence)`,
                    'success',
                    5000
                );
            } else if (data.gameOver) {
                this.showToast('Game Over - No moves available', 'warning');
            } else {
                this.showToast('AI could not find a good move', 'warning');
            }
        } catch (error) {
            console.error('Failed to get AI hint:', error);
            this.showToast('Failed to get AI suggestion', 'error');
        }
    }
    
    async analyzePosition() {
        if (!this.currentGameId) {
            this.showToast('No active game session', 'warning');
            return;
        }
        
        try {
            this.showToast('Analyzing position...', 'info');
            
            const response = await fetch('/api/ai/analyze_position', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    gameId: this.currentGameId,
                    algorithm: this.algorithm,
                    difficulty: this.difficulty
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.showPositionAnalysis(data);
            } else {
                this.showToast('Failed to analyze position', 'error');
            }
        } catch (error) {
            console.error('Failed to analyze position:', error);
            this.showToast('Analysis failed', 'error');
        }
    }
    
    async toggleAutoPlay() {
        if (this.isAutoPlaying) {
            this.stopAutoPlay();
        } else {
            await this.startAutoPlay();
        }
    }
    
    async startAutoPlay() {
        if (!this.currentGameId || this.isAutoPlaying) {
            return;
        }
        
        this.isAutoPlaying = true;
        this.updateAutoPlayButton(true);
        this.showToast(`AI Auto-play started (${this.algorithm}, ${this.difficulty})`, 'success');
        
        const makeAutoMove = async () => {
            if (!this.isAutoPlaying) return;
            
            try {
                const response = await fetch('/api/ai/auto_play', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        gameId: this.currentGameId,
                        algorithm: this.algorithm,
                        difficulty: this.difficulty
                    })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    if (data.moved) {
                        // Update game state through existing game instance
                        if (window.game && window.game.updateFromState) {
                            window.game.updateFromState(data.gameState);
                        }
                        
                        this.updateStatusDisplay({
                            lastComputationTime: data.aiAnalysis.computationTime,
                            nodesEvaluated: data.aiAnalysis.nodesEvaluated,
                            positionEvaluation: data.aiAnalysis.evaluation
                        });
                        
                        this.moveCount++;
                        this.totalComputationTime += data.aiAnalysis.computationTime;
                        
                        // Schedule next move
                        if (this.isAutoPlaying) {
                            this.autoPlayInterval = setTimeout(makeAutoMove, this.autoPlaySpeed);
                        }
                    } else if (data.gameOver) {
                        this.stopAutoPlay();
                        this.showToast('Game Over - AI Auto-play stopped', 'warning');
                        this.updateAIStats(data.gameState);
                    }
                } else {
                    this.stopAutoPlay();
                    this.showToast('Auto-play failed', 'error');
                }
            } catch (error) {
                console.error('Auto-play error:', error);
                this.stopAutoPlay();
                this.showToast('Auto-play error', 'error');
            }
        };
        
        // Start auto-play
        makeAutoMove();
    }
    
    stopAutoPlay() {
        this.isAutoPlaying = false;
        this.updateAutoPlayButton(false);
        
        if (this.autoPlayInterval) {
            clearTimeout(this.autoPlayInterval);
            this.autoPlayInterval = null;
        }
        
        this.showToast('AI Auto-play stopped', 'info');
    }
    
    async runBenchmark() {
        if (!this.currentGameId) {
            this.showToast('No active game session', 'warning');
            return;
        }
        
        try {
            this.showToast('Running AI benchmark...', 'info');
            
            const response = await fetch('/api/ai/benchmark', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    gameId: this.currentGameId,
                    algorithms: ['expectimax', 'alpha_beta', 'monte_carlo', 'minimax'],
                    difficulty: this.difficulty
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.showBenchmarkResults(data);
            } else {
                this.showToast('Benchmark failed', 'error');
            }
        } catch (error) {
            console.error('Benchmark error:', error);
            this.showToast('Benchmark error', 'error');
        }
    }
    
    setAIEnabled(enabled) {
        const aiControls = document.querySelector('.ai-controls-container');
        if (aiControls) {
            aiControls.style.opacity = enabled ? '1' : '0.5';
            aiControls.style.pointerEvents = enabled ? 'auto' : 'none';
        }
        
        if (!enabled && this.isAutoPlaying) {
            this.stopAutoPlay();
        }
    }
    
    updateStatusDisplay(data) {
        if (data.algorithm) {
            const algorithmElement = document.getElementById('current-algorithm');
            if (algorithmElement) {
                algorithmElement.textContent = this.formatAlgorithmName(data.algorithm);
            }
        }
        
        if (data.difficulty) {
            const difficultyElement = document.getElementById('current-difficulty');
            if (difficultyElement) {
                difficultyElement.textContent = data.difficulty.charAt(0).toUpperCase() + data.difficulty.slice(1);
            }
        }
        
        if (data.lastComputationTime !== undefined) {
            const timeElement = document.getElementById('last-computation-time');
            if (timeElement) {
                timeElement.textContent = `${data.lastComputationTime}ms`;
            }
        }
        
        if (data.nodesEvaluated !== undefined) {
            const nodesElement = document.getElementById('nodes-evaluated');
            if (nodesElement) {
                nodesElement.textContent = data.nodesEvaluated.toLocaleString();
            }
        }
        
        if (data.positionEvaluation !== undefined) {
            const evalElement = document.getElementById('position-evaluation');
            if (evalElement) {
                evalElement.textContent = data.positionEvaluation.toFixed(2);
            }
        }
    }
    
    updateAutoPlayButton(isPlaying) {
        const autoPlayBtn = document.getElementById('ai-auto-play');
        if (autoPlayBtn) {
            autoPlayBtn.innerHTML = isPlaying ? 
                '<i class="fas fa-stop"></i> Stop Auto' : 
                '<i class="fas fa-play"></i> Auto Play';
            autoPlayBtn.className = isPlaying ? 
                'ai-btn ai-btn-warning' : 
                'ai-btn ai-btn-success';
        }
        
        // Update existing autoplay button if present
        const existingBtn = document.getElementById('autoplay-button');
        if (existingBtn) {
            const icon = existingBtn.querySelector('i');
            if (icon) {
                icon.className = isPlaying ? 'fas fa-stop' : 'fas fa-play';
            }
        }
    }
    
    highlightSuggestedMove(direction) {
        // Remove any existing highlights
        document.querySelectorAll('.suggested-move').forEach(el => {
            el.classList.remove('suggested-move');
        });
        
        // Add visual indication for suggested direction
        const boardContainer = document.getElementById('board-container');
        if (boardContainer) {
            boardContainer.classList.add(`suggest-${direction}`);
            
            setTimeout(() => {
                boardContainer.classList.remove(`suggest-${direction}`);
            }, 3000);
        }
    }
    
    showPositionAnalysis(data) {
        const modal = this.createModal('Position Analysis', `
            <div class="analysis-content">
                <div class="analysis-section">
                    <h4>Position Evaluation: ${data.positionEvaluation.toFixed(2)}</h4>
                    <div class="game-metrics">
                        <div class="metric">Empty Spaces: ${data.gameMetrics.emptySpaces}</div>
                        <div class="metric">Max Tile: ${data.gameMetrics.maxTile}</div>
                        <div class="metric">Progress: ${data.gameMetrics.gameProgress.toFixed(1)}%</div>
                    </div>
                </div>
                <div class="analysis-section">
                    <h4>Move Analysis</h4>
                    <div class="move-analysis">
                        ${Object.entries(data.moveAnalysis).map(([move, analysis]) => `
                            <div class="move-option">
                                <strong>${move.toUpperCase()}</strong>: 
                                Eval: ${analysis.evaluation.toFixed(2)}, 
                                Score: +${analysis.scoreGain}, 
                                Empty: ${analysis.emptySpaces}
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="analysis-section">
                    <h4>AI Settings</h4>
                    <div class="ai-settings">
                        <div>Algorithm: ${this.formatAlgorithmName(data.aiSettings.algorithm)}</div>
                        <div>Difficulty: ${data.aiSettings.difficulty}</div>
                        <div>Max Depth: ${data.aiSettings.maxDepth}</div>
                    </div>
                </div>
            </div>
        `);
        
        document.body.appendChild(modal);
    }
    
    showBenchmarkResults(data) {
        const results = Object.entries(data.benchmarkResults)
            .sort((a, b) => b[1].evaluation - a[1].evaluation)
            .map(([algorithm, result]) => `
                <tr>
                    <td>${this.formatAlgorithmName(algorithm)}</td>
                    <td>${result.bestMove ? result.bestMove.toUpperCase() : 'None'}</td>
                    <td>${result.computationTime}ms</td>
                    <td>${result.nodesEvaluated.toLocaleString()}</td>
                    <td>${result.evaluation.toFixed(2)}</td>
                </tr>
            `).join('');
        
        const modal = this.createModal('AI Algorithm Benchmark', `
            <div class="benchmark-content">
                <table class="benchmark-table">
                    <thead>
                        <tr>
                            <th>Algorithm</th>
                            <th>Best Move</th>
                            <th>Time</th>
                            <th>Nodes</th>
                            <th>Evaluation</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${results}
                    </tbody>
                </table>
                <div class="benchmark-info">
                    <p><strong>Current State:</strong> Score: ${data.currentState.score}, Max Tile: ${data.currentState.maxTile}, Empty: ${data.currentState.emptySpaces}</p>
                    <p><strong>Difficulty:</strong> ${data.difficulty}</p>
                </div>
            </div>
        `);
        
        document.body.appendChild(modal);
    }
    
    createModal(title, content) {
        const modal = document.createElement('div');
        modal.className = 'ai-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
            </div>
        `;
        
        modal.querySelector('.modal-close').addEventListener('click', () => {
            modal.remove();
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
        
        return modal;
    }
    
    formatAlgorithmName(algorithm) {
        const names = {
            'expectimax': 'Expectimax',
            'alpha_beta': 'Alpha-Beta',
            'monte_carlo': 'Monte Carlo',
            'minimax': 'Minimax',
            'neural': 'Neural Heuristic'
        };
        return names[algorithm] || algorithm;
    }
    
    showToast(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `ai-toast ai-toast-${type}`;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }
    
    updateAIStats(gameState) {
        this.aiStats.gamesPlayed++;
        
        if (gameState.gameState === 'won') {
            this.aiStats.wins++;
        } else if (gameState.gameState === 'over') {
            this.aiStats.losses++;
        }
        
        this.aiStats.averageScore = 
            (this.aiStats.averageScore * (this.aiStats.gamesPlayed - 1) + gameState.score) / 
            this.aiStats.gamesPlayed;
        
        if (gameState.score > this.aiStats.bestScore) {
            this.aiStats.bestScore = gameState.score;
        }
    }
    
    getAIStats() {
        return {
            ...this.aiStats,
            averageComputationTime: this.moveCount > 0 ? this.totalComputationTime / this.moveCount : 0
        };
    }
}

// Global instance
window.pythonAI = new PythonAIIntegration();

// Integration with existing game
document.addEventListener('DOMContentLoaded', () => {
    // Wait for game to initialize
    setTimeout(() => {
        if (window.game && window.game.gameId) {
            window.pythonAI.setGameId(window.game.gameId);
        }
    }, 1000);
});

console.log('🧠 Python AI Integration loaded successfully!');
