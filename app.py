from flask import Flask, render_template, send_from_directory, jsonify, request
import random
import uuid
import time

app = Flask(__name__, template_folder='pages')

# In-memory game storage
games = {}

class Game:
    def __init__(self, size=4):
        self.size = size
        self.board = [[0 for _ in range(size)] for _ in range(size)]
        self.score = 0
        self.best_score = 0
        self.moves = 0
        self.state = 'playing'  # playing, won, over
        self.previous_boards = []  # For undo functionality
        self.previous_scores = []
        self.previous_moves = []
        self.start_time = time.time()
        
        # Add initial two tiles
        self.add_random_tile()
        self.add_random_tile()
    
    def add_random_tile(self):
        """Add a random tile (2 or 4) to an empty cell"""
        empty_cells = []
        for i in range(self.size):
            for j in range(self.size):
                if self.board[i][j] == 0:
                    empty_cells.append((i, j))
        
        if empty_cells:
            i, j = random.choice(empty_cells)
            self.board[i][j] = 2 if random.random() < 0.9 else 4
            return True
        return False
    
    def save_state(self):
        """Save current state for undo functionality"""
        # Create deep copies to avoid reference issues
        self.previous_boards.append([row[:] for row in self.board])
        self.previous_scores.append(self.score)
        self.previous_moves.append(self.moves)
        
        # Keep only the last 10 states
        if len(self.previous_boards) > 10:
            self.previous_boards.pop(0)
            self.previous_scores.pop(0)
            self.previous_moves.pop(0)
    
    def undo(self):
        """Revert to previous state"""
        if self.previous_boards:
            self.board = self.previous_boards.pop()
            self.score = self.previous_scores.pop()
            self.moves = self.previous_moves.pop()
            # Reset state if it was game over
            if self.state != 'playing':
                self.state = 'playing'
            return True
        return False
    
    def move(self, direction):
        """Make a move in the specified direction"""
        # Save current state before move
        self.save_state()
        
        moved = False
        
        # Implement move logic
        if direction == 'up':
            moved = self._move_up()
        elif direction == 'down':
            moved = self._move_down()
        elif direction == 'left':
            moved = self._move_left()
        elif direction == 'right':
            moved = self._move_right()
        
        if moved:
            self.moves += 1
            self.add_random_tile()
            self.check_game_state()
        
        return moved
    
    def _move_left(self):
        """Move tiles left and merge where possible"""
        moved = False
        for row in range(self.size):
            # Slide all non-zero tiles to the left
            new_row = [tile for tile in self.board[row] if tile != 0]
            # Pad with zeros
            new_row += [0] * (self.size - len(new_row))
            
            # Check for merges
            i = 0
            while i < self.size - 1:
                if new_row[i] == new_row[i+1] and new_row[i] != 0:
                    new_row[i] *= 2
                    self.score += new_row[i]
                    new_row[i+1] = 0
                    i += 2
                else:
                    i += 1
            
            # Slide again after merges
            final_row = [tile for tile in new_row if tile != 0]
            final_row += [0] * (self.size - len(final_row))
            
            # Check if the row changed
            if final_row != self.board[row]:
                moved = True
            
            # Update the board
            self.board[row] = final_row
            
        return moved
    
    def _move_right(self):
        """Move tiles right and merge where possible"""
        moved = False
        for row in range(self.size):
            # Slide all non-zero tiles to the right
            new_row = [tile for tile in self.board[row] if tile != 0]
            # Pad with zeros at the beginning
            new_row = [0] * (self.size - len(new_row)) + new_row
            
            # Check for merges from right to left
            i = self.size - 1
            while i > 0:
                if new_row[i] == new_row[i-1] and new_row[i] != 0:
                    new_row[i] *= 2
                    self.score += new_row[i]
                    new_row[i-1] = 0
                    i -= 2
                else:
                    i -= 1
            
            # Slide again after merges
            final_row = [tile for tile in new_row if tile != 0]
            final_row = [0] * (self.size - len(final_row)) + final_row
            
            # Check if the row changed
            if final_row != self.board[row]:
                moved = True
            
            # Update the board
            self.board[row] = final_row
            
        return moved
    
    def _move_up(self):
        """Move tiles up and merge where possible"""
        moved = False
        
        # Transpose the board
        transposed = list(zip(*self.board))
        board_copy = [list(row) for row in transposed]
        
        # Move left on the transposed board (equivalent to moving up)
        for row in range(self.size):
            # Slide all non-zero tiles to the left
            new_row = [tile for tile in board_copy[row] if tile != 0]
            # Pad with zeros
            new_row += [0] * (self.size - len(new_row))
            
            # Check for merges
            i = 0
            while i < self.size - 1:
                if new_row[i] == new_row[i+1] and new_row[i] != 0:
                    new_row[i] *= 2
                    self.score += new_row[i]
                    new_row[i+1] = 0
                    i += 2
                else:
                    i += 1
            
            # Slide again after merges
            final_row = [tile for tile in new_row if tile != 0]
            final_row += [0] * (self.size - len(final_row))
            
            # Check if the row changed
            if final_row != board_copy[row]:
                moved = True
            
            # Update the transposed board
            board_copy[row] = final_row
        
        # Transpose back
        self.board = [list(row) for row in zip(*board_copy)]
            
        return moved
    
    def _move_down(self):
        """Move tiles down and merge where possible"""
        moved = False
        
        # Transpose the board
        transposed = list(zip(*self.board))
        board_copy = [list(row) for row in transposed]
        
        # Move right on the transposed board (equivalent to moving down)
        for row in range(self.size):
            # Slide all non-zero tiles to the right
            new_row = [tile for tile in board_copy[row] if tile != 0]
            # Pad with zeros at the beginning
            new_row = [0] * (self.size - len(new_row)) + new_row
            
            # Check for merges from right to left
            i = self.size - 1
            while i > 0:
                if new_row[i] == new_row[i-1] and new_row[i] != 0:
                    new_row[i] *= 2
                    self.score += new_row[i]
                    new_row[i-1] = 0
                    i -= 2
                else:
                    i -= 1
            
            # Slide again after merges
            final_row = [tile for tile in new_row if tile != 0]
            final_row = [0] * (self.size - len(final_row)) + final_row
            
            # Check if the row changed
            if final_row != board_copy[row]:
                moved = True
            
            # Update the transposed board
            board_copy[row] = final_row
        
        # Transpose back
        self.board = [list(row) for row in zip(*board_copy)]
            
        return moved
    
    def check_game_state(self):
        """Check if game is won or over"""
        # Check for 2048 tile (win condition)
        for row in self.board:
            if 2048 in row and self.state == 'playing':
                self.state = 'won'
                return
        
        # Check if the board is full
        is_full = all(all(cell != 0 for cell in row) for row in self.board)
        
        if is_full:
            # Check if any moves are possible
            can_move = False
            
            # Check for possible horizontal merges
            for row in range(self.size):
                for col in range(self.size - 1):
                    if self.board[row][col] == self.board[row][col + 1]:
                        can_move = True
                        break
            
            # Check for possible vertical merges
            for col in range(self.size):
                for row in range(self.size - 1):
                    if self.board[row][col] == self.board[row + 1][col]:
                        can_move = True
                        break
            
            if not can_move:
                self.state = 'over'
    
    def get_elapsed_time(self):
        """Return elapsed time as a formatted string"""
        elapsed = int(time.time() - self.start_time)
        minutes = elapsed // 60
        seconds = elapsed % 60
        return f"{minutes:02d}:{seconds:02d}"
    
    def get_state(self):
        """Return the complete game state as a dictionary"""
        return {
            'board': self.board,
            'score': self.score,
            'bestScore': self.best_score,
            'moves': self.moves,
            'gameState': self.state,
            'canUndo': len(self.previous_boards) > 0,
            'time': self.get_elapsed_time(),
            'size': self.size
        }


