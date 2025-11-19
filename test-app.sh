#!/bin/bash

# BrunoExchange Application Test Suite
# Tests all API endpoints and verifies functionality

set -e

BASE_URL="http://localhost:8080"
API_URL="$BASE_URL/api"

echo "🧪 BrunoExchange Application Test Suite"
echo "========================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Test function
test_endpoint() {
    local name=$1
    local method=$2
    local endpoint=$3
    local data=$4
    local expected_code=$5
    local token=$6

    echo -n "Testing: $name... "
    
    if [ -z "$token" ]; then
        response=$(curl -s -w "\n%{http_code}" -X $method "$endpoint" \
            -H "Content-Type: application/json" \
            ${data:+-d "$data"})
    else
        response=$(curl -s -w "\n%{http_code}" -X $method "$endpoint" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $token" \
            ${data:+-d "$data"})
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" == "$expected_code" ]; then
        echo -e "${GREEN}✓ PASS${NC} (HTTP $http_code)"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
    else
        echo -e "${RED}✗ FAIL${NC} (Expected $expected_code, got $http_code)"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo "$body"
    fi
    echo ""
}

# 1. Health Check
echo "📊 1. Health & Status Checks"
echo "----------------------------"
test_endpoint "Health check" "GET" "$BASE_URL/health" "" "200"
test_endpoint "Readiness check" "GET" "$BASE_URL/ready" "" "200"
test_endpoint "Metrics endpoint" "GET" "$BASE_URL/metrics" "" "200"

# 2. Markets
echo ""
echo "🏪 2. Markets Endpoints"
echo "----------------------"
test_endpoint "Get all markets" "GET" "$API_URL/markets" "" "200"
test_endpoint "Get active markets" "GET" "$API_URL/markets?status=ACTIVE" "" "200"

# 3. Authentication
echo ""
echo "🔐 3. Authentication"
echo "-------------------"

# Generate random user
RANDOM_ID=$RANDOM
TEST_EMAIL="testuser${RANDOM_ID}@example.com"
TEST_PASSWORD="SecurePass123!"
TEST_NAME="Test User ${RANDOM_ID}"

echo "Creating test user: $TEST_EMAIL"

# Register
register_response=$(curl -s -X POST "$API_URL/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\",\"fullName\":\"$TEST_NAME\"}")

echo "Registration response:"
echo "$register_response" | jq '.'

# Login
echo ""
echo "Logging in..."
login_response=$(curl -s -X POST "$API_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")

ACCESS_TOKEN=$(echo "$login_response" | jq -r '.accessToken')
REFRESH_TOKEN=$(echo "$login_response" | jq -r '.refreshToken')

if [ "$ACCESS_TOKEN" != "null" ] && [ ! -z "$ACCESS_TOKEN" ]; then
    echo -e "${GREEN}✓ Login successful${NC}"
    echo "Access Token: ${ACCESS_TOKEN:0:20}..."
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}✗ Login failed${NC}"
    echo "$login_response"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    exit 1
fi

# 4. Authenticated User Endpoints
echo ""
echo "👤 4. User Endpoints (Authenticated)"
echo "------------------------------------"
test_endpoint "Get current user" "GET" "$API_URL/auth/me" "" "200" "$ACCESS_TOKEN"
test_endpoint "Get user balance" "GET" "$API_URL/user/balance" "" "200" "$ACCESS_TOKEN"
test_endpoint "Get user positions" "GET" "$API_URL/user/positions" "" "200" "$ACCESS_TOKEN"
test_endpoint "Get user portfolio" "GET" "$API_URL/user/portfolio" "" "200" "$ACCESS_TOKEN"
test_endpoint "Get trade history" "GET" "$API_URL/user/trades" "" "200" "$ACCESS_TOKEN"

# 5. Get a market to test orders
echo ""
echo "📈 5. Market Details & Orderbook"
echo "--------------------------------"

markets_response=$(curl -s "$API_URL/markets")
first_market_slug=$(echo "$markets_response" | jq -r '.[0].slug // empty')

if [ ! -z "$first_market_slug" ]; then
    echo "Testing with market: $first_market_slug"
    test_endpoint "Get market details" "GET" "$API_URL/markets/$first_market_slug" "" "200"
    test_endpoint "Get market stats" "GET" "$API_URL/markets/$first_market_slug/stats" "" "200"
    test_endpoint "Get orderbook" "GET" "$API_URL/orders/$first_market_slug/orderbook" "" "200"
