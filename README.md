# Fancy 2048 🎮

A modern, polished Progressive Web App (PWA) implementation of the classic 2048 puzzle game. Built with vanilla JavaScript, featuring advanced AI solving capabilities, responsive design, touch controls, and comprehensive accessibility support.

## 🚀 Features

### Core Game Features
- **Classic 2048 Gameplay** - Slide numbered tiles to combine them and reach 2048
- **Multiple Board Sizes** - Play on 3x3, 4x4, 5x5, or 6x6 grids
- **Undo System** - Unlimited undo functionality with move history
- **Auto-Save** - Automatic game state persistence using localStorage
- **Responsive Design** - Optimized for desktop, tablet, and mobile devices

### Advanced AI System
- **Expectimax Algorithm** - Intelligent AI solver with probabilistic decision making
- **Multiple Difficulty Levels** - Easy, Medium, Hard, and Expert AI modes
- **Heuristic Evaluation** - Advanced board scoring with multiple strategies
- **Performance Optimized** - Efficient caching and pruning algorithms

### Modern Web Technologies
- **Progressive Web App** - Installable, works offline, native app experience
- **Service Worker** - Advanced caching strategies and background sync
- **Touch Controls** - Swipe gestures with haptic feedback support
- **Keyboard Navigation** - Full accessibility with arrow keys and shortcuts
- **Theme System** - Dark and light themes with system preference detection

### User Experience
- **Smooth Animations** - CSS transitions and transform animations
- **Statistics Tracking** - Comprehensive game analytics and performance metrics
- **Achievement System** - Progress tracking and milestone celebrations
- **Accessibility** - WCAG compliant with screen reader support
- **SEO Optimized** - Meta tags, structured data, and sitemap

## 📱 Installation

### Play Online
Visit the live version at your deployed URL and click "Install" when prompted by your browser.

### Local Development
```bash
# Clone the repository
git clone https://github.com/yourusername/fancy2048.git
cd fancy2048

# Serve locally (Python 3)
python -m http.server 8000

# Or with Node.js
npx http-server -p 8000

# Open in browser
open http://localhost:8000
```

## 🎯 How to Play

1. **Objective**: Combine tiles with the same numbers to reach the 2048 tile
2. **Controls**: 
   - **Desktop**: Use arrow keys (↑↓←→) or WASD
   - **Mobile**: Swipe in any direction
   - **Mouse**: Click and drag to swipe
3. **Gameplay**: When two tiles with the same number touch, they merge into one
4. **Winning**: Reach the 2048 tile to win (you can continue playing after)
5. **Losing**: Game ends when no moves are possible

### Keyboard Shortcuts
- `R` - Restart game
- `U` - Undo last move
- `Space` - Pause/Resume
- `H` - Show/Hide help
- `T` - Toggle theme
- `A` - Toggle AI assistant
- `S` - Open statistics
- `Escape` - Close overlays

## 🤖 AI Assistant

The built-in AI uses the Expectimax algorithm to suggest optimal moves:

- **Easy Mode**: 3-depth search, basic heuristics
- **Medium Mode**: 4-depth search, improved evaluation
- **Hard Mode**: 5-depth search, advanced strategies
- **Expert Mode**: 6-depth search, maximum optimization

### AI Features
- Real-time move suggestions
- Probability-based decision making
- Multiple evaluation heuristics:
  - Empty tiles optimization
  - Monotonicity preservation
  - Smoothness calculation
  - Maximum tile positioning

## 🏗️ Architecture

### Project Structure
```
fancy2048/
├── index.html              # Main game page
├── stats.html             # Statistics page
├── manifest.json          # PWA manifest
├── service-worker.js      # Service worker for caching
├── src/
│   ├── css/
│   │   ├── main.css       # Main styles with CSS variables
│   │   └── stats.css      # Statistics page styles
│   ├── js/
│   │   ├── app.js         # Main application controller
│   │   ├── utils.js       # Utility functions
│   │   ├── storage.js     # localStorage management
│   │   ├── game-engine.js # Core game logic
│   │   ├── ai-solver.js   # Expectimax AI algorithm
│   │   ├── touch-handler.js # Gesture recognition
│   │   ├── ui-controller.js # UI management
│   │   └── stats.js       # Statistics functionality
│   └── assets/
│       ├── icon-192.svg   # PWA icon (192x192)
│       ├── icon-512.svg   # PWA icon (512x512)
│       └── favicon.svg    # Favicon
└── README.md
```

