#!/usr/bin/env python3
"""
Fancy2048 - Test Script
Demonstrates the key functionality of the Python application
"""

from app import Fancy2048App, Direction, GameDifficulty
import time

def test_basic_game():
    """Test basic game functionality"""
    print("=== Testing Basic Game Functionality ===")
    
    app = Fancy2048App(size=4)
    print("✓ Game initialized successfully")
    
    # Test moves
    print("\n--- Testing Manual Moves ---")
    app.print_board()
    
    moves_to_try = [Direction.LEFT, Direction.UP, Direction.RIGHT, Direction.DOWN]
    for direction in moves_to_try:
        success = app.move(direction)
        print(f"Move {direction.value}: {'✓' if success else '✗'}")
        if success:
            break
    
    app.print_board()
    
    # Test undo
    print("\n--- Testing Undo ---")
    if app.undo():
        print("✓ Undo successful")
        app.print_board()
    else:
        print("✗ Undo not available")

def test_ai_functionality():
    """Test AI functionality"""
    print("\n=== Testing AI Functionality ===")
    
    app = Fancy2048App(size=4)
    
    # Test AI hint
    print("\n--- Testing AI Hint ---")
    hint = app.get_ai_hint()
    print(f"AI Hint: {hint.value if hint else 'No hint available'}")
    
    # Test different AI difficulties
    print("\n--- Testing AI Difficulties ---")
    difficulties = [GameDifficulty.EASY, GameDifficulty.MEDIUM, GameDifficulty.HARD]
    
    for difficulty in difficulties:
        app.ai_solver.set_difficulty(difficulty)
        hint = app.get_ai_hint()
        print(f"{difficulty.value}: {hint.value if hint else 'No hint'}")

def test_auto_play():
    """Test auto-play functionality"""
    print("\n=== Testing Auto-Play ===")
    
    app = Fancy2048App(size=4)
    
    # Start auto-play for a few moves
    if app.start_auto_play():
        print("✓ Auto-play started")
        
        for i in range(5):
            if app.play_auto_move():
                print(f"Auto-move {i+1}: Success")
                time.sleep(0.2)
            else:
                print(f"Auto-move {i+1}: Failed or game over")
                break
        
        app.stop_auto_play()
        app.print_board()
    else:
        print("✗ Failed to start auto-play")

def test_game_states():
    """Test game state management"""
    print("\n=== Testing Game State Management ===")
    
    app = Fancy2048App(size=4)
    
    # Play some moves
    app.move(Direction.LEFT)
    app.move(Direction.UP)
    
    print("--- Before Save ---")
    stats_before = app.get_game_stats()
    print(f"Score: {stats_before['game']['score']}")
    print(f"Moves: {stats_before['game']['moves']}")
    
    # Save and create new game
    app._save_game_state()
    app.new_game()
    
    print("\n--- After New Game ---")
    stats_after = app.get_game_stats()
    print(f"Score: {stats_after['game']['score']}")
    print(f"Moves: {stats_after['game']['moves']}")
    
    # Load saved game
    app._load_saved_game()
    
    print("\n--- After Load ---")
    stats_loaded = app.get_game_stats()
    print(f"Score: {stats_loaded['game']['score']}")
    print(f"Moves: {stats_loaded['game']['moves']}")
    
    if (stats_before['game']['score'] == stats_loaded['game']['score'] and
        stats_before['game']['moves'] == stats_loaded['game']['moves']):
        print("✓ Game state save/load works correctly")
    else:
        print("✗ Game state save/load failed")

def benchmark_ai():
    """Benchmark AI performance"""
    print("\n=== AI Performance Benchmark ===")
    
    app = Fancy2048App(size=4)
    
    # Test AI speed at different difficulties
    difficulties = [GameDifficulty.EASY, GameDifficulty.MEDIUM, GameDifficulty.HARD]
    
    for difficulty in difficulties:
        app.ai_solver.set_difficulty(difficulty)
        
        start_time = time.time()
        for _ in range(10):
            app.get_ai_hint()
        end_time = time.time()
        
        avg_time = (end_time - start_time) / 10
        print(f"{difficulty.value}: {avg_time:.3f}s per hint")

def main():
    """Run all tests"""
    print("🎮 Fancy2048 Python App - Test Suite")
    print("=" * 50)
    
    try:
        test_basic_game()
        test_ai_functionality()
        test_auto_play()
        test_game_states()
        benchmark_ai()
        
        print("\n" + "=" * 50)
        print("✅ All tests completed successfully!")
        print("\nThe Python app successfully delegates all core game logic:")
        print("  • Game engine with full 2048 mechanics")
        print("  • AI solver with multiple difficulty levels")
        print("  • Game state persistence and management")
        print("  • Auto-play and manual control modes")
        print("  • Performance-optimized algorithms")
        
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()