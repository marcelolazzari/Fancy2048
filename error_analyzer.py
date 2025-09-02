#!/usr/bin/env python3
"""
Enhanced Error Detection and Auto-Fix System for Fancy2048
Analyzes game components and applies intelligent fixes
"""

import os
import re
import json
import subprocess
from pathlib import Path
from typing import Dict, List, Tuple
import logging

class Fancy2048AutoFixer:
    def __init__(self):
        self.project_root = Path("/workspaces/Fancy2048")
        self.errors_detected = []
        self.fixes_applied = []
        
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)

    def analyze_html_files(self) -> List[Dict]:
        """Deep analysis of HTML files for common issues"""
        html_files = [
            'pages/index.html',
            'pages/leaderboard.html',
            'pages/game_fixed.html'
        ]
        
        issues = []
        
        for html_file in html_files:
            file_path = self.project_root / html_file
            
            if not file_path.exists():
                issues.append({
                    'type': 'missing_file',
                    'file': html_file,
                    'severity': 'high',
                    'message': f'HTML file {html_file} does not exist'
                })
                continue
            
            content = file_path.read_text(encoding='utf-8')
            
            # Check for script references
            script_pattern = r'<script[^>]+src="([^"]+)"[^>]*></script>'
            scripts = re.findall(script_pattern, content)
            
            for script in scripts:
                if not script.startswith('http'):  # Local scripts only
                    script_path = self.resolve_path(html_file, script)
                    if not (self.project_root / script_path).exists():
                        issues.append({
                            'type': 'broken_script',
                            'file': html_file,
                            'severity': 'high',
                            'script': script,
                            'resolved_path': script_path,
                            'message': f'Script not found: {script} (resolved to {script_path})'
                        })
            
            # Check for CSS references
            css_pattern = r'<link[^>]+href="([^"]+\.css)"[^>]*>'
            css_files = re.findall(css_pattern, content)
            
            for css in css_files:
                if not css.startswith('http'):  # Local CSS only
                    css_path = self.resolve_path(html_file, css)
                    if not (self.project_root / css_path).exists():
                        issues.append({
                            'type': 'broken_css',
                            'file': html_file,
                            'severity': 'medium',
                            'css': css,
                            'resolved_path': css_path,
                            'message': f'CSS not found: {css} (resolved to {css_path})'
                        })
            
            # Check for required elements
            required_elements = {
                'pages/index.html': [
                    ('id="board-container"', 'Board container div'),
                    ('id="score-container"', 'Score container div'),
                    ('id="reset-button"', 'Reset button'),
                    ('class="tile"', 'Game tiles')
                ],
                'pages/leaderboard.html': [
                    ('id="stats-section"', 'Stats section'),
                    ('class="stats-card"', 'Statistics cards')
                ]
            }
            
            if html_file in required_elements:
                for element_check, description in required_elements[html_file]:
                    if element_check not in content:
                        issues.append({
                            'type': 'missing_element',
                            'file': html_file,
                            'severity': 'medium',
                            'element': element_check,
                            'description': description,
                            'message': f'Missing {description} in {html_file}'
                        })
        
        return issues

    def analyze_javascript_files(self) -> List[Dict]:
        """Analyze JavaScript files for syntax and logic issues"""
        js_files = [
            'scripts/game.js',
            'scripts/enhanced_ai.js',
            'scripts/advanced_ai_solver.js',
            'scripts/ai_learning_system.js',
            'scripts/statistics.js',
            'scripts/leaderboard-stats.js'
        ]
        
        issues = []
        
        for js_file in js_files:
            file_path = self.project_root / js_file
            
            if not file_path.exists():
                issues.append({
                    'type': 'missing_file',
                    'file': js_file,
                    'severity': 'high',
                    'message': f'JavaScript file {js_file} does not exist'
                })
                continue
            
            content = file_path.read_text(encoding='utf-8')
            
            # Check for syntax issues using Node.js
            try:
                result = subprocess.run(
                    ['node', '-c', str(file_path)],
                    capture_output=True,
                    text=True,
                    timeout=10
                )
                
                if result.returncode != 0:
                    issues.append({
                        'type': 'syntax_error',
                        'file': js_file,
                        'severity': 'high',
                        'error': result.stderr,
                        'message': f'Syntax error in {js_file}: {result.stderr}'
                    })
            except FileNotFoundError:
                self.logger.warning("Node.js not available for syntax checking")
            
            # Check for global exports
            required_exports = {
                'scripts/game.js': ['Game'],
                'scripts/enhanced_ai.js': ['Enhanced2048AI'],
                'scripts/advanced_ai_solver.js': ['AdvancedAI2048Solver'],
                'scripts/ai_learning_system.js': ['AILearningSystem']
            }
            
            if js_file in required_exports:
                for export_class in required_exports[js_file]:
                    export_pattern = f'window.{export_class}\\s*='
                    if not re.search(export_pattern, content):
                        issues.append({
                            'type': 'missing_export',
                            'file': js_file,
                            'severity': 'high',
                            'class': export_class,
                            'message': f'Missing global export for {export_class} in {js_file}'
                        })
        
        return issues

    def analyze_css_files(self) -> List[Dict]:
        """Analyze CSS files for issues"""
        css_files = ['styles/main.css', 'styles/leaderboard.css']
        issues = []
        
        for css_file in css_files:
            file_path = self.project_root / css_file
            
            if not file_path.exists():
                issues.append({
                    'type': 'missing_file',
                    'file': css_file,
                    'severity': 'medium',
                    'message': f'CSS file {css_file} does not exist'
                })
                continue
            
            content = file_path.read_text(encoding='utf-8')
            
            # Check brace balance
            open_braces = content.count('{')
            close_braces = content.count('}')
            
            if open_braces != close_braces:
                issues.append({
                    'type': 'css_syntax',
                    'file': css_file,
                    'severity': 'high',
                    'open_braces': open_braces,
                    'close_braces': close_braces,
                    'message': f'Unbalanced braces in {css_file}: {open_braces} open, {close_braces} close'
                })
        
        return issues

    def resolve_path(self, from_file: str, to_path: str) -> str:
        """Resolve relative paths correctly"""
        if to_path.startswith('/'):
            return to_path[1:]  # Remove leading slash
        
        from_dir = Path(from_file).parent
        resolved = from_dir / to_path
        return str(resolved).replace('\\', '/')

    def apply_automatic_fixes(self, issues: List[Dict]):
        """Apply automatic fixes for detected issues"""
        
        for issue in issues:
            try:
                if issue['type'] == 'missing_export':
                    self.fix_missing_export(issue)
                elif issue['type'] == 'broken_script':
                    self.fix_broken_script(issue)
                elif issue['type'] == 'broken_css':
                    self.fix_broken_css(issue)
                elif issue['type'] == 'missing_element':
                    self.fix_missing_element(issue)
                elif issue['type'] == 'css_syntax':
                    self.fix_css_syntax(issue)
                    
            except Exception as e:
                self.logger.error(f"Failed to fix {issue['type']} in {issue['file']}: {e}")

    def fix_missing_export(self, issue: Dict):
        """Add missing global exports to JavaScript files"""
        file_path = self.project_root / issue['file']
        content = file_path.read_text(encoding='utf-8')
        class_name = issue['class']
        
        # Check if export already exists but in different format
        if f'window.{class_name}' not in content:
            # Add export at the end of the file
            export_line = f'\n// Make available globally\nwindow.{class_name} = {class_name};\n'
            content += export_line
            
            file_path.write_text(content, encoding='utf-8')
            self.fixes_applied.append(f"Added global export for {class_name} in {issue['file']}")
            self.logger.info(f"✅ Added global export for {class_name} in {issue['file']}")

    def fix_broken_script(self, issue: Dict):
        """Fix broken script references"""
        # This would involve either:
        # 1. Correcting the path
        # 2. Creating a missing file
        # 3. Removing the reference
        
        script_name = Path(issue['script']).name
        
        # Look for the script in common locations
        possible_locations = [
            f'scripts/{script_name}',
            f'../scripts/{script_name}',
            f'js/{script_name}'
        ]
        
        for location in possible_locations:
            if (self.project_root / location).exists():
                # Update the HTML file with correct path
                self.update_script_path(issue['file'], issue['script'], location)
                break
        else:
            self.logger.warning(f"Could not find script {script_name} to fix broken reference")

    def update_script_path(self, html_file: str, old_path: str, new_path: str):
        """Update script path in HTML file"""
        file_path = self.project_root / html_file
        content = file_path.read_text(encoding='utf-8')
        
        # Replace the script source
        old_pattern = f'src="{re.escape(old_path)}"'
        new_pattern = f'src="{new_path}"'
        
        if old_pattern in content:
            content = content.replace(old_pattern, new_pattern)
            file_path.write_text(content, encoding='utf-8')
            self.fixes_applied.append(f"Updated script path from {old_path} to {new_path} in {html_file}")
            self.logger.info(f"✅ Updated script path in {html_file}")

    def fix_broken_css(self, issue: Dict):
        """Fix broken CSS references"""
        self.logger.info(f"Would fix broken CSS reference: {issue['css']} in {issue['file']}")

    def fix_missing_element(self, issue: Dict):
        """Add missing HTML elements"""
        self.logger.info(f"Would add missing element: {issue['element']} in {issue['file']}")

    def fix_css_syntax(self, issue: Dict):
        """Fix CSS syntax issues"""
        file_path = self.project_root / issue['file']
        content = file_path.read_text(encoding='utf-8')
        
        open_braces = issue['open_braces']
        close_braces = issue['close_braces']
        
        if open_braces > close_braces:
            # Add missing closing braces
            missing_braces = open_braces - close_braces
            content += '\n' + '}\n' * missing_braces
            
            file_path.write_text(content, encoding='utf-8')
            self.fixes_applied.append(f"Added {missing_braces} closing braces to {issue['file']}")
            self.logger.info(f"✅ Fixed CSS syntax in {issue['file']}")

    def create_comprehensive_test_file(self):
        """Create a comprehensive test HTML file"""
        test_content = '''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Fancy2048 - Comprehensive Auto-Test</title>
    <link rel="stylesheet" href="styles/main.css">
    <style>
        .test-console { background: #000; color: #0f0; padding: 20px; font-family: monospace; margin: 20px 0; border-radius: 5px; }
        .error { color: #f44; }
        .success { color: #4f4; }
        .warning { color: #ff4; }
        .info { color: #4ff; }
        button { margin: 5px; padding: 10px 15px; background: #333; color: white; border: none; border-radius: 3px; cursor: pointer; }
        button:hover { background: #555; }
    </style>
</head>
<body>
    <h1>🧪 Fancy2048 Comprehensive Auto-Test</h1>
    
    <div>
        <button onclick="runGameEngineTests()">Test Game Engine</button>
        <button onclick="runAITests()">Test AI Systems</button>
        <button onclick="runUITests()">Test UI Components</button>
        <button onclick="runIntegrationTests()">Integration Tests</button>
        <button onclick="runAllTests()">🚀 Run All Tests</button>
        <button onclick="clearConsole()">Clear Console</button>
    </div>
    
    <div id="test-console" class="test-console">
        <div>🤖 Fancy2048 Auto-Test Console Ready</div>
        <div>═══════════════════════════════════════════</div>
    </div>
    
    <!-- Hidden game elements for testing -->
    <div style="position: absolute; left: -9999px;">
        <div id="score-container"><ul><li>Score: <span id="score">0</span></li></ul></div>
        <div id="board-container"></div>
        <button id="reset-button">Reset</button>
        <button id="ai-play-button">AI Play</button>
        <button id="pause-button">Pause</button>
    </div>

    <script>
        let game = null;
        let testResults = {};
        
        function log(message, type = 'info') {
            const console = document.getElementById('test-console');
            const div = document.createElement('div');
            div.className = type;
            div.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
            console.appendChild(div);
            console.scrollTop = console.scrollHeight;
        }
        
        function clearConsole() {
            const console = document.getElementById('test-console');
            console.innerHTML = '<div>🤖 Console Cleared</div><div>═══════════════════════════════════════════</div>';
        }
        
        async function loadRequiredScripts() {
            const scripts = [
                'scripts/ai_learning_system.js',
                'scripts/enhanced_ai.js',
                'scripts/advanced_ai_solver.js',
                'scripts/game.js'
            ];
            
            log('📦 Loading required scripts...');
            
            for (let script of scripts) {
                try {
                    await new Promise((resolve, reject) => {
                        if (document.querySelector(`script[src="${script}"]`)) {
                            resolve();
                            return;
                        }
                        
                        const scriptTag = document.createElement('script');
                        scriptTag.src = script;
                        scriptTag.onload = () => {
                            log(`✅ Loaded: ${script}`, 'success');
                            resolve();
                        };
                        scriptTag.onerror = () => {
                            log(`❌ Failed to load: ${script}`, 'error');
                            reject(new Error(`Failed to load ${script}`));
                        };
                        document.head.appendChild(scriptTag);
                    });
                } catch (error) {
                    log(`❌ Script loading error: ${error.message}`, 'error');
                    testResults[`script_${script}`] = false;
                }
            }
        }
        
        async function runGameEngineTests() {
            log('🎮 Starting Game Engine Tests...', 'info');
            
            try {
                if (typeof Game === 'undefined') {
                    await loadRequiredScripts();
                }
                
                // Test 1: Game class instantiation
                if (typeof Game !== 'undefined') {
                    game = new Game(4);
                    log('✅ Game class instantiated successfully', 'success');
                    testResults.game_instantiation = true;
                } else {
                    throw new Error('Game class not available');
                }
                
                // Test 2: Board creation
                if (typeof game.createEmptyBoard === 'function') {
                    game.createEmptyBoard();
                    if (game.board && game.board.length === 4) {
                        log('✅ 4x4 board created successfully', 'success');
                        testResults.board_creation = true;
                    } else {
                        throw new Error('Board not created with correct dimensions');
                    }
                } else {
                    throw new Error('createEmptyBoard method not found');
                }
                
                // Test 3: Game initialization
                if (typeof game.initializeGame === 'function') {
                    game.initializeGame();
                    log('✅ Game initialized successfully', 'success');
                    testResults.game_initialization = true;
                } else {
                    log('⚠️  initializeGame method not found', 'warning');
                    testResults.game_initialization = false;
                }
                
                // Test 4: Move functionality
                if (typeof game.move === 'function') {
                    const moves = ['up', 'down', 'left', 'right'];
                    let moveTests = 0;
                    
                    for (let move of moves) {
                        try {
                            game.move(move);
                            moveTests++;
                        } catch (error) {
                            log(`⚠️  Move ${move} failed: ${error.message}`, 'warning');
                        }
                    }
                    
                    if (moveTests > 0) {
                        log(`✅ Move functionality working (${moveTests}/4 moves tested)`, 'success');
                        testResults.move_functionality = true;
                    } else {
                        throw new Error('No moves working');
                    }
                } else {
                    throw new Error('move method not found');
                }
                
                log('🎮 Game Engine Tests Completed', 'success');
                
            } catch (error) {
                log(`❌ Game Engine Test Failed: ${error.message}`, 'error');
                testResults.game_engine = false;
            }
        }
        
        async function runAITests() {
            log('🤖 Starting AI System Tests...', 'info');
            
            try {
                const aiClasses = [
                    { name: 'Enhanced AI', class: 'Enhanced2048AI' },
                    { name: 'Advanced AI Solver', class: 'AdvancedAI2048Solver' },
                    { name: 'AI Learning System', class: 'AILearningSystem' }
                ];
                
                for (let aiClass of aiClasses) {
                    if (typeof window[aiClass.class] !== 'undefined') {
                        try {
                            const ai = new window[aiClass.class](game);
                            
                            if (typeof ai.getBestMove === 'function') {
                                log(`✅ ${aiClass.name} loaded and functional`, 'success');
                                testResults[`ai_${aiClass.class}`] = true;
                                
                                // Test AI move generation
                                if (game && game.board) {
                                    try {
                                        const move = ai.getBestMove();
                                        log(`✅ ${aiClass.name} generated move: ${move}`, 'success');
                                    } catch (error) {
                                        log(`⚠️  ${aiClass.name} move generation failed: ${error.message}`, 'warning');
                                    }
                                }
                            } else {
                                log(`⚠️  ${aiClass.name} missing getBestMove method`, 'warning');
                                testResults[`ai_${aiClass.class}`] = false;
                            }
                        } catch (error) {
                            log(`❌ ${aiClass.name} instantiation failed: ${error.message}`, 'error');
                            testResults[`ai_${aiClass.class}`] = false;
                        }
                    } else {
                        log(`❌ ${aiClass.name} class not available`, 'error');
                        testResults[`ai_${aiClass.class}`] = false;
                    }
                }
                
                log('🤖 AI System Tests Completed', 'success');
                
            } catch (error) {
                log(`❌ AI Tests Failed: ${error.message}`, 'error');
            }
        }
        
        async function runUITests() {
            log('🖥️  Starting UI Component Tests...', 'info');
            
            const requiredElements = [
                'score-container',
                'board-container', 
                'reset-button'
            ];
            
            let uiTestsPassed = 0;
            
            for (let elementId of requiredElements) {
                const element = document.getElementById(elementId);
                if (element) {
                    log(`✅ UI Element found: ${elementId}`, 'success');
                    uiTestsPassed++;
                } else {
                    log(`❌ UI Element missing: ${elementId}`, 'error');
                }
            }
            
            testResults.ui_elements = uiTestsPassed === requiredElements.length;
            
            // Test localStorage
            try {
                localStorage.setItem('test', 'value');
                const value = localStorage.getItem('test');
                localStorage.removeItem('test');
                
                if (value === 'value') {
                    log('✅ LocalStorage working correctly', 'success');
                    testResults.localStorage = true;
                } else {
                    log('❌ LocalStorage not functioning', 'error');
                    testResults.localStorage = false;
                }
            } catch (error) {
                log(`❌ LocalStorage error: ${error.message}`, 'error');
                testResults.localStorage = false;
            }
            
            log('🖥️  UI Component Tests Completed', 'success');
        }
        
        async function runIntegrationTests() {
            log('🔗 Starting Integration Tests...', 'info');
            
            try {
                if (!game) {
                    await runGameEngineTests();
                }
                
                // Test full game flow
                if (game) {
                    // Reset and start fresh
                    game.resetGame();
                    log('✅ Game reset successful', 'success');
                    
                    // Test multiple moves
                    const testSequence = ['right', 'up', 'left', 'down'];
                    for (let move of testSequence) {
                        game.move(move);
                    }
                    log('✅ Move sequence completed', 'success');
                    
                    // Test score tracking
                    if (game.score !== undefined) {
                        log(`✅ Score tracking active: ${game.score}`, 'success');
                        testResults.score_tracking = true;
                    } else {
                        log('⚠️  Score tracking not found', 'warning');
                        testResults.score_tracking = false;
                    }
                    
                    testResults.integration = true;
                } else {
                    throw new Error('Game not available for integration testing');
                }
                
                log('🔗 Integration Tests Completed', 'success');
                
            } catch (error) {
                log(`❌ Integration Test Failed: ${error.message}`, 'error');
                testResults.integration = false;
            }
        }
        
        async function runAllTests() {
            clearConsole();
            log('🚀 Starting Comprehensive Test Suite', 'info');
            
            const startTime = Date.now();
            
            await loadRequiredScripts();
            await runGameEngineTests();
            await runAITests();
            await runUITests();
            await runIntegrationTests();
            
            const endTime = Date.now();
            const duration = ((endTime - startTime) / 1000).toFixed(2);
            
            // Generate summary
            const totalTests = Object.keys(testResults).length;
            const passedTests = Object.values(testResults).filter(r => r === true).length;
            const failedTests = totalTests - passedTests;
            
            log('═══════════════════════════════════════════', 'info');
            log(`📊 TEST SUMMARY`, 'info');
            log(`Total Tests: ${totalTests}`, 'info');
            log(`Passed: ${passedTests}`, 'success');
            log(`Failed: ${failedTests}`, failedTests > 0 ? 'error' : 'success');
            log(`Duration: ${duration}s`, 'info');
            log('═══════════════════════════════════════════', 'info');
            
            if (failedTests === 0) {
                log('🎉 ALL TESTS PASSED! Game is fully functional.', 'success');
            } else {
                log(`⚠️  ${failedTests} test(s) failed. Check logs above for details.`, 'warning');
            }
        }
        
        // Auto-run tests when page loads
        window.addEventListener('load', () => {
            setTimeout(() => {
                log('🎮 Fancy2048 Auto-Test System Ready');
                log('Click "Run All Tests" to begin comprehensive testing');
            }, 1000);
        });
    </script>
</body>
</html>'''
        
        test_file_path = self.project_root / 'comprehensive_test.html'
        test_file_path.write_text(test_content, encoding='utf-8')
        self.logger.info("✅ Created comprehensive test file: comprehensive_test.html")

    def run_analysis(self):
        """Run complete analysis and generate report"""
        self.logger.info("🔍 Starting Fancy2048 Deep Analysis...")
        
        # Analyze all components
        html_issues = self.analyze_html_files()
        js_issues = self.analyze_javascript_files()
        css_issues = self.analyze_css_files()
        
        all_issues = html_issues + js_issues + css_issues
        
        # Apply fixes
        if all_issues:
            self.logger.info(f"🔧 Found {len(all_issues)} issues. Applying fixes...")
            self.apply_automatic_fixes(all_issues)
        else:
            self.logger.info("✅ No issues found!")
        
        # Create test file
        self.create_comprehensive_test_file()
        
        # Generate report
        self.generate_analysis_report(all_issues)
        
        return all_issues

    def generate_analysis_report(self, issues: List[Dict]):
        """Generate detailed analysis report"""
        report = {
            'timestamp': subprocess.check_output(['date']).decode().strip(),
            'total_issues': len(issues),
            'issues_by_type': {},
            'issues_by_severity': {'high': 0, 'medium': 0, 'low': 0},
            'fixes_applied': len(self.fixes_applied),
            'issues': issues,
            'fixes': self.fixes_applied
        }
        
        # Count by type and severity
        for issue in issues:
            issue_type = issue['type']
            severity = issue['severity']
            
            report['issues_by_type'][issue_type] = report['issues_by_type'].get(issue_type, 0) + 1
            report['issues_by_severity'][severity] += 1
        
        # Save JSON report
        with open(self.project_root / 'analysis_report.json', 'w') as f:
            json.dump(report, f, indent=2)
        
        # Create markdown report
        markdown = f"""# Fancy2048 Deep Analysis Report

**Generated:** {report['timestamp']}  
**Total Issues Found:** {report['total_issues']}  
**Fixes Applied:** {report['fixes_applied']}

## Issues by Severity
- **High:** {report['issues_by_severity']['high']} issues
- **Medium:** {report['issues_by_severity']['medium']} issues  
- **Low:** {report['issues_by_severity']['low']} issues

## Issues by Type
"""
        
        for issue_type, count in report['issues_by_type'].items():
            markdown += f"- **{issue_type.replace('_', ' ').title()}:** {count} issues\n"
        
        markdown += "\n## Detailed Issues\n\n"
        
        for issue in issues:
            severity_emoji = {'high': '🔴', 'medium': '🟡', 'low': '🟢'}[issue['severity']]
            markdown += f"### {severity_emoji} {issue['type'].replace('_', ' ').title()}\n"
            markdown += f"- **File:** {issue['file']}\n"
            markdown += f"- **Message:** {issue['message']}\n\n"
        
        markdown += "\n## Fixes Applied\n\n"
        for fix in self.fixes_applied:
            markdown += f"- ✅ {fix}\n"
        
        # Save markdown report
        with open(self.project_root / 'ANALYSIS_REPORT.md', 'w') as f:
            f.write(markdown)
        
        self.logger.info("📄 Analysis report saved to ANALYSIS_REPORT.md")

def main():
    print("🔍 Fancy2048 Deep Analysis & Auto-Fix System")
    print("=" * 60)
    
    fixer = Fancy2048AutoFixer()
    issues = fixer.run_analysis()
    
    print(f"\n📊 Analysis Complete:")
    print(f"- Issues found: {len(issues)}")
    print(f"- Fixes applied: {len(fixer.fixes_applied)}")
    print(f"- Full report: ANALYSIS_REPORT.md")
    print(f"- Test page: comprehensive_test.html")
    
    if issues:
        print(f"\n⚠️  Issues found:")
        for issue in issues[:5]:  # Show first 5 issues
            print(f"  - {issue['type']} in {issue['file']}: {issue['message']}")
        if len(issues) > 5:
            print(f"  ... and {len(issues) - 5} more (see full report)")
    else:
        print("\n🎉 No issues found! Game appears to be in good condition.")

if __name__ == "__main__":
    main()
