# Fancy2048

[Play Fancy2048](https://marcelolazzari.github.io/Fancy2048/pages/index.html)

Fancy2048 is a modded version of the classic 2048 game with enhanced features and improved user experience. This version includes:

## 🚀 Features

- **Multiple Board Sizes**: Play on 3x3, 4x4, or 5x5 grids
- **Theme Switching**: Toggle between light and dark themes
- **Color Customization**: Adjust the hue of game elements with color cycling
- **Responsive Design**: Optimized for mobile devices and different screen sizes
- **Undo Functionality**: Undo your last move to correct mistakes (up to 20 moves)
- **Smooth Animations**: Enjoy smooth transitions and tile animations
- **Local Storage**: Your best score and theme preferences are saved locally
- **Game Statistics**: View detailed statistics of your game sessions
- **CSV Export**: Export your game statistics to CSV format
- **Pause/Resume**: Pause the game and resume when ready
- **Touch & Keyboard Controls**: Full support for both input methods
- **Accessibility**: ARIA labels, keyboard navigation, and screen reader support
- **Auto-Pause**: Game automatically pauses when you switch tabs

## 🎮 How to Play

1. Use arrow keys (↑↓←→) or WASD keys to move the tiles
2. On mobile, swipe in the direction you want to move
3. When two tiles with the same number touch, they merge into one
4. Try to reach the 2048 tile to win!
5. Use the undo button (↶) to revert your last move if needed

## 🎯 Controls

### Keyboard Controls
- **Arrow Keys / WASD**: Move tiles up, down, left, or right
- **Space**: Pause/Resume game
- **U**: Undo last move
- **R**: Reset game

### Button Controls
- **🎨 Color Button**: Change the hue/color scheme of the game
- **📊 Statistics Button**: View game statistics and leaderboard
- **↶ Undo Button**: Undo the last move (disabled when no moves to undo)
- **⏸️ Pause Button**: Pause/resume the game
- **⊞ Size Button**: Change board size (3x3 ↔ 4x4 ↔ 5x5)
- **🌓 Theme Button**: Toggle between light and dark themes
- **Reset Button**: Start a new game

### Mobile Controls
- **Swipe Gestures**: Swipe up, down, left, or right to move tiles
- **Tap Buttons**: All buttons are touch-optimized with proper sizing

## 🌐 Play Online

You can play Fancy2048 directly in your browser by visiting the following link:

[**🎮 Play Fancy2048 Now**](https://marcelolazzari.github.io/Fancy2048/pages/index.html)

## 💻 Local Installation

### Option 1: Simple HTML Version (Recommended)

1. Clone the repository:
   ```bash
   git clone https://github.com/marcelolazzari/Fancy2048.git
   cd Fancy2048
   ```

2. Open the game in your browser:
   ```bash
   # Simply open pages/index.html in your preferred browser
   open pages/index.html
   ```

### Option 2: Flask Server Version

1. Clone the repository and install dependencies:
   ```bash
   git clone https://github.com/marcelolazzari/Fancy2048.git
   cd Fancy2048
   pip install flask flask-cors
   ```

2. Run the Flask server:
   ```bash
   python app.py
   ```

3. Open your browser and go to:
   ```
   http://localhost:5000
   ```

## 📁 Project Structure

```
Fancy2048/
├── pages/                  # HTML pages
│   ├── index.html         # Main game page
│   └── leaderboard.html   # Statistics and leaderboard page
├── scripts/               # JavaScript files
│   ├── game.js           # Main game logic
│   ├── statistics.js     # Statistics handling
│   ├── leaderboard-stats.js # Leaderboard functionality
│   └── test-links.js     # Development testing utilities
├── styles/               # CSS stylesheets
│   ├── unified_styles.css    # Main game styles
│   ├── mobile_styles.css     # Mobile-optimized styles
│   └── stats_styles.css      # Statistics page styles
├── app.py               # Flask backend (optional)
├── test.html           # Test page to verify functionality
└── README.md           # This file
```

## 🔧 Recently Fixed Issues

### Game Logic Fixes
- ✅ Completed all incomplete method implementations
- ✅ Fixed game initialization without external dependencies
- ✅ Restored proper tile movement and merging logic
- ✅ Fixed undo functionality with proper state management
- ✅ Corrected win/lose condition detection

### UI/UX Improvements
- ✅ Fixed CSS syntax errors and malformed stylesheets
- ✅ Restored responsive design for all screen sizes
- ✅ Fixed tile animations and transitions
- ✅ Corrected button states and interactions
- ✅ Improved accessibility features

### Performance Optimizations
- ✅ Removed duplicate code and method definitions
- ✅ Fixed memory leaks in game state management
- ✅ Optimized animation performance
- ✅ Improved touch event handling

## 🎯 Game Features in Detail

### Scoring System
- Each merge adds the new tile value to your score
- Track your best score across all sessions
- View detailed statistics including moves, time, and best tiles achieved

### Statistics Tracking
- Automatic game session recording
- Export statistics to CSV format
- View game history with sorting and filtering
- Track performance across different board sizes

### Accessibility Features
- Full keyboard navigation support
- ARIA labels for screen readers
- High contrast focus indicators
- Responsive text scaling
- Touch-friendly button sizing (44px minimum)

## 🐛 Troubleshooting

### Game Won't Load
1. Make sure JavaScript is enabled in your browser
2. Check the browser console for any errors
3. Try refreshing the page (Ctrl+F5 or Cmd+R)

### Touch Controls Not Working
1. Ensure you're swiping on the game board area
2. Try increasing the swipe distance
3. Check that touch events aren't being blocked by browser settings

### Statistics Not Saving
1. Check if localStorage is enabled in your browser
2. Make sure you're not in private/incognito mode
3. Clear browser cache and try again

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is open source and available under the MIT License.

## 🙏 Acknowledgments

- Inspired by the original 2048 game by Gabriele Cirulli
- Built with modern web technologies for optimal performance
- Designed with accessibility and mobile-first principles
