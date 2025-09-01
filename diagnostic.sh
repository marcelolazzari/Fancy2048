#!/bin/bash

echo "🔧 Fancy2048 Repository Diagnostic & Fix Script"
echo "=============================================="

cd /workspaces/Fancy2048

echo
echo "📁 Repository Structure Check:"
echo "------------------------------"
find . -type f -name "*.js" -o -name "*.html" -o -name "*.css" | head -20

echo
echo "📜 JavaScript Files Syntax Check:"
echo "--------------------------------"
cd scripts
for file in *.js; do
    echo -n "Checking $file... "
    if node -c "$file" 2>/dev/null; then
        echo "✅ OK"
    else
        echo "❌ SYNTAX ERROR"
        node -c "$file"
    fi
done

cd ..

echo
echo "🌐 HTML Files Check:"
echo "-------------------"
cd pages
for file in *.html; do
    echo -n "Checking $file... "
    if [ -s "$file" ]; then
        echo "✅ EXISTS ($(wc -l < "$file") lines)"
    else
        echo "❌ MISSING OR EMPTY"
    fi
done

cd ..

echo
echo "🎨 CSS Files Check:"
echo "------------------"
cd styles
for file in *.css; do
    echo -n "Checking $file... "
    if [ -s "$file" ]; then
        echo "✅ EXISTS ($(wc -l < "$file") lines)"
    else
        echo "❌ MISSING OR EMPTY"
    fi
done

cd ..

echo
echo "🔍 Key Dependencies Check:"
echo "-------------------------"
grep -r "class UnifiedDataManager" scripts/ > /dev/null && echo "✅ UnifiedDataManager class found" || echo "❌ UnifiedDataManager class missing"
grep -r "class UnifiedUIManager" scripts/ > /dev/null && echo "✅ UnifiedUIManager class found" || echo "❌ UnifiedUIManager class missing"
grep -r "class Game " scripts/ > /dev/null && echo "✅ Game class found" || echo "❌ Game class missing"
grep -r "class Enhanced2048AI" scripts/ > /dev/null && echo "✅ Enhanced2048AI class found" || echo "❌ Enhanced2048AI class missing"

echo
echo "📊 Game Initialization Check:"
echo "----------------------------"
grep -r "new Game(" scripts/ | head -3
grep -r "window.game" scripts/ | head -3

echo
echo "🎯 Event Listeners Check:"
echo "------------------------"
grep -r "addEventListener" scripts/ | grep -c "DOMContentLoaded" | head -1
grep -r "getElementById" scripts/ | wc -l

echo
echo "🚀 Critical Functions Check:"
echo "---------------------------"
grep -r "initializeDataManager\|initializeUIManager" scripts/game.js > /dev/null && echo "✅ Manager initialization found" || echo "❌ Manager initialization missing"
grep -r "updateUI\|updateBoard" scripts/game.js > /dev/null && echo "✅ UI update methods found" || echo "❌ UI update methods missing"

echo
echo "🏁 Analysis Complete!"
echo "===================="