### Key Components

#### GameEngine (`game-engine.js`)
- Core 2048 game logic and state management
- Move validation and tile merging algorithms
- Score calculation and win/lose detection
- Undo system with move history

#### AISolver (`ai-solver.js`)
- Expectimax algorithm implementation
- Multiple difficulty levels with configurable depth
- Heuristic evaluation functions
- Performance optimization with caching

#### UIController (`ui-controller.js`)
- DOM manipulation and rendering
- Theme management (dark/light modes)
- Overlay and modal handling
- Keyboard shortcut management

#### TouchHandler (`touch-handler.js`)
- Advanced gesture recognition
- Haptic feedback support
- Visual swipe indicators
- Desktop mouse support

#### StorageManager (`storage.js`)
- Game state persistence
- Statistics tracking
- Settings management
- Data export/import functionality

## 🎨 Customization

### Themes
The app supports custom themes through CSS variables:

```css
:root {
  --primary-color: #ffcc00;
  --background-color: #1a1a1a;
  --text-color: #ffffff;
  --tile-background: #2d2d2d;
  /* ... more variables */
}
```

### Board Sizes
Easily modify supported board sizes in `game-engine.js`:

```javascript
const BOARD_SIZES = {
  small: { size: 3, target: 512 },
  medium: { size: 4, target: 2048 },
  large: { size: 5, target: 4096 },
  xl: { size: 6, target: 8192 }
};
```

### AI Difficulty
Customize AI behavior in `ai-solver.js`:

```javascript
const DIFFICULTY_CONFIGS = {
  easy: { depth: 3, heuristics: ['empty', 'monotonic'] },
  medium: { depth: 4, heuristics: ['empty', 'monotonic', 'smooth'] },
  // ... more configurations
};
```

## 🔧 Development

### Code Quality
- **ES6+ JavaScript** - Modern syntax with classes and modules
- **CSS Custom Properties** - Consistent theming system
- **Semantic HTML** - Accessible markup structure
- **Progressive Enhancement** - Works without JavaScript for basic functionality

### Performance Optimizations
- **Efficient Algorithms** - Optimized game logic and AI calculations
- **Lazy Loading** - Components loaded on demand
- **Service Worker Caching** - Intelligent resource caching strategies
- **Memory Management** - Proper cleanup and garbage collection

### Browser Support
- Chrome/Edge 80+ (recommended)
- Firefox 75+
- Safari 13+
- Mobile browsers with touch support

## 📊 Statistics

The app tracks comprehensive statistics:

### Game Metrics
- Total games played
- Win/loss ratio
- Best score achieved
- Average score
- Total playtime
- Current streak

### Performance Analytics
- Moves per game
- Time per game
- Efficiency rating
- AI usage statistics

### Board Size Analytics
- Performance per board size
- Preferred difficulty settings
- Achievement progress

## 🏆 Achievements

Unlock achievements by reaching milestones:
- First 2048 tile
- Reach 4096, 8192, 16384
- Win without undo
- Speed victories
- Consistency streaks

## 🔒 Privacy & Security

- **No Data Collection** - All data stored locally
- **No External APIs** - Completely self-contained
- **Offline Capable** - Works without internet connection
- **No Tracking** - Respects user privacy

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

### Development Setup
```bash
# Install dependencies for development tools (optional)
npm install -g http-server

# Run local server
http-server -p 8000

# Open development tools
# Browser Developer Console for debugging
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by the original 2048 game by Gabriele Cirulli
- Built with modern web standards and best practices
- Thanks to the open-source community for tools and inspiration

## 📞 Support

If you encounter any issues or have questions:
1. Check the browser console for error messages
2. Verify localStorage is enabled in your browser
3. Try clearing the app cache and refreshing
4. Open an issue on GitHub with details

---

**Fancy 2048** - Where classic gameplay meets modern technology! 🎮✨
