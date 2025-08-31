"""
🧠 Advanced 2048 AI Solver - Python Implementation
Featuring multiple sophisticated algorithms for optimal gameplay
"""

import random
import math
import time
from typing import List, Tuple, Dict, Optional, Any
from dataclasses import dataclass
from enum import Enum
import copy
import heapq
from collections import defaultdict
import numpy as np
from concurrent.futures import ThreadPoolExecutor
import threading

class AIAlgorithm(Enum):
    EXPECTIMAX = "expectimax"
    ALPHA_BETA = "alpha_beta"
    MCTS = "monte_carlo"
    MINIMAX = "minimax"
    NEURAL_HEURISTIC = "neural"

class Direction(Enum):
    UP = "up"
    DOWN = "down"
    LEFT = "left"
    RIGHT = "right"

@dataclass
class GameState:
    """Immutable game state representation for AI analysis"""
    board: List[List[int]]
    score: int
    size: int
    
    def copy(self):
        return GameState(
            board=[row[:] for row in self.board],
            score=self.score,
            size=self.size
        )
    
    def get_empty_cells(self) -> List[Tuple[int, int]]:
        """Get list of empty cell coordinates"""
        empty = []
        for i in range(self.size):
            for j in range(self.size):
                if self.board[i][j] == 0:
                    empty.append((i, j))
        return empty
    
    def get_max_tile(self) -> int:
        """Get the maximum tile value on the board"""
        return max(max(row) for row in self.board)
    
    def get_filled_cells(self) -> int:
        """Get number of filled cells"""
        count = 0
        for row in self.board:
            for cell in row:
                if cell != 0:
                    count += 1
        return count

