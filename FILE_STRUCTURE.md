# Fancy 2048 - File Structure Documentation

## Active Files (Used by the application):

### HTML Pages
- `pages/index.html` - Main game page
- `pages/leaderboard.html` - Statistics and leaderboard page

### JavaScript Files
- `scripts/game.js` - Main game logic with backend integration
- `scripts/statistics.js` - Statistics page functionality
- `scripts/test-links.js` - Development utility for testing file links

### CSS Files  
- `styles/unified_styles.css` - Main application styles (optimized)
- `styles/stats_styles.css` - Statistics page specific styles

### Backend
- `app.py` - Flask backend server (optional, game works standalone)

## File Linking:

### index.html links:
- `../styles/unified_styles.css`
- `../scripts/game.js`
- `../scripts/test-links.js`

### leaderboard.html links:
- `../styles/unified_styles.css`
- `../styles/stats_styles.css` 
- `../scripts/statistics.js`
- `../scripts/test-links.js`

## Removed Files (Previously unused):

- `scripts/game-enhanced.js` - Alternative game implementation
- `scripts/leaderboard-stats.js` - Unused stats functionality
- `styles/mobile_styles.css` - Unused mobile styles
- `styles/fixed_unified_styles.css` - Used its content to improve unified_styles.css

All files are now properly linked and optimized.