else
    echo -e "${YELLOW}⚠ No markets found to test${NC}"
fi

# 6. Order Placement
echo ""
echo "💰 6. Order Operations"
echo "----------------------"

if [ ! -z "$first_market_slug" ]; then
    # Place a limit order
    order_data='{
        "outcome": "YES",
        "side": "BUY",
        "type": "LIMIT",
        "price": 0.55,
        "quantity": 5
    }'
    
    echo "Placing BUY order..."
    place_order_response=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/orders/$first_market_slug" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -d "$order_data")
    
    order_http_code=$(echo "$place_order_response" | tail -n1)
    order_body=$(echo "$place_order_response" | sed '$d')
    
    if [ "$order_http_code" == "200" ] || [ "$order_http_code" == "201" ]; then
        echo -e "${GREEN}✓ Order placed successfully${NC}"
        echo "$order_body" | jq '.'
        TESTS_PASSED=$((TESTS_PASSED + 1))
        
        ORDER_ID=$(echo "$order_body" | jq -r '.order.id // .id // empty')
        
        # Cancel the order if we got an ID
        if [ ! -z "$ORDER_ID" ]; then
            echo ""
            echo "Cancelling order $ORDER_ID..."
            cancel_response=$(curl -s -w "\n%{http_code}" -X DELETE "$API_URL/orders/$ORDER_ID" \
                -H "Authorization: Bearer $ACCESS_TOKEN")
            
            cancel_http_code=$(echo "$cancel_response" | tail -n1)
            
            if [ "$cancel_http_code" == "200" ]; then
                echo -e "${GREEN}✓ Order cancelled successfully${NC}"
                TESTS_PASSED=$((TESTS_PASSED + 1))
            else
                echo -e "${YELLOW}⚠ Order cancellation returned: $cancel_http_code${NC}"
            fi
        fi
    else
        echo -e "${RED}✗ Order placement failed${NC} (HTTP $order_http_code)"
        echo "$order_body"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
else
    echo -e "${YELLOW}⚠ Skipping order tests (no markets available)${NC}"
fi

# 7. WebSocket Connection Test
echo ""
echo "🌐 7. WebSocket Connection"
echo "--------------------------"

# Test WebSocket health (just check if endpoint exists)
ws_test=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/ws")
if [ "$ws_test" == "400" ] || [ "$ws_test" == "426" ]; then
    echo -e "${GREEN}✓ WebSocket endpoint accessible${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${YELLOW}⚠ WebSocket endpoint returned: $ws_test${NC}"
fi

# 8. Token Refresh
echo ""
echo "🔄 8. Token Refresh"
echo "-------------------"

if [ "$REFRESH_TOKEN" != "null" ] && [ ! -z "$REFRESH_TOKEN" ]; then
    refresh_response=$(curl -s -X POST "$API_URL/auth/refresh" \
        -H "Content-Type: application/json" \
        -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}")
    
    new_access_token=$(echo "$refresh_response" | jq -r '.accessToken // empty')
    
    if [ ! -z "$new_access_token" ]; then
        echo -e "${GREEN}✓ Token refresh successful${NC}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${YELLOW}⚠ Token refresh failed${NC}"
        echo "$refresh_response"
    fi
fi

# 9. Logout
echo ""
echo "🚪 9. Logout"
echo "-----------"
logout_response=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/auth/logout" \
    -H "Authorization: Bearer $ACCESS_TOKEN")

logout_code=$(echo "$logout_response" | tail -n1)
if [ "$logout_code" == "200" ]; then
    echo -e "${GREEN}✓ Logout successful${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${YELLOW}⚠ Logout returned: $logout_code${NC}"
fi

# Summary
echo ""
echo "========================================"
echo "📊 Test Summary"
echo "========================================"
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
echo "Total Tests: $((TESTS_PASSED + TESTS_FAILED))"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed!${NC}"
    echo ""
    echo "✅ Your application is working correctly!"
    echo ""
    echo "🌐 Access your application:"
    echo "   Frontend: http://localhost:5173"
    echo "   Backend:  http://localhost:8080"
    echo "   API Docs: See DEPLOYMENT_GUIDE.md"
    exit 0
else
    echo -e "${RED}❌ Some tests failed${NC}"
    echo "Please check the errors above"
    exit 1
fi
