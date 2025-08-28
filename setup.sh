#!/bin/bash

# Fancy2048 Setup Script
# This script helps set up the development environment

echo "🎮 Fancy2048 Setup Script"
echo "=========================="
echo ""

# Check if we're in the right directory
if [[ ! -f "app.py" ]]; then
    echo "❌ Error: Please run this script from the Fancy2048 root directory"
    exit 1
fi

echo "📁 Verifying project structure..."

# Check for required directories
directories=("pages" "scripts" "styles")
for dir in "${directories[@]}"; do
    if [[ -d "$dir" ]]; then
        echo "✅ Directory $dir exists"
    else
        echo "❌ Directory $dir missing!"
        exit 1
    fi
done

# Check for required files
files=("pages/index.html" "pages/leaderboard.html" "scripts/game.js" "app.py")
for file in "${files[@]}"; do
    if [[ -f "$file" ]]; then
        echo "✅ File $file exists"
    else
        echo "❌ File $file missing!"
        exit 1
    fi
done

echo ""
echo "🐍 Checking Python environment..."

# Check if Python is available
if command -v python3 &> /dev/null; then
    echo "✅ Python 3 is available"
    python3 --version
else
    echo "⚠️  Python 3 not found. Flask backend won't work without it."
fi

# Check if pip is available
if command -v pip3 &> /dev/null; then
    echo "✅ pip3 is available"
else
    echo "⚠️  pip3 not found. You may need to install Python dependencies manually."
fi

echo ""
echo "📦 Installing Python dependencies (optional)..."

if command -v pip3 &> /dev/null; then
    echo "Installing Flask and Flask-CORS..."
    pip3 install flask flask-cors 2>/dev/null
    if [[ $? -eq 0 ]]; then
        echo "✅ Python dependencies installed successfully"
    else
        echo "⚠️  Could not install dependencies. You may need to use sudo or virtual environment."
    fi
else
    echo "⏭️  Skipping Python dependencies (pip3 not available)"
fi

echo ""
echo "🌐 Setup options:"
echo ""
echo "Option 1 - Simple HTML Version (Recommended for most users):"
echo "   Just open 'pages/index.html' in your web browser"
echo ""
echo "Option 2 - Flask Server Version:"
echo "   1. Run: python3 app.py"
echo "   2. Open: http://localhost:5000"
echo ""

# Create a simple start script for HTML version
cat > start-game.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="refresh" content="0; url=pages/index.html">
    <title>Redirecting to Fancy2048...</title>
</head>
<body>
    <p>Redirecting to Fancy2048... <a href="pages/index.html">Click here if not redirected</a></p>
</body>
</html>
EOF

echo "✅ Created start-game.html for quick access"
echo ""

# Check for common issues
echo "🔍 Checking for common issues..."

# Check if files have proper line endings (Unix vs Windows)
if command -v file &> /dev/null; then
    line_ending_check=$(file pages/index.html 2>/dev/null)
    if [[ $line_ending_check == *"CRLF"* ]]; then
        echo "⚠️  Windows line endings detected. May cause issues on Unix systems."
    else
        echo "✅ Line endings are correct"
    fi
fi

# Check file permissions
if [[ -r "pages/index.html" ]]; then
    echo "✅ Game files are readable"
else
    echo "❌ Permission issues detected. You may need to fix file permissions."
fi

echo ""
echo "🎯 Setup Complete!"
echo "=================="
echo ""
echo "Quick Start:"
echo "• Double-click 'start-game.html' to play immediately"
echo "• Or open 'pages/index.html' directly in your browser"
echo ""
echo "For development:"
echo "• Edit files in scripts/ and styles/ directories"
echo "• Use browser developer tools for debugging"
echo "• Check console for any JavaScript errors"
echo ""
echo "🎮 Enjoy playing Fancy2048!"