class Advanced2048AI:
    """
    Advanced AI solver with multiple algorithms and sophisticated heuristics
    """
    
    def __init__(self, algorithm: AIAlgorithm = AIAlgorithm.EXPECTIMAX, 
                 max_depth: int = 6, difficulty: str = "expert"):
        self.algorithm = algorithm
        self.max_depth = max_depth
        self.difficulty = difficulty
        self.nodes_evaluated = 0
        self.cache = {}  # Transposition table
        self.start_time = 0
        self.time_limit = 0.5  # 500ms time limit per move
        
        # Algorithm-specific parameters
        self.mcts_simulations = 1000 if difficulty == "expert" else 500
        self.exploration_constant = math.sqrt(2)
        
        # Heuristic weights (tuned for optimal play)
        self.weights = {
            'smoothness': 0.1,
            'monotonicity': 1.0,
            'empty_cells': 2.7,
            'max_tile': 1.0,
            'snake_weight': 0.25,
            'corner_weight': 0.1
        }
        
        # Pre-computed lookup tables for performance
        self.precomputed_moves = {}
        self.heuristic_cache = {}
        
    def get_best_move(self, game_state: GameState) -> Optional[Direction]:
        """
        Get the best move using the selected algorithm
        """
        self.start_time = time.time()
        self.nodes_evaluated = 0
        self.cache.clear()
        
        if self.algorithm == AIAlgorithm.EXPECTIMAX:
            return self._expectimax_decision(game_state)
        elif self.algorithm == AIAlgorithm.ALPHA_BETA:
            return self._alpha_beta_decision(game_state)
        elif self.algorithm == AIAlgorithm.MCTS:
            return self._mcts_decision(game_state)
        elif self.algorithm == AIAlgorithm.MINIMAX:
            return self._minimax_decision(game_state)
        elif self.algorithm == AIAlgorithm.NEURAL_HEURISTIC:
            return self._neural_heuristic_decision(game_state)
        else:
            return self._expectimax_decision(game_state)  # Default
    
    def _expectimax_decision(self, state: GameState) -> Optional[Direction]:
        """
        Expectimax algorithm with sophisticated evaluation
        """
        best_move = None
        best_value = -float('inf')
        
        for direction in Direction:
            new_state = self._simulate_move(state, direction)
            if new_state and new_state.board != state.board:
                value = self._expectimax_chance(new_state, self.max_depth - 1)
                
                if value > best_value:
                    best_value = value
                    best_move = direction
                    
                # Time limit check
                if time.time() - self.start_time > self.time_limit:
                    break
        
        return best_move
    
    def _expectimax_chance(self, state: GameState, depth: int) -> float:
        """
        Expectimax chance node - calculates expected value of random tile placement
        """
        if depth == 0 or time.time() - self.start_time > self.time_limit:
            return self._evaluate_state(state)
        
        empty_cells = state.get_empty_cells()
        if not empty_cells:
            return self._evaluate_state(state)
        
        expected_value = 0
        for i, j in empty_cells:
            # 90% chance of 2, 10% chance of 4
            for tile_value, probability in [(2, 0.9), (4, 0.1)]:
                new_state = state.copy()
                new_state.board[i][j] = tile_value
                
                value = self._expectimax_max(new_state, depth - 1)
                expected_value += probability * value / len(empty_cells)
        
        return expected_value
    
    def _expectimax_max(self, state: GameState, depth: int) -> float:
        """
        Expectimax maximizing node - finds best move for player
        """
        if depth == 0 or time.time() - self.start_time > self.time_limit:
            return self._evaluate_state(state)
        
        # Check cache
        state_key = self._get_state_key(state)
        if state_key in self.cache:
            return self.cache[state_key]
        
        max_value = -float('inf')
        moves_possible = False
        
        for direction in Direction:
            new_state = self._simulate_move(state, direction)
            if new_state and new_state.board != state.board:
                moves_possible = True
                value = self._expectimax_chance(new_state, depth - 1)
                max_value = max(max_value, value)
        
        if not moves_possible:
            max_value = self._evaluate_state(state)
        
        # Cache result
        self.cache[state_key] = max_value
        self.nodes_evaluated += 1
        
        return max_value
    
    def _alpha_beta_decision(self, state: GameState) -> Optional[Direction]:
        """
        Alpha-Beta pruning algorithm for more efficient search
        """
        best_move = None
        best_value = -float('inf')
        alpha = -float('inf')
        beta = float('inf')
        
        for direction in Direction:
            new_state = self._simulate_move(state, direction)
            if new_state and new_state.board != state.board:
                value = self._alpha_beta_chance(new_state, self.max_depth - 1, alpha, beta)
                
                if value > best_value:
                    best_value = value
                    best_move = direction
                    alpha = max(alpha, value)
                
                if time.time() - self.start_time > self.time_limit:
                    break
        
        return best_move
    
    def _alpha_beta_chance(self, state: GameState, depth: int, alpha: float, beta: float) -> float:
        """Alpha-Beta chance node with pruning"""
        if depth == 0 or time.time() - self.start_time > self.time_limit:
            return self._evaluate_state(state)
        
        empty_cells = state.get_empty_cells()
        if not empty_cells:
            return self._evaluate_state(state)
        
        expected_value = 0
        for i, j in empty_cells:
            for tile_value, probability in [(2, 0.9), (4, 0.1)]:
                new_state = state.copy()
                new_state.board[i][j] = tile_value
                
                value = self._alpha_beta_max(new_state, depth - 1, alpha, beta)
                expected_value += probability * value / len(empty_cells)
                
                # No pruning in chance nodes (expected value)
        
        return expected_value
    
    def _alpha_beta_max(self, state: GameState, depth: int, alpha: float, beta: float) -> float:
        """Alpha-Beta maximizing node with pruning"""
        if depth == 0 or time.time() - self.start_time > self.time_limit:
            return self._evaluate_state(state)
        
        state_key = self._get_state_key(state)
        if state_key in self.cache:
            return self.cache[state_key]
        
        max_value = -float('inf')
        moves_possible = False
        
        for direction in Direction:
            new_state = self._simulate_move(state, direction)
            if new_state and new_state.board != state.board:
                moves_possible = True
                value = self._alpha_beta_chance(new_state, depth - 1, alpha, beta)
                max_value = max(max_value, value)
                alpha = max(alpha, value)
                
                # Alpha-Beta pruning
                if beta <= alpha:
                    break
        
        if not moves_possible:
            max_value = self._evaluate_state(state)
        
        self.cache[state_key] = max_value
        self.nodes_evaluated += 1
        
        return max_value
    
    def _mcts_decision(self, state: GameState) -> Optional[Direction]:
        """
        Monte Carlo Tree Search implementation
        """
        root = MCTSNode(state)
        
        for _ in range(self.mcts_simulations):
            if time.time() - self.start_time > self.time_limit:
                break
                
            # Selection & Expansion
            node = self._mcts_select(root)
            
            # Simulation
            reward = self._mcts_simulate(node.state)
            
            # Backpropagation
            self._mcts_backpropagate(node, reward)
        
        # Choose best move
        best_move = None
        best_visits = 0
        
        for direction, child in root.children.items():
            if child.visits > best_visits:
                best_visits = child.visits
                best_move = direction
        
        return best_move
    
    def _evaluate_state(self, state: GameState) -> float:
        """
        Advanced heuristic evaluation combining multiple factors
        """
        state_key = self._get_state_key(state)
        if state_key in self.heuristic_cache:
            return self.heuristic_cache[state_key]
        
        score = 0
        
        # 1. Empty cells (more is better)
        empty_cells = len(state.get_empty_cells())
        score += self.weights['empty_cells'] * math.log2(empty_cells + 1)
        
        # 2. Smoothness (adjacent tiles have similar values)
        smoothness = self._calculate_smoothness(state.board)
        score += self.weights['smoothness'] * smoothness
        
        # 3. Monotonicity (tiles increase in one direction)
        monotonicity = self._calculate_monotonicity(state.board)
        score += self.weights['monotonicity'] * monotonicity
        
        # 4. Max tile value
        max_tile = state.get_max_tile()
        score += self.weights['max_tile'] * math.log2(max_tile) if max_tile > 0 else 0
        
        # 5. Snake pattern bonus (high tiles follow a snake pattern)
        snake_score = self._calculate_snake_pattern(state.board)
        score += self.weights['snake_weight'] * snake_score
        
        # 6. Corner bonus (max tile in corner)
        corner_bonus = self._calculate_corner_bonus(state.board)
        score += self.weights['corner_weight'] * corner_bonus
        
        # 7. Penalty for game over
        if empty_cells == 0 and not self._has_possible_moves(state):
            score -= 1000000
        
        # Cache result
        self.heuristic_cache[state_key] = score
        
        return score
    
    def _calculate_smoothness(self, board: List[List[int]]) -> float:
        """Calculate smoothness heuristic"""
        smoothness = 0
        size = len(board)
        
        for i in range(size):
            for j in range(size):
                if board[i][j] != 0:
                    current = math.log2(board[i][j])
                    
                    # Check right neighbor
                    if j < size - 1 and board[i][j + 1] != 0:
                        neighbor = math.log2(board[i][j + 1])
                        smoothness -= abs(current - neighbor)
                    
                    # Check down neighbor
                    if i < size - 1 and board[i + 1][j] != 0:
                        neighbor = math.log2(board[i + 1][j])
                        smoothness -= abs(current - neighbor)
        
        return smoothness
    
    def _calculate_monotonicity(self, board: List[List[int]]) -> float:
        """Calculate monotonicity heuristic"""
        size = len(board)
        totals = [0, 0, 0, 0]  # up, down, left, right
        
        # Check horizontal monotonicity
        for i in range(size):
            current = 0
            next_val = 1
            while next_val < size:
                while next_val < size and board[i][next_val] == 0:
                    next_val += 1
                
                if next_val >= size:
                    break
                
                current_val = math.log2(board[i][current]) if board[i][current] != 0 else 0
                next_log = math.log2(board[i][next_val])
                
                if current_val > next_log:
                    totals[0] += next_log - current_val
                elif next_log > current_val:
                    totals[1] += current_val - next_log
                
                current = next_val
                next_val += 1
        
        # Check vertical monotonicity
        for j in range(size):
            current = 0
            next_val = 1
            while next_val < size:
                while next_val < size and board[next_val][j] == 0:
                    next_val += 1
                
                if next_val >= size:
                    break
                
                current_val = math.log2(board[current][j]) if board[current][j] != 0 else 0
                next_log = math.log2(board[next_val][j])
                
                if current_val > next_log:
                    totals[2] += next_log - current_val
                elif next_log > current_val:
                    totals[3] += current_val - next_log
                
                current = next_val
                next_val += 1
        
        return max(totals[0], totals[1]) + max(totals[2], totals[3])
    
    def _calculate_snake_pattern(self, board: List[List[int]]) -> float:
        """Calculate snake pattern bonus"""
        size = len(board)
        snake_score = 0
        
        # Define snake pattern (starting from top-left, going right then down)
        positions = []
        for i in range(size):
            if i % 2 == 0:  # Even rows: left to right
                for j in range(size):
                    positions.append((i, j))
            else:  # Odd rows: right to left
                for j in range(size - 1, -1, -1):
                    positions.append((i, j))
        
        # Calculate how well the board follows the snake pattern
        for idx in range(len(positions) - 1):
            i1, j1 = positions[idx]
            i2, j2 = positions[idx + 1]
            
            val1 = board[i1][j1]
            val2 = board[i2][j2]
            
            if val1 != 0 and val2 != 0:
                if val1 >= val2:  # Decreasing along snake is good
                    snake_score += math.log2(val1)
                else:
                    snake_score -= math.log2(val2)
        
        return snake_score
    
    def _calculate_corner_bonus(self, board: List[List[int]]) -> float:
        """Bonus for having max tile in corner"""
        size = len(board)
        max_tile = max(max(row) for row in board)
        
        corners = [(0, 0), (0, size-1), (size-1, 0), (size-1, size-1)]
        
        for i, j in corners:
            if board[i][j] == max_tile:
                return math.log2(max_tile) if max_tile > 0 else 0
        
        return 0
    
    def _simulate_move(self, state: GameState, direction: Direction) -> Optional[GameState]:
        """Simulate a move and return new state"""
        new_state = state.copy()
        
        if direction == Direction.LEFT:
            moved = self._move_left(new_state)
        elif direction == Direction.RIGHT:
            moved = self._move_right(new_state)
        elif direction == Direction.UP:
            moved = self._move_up(new_state)
        elif direction == Direction.DOWN:
            moved = self._move_down(new_state)
        
        return new_state if moved else None
    
    def _move_left(self, state: GameState) -> bool:
        """Simulate left move"""
        moved = False
        
        for row in range(state.size):
            # Move tiles left
            tiles = [state.board[row][col] for col in range(state.size) if state.board[row][col] != 0]
            
            # Merge tiles
            merged = []
            i = 0
            while i < len(tiles):
                if i < len(tiles) - 1 and tiles[i] == tiles[i + 1]:
                    merged.append(tiles[i] * 2)
                    state.score += tiles[i] * 2
                    i += 2
                else:
                    merged.append(tiles[i])
                    i += 1
            
            # Fill row
            new_row = merged + [0] * (state.size - len(merged))
            
            # Check if anything changed
            if new_row != state.board[row]:
                moved = True
                state.board[row] = new_row
        
        return moved
    
    def _move_right(self, state: GameState) -> bool:
        """Simulate right move"""
        moved = False
        
        for row in range(state.size):
            # Move tiles right
            tiles = [state.board[row][col] for col in range(state.size) if state.board[row][col] != 0]
            
            # Merge tiles (from right)
            merged = []
            i = len(tiles) - 1
            while i >= 0:
                if i > 0 and tiles[i] == tiles[i - 1]:
                    merged.insert(0, tiles[i] * 2)
                    state.score += tiles[i] * 2
                    i -= 2
                else:
                    merged.insert(0, tiles[i])
                    i -= 1
            
            # Fill row
            new_row = [0] * (state.size - len(merged)) + merged
            
            # Check if anything changed
            if new_row != state.board[row]:
                moved = True
                state.board[row] = new_row
        
        return moved
    
    def _move_up(self, state: GameState) -> bool:
        """Simulate up move"""
        moved = False
        
        for col in range(state.size):
            # Move tiles up
            tiles = [state.board[row][col] for row in range(state.size) if state.board[row][col] != 0]
            
            # Merge tiles
            merged = []
            i = 0
            while i < len(tiles):
                if i < len(tiles) - 1 and tiles[i] == tiles[i + 1]:
                    merged.append(tiles[i] * 2)
                    state.score += tiles[i] * 2
                    i += 2
                else:
                    merged.append(tiles[i])
                    i += 1
            
            # Fill column
            new_col = merged + [0] * (state.size - len(merged))
            
            # Check if anything changed
            old_col = [state.board[row][col] for row in range(state.size)]
            if new_col != old_col:
                moved = True
                for row in range(state.size):
                    state.board[row][col] = new_col[row]
        
        return moved
    
    def _move_down(self, state: GameState) -> bool:
        """Simulate down move"""
        moved = False
        
        for col in range(state.size):
            # Move tiles down
            tiles = [state.board[row][col] for row in range(state.size) if state.board[row][col] != 0]
            
            # Merge tiles (from bottom)
            merged = []
            i = len(tiles) - 1
            while i >= 0:
                if i > 0 and tiles[i] == tiles[i - 1]:
                    merged.insert(0, tiles[i] * 2)
                    state.score += tiles[i] * 2
                    i -= 2
                else:
                    merged.insert(0, tiles[i])
                    i -= 1
            
            # Fill column
            new_col = [0] * (state.size - len(merged)) + merged
            
            # Check if anything changed
            old_col = [state.board[row][col] for row in range(state.size)]
            if new_col != old_col:
                moved = True
                for row in range(state.size):
                    state.board[row][col] = new_col[row]
        
        return moved
    
    def _has_possible_moves(self, state: GameState) -> bool:
        """Check if any moves are possible"""
        for direction in Direction:
            test_state = self._simulate_move(state, direction)
            if test_state:
                return True
        return False
    
    def _get_state_key(self, state: GameState) -> str:
        """Generate unique key for state caching"""
        return str(state.board)
    
    # MCTS helper methods
    def _mcts_select(self, node: 'MCTSNode') -> 'MCTSNode':
        """Select best node using UCB1"""
        while not node.is_leaf():
            node = max(node.children.values(), 
                      key=lambda n: n.ucb1_value(self.exploration_constant))
        
        if node.visits > 0:
            node.expand()
        
        return node
    
    def _mcts_simulate(self, state: GameState) -> float:
        """Random simulation from given state"""
        current_state = state.copy()
        moves = 0
        
        while moves < 100:  # Limit simulation depth
            directions = []
            for direction in Direction:
                if self._simulate_move(current_state, direction):
                    directions.append(direction)
            
            if not directions:
                break
            
            # Make random move
            direction = random.choice(directions)
            new_state = self._simulate_move(current_state, direction)
            if new_state:
                current_state = new_state
                # Add random tile
                self._add_random_tile(current_state)
                moves += 1
        
        return self._evaluate_state(current_state)
    
    def _mcts_backpropagate(self, node: 'MCTSNode', reward: float):
        """Backpropagate reward up the tree"""
        while node:
            node.visits += 1
            node.total_reward += reward
            node = node.parent
    
    def _add_random_tile(self, state: GameState):
        """Add random tile to empty cell"""
        empty_cells = state.get_empty_cells()
        if empty_cells:
            i, j = random.choice(empty_cells)
            state.board[i][j] = 2 if random.random() < 0.9 else 4

