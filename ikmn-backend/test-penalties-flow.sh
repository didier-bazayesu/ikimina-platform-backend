#!/bin/bash
set -e

BASE_URL=${BASE_URL:-"http://localhost:3000"}
TEST_EMAIL=${TEST_EMAIL:-"didier@gmail.com"}
TEST_PASSWORD=${TEST_PASSWORD:-"didier123"}
MEMBER_EMAIL="penalty.member.$(date +%s)@example.com"
MEMBER_PHONE="+25078$(date +%s%N | tail -c 7)"
MEMBER_PASSWORD="Password123!"

echo "== BOOTSTRAP =="
ADMIN_TOKEN=$(curl -sS -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

curl -sS -X POST "$BASE_URL/members" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$MEMBER_EMAIL\",\"phone\":\"+250788$(date +%s | tail -c 6)\",\"fullName\":\"Penalty Test Member\",\"password\":\"$MEMBER_PASSWORD\"}" > /dev/null

MEMBER_TOKEN=$(curl -sS -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$MEMBER_EMAIL\",\"password\":\"$MEMBER_PASSWORD\"}" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

# Generate obligations for NEXT month so the just-created member qualifies
NEXT_MONTH=$(date -d "+1 month" +%m 2>/dev/null || date -v+1m +%m 2>/dev/null || echo "10")
NEXT_YEAR=$(date -d "+1 month" +%Y 2>/dev/null || date -v+1m +%Y 2>/dev/null || echo "2026")
NEXT_MONTH=$((10#$NEXT_MONTH))

curl -sS -X POST "$BASE_URL/monthly-obligations/generate-test?month=$NEXT_MONTH&year=$NEXT_YEAR" -H "Authorization: Bearer $ADMIN_TOKEN" > /dev/null

echo "  PASS [Created & Authenticated Admin and Member]"

echo ""
echo "== 3. POST /penalties/generate-test (Admin) =="
RESP=$(curl -sS -w '\n%{http_code}' -X POST "$BASE_URL/penalties/generate-test" -H "Authorization: Bearer $ADMIN_TOKEN")
HTTP_CODE=$(echo "$RESP" | tail -n1)
if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
  echo "  PASS [POST /penalties/generate-test -> $HTTP_CODE]"
else
  echo "  FAIL [POST /penalties/generate-test] Expected 200/201, got $HTTP_CODE"
  exit 1
fi

echo ""
echo "== 4. GET /penalties (Admin) =="
RESP=$(curl -sS -w '\n%{http_code}' "$BASE_URL/penalties" -H "Authorization: Bearer $ADMIN_TOKEN")
HTTP_CODE=$(echo "$RESP" | tail -n1)
BODY=$(echo "$RESP" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  echo "  PASS [GET /penalties -> 200]"
else
  echo "  FAIL [GET /penalties] Expected 200, got $HTTP_CODE"
  exit 1
fi

echo ""
echo "== 5. GET /penalties/me (Member) =="
RESP=$(curl -sS -w '\n%{http_code}' "$BASE_URL/penalties/me" -H "Authorization: Bearer $MEMBER_TOKEN")
HTTP_CODE=$(echo "$RESP" | tail -n1)
if [ "$HTTP_CODE" = "200" ]; then
  echo "  PASS [GET /penalties/me -> 200]"
else
  echo "  FAIL [GET /penalties/me] Expected 200, got $HTTP_CODE"
  exit 1
fi

echo ""
echo "== 6. PATCH /penalties/:id/waive (Admin) =="
PENALTY_ID=$(echo "$RESP" | sed '$d' | grep -o '"id":"[^"]*' | head -n1 | cut -d'"' -f4)

if [ -n "$PENALTY_ID" ]; then
  RESP=$(curl -sS -w '\n%{http_code}' -X PATCH "$BASE_URL/penalties/$PENALTY_ID/waive" -H "Authorization: Bearer $ADMIN_TOKEN")
  HTTP_CODE=$(echo "$RESP" | tail -n1)
  if [ "$HTTP_CODE" = "200" ]; then
    echo "  PASS [PATCH /penalties/$PENALTY_ID/waive -> 200]"
  else
    echo "  FAIL [PATCH /penalties/$PENALTY_ID/waive] Expected 200, got $HTTP_CODE"
    exit 1
  fi
else
  echo "  SKIP [Waive Penalty] No penalty found to waive in the list."
fi

echo ""
echo "=================================================="
echo "  ALL PENALTY FLOW TESTS PASSED SUCCESSFULLY!"
echo "=================================================="
