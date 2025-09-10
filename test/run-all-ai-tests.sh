#!/bin/bash

# Comprehensive AI Test Suite Runner
# Tests all AI functions in the Fancy2048 game

echo "🤖 Starting Comprehensive AI Function Test Suite for Fancy2048"
echo "=============================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to run a test and track results
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    echo -e "\n${YELLOW}Running: $test_name${NC}"
    echo "----------------------------------------"
    
    if eval "$test_command"; then
        echo -e "${GREEN}✅ PASSED: $test_name${NC}"
        ((PASSED_TESTS++))
    else
        echo -e "${RED}❌ FAILED: $test_name${NC}"
        ((FAILED_TESTS++))
    fi
    
    ((TOTAL_TESTS++))
}

# Test 1: Original Autoplay Test
run_test "Original Autoplay Functionality" "npm test"

# Test 2: Comprehensive AI Functions Test
run_test "AI Functions Unit Tests" "node test/ai-functions-test.js"

# Test 3: AI Performance Test
run_test "AI Performance Test" "timeout 120s node test/ai-performance-test.js"

# Test 4: AI Decision Quality Test
run_test "AI Decision Quality Test" "timeout 60s node test/ai-quality-test.js"

# Summary
echo ""
echo "=============================================================="
echo "🤖 AI Test Suite Complete"
echo "=============================================================="
echo -e "Total Tests: ${TOTAL_TESTS}"
echo -e "${GREEN}Passed: ${PASSED_TESTS}${NC}"
echo -e "${RED}Failed: ${FAILED_TESTS}${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "\n🎉 ${GREEN}All AI tests passed successfully!${NC}"
    echo ""
    echo "✅ AI Solver initialization and configuration"
    echo "✅ Board evaluation heuristics"
    echo "✅ Move simulation and game logic"
    echo "✅ Expectimax algorithm implementation"
    echo "✅ Caching and performance optimization"
    echo "✅ Decision quality and strategic thinking"
    echo "✅ Performance under various game states"
    echo "✅ Integration with game engine"
    exit 0
else
    echo -e "\n⚠️  ${YELLOW}Some tests failed. See details above.${NC}"
    echo ""
    echo "Note: Some failures may be expected due to:"
    echo "• AI randomness in lower difficulties"
    echo "• Performance variations in different environments"
    echo "• Strategic trade-offs in complex positions"
    exit 1
fi
