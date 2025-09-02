#!/bin/bash

# Fancy2048 Repository Cleanup Script
# Removes unused files, test files, and temporary development artifacts

set -e  # Exit on any error

echo "🧹 Fancy2048 Repository Cleanup Script"
echo "======================================"
echo "This script will remove unused files and clean up the repository."
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to ask for confirmation
confirm() {
    while true; do
        read -p "$1 (y/N): " yn
        case $yn in
            [Yy]* ) return 0;;
            [Nn]* ) return 1;;
            "" ) return 1;;  # Default to No
            * ) echo "Please answer yes or no.";;
        esac
    done
}

# Function to safely remove files
safe_remove() {
    local file="$1"
    if [ -f "$file" ]; then
        echo -e "${YELLOW}Removing:${NC} $file"
        rm "$file"
        return 0
    elif [ -d "$file" ]; then
        echo -e "${YELLOW}Removing directory:${NC} $file"
        rm -rf "$file"
        return 0
    else
        echo -e "${BLUE}Not found (skipping):${NC} $file"
        return 1
    fi
}

# Function to count files for removal
count_files_to_remove() {
    local count=0
    
    # Test files
    for file in \
        "score_dashboard_tester.py" \
        "score_dashboard_fixer.py" \
        "final_score_verifier.py" \
        "ai_system_tester.py" \
        "ai_issues_fixer.py" \
        "ai_final_verifier.py" \
        "comprehensive_fixer.py" \
        "error_analyzer.py" \
        "deep_test_suite.py" \
        "final_validator.py" \
        "comprehensive_test.html" \
        "deep_test_results.html" \
        "deep_test_suite.html" \
        "integration_test.html" \
        "test_all_functionality.html" \
        "test_and_fix_report.html" \
        "test_errors.html" \
        "test_fixed.html" \
        "button_ai_test.html" \
        "ai_quick_test.html" \
        "ai_test_comprehensive.html" \
        "ai_final_verification.html" \
        "score_dashboard_test.html" \
        "final_score_verification.html" \
        "simple_working.html"; do
        [ -f "$file" ] && ((count++))
    done
    
    # Report files
    for file in \
        "*_REPORT.md" \
        "*_report.json" \
        "*_report.log" \
        "test_results.log" \
        "analysis_report.json" \
        "ai_test_report.json" \
        "ai_fixes_report.json" \
        "score_test_report.json" \
        "score_fixes_report.json" \
        "final_validation_results.json" \
        "fix_report.json"; do
        count=$((count + $(ls $file 2>/dev/null | wc -l)))
    done
    
    echo $count
}

