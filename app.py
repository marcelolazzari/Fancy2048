from flask import Flask, render_template, send_from_directory, jsonify, request, session
from flask_cors import CORS
import random
import uuid
import time
import json
import os


app = Flask(__name__, template_folder='pages')
CORS(app)
app.secret_key = 'fancy2048-secret-key-change-in-production'  # Change this in production

# In-memory storage for users, games, and statistics
users = {}  # username -> user_data
games = {}  # session_id -> game_instance
user_stats = {}  # username -> [list of game stats]
user_leaderboards = {}  # username -> [list of best scores]

class User:
    def __init__(self, username):
        self.username = username
        self.created_at = time.time()
        self.last_active = time.time()
        self.total_games = 0
        self.best_score = 0
        self.best_tile = 0
        self.preferences = {
            'theme': 'dark',
            'hue_value': 60,
            'default_grid_size': 4
        }
    
    def update_activity(self):
        """Update last active timestamp"""
        self.last_active = time.time()
    
    def update_stats(self, score, tile, games_played=1):
        """Update user's overall statistics"""
        self.total_games += games_played
        self.best_score = max(self.best_score, score)
        self.best_tile = max(self.best_tile, tile)
    
    def to_dict(self):
        """Convert user to dictionary for JSON serialization"""
        return {
            'username': self.username,
            'created_at': self.created_at,
            'last_active': self.last_active,
            'total_games': self.total_games,
            'best_score': self.best_score,
            'best_tile': self.best_tile,
            'preferences': self.preferences
        }

