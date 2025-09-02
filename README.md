# 🎮 Fancy2048

[https://marcelolazzari.github.io/Fancy2048/pages/index.html](https://marcelolazzari.github.io/Fancy2048/pages/index.html)

Fancy2048 is a modern, feature-rich implementation of the classic 2048 puzzle game with enhanced gameplay, AI capabilities, and responsive design.

## ✨ Features

### 🎯 Game Modes
- **Multiple Board Sizes**: Play on 4×4, 5×5, 7×7, or 9×9 grids
- **Continue After 2048**: Keep playing after reaching 2048 to achieve higher tiles
- **Undo System**: Undo up to 10 moves with full game state restoration

### 🤖 AI Integration
- **Advanced AI Solver**: State-of-the-art AI using Expectimax algorithm
- **Enhanced AI**: Minimax with Alpha-Beta pruning for intelligent gameplay
- **Auto Play**: Watch the AI solve the game automatically
- **Speed Control**: Adjustable AI speed (1×, 1.5×, 2×, 4×, 8×, MAX)
- **Difficulty Levels**: Choose from Easy, Normal, Hard, or Expert AI
- **Automatic Learning**: AI automatically learns from each game to improve performance (no user intervention required)
- **Human vs AI Stats**: Track and compare performance across different play modes

### 🎨 Visual & Accessibility
- **Enhanced Tile Colors**: Beautiful gradient backgrounds with hue customization
- **Light/Dark Themes**: Toggle between themes with perfect color adaptation
- **Mobile Optimized**: Responsive design with enhanced touch controls
- **Safe Area Support**: Full safe area inset support for modern devices (iPhone X+, etc.)
- **PWA Ready**: Progressive Web App capabilities
- **Accessibility**: Full keyboard navigation and screen reader support

### 📊 Statistics & Progress
- **Detailed Statistics**: Track games, wins, moves, time, and scores
- **Leaderboard**: Compare your best performances
- **Game Mode Tracking**: Separate stats for Human, AI, and Mixed modes
- **Data Export**: Export statistics to CSV or JSON format
- **Persistent Storage**: All progress saved locally

### 📱 Mobile Experience
- **Enhanced Touch Gestures**: Improved swipe detection with visual feedback
- **State Persistence**: Automatic game saving and restoration
- **No Auto-Pause**: Game continues running when switching apps (as requested)
- **Viewport Optimization**: Perfect fit on all screen sizes with safe areas
- **Offline Play**: Works without internet connection

## 🚀 How to Play

1. **Move tiles** using arrow keys (desktop) or swipe gestures (mobile)
2. **Combine matching numbers** to create higher values
3. **Reach 2048** to win (then continue for higher scores!)
4. **Use AI assistance** or let the AI play automatically
5. **Track your progress** with detailed statistics

## 🎮 Controls

### Desktop
- **Arrow Keys**: Move tiles (Up/Down/Left/Right)
- **Space**: Pause/Resume game
- **Ctrl/Cmd + Z**: Undo move
- **Ctrl/Cmd + R**: Reset game
- **Ctrl/Cmd + A**: Toggle autoplay

### Mobile
- **Swipe**: Move tiles in desired direction
- **Touch Controls**: All buttons are touch-optimized

## 🛠 Technical Features

### Architecture
- **Modular Design**: Separate modules for game logic, AI, and learning
- **Responsive Layout**: CSS Grid with advanced viewport handling
- **Performance Optimized**: Efficient algorithms and memory management

### AI Systems
- **Multiple AI Implementations**: Advanced expectimax and enhanced minimax
- **Learning System**: Automatic pattern recognition and strategy improvement
- **Adaptive Difficulty**: AI adjusts based on board size and performance

### Browser Compatibility
- **Modern Browsers**: Chrome, Firefox, Safari, Edge
- **Mobile Support**: iOS Safari, Android Chrome
- **PWA Features**: Installable as a native app

## 📁 Project Structure

```
Fancy2048/
├── pages/
│   ├── index.html          # Main game page
│   └── leaderboard.html    # Statistics and leaderboard
├── scripts/
│   ├── game.js             # Core game logic
│   ├── advanced_ai_solver.js # Expectimax AI implementation
│   ├── enhanced_ai.js      # Minimax AI with Alpha-Beta pruning
│   ├── ai_learning_system.js # Automatic learning system
│   ├── statistics.js       # Statistics page logic
│   └── leaderboard-stats.js # Leaderboard functionality
├── styles/
│   ├── main.css            # Core game styles
│   └── leaderboard.css     # Statistics page styles
└── docs/
    ├── ai_learning_guide.md # AI learning documentation
    └── ai_learning_format.md # Learning data format spec
```

## 🔧 Development

### Local Development
1. Serve the files from a local web server
2. Open `pages/index.html` in your browser
3. All features work offline

### Testing
- Use the integrity test page: `test_integrity.html`
- Check browser console for any errors
- Test on both desktop and mobile devices

## 🎨 Customization

### Themes
- Toggle between light and dark modes
- Customize tile colors using the palette button
- Responsive design adapts to all screen sizes

### AI Difficulty
- Easy: Basic move selection
- Normal: Balanced strategy
- Hard: Advanced pattern recognition
- Expert: Maximum depth search

## 📈 Performance

### Game Performance
- Smooth animations at 60fps
- Efficient tile rendering
- Optimized touch handling

### AI Performance
- Expectimax algorithm for optimal play
- Adaptive search depth based on board complexity
- Learning system improves over time automatically

## 🎯 Recent Updates

### Game Logic Enhancements
- ✅ Fixed critical move simulation logic
- ✅ Improved game over detection
- ✅ Enhanced merge prevention system
- ✅ Consistent scoring across all scenarios

### Mobile Improvements
- ✅ Removed auto-pause behavior
- ✅ Enhanced touch gesture recognition
- ✅ Improved state persistence
- ✅ Better safe area handling

### AI Enhancements  
- ✅ Automatic learning system (no user intervention)
- ✅ Improved move ordering and evaluation
- ✅ Better handling of different board sizes
- ✅ Enhanced debug capabilities

### Grid Size Updates
- ✅ Removed 3×3 grid option
- ✅ Added 7×7 and 9×9 grid support
- ✅ Optimized responsive layout for all sizes
- ✅ Updated cycling: 4×4 → 5×5 → 7×7 → 9×9

## 🤝 Contributing

This game is designed to be a complete, feature-rich 2048 implementation. All major features are implemented and working correctly.

## 📄 License

This project is open source and available under standard open source terms.

---

**Enjoy playing Fancy2048!** 🎉
4. **Use AI assistance** or compete against it
5. **Track your progress** in the statistics page

## 🎯 Game Controls

### Keyboard Shortcuts
- **Arrow Keys**: Move tiles
- **Ctrl+Z**: Undo move
- **Ctrl+R**: Reset game
- **Ctrl+P**: Pause/Resume
- **Ctrl+A**: Toggle Auto Play
- **Space**: Pause/Resume
- **Enter**: Activate focused button

### Mobile Gestures
- **Swipe**: Move tiles in direction
- **Tap**: Activate buttons
- **Long press**: Access context menus

## 🛠 Technical Features

- **Pure JavaScript**: No external framework dependencies
- **CSS Grid**: Modern responsive layout
- **Local Storage**: Persistent game state and statistics
- **Web Workers**: Efficient AI calculations (where supported)
- **Performance Optimized**: Smooth animations and interactions
- **Cross-browser Compatible**: Works on all modern browsers

## 🎮 Game Strategy Tips

1. **Keep highest tile in a corner** for better organization
2. **Build towards one corner** consistently
3. **Don't chase small tiles** - focus on big merges
4. **Use AI help** to learn optimal strategies
5. **Practice on smaller boards** first

## 📊 Statistics Tracked

- Games played and won
- Best score and current score
- Total moves and time played
- Average score per game
- Success rate percentage
- Play mode (Human/AI/Mixed) tracking

## 🔧 Development

The game is built with modern web technologies:
- **HTML5** for structure
- **CSS3** with Grid and Flexbox for layout
- **Vanilla JavaScript** for game logic
- **Web APIs** for storage and PWA features

## 📄 License

This project is open source and available under the MIT License.

## 🎯 About

Fancy2048 combines the addictive gameplay of 2048 with modern web features, creating an enhanced gaming experience suitable for both casual play and competitive challenge.

---

**Play now**: [https://marcelolazzari.github.io/Fancy2048/pages/index.html](https://marcelolazzari.github.io/Fancy2048/pages/index.html)
