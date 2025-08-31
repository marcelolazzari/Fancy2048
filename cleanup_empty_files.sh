#!/bin/bash

echo "🧹 Fancy2048 - Cleaning Up Empty Files"
echo "======================================"

# List of empty files to remove
empty_files=(
    "scripts/python_ai_integration.js"
    "styles/mobile_responsive_enhanced.css"
    "styles/python_ai_styles.css"
    "styles/unified_styles_complete.css"
    "advanced_ai_solver.py"
)

echo "📋 Empty files found for removal:"
for file in "${empty_files[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✓ $file ($(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null || echo "0") bytes)"
    else
        echo "  ⚠ $file (not found)"
    fi
done

echo ""
read -p "🗑️  Remove these empty files? (y/N): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🔄 Removing empty files..."
    
    removed_count=0
    for file in "${empty_files[@]}"; do
        if [ -f "$file" ]; then
            rm "$file"
            echo "  ✅ Removed: $file"
            ((removed_count++))
        else
            echo "  ⚠️  File not found: $file"
        fi
    done
    
    echo ""
    echo "✅ Cleanup complete! Removed $removed_count empty files."
    echo "📝 Don't forget to commit these changes:"
    echo "    git add -u"
    echo "    git commit -m \"Remove empty files\""
    echo "    git push"
else
    echo "❌ Cleanup cancelled."
fi

echo ""
echo "🔍 To find more empty files in the future, run:"
echo "    find . -type f -empty"
