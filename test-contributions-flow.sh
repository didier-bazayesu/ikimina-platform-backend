#!/bin/bash
set -e

BASE_URL=${BASE_URL:-"http://localhost:3000"}
TEST_EMAIL=${TEST_EMAIL:-"didier@gmail.com"}
TEST_PASSWORD=${TEST_PASSWORD:-"didier123"}
MEMBER_EMAIL="contrib.member.$(date +%s)@example.com"
MEMBER_PASSWORD="Password123!"

echo "== BOOTSTRAP =="
ADMIN_TOKEN=$(curl -sS -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

curl -sS -X POST "$BASE_URL/members" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$MEMBER_EMAIL\",\"phone\":\"+250788$(date +%s | tail -c 6)\",\"fullName\":\"Contrib Test Member\",\"password\":\"$MEMBER_PASSWORD\"}" > /dev/null

MEMBER_TOKEN=$(curl -sS -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$MEMBER_EMAIL\",\"password\":\"$MEMBER_PASSWORD\"}" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

# Generate obligations for NEXT month so the just-created member qualifies
# (member.joinedDate is today, which is before next month's periodStart)
NEXT_MONTH=$(date -d "+1 month" +%m 2>/dev/null || date -v+1m +%m 2>/dev/null || echo "10")
NEXT_YEAR=$(date -d "+1 month" +%Y 2>/dev/null || date -v+1m +%Y 2>/dev/null || echo "2026")
# Remove leading zeros for the API
NEXT_MONTH=$((10#$NEXT_MONTH))

curl -sS -X POST "$BASE_URL/monthly-obligations/generate-test?month=$NEXT_MONTH&year=$NEXT_YEAR" -H "Authorization: Bearer $ADMIN_TOKEN" > /dev/null

echo "  PASS [Created & Authenticated Admin and Member]"

echo ""
echo "== IKM-5.6 -- GET /monthly-obligations/me (Fetch Obligation ID) =="
ME_OBS=$(curl -sS "$BASE_URL/monthly-obligations/me" -H "Authorization: Bearer $MEMBER_TOKEN")
OBLIGATION_ID=$(echo "$ME_OBS" | grep -o '"id":"[^"]*' | head -n1 | cut -d'"' -f4)
EXPECTED_AMOUNT=$(echo "$ME_OBS" | grep -o '"expectedAmount":[^,}]*' | head -n1 | cut -d':' -f2)

if [ -n "$OBLIGATION_ID" ]; then
  echo "  PASS [Fetched obligation ID: $OBLIGATION_ID, Amount: $EXPECTED_AMOUNT]"
else
  echo "  FAIL [Fetch Obligation] Could not find obligation for member"
  exit 1
fi

# Create a temporary dummy proof file for testing
DUMMY_FILE="test-proof.pdf"
echo "Dummy PDF Proof Content" > "$DUMMY_FILE"

echo ""
echo "== IKM-5.2 -- POST /contribution-payments (Member Submits Payment) =="
RESP=$(curl -sS -w '\n%{http_code}' -X POST "$BASE_URL/contribution-payments" \
  -H "Authorization: Bearer $MEMBER_TOKEN" \
  -F "obligationIds=[\"$OBLIGATION_ID\"]" \
  -F "amount=$EXPECTED_AMOUNT" \
  -F "paymentDate=2026-09-05" \
  -F "method=MOMO" \
  -F "reference=MOMO-TEST-REF-999" \
  -F "notes=Test contribution payment" \
  -F "proof=@$DUMMY_FILE;type=application/pdf")

HTTP_CODE=$(echo "$RESP" | tail -n1)
BODY=$(echo "$RESP" | sed '$d')

if [ "$HTTP_CODE" = "201" ]; then
  PAYMENT_ID=$(echo "$BODY" | grep -o '"id":"[^"]*' | head -n1 | cut -d'"' -f4)
  echo "  PASS [Payment submitted -> 201, Payment ID: $PAYMENT_ID]"
else
  echo "  FAIL [Payment Submission] Expected 201, got $HTTP_CODE"
  echo "  Response body: $BODY"
  rm -f "$DUMMY_FILE"
  exit 1
fi

rm -f "$DUMMY_FILE"

echo ""
echo "== IKM-5.6 -- GET /contribution-payments/me =="
RESP=$(curl -sS -w '\n%{http_code}' "$BASE_URL/contribution-payments/me" -H "Authorization: Bearer $MEMBER_TOKEN")
HTTP_CODE=$(echo "$RESP" | tail -n1)
if [ "$HTTP_CODE" = "200" ]; then
  echo "  PASS [GET /contribution-payments/me -> 200]"
else
  echo "  FAIL [GET /contribution-payments/me] Expected 200, got $HTTP_CODE"
  exit 1
fi

echo ""
echo "== IKM-5.3 -- GET /contribution-payments (Admin List) =="
RESP=$(curl -sS -w '\n%{http_code}' "$BASE_URL/contribution-payments?status=PENDING" -H "Authorization: Bearer $ADMIN_TOKEN")
HTTP_CODE=$(echo "$RESP" | tail -n1)
if [ "$HTTP_CODE" = "200" ]; then
  echo "  PASS [GET /contribution-payments (Admin) -> 200]"
else
  echo "  FAIL [GET /contribution-payments (Admin)] Expected 200, got $HTTP_CODE"
  exit 1
fi

echo ""
echo "== IKM-5.4 -- PATCH /contribution-payments/:id/approve (Admin Approve) =="
RESP=$(curl -sS -w '\n%{http_code}' -X PATCH "$BASE_URL/contribution-payments/$PAYMENT_ID/approve" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
HTTP_CODE=$(echo "$RESP" | tail -n1)
if [ "$HTTP_CODE" = "200" ]; then
  echo "  PASS [PATCH /contribution-payments/$PAYMENT_ID/approve -> 200]"
else
  echo "  FAIL [Admin Approve] Expected 200, got $HTTP_CODE"
  exit 1
fi

echo ""
echo "=================================================="
echo "  ALL CONTRIBUTION FLOW TESTS PASSED SUCCESSFULLY!"
echo "=================================================="
