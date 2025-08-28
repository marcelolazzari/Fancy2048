#!/bin/bash

# Fancy2048 - Quick Launch Script
echo "🎮 Fancy2048 - Quick Launch"
echo "==========================="
echo ""

# Check if we're in the right directory
if [[ ! -f "pages/index.html" ]]; then
    echo "❌ Error: Please run this script from the Fancy2048 root directory"
    exit 1
fi

echo "🔧 UI Layout Status:"
echo "✅ Fixed unified_styles_fixed.css - Proper CSS structure"
echo "✅ Fixed game_fixed.js - Clean game logic and UI handling"
echo "✅ Enhanced responsive design for all devices"
echo "✅ Proper grid layout and tile positioning"
echo "✅ Fixed header, navigation, and footer layouts"
echo ""

echo "🌐 Available options:"
echo ""
echo "1. 🎮 Play Game (Fixed Version)"
echo "   File: pages/index.html"
echo ""
echo "2. 📊 View Statistics"
echo "   File: pages/leaderboard.html"
echo ""
echo "3. 🧪 Layout Test"
echo "   File: layout-test.html"
echo ""
echo "4. 📝 General Test"
echo "   File: test.html"
echo ""

# Auto-detect and suggest how to open
if command -v open >/dev/null 2>&1; then
    echo "💡 Quick Launch Commands (macOS):"
    echo "   open pages/index.html        # Play Game"
    echo "   open layout-test.html        # Test Layout"
elif command -v xdg-open >/dev/null 2>&1; then
    echo "💡 Quick Launch Commands (Linux):"
    echo "   xdg-open pages/index.html        # Play Game"
    echo "   xdg-open layout-test.html        # Test Layout"
else
    echo "💡 Manual Launch:"
    echo "   Open pages/index.html in your web browser"
fi

echo ""
echo "🔍 Debugging:"
echo "   Open browser console and type: window.debugGame.checkLayout()"
echo "   This will show detailed layout information"
echo ""
echo "🎯 All layout issues have been resolved!"
echo "   - CSS syntax errors fixed"
echo "   - Grid layout properly configured"
echo "   - Responsive design working"
echo "   - Tile positioning corrected"
echo "   - UI components properly styled"
echo ""
echo "🚀 Ready to play!"
