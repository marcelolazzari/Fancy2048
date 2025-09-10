/**
 * Fancy2048 - Error Detection & Fallback Script
 * This script loads first to catch any critical errors and provide fallback functionality
 */

(function() {
  'use strict';
  
  // Global error handler
  window.addEventListener('error', function(e) {
    console.error('Global error caught:', e.error || e.message, 'at', e.filename, ':', e.lineno);
    
    // If the main app hasn't loaded after 5 seconds, show fallback
    if (!window.fancy2048App) {
      setTimeout(showFallbackError, 5000);
    }
  });

  // Unhandled promise rejection handler
  window.addEventListener('unhandledrejection', function(e) {
    console.error('Unhandled promise rejection:', e.reason);
  });

  // Simple fallback error display
  function showFallbackError() {
    if (window.fancy2048App || document.querySelector('.initialization-error')) {
      return; // App loaded successfully or error already shown
    }

    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
      loadingScreen.style.display = 'none';
    }

    const errorDiv = document.createElement('div');
    errorDiv.className = 'initialization-error';
    errorDiv.innerHTML = `
      <div style="
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: #1a1a1a;
        color: #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      ">
        <div style="
          text-align: center;
          padding: 2rem;
          background: #2d2d2d;
          border-radius: 8px;
          max-width: 500px;
          margin: 1rem;
        ">
          <h2>⚠️ Loading Error</h2>
          <p>The game failed to initialize properly.</p>
          <p>This might be due to:</p>
          <ul style="text-align: left; margin: 1rem 0;">
            <li>Network connection issues</li>
            <li>Browser compatibility</li>
            <li>JavaScript being disabled</li>
          </ul>
          <button onclick="window.location.reload()" style="
            background: #ffcc00;
            color: #1a1a1a;
            border: none;
            padding: 0.75rem 2rem;
            border-radius: 4px;
            font-size: 1rem;
            cursor: pointer;
            margin-top: 1rem;
          ">
            Try Again
          </button>
          <div style="margin-top: 1rem; font-size: 0.9rem; opacity: 0.8;">
            <a href="https://github.com/marcelolazzari/Fancy2048" 
               style="color: #ffcc00; text-decoration: none;">
              Report Issue on GitHub
            </a>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(errorDiv);
  }

  // Basic feature detection
  function checkBrowserSupport() {
    const required = [
      'localStorage',
      'addEventListener',
      'querySelector',
      'classList'
    ];
    
    for (const feature of required) {
      if (!(feature in window) && !(feature in document) && !(feature in Element.prototype)) {
        console.warn(`Browser missing required feature: ${feature}`);
      }
    }
    
    if (!window.localStorage) {
      console.error('localStorage not available - game will not work properly');
    }
  }

  // Check browser support when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkBrowserSupport);
  } else {
    checkBrowserSupport();
  }

  console.log('Fancy2048 error detection script loaded');
})();