# Main cleanup function
perform_cleanup() {
    local removed_count=0
    
    echo -e "${GREEN}Starting cleanup...${NC}"
    echo ""
    
    echo -e "${BLUE}1. Removing Python test scripts...${NC}"
    for file in \
        "score_dashboard_tester.py" \
        "score_dashboard_fixer.py" \
        "final_score_verifier.py" \
        "ai_system_tester.py" \
        "ai_issues_fixer.py" \
        "ai_final_verifier.py" \
        "comprehensive_fixer.py" \
        "error_analyzer.py" \
        "deep_test_suite.py" \
        "final_validator.py"; do
        if safe_remove "$file"; then
            ((removed_count++))
        fi
    done
    echo ""
    
    echo -e "${BLUE}2. Removing HTML test files...${NC}"
    for file in \
        "comprehensive_test.html" \
        "deep_test_results.html" \
        "deep_test_suite.html" \
        "integration_test.html" \
        "test_all_functionality.html" \
        "test_and_fix_report.html" \
        "test_errors.html" \
        "test_fixed.html" \
        "button_ai_test.html" \
        "ai_quick_test.html" \
        "ai_test_comprehensive.html" \
        "ai_final_verification.html" \
        "score_dashboard_test.html" \
        "final_score_verification.html" \
        "simple_working.html"; do
        if safe_remove "$file"; then
            ((removed_count++))
        fi
    done
    echo ""
    
    echo -e "${BLUE}3. Removing report files...${NC}"
    
    # Remove specific report files
    for file in \
        "AI_BUTTON_VERIFICATION_COMPLETE.md" \
        "AI_FINAL_VERIFICATION_REPORT.md" \
        "AI_FIXES_REPORT.md" \
        "AI_SYSTEM_TEST_REPORT.md" \
        "AI_TESTING_COMPLETE_REPORT.md" \
        "ANALYSIS_REPORT.md" \
        "COMPLETE_DEBUG_REPORT.md" \
        "COMPREHENSIVE_FIX_REPORT.md" \
        "DEEP_TEST_REPORT.md" \
        "DEEP_TESTING_COMPLETE_REPORT.md" \
        "FINAL_VALIDATION_REPORT.md" \
        "FINAL_SCORE_VERIFICATION_REPORT.md" \
        "FIX_REPORT.md" \
        "FIXES_SUMMARY.md" \
        "GAME_FIXES_COMPLETE.md" \
        "SCORE_DASHBOARD_TEST_REPORT.md" \
        "SCORE_FIXES_APPLIED_REPORT.md"; do
        if safe_remove "$file"; then
            ((removed_count++))
        fi
    done
    
    # Remove JSON report files
    for file in \
        "analysis_report.json" \
        "ai_test_report.json" \
        "ai_fixes_report.json" \
        "score_test_report.json" \
        "score_fixes_report.json" \
        "final_validation_results.json" \
        "fix_report.json" \
        "test_report.json"; do
        if safe_remove "$file"; then
            ((removed_count++))
        fi
    done
    
    # Remove log files
    for file in \
        "test_results.log"; do
        if safe_remove "$file"; then
            ((removed_count++))
        fi
    done
    echo ""
    
    echo -e "${BLUE}4. Removing duplicate/backup files...${NC}"
    for file in \
        "pages/game_fixed_simple.html" \
        "pages/game_fixed.html" \
        "pages/github-pages-test.html" \
        "pages/index_fixed.html" \
        "scripts/game_complex_backup.js" \
        "scripts/game_simple.js"; do
        if safe_remove "$file"; then
            ((removed_count++))
        fi
    done
    echo ""
    
    echo -e "${BLUE}5. Cleaning up empty directories...${NC}"
    # Remove empty directories (if any)
    find . -type d -empty -print -delete 2>/dev/null || true
    echo ""
    
    echo -e "${GREEN}✅ Cleanup completed!${NC}"
    echo -e "${GREEN}📊 Total files removed: $removed_count${NC}"
    
    return $removed_count
}

# Show current repository status
show_repo_status() {
    echo -e "${BLUE}Current repository status:${NC}"
    echo "Total files: $(find . -type f | wc -l)"
    echo "Python files: $(find . -name "*.py" | wc -l)"
    echo "HTML files: $(find . -name "*.html" | wc -l)"
    echo "JavaScript files: $(find . -name "*.js" | wc -l)"
    echo "CSS files: $(find . -name "*.css" | wc -l)"
    echo "Markdown files: $(find . -name "*.md" | wc -l)"
    echo "JSON files: $(find . -name "*.json" | wc -l)"
    echo ""
}

# Show files that will be removed
preview_cleanup() {
    echo -e "${YELLOW}Files that will be removed:${NC}"
    echo ""
    
    echo -e "${BLUE}Python test scripts:${NC}"
    for file in \
        "score_dashboard_tester.py" \
        "score_dashboard_fixer.py" \
        "final_score_verifier.py" \
        "ai_system_tester.py" \
        "ai_issues_fixer.py" \
        "ai_final_verifier.py" \
        "comprehensive_fixer.py" \
        "error_analyzer.py" \
        "deep_test_suite.py" \
        "final_validator.py"; do
        if [ -f "$file" ]; then
            echo "  - $file"
        fi
    done
    echo ""
    
    echo -e "${BLUE}HTML test files:${NC}"
    for file in \
        "comprehensive_test.html" \
        "deep_test_results.html" \
        "deep_test_suite.html" \
        "integration_test.html" \
        "test_all_functionality.html" \
        "test_and_fix_report.html" \
        "test_errors.html" \
        "test_fixed.html" \
        "button_ai_test.html" \
        "ai_quick_test.html" \
        "ai_test_comprehensive.html" \
        "ai_final_verification.html" \
        "score_dashboard_test.html" \
        "final_score_verification.html" \
        "simple_working.html"; do
        if [ -f "$file" ]; then
            echo "  - $file"
        fi
    done
    echo ""
    
    echo -e "${BLUE}Report and backup files:${NC}"
    ls *_REPORT.md 2>/dev/null | head -10 | sed 's/^/  - /' || echo "  (No report files found)"
    ls *.json 2>/dev/null | grep -E "(report|test)" | head -5 | sed 's/^/  - /' || echo "  (No JSON reports found)"
    echo ""
    
    echo -e "${BLUE}Backup/duplicate files:${NC}"
    for file in \
        "pages/game_fixed_simple.html" \
        "pages/game_fixed.html" \
        "pages/github-pages-test.html" \
        "pages/index_fixed.html" \
        "scripts/game_complex_backup.js" \
        "scripts/game_simple.js"; do
        if [ -f "$file" ]; then
            echo "  - $file"
        fi
    done
    echo ""
}

