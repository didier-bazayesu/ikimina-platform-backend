#!/bin/bash

BASE_URL="http://localhost:3000"

echo "=== Sprint 13: Audit Logs E2E Test ==="
echo "-----------------------------------------------------"

echo "1. Logging in as admin..."
ADMIN_LOGIN=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"didier@gmail.com","password":"didier123"}')
ADMIN_TOKEN=$(echo "$ADMIN_LOGIN" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ -z "$ADMIN_TOKEN" ]; then
  echo "FAIL: Admin login failed"
  echo "$ADMIN_LOGIN"
  exit 1
fi
echo "Admin Token: ${ADMIN_TOKEN:0:30}..."

echo "-----------------------------------------------------"
echo "2. Logging in as member..."
MEMBER_LOGIN=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"state.member@example.com","password":"Password123!"}')
MEMBER_TOKEN=$(echo "$MEMBER_LOGIN" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ -z "$MEMBER_TOKEN" ]; then
  echo "FAIL: Member login failed"
  echo "$MEMBER_LOGIN"
  exit 1
fi
echo "Member Token: ${MEMBER_TOKEN:0:30}..."

echo "-----------------------------------------------------"
echo "3. Fetching audit logs as Admin (should return 200 OK)..."
curl -s -X GET "$BASE_URL/audit-logs" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | python3 -m json.tool 2>/dev/null || \
curl -s -X GET "$BASE_URL/audit-logs" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

echo ""
echo "-----------------------------------------------------"
echo "4. Attempting to fetch audit logs as Member (should return 403 Forbidden)..."
MEMBER_FETCH_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$BASE_URL/audit-logs" \
  -H "Authorization: Bearer $MEMBER_TOKEN")
echo "Member GET /audit-logs => HTTP $MEMBER_FETCH_CODE (expected 403)"

echo "-----------------------------------------------------"
echo "=== Audit Logs E2E Test Complete ==="