class Game:
    def __init__(self, size=4, username=None):
        # Core game properties
        self.size = size
        self.board = [[0 for _ in range(size)] for _ in range(size)]
        self.score = 0
        self.best_score = 0
        self.moves = 0
        self.state = 'playing'  # playing, won, over
        self.username = username  # Associate game with user

        # Game history and stats
        self.previous_boards = []  # For undo functionality
        self.previous_scores = []
        self.previous_moves = []
        self.start_time = time.time()
        self.has_saved_stats = False  # Track if stats have been saved

        # Visual settings (stored but managed by frontend)
        self.is_light_mode = False
        self.hue_value = 0

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
        
        # Limit the undo history (like maxUndoSteps in JS)
        if len(self.previous_boards) > 20:
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
            
            # Update best score
            if self.score > self.best_score:
                self.best_score = self.score
        
        return moved
    
    def _move_left(self):
        """Move tiles left and merge where possible"""
        merged_positions = []  # Track merged positions like lastMerged in JS
        moved = False
        
        for row in range(self.size):
            for col in range(1, self.size):
                if self.board[row][col] != 0:
                    current_col = col
                    
                    # Continue moving left until hitting a wall, a different tile, or already merged tile
                    while (current_col > 0 and 
                           (self.board[row][current_col-1] == 0 or 
                            self.board[row][current_col-1] == self.board[row][current_col]) and
                           (row, current_col-1) not in merged_positions):
                        
                        if self.board[row][current_col-1] == 0:
                            # Move to empty space
                            self.board[row][current_col-1] = self.board[row][current_col]
                            self.board[row][current_col] = 0
                            current_col -= 1
                            moved = True
                        elif self.board[row][current_col-1] == self.board[row][current_col]:
                            # Merge with matching tile
                            self.board[row][current_col-1] *= 2
                            self.score += self.board[row][current_col-1]
                            self.board[row][current_col] = 0
                            merged_positions.append((row, current_col-1))
                            moved = True
                            break
        
        return moved
    
    def _move_right(self):
        """Move tiles right and merge where possible"""
        merged_positions = []
        moved = False
        
        for row in range(self.size):
            for col in range(self.size-2, -1, -1):
                if self.board[row][col] != 0:
                    current_col = col
                    
                    while (current_col < self.size-1 and 
                           (self.board[row][current_col+1] == 0 or 
                            self.board[row][current_col+1] == self.board[row][current_col]) and
                           (row, current_col+1) not in merged_positions):
                        
                        if self.board[row][current_col+1] == 0:
                            # Move to empty space
                            self.board[row][current_col+1] = self.board[row][current_col]
                            self.board[row][current_col] = 0
                            current_col += 1
                            moved = True
                        elif self.board[row][current_col+1] == self.board[row][current_col]:
                            # Merge with matching tile
                            self.board[row][current_col+1] *= 2
                            self.score += self.board[row][current_col+1]
                            self.board[row][current_col] = 0
                            merged_positions.append((row, current_col+1))
                            moved = True
                            break
        
        return moved
    
    def _move_up(self):
        """Move tiles up and merge where possible"""
        merged_positions = []
        moved = False
        
        for col in range(self.size):
            for row in range(1, self.size):
                if self.board[row][col] != 0:
                    current_row = row
                    
                    while (current_row > 0 and 
                           (self.board[current_row-1][col] == 0 or 
                            self.board[current_row-1][col] == self.board[current_row][col]) and
                           (current_row-1, col) not in merged_positions):
                        
                        if self.board[current_row-1][col] == 0:
                            # Move to empty space
                            self.board[current_row-1][col] = self.board[current_row][col]
                            self.board[current_row][col] = 0
                            current_row -= 1
                            moved = True
                        elif self.board[current_row-1][col] == self.board[current_row][col]:
                            # Merge with matching tile
                            self.board[current_row-1][col] *= 2
                            self.score += self.board[current_row-1][col]
                            self.board[current_row][col] = 0
                            merged_positions.append((current_row-1, col))
                            moved = True
                            break
        
        return moved
    
    def _move_down(self):
        """Move tiles down and merge where possible"""
        merged_positions = []
        moved = False
        
        for col in range(self.size):
            for row in range(self.size-2, -1, -1):
                if self.board[row][col] != 0:
                    current_row = row
                    
                    while (current_row < self.size-1 and 
                           (self.board[current_row+1][col] == 0 or 
                            self.board[current_row+1][col] == self.board[current_row][col]) and
                           (current_row+1, col) not in merged_positions):
                        
                        if self.board[current_row+1][col] == 0:
                            # Move to empty space
                            self.board[current_row+1][col] = self.board[current_row][col]
                            self.board[current_row][col] = 0
                            current_row += 1
                            moved = True
                        elif self.board[current_row+1][col] == self.board[current_row][col]:
                            # Merge with matching tile
                            self.board[current_row+1][col] *= 2
                            self.score += self.board[current_row+1][col]
                            self.board[current_row][col] = 0
                            merged_positions.append((current_row+1, col))
                            moved = True
                            break
        
        return moved
    
    def check_game_state(self):
        """Check if game is won or over"""
        # Check for 2048 tile (win condition)
        for row in self.board:
            if 2048 in row and self.state != 'won':
                self.state = 'won'
                self.save_stats()
                return
        
        # Check if the board is full
        is_full = all(all(cell != 0 for cell in row) for row in self.board)
        
        if is_full:
            # Check if any moves are possible
            can_move = self.can_move('up') or self.can_move('down') or self.can_move('left') or self.can_move('right')
            
            if not can_move:
                self.state = 'over'
                self.save_stats()
    
    def can_move(self, direction):
        """Check if a move in the given direction is possible"""
        # Create a deep copy of the board
        test_board = [row[:] for row in self.board]
        
        # Try the move on the copy
        for i in range(self.size):
            for j in range(self.size):
                if self.board[i][j] != 0:
                    row_delta, col_delta = 0, 0
                    
                    if direction == 'up':
                        row_delta = -1
                    elif direction == 'down':
                        row_delta = 1
                    elif direction == 'left':
                        col_delta = -1
                    elif direction == 'right':
                        col_delta = 1
                    
                    new_row, new_col = i + row_delta, j + col_delta
                    
                    if (0 <= new_row < self.size and 0 <= new_col < self.size):
                        # Can move to empty cell or merge with same value
                        if (test_board[new_row][new_col] == 0 or 
                            test_board[new_row][new_col] == test_board[i][j]):
                            return True
        
        return False
    
    def save_stats(self):
        """Save game statistics to localStorage equivalent (handled by endpoint)"""
        if self.score > 0 and not self.has_saved_stats:
            self.has_saved_stats = True
            return True
        return False
    
    def get_elapsed_time(self):
        """Return elapsed time as a formatted string"""
        elapsed = int(time.time() - self.start_time)
        minutes = elapsed // 60
        seconds = elapsed % 60
        return f"{minutes:02d}:{seconds:02d}"
    
    def get_state(self):
        """Return the complete game state as a dictionary"""
        best_tile = max([max(row) for row in self.board]) if any(any(cell != 0 for cell in row) for row in self.board) else 0
        
        return {
            'board': self.board,
            'score': self.score,
            'bestScore': self.best_score,
            'bestTile': best_tile,
            'moves': self.moves,
            'gameState': self.state,
            'canUndo': len(self.previous_boards) > 0,
            'time': self.get_elapsed_time(),
            'size': self.size,
            'isLightMode': self.is_light_mode,
            'hueValue': self.hue_value
        }
    
    def get_stats_data(self):
        """Get data for statistics saving"""
        time_str = self.get_elapsed_time()
        best_tile = max([max(row) for row in self.board]) if any(any(cell != 0 for cell in row) for row in self.board) else 0
        
        return {
            'score': self.score,
            'bestTile': best_tile,
            'bestScore': self.best_score,
            'date': time.strftime('%Y-%m-%dT%H:%M:%S.000Z'),
            'time': time_str,
            'moves': self.moves
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

@app.route('/api/create_user', methods=['POST'])
def create_user():
    """Create a new user account"""
    data = request.json or {}
    username = data.get('username', '').strip()
    
    if not username:
        return jsonify({'success': False, 'error': 'Username is required'}), 400
    
    if len(username) < 2:
        return jsonify({'success': False, 'error': 'Username must be at least 2 characters long'}), 400
    
    if len(username) > 20:
        return jsonify({'success': False, 'error': 'Username must be no more than 20 characters long'}), 400
    
    if username in users:
        return jsonify({'success': False, 'error': 'Username already exists'}), 400
    
    # Create new user (no password needed)
    user = User(username)
    users[username] = user
    user_stats[username] = []
    user_leaderboards[username] = []
    
    # Set session
    session['username'] = username
    
    return jsonify({
        'success': True, 
        'message': 'User created successfully',
        'user': user.to_dict()
    })

@app.route('/api/login', methods=['POST'])
def login():
    """Login user (username only)"""
    data = request.json or {}
    username = data.get('username', '').strip()
    
    if not username:
        return jsonify({'success': False, 'error': 'Username is required'}), 400
    
    if username not in users:
        return jsonify({'success': False, 'error': 'User not found. Please create a new account.'}), 404
    
    user = users[username]
    
    # Update activity and set session
    user.update_activity()
    session['username'] = username
    
    return jsonify({
        'success': True,
        'message': 'Login successful',
        'user': user.to_dict()
    })

@app.route('/api/logout', methods=['POST'])
def logout():
    """Logout user"""
    if 'username' in session:
        session.pop('username')
    return jsonify({'success': True, 'message': 'Logged out successfully'})

@app.route('/api/current_user', methods=['GET'])
def current_user():
    """Get current user information"""
    username = session.get('username')
    if not username or username not in users:
        return jsonify({'user': None})
    
    user = users[username]
    user.update_activity()
    return jsonify({'user': user.to_dict()})

@app.route('/api/users', methods=['GET'])
def get_users():
    """Get list of all users (for admin purposes or user selection)"""
    user_list = []
    for username, user in users.items():
        user_list.append({
            'username': user.username,
            'total_games': user.total_games,
            'best_score': user.best_score,
            'best_tile': user.best_tile,
            'last_active': user.last_active
        })
    
    # Sort by best score descending
    user_list.sort(key=lambda x: x['best_score'], reverse=True)
    
    return jsonify({'users': user_list})

@app.route('/api/guest_login', methods=['POST'])
def guest_login():
    """Create a temporary guest user"""
    guest_id = f"guest_{uuid.uuid4().hex[:8]}"
    
    # Create guest user
    user = User(guest_id)
    users[guest_id] = user
    user_stats[guest_id] = []
    user_leaderboards[guest_id] = []
    
    # Set session
    session['username'] = guest_id
    
    return jsonify({
        'success': True,
        'message': 'Guest session created',
        'user': user.to_dict()
    })

# Game API endpoints
@app.route('/api/new_game', methods=['POST'])
def new_game():
    """Create a new game instance"""
    data = request.json or {}
    size = data.get('size', 4)
    
    # Get current user
    username = session.get('username')
    if not username:
        return jsonify({'error': 'User not logged in'}), 401
    
    # Create a unique game ID
    game_id = str(uuid.uuid4())
    
    # Create a new game associated with the user
    games[game_id] = Game(size, username)
    
    # Update user activity
    if username in users:
        users[username].update_activity()
    
    # Return the game ID and initial state
    return jsonify({
        'gameId': game_id,
        'gameState': games[game_id].get_state(),
        'username': username
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
    
    # Store best score and username from current game
    best_score = games[game_id].best_score
    username = games[game_id].username
    
    # Create a new game with the same size and user
    size = games[game_id].size
    games[game_id] = Game(size, username)
    
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
    
    # Store best score and username from current game
    best_score = games[game_id].best_score
    username = games[game_id].username
    
    # Create a new game with the new size and user
    games[game_id] = Game(size, username)
    
    # Restore best score
    games[game_id].best_score = best_score
    
    return jsonify({
        'gameState': games[game_id].get_state()
    })

# New endpoints for theme and visual settings
@app.route('/api/change_theme', methods=['POST'])
def change_theme():
    """Toggle light/dark theme"""
    data = request.json or {}
    game_id = data.get('gameId')
    
    if not game_id or game_id not in games:
        return jsonify({'error': 'Invalid request'}), 400
    
    games[game_id].is_light_mode = not games[game_id].is_light_mode
    
    return jsonify({
        'gameState': games[game_id].get_state()
    })

@app.route('/api/change_hue', methods=['POST'])
def change_hue():
    """Change color hue"""
    data = request.json or {}
    game_id = data.get('gameId')
    hue = data.get('hue')
    
    if not game_id or game_id not in games:
        return jsonify({'error': 'Invalid request'}), 400
    
    if hue is not None:
        games[game_id].hue_value = hue
    else:
        # Cycle through hue values like in JS
        games[game_id].hue_value = (games[game_id].hue_value + 60) % 360
    
    return jsonify({
        'gameState': games[game_id].get_state()
    })

# Stats and leaderboard endpoints
@app.route('/api/save_stats', methods=['POST'])
def save_game_stats():
    """Save game statistics for current user"""
    data = request.json or {}
    game_id = data.get('gameId')
    
    # Get current user
    username = session.get('username')
    if not username:
        return jsonify({'error': 'User not logged in'}), 401
    
    if not game_id or game_id not in games:
        return jsonify({'error': 'Invalid request'}), 400
    
    game = games[game_id]
    
    # Verify game belongs to current user
    if game.username != username:
        return jsonify({'error': 'Unauthorized'}), 403
    
    stats_data = game.get_stats_data()
    
    # Initialize user stats if not exists
    if username not in user_stats:
        user_stats[username] = []
    
    # Add stats to user's data
    user_stats[username].append(stats_data)
    
    # Update user's overall statistics
    if username in users:
        max_tile = max([max(row) for row in game.board])
        users[username].update_stats(game.score, max_tile)
    
    return jsonify({'success': True, 'stats': stats_data})

@app.route('/api/get_stats', methods=['GET'])
def get_game_stats():
    """Get game statistics for current user"""
    username = session.get('username')
    if not username:
        return jsonify({'error': 'User not logged in'}), 401
    
    # Return user-specific stats
    stats = user_stats.get(username, [])
    
    return jsonify({
        'stats': stats,
        'username': username
    })

@app.route('/api/reset_stats', methods=['POST'])
def reset_game_stats():
    """Reset game statistics for current user"""
    username = session.get('username')
    if not username:
        return jsonify({'error': 'User not logged in'}), 401
    
    # Clear user's stats
    user_stats[username] = []
    
    # Reset user's overall statistics
    if username in users:
        users[username].total_games = 0
        users[username].best_score = 0
        users[username].best_tile = 0
    
    return jsonify({
        'success': True,
        'message': f'Statistics reset for user {username}'
    })

@app.route('/api/save_leaderboard', methods=['POST'])
def save_to_leaderboard():
    """Save a score to the user's leaderboard"""
    data = request.json or {}
    game_id = data.get('gameId')
    
    # Get current user
    username = session.get('username')
    if not username:
        return jsonify({'error': 'User not logged in'}), 401
    
    if not game_id or game_id not in games:
        return jsonify({'error': 'Invalid request'}), 400
    
    game = games[game_id]
    
    # Verify game belongs to current user
    if game.username != username:
        return jsonify({'error': 'Unauthorized'}), 403
    
    leaderboard_entry = {
        'username': username,
        'score': game.score,
        'bestTile': max([max(row) for row in game.board]) if any(any(cell != 0 for cell in row) for row in game.board) else 0,
        'date': time.strftime('%Y-%m-%dT%H:%M:%S.000Z'),
        'moves': game.moves,
        'gridSize': game.size
    }
    
    # Initialize user leaderboard if not exists
    if username not in user_leaderboards:
        user_leaderboards[username] = []
    
    # Add entry to user's leaderboard
    user_leaderboards[username].append(leaderboard_entry)
    
    # Sort by score (highest first) and keep top 20 entries per user
    user_leaderboards[username].sort(key=lambda x: x['score'], reverse=True)
    user_leaderboards[username] = user_leaderboards[username][:20]
    
    return jsonify({
        'success': True,
        'leaderboard_entry': leaderboard_entry
    })

@app.route('/api/get_leaderboard', methods=['GET'])
def get_leaderboard():
    """Get leaderboard for current user or global leaderboard"""
    username = session.get('username')
    user_only = request.args.get('user_only', 'false').lower() == 'true'
    
    if user_only:
        if not username:
            return jsonify({'error': 'User not logged in'}), 401
        
        # Return user-specific leaderboard
        leaderboard = user_leaderboards.get(username, [])
        return jsonify({
            'leaderboard': leaderboard,
            'username': username
        })
    else:
        # Return global leaderboard (all users combined)
        global_leaderboard = []
        for user, entries in user_leaderboards.items():
            global_leaderboard.extend(entries)
        
        # Sort by score (highest first) and limit to top 50
        global_leaderboard.sort(key=lambda x: x['score'], reverse=True)
        global_leaderboard = global_leaderboard[:50]
        
        return jsonify({
            'leaderboard': global_leaderboard
        })

@app.route('/api/reset_leaderboard', methods=['POST'])
def reset_leaderboard():
    """Reset leaderboard for current user"""
    username = session.get('username')
    if not username:
        return jsonify({'error': 'User not logged in'}), 401
    
    # Clear user's leaderboard
    user_leaderboards[username] = []
    
    return jsonify({
        'success': True,
        'message': f'Leaderboard reset for user {username}'
    })

# Cleanup dead games periodically (not implemented in this simple version)
# In a production app, you'd want to remove inactive games to prevent memory leaks

if __name__ == '__main__':
    app.run(debug=True)
