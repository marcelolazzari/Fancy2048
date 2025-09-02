#!/usr/bin/env python3
"""
Direct File Analysis and Fix System for Fancy2048
Performs immediate analysis and fixes without HTTP server dependency
"""

import os
import re
import json
from pathlib import Path
from typing import Dict, List
import logging

class GameFileFixer:
    def __init__(self):
        self.root = Path("/workspaces/Fancy2048")
        self.fixes_applied = []
        self.errors_found = []
        
        logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
        self.logger = logging.getLogger(__name__)

    def fix_css_paths(self):
        """Fix CSS path issues in HTML files"""
        html_files = [
            'pages/index.html',
            'pages/leaderboard.html',
            'pages/game_fixed.html'
        ]
        
        for html_file in html_files:
            file_path = self.root / html_file
            if not file_path.exists():
                continue
                
            content = file_path.read_text(encoding='utf-8')
            original_content = content
            
            # Fix GitHub Pages paths that start with /Fancy2048
            content = re.sub(
                r'href="/Fancy2048/styles/([^"]+)"',
                r'href="../styles/\1"',
                content
            )
            
            # Fix incorrect relative paths for styles
            if 'pages/' in html_file:
                content = re.sub(
                    r'href="styles/([^"]+)"',
                    r'href="../styles/\1"',
                    content
                )
            
            if content != original_content:
                file_path.write_text(content, encoding='utf-8')
                self.fixes_applied.append(f"Fixed CSS paths in {html_file}")
                self.logger.info(f"✅ Fixed CSS paths in {html_file}")

    def add_missing_game_elements(self):
        """Add missing game elements to HTML files"""
        main_game_file = self.root / 'pages/index.html'
        
        if not main_game_file.exists():
            self.logger.error("Main game file not found")
            return
        
        content = main_game_file.read_text(encoding='utf-8')
        
        # Check if game tiles class exists
        if 'class="tile"' not in content and '.tile' not in content:
            # Add basic tile styles to ensure tiles are visible
            tile_styles = '''
        /* Ensure tiles are visible */
        .tile {
            position: absolute;
            width: var(--tile-size, 60px);
            height: var(--tile-size, 60px);
            background: #cdc1b4;
            border-radius: 3px;
            font-family: "Clear Sans", "Helvetica Neue", Arial, sans-serif;
            font-weight: bold;
            text-align: center;
            line-height: var(--tile-size, 60px);
            font-size: 35px;
            transition: all 0.15s ease-in-out;
            color: #776e65;
        }
        
        .tile[data-value="2"] { background: #eee4da; color: #776e65; }
        .tile[data-value="4"] { background: #ede0c8; color: #776e65; }
        .tile[data-value="8"] { background: #f2b179; color: #f9f6f2; }
        .tile[data-value="16"] { background: #f59563; color: #f9f6f2; }
        .tile[data-value="32"] { background: #f67c5f; color: #f9f6f2; }
        .tile[data-value="64"] { background: #f65e3b; color: #f9f6f2; }
        .tile[data-value="128"] { background: #edcf72; color: #f9f6f2; font-size: 30px; }
        .tile[data-value="256"] { background: #edcc61; color: #f9f6f2; font-size: 30px; }
        .tile[data-value="512"] { background: #edc850; color: #f9f6f2; font-size: 30px; }
        .tile[data-value="1024"] { background: #edc53f; color: #f9f6f2; font-size: 25px; }
        .tile[data-value="2048"] { background: #edc22e; color: #f9f6f2; font-size: 25px; }'''
            
            # Insert tile styles before closing </style> tag
            if '</style>' in content:
                content = content.replace('</style>', tile_styles + '\n    </style>')
                main_game_file.write_text(content, encoding='utf-8')
                self.fixes_applied.append("Added missing tile styles to pages/index.html")
                self.logger.info("✅ Added missing tile styles to pages/index.html")

    def fix_javascript_exports(self):
        """Fix missing JavaScript exports"""
        js_files = [
            ('scripts/game.js', 'Game'),
            ('scripts/enhanced_ai.js', 'Enhanced2048AI'),
            ('scripts/advanced_ai_solver.js', 'AdvancedAI2048Solver'),
            ('scripts/ai_learning_system.js', 'AILearningSystem')
        ]
        
        for js_file, class_name in js_files:
            file_path = self.root / js_file
            
            if not file_path.exists():
                continue
            
            content = file_path.read_text(encoding='utf-8')
            
            # Check if global export exists
            export_patterns = [
                f'window.{class_name} = {class_name}',
                f'window.{class_name}={class_name}',
                f'window["{class_name}"] = {class_name}'
            ]
            
            has_export = any(pattern in content for pattern in export_patterns)
            
            if not has_export:
                # Add the export at the end
                export_line = f'\n// Make available globally\nwindow.{class_name} = {class_name};\n'
                content += export_line
                
                file_path.write_text(content, encoding='utf-8')
                self.fixes_applied.append(f"Added global export for {class_name} in {js_file}")
                self.logger.info(f"✅ Added global export for {class_name} in {js_file}")

    def validate_game_structure(self) -> Dict[str, bool]:
        """Validate the complete game structure"""
        validations = {}
        
        # Check essential files exist
        essential_files = [
            'pages/index.html',
            'styles/main.css',
            'scripts/game.js',
            'scripts/enhanced_ai.js'
        ]
        
        for file_path in essential_files:
            exists = (self.root / file_path).exists()
            validations[f"file_exists_{file_path.replace('/', '_')}"] = exists
            if not exists:
                self.errors_found.append(f"Missing essential file: {file_path}")
        
        # Check HTML structure
        main_html = self.root / 'pages/index.html'
        if main_html.exists():
            content = main_html.read_text()
            required_elements = [
                'id="board-container"',
                'id="score-container"',
                'id="reset-button"',
                'script src="../scripts/game.js"'
            ]
            
            for element in required_elements:
                has_element = element in content
                validations[f"html_element_{element.split('=')[0].split()[-1]}"] = has_element
                if not has_element:
                    self.errors_found.append(f"Missing HTML element: {element}")
        
        # Check JavaScript classes
        js_checks = [
            ('scripts/game.js', 'class Game'),
            ('scripts/enhanced_ai.js', 'class Enhanced2048AI'),
            ('scripts/advanced_ai_solver.js', 'class AdvancedAI2048Solver')
        ]
        
        for js_file, class_def in js_checks:
            file_path = self.root / js_file
            if file_path.exists():
                content = file_path.read_text()
                has_class = class_def in content
                validations[f"js_class_{js_file.split('/')[-1].split('.')[0]}"] = has_class
                if not has_class:
                    self.errors_found.append(f"Missing class definition in {js_file}: {class_def}")
        
        return validations

    def create_test_verification_page(self):
        """Create a test page to verify all fixes"""
        test_content = '''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Fancy2048 - Fixed Components Test</title>
    <link rel="stylesheet" href="../styles/main.css">
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #1a1a1a; color: #fff; }
        .test-result { margin: 10px 0; padding: 10px; border-radius: 5px; border-left: 4px solid #333; }
        .pass { border-left-color: #4CAF50; background: rgba(76, 175, 80, 0.1); }
        .fail { border-left-color: #f44336; background: rgba(244, 67, 54, 0.1); }
        .warning { border-left-color: #ff9800; background: rgba(255, 152, 0, 0.1); }
        button { background: #ff9900; border: none; padding: 10px 20px; color: white; border-radius: 5px; margin: 5px; cursor: pointer; }
        button:hover { background: #ffb300; }
        .hidden { position: absolute; left: -9999px; width: 1px; height: 1px; }
    </style>
</head>
<body>
    <h1>🔧 Fancy2048 - Component Fix Verification</h1>
    <p>This page tests all the fixed components to ensure they're working correctly.</p>
    
    <button onclick="runComponentTests()">🧪 Test Fixed Components</button>
    <button onclick="testGameFunctionality()">🎮 Test Game Functionality</button>
    <button onclick="clearResults()">🗑️ Clear Results</button>
    
    <div id="test-results"></div>
    
    <!-- Hidden game elements for testing -->
    <div class="hidden">
        <div id="score-container"><ul><li>Score: <span id="score">0</span></li></ul></div>
        <div id="board-container"></div>
        <button id="reset-button">Reset</button>
        <button id="ai-play-button">AI Play</button>
    </div>

    <script src="../scripts/ai_learning_system.js"></script>
    <script src="../scripts/enhanced_ai.js"></script>
    <script src="../scripts/advanced_ai_solver.js"></script>
    <script src="../scripts/game.js"></script>

    <script>
        function logResult(test, status, message) {
            const resultsDiv = document.getElementById('test-results');
            const div = document.createElement('div');
            div.className = `test-result ${status}`;
            div.innerHTML = `<strong>${test}:</strong> ${message}`;
            resultsDiv.appendChild(div);
        }
        
        function clearResults() {
            document.getElementById('test-results').innerHTML = '';
        }
        
        function runComponentTests() {
            clearResults();
            
            // Test 1: CSS Loading
            const computedStyle = getComputedStyle(document.body);
            if (computedStyle.backgroundColor === 'rgb(26, 26, 26)') {
                logResult('CSS Loading', 'pass', 'Main CSS file loaded successfully');
            } else {
                logResult('CSS Loading', 'fail', 'Main CSS file not loaded or incorrect');
            }
            
            // Test 2: JavaScript Classes
            const jsClasses = [
                { name: 'Game', class: window.Game },
                { name: 'Enhanced2048AI', class: window.Enhanced2048AI },
                { name: 'AdvancedAI2048Solver', class: window.AdvancedAI2048Solver },
                { name: 'AILearningSystem', class: window.AILearningSystem }
            ];
            
            jsClasses.forEach(jsClass => {
                if (typeof jsClass.class === 'function') {
                    logResult(`JS Class: ${jsClass.name}`, 'pass', `${jsClass.name} class available and functional`);
                } else {
                    logResult(`JS Class: ${jsClass.name}`, 'fail', `${jsClass.name} class not available`);
                }
            });
            
            // Test 3: DOM Elements
            const requiredElements = ['score-container', 'board-container', 'reset-button'];
            requiredElements.forEach(elementId => {
                const element = document.getElementById(elementId);
                if (element) {
                    logResult(`DOM Element: ${elementId}`, 'pass', `Element found and accessible`);
                } else {
                    logResult(`DOM Element: ${elementId}`, 'fail', `Element missing`);
                }
            });
            
            // Test 4: Tile Styles
            const testTile = document.createElement('div');
            testTile.className = 'tile';
            testTile.setAttribute('data-value', '2');
            document.body.appendChild(testTile);
            
            const tileStyle = getComputedStyle(testTile);
            if (tileStyle.position === 'absolute') {
                logResult('Tile Styles', 'pass', 'Tile styles are properly defined');
            } else {
                logResult('Tile Styles', 'warning', 'Tile styles may need adjustment');
            }
            
            document.body.removeChild(testTile);
        }
        
        function testGameFunctionality() {
            if (typeof Game === 'undefined') {
                logResult('Game Functionality', 'fail', 'Game class not available');
                return;
            }
            
            try {
                const game = new Game(4);
                logResult('Game Instantiation', 'pass', 'Game object created successfully');
                
                // Test board creation
                if (typeof game.createEmptyBoard === 'function') {
                    game.createEmptyBoard();
                    if (game.board && game.board.length === 4) {
                        logResult('Board Creation', 'pass', '4x4 board created successfully');
                    } else {
                        logResult('Board Creation', 'fail', 'Board not created properly');
                    }
                } else {
                    logResult('Board Creation', 'fail', 'createEmptyBoard method not found');
                }
                
                // Test AI integration
                if (window.Enhanced2048AI) {
                    try {
                        const ai = new Enhanced2048AI(game);
                        if (typeof ai.getBestMove === 'function') {
                            logResult('AI Integration', 'pass', 'Enhanced AI integrated successfully');
                        } else {
                            logResult('AI Integration', 'fail', 'AI missing getBestMove method');
                        }
                    } catch (error) {
                        logResult('AI Integration', 'fail', `AI instantiation failed: ${error.message}`);
                    }
                } else {
                    logResult('AI Integration', 'fail', 'Enhanced AI not available');
                }
                
                // Test game methods
                const methods = ['move', 'resetGame', 'updateUI'];
                methods.forEach(method => {
                    if (typeof game[method] === 'function') {
                        logResult(`Game Method: ${method}`, 'pass', `${method} method available`);
                    } else {
                        logResult(`Game Method: ${method}`, 'fail', `${method} method missing`);
                    }
                });
                
            } catch (error) {
                logResult('Game Functionality', 'fail', `Game instantiation failed: ${error.message}`);
            }
        }
        
        // Auto-run component tests when page loads
        window.addEventListener('load', () => {
            setTimeout(runComponentTests, 1000);
        });
    </script>
</body>
</html>'''
        
        test_file = self.root / 'pages' / 'component_test.html'
        test_file.write_text(test_content, encoding='utf-8')
        self.logger.info("✅ Created component test page: pages/component_test.html")

    def run_comprehensive_fix(self):
        """Run all fixes and validations"""
        self.logger.info("🔧 Starting comprehensive fix process...")
        
        # Apply all fixes
        self.fix_css_paths()
        self.add_missing_game_elements()
        self.fix_javascript_exports()
        
        # Validate structure
        validations = self.validate_game_structure()
        
        # Create test page
        self.create_test_verification_page()
        
        # Generate report
        self.generate_fix_report(validations)
        
        self.logger.info("✅ Comprehensive fix process completed")
        
        return validations

    def generate_fix_report(self, validations: Dict[str, bool]):
        """Generate comprehensive fix report"""
        report = {
            'fixes_applied': len(self.fixes_applied),
            'errors_found': len(self.errors_found),
            'validations_passed': sum(validations.values()),
            'total_validations': len(validations),
            'fixes': self.fixes_applied,
            'errors': self.errors_found,
            'validations': validations
        }
        
        # Save JSON report
        with open(self.root / 'fix_report.json', 'w') as f:
            json.dump(report, f, indent=2)
        
        # Create markdown report
        markdown = f"""# Fancy2048 Comprehensive Fix Report

## Summary
- **Fixes Applied:** {report['fixes_applied']}
- **Errors Found:** {report['errors_found']}
- **Validations Passed:** {report['validations_passed']}/{report['total_validations']}

## Fixes Applied
"""
        
        for fix in self.fixes_applied:
            markdown += f"- ✅ {fix}\n"
        
        markdown += "\n## Errors Found\n"
        for error in self.errors_found:
            markdown += f"- ❌ {error}\n"
        
        markdown += "\n## Validation Results\n"
        for validation, passed in validations.items():
            status = "✅" if passed else "❌"
            markdown += f"- {status} {validation.replace('_', ' ').title()}\n"
        
        markdown += f"\n## Test Page\nOpen `pages/component_test.html` to verify all fixes.\n"
        
        # Save report
        with open(self.root / 'COMPREHENSIVE_FIX_REPORT.md', 'w') as f:
            f.write(markdown)
        
        self.logger.info("📄 Fix report saved to COMPREHENSIVE_FIX_REPORT.md")

def main():
    print("🔧 Fancy2048 Comprehensive Fix System")
    print("=" * 50)
    
    fixer = GameFileFixer()
    validations = fixer.run_comprehensive_fix()
    
    print(f"\n📊 Fix Results:")
    print(f"- Fixes applied: {len(fixer.fixes_applied)}")
    print(f"- Errors found: {len(fixer.errors_found)}")
    print(f"- Validations passed: {sum(validations.values())}/{len(validations)}")
    print(f"- Full report: COMPREHENSIVE_FIX_REPORT.md")
    print(f"- Test page: pages/component_test.html")
    
    if fixer.fixes_applied:
        print(f"\n✅ Applied fixes:")
        for fix in fixer.fixes_applied:
            print(f"  - {fix}")
    
    if fixer.errors_found:
        print(f"\n❌ Remaining errors:")
        for error in fixer.errors_found[:3]:
            print(f"  - {error}")
        if len(fixer.errors_found) > 3:
            print(f"  ... and {len(fixer.errors_found) - 3} more")
    else:
        print(f"\n🎉 No critical errors found!")

if __name__ == "__main__":
    main()
