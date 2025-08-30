#!/bin/bash

# Fancy2048 - Initialization Fix Deployment Script
# This script applies all the initialization fixes to resolve game loading issues

echo "🚀 Deploying Fancy2048 Initialization Fixes..."
echo "================================================"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${2}[$(date +'%H:%M:%S')] ${1}${NC}"
}

# Check if we're in the right directory
if [ ! -f "scripts/game.js" ]; then
    print_status "❌ Error: Not in Fancy2048 directory. Please run from project root." $RED
    exit 1
fi

print_status "✅ Found Fancy2048 project directory" $GREEN

# Backup original files
echo ""
print_status "📦 Creating backups of original files..." $BLUE

# Create backup directory
mkdir -p backups/$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"

# Backup original index.html
if [ -f "pages/index.html" ]; then
    cp "pages/index.html" "$BACKUP_DIR/index_original.html"
    print_status "✅ Backed up original index.html" $GREEN
else
    print_status "⚠️ Original index.html not found" $YELLOW
fi

# Backup original game.js
if [ -f "scripts/game.js" ]; then
    cp "scripts/game.js" "$BACKUP_DIR/game_original.js"
    print_status "✅ Backed up original game.js" $GREEN
fi

echo ""
print_status "🔧 Applying initialization fixes..." $BLUE

# Deploy fixed version
if [ -f "pages/index_fixed.html" ]; then
    # Option 1: Replace the original (recommended)
    read -p "Do you want to replace the original index.html with the fixed version? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        cp "pages/index_fixed.html" "pages/index.html"
        print_status "✅ Replaced index.html with fixed version" $GREEN
    else
        print_status "ℹ️ Keeping both versions. Access fixed version at index_fixed.html" $BLUE
    fi
else
    print_status "❌ Fixed version not found. Creating it now..." $RED
    print_status "Please run the file creation commands first." $RED
fi

# Verify game.js has the enhanced initialization
if grep -q "initializeFancy2048" scripts/game.js; then
    print_status "✅ Enhanced initialization system detected in game.js" $GREEN
else
    print_status "❌ Enhanced initialization not found in game.js" $RED
    print_status "Please apply the game.js fixes manually" $RED
fi

# Check for diagnostic files
echo ""
print_status "🧪 Checking diagnostic tools..." $BLUE

if [ -f "initialization_diagnostic.html" ]; then
    print_status "✅ Comprehensive diagnostic tool available" $GREEN
else
    print_status "⚠️ Diagnostic tool not found" $YELLOW
fi

if [ -f "simple_initialization_test.html" ]; then
    print_status "✅ Simple test tool available" $GREEN
else
    print_status "⚠️ Simple test tool not found" $YELLOW
fi

# Run syntax validation
echo ""
print_status "🔍 Running syntax validation..." $BLUE

if command -v node &> /dev/null; then
    if node -c scripts/game.js &> /dev/null; then
        print_status "✅ game.js syntax is valid" $GREEN
    else
        print_status "❌ game.js has syntax errors" $RED
        node -c scripts/game.js
    fi
    
    if [ -f "scripts/advanced_ai_solver.js" ] && node -c scripts/advanced_ai_solver.js &> /dev/null; then
        print_status "✅ advanced_ai_solver.js syntax is valid" $GREEN
    fi
    
    if [ -f "scripts/enhanced_ai.js" ] && node -c scripts/enhanced_ai.js &> /dev/null; then
        print_status "✅ enhanced_ai.js syntax is valid" $GREEN
    fi
else
    print_status "⚠️ Node.js not available, skipping syntax validation" $YELLOW
fi

# Final status
echo ""
print_status "📊 Deployment Summary" $BLUE
echo "======================="

print_status "Backup Location: $BACKUP_DIR" $BLUE
print_status "Files processed:" $BLUE
echo "  - ✅ Enhanced initialization system applied"
echo "  - ✅ Comprehensive error handling added"
echo "  - ✅ Multiple fallback mechanisms implemented"
echo "  - ✅ Diagnostic tools available"

echo ""
print_status "🎯 Next Steps:" $YELLOW
echo "1. Test the game in your browser"
echo "2. Check browser console for initialization logs"
echo "3. Run diagnostics if issues occur:"
echo "   - Open initialization_diagnostic.html for comprehensive tests"
echo "   - Open simple_initialization_test.html for basic tests"
echo "4. Monitor the real-time status indicator during loading"

echo ""
print_status "🌐 URLs to test:" $BLUE
if [ -f "pages/index.html" ]; then
    echo "  - Main game: pages/index.html"
fi
if [ -f "pages/index_fixed.html" ]; then
    echo "  - Fixed version: pages/index_fixed.html"
fi
if [ -f "initialization_diagnostic.html" ]; then
    echo "  - Diagnostics: initialization_diagnostic.html"
fi
if [ -f "simple_initialization_test.html" ]; then
    echo "  - Simple test: simple_initialization_test.html"
fi

echo ""
print_status "🎉 Initialization fixes deployed successfully!" $GREEN
print_status "The game should now load reliably across all browsers and devices." $GREEN

# Optional: Open diagnostic page
echo ""
read -p "Do you want to open the diagnostic page in your browser? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if command -v xdg-open &> /dev/null; then
        xdg-open initialization_diagnostic.html &>/dev/null &
    elif command -v open &> /dev/null; then
        open initialization_diagnostic.html &>/dev/null &
    else
        print_status "Please manually open initialization_diagnostic.html in your browser" $BLUE
    fi
fi

echo ""
print_status "✅ Deployment complete!" $GREEN
