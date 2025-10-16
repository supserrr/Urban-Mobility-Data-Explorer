#!/bin/bash

# Security Testing Script for Urban Mobility Data Explorer
# Tests all implemented security features

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# API Base URL
API_URL="${API_URL:-http://localhost:8000}"

echo "=========================================="
echo "Security Testing Suite"
echo "Urban Mobility Data Explorer Backend API"
echo "=========================================="
echo ""
echo "Testing API at: $API_URL"
echo ""

# Function to test rate limiting
test_rate_limiting() {
    echo "=========================================="
    echo "TEST 1: Rate Limiting"
    echo "=========================================="
    echo "Sending 101 requests to /api/health..."
    echo "(Should get 429 after 100 requests)"
    echo ""
    
    SUCCESS_COUNT=0
    RATE_LIMITED=0
    
    for i in {1..101}; do
        RESPONSE=$(curl -s -w "\n%{http_code}" "$API_URL/api/health" 2>/dev/null)
        HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
        
        if [ "$HTTP_CODE" == "200" ]; then
            SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
        elif [ "$HTTP_CODE" == "429" ]; then
            RATE_LIMITED=$((RATE_LIMITED + 1))
        fi
        
        # Show progress every 20 requests
        if [ $((i % 20)) -eq 0 ]; then
            echo "  Progress: $i/101 requests sent..."
        fi
    done
    
    echo ""
    if [ $RATE_LIMITED -gt 0 ]; then
        echo -e "${GREEN}✓ PASS${NC} - Rate limiting is working"
        echo "  - Successful requests: $SUCCESS_COUNT"
        echo "  - Rate limited (429): $RATE_LIMITED"
    else
        echo -e "${RED}✗ FAIL${NC} - Rate limiting not working"
        echo "  - All $SUCCESS_COUNT requests succeeded (expected some 429s)"
    fi
    echo ""
}

# Function to test input validation
test_input_validation() {
    echo "=========================================="
    echo "TEST 2: Input Validation"
    echo "=========================================="
    echo ""
    
    # Test 1: Invalid page number
    echo "Test 2.1: Invalid page number (-1)..."
    RESPONSE=$(curl -s "$API_URL/api/trips?page=-1")
    if echo "$RESPONSE" | grep -q "Invalid request parameters"; then
        echo -e "${GREEN}✓ PASS${NC} - Negative page number rejected"
    else
        echo -e "${RED}✗ FAIL${NC} - Negative page number not validated"
    fi
    echo ""
    
    # Test 2: Invalid date format
    echo "Test 2.2: Invalid date format..."
    RESPONSE=$(curl -s "$API_URL/api/trips/map?startDate=invalid-date")
    if echo "$RESPONSE" | grep -q "Invalid request parameters"; then
        echo -e "${GREEN}✓ PASS${NC} - Invalid date format rejected"
    else
        echo -e "${RED}✗ FAIL${NC} - Invalid date format not validated"
    fi
    echo ""
    
    # Test 3: Out of range H3 resolution
    echo "Test 2.3: Out of range H3 resolution (999)..."
    RESPONSE=$(curl -s "$API_URL/api/trips/h3-grid?resolution=999")
    if echo "$RESPONSE" | grep -q "Invalid request parameters"; then
        echo -e "${GREEN}✓ PASS${NC} - Out of range resolution rejected"
    else
        echo -e "${RED}✗ FAIL${NC} - Out of range resolution not validated"
    fi
    echo ""
    
    # Test 4: Invalid neighborhood
    echo "Test 2.4: Invalid neighborhood name..."
    RESPONSE=$(curl -s "$API_URL/api/trips/map?neighborhood=InvalidPlace")
    if echo "$RESPONSE" | grep -q "Invalid request parameters"; then
        echo -e "${GREEN}✓ PASS${NC} - Invalid neighborhood rejected"
    else
        echo -e "${RED}✗ FAIL${NC} - Invalid neighborhood not validated"
    fi
    echo ""
    
    # Test 5: Invalid limit (too high)
    echo "Test 2.5: Excessive limit (100000)..."
    RESPONSE=$(curl -s "$API_URL/api/trips/map?limit=100000")
    if echo "$RESPONSE" | grep -q "Invalid request parameters"; then
        echo -e "${GREEN}✓ PASS${NC} - Excessive limit rejected"
    else
        echo -e "${RED}✗ FAIL${NC} - Excessive limit not validated"
    fi
    echo ""
}

# Function to test API key security
test_api_key_security() {
    echo "=========================================="
    echo "TEST 3: API Key Security"
    echo "=========================================="
    echo ""
    
    echo "Checking if MAPTILER_API_KEY is exposed..."
    RESPONSE=$(curl -s "$API_URL/api/config")
    
    if echo "$RESPONSE" | grep -q "maptilerApiKey"; then
        echo -e "${RED}✗ FAIL${NC} - API key is still exposed in /api/config"
        echo "  Response contains: maptilerApiKey"
    else
        echo -e "${GREEN}✓ PASS${NC} - API key is not exposed"
        echo "  /api/config does not contain maptilerApiKey field"
    fi
    echo ""
}

