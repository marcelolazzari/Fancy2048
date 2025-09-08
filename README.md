# Fancy 2048 🎮

[![Live Demo](https://img.shields.io/badge/🎮_Live_Demo-Play_Now-4CAF50?style=for-the-badge&labelColor=1a1a1a)](https://marcelolazzari.github.io/Fancy2048/pages/index.html)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![PWA Ready](https://img.shields.io/badge/PWA-Ready-orange.svg?style=for-the-badge)](https://web.dev/progressive-web-apps/)
[![Mobile Friendly](https://img.shields.io/badge/Mobile-Friendly-blue.svg?style=for-the-badge)](https://search.google.com/test/mobile-friendly)

> **🌟 Experience the ultimate 2048 puzzle game** - A modern, AI-powered Progressive Web App that transforms the classic sliding puzzle into an immersive, feature-rich gaming experience.

Built with vanilla JavaScript and modern web standards, Fancy 2048 delivers smooth performance, intelligent AI assistance, comprehensive statistics, and an elegant user interface that works seamlessly across all devices.

> **📝 Latest Updates (Sept 2025)**  
> ✅ Fixed initialization errors and storage issues  
> ✅ Improved mobile performance and touch handling  
> ✅ Enhanced PWA capabilities with better offline support  
> ✅ Restructured for optimal GitHub Pages deployment

## ✨ Features Overview

<table>
<tr>
<td width="50%">

### 🎯 **Core Gaming**
- 🎮 **Classic 2048 Mechanics** with enhanced visuals
- 📐 **Multiple Board Sizes** (3×3, 4×4, 5×5, 6×6)
- ⏪ **Unlimited Undo System** with full move history
- 💾 **Auto-Save & Persistence** across sessions
- 🎨 **Smooth Animations** and visual feedback
- 📱 **Responsive Design** for any screen size

### 🤖 **AI Intelligence**
- 🧠 **Expectimax Algorithm** for optimal move suggestions
- 🎚️ **4 Difficulty Levels** (Easy → Expert)
- ⚡ **Real-time Hints** and auto-play modes
- 🎯 **Advanced Heuristics** for strategic gameplay
- 📊 **Performance Analytics** for AI usage

</td>
<td width="50%">

### 🌐 **Modern Web Tech**
- 🚀 **Progressive Web App** (installable & offline)
- ⚙️ **Service Worker** with intelligent caching
- 📱 **Touch & Gesture Controls** with haptic feedback
- ⌨️ **Keyboard Navigation** and shortcuts
- 🌙 **Theme System** (Dark/Light + Auto)
- ♿ **Full Accessibility** (WCAG compliant)

### 📈 **Analytics & Tracking**
- 📊 **Comprehensive Statistics** and metrics
- 🏆 **Achievement System** with progress tracking
- 📈 **Performance Analysis** per board size
- 🔄 **Data Export/Import** functionality
- 🎮 **Game History** and session tracking

</td>
</tr>
</table>

## � Quick Start

### 🌐 **Play Online** (Recommended)
**[🎮 Start Playing Now →](https://marcelolazzari.github.io/Fancy2048/pages/index.html)**

The game runs directly in your browser - no downloads needed! For the best experience:
1. **📱 Install as PWA**: Click the "Install" button in your browser
2. **🔄 Enable Offline Mode**: The service worker caches everything automatically
3. **🎯 Bookmark**: Save `https://marcelolazzari.github.io/Fancy2048/pages/index.html` for quick access

### 💻 **Local Development**
```bash
# 1️⃣ Clone the repository
git clone https://github.com/marcelolazzari/Fancy2048.git
cd Fancy2048

# 2️⃣ Start local server (choose one)
# Python 3
python -m http.server 8080

# Node.js
npx http-server -p 8080

# PHP (if available)
php -S localhost:8080

# 3️⃣ Open in browser
open http://localhost:8080/pages/index.html
```

### 📦 **Installation Options**

| Platform | Method | Command/Link |
|----------|--------|--------------|
| **🌐 Web Browser** | Direct Play | [Open Game](https://marcelolazzari.github.io/Fancy2048/pages/index.html) |
| **📱 Mobile PWA** | Add to Home Screen | Visit site → "Install App" |
| **💻 Desktop PWA** | Install from Browser | Chrome/Edge → ⋮ → "Install Fancy2048" |
| **👨‍💻 Development** | Local Setup | `git clone` + local server |

## � How to Play

### 🎯 **Game Objective**
Slide numbered tiles on a grid to **combine matching numbers** and reach the **2048 tile**! Simple to learn, challenging to master.

### 🕹️ **Controls**

<table>
<tr>
<td width="33%">

**🖥️ Desktop**
- ⬅️⬆️⬇️➡️ **Arrow Keys**
- 🔤 **WASD Keys** 
- 🖱️ **Mouse Drag** to swipe
- ⌨️ **Keyboard Shortcuts** (see below)

</td>
<td width="33%">

**📱 Mobile/Touch**
- 👆 **Swipe Gestures** in any direction
- 📳 **Haptic Feedback** for moves
- ✋ **Pinch to Zoom** (accessibility)
- 🔄 **Portrait/Landscape** support

</td>
<td width="34%">

**♿ Accessibility**
- 🔍 **Screen Reader** compatible
- ⌨️ **Tab Navigation** support
- 🔊 **Audio Cues** available
- 🎨 **High Contrast** themes

</td>
</tr>
</table>

### ⌨️ **Keyboard Shortcuts**
| Key | Action | Key | Action |
|-----|--------|-----|--------|
| `R` | 🔄 Restart game | `Space` | ⏸️ Pause/Resume |
| `U` | ⏪ Undo last move | `H` | ❓ Show/Hide help |
| `T` | 🌙 Toggle theme | `A` | 🤖 Toggle AI assistant |
| `S` | 📊 Open statistics | `Escape` | ❌ Close overlays |
| `1-4` | 📐 Change board size | `?` | 🆘 Show shortcuts |

### 🎲 **Gameplay Rules**
1. **🔢 Combining**: When two tiles with the same number touch, they merge into one
2. **🎯 Winning**: Reach the **2048 tile** to win (but you can keep playing!)
3. **💔 Game Over**: When no more moves are possible on a full board
4. **⭐ Scoring**: Each merge adds the combined tile value to your score

## 🤖 AI Assistant & Solver

### 🧠 **Expectimax Algorithm**
Our AI uses advanced **Expectimax decision-making** with probabilistic evaluation to suggest optimal moves and even play automatically.

<details>
<summary>🎚️ <strong>Difficulty Levels</strong> (Click to expand)</summary>

| Level | Search Depth | Features | Best For |
|-------|--------------|----------|----------|
| 🟢 **Easy** | 3 levels | Basic heuristics, fast suggestions | 🎓 Learning the game |
| 🟡 **Medium** | 4 levels | Balanced strategy + speed | 🎮 Casual play |
| 🟠 **Hard** | 5 levels | Advanced strategies | 🏆 Competitive play |
| 🔴 **Expert** | 6 levels | Maximum optimization | 🤖 AI showcase |

</details>

### 🎯 **AI Features**

**🔮 Smart Assistance**
- 💡 **Real-time Hints**: Get the best next move suggestion
- 🤖 **Auto-Play Mode**: Watch the AI play (great for learning!)
- 📊 **Move Analysis**: See why the AI recommends specific moves
- ⚡ **Performance Metrics**: Track AI usage and effectiveness

**🧮 Advanced Heuristics**
- 🏗️ **Monotonicity**: Keeps tiles in ascending/descending order
- 🔄 **Smoothness**: Minimizes difference between adjacent tiles  
- 🕳️ **Empty Tiles**: Maximizes available space for new tiles
- 👑 **Corner Strategy**: Positions highest tile optimally

### 🎮 **Using the AI**
1. **💡 Get Hints**: Click the "Get Hint" button for move suggestions
2. **🤖 Auto Mode**: Toggle "Auto Play" to watch the AI solve
3. **📈 Learn**: Observe AI strategies to improve your own gameplay
4. **⚙️ Customize**: Adjust difficulty based on your preference

## 🏗️ Technical Architecture

### 📁 **Project Structure**
```
Fancy2048/
├── 📄 index.html              # Redirect page to /pages/
├── 📁 pages/
│   └── 📄 index.html          # Main game application
├── 📄 stats.html              # Statistics & analytics page
├── ⚙️ manifest.json           # PWA configuration
├── 🔧 service-worker.js       # Offline caching & sync
├── 📁 src/
│   ├── 🎨 css/
│   │   ├── main.css           # Core styles + CSS variables
│   │   └── stats.css          # Statistics page styles
│   ├── 💻 js/
│   │   ├── app.js             # Application controller
│   │   ├── utils.js           # Helper functions
│   │   ├── storage.js         # Data persistence layer
│   │   ├── game-engine.js     # Core 2048 game logic
│   │   ├── ai-solver.js       # Expectimax AI algorithm
│   │   ├── touch-handler.js   # Gesture recognition
│   │   ├── ui-controller.js   # DOM manipulation & UI
│   │   ├── stats.js           # Analytics & statistics
│   │   └── error-handler.js   # Error management
│   └── 🖼️ assets/
│       ├── icon-192.svg       # PWA icon (192×192)
│       ├── icon-512.svg       # PWA icon (512×512)
│       ├── icon-512.png       # Fallback PNG icon
│       └── favicon.svg        # Browser favicon
├── 🤖 robots.txt              # SEO crawler instructions
├── 🗺️ sitemap.xml             # SEO sitemap
└── 📚 README.md               # This documentation
```

### 🔧 **Core Components**

<details>
<summary>🎮 <strong>GameEngine</strong> (<code>game-engine.js</code>)</summary>

**The heart of the 2048 gameplay logic**
- ⚙️ **Game State Management**: Board state, scores, move validation
- 🔄 **Tile Mechanics**: Merging algorithm, movement logic
- 📊 **Score System**: Calculation, best score tracking
- ⏪ **Undo System**: Full move history with unlimited undo
- 🏁 **Win/Loss Detection**: Game completion logic
- 📐 **Multi-size Support**: Dynamic board sizes (3×3 to 6×6)

</details>

<details>
<summary>🤖 <strong>AISolver</strong> (<code>ai-solver.js</code>)</summary>

**Advanced AI with Expectimax algorithm**
- 🧠 **Expectimax Implementation**: Probabilistic decision trees
- 🎚️ **Difficulty Scaling**: 4 levels with configurable depth
- 📊 **Heuristic Evaluation**: Multiple scoring strategies
- ⚡ **Performance Optimization**: Caching, pruning, memoization
- 💡 **Move Suggestions**: Real-time optimal move calculation
- 📈 **Analytics Integration**: AI usage tracking

</details>

<details>
<summary>🎨 <strong>UIController</strong> (<code>ui-controller.js</code>)</summary>

**User interface and visual management**
- 🖼️ **DOM Rendering**: Dynamic tile generation and updates
- 🌙 **Theme System**: Dark/light modes with auto-detection
- 🎭 **Overlay Management**: Modals, dialogs, game-over screens
- ⌨️ **Input Handling**: Keyboard shortcuts and accessibility
- ✨ **Animations**: Smooth transitions and visual feedback
- 📱 **Responsive Design**: Mobile-first adaptive layout

</details>

<details>
<summary>👆 <strong>TouchHandler</strong> (<code>touch-handler.js</code>)</summary>

**Advanced gesture recognition system**
- 📱 **Multi-touch Support**: Swipe detection across devices
- 📳 **Haptic Feedback**: Tactile response for moves
- 🎯 **Gesture Recognition**: Direction detection with thresholds
- 🖱️ **Mouse Support**: Desktop drag-to-swipe functionality
- 🔄 **Event Management**: Touch, mouse, and pointer events
- ⚡ **Performance**: Debounced and optimized event handling

</details>

<details>
<summary>💾 <strong>StorageManager</strong> (<code>storage.js</code>)</summary>

**Data persistence and analytics**
- 🗄️ **Game State Persistence**: Auto-save with localStorage
- 📊 **Statistics Tracking**: Comprehensive game analytics
- ⚙️ **Settings Management**: User preferences and configuration
- 📤 **Data Export/Import**: JSON-based backup system
- 🔒 **Data Validation**: Schema validation and error handling
- 🧹 **Cleanup**: Automated old data removal

</details>

## 🎨 Customization & Configuration

### 🌈 **Theming System**
Fancy 2048 uses CSS custom properties for easy theming:

```css
:root {
  /* 🎨 Primary Colors */
  --primary-color: #ffcc00;          /* Accent color */
  --primary-hover: #e6b800;         /* Hover states */
  
  /* 🌙 Background System */
  --bg-primary: #1a1a1a;            /* Main background */
  --bg-secondary: #2d2d2d;          /* Cards/tiles */
  --bg-overlay: rgba(0,0,0,0.8);    /* Modals */
  
  /* 📝 Typography */
  --text-primary: #ffffff;          /* Main text */
  --text-secondary: #cccccc;        /* Secondary text */
  --text-muted: #888888;            /* Subtle text */
  
  /* 🎯 Game Elements */
  --tile-bg: #3a3a3a;              /* Empty tiles */
  --tile-text: #ffffff;            /* Tile numbers */
  --board-bg: #2d2d2d;             /* Game board */
}
```

### 📐 **Board Configuration**
Easily customize board sizes and win conditions:

```javascript
// In game-engine.js
const BOARD_CONFIG = {
  sizes: {
    small:  { size: 3, winTile: 512,   name: "Compact" },
    normal: { size: 4, winTile: 2048,  name: "Classic" },
    large:  { size: 5, winTile: 4096,  name: "Extended" },
    xl:     { size: 6, winTile: 8192,  name: "Challenge" }
  },
  // Add custom sizes
  custom: { size: 7, winTile: 16384, name: "Expert" }
};
```

### 🤖 **AI Tuning**
Configure AI behavior and difficulty:

```javascript
// In ai-solver.js
const AI_PROFILES = {
  beginner: { 
    depth: 2, 
    heuristics: ['emptyTiles'], 
    speed: 'fast' 
  },
  casual: { 
    depth: 4, 
    heuristics: ['emptyTiles', 'monotonicity'], 
    speed: 'medium' 
  },
  competitive: { 
    depth: 6, 
    heuristics: ['emptyTiles', 'monotonicity', 'smoothness'], 
    speed: 'thorough' 
  }
};
```

## 🔧 Development & Technical Details

### 💻 **Technology Stack**
| Layer | Technology | Features |
|-------|-----------|----------|
| **🎨 Frontend** | Vanilla JavaScript (ES6+) | Classes, modules, async/await |
| **🎭 Styling** | CSS3 + Custom Properties | Grid, Flexbox, animations |
| **📱 PWA** | Service Worker + Web Manifest | Offline, installable |
| **🗄️ Storage** | localStorage + IndexedDB | Persistence, backup |
| **♿ A11y** | ARIA + Semantic HTML | Screen readers, keyboard nav |

### ⚡ **Performance Optimizations**

**🚀 Core Performance**
- **Algorithm Efficiency**: Optimized 2048 logic with O(n²) complexity
- **AI Optimization**: Memoization, alpha-beta pruning, depth limiting
- **Memory Management**: Proper cleanup, garbage collection friendly
- **Event Debouncing**: Throttled input handling for smooth UX

**📦 Asset Optimization**
- **Service Worker**: Intelligent caching with stale-while-revalidate
- **Lazy Loading**: Components loaded on demand
- **CSS Minification**: Production-ready stylesheet optimization
- **Icon Optimization**: SVG icons with PNG fallbacks

**📱 Mobile Performance**
- **Touch Optimization**: Passive event listeners, minimal reflows
- **Viewport Management**: Dynamic scaling, orientation handling
- **Battery Efficiency**: RequestAnimationFrame, CSS transforms

### 🌐 **Browser Compatibility**

| Browser | Version | Status | Notes |
|---------|---------|--------|-------|
| **Chrome** | 80+ | ✅ Fully Supported | Recommended for best experience |
| **Firefox** | 75+ | ✅ Fully Supported | All features work perfectly |
| **Safari** | 13+ | ✅ Fully Supported | iOS and macOS compatible |
| **Edge** | 80+ | ✅ Fully Supported | Chromium-based versions |
| **Mobile** | Modern | ✅ Touch Optimized | iOS Safari, Chrome Mobile |

### 🛠️ **Development Environment**

**Prerequisites**: None! Just a modern browser and text editor.

```bash
# 🔄 Development Workflow
git clone https://github.com/marcelolazzari/Fancy2048.git
cd Fancy2048

# 🌐 Local Server Options
python -m http.server 8080        # Python 3
npx http-server -p 8080          # Node.js
php -S localhost:8080            # PHP

# 🔍 Development URLs
http://localhost:8080/pages/index.html  # Main game
http://localhost:8080/stats.html       # Statistics page
http://localhost:8080/               # Redirect page
```

## 📊 Analytics & Statistics

### 📈 **Comprehensive Tracking**
Fancy 2048 provides detailed analytics to help you improve your gameplay:

<table>
<tr>
<td width="50%">

**🎮 Game Metrics**
- 🎯 **Total Games Played**
- 🏆 **Win/Loss Ratio**  
- ⭐ **Best Score Achieved**
- 📊 **Average Score**
- ⏱️ **Total Playtime**
- 🔥 **Current Win Streak**
- 📈 **Score Progression Over Time**

</td>
<td width="50%">

**⚡ Performance Analytics**
- 🎲 **Moves Per Game** (efficiency)
- ⏰ **Average Game Duration**
- 🎯 **Success Rate** by board size
- 🤖 **AI Usage Statistics**
- 📐 **Preferred Board Sizes**
- 🎚️ **Difficulty Preferences**

</td>
</tr>
</table>

**📱 Access Statistics**: Click the 📊 button in the header or press `S`

### 🏆 **Achievement System**

Unlock achievements as you play and improve:

<details>
<summary>🎯 <strong>Milestone Achievements</strong></summary>

| Achievement | Requirement | Reward |
|-------------|-------------|--------|
| 🥉 **First Steps** | Reach 128 tile | Welcome badge |
| 🥈 **Getting Started** | Reach 512 tile | Progress recognition |
| 🥇 **Classic Winner** | Reach 2048 tile | Victory celebration |
| 💎 **Power Player** | Reach 4096 tile | Elite status |
| 🌟 **Master Gamer** | Reach 8192 tile | Master badge |
| 👑 **Legendary** | Reach 16384 tile | Ultimate achievement |

</details>

<details>
<summary>⚡ <strong>Skill Achievements</strong></summary>

| Achievement | Requirement | Description |
|-------------|-------------|-------------|
| 🎯 **Efficient** | Win with <200 moves | Optimal gameplay |
| ⚡ **Speed Demon** | Win in <5 minutes | Quick thinking |
| 🧠 **No Takebacks** | Win without undo | Pure skill |
| 🔥 **Streak Master** | 5 wins in a row | Consistency |
| 🤖 **AI Student** | Use AI hints 50 times | Learning mode |
| 📐 **Size Explorer** | Win on all board sizes | Versatility |

</details>

### 📤 **Data Management**
- **Export Stats**: Download your complete game history as JSON
- **Import Backup**: Restore statistics from previous sessions  
- **Reset Data**: Clear all statistics (with confirmation)
- **Privacy**: All data stored locally - never shared

## 🔒 Privacy & Security

### 🛡️ **Privacy-First Design**
Your data belongs to **you** - we take privacy seriously:

- 🏠 **100% Local Storage** - All game data stays on your device
- 🚫 **Zero Data Collection** - No analytics, tracking, or telemetry
- 🌐 **No External APIs** - Completely self-contained application  
- 📱 **Offline Capable** - Works without internet connection
- 🔐 **No Account Required** - Play anonymously
- 🗂️ **Data Control** - Export, import, or delete your data anytime

### 🔧 **Security Features**
- ✅ **Content Security Policy** headers
- 🔒 **HTTPS Only** deployment
- 🛡️ **XSS Protection** built-in
- 📝 **Input Validation** for all user data
- 🧹 **Safe Data Handling** with error boundaries

## 🤝 Contributing

We welcome contributions! Here's how you can help improve Fancy 2048:

### 🚀 **Quick Contribution**
1. 🍴 **Fork** the repository
2. 🌿 **Create** a feature branch (`git checkout -b amazing-feature`)
3. ✍️ **Make** your changes
4. ✅ **Test** your modifications
5. 📝 **Commit** with clear messages (`git commit -m 'Add amazing feature'`)
6. 📤 **Push** to your branch (`git push origin amazing-feature`)
7. 🔃 **Submit** a Pull Request

### 🎯 **Areas for Contribution**

<table>
<tr>
<td width="50%">

**🐛 Bug Fixes**
- Cross-browser compatibility
- Performance optimizations
- Accessibility improvements
- Mobile responsiveness

**✨ New Features** 
- Game modes (time attack, puzzle)
- Visual themes and customization
- Sound effects and audio
- Multiplayer functionality

</td>
<td width="50%">

**📚 Documentation**
- Code comments and JSDoc
- Tutorial improvements
- Translation/i18n support
- API documentation

**🧪 Testing & QA**
- Unit test coverage
- Integration tests  
- Performance testing
- Accessibility audits

</td>
</tr>
</table>

### 👨‍💻 **Development Guidelines**
- 📋 **Code Style**: Follow existing patterns and conventions
- 🧪 **Testing**: Test your changes in multiple browsers
- 📝 **Documentation**: Update README and comments as needed
- ♿ **Accessibility**: Ensure features are accessible
- 📱 **Mobile**: Test on mobile devices and touch interfaces

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by the original 2048 game by Gabriele Cirulli
- Built with modern web standards and best practices
- Thanks to the open-source community for tools and inspiration

## 🆘 Troubleshooting

### Common Issues

**🔧 JavaScript Errors**
- **Clear browser cache** and refresh the page
- **Enable JavaScript** in your browser settings
- **Check browser console** for specific error messages
- **Try incognito/private browsing** mode

**💾 Storage Issues**
- **Enable localStorage** in browser settings
- **Clear site data** if corruption is suspected
- **Check available storage** quota
- **Try a different browser** if persistent

**📱 Mobile Problems**
- **Update your browser** to the latest version
- **Enable touch gestures** and JavaScript
- **Clear mobile browser cache**
- **Try landscape/portrait** orientation

**🤖 AI Not Working**
- **Refresh the page** to reload AI components
- **Check browser compatibility** (modern browsers required)
- **Lower AI difficulty** if performance issues occur

### 📞 **Getting Help**

If problems persist:

1. 📋 **Check Console**: Open Developer Tools → Console for errors
2. 🔄 **Hard Refresh**: Ctrl+F5 (Windows) / Cmd+Shift+R (Mac)  
3. 🗑️ **Clear Data**: Reset all game data in Settings
4. 🌐 **Try Different Browser**: Test in Chrome, Firefox, or Safari
5. 🐛 **Report Bug**: Open an issue on [GitHub](https://github.com/marcelolazzari/Fancy2048/issues)

### 📊 **Browser Support**

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| **Core Game** | ✅ All | ✅ All | ✅ All | ✅ All |
| **PWA Install** | ✅ 80+ | ✅ 85+ | ✅ 13+ | ✅ 80+ |
| **Touch Gestures** | ✅ All | ✅ All | ✅ All | ✅ All |
| **AI Solver** | ✅ 80+ | ✅ 75+ | ✅ 13+ | ✅ 80+ |

---

**🎮 Fancy 2048** - Where classic gameplay meets modern technology! ✨

**Made with ❤️ by developers, for puzzle enthusiasts worldwide** �
