#!/bin/bash
set -e

# Setup variables
BASE_URL=${BASE_URL:-"http://localhost:3000"}
TEST_EMAIL=${TEST_EMAIL:-"didier@gmail.com"}
TEST_PASSWORD=${TEST_PASSWORD:-"didier123"}
MEMBER_EMAIL="postman.member.$(date +%s)@example.com"
MEMBER_PHONE="+25078$(date +%s%N | tail -c 7)"
MEMBER_PASSWORD="Password123!"

echo "== BOOTSTRAP -- Admin & Member Login =="
ADMIN_TOKEN=$(curl -sS -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ -z "$ADMIN_TOKEN" ]; then
  echo "Failed to get admin token. Make sure server is running and user exists."
  exit 1
fi

# Ensure member exists
curl -sS -X POST "$BASE_URL/members" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$MEMBER_EMAIL\",\"phone\":\"+250788$(date +%s | tail -c 6)\",\"fullName\":\"Test Member\",\"password\":\"$MEMBER_PASSWORD\",\"address\":\"Kigali\"}" > /dev/null

MEMBER_TOKEN=$(curl -sS -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$MEMBER_EMAIL\",\"password\":\"$MEMBER_PASSWORD\"}" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ -z "$MEMBER_TOKEN" ]; then
  echo "Failed to get member token. User might be suspended from a previous test."
  exit 1
fi
echo "  PASS [Admin & Member login]"

echo ""
echo "== IKM-3.2 -- GET /system-settings =="
RESP_GET=$(curl -sS -w '\n%{http_code}' "$BASE_URL/system-settings" -H "Authorization: Bearer $ADMIN_TOKEN")
HTTP_CODE=$(echo "$RESP_GET" | tail -n1)
BODY=$(echo "$RESP_GET" | head -n -1)

if [ "$HTTP_CODE" = "200" ]; then
  echo "  PASS [GET /system-settings (Admin) -> 200]"
else
  echo "  FAIL [GET /system-settings] Expected 200, got $HTTP_CODE"
  exit 1
fi

RESP_GET_MEMBER=$(curl -sS -w '\n%{http_code}' "$BASE_URL/system-settings" -H "Authorization: Bearer $MEMBER_TOKEN")
HTTP_CODE_MEMBER=$(echo "$RESP_GET_MEMBER" | tail -n1)
if [ "$HTTP_CODE_MEMBER" = "403" ]; then
  echo "  PASS [GET /system-settings (Member) -> 403]"
else
  echo "  FAIL [GET /system-settings (Member)] Expected 403, got $HTTP_CODE_MEMBER"
  exit 1
fi

echo ""
echo "== IKM-3.3 -- PATCH /system-settings =="
# 1. Successful partial update
RESP_PATCH=$(curl -sS -w '\n%{http_code}' -X PATCH "$BASE_URL/system-settings" \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d '{"monthlyShareAmount": 25000}')
HTTP_CODE=$(echo "$RESP_PATCH" | tail -n1)
if [ "$HTTP_CODE" = "200" ]; then
  echo "  PASS [PATCH /system-settings (Partial Update) -> 200]"
else
  echo "  FAIL [PATCH /system-settings (Partial Update)] Expected 200, got $HTTP_CODE"
  exit 1
fi

# 2. Validation: Empty body
RESP_PATCH_EMPTY=$(curl -sS -w '\n%{http_code}' -X PATCH "$BASE_URL/system-settings" \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d '{}')
HTTP_CODE=$(echo "$RESP_PATCH_EMPTY" | tail -n1)
if [ "$HTTP_CODE" = "400" ]; then
  echo "  PASS [PATCH /system-settings (Empty Body) -> 400]"
else
  echo "  FAIL [PATCH /system-settings (Empty Body)] Expected 400, got $HTTP_CODE"
  exit 1
fi

# 3. Validation: Negative share amount
RESP_PATCH_NEG=$(curl -sS -w '\n%{http_code}' -X PATCH "$BASE_URL/system-settings" \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d '{"monthlyShareAmount": -5}')
HTTP_CODE=$(echo "$RESP_PATCH_NEG" | tail -n1)
if [ "$HTTP_CODE" = "400" ]; then
  echo "  PASS [PATCH /system-settings (Negative Amount) -> 400]"
else
  echo "  FAIL [PATCH /system-settings (Negative Amount)] Expected 400, got $HTTP_CODE"
  exit 1
fi

# 4. Validation: dueDay > 28
RESP_PATCH_DAY=$(curl -sS -w '\n%{http_code}' -X PATCH "$BASE_URL/system-settings" \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d '{"dueDay": 29}')
HTTP_CODE=$(echo "$RESP_PATCH_DAY" | tail -n1)
if [ "$HTTP_CODE" = "400" ]; then
  echo "  PASS [PATCH /system-settings (dueDay > 28) -> 400]"
else
  echo "  FAIL [PATCH /system-settings (dueDay > 28)] Expected 400, got $HTTP_CODE"
  exit 1
fi

# 5. Validation: invalid currency code
RESP_PATCH_CURR=$(curl -sS -w '\n%{http_code}' -X PATCH "$BASE_URL/system-settings" \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d '{"currency": "RWANDA"}')
HTTP_CODE=$(echo "$RESP_PATCH_CURR" | tail -n1)
if [ "$HTTP_CODE" = "400" ]; then
  echo "  PASS [PATCH /system-settings (Invalid Currency) -> 400]"
else
  echo "  FAIL [PATCH /system-settings (Invalid Currency)] Expected 400, got $HTTP_CODE"
  exit 1
fi

# 6. Member attempts to update
RESP_PATCH_MEMBER=$(curl -sS -w '\n%{http_code}' -X PATCH "$BASE_URL/system-settings" \
  -H "Authorization: Bearer $MEMBER_TOKEN" -H "Content-Type: application/json" \
  -d '{"dueDay": 10}')
HTTP_CODE=$(echo "$RESP_PATCH_MEMBER" | tail -n1)
if [ "$HTTP_CODE" = "403" ]; then
  echo "  PASS [PATCH /system-settings (Member Auth) -> 403]"
else
  echo "  FAIL [PATCH /system-settings (Member Auth)] Expected 403, got $HTTP_CODE"
  exit 1
fi

echo ""
echo "=================================================="
echo "  ALL TESTS PASSED SUCCESSFULLY!"
echo "=================================================="
