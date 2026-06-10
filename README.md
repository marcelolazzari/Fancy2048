# Fancy2048 🎮

A modern, AI-powered 2048 puzzle game built with vanilla JavaScript — no
frameworks, no runtime dependencies, works offline.

## 🎯 Play Now

**[▶️ Play Fancy2048](https://marcelolazzari.github.io/Fancy2048/pages/index.html)**

**[📊 View Statistics](https://marcelolazzari.github.io/Fancy2048/pages/stats.html)**

## ✨ Features

- 🎮 Classic 2048 gameplay with multiple board sizes (3×3 to 6×6)
- 🤖 **AI Assistant** — get hints or watch auto-play with 4 difficulty levels
- 📊 **Detailed Statistics** — track your progress and improvement
- 🌙 **Dark/Light Themes** — automatic or manual theme switching
- 📱 **Mobile Optimized** — touch controls with haptic feedback
- 🚀 **Progressive Web App** — install on your device, works offline
- ♿ **Fully Accessible** — screen reader support and keyboard navigation
- ⏪ **Undo** — never get stuck, undo recent moves
- 💾 **Auto-Save** — your progress is automatically saved

## 🎯 How to Play

1. Use **arrow keys** (desktop) or **swipe** (mobile) to move tiles
2. Combine tiles with the same number to create larger ones
3. Reach **2048** to win, but keep going for higher scores!
4. Use the **AI hint** button when you need help
5. Toggle **auto-play** to watch the AI solve the puzzle

### Keyboard shortcuts

| Shortcut          | Action                |
| ----------------- | --------------------- |
| Arrow keys        | Move tiles            |
| Ctrl/Cmd + H      | Get an AI hint        |
| Ctrl/Cmd + Space  | Toggle auto-play      |
| Ctrl/Cmd + S      | Cycle auto-play speed |

## 🤖 The AI Solver

Auto-play and hints are powered by an **expectimax** search with several
pluggable strategies (`expectimax`, `montecarlo`, `priority`, and a `smart`
hybrid). Board positions are scored with a blend of heuristics:

- Snake/boustrophedon pattern weighting (generated for any board size)
- Corner gradient and monotonicity
- Tile smoothness and merge potential
- Empty-cell reward and high-tile clustering penalty

Heuristic weights are tuned dynamically based on the current game phase
(early / mid / late / end).

## 🛠️ Local Development

The game is fully static — any HTTP server works. Using the bundled tooling:

```bash
git clone https://github.com/marcelolazzari/Fancy2048.git
cd Fancy2048
npm install      # installs dev tools (http-server, jsdom)
npm start        # serves the repo and opens pages/index.html
```

Or without Node, from the repository root:

```bash
python3 -m http.server 8080
# then open http://localhost:8080/pages/index.html
```

> The pages live in `pages/` but reference shared assets in `src/` via
> relative paths, so the server must be started from the **repository root**.

### Running tests

```bash
npm test                     # autoplay integration test (Node + jsdom)
./test/run-all-ai-tests.sh   # full AI test suite
```

## 📁 Project Structure

```
Fancy2048/
├── pages/              # HTML entry points (game + statistics)
│   ├── index.html
│   └── stats.html
├── src/
│   ├── css/            # Styles (main.css, stats.css)
│   ├── js/             # Game modules
│   │   ├── app.js           # App controller / bootstrap
│   │   ├── game-engine.js   # Core 2048 logic & state
│   │   ├── ai-solver.js     # Expectimax AI solver
│   │   ├── ui-controller.js # DOM rendering & interactions
│   │   ├── touch-handler.js # Swipe / gesture handling
│   │   ├── storage.js       # localStorage persistence
│   │   ├── stats.js         # Statistics page logic
│   │   ├── utils.js         # Shared helpers
│   │   └── error-handler.js # Global error fallback
│   └── assets/         # Icons & favicon
├── test/               # Test suite
├── manifest.json       # PWA manifest
└── service-worker.js   # Offline caching
```

## 📝 License

[MIT License](LICENSE) — feel free to use and modify!

---

**Built with vanilla JavaScript • No runtime dependencies • Works everywhere**
