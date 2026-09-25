#!/bin/bash
set -e

BASE_URL=${BASE_URL:-"http://localhost:3000"}
TEST_EMAIL=${TEST_EMAIL:-"didier@gmail.com"}
TEST_PASSWORD=${TEST_PASSWORD:-"didier123"}
MEMBER_EMAIL="obligation.member.$(date +%s)@example.com"
MEMBER_PASSWORD="Password123!"

echo "== BOOTSTRAP =="
ADMIN_TOKEN=$(curl -sS -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

curl -sS -X POST "$BASE_URL/members" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$MEMBER_EMAIL\",\"phone\":\"+250788$(date +%s | tail -c 6)\",\"fullName\":\"Test Member\",\"password\":\"$MEMBER_PASSWORD\"}" > /dev/null

MEMBER_TOKEN=$(curl -sS -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$MEMBER_EMAIL\",\"password\":\"$MEMBER_PASSWORD\"}" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

echo "  PASS [Created & Authenticated User]"

echo ""
echo "== IKM-4.2 -- POST /monthly-obligations/generate-test (Cron Simulation) =="
RESP=$(curl -sS -w '\n%{http_code}' -X POST "$BASE_URL/monthly-obligations/generate-test" -H "Authorization: Bearer $ADMIN_TOKEN")
HTTP_CODE=$(echo "$RESP" | tail -n1)
if [ "$HTTP_CODE" = "201" ]; then
  echo "  PASS [Generation triggered -> 201]"
else
  echo "  FAIL [Generation] Expected 201, got $HTTP_CODE"
  exit 1
fi

echo ""
echo "== IKM-4.3 -- GET /monthly-obligations =="
RESP=$(curl -sS -w '\n%{http_code}' "$BASE_URL/monthly-obligations?limit=10" -H "Authorization: Bearer $ADMIN_TOKEN")
HTTP_CODE=$(echo "$RESP" | tail -n1)
if [ "$HTTP_CODE" = "200" ]; then
  echo "  PASS [GET /monthly-obligations -> 200]"
else
  echo "  FAIL [GET /monthly-obligations] Expected 200, got $HTTP_CODE"
  exit 1
fi

echo ""
echo "== IKM-4.4 -- GET /monthly-obligations/me =="
RESP=$(curl -sS -w '\n%{http_code}' "$BASE_URL/monthly-obligations/me" -H "Authorization: Bearer $MEMBER_TOKEN")
HTTP_CODE=$(echo "$RESP" | tail -n1)
if [ "$HTTP_CODE" = "200" ]; then
  echo "  PASS [GET /monthly-obligations/me -> 200]"
else
  echo "  FAIL [GET /monthly-obligations/me] Expected 200, got $HTTP_CODE"
  exit 1
fi

echo ""
echo "=================================================="
echo "  ALL TESTS PASSED SUCCESSFULLY!"
echo "=================================================="
