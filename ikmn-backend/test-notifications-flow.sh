#!/bin/bash

BASE_URL="http://localhost:3000"

echo "=== Sprint 12: Notifications E2E Test ==="
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
MEMBER_EMAIL="notify.member.$(date +%s)@example.com"
echo "2. Creating a member..."
curl -s -X POST "$BASE_URL/members" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$MEMBER_EMAIL\",\"phone\":\"+25078$(date +%s%N | tail -c 7)\",\"fullName\":\"Notify Test Member\",\"password\":\"Password123!\"}" > /dev/null

echo "3. Logging in as member..."
MEMBER_LOGIN=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$MEMBER_EMAIL\",\"password\":\"Password123!\"}")
MEMBER_TOKEN=$(echo "$MEMBER_LOGIN" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ -z "$MEMBER_TOKEN" ]; then
  echo "FAIL: Member login failed"
  echo "$MEMBER_LOGIN"
  exit 1
fi
echo "Member Token: ${MEMBER_TOKEN:0:30}..."

echo "-----------------------------------------------------"
echo "3. Fetching member notifications (should be empty or have prior ones)..."
curl -s -X GET "$BASE_URL/notifications/me" \
  -H "Authorization: Bearer $MEMBER_TOKEN" | python3 -m json.tool 2>/dev/null || \
curl -s -X GET "$BASE_URL/notifications/me" \
  -H "Authorization: Bearer $MEMBER_TOKEN"

echo ""
echo "-----------------------------------------------------"
echo "4. Fetching unread-only notifications..."
curl -s -X GET "$BASE_URL/notifications/me?unreadOnly=true" \
  -H "Authorization: Bearer $MEMBER_TOKEN" | python3 -m json.tool 2>/dev/null || \
curl -s -X GET "$BASE_URL/notifications/me?unreadOnly=true" \
  -H "Authorization: Bearer $MEMBER_TOKEN"

echo ""
echo "-----------------------------------------------------"
echo "5. Testing mark-as-read with a fake ID (should return 404)..."
MARK_RESULT=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH "$BASE_URL/notifications/me/00000000-0000-0000-0000-000000000000/read" \
  -H "Authorization: Bearer $MEMBER_TOKEN")
echo "Mark-as-read on fake ID => HTTP $MARK_RESULT (expected 404)"

echo "-----------------------------------------------------"
echo "=== Notifications E2E Test Complete ==="
