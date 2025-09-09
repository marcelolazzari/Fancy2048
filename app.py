"""
Fancy2048 - Python Application Controller
Main application logic coordinator for the 2048 game
"""

import json
import time
import random
import copy
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, asdict
from enum import Enum


class Direction(Enum):
    UP = "up"
    DOWN = "down"
    LEFT = "left"
    RIGHT = "right"


class GameDifficulty(Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"
    EXPERT = "expert"


@dataclass
class GameState:
    """Game state data structure"""
    board: List[List[int]]
    score: int
    moves: int
    size: int
    start_time: float
    is_game_over: bool
    has_won: bool
    continue_after_win: bool
    history: List[Dict]


@dataclass
class GameResult:
    """Game result data structure"""
    score: int
    moves: int
    duration: float
    highest_tile: int
    board_size: int
    won: bool
    is_ai: bool


class GameEngine:
    """Core game logic and state management"""
    
    def __init__(self, size: int = 4):
        self.size = size
        self.board = []
        self.score = 0
        self.moves = 0
        self.start_time = None
        self.is_game_over = False
        self.has_won = False
        self.continue_after_win = False
        self.history = []
        self.max_history_size = 10
        
        # Callbacks for UI updates
        self.callbacks = {
            'on_board_update': None,
            'on_score_update': None,
            'on_game_over': None,
            'on_win': None,
            'on_move': None
        }
        
        self.initialize()
    
    def initialize(self):
        """Initialize the game"""
        self._create_empty_board()
        self._add_random_tile()
        self._add_random_tile()
        self.start_time = time.time()
        self.is_game_over = False
        self.has_won = False
        self.continue_after_win = False
        self.history = []
        self._save_state()
    
    def _create_empty_board(self):
        """Create empty board"""
        self.board = [[0 for _ in range(self.size)] for _ in range(self.size)]
    
    def _get_empty_cells(self) -> List[Tuple[int, int]]:
        """Get list of empty cells"""
        empty_cells = []
        for i in range(self.size):
            for j in range(self.size):
                if self.board[i][j] == 0:
                    empty_cells.append((i, j))
        return empty_cells
    
    def _add_random_tile(self) -> bool:
        """Add random tile (2 or 4) to empty cell"""
        empty_cells = self._get_empty_cells()
        if not empty_cells:
            return False
        
        row, col = random.choice(empty_cells)
        value = 2 if random.random() < 0.9 else 4
        self.board[row][col] = value
        return True
    
    def _save_state(self):
        """Save current state for undo"""
        state = {
            'board': copy.deepcopy(self.board),
            'score': self.score,
            'moves': self.moves
        }
        self.history.append(state)
        
        # Limit history size
        if len(self.history) > self.max_history_size:
            self.history.pop(0)
    
    def undo(self) -> bool:
        """Undo last move"""
        if len(self.history) < 2:
            return False
        
        # Remove current state
        self.history.pop()
        
        # Restore previous state
        previous_state = self.history[-1]
        self.board = copy.deepcopy(previous_state['board'])
        self.score = previous_state['score']
        self.moves = previous_state['moves']
        
        self.is_game_over = False
        self._notify_board_update()
        self._notify_score_update()
        
        return True
    
    def can_undo(self) -> bool:
        """Check if undo is available"""
        return len(self.history) > 1 and not self.is_game_over
    
    def move(self, direction: Direction) -> bool:
        """Move tiles in specified direction"""
        if self.is_game_over:
            return False
        
        previous_board = copy.deepcopy(self.board)
        moved = False
        
        if direction == Direction.UP:
            moved = self._move_up()
        elif direction == Direction.DOWN:
            moved = self._move_down()
        elif direction == Direction.LEFT:
            moved = self._move_left()
        elif direction == Direction.RIGHT:
            moved = self._move_right()
        
        if moved:
            self.moves += 1
            self._save_state()
            self._add_random_tile()
            self._notify_board_update()
            self._notify_score_update()
            self._notify_move(direction)
            
            # Check for win condition
            if not self.has_won and self._check_win():
                self.has_won = True
                self._notify_win()
            
            # Check for game over
            if self._check_game_over():
                self.is_game_over = True
                self._notify_game_over()
        
        return moved
    
    def _move_up(self) -> bool:
        """Move tiles up"""
        moved = False
        for col in range(self.size):
            column = [self.board[row][col] for row in range(self.size)]
            new_column = self._move_and_merge_array(column)
            
            if column != new_column:
                moved = True
                for row in range(self.size):
                    self.board[row][col] = new_column[row]
        
        return moved
    
    def _move_down(self) -> bool:
        """Move tiles down"""
        moved = False
        for col in range(self.size):
            column = [self.board[row][col] for row in range(self.size)]
            reversed_column = column[::-1]
            new_reversed_column = self._move_and_merge_array(reversed_column)
            new_column = new_reversed_column[::-1]
            
            if column != new_column:
                moved = True
                for row in range(self.size):
                    self.board[row][col] = new_column[row]
        
        return moved
    
    def _move_left(self) -> bool:
        """Move tiles left"""
        moved = False
        for row in range(self.size):
            row_array = self.board[row][:]
            new_row = self._move_and_merge_array(row_array)
            
            if row_array != new_row:
                moved = True
                self.board[row] = new_row
        
        return moved
    
    def _move_right(self) -> bool:
        """Move tiles right"""
        moved = False
        for row in range(self.size):
            row_array = self.board[row][:]
            reversed_row = row_array[::-1]
            new_reversed_row = self._move_and_merge_array(reversed_row)
            new_row = new_reversed_row[::-1]
            
            if row_array != new_row:
                moved = True
                self.board[row] = new_row
        
        return moved
    
    def _move_and_merge_array(self, array: List[int]) -> List[int]:
        """Move and merge array (core algorithm)"""
        # Remove zeros
        filtered = [val for val in array if val != 0]
        result = []
        i = 0
        
        while i < len(filtered):
            if i < len(filtered) - 1 and filtered[i] == filtered[i + 1]:
                # Merge tiles
                merged_value = filtered[i] * 2
                result.append(merged_value)
                self.score += merged_value
                i += 2
            else:
                result.append(filtered[i])
                i += 1
        
        # Fill with zeros
        while len(result) < self.size:
            result.append(0)
        
        return result
    
    def _check_win(self) -> bool:
        """Check win condition (2048 tile reached)"""
        if self.continue_after_win:
            return False
        
        for row in self.board:
            for tile in row:
                if tile == 2048:
                    return True
        return False
    
    def continue_game(self):
        """Continue game after winning"""
        self.continue_after_win = True
    
    def _check_game_over(self) -> bool:
        """Check game over condition"""
        # If there are empty cells, game is not over
        if self._get_empty_cells():
            return False
        
        # Check for possible merges
        for i in range(self.size):
            for j in range(self.size):
                current_value = self.board[i][j]
                
                # Check adjacent cells
                adjacent = [
                    (i - 1, j),
                    (i + 1, j),
                    (i, j - 1),
                    (i, j + 1)
                ]
                
                for adj_row, adj_col in adjacent:
                    if (0 <= adj_row < self.size and 
                        0 <= adj_col < self.size and
                        self.board[adj_row][adj_col] == current_value):
                        return False  # Merge is possible
        
        return True  # No moves possible
    
    def get_highest_tile(self) -> int:
        """Get highest tile value"""
        highest = 0
        for row in self.board:
            for tile in row:
                highest = max(highest, tile)
        return highest
    
    def get_duration(self) -> float:
        """Get game duration in seconds"""
        if not self.start_time:
            return 0
        return time.time() - self.start_time
    
    def get_game_state(self) -> GameState:
        """Get game state for saving/loading"""
        return GameState(
            board=copy.deepcopy(self.board),
            score=self.score,
            moves=self.moves,
            size=self.size,
            start_time=self.start_time or time.time(),
            is_game_over=self.is_game_over,
            has_won=self.has_won,
            continue_after_win=self.continue_after_win,
            history=copy.deepcopy(self.history)
        )
    
    def load_game_state(self, state: GameState):
        """Load game state"""
        self.board = copy.deepcopy(state.board)
        self.score = state.score
        self.moves = state.moves
        self.size = state.size
        self.start_time = state.start_time
        self.is_game_over = state.is_game_over
        self.has_won = state.has_won
        self.continue_after_win = state.continue_after_win
        self.history = copy.deepcopy(state.history)
        
        self._notify_board_update()
        self._notify_score_update()
    
    def get_possible_moves(self) -> List[Dict]:
        """Get all possible moves for AI"""
        moves = []
        
        for direction in Direction:
            # Create a test engine
            test_engine = GameEngine(self.size)
            test_engine.board = copy.deepcopy(self.board)
            test_engine.score = self.score
            
            if test_engine.move(direction):
                moves.append({
                    'direction': direction,
                    'board': test_engine.board,
                    'score': test_engine.score
                })
        
        return moves
    
    def new_game(self):
        """Start new game"""
        self.score = 0
        self.moves = 0
        self.initialize()
        self._notify_board_update()
        self._notify_score_update()
    
    # Callback registration methods
    def on_board_update(self, callback):
        self.callbacks['on_board_update'] = callback
    
    def on_score_update(self, callback):
        self.callbacks['on_score_update'] = callback
    
    def on_game_over(self, callback):
        self.callbacks['on_game_over'] = callback
    
    def on_win(self, callback):
        self.callbacks['on_win'] = callback
    
    def on_move(self, callback):
        self.callbacks['on_move'] = callback
    
    # Notification methods
    def _notify_board_update(self):
        if self.callbacks['on_board_update']:
            self.callbacks['on_board_update'](self.board)
    
    def _notify_score_update(self):
        if self.callbacks['on_score_update']:
            self.callbacks['on_score_update'](self.score, self.moves)
    
    def _notify_game_over(self):
        if self.callbacks['on_game_over']:
            result = GameResult(
                score=self.score,
                moves=self.moves,
                duration=self.get_duration(),
                highest_tile=self.get_highest_tile(),
                board_size=self.size,
                won=False,
                is_ai=False
            )
            self.callbacks['on_game_over'](result)
    
    def _notify_win(self):
        if self.callbacks['on_win']:
            result = GameResult(
                score=self.score,
                moves=self.moves,
                duration=self.get_duration(),
                highest_tile=self.get_highest_tile(),
                board_size=self.size,
                won=True,
                is_ai=False
            )
            self.callbacks['on_win'](result)
    
    def _notify_move(self, direction: Direction):
        if self.callbacks['on_move']:
            self.callbacks['on_move'](direction, self.moves)


class AISolver:
    """AI solver using Expectimax algorithm with heuristics"""
    
    def __init__(self, game_engine: GameEngine):
        self.game_engine = game_engine
        self.difficulty = GameDifficulty.MEDIUM
        self.max_depth = 3
        self.is_thinking = False
        
        # Difficulty settings (reduced depth for better performance)
        self.difficulty_settings = {
            GameDifficulty.EASY: {'depth': 2, 'randomness': 0.2},
            GameDifficulty.MEDIUM: {'depth': 3, 'randomness': 0.08},
            GameDifficulty.HARD: {'depth': 4, 'randomness': 0.03},
            GameDifficulty.EXPERT: {'depth': 5, 'randomness': 0.005}
        }
        
        # Cache for board evaluations
        self.evaluation_cache = {}
        self.max_cache_size = 10000
    
    def set_difficulty(self, difficulty: GameDifficulty):
        """Set AI difficulty"""
        self.difficulty = difficulty
        self.max_depth = self.difficulty_settings[difficulty]['depth']
        self.evaluation_cache.clear()
    
    def get_best_move(self) -> Optional[Direction]:
        """Get best move using Expectimax algorithm"""
        if self.is_thinking or self.game_engine.is_game_over:
            return None
        
        self.is_thinking = True
        
        try:
            possible_moves = self.game_engine.get_possible_moves()
            
            if not possible_moves:
                return None
            
            if len(possible_moves) == 1:
                return possible_moves[0]['direction']
            
            best_move = None
            best_score = float('-inf')
            
            # Evaluate each possible move
            for move in possible_moves:
                score = self._expectimax(move['board'], self.max_depth - 1, False)
                
                # Add some randomness for lower difficulties
                randomness = self.difficulty_settings[self.difficulty]['randomness']
                adjusted_score = score + (random.random() - 0.5) * randomness * score
                
                if adjusted_score > best_score:
                    best_score = adjusted_score
                    best_move = move['direction']
            
            return best_move or possible_moves[0]['direction']
        
        except Exception as e:
            print(f"Error in get_best_move: {e}")
            # Return a random valid move as fallback
            possible_moves = self.game_engine.get_possible_moves()
            if possible_moves:
                return random.choice(possible_moves)['direction']
            return None
        
        finally:
            self.is_thinking = False
    
    def _expectimax(self, board: List[List[int]], depth: int, is_maximizing: bool) -> float:
        """Expectimax algorithm implementation"""
        if depth == 0:
            return self._evaluate_board(board)
        
        if is_maximizing:
            # Player's turn - maximize score
            possible_moves = self._get_possible_moves_from_board(board)
            
            if not possible_moves:
                return self._evaluate_board(board)
            
            max_score = float('-inf')
            for move in possible_moves:
                score = self._expectimax(move['board'], depth - 1, False)
                max_score = max(max_score, score)
            
            return max_score
        else:
            # Random tile placement - calculate expected value
            empty_cells = self._get_empty_cells_from_board(board)
            
            if not empty_cells:
                return self._evaluate_board(board)
            
            expected_score = 0
            total_cells = len(empty_cells)
            
            # Consider placing both 2 and 4 tiles in each empty cell
            for row, col in empty_cells:
                for value, probability in [(2, 0.9), (4, 0.1)]:
                    new_board = self._place_tile(board, row, col, value)
                    score = self._expectimax(new_board, depth - 1, True)
                    expected_score += (probability / total_cells) * score
            
            return expected_score
    
    def _evaluate_board(self, board: List[List[int]]) -> float:
        """Evaluate board position using multiple heuristics"""
        board_key = self._get_board_key(board)
        
        if board_key in self.evaluation_cache:
            return self.evaluation_cache[board_key]
        
        size = len(board)
        score = 0
        
        # 1. Weighted position score (corner strategy)
        score += self._evaluate_positions(board) * 1.5
        
        # 2. Monotonicity (tiles should be arranged in order)
        score += self._evaluate_monotonicity(board) * 2.0
        
        # 3. Smoothness (adjacent tiles should be similar)
        score += self._evaluate_smoothness(board) * 0.2
        
        # 4. Empty cells (more empty cells = better)
        score += self._evaluate_empty_cells(board) * 4.0
        
        # 5. Max tile position (prefer corners)
        score += self._evaluate_max_tile_position(board) * 1.8
        
        # Cache the result
        if len(self.evaluation_cache) >= self.max_cache_size:
            self.evaluation_cache.clear()
        self.evaluation_cache[board_key] = score
        
        return score
    
    def _evaluate_positions(self, board: List[List[int]]) -> float:
        """Evaluate position-based score"""
        score = 0
        size = len(board)
        
        for i in range(size):
            for j in range(size):
                if board[i][j] > 0:
                    position_weight = self._get_position_weight(i, j, size)
                    tile_value = board[i][j]
                    log_value = 0 if tile_value <= 0 else (tile_value.bit_length() - 1)
                    score += tile_value * log_value * position_weight
        
        return score
    
    def _get_position_weight(self, row: int, col: int, size: int) -> float:
        """Get position weight for coordinates"""
        edge_distance = min(min(row, size - 1 - row), min(col, size - 1 - col))
        return pow(size - edge_distance, 1.5)
    
    def _evaluate_monotonicity(self, board: List[List[int]]) -> float:
        """Evaluate monotonicity"""
        size = len(board)
        score = 0
        
        # Check rows and columns for monotonicity
        for i in range(size):
            # Row monotonicity
            score += self._get_monotonicity_score([board[i][j] for j in range(size)])
            
            # Column monotonicity
            score += self._get_monotonicity_score([board[j][i] for j in range(size)])
        
        return score
    
    def _get_monotonicity_score(self, array: List[int]) -> float:
        """Get monotonicity score for an array"""
        increasing = 0
        decreasing = 0
        
        for i in range(len(array) - 1):
            current = 0 if array[i] <= 0 else (array[i].bit_length() - 1)
            next_val = 0 if array[i + 1] <= 0 else (array[i + 1].bit_length() - 1)
            
            if current > next_val:
                decreasing += current - next_val
            elif current < next_val:
                increasing += next_val - current
        
        return -min(increasing, decreasing)
    
    def _evaluate_smoothness(self, board: List[List[int]]) -> float:
        """Evaluate smoothness"""
        size = len(board)
        smoothness = 0
        
        for i in range(size):
            for j in range(size):
                if board[i][j] > 0:
                    current_log = 0 if board[i][j] <= 0 else (board[i][j].bit_length() - 1)
                    
                    # Check right neighbor
                    if j < size - 1 and board[i][j + 1] > 0:
                        right_log = 0 if board[i][j + 1] <= 0 else (board[i][j + 1].bit_length() - 1)
                        smoothness -= abs(current_log - right_log)
                    
                    # Check bottom neighbor
                    if i < size - 1 and board[i + 1][j] > 0:
                        bottom_log = 0 if board[i + 1][j] <= 0 else (board[i + 1][j].bit_length() - 1)
                        smoothness -= abs(current_log - bottom_log)
        
        return smoothness
    
    def _evaluate_empty_cells(self, board: List[List[int]]) -> float:
        """Evaluate empty cells"""
        empty_cells = self._get_empty_cells_from_board(board)
        return pow(len(empty_cells), 2)
    
    def _evaluate_max_tile_position(self, board: List[List[int]]) -> float:
        """Evaluate max tile position"""
        size = len(board)
        max_tile = 0
        max_row = -1
        max_col = -1
        
        # Find the maximum tile
        for i in range(size):
            for j in range(size):
                if board[i][j] > max_tile:
                    max_tile = board[i][j]
                    max_row = i
                    max_col = j
        
        if max_tile == 0:
            return 0
        
        # Reward corner positions for max tile
        is_corner = ((max_row == 0 or max_row == size - 1) and 
                     (max_col == 0 or max_col == size - 1))
        
        is_edge = (max_row == 0 or max_row == size - 1 or 
                   max_col == 0 or max_col == size - 1)
        
        if is_corner:
            return max_tile * 2
        elif is_edge:
            return max_tile
        else:
            return 0
    
    def _get_possible_moves_from_board(self, board: List[List[int]]) -> List[Dict]:
        """Get all possible moves from board state"""
        moves = []
        
        for direction in Direction:
            new_board = self._simulate_move(board, direction)
            if not self._boards_equal(board, new_board):
                moves.append({
                    'direction': direction,
                    'board': new_board
                })
        
        return moves
    
    def _simulate_move(self, board: List[List[int]], direction: Direction) -> List[List[int]]:
        """Simulate a move without affecting the actual game"""
        new_board = copy.deepcopy(board)
        size = len(board)
        
        if direction == Direction.UP:
            return self._simulate_move_up(new_board)
        elif direction == Direction.DOWN:
            return self._simulate_move_down(new_board)
        elif direction == Direction.LEFT:
            return self._simulate_move_left(new_board)
        elif direction == Direction.RIGHT:
            return self._simulate_move_right(new_board)
        
        return new_board
    
    def _simulate_move_up(self, board: List[List[int]]) -> List[List[int]]:
        """Simulate move up"""
        size = len(board)
        
        for col in range(size):
            column = [board[row][col] for row in range(size)]
            new_column = self._move_and_merge_array_ai(column)
            
            for row in range(size):
                board[row][col] = new_column[row]
        
        return board
    
    def _simulate_move_down(self, board: List[List[int]]) -> List[List[int]]:
        """Simulate move down"""
        size = len(board)
        
        for col in range(size):
            column = [board[row][col] for row in range(size)]
            reversed_column = column[::-1]
            new_reversed_column = self._move_and_merge_array_ai(reversed_column)
            new_column = new_reversed_column[::-1]
            
            for row in range(size):
                board[row][col] = new_column[row]
        
        return board
    
    def _simulate_move_left(self, board: List[List[int]]) -> List[List[int]]:
        """Simulate move left"""
        size = len(board)
        
        for row in range(size):
            board[row] = self._move_and_merge_array_ai(board[row])
        
        return board
    
    def _simulate_move_right(self, board: List[List[int]]) -> List[List[int]]:
        """Simulate move right"""
        size = len(board)
        
        for row in range(size):
            reversed_row = board[row][::-1]
            new_reversed_row = self._move_and_merge_array_ai(reversed_row)
            board[row] = new_reversed_row[::-1]
        
        return board
    
    def _move_and_merge_array_ai(self, array: List[int]) -> List[int]:
        """Move and merge array for AI simulation"""
        size = len(array)
        filtered = [val for val in array if val != 0]
        result = []
        i = 0
        
        while i < len(filtered):
            if i < len(filtered) - 1 and filtered[i] == filtered[i + 1]:
                result.append(filtered[i] * 2)
                i += 2
            else:
                result.append(filtered[i])
                i += 1
        
        while len(result) < size:
            result.append(0)
        
        return result
    
    def _get_empty_cells_from_board(self, board: List[List[int]]) -> List[Tuple[int, int]]:
        """Get empty cells from board"""
        empty_cells = []
        size = len(board)
        
        for i in range(size):
            for j in range(size):
                if board[i][j] == 0:
                    empty_cells.append((i, j))
        
        return empty_cells
    
    def _place_tile(self, board: List[List[int]], row: int, col: int, value: int) -> List[List[int]]:
        """Place tile on board (returns new board)"""
        new_board = copy.deepcopy(board)
        new_board[row][col] = value
        return new_board
    
    def _boards_equal(self, board1: List[List[int]], board2: List[List[int]]) -> bool:
        """Check if two boards are equal"""
        size = len(board1)
        
        for i in range(size):
            for j in range(size):
                if board1[i][j] != board2[i][j]:
                    return False
        
        return True
    
    def _get_board_key(self, board: List[List[int]]) -> str:
        """Generate unique key for board state"""
        return ','.join(','.join(map(str, row)) for row in board)
    
    def get_hint(self) -> Optional[Direction]:
        """Get hint for next best move"""
        return self.get_best_move()
    
    def clear_cache(self):
        """Clear evaluation cache"""
        self.evaluation_cache.clear()
    
    def get_stats(self) -> Dict:
        """Get AI statistics"""
        return {
            'difficulty': self.difficulty.value,
            'max_depth': self.max_depth,
            'cache_size': len(self.evaluation_cache),
            'is_thinking': self.is_thinking
        }


class Storage:
    """Game storage manager"""
    
    @staticmethod
    def save_game_state(game_state: GameState, filename: str = "game_state.json"):
        """Save game state to file"""
        try:
            with open(filename, 'w') as f:
                json.dump(asdict(game_state), f, indent=2)
            return True
        except Exception as e:
            print(f"Error saving game state: {e}")
            return False
    
    @staticmethod
    def load_game_state(filename: str = "game_state.json") -> Optional[GameState]:
        """Load game state from file"""
        try:
            with open(filename, 'r') as f:
                data = json.load(f)
            return GameState(**data)
        except Exception as e:
            print(f"Error loading game state: {e}")
            return None
    
    @staticmethod
    def save_settings(settings: Dict, filename: str = "settings.json"):
        """Save settings to file"""
        try:
            with open(filename, 'w') as f:
                json.dump(settings, f, indent=2)
            return True
        except Exception as e:
            print(f"Error saving settings: {e}")
            return False
    
    @staticmethod
    def load_settings(filename: str = "settings.json") -> Dict:
        """Load settings from file"""
        try:
            with open(filename, 'r') as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading settings: {e}")
            return {}


class Fancy2048App:
    """Main application controller"""
    
    def __init__(self, size: int = 4):
        self.game_engine = None
        self.ai_solver = None
        self.is_initialized = False
        self.auto_play_active = False
        self.settings = {}
        
        self.initialize(size)
    
    def initialize(self, size: int = 4):
        """Initialize the application"""
        try:
            print("Fancy2048: Starting initialization...")
            
            # Initialize game engine
            self.game_engine = GameEngine(size)
            
            # Initialize AI solver
            self.ai_solver = AISolver(self.game_engine)
            self.ai_solver.set_difficulty(GameDifficulty.MEDIUM)
            
            # Setup callbacks
            self._setup_callbacks()
            
            # Load settings and saved game
            self._load_settings()
            self._load_saved_game()
            
            self.is_initialized = True
            print("Fancy2048: Initialization completed successfully")
            
        except Exception as e:
            print(f"Fancy2048 initialization error: {e}")
            raise e
    
    def _setup_callbacks(self):
        """Setup game engine callbacks"""
        self.game_engine.on_board_update(self._handle_board_update)
        self.game_engine.on_score_update(self._handle_score_update)
        self.game_engine.on_game_over(self._handle_game_over)
        self.game_engine.on_win(self._handle_game_win)
        self.game_engine.on_move(self._handle_move)
    
    def _handle_board_update(self, board):
        """Handle board update"""
        print("Board updated")
        self._auto_save_game_state()
    
    def _handle_score_update(self, score, moves):
        """Handle score update"""
        print(f"Score: {score}, Moves: {moves}")
    
    def _handle_game_over(self, result: GameResult):
        """Handle game over"""
        self.stop_auto_play()
        print(f"Game Over! Final Score: {result.score}")
        self._save_game_state()
    
    def _handle_game_win(self, result: GameResult):
        """Handle game win"""
        print(f"Victory! Score: {result.score}")
        self._save_game_state()
    
    def _handle_move(self, direction: Direction, moves: int):
        """Handle move"""
        if moves % 5 == 0:
            self._save_game_state()
    
    def _load_settings(self):
        """Load application settings"""
        self.settings = Storage.load_settings()
        self._apply_settings()
    
    def _apply_settings(self):
        """Apply loaded settings"""
        if 'board_size' in self.settings:
            size = self.settings['board_size']
            if size != self.game_engine.size:
                self.game_engine = GameEngine(size)
                self.ai_solver = AISolver(self.game_engine)
        
        if 'ai_difficulty' in self.settings:
            try:
                difficulty = GameDifficulty(self.settings['ai_difficulty'])
                self.ai_solver.set_difficulty(difficulty)
            except ValueError:
                pass
    
    def _load_saved_game(self):
        """Load saved game state"""
        saved_state = Storage.load_game_state()
        if saved_state:
            self.game_engine.load_game_state(saved_state)
            print("Saved game loaded")
        else:
            self.game_engine.new_game()
    
    def _save_game_state(self):
        """Save current game state"""
        if not self.is_initialized:
            return
        
        try:
            game_state = self.game_engine.get_game_state()
            Storage.save_game_state(game_state)
        except Exception as e:
            print(f"Error saving game state: {e}")
    
    def _auto_save_game_state(self):
        """Auto-save game state periodically"""
        # Save every few moves to prevent loss
        if self.game_engine.moves % 3 == 0:
            self._save_game_state()
    
    def get_ai_hint(self) -> Optional[Direction]:
        """Get AI hint"""
        if not self.ai_solver or not self.is_initialized:
            return None
        
        try:
            hint = self.ai_solver.get_hint()
            print(f"AI hint: {hint.value if hint else 'No hint available'}")
            return hint
        except Exception as e:
            print(f"Error getting AI hint: {e}")
            return None
    
    def start_auto_play(self) -> bool:
        """Start auto-play"""
        if not self.ai_solver:
            print("Cannot start autoplay: AI solver not available")
            return False
        
        if self.auto_play_active:
            print("Cannot start autoplay: already active")
            return False
        
        if self.game_engine.is_game_over:
            print("Cannot start autoplay: game is over")
            return False
        
        self.auto_play_active = True
        print("Auto-play started")
        
        return True
    
    def stop_auto_play(self):
        """Stop auto-play"""
        self.auto_play_active = False
        print("Auto-play stopped")
    
    def toggle_auto_play(self) -> bool:
        """Toggle auto-play"""
        if self.auto_play_active:
            self.stop_auto_play()
            return False
        else:
            return self.start_auto_play()
    
    def play_auto_move(self) -> bool:
        """Play one auto move"""
        if not self.auto_play_active or self.game_engine.is_game_over:
            self.stop_auto_play()
            return False
        
        try:
            best_move = self.ai_solver.get_best_move()
            if best_move:
                success = self.game_engine.move(best_move)
                if success:
                    print(f"AI played: {best_move.value}")
                    return True
                else:
                    print("AI move failed")
                    self.stop_auto_play()
                    return False
            else:
                print("No AI move available")
                self.stop_auto_play()
                return False
        except Exception as e:
            print(f"Error in auto-play move: {e}")
            self.stop_auto_play()
            return False
    
    def new_game(self):
        """Start new game"""
        self.stop_auto_play()
        self.game_engine.new_game()
        self._save_game_state()
        print("New game started")
    
    def move(self, direction: Direction) -> bool:
        """Make a move"""
        return self.game_engine.move(direction)
    
    def undo(self) -> bool:
        """Undo last move"""
        return self.game_engine.undo()
    
    def get_game_stats(self) -> Dict:
        """Get game statistics"""
        game_state = self.game_engine.get_game_state()
        ai_stats = self.ai_solver.get_stats() if self.ai_solver else {}
        
        return {
            'game': asdict(game_state),
            'ai': ai_stats,
            'auto_play_active': self.auto_play_active,
            'is_initialized': self.is_initialized
        }
    
    def print_board(self):
        """Print current board to console"""
        print("\nCurrent Board:")
        print("-" * (self.game_engine.size * 8))
        for row in self.game_engine.board:
            print("|", end="")
            for tile in row:
                print(f"{tile:6d} |", end="")
            print()
        print("-" * (self.game_engine.size * 8))
        print(f"Score: {self.game_engine.score} | Moves: {self.game_engine.moves}")
        print()
    
    def run_auto_play_demo(self, num_moves: int = 100):
        """Run auto-play demonstration"""
        if not self.start_auto_play():
            return
        
        print(f"\nStarting auto-play demo for {num_moves} moves...")
        self.print_board()
        
        moves_played = 0
        while self.auto_play_active and moves_played < num_moves:
            if self.play_auto_move():
                moves_played += 1
                if moves_played % 10 == 0:
                    self.print_board()
                time.sleep(0.1)  # Small delay for visualization
            else:
                break
        
        print(f"\nDemo completed. Moves played: {moves_played}")
        self.print_board()


def main():
    """Main function for testing and demonstration"""
    print("=== Fancy2048 Python Application ===")
    
    # Create and initialize the app
    app = Fancy2048App()
    
    # Print initial state
    app.print_board()
    
    # Interactive demo
    print("\nCommands:")
    print("  w/a/s/d - Move up/left/down/right")
    print("  h       - Get AI hint")
    print("  auto    - Toggle auto-play")
    print("  new     - New game")
    print("  undo    - Undo last move")
    print("  demo    - Run auto-play demo")
    print("  stats   - Show game statistics")
    print("  quit    - Exit")
    
    while True:
        try:
            command = input("\nEnter command: ").strip().lower()
            
            if command in ['quit', 'exit', 'q']:
                break
            elif command == 'w':
                success = app.move(Direction.UP)
                print(f"Move {'successful' if success else 'failed'}")
            elif command == 'a':
                success = app.move(Direction.LEFT)
                print(f"Move {'successful' if success else 'failed'}")
            elif command == 's':
                success = app.move(Direction.DOWN)
                print(f"Move {'successful' if success else 'failed'}")
            elif command == 'd':
                success = app.move(Direction.RIGHT)
                print(f"Move {'successful' if success else 'failed'}")
            elif command == 'h':
                hint = app.get_ai_hint()
                print(f"AI suggests: {hint.value if hint else 'No suggestion'}")
            elif command == 'auto':
                active = app.toggle_auto_play()
                print(f"Auto-play {'started' if active else 'stopped'}")
            elif command == 'new':
                app.new_game()
            elif command == 'undo':
                success = app.undo()
                print(f"Undo {'successful' if success else 'not available'}")
            elif command == 'demo':
                app.run_auto_play_demo(50)
            elif command == 'stats':
                stats = app.get_game_stats()
                print(f"\nGame Statistics:")
                print(f"Score: {stats['game']['score']}")
                print(f"Moves: {stats['game']['moves']}")
                print(f"Board Size: {stats['game']['size']}x{stats['game']['size']}")
                print(f"Game Over: {stats['game']['is_game_over']}")
                print(f"Has Won: {stats['game']['has_won']}")
                print(f"Auto-play Active: {stats['auto_play_active']}")
                if stats['ai']:
                    print(f"AI Difficulty: {stats['ai']['difficulty']}")
                    print(f"AI Cache Size: {stats['ai']['cache_size']}")
            else:
                print("Unknown command. Try 'quit' to exit.")
            
            if not app.game_engine.is_game_over:
                app.print_board()
            
        except KeyboardInterrupt:
            print("\nExiting...")
            break
        except Exception as e:
            print(f"Error: {e}")
    
    print("Thanks for playing Fancy2048!")


if __name__ == "__main__":
    main()