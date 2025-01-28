# Fancy2048

[Play Fancy2048](https://marcelolazzari.github.io/Fancy2048/Mobile/)

Fancy2048 is a modded version of the classic 2048 game with enhanced features and improved user experience. This version includes:

- **Light Mode**: Switch between dark and light themes for better visibility.
- **Invert Mode**: Invert colors for a unique visual experience.
- **Hue Adjustment**: Adjust the hue of the game elements to your preference using a slider.
- **Responsive Design**: Optimized for mobile devices and different screen sizes.
- **Undo Move**: Undo your last move to correct mistakes.
- **Smooth Animations**: Enjoy smooth transitions and animations for a more engaging gameplay.
- **Local Storage**: Your best score and theme preferences are saved locally.
- **Leaderboard**: Compete with other players and see your ranking on the leaderboard.
- **Change Color**: Change the hue of the game elements for a personalized experience.

## How to Play

1. Use arrow keys or swipe gestures to move the tiles.
2. When two tiles with the same number touch, they merge into one.
3. Try to reach the 2048 tile!
4. Use the undo button to revert your last move if needed.

## Controls

- **Arrow Keys**: Move tiles up, down, left, or right.
- **Swipe Gestures**: Move tiles on touch devices.
- **Invert Button**: Toggle invert mode.
- **Reset Button**: Restart the game.
- **Back Button**: Undo the last move.
- **Hue Slider**: Adjust the hue of the game elements.
- **Sound Toggle**: Enable or disable sound effects.
- **Leaderboard Button**: View the leaderboard.
- **Change Color Button**: Change the hue of the game elements.

## Play Online

You can play Fancy2048 directly in your browser by visiting the following link:

[Play Fancy2048](https://marcelolazzari.github.io/Fancy2048/Mobile/)

## Installation

If you prefer to run the game locally, follow these steps:

1. Clone the repository:
   ```bash
   git clone https://github.com/marcelolazzari/Fancy2048.git
   ```
2. Open the project directory:
   ```bash
   cd Fancy2048
   ```
3. Open `index.html` in your preferred web browser to start playing.

## Implementation Details

### Back Button

The back button allows the player to undo their last move. This is implemented by maintaining a stack of previous game states and reverting to the last state when the button is pressed.

```javascript
// ...existing code...

let gameStateStack = [];

// Save the current state before making a move
function saveState() {
    gameStateStack.push(JSON.stringify(grid));
}

// Undo the last move
function undoMove() {
    if (gameStateStack.length > 0) {
        grid = JSON.parse(gameStateStack.pop());
        updateGrid();
    }
}

// ...existing code...

document.getElementById('backButton').addEventListener('click', undoMove);

// ...existing code...
```

### Leaderboard Button

The leaderboard button allows the player to view the leaderboard. This is implemented by fetching the leaderboard data from local storage or a server and displaying it in a modal or a new view.

```javascript
// ...existing code...

function showLeaderboard() {
    // Fetch leaderboard data (this example uses local storage)
    let leaderboard = JSON.parse(localStorage.getItem('leaderboard')) || [];
    let leaderboardHtml = leaderboard.map((entry, index) => `<li>${index + 1}. ${entry.name}: ${entry.score}</li>`).join('');
    document.getElementById('leaderboardList').innerHTML = leaderboardHtml;
    document.getElementById('leaderboardModal').style.display = 'block';
}

document.getElementById('leaderboardButton').addEventListener('click', showLeaderboard);

// ...existing code...
```

Enjoy the enhanced 2048 experience with Fancy2048!
