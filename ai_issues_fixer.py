#!/usr/bin/env python3
"""
Focused AI Issues Detection and Fixing for Fancy2048
Direct analysis and fixes for AI functionality problems
"""

import re
import json
from pathlib import Path
from typing import List, Dict

class AIIssuesFixer:
    def __init__(self):
        self.root = Path("/workspaces/Fancy2048")
        self.issues_found = []
        self.fixes_applied = []
        
    def check_ai_file_structure(self):
        """Check AI files for common issues"""
        ai_files = {
            'scripts/enhanced_ai.js': 'Enhanced2048AI',
            'scripts/advanced_ai_solver.js': 'AdvancedAI2048Solver', 
            'scripts/ai_learning_system.js': 'AILearningSystem'
        }
        
        for file_path, class_name in ai_files.items():
            full_path = self.root / file_path
            
            if not full_path.exists():
                self.issues_found.append(f"❌ Missing AI file: {file_path}")
                continue
                
            content = full_path.read_text(encoding='utf-8')
            
            # Check class definition
            if f'class {class_name}' not in content:
                self.issues_found.append(f"❌ Missing class definition: {class_name} in {file_path}")
                continue
            
            # Check getBestMove method
            if 'getBestMove' not in content:
                self.issues_found.append(f"❌ Missing getBestMove method in {class_name}")
            
            # Check global export
            export_patterns = [
                f'window.{class_name} = {class_name}',
                f'window.{class_name}={class_name}',
                f'window["{class_name}"] = {class_name}'
            ]
            
            has_export = any(pattern in content for pattern in export_patterns)
            if not has_export:
                self.issues_found.append(f"❌ Missing global export for {class_name}")
                self.fix_missing_export(file_path, class_name, content)
        
        return len(self.issues_found) == 0
    
    def fix_missing_export(self, file_path, class_name, content):
        """Add missing global export"""
        export_line = f'\n// Make available globally\nwindow.{class_name} = {class_name};\n'
        
        if f'window.{class_name}' not in content:
            new_content = content + export_line
            full_path = self.root / file_path
            full_path.write_text(new_content, encoding='utf-8')
            self.fixes_applied.append(f"✅ Added global export for {class_name}")
    
    def test_ai_instantiation(self):
        """Test if AI classes can be instantiated"""
        # Create a simple test HTML to check AI loading
        test_html = '''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>AI Quick Test</title>
</head>
<body>
    <div id="test-results"></div>
    
    <!-- Load AI scripts -->
    <script src="scripts/ai_learning_system.js"></script>
    <script src="scripts/enhanced_ai.js"></script>
    <script src="scripts/advanced_ai_solver.js"></script>
    <script src="scripts/game.js"></script>

    <script>
        const results = document.getElementById('test-results');
        
        function logResult(test, success, message) {
            const div = document.createElement('div');
            div.style.color = success ? 'green' : 'red';
            div.textContent = `${test}: ${success ? '✅' : '❌'} ${message}`;
            results.appendChild(div);
            
            // Also send to console
            console.log(`${test}: ${success ? 'PASS' : 'FAIL'} - ${message}`);
        }
        
        // Wait for scripts to load
        setTimeout(() => {
            // Test 1: Check if classes exist
            logResult('Enhanced AI Class', typeof Enhanced2048AI === 'function', 
                     typeof Enhanced2048AI === 'function' ? 'Class loaded' : 'Class not found');
            
            logResult('Advanced AI Class', typeof AdvancedAI2048Solver === 'function',
                     typeof AdvancedAI2048Solver === 'function' ? 'Class loaded' : 'Class not found');
            
            logResult('Learning System Class', typeof AILearningSystem === 'function',
                     typeof AILearningSystem === 'function' ? 'Class loaded' : 'Class not found');
            
            // Test 2: Try to instantiate (with mock game object)
            const mockGame = { board: [[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]], score: 0 };
            
            try {
                if (typeof Enhanced2048AI === 'function') {
                    const enhancedAI = new Enhanced2048AI(mockGame);
                    const move = enhancedAI.getBestMove();
                    logResult('Enhanced AI Function', move !== undefined, 
                             `getBestMove returned: ${move}`);
                } else {
                    logResult('Enhanced AI Function', false, 'Class not available');
                }
            } catch (error) {
                logResult('Enhanced AI Function', false, `Error: ${error.message}`);
            }
            
            try {
                if (typeof AdvancedAI2048Solver === 'function') {
                    const advancedAI = new AdvancedAI2048Solver(mockGame);
                    const move = advancedAI.getBestMove();
                    logResult('Advanced AI Function', move !== undefined,
                             `getBestMove returned: ${move}`);
                } else {
                    logResult('Advanced AI Function', false, 'Class not available');
                }
            } catch (error) {
                logResult('Advanced AI Function', false, `Error: ${error.message}`);
            }
            
            try {
                if (typeof AILearningSystem === 'function') {
                    const learningAI = new AILearningSystem();
                    learningAI.recordMove(mockGame.board, 'right', mockGame.board, 0);
                    logResult('Learning System Function', true, 'recordMove works');
                } else {
                    logResult('Learning System Function', false, 'Class not available');
                }
            } catch (error) {
                logResult('Learning System Function', false, `Error: ${error.message}`);
            }
            
            // Send results to parent window if available
            const testData = {
                timestamp: new Date().toISOString(),
                results: Array.from(results.children).map(div => div.textContent)
            };
            
            if (window.parent !== window) {
                window.parent.postMessage(testData, '*');
            }
            
        }, 1000);
    </script>
</body>
</html>'''
        
        test_file = self.root / 'ai_quick_test.html'
        test_file.write_text(test_html, encoding='utf-8')
        return str(test_file)
    
    def check_game_ai_integration(self):
        """Check if game.js properly integrates with AI"""
        game_file = self.root / 'scripts/game.js'
        
        if not game_file.exists():
            self.issues_found.append("❌ Game.js file missing")
            return False
        
        content = game_file.read_text(encoding='utf-8')
        
        # Check for AI-related methods in game
        ai_methods = ['startAI', 'stopAI', 'aiMove', 'getBestMove']
        missing_methods = []
        
        for method in ai_methods:
            if method not in content:
                missing_methods.append(method)
        
        if missing_methods:
            self.issues_found.append(f"❌ Game missing AI methods: {', '.join(missing_methods)}")
            return False
        
        return True
    
    def fix_game_ai_integration(self):
        """Add basic AI integration to game.js if missing"""
        game_file = self.root / 'scripts/game.js'
        
        if not game_file.exists():
            return
        
        content = game_file.read_text(encoding='utf-8')
        
        # Check if AI integration already exists
        if 'aiPlayer' in content or 'this.ai' in content:
            return  # Already has AI integration
        
        # Add basic AI integration methods
        ai_integration = '''
  // AI Integration Methods
  initializeAI() {
    try {
      if (typeof Enhanced2048AI === 'function') {
        this.enhancedAI = new Enhanced2048AI(this);
        console.log('Enhanced AI initialized');
      }
      
      if (typeof AdvancedAI2048Solver === 'function') {
        this.advancedAI = new AdvancedAI2048Solver(this);
        console.log('Advanced AI initialized');
      }
      
      if (typeof AILearningSystem === 'function') {
        this.learningSystem = new AILearningSystem();
        console.log('Learning System initialized');
      }
    } catch (error) {
      console.warn('AI initialization failed:', error);
    }
  }
  
  getBestAIMove() {
    if (this.enhancedAI && typeof this.enhancedAI.getBestMove === 'function') {
      try {
        return this.enhancedAI.getBestMove();
      } catch (error) {
        console.warn('Enhanced AI failed:', error);
      }
    }
    
    if (this.advancedAI && typeof this.advancedAI.getBestMove === 'function') {
      try {
        return this.advancedAI.getBestMove();
      } catch (error) {
        console.warn('Advanced AI failed:', error);
      }
    }
    
    // Fallback to random move
    const moves = ['up', 'down', 'left', 'right'];
    return moves[Math.floor(Math.random() * moves.length)];
  }
  
  makeAIMove() {
    const move = this.getBestAIMove();
    if (move && this.canMove && this.canMove(move)) {
      this.move(move);
      return true;
    }
    return false;
  }
'''
        
        # Find the end of the class and insert AI methods
        lines = content.split('\n')
        class_end = -1
        
        for i in range(len(lines) - 1, -1, -1):
            if 'class Game' in lines[i]:
                # Find the closing brace of this class
                brace_count = 0
                for j in range(i, len(lines)):
                    brace_count += lines[j].count('{') - lines[j].count('}')
                    if brace_count == 0 and '}' in lines[j]:
                        class_end = j
                        break
                break
        
        if class_end > 0:
            # Insert AI methods before the closing brace
            lines.insert(class_end, ai_integration)
            
            # Also add AI initialization to constructor or initializeGame method
            for i, line in enumerate(lines):
                if 'initializeGame()' in line and '{' in line:
                    # Add AI initialization call
                    lines.insert(i + 2, '    this.initializeAI();')
                    break
            
            new_content = '\n'.join(lines)
            game_file.write_text(new_content, encoding='utf-8')
            self.fixes_applied.append("✅ Added AI integration methods to Game class")
    
    def generate_comprehensive_report(self):
        """Generate a comprehensive report"""
        report = {
            'timestamp': '2025-09-02 18:50:00',
            'issues_found': self.issues_found,
            'fixes_applied': self.fixes_applied,
            'total_issues': len(self.issues_found),
            'total_fixes': len(self.fixes_applied)
        }
        
        # Save JSON report
        with open(self.root / 'ai_fixes_report.json', 'w') as f:
            json.dump(report, f, indent=2)
        
        # Generate markdown report
        markdown = f"""# 🤖 AI System Fix Report - Focused

**Generated:** {report['timestamp']}  
**Issues Found:** {report['total_issues']}  
**Fixes Applied:** {report['total_fixes']}

## 🔍 Issues Discovered

"""
        
        for issue in self.issues_found:
            markdown += f"- {issue}\n"
        
        markdown += "\n## ✅ Fixes Applied\n\n"
        
        for fix in self.fixes_applied:
            markdown += f"- {fix}\n"
        
        markdown += f"""

## 🧪 Testing

### Quick AI Test
Open `ai_quick_test.html` to verify AI functionality:
```
http://localhost:8003/ai_quick_test.html
```

### Full AI Test
Open `ai_test_comprehensive.html` for complete testing:
```  
http://localhost:8003/ai_test_comprehensive.html
```

## 🎯 Next Steps

1. Verify all AI classes load correctly
2. Test AI move generation
3. Check AI integration with game
4. Test AI performance and functionality

{'🎉 AI system should now be working!' if len(self.fixes_applied) > 0 else '⚠️ Manual verification needed'}
"""
        
        with open(self.root / 'AI_FIXES_REPORT.md', 'w') as f:
            f.write(markdown)
        
        return report
    
    def run_complete_fix(self):
        """Run complete AI fix process"""
        print("🤖 Analyzing AI System Issues...")
        
        # Step 1: Check AI file structure
        structure_ok = self.check_ai_file_structure()
        
        # Step 2: Check game integration
        integration_ok = self.check_game_ai_integration()
        
        # Step 3: Apply fixes if needed
        if not integration_ok:
            self.fix_game_ai_integration()
        
        # Step 4: Create test files
        test_file = self.test_ai_instantiation()
        
        # Step 5: Generate report
        report = self.generate_comprehensive_report()
        
        return report, test_file

def main():
    print("🔧 Fancy2048 AI System - Focused Fix")
    print("=" * 40)
    
    fixer = AIIssuesFixer()
    report, test_file = fixer.run_complete_fix()
    
    print(f"\n📊 Results:")
    print(f"- Issues found: {report['total_issues']}")
    print(f"- Fixes applied: {report['total_fixes']}")
    print(f"- Test file: {test_file}")
    print(f"- Report: AI_FIXES_REPORT.md")
    
    if report['issues_found']:
        print(f"\n🔍 Issues Found:")
        for issue in report['issues_found']:
            print(f"  {issue}")
    
    if report['fixes_applied']:
        print(f"\n✅ Fixes Applied:")
        for fix in report['fixes_applied']:
            print(f"  {fix}")
    
    print(f"\n🧪 Test the AI system at:")
    print(f"  http://localhost:8003/ai_quick_test.html")

if __name__ == "__main__":
    main()