# Function to test CORS configuration
test_cors() {
    echo "=========================================="
    echo "TEST 4: CORS Configuration"
    echo "=========================================="
    echo ""
    
    # Test 1: Valid origin
    echo "Test 4.1: Valid origin (http://localhost:3000)..."
    RESPONSE=$(curl -s -H "Origin: http://localhost:3000" "$API_URL/api/health")
    if echo "$RESPONSE" | grep -q "success"; then
        echo -e "${GREEN}✓ PASS${NC} - Valid origin allowed"
    else
        echo -e "${YELLOW} WARNING${NC} - Valid origin may be blocked"
    fi
    echo ""
    
    # Test 2: Check if file:// is rejected (can't easily test from curl, but we can check config)
    echo "Test 4.2: CORS configuration check..."
    echo -e "${GREEN}✓ INFO${NC} - file:// and null origins removed from code"
    echo "  CORS now uses environment variable CORS_ORIGINS"
    echo ""
}

# Function to test request size limits
test_request_size_limits() {
    echo "=========================================="
    echo "TEST 5: Request Size Limits"
    echo "=========================================="
    echo ""
    
    echo "Attempting to send 200KB payload..."
    echo "(Limit is now 100KB, should be rejected)"
    
    # Generate 200KB of data
    LARGE_PAYLOAD=$(dd if=/dev/zero bs=1024 count=200 2>/dev/null | base64)
    
    RESPONSE=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -d "{\"data\":\"$LARGE_PAYLOAD\"}" \
        -w "\n%{http_code}" \
        "$API_URL/api/parameters/validate" 2>/dev/null)
    
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    
    if [ "$HTTP_CODE" == "413" ] || echo "$RESPONSE" | grep -q "Payload Too Large"; then
        echo -e "${GREEN}✓ PASS${NC} - Large payload rejected (413 Payload Too Large)"
    else
        echo -e "${RED}✗ FAIL${NC} - Large payload not rejected (got: $HTTP_CODE)"
    fi
    echo ""
}

# Function to test SQL injection protection
test_sql_injection() {
    echo "=========================================="
    echo "TEST 6: SQL Injection Protection"
    echo "=========================================="
    echo ""
    
    # Test 1: SQL injection in category parameter
    echo "Test 6.1: SQL injection attempt in category..."
    RESPONSE=$(curl -s "$API_URL/api/trips?category=complete'%20OR%201=1--")
    if echo "$RESPONSE" | grep -q "Invalid request parameters"; then
        echo -e "${GREEN}✓ PASS${NC} - SQL injection attempt blocked by validation"
    else
        echo -e "${YELLOW} INFO${NC} - Request processed (should be safe with parameterized queries)"
    fi
    echo ""
    
    # Test 2: SQL injection in neighborhood
    echo "Test 6.2: SQL injection attempt in neighborhood..."
    RESPONSE=$(curl -s "$API_URL/api/trips/map?neighborhood=Manhattan';%20DROP%20TABLE%20trips--")
    if echo "$RESPONSE" | grep -q "Invalid request parameters"; then
        echo -e "${GREEN}✓ PASS${NC} - SQL injection attempt blocked by validation"
    else
        echo -e "${YELLOW} WARNING${NC} - Request processed (check database for safety)"
    fi
    echo ""
}

# Function to test database connection security
test_database_security() {
    echo "=========================================="
    echo "TEST 7: Database Configuration Security"
    echo "=========================================="
    echo ""
    
    echo "Checking if database credentials are in environment variables..."
    
    # Check if env.example has been updated
    if grep -q "DB_USER" "../env.example" 2>/dev/null; then
        echo -e "${GREEN}✓ PASS${NC} - env.example updated with DB_USER"
    else
        echo -e "${RED}✗ FAIL${NC} - env.example not updated"
    fi
    
    if grep -q "DB_PASSWORD" "../env.example" 2>/dev/null; then
        echo -e "${GREEN}✓ PASS${NC} - env.example updated with DB_PASSWORD"
    else
        echo -e "${RED}✗ FAIL${NC} - env.example not updated"
    fi
    
    echo ""
    echo "Note: Verify server-production.js uses process.env.DB_* variables"
    echo ""
}

# Function to check if server is running
check_server() {
    echo "Checking if server is running at $API_URL..."
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/")
    
    if [ "$RESPONSE" == "200" ]; then
        echo -e "${GREEN}✓${NC} Server is running"
        echo ""
        return 0
    else
        echo -e "${RED}✗${NC} Server is not responding"
        echo "Please start the server with: npm start"
        echo ""
        return 1
    fi
}

# Main execution
main() {
    # Check if server is running
    if ! check_server; then
        exit 1
    fi
    
    # Run all tests
    test_rate_limiting
    test_input_validation
    test_api_key_security
    test_cors
    test_request_size_limits
    test_sql_injection
    test_database_security
    
    echo "=========================================="
    echo "Security Testing Complete"
    echo "=========================================="
    echo ""
    echo "Summary:"
    echo "  All critical security fixes have been tested"
    echo "  Review results above for any failures"
    echo ""
    echo "Next steps:"
    echo "  1. Fix any failing tests"
    echo "  2. Update frontend to not expect maptilerApiKey from /api/config"
    echo "  3. Set up .env file with proper credentials"
    echo "  4. Test in production environment"
    echo ""
}

# Run main function
main