# Routes for static files
@app.route('/scripts/<path:filename>')
def serve_scripts(filename):
    return send_from_directory('scripts', filename)

@app.route('/styles/<path:filename>')
def serve_styles(filename):
    return send_from_directory('styles', filename)

@app.route('/')
def index():
    return render_template('index.html', title='Home')

@app.route('/leaderboard.html')
def leaderboard():
    return render_template('leaderboard.html', title='Leaderboard')

# Game API endpoints
@app.route('/api/new_game', methods=['POST'])
def new_game():
    """Create a new game instance"""
    data = request.json or {}
    size = data.get('size', 4)
    
    # Create a unique game ID
    game_id = str(uuid.uuid4())
    
    # Create a new game
    games[game_id] = Game(size)
    
    # Return the game ID and initial state
    return jsonify({
        'gameId': game_id,
        'gameState': games[game_id].get_state()
    })

@app.route('/api/move', methods=['POST'])
def make_move():
    """Make a move in the game"""
    data = request.json or {}
    game_id = data.get('gameId')
    direction = data.get('direction')
    
    if not game_id or not direction or game_id not in games:
        return jsonify({'error': 'Invalid request'}), 400
    
    game = games[game_id]
    moved = game.move(direction)
    
    return jsonify({
        'moved': moved,
        'gameState': game.get_state()
    })

@app.route('/api/undo', methods=['POST'])
def undo_move():
    """Undo the last move"""
    data = request.json or {}
    game_id = data.get('gameId')
    
    if not game_id or game_id not in games:
        return jsonify({'error': 'Invalid request'}), 400
    
    game = games[game_id]
    success = game.undo()
    
    return jsonify({
        'success': success,
        'gameState': game.get_state()
    })

@app.route('/api/get_state', methods=['GET'])
def get_state():
    """Get the current game state"""
    game_id = request.args.get('gameId')
    
    if not game_id or game_id not in games:
        return jsonify({'error': 'Invalid game ID'}), 400
    
    return jsonify({
        'gameState': games[game_id].get_state()
    })

@app.route('/api/reset', methods=['POST'])
def reset_game():
    """Reset the game"""
    data = request.json or {}
    game_id = data.get('gameId')
    
    if not game_id or game_id not in games:
        return jsonify({'error': 'Invalid request'}), 400
    
    # Store best score from current game
    best_score = games[game_id].best_score
    
    # Create a new game with the same size
    size = games[game_id].size
    games[game_id] = Game(size)
    
    # Restore best score
    games[game_id].best_score = best_score
    
    return jsonify({
        'gameState': games[game_id].get_state()
    })

@app.route('/api/change_size', methods=['POST'])
def change_board_size():
    """Change the board size"""
    data = request.json or {}
    game_id = data.get('gameId')
    size = data.get('size', 4)
    
    if not game_id or game_id not in games:
        return jsonify({'error': 'Invalid request'}), 400
    
    # Store best score from current game
    best_score = games[game_id].best_score
    
    # Create a new game with the new size
    games[game_id] = Game(size)
    
    # Restore best score
    games[game_id].best_score = best_score
    
    return jsonify({
        'gameState': games[game_id].get_state()
    })

# Cleanup dead games periodically (not implemented in this simple version)
# In a production app, you'd want to remove inactive games to prevent memory leaks

if __name__ == '__main__':
    app.run(debug=True)
