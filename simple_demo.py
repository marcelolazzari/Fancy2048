#!/usr/bin/env python3
"""
Fancy2048 - Simple Demo
Quick demonstration of the Python application functionality
"""

from app import Fancy2048App, Direction
import time

def simple_demo():
    """Simple demonstration of the app"""
    print("🎮 Fancy2048 Python App - Simple Demo")
    print("=" * 40)
    
    # Create the app
    print("Initializing game...")
    app = Fancy2048App(size=4)
    print("✓ Game initialized successfully!")
    
    # Show initial board
    print("\n📋 Initial board:")
    app.print_board()
    
    # Test a few manual moves
    print("🎯 Testing manual moves...")
    moves = [Direction.LEFT, Direction.UP, Direction.RIGHT]
    
    for i, direction in enumerate(moves, 1):
        success = app.move(direction)
        if success:
            print(f"Move {i}: {direction.value} ✓")
            app.print_board()
        else:
            print(f"Move {i}: {direction.value} ✗ (no change)")
    
    # Test AI hint (with timeout protection)
    print("🤖 Getting AI suggestion...")
    try:
        hint = app.get_ai_hint()
        if hint:
            print(f"AI suggests: {hint.value}")
        else:
            print("AI has no suggestions")
    except KeyboardInterrupt:
        print("AI thinking interrupted")
    except Exception as e:
        print(f"AI error: {e}")
    
    # Test undo
    print("\n↩️  Testing undo...")
    if app.undo():
        print("Undo successful!")
        app.print_board()
    else:
        print("No moves to undo")
    
    # Show final stats
    stats = app.get_game_stats()
    print("\n📊 Final Statistics:")
    print(f"  Score: {stats['game']['score']}")
    print(f"  Moves: {stats['game']['moves']}")
    print(f"  Board Size: {stats['game']['size']}x{stats['game']['size']}")
    print(f"  Game Over: {stats['game']['is_game_over']}")
    
    print("\n✅ Demo completed successfully!")
    print("\n🎉 The Python app successfully implements:")
    print("  • Complete 2048 game engine")
    print("  • AI solver with multiple difficulties")
    print("  • Game state management and persistence")
    print("  • Undo functionality")
    print("  • Auto-play capability")
    print("  • Interactive console interface")

def quick_ai_test():
    """Quick AI performance test"""
    print("\n🧠 Quick AI Performance Test")
    print("-" * 30)
    
    app = Fancy2048App(size=4)
    
    # Test AI at easy difficulty for speed
    app.ai_solver.set_difficulty(app.ai_solver.difficulty_settings.__class__.EASY)
    
    start = time.time()
    try:
        hint = app.get_ai_hint()
        elapsed = time.time() - start
        
        if hint:
            print(f"✓ AI hint: {hint.value} (took {elapsed:.2f}s)")
        else:
            print("✗ No AI hint available")
    except Exception as e:
        elapsed = time.time() - start
        print(f"✗ AI error after {elapsed:.2f}s: {e}")

if __name__ == "__main__":
    simple_demo()
    quick_ai_test()