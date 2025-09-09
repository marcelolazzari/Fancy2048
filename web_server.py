#!/usr/bin/env python3
"""
Fancy2048 Web API Server
Flask-based web server that exposes the Python game logic via REST API
"""

from flask import Flask, request, jsonify, render_template, send_from_directory
from flask_cors import CORS
import json
import os
from typing import Dict, Any, Optional

# Import our game logic
from app import Fancy2048App, Direction, GameDifficulty, GameState
import traceback

# Initialize Flask app
app = Flask(__name__, 
            static_folder='src',
            template_folder='pages')
CORS(app)  # Enable CORS for web frontend

# Global game instances (in production, use proper session management)
game_sessions: Dict[str, Fancy2048App] = {}

def get_or_create_game_session(session_id: str = "default") -> Fancy2048App:
    """Get or create a game session"""
    if session_id not in game_sessions:
        game_sessions[session_id] = Fancy2048App()
    return game_sessions[session_id]

@app.route('/')
def index():
    """Serve the main index page"""
    return send_from_directory('.', 'index.html')

@app.route('/pages/')
@app.route('/pages/index.html')
def game_page():
    """Serve the game page"""
    return send_from_directory('pages', 'index.html')

@app.route('/pages/stats.html')
def stats_page():
    """Serve the stats page"""
    return send_from_directory('pages', 'stats.html')

@app.route('/src/<path:filename>')
def serve_static(filename):
    """Serve static files"""
    return send_from_directory('src', filename)

@app.route('/manifest.json')
def manifest():
    """Serve PWA manifest"""
    return send_from_directory('.', 'manifest.json')

@app.route('/service-worker.js')
def service_worker():
    """Serve service worker"""
    return send_from_directory('.', 'service-worker.js')

# API Routes

