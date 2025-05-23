// This is a simple script to test if all files are properly linked
document.addEventListener('DOMContentLoaded', () => {
  console.log('Test script loaded successfully');
  
  // Log that CSS is properly loaded
  if (document.styleSheets.length > 0) {
    console.log('CSS loaded successfully');
  } else {
    console.error('CSS may not be loaded correctly');
  }
  
  // Check if main elements exist
  const elementsToCheck = [
    'board-container',
    'score-container',
    'controls-container',
    'game-over'
  ];
  
  elementsToCheck.forEach(id => {
    if (document.getElementById(id)) {
      console.log(`Element #${id} found`);
    } else {
      console.log(`Element #${id} not found - this may be normal if you're not on the main game page`);
    }
  });
  
  console.log('Page check complete');
});
