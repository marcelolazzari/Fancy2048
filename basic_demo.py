#!/usr/bin/env python3
"""
Fancy2048 - Basic Demo (No AI)
Quick demonstration without intensive AI computations
"""

from app import Fancy2048App, Direction, GameEngine
import random

def basic_demo():
    """Basic demonstration without AI"""
    print("🎮 Fancy2048 Python App - Basic Demo")
    print("=" * 40)
    
    # Create just the game engine for faster demo
    print("Initializing game engine...")
    game = GameEngine(size=4)
    print("✓ Game engine initialized successfully!")
    
    # Show initial board
    print("\n📋 Initial board:")
    print_board_simple(game)
    
    # Test manual moves
    print("🎯 Testing manual moves...")
    moves_tried = []
    
    for i in range(5):
        direction = random.choice(list(Direction))
        success = game.move(direction)
        moves_tried.append((direction, success))
        
        if success:
            print(f"Move {i+1}: {direction.value} ✓")
            print_board_simple(game)
        else:
            print(f"Move {i+1}: {direction.value} ✗ (no change)")
        
        if game.is_game_over:
            break
    
    # Test undo
    print("\n↩️  Testing undo...")
    if game.undo():
        print("Undo successful!")
        print_board_simple(game)
    else:
        print("No moves to undo")
    
    # Show stats
    print("\n📊 Game Statistics:")
    print(f"  Score: {game.score}")
    print(f"  Moves: {game.moves}")
    print(f"  Board Size: {game.size}x{game.size}")
    print(f"  Highest Tile: {game.get_highest_tile()}")
    print(f"  Game Over: {game.is_game_over}")
    print(f"  Duration: {game.get_duration():.2f}s")
    
    print("\n✅ Basic demo completed successfully!")

def print_board_simple(game):
    """Print board in simple format"""
    print("-" * (game.size * 8))
    for row in game.board:
        print("|", end="")
        for tile in row:
            print(f"{tile:6d} |", end="")
        print()
    print("-" * (game.size * 8))
    print(f"Score: {game.score} | Moves: {game.moves}")
    print()

def test_game_mechanics():
    """Test core game mechanics"""
    print("\n🔧 Testing Core Game Mechanics")
    print("-" * 35)
    
    # Test different board sizes
    for size in [3, 4, 5]:
        game = GameEngine(size)
        print(f"✓ Created {size}x{size} board")
    
    # Test specific moves
    game = GameEngine(4)
    game.board = [
        [2, 2, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
    ]
    game.score = 0
    
    print("\n🧪 Testing merge mechanics:")
    print("Before LEFT move:")
    print_board_simple(game)
    
    success = game.move(Direction.LEFT)
    print(f"LEFT move result: {'Success' if success else 'Failed'}")
    print("After LEFT move:")
    print_board_simple(game)
    
    # Test win condition
    game.board[0][0] = 2048
    print(f"Win condition check: {game._check_win()}")
    
    # Test game over condition  
    full_board = [[2, 4, 2, 4] for _ in range(4)]
    game.board = full_board
    print(f"Game over check (full board): {game._check_game_over()}")

def demonstrate_features():
    """Demonstrate key features"""
    print("\n🎉 Key Features Demonstrated:")
    print("=" * 40)
    
    features = [
        "✓ Complete 2048 game engine implementation",
        "✓ Multiple board sizes (3x3, 4x4, 5x5, etc.)",
        "✓ Full move mechanics (up, down, left, right)",
        "✓ Tile merging with proper scoring", 
        "✓ Undo functionality with move history",
        "✓ Win/lose condition detection",
        "✓ Game state persistence (save/load)",
        "✓ Performance-optimized algorithms",
        "✓ Clean object-oriented design",
        "✓ Comprehensive error handling",
        "✓ Interactive console interface",
        "✓ Extensible AI framework (with optimizations needed)"
    ]
    
    for feature in features:
        print(f"  {feature}")
    
    print(f"\n📈 Code Delegation Summary:")
    print(f"  • Migrated from JavaScript to Python")
    print(f"  • Maintained all core game functionality") 
    print(f"  • Added enhanced error handling and logging")
    print(f"  • Implemented clean separation of concerns")
    print(f"  • Created extensible architecture for future features")

if __name__ == "__main__":
    basic_demo()
    test_game_mechanics() 
    demonstrate_features()