@app.route('/api/game/state', methods=['GET'])
def get_game_state():
    """Get current game state"""
    try:
        session_id = request.args.get('session_id', 'default')
        game = get_or_create_game_session(session_id)
        
        state = game.get_game_stats()
        return jsonify({
            'success': True,
            'data': state
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 500

@app.route('/api/game/move', methods=['POST'])
def make_move():
    """Make a move in the game"""
    try:
        data = request.get_json()
        session_id = data.get('session_id', 'default')
        direction_str = data.get('direction')
        
        if not direction_str:
            return jsonify({
                'success': False,
                'error': 'Direction is required'
            }), 400
        
        # Convert direction string to enum
        direction_map = {
            'up': Direction.UP,
            'down': Direction.DOWN,
            'left': Direction.LEFT,
            'right': Direction.RIGHT
        }
        
        if direction_str not in direction_map:
            return jsonify({
                'success': False,
                'error': f'Invalid direction: {direction_str}'
            }), 400
        
        direction = direction_map[direction_str]
        game = get_or_create_game_session(session_id)
        
        success = game.move(direction)
        state = game.get_game_stats()
        
        return jsonify({
            'success': True,
            'data': {
                'move_success': success,
                'game_state': state
            }
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 500

@app.route('/api/game/new', methods=['POST'])
def new_game():
    """Start a new game"""
    try:
        data = request.get_json() or {}
        session_id = data.get('session_id', 'default')
        board_size = data.get('board_size', 4)
        
        # Create new game session
        game_sessions[session_id] = Fancy2048App(size=board_size)
        game = game_sessions[session_id]
        
        state = game.get_game_stats()
        
        return jsonify({
            'success': True,
            'data': state
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 500

@app.route('/api/game/undo', methods=['POST'])
def undo_move():
    """Undo last move"""
    try:
        data = request.get_json() or {}
        session_id = data.get('session_id', 'default')
        
        game = get_or_create_game_session(session_id)
        success = game.undo()
        state = game.get_game_stats()
        
        return jsonify({
            'success': True,
            'data': {
                'undo_success': success,
                'game_state': state
            }
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 500

@app.route('/api/ai/hint', methods=['POST'])
def get_ai_hint():
    """Get AI hint for next move"""
    try:
        data = request.get_json() or {}
        session_id = data.get('session_id', 'default')
        
        game = get_or_create_game_session(session_id)
        hint = game.get_ai_hint()
        
        return jsonify({
            'success': True,
            'data': {
                'hint': hint.value if hint else None,
                'available': hint is not None
            }
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 500

@app.route('/api/ai/auto-play', methods=['POST'])
def toggle_auto_play():
    """Toggle auto-play mode"""
    try:
        data = request.get_json() or {}
        session_id = data.get('session_id', 'default')
        action = data.get('action', 'toggle')  # 'start', 'stop', 'toggle'
        
        game = get_or_create_game_session(session_id)
        
        if action == 'start':
            active = game.start_auto_play()
        elif action == 'stop':
            game.stop_auto_play()
            active = False
        else:  # toggle
            active = game.toggle_auto_play()
        
        return jsonify({
            'success': True,
            'data': {
                'auto_play_active': active,
                'game_state': game.get_game_stats()
            }
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 500

@app.route('/api/ai/auto-move', methods=['POST'])
def play_auto_move():
    """Play one auto move"""
    try:
        data = request.get_json() or {}
        session_id = data.get('session_id', 'default')
        
        game = get_or_create_game_session(session_id)
        success = game.play_auto_move()
        state = game.get_game_stats()
        
        return jsonify({
            'success': True,
            'data': {
                'move_success': success,
                'auto_play_active': game.auto_play_active,
                'game_state': state
            }
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 500

@app.route('/api/ai/difficulty', methods=['POST'])
def set_ai_difficulty():
    """Set AI difficulty"""
    try:
        data = request.get_json()
        session_id = data.get('session_id', 'default')
        difficulty_str = data.get('difficulty')
        
        if not difficulty_str:
            return jsonify({
                'success': False,
                'error': 'Difficulty is required'
            }), 400
        
        # Convert difficulty string to enum
        difficulty_map = {
            'easy': GameDifficulty.EASY,
            'medium': GameDifficulty.MEDIUM,
            'hard': GameDifficulty.HARD,
            'expert': GameDifficulty.EXPERT
        }
        
        if difficulty_str not in difficulty_map:
            return jsonify({
                'success': False,
                'error': f'Invalid difficulty: {difficulty_str}'
            }), 400
        
        difficulty = difficulty_map[difficulty_str]
        game = get_or_create_game_session(session_id)
        
        if game.ai_solver:
            game.ai_solver.set_difficulty(difficulty)
        
        return jsonify({
            'success': True,
            'data': {
                'difficulty': difficulty_str,
                'ai_stats': game.ai_solver.get_stats() if game.ai_solver else {}
            }
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 500

@app.route('/api/game/board-size', methods=['POST'])
def set_board_size():
    """Change board size"""
    try:
        data = request.get_json()
        session_id = data.get('session_id', 'default')
        size = data.get('size', 4)
        
        if not isinstance(size, int) or size < 3 or size > 8:
            return jsonify({
                'success': False,
                'error': 'Board size must be between 3 and 8'
            }), 400
        
        # Create new game with specified size
        game_sessions[session_id] = Fancy2048App(size=size)
        game = game_sessions[session_id]
        
        state = game.get_game_stats()
        
        return jsonify({
            'success': True,
            'data': state
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """API health check"""
    return jsonify({
        'success': True,
        'data': {
            'status': 'healthy',
            'active_sessions': len(game_sessions),
            'version': '1.0.0'
        }
    })

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({
        'success': False,
        'error': 'Resource not found'
    }), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        'success': False,
        'error': 'Internal server error'
    }), 500

if __name__ == '__main__':
    # Development server
    print("🚀 Starting Fancy2048 Web Server...")
    print("📱 Game available at: http://localhost:5000")
    print("🔗 API docs: http://localhost:5000/api/health")
    
    app.run(
        debug=True,
        host='0.0.0.0',
        port=5000,
        threaded=True
    )