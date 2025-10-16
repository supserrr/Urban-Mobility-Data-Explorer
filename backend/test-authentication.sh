#!/bin/bash

# Authentication Testing Script for Urban Mobility Data Explorer
# Tests Phase 2 authentication implementation

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# API Base URL
API_URL="${API_URL:-http://localhost:8000}"

# Test API key (should be set in environment or use a test key)
TEST_API_KEY="${TEST_API_KEY:-}"

echo "=========================================="
echo "Authentication Testing Suite"
echo "Urban Mobility Data Explorer Backend API"
echo "=========================================="
echo ""
echo "Testing API at: $API_URL"
echo ""

if [ -z "$TEST_API_KEY" ]; then
    echo -e "${YELLOW}WARNING${NC} - No TEST_API_KEY environment variable set"
    echo "Some tests will be skipped. Set TEST_API_KEY to test authenticated endpoints."
    echo ""
fi

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

# TEST 1: Public endpoints should work without auth
test_public_endpoints() {
    echo "=========================================="
    echo "TEST 1: Public Endpoints (No Auth Required)"
    echo "=========================================="
    echo ""
    
    # Test /api/health
    echo "Test 1.1: GET /api/health (should work without auth)..."
    RESPONSE=$(curl -s -w "\n%{http_code}" "$API_URL/api/health")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    
    if [ "$HTTP_CODE" == "200" ]; then
        echo -e "${GREEN}✓ PASS${NC} - /api/health accessible without authentication"
    else
        echo -e "${RED}✗ FAIL${NC} - /api/health returned $HTTP_CODE (expected 200)"
    fi
    echo ""
    
    # Test /api/docs
    echo "Test 1.2: GET /api/docs (should work without auth)..."
    RESPONSE=$(curl -s -w "\n%{http_code}" "$API_URL/api/docs")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    
    if [ "$HTTP_CODE" == "200" ]; then
        echo -e "${GREEN}✓ PASS${NC} - /api/docs accessible without authentication"
    else
        echo -e "${RED}✗ FAIL${NC} - /api/docs returned $HTTP_CODE (expected 200)"
    fi
    echo ""
    
    # Test /api/docs/authentication
    echo "Test 1.3: GET /api/docs/authentication (should work without auth)..."
    RESPONSE=$(curl -s -w "\n%{http_code}" "$API_URL/api/docs/authentication")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    
    if [ "$HTTP_CODE" == "200" ]; then
        echo -e "${GREEN}✓ PASS${NC} - /api/docs/authentication accessible without authentication"
    else
        echo -e "${RED}✗ FAIL${NC} - /api/docs/authentication returned $HTTP_CODE (expected 200)"
    fi
    echo ""
    
    # Test /api/trips/statistics
    echo "Test 1.4: GET /api/trips/statistics (should work without auth)..."
    RESPONSE=$(curl -s -w "\n%{http_code}" "$API_URL/api/trips/statistics")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    
    if [ "$HTTP_CODE" == "200" ]; then
        echo -e "${GREEN}✓ PASS${NC} - /api/trips/statistics accessible without authentication"
    else
        echo -e "${RED}✗ FAIL${NC} - /api/trips/statistics returned $HTTP_CODE (expected 200)"
    fi
    echo ""
}