# Main script execution
main() {
    echo "📁 Repository location: $(pwd)"
    echo ""
    
    # Show current status
    show_repo_status
    
    # Preview what will be removed
    if confirm "🔍 Would you like to see a preview of files that will be removed?"; then
        echo ""
        preview_cleanup
    fi
    
    # Count files to remove
    total_files_to_remove=$(count_files_to_remove)
    echo -e "${YELLOW}📊 Estimated files to remove: $total_files_to_remove${NC}"
    echo ""
    
    # Confirm cleanup
    if confirm "🗑️  Proceed with cleanup? This will permanently remove test files and reports"; then
        echo ""
        removed_count=$(perform_cleanup)
        
        echo ""
        echo -e "${GREEN}🎉 Repository cleanup completed successfully!${NC}"
        echo ""
        
        # Show final status
        echo -e "${BLUE}Final repository status:${NC}"
        show_repo_status
        
        # Show remaining important files
        echo -e "${GREEN}✅ Core game files preserved:${NC}"
        echo "  - pages/index.html (main game)"
        echo "  - pages/leaderboard.html (score dashboard)"
        echo "  - scripts/game.js (game engine)"
        echo "  - scripts/enhanced_ai.js (AI system)"
        echo "  - scripts/advanced_ai_solver.js (advanced AI)"
        echo "  - scripts/ai_learning_system.js (learning AI)"
        echo "  - scripts/statistics.js (score tracking)"
        echo "  - scripts/leaderboard-stats.js (leaderboard)"
        echo "  - styles/main.css (game styling)"
        echo "  - styles/leaderboard.css (dashboard styling)"
        echo "  - README.md (project documentation)"
        echo ""
        
        echo -e "${GREEN}🏆 The Fancy2048 game is ready for production!${NC}"
        echo -e "${BLUE}🎮 Play at: pages/index.html${NC}"
        echo -e "${BLUE}📊 View scores at: pages/leaderboard.html${NC}"
        
    else
        echo ""
        echo -e "${YELLOW}Cleanup cancelled. No files were removed.${NC}"
        exit 0
    fi
}

# Help function
show_help() {
    echo "Fancy2048 Repository Cleanup Script"
    echo ""
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  -h, --help     Show this help message"
    echo "  -p, --preview  Show preview of files to be removed (no confirmation)"
    echo "  -y, --yes      Auto-confirm cleanup (dangerous!)"
    echo ""
    echo "This script removes:"
    echo "  • Python test and development scripts"
    echo "  • HTML test pages and verification files"
    echo "  • Markdown report files"
    echo "  • JSON report and log files"
    echo "  • Backup and duplicate files"
    echo ""
    echo "Preserved files:"
    echo "  • Core game files (pages/, scripts/, styles/)"
    echo "  • Main documentation (README.md)"
    echo "  • Project configuration files"
}

# Command line argument handling
case "${1:-}" in
    -h|--help)
        show_help
        exit 0
        ;;
    -p|--preview)
        echo "🔍 Preview Mode - Files that would be removed:"
        echo ""
        preview_cleanup
        total_files=$(count_files_to_remove)
        echo -e "${YELLOW}Total files that would be removed: $total_files${NC}"
        exit 0
        ;;
    -y|--yes)
        echo "🚨 Auto-confirm mode enabled"
        echo ""
        show_repo_status
        echo ""
        echo -e "${RED}⚠️  Proceeding with cleanup without confirmation...${NC}"
        echo ""
        removed_count=$(perform_cleanup)
        echo ""
        echo -e "${GREEN}🎉 Auto-cleanup completed! Removed $removed_count files.${NC}"
        exit 0
        ;;
    "")
        # No arguments, run interactively
        main
        ;;
    *)
        echo "Unknown option: $1"
        echo "Use -h or --help for usage information."
        exit 1
        ;;
esac
