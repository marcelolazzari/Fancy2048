import React, { useState, useEffect } from 'react';
import Game from './Game';

function App() {
  const [size, setSize] = useState(4);

  useEffect(() => {
    const game = new Game(size);
    game.refreshLayout();
    game.applyTheme();
    game.updateHue();
  }, [size]);

  return (
    <div className="App">
      <header>
        <h1>Fancy 2048</h1>
        <div id="controls-container">
          <button type="button" id="changeColor-button">Change Color</button>
          <button type="button" id="invert-button">🌙</button>
        </div>
      </header>
      <main>
        <div className="overlay"></div>
        <section className="game-section">
          <div className="board-container" id="board-container"></div>
          <div id="game-over" className="hidden">Game Over!</div>
        </section>
        <aside id="score-container">
          <p>Score: <span id="score">0</span></p>
          <p>Best Score: <span id="best-score">0</span></p>
        </aside>
        <button type="button" id="reset-button">Reset Game</button>
      </main>
    </div>
  );
}

export default App;