# TEST 2: Protected endpoints should require auth
test_protected_endpoints_without_auth() {
    echo "=========================================="
    echo "TEST 2: Protected Endpoints (Require Auth)"
    echo "=========================================="
    echo ""
    
    # Test /api/config
    echo "Test 2.1: GET /api/config without auth (should return 401)..."
    RESPONSE=$(curl -s -w "\n%{http_code}" "$API_URL/api/config")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    
    if [ "$HTTP_CODE" == "401" ]; then
        echo -e "${GREEN}✓ PASS${NC} - /api/config properly protected (401 Unauthorized)"
    else
        echo -e "${RED}✗ FAIL${NC} - /api/config returned $HTTP_CODE (expected 401)"
    fi
    echo ""
    
    # Test /api/trips
    echo "Test 2.2: GET /api/trips without auth (should return 401)..."
    RESPONSE=$(curl -s -w "\n%{http_code}" "$API_URL/api/trips")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    
    if [ "$HTTP_CODE" == "401" ]; then
        echo -e "${GREEN}✓ PASS${NC} - /api/trips properly protected (401 Unauthorized)"
    else
        echo -e "${RED}✗ FAIL${NC} - /api/trips returned $HTTP_CODE (expected 401)"
    fi
    echo ""
    
    # Test /api/trips/map
    echo "Test 2.3: GET /api/trips/map without auth (should return 401)..."
    RESPONSE=$(curl -s -w "\n%{http_code}" "$API_URL/api/trips/map")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    
    if [ "$HTTP_CODE" == "401" ]; then
        echo -e "${GREEN}✓ PASS${NC} - /api/trips/map properly protected (401 Unauthorized)"
    else
        echo -e "${RED}✗ FAIL${NC} - /api/trips/map returned $HTTP_CODE (expected 401)"
    fi
    echo ""
    
    # Test /api/trips/h3-grid
    echo "Test 2.4: GET /api/trips/h3-grid without auth (should return 401)..."
    RESPONSE=$(curl -s -w "\n%{http_code}" "$API_URL/api/trips/h3-grid")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    
    if [ "$HTTP_CODE" == "401" ]; then
        echo -e "${GREEN}✓ PASS${NC} - /api/trips/h3-grid properly protected (401 Unauthorized)"
    else
        echo -e "${RED}✗ FAIL${NC} - /api/trips/h3-grid returned $HTTP_CODE (expected 401)"
    fi
    echo ""
    
    # Test /api/trips/advanced
    echo "Test 2.5: GET /api/trips/advanced without auth (should return 401)..."
    RESPONSE=$(curl -s -w "\n%{http_code}" "$API_URL/api/trips/advanced")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    
    if [ "$HTTP_CODE" == "401" ]; then
        echo -e "${GREEN}✓ PASS${NC} - /api/trips/advanced properly protected (401 Unauthorized)"
    else
        echo -e "${RED}✗ FAIL${NC} - /api/trips/advanced returned $HTTP_CODE (expected 401)"
    fi
    echo ""
}

# TEST 3: Invalid API key should be rejected
test_invalid_api_key() {
    echo "=========================================="
    echo "TEST 3: Invalid API Key Rejection"
    echo "=========================================="
    echo ""
    
    INVALID_KEY="invalid_key_12345678901234567890123456789012"
    
    echo "Test 3.1: GET /api/config with invalid API key (should return 403)..."
    RESPONSE=$(curl -s -w "\n%{http_code}" -H "X-API-Key: $INVALID_KEY" "$API_URL/api/config")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    
    if [ "$HTTP_CODE" == "403" ]; then
        echo -e "${GREEN}✓ PASS${NC} - Invalid API key rejected (403 Forbidden)"
    else
        echo -e "${RED}✗ FAIL${NC} - Invalid API key returned $HTTP_CODE (expected 403)"
    fi
    echo ""
    
    echo "Test 3.2: GET /api/trips with invalid API key via query param..."
    RESPONSE=$(curl -s -w "\n%{http_code}" "$API_URL/api/trips?api_key=$INVALID_KEY")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    
    if [ "$HTTP_CODE" == "403" ]; then
        echo -e "${GREEN}✓ PASS${NC} - Invalid API key rejected via query param (403 Forbidden)"
    else
        echo -e "${RED}✗ FAIL${NC} - Invalid API key returned $HTTP_CODE (expected 403)"
    fi
    echo ""
}

