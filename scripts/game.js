// Instantiate the game 
document.addEventListener('DOMContentLoaded', () => {
  const game = new Game(4);
  game.refreshLayout();
  game.applyTheme();
  game.updateHue();
  window.addEventListener('beforeunload', () => game.saveStats());
});