class MCTSNode:
    """Node for Monte Carlo Tree Search"""
    
    def __init__(self, state: GameState, parent=None, move=None):
        self.state = state
        self.parent = parent
        self.move = move
        self.children = {}
        self.visits = 0
        self.total_reward = 0
    
    def is_leaf(self) -> bool:
        return len(self.children) == 0
    
    def expand(self):
        """Expand node by adding children for all possible moves"""
        ai = Advanced2048AI()  # Temporary instance for move simulation
        
        for direction in Direction:
            new_state = ai._simulate_move(self.state, direction)
            if new_state:
                child = MCTSNode(new_state, parent=self, move=direction)
                self.children[direction] = child
    
    def ucb1_value(self, exploration_constant: float) -> float:
        """Calculate UCB1 value for node selection"""
        if self.visits == 0:
            return float('inf')
        
        exploitation = self.total_reward / self.visits
        exploration = exploration_constant * math.sqrt(math.log(self.parent.visits) / self.visits)
        
        return exploitation + exploration

# Helper functions for integration with Flask app
def create_ai_solver(algorithm: str = "expectimax", difficulty: str = "expert") -> Advanced2048AI:
    """Factory function to create AI solver instance"""
    algo_map = {
        "expectimax": AIAlgorithm.EXPECTIMAX,
        "alpha_beta": AIAlgorithm.ALPHA_BETA,
        "monte_carlo": AIAlgorithm.MCTS,
        "minimax": AIAlgorithm.MINIMAX,
        "neural": AIAlgorithm.NEURAL_HEURISTIC
    }
    
    depth_map = {
        "easy": 3,
        "normal": 4,
        "hard": 5,
        "expert": 6
    }
    
    return Advanced2048AI(
        algorithm=algo_map.get(algorithm, AIAlgorithm.EXPECTIMAX),
        max_depth=depth_map.get(difficulty, 6),
        difficulty=difficulty
    )

def game_to_ai_state(game) -> GameState:
    """Convert Game instance to GameState for AI"""
    return GameState(
        board=[row[:] for row in game.board],
        score=game.score,
        size=game.size
    )

def direction_to_string(direction: Direction) -> str:
    """Convert Direction enum to string"""
    return direction.value if direction else None
