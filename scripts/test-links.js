// This is a simple script to test if all files are properly linked
document.addEventListener('DOMContentLoaded', () => {
  // Test script for verifying links and elements
  try {
    console.log('Test script loaded successfully');
    // Log that CSS is properly loaded
    if (document.styleSheets.length > 0) {
      console.log('CSS loaded successfully');
    } else {
      console.warn('CSS may not be loaded correctly');
    }
    // Check if main elements exist
    const elementsToCheck = [
      'board-container',
      'score-container',
      'controls-container',
      'game-over'
    ];
    elementsToCheck.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        console.log(`Element #${id} found`);
        el.setAttribute('tabindex', '0');
      } else {
        console.log(`Element #${id} not found - this may be normal if you're not on the main game page`);
      }
    });
    console.log('Page check complete');
  } catch (e) {
    console.error('Error in test-links.js:', e);
  }
});