# TEST 4: Valid API key should grant access
test_valid_api_key() {
    if [ -z "$TEST_API_KEY" ]; then
        echo "=========================================="
        echo "TEST 4: Valid API Key Access"
        echo "=========================================="
        echo ""
        echo -e "${YELLOW}SKIPPED${NC} - No TEST_API_KEY environment variable set"
        echo "Set TEST_API_KEY to test valid API key authentication"
        echo ""
        return
    fi
    
    echo "=========================================="
    echo "TEST 4: Valid API Key Access"
    echo "=========================================="
    echo ""
    
    # Test with header method
    echo "Test 4.1: GET /api/config with valid API key (header method)..."
    RESPONSE=$(curl -s -w "\n%{http_code}" -H "X-API-Key: $TEST_API_KEY" "$API_URL/api/config")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    
    if [ "$HTTP_CODE" == "200" ]; then
        echo -e "${GREEN}✓ PASS${NC} - Valid API key grants access via header"
        # Check if maptilerApiKey is in response
        if echo "$RESPONSE" | grep -q "maptilerApiKey"; then
            echo -e "${GREEN}✓ PASS${NC} - Response includes maptilerApiKey for authenticated user"
        else
            echo -e "${YELLOW}WARNING${NC} - Response missing maptilerApiKey"
        fi
    else
        echo -e "${RED}✗ FAIL${NC} - Valid API key returned $HTTP_CODE (expected 200)"
    fi
    echo ""
    
    # Test with query parameter method
    echo "Test 4.2: GET /api/trips with valid API key (query param method)..."
    RESPONSE=$(curl -s -w "\n%{http_code}" "$API_URL/api/trips?api_key=$TEST_API_KEY&limit=1")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    
    if [ "$HTTP_CODE" == "200" ]; then
        echo -e "${GREEN}✓ PASS${NC} - Valid API key grants access via query param"
    else
        echo -e "${RED}✗ FAIL${NC} - Valid API key returned $HTTP_CODE (expected 200)"
    fi
    echo ""
    
    # Test /api/trips/map
    echo "Test 4.3: GET /api/trips/map with valid API key..."
    RESPONSE=$(curl -s -w "\n%{http_code}" -H "X-API-Key: $TEST_API_KEY" "$API_URL/api/trips/map?limit=10")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    
    if [ "$HTTP_CODE" == "200" ]; then
        echo -e "${GREEN}✓ PASS${NC} - Valid API key grants access to /api/trips/map"
    else
        echo -e "${RED}✗ FAIL${NC} - /api/trips/map returned $HTTP_CODE (expected 200)"
    fi
    echo ""
    
    # Test /api/trips/h3-grid
    echo "Test 4.4: GET /api/trips/h3-grid with valid API key..."
    RESPONSE=$(curl -s -w "\n%{http_code}" -H "X-API-Key: $TEST_API_KEY" "$API_URL/api/trips/h3-grid?resolution=8")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    
    if [ "$HTTP_CODE" == "200" ]; then
        echo -e "${GREEN}✓ PASS${NC} - Valid API key grants access to /api/trips/h3-grid"
    else
        echo -e "${RED}✗ FAIL${NC} - /api/trips/h3-grid returned $HTTP_CODE (expected 200)"
    fi
    echo ""
}

# TEST 5: Authentication error messages
test_auth_error_messages() {
    echo "=========================================="
    echo "TEST 5: Authentication Error Messages"
    echo "=========================================="
    echo ""
    
    echo "Test 5.1: Missing API key error message..."
    RESPONSE=$(curl -s "$API_URL/api/config")
    
    if echo "$RESPONSE" | grep -q "Authentication required"; then
        echo -e "${GREEN}✓ PASS${NC} - Error message includes 'Authentication required'"
    else
        echo -e "${RED}✗ FAIL${NC} - Error message missing 'Authentication required'"
    fi
    
    if echo "$RESPONSE" | grep -q "X-API-Key"; then
        echo -e "${GREEN}✓ PASS${NC} - Error message mentions X-API-Key header"
    else
        echo -e "${YELLOW}WARNING${NC} - Error message doesn't mention X-API-Key header"
    fi
    echo ""
    
    echo "Test 5.2: Invalid API key error message..."
    RESPONSE=$(curl -s -H "X-API-Key: invalid_key_1234567890" "$API_URL/api/config")
    
    if echo "$RESPONSE" | grep -q "Invalid API key"; then
        echo -e "${GREEN}✓ PASS${NC} - Error message includes 'Invalid API key'"
    else
        echo -e "${RED}✗ FAIL${NC} - Error message missing 'Invalid API key'"
    fi
    echo ""
}

# Main execution
main() {
    # Check if server is running
    if ! check_server; then
        exit 1
    fi
    
    # Run all tests
    test_public_endpoints
    test_protected_endpoints_without_auth
    test_invalid_api_key
    test_valid_api_key
    test_auth_error_messages
    
    echo "=========================================="
    echo "Authentication Testing Complete"
    echo "=========================================="
    echo ""
    echo "Summary:"
    echo "  Phase 2 authentication has been tested"
    echo "  Review results above for any failures"
    echo ""
    if [ -z "$TEST_API_KEY" ]; then
        echo "Note: Some tests were skipped. Generate and set TEST_API_KEY to run all tests:"
        echo "   1. Generate key: node src/utils/generateApiKey.js"
        echo "   2. Add to .env: API_KEYS=your_generated_key"
        echo "   3. Export for tests: export TEST_API_KEY=your_generated_key"
        echo "   4. Run tests again: ./test-authentication.sh"
        echo ""
    fi
    echo "Next steps:"
    echo "  1. Generate API keys: node src/utils/generateApiKey.js"
    echo "  2. Update .env with generated keys"
    echo "  3. Update frontend to include X-API-Key header"
    echo "  4. Test with real API key"
    echo ""
}

# Run main function
main

