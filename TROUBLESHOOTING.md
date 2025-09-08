# Troubleshooting Guide - Fancy2048

## 🚀 Quick Fixes

If you're experiencing issues with the online version of Fancy2048, try these solutions:

### 1. Basic Troubleshooting
- **Refresh the page** (Ctrl+F5 or Cmd+Shift+R for hard refresh)
- **Clear browser cache** and reload
- **Disable ad blockers** temporarily
- **Enable JavaScript** in your browser settings

### 2. Browser Compatibility
The game works best on:
- ✅ Chrome 80+ (recommended)
- ✅ Firefox 75+
- ✅ Safari 13+
- ✅ Edge 80+

### 3. Common Issues & Solutions

#### "Initialization Error" Message
**Cause**: Scripts failed to load or execute properly
**Solutions**:
1. Check your internet connection
2. Disable browser extensions temporarily
3. Try in incognito/private mode
4. Clear browser cache and cookies
5. Try a different browser

#### Game Loads But Doesn't Respond
**Cause**: JavaScript errors or touch/keyboard event issues
**Solutions**:
1. Check browser console (F12) for errors
2. Refresh the page
3. Try using keyboard arrows instead of touch
4. Disable other tabs that might be using resources

#### Save Game Not Working
**Cause**: Local storage disabled or full
**Solutions**:
1. Enable cookies and local storage in browser
2. Clear old website data
3. Check if you're in private/incognito mode

#### AI Features Not Working
**Cause**: AI solver script failed to load
**Solutions**:
1. Refresh the page
2. Check internet connection
3. The game works fine without AI - just no hints/auto-play

### 4. Mobile-Specific Issues

#### Touch Controls Not Working
- Make sure you're swiping on the game board area
- Try tapping and dragging instead of quick swipes
- Rotate device to portrait mode
- Refresh the page

#### Performance Issues on Mobile
- Close other browser tabs
- Restart the browser app
- Clear browser cache
- Try a different mobile browser

### 5. Developer Console Debugging

Open browser developer tools (F12) and check:

1. **Console Tab**: Look for red error messages
2. **Network Tab**: Check if all files loaded successfully
3. **Application Tab**: Verify service worker is active

Common error patterns and meanings:
- `Script error`: Usually caused by ad blockers or network issues
- `Utils is not defined`: Script loading order issue - refresh page
- `GameEngine is not defined`: Core script failed to load - check network

### 6. Reporting Issues

If problems persist:

1. **Take a screenshot** of any error messages
2. **Note your browser** and version
3. **Check the console** for error details
4. **Report on GitHub**: https://github.com/marcelolazzari/Fancy2048/issues

Include:
- Browser and version
- Operating system
- Steps to reproduce the issue
- Any console error messages
- Screenshot if applicable

### 7. Alternative Access Methods

If the main site isn't working:

1. **Direct GitHub Pages**: https://marcelolazzari.github.io/Fancy2048/
2. **Local development**: Clone the repository and run locally
3. **GitHub Codespaces**: Open in browser-based development environment

### 8. Known Limitations

- **Internet Explorer**: Not supported (use Edge instead)
- **Very old mobile browsers**: May have compatibility issues
- **Corporate networks**: May block certain JavaScript features
- **Strict content blockers**: May prevent game from loading

### 9. Performance Tips

For the best experience:
- Use a modern browser
- Ensure stable internet connection
- Close unnecessary tabs
- Allow JavaScript and cookies
- Use desktop/laptop for best performance

---

## ✅ System Check

You can verify your setup:

1. **JavaScript**: This page should work normally
2. **Local Storage**: Game saves should persist between sessions
3. **Touch Events**: Swipe gestures should work on mobile
4. **Service Worker**: Game should work offline after first visit

---

**Still having issues?** Open an issue on GitHub with details, and we'll help you get it working!

[🎮 Back to Game](https://marcelolazzari.github.io/Fancy2048/) | [📊 GitHub Repository](https://github.com/marcelolazzari/Fancy2048)
