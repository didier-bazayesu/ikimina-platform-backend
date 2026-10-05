#!/usr/bin/env bash
set -e

BASE_URL="http://localhost:3000"
ADMIN_EMAIL="didier@gmail.com"
ADMIN_PASS="didier123"

RANDOM_ID=$RANDOM
MEMBER_EMAIL="member$RANDOM_ID@gmail.com"
MEMBER_PHONE="+2507881$RANDOM"
MEMBER_PASS="didier123"
MEMBER_NAME="John Doe"

echo "=== 1. Login as Admin ==="
LOGIN_RES=$(curl -s -X POST $BASE_URL/auth/login -H "Content-Type: application/json" -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASS\"}")
TOKEN=$(node -e "try { console.log(JSON.parse(process.argv[1]).data.accessToken) } catch(e) {}" "$LOGIN_RES")

if [ -z "$TOKEN" ] || [ "$TOKEN" == "undefined" ]; then
  echo "Login failed! Ensure backend is running (npm run start:dev) and admin credentials are correct."
  echo "Response: $LOGIN_RES"
  exit 1
fi
echo "Admin logged in successfully."

echo -e "\n=== 2. Add new member ==="
ADD_RES=$(curl -s -X POST $BASE_URL/members -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "{\"email\":\"$MEMBER_EMAIL\",\"phone\":\"$MEMBER_PHONE\",\"fullName\":\"$MEMBER_NAME\",\"password\":\"$MEMBER_PASS\"}")
MEMBER_ID=$(node -e "try { const r=JSON.parse(process.argv[1]); console.log(r.data?.data?.id || r.data?.id || r.id || '') } catch(e) {}" "$ADD_RES")

if [ -z "$MEMBER_ID" ]; then
  echo "Failed to add member."
  echo "Response: $ADD_RES"
  exit 1
fi
echo "Member added with ID: $MEMBER_ID"

echo -e "\n=== 3. Suspend member ==="
SUSPEND_RES=$(curl -s -X PATCH $BASE_URL/members/$MEMBER_ID/status -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "{\"status\":\"SUSPENDED\",\"reason\":\"Testing suspension\"}")
echo "Response: $SUSPEND_RES"

echo -e "\n=== 4. Exit member ==="
EXIT_RES=$(curl -s -X PATCH $BASE_URL/members/$MEMBER_ID/status -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "{\"status\":\"EXITED\",\"reason\":\"Leaving group\"}")
echo "Response: $EXIT_RES"

echo -e "\n=== 5. Try to reactivate EXITED member directly (should fail) ==="
FAIL_RES=$(curl -s -X PATCH $BASE_URL/members/$MEMBER_ID/status -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "{\"status\":\"ACTIVE\",\"reason\":\"Attempt reactivate\"}")
echo "Response: $FAIL_RES"

echo -e "\n=== 6. Rejoin member (Add member with same email/phone) ==="
REJOIN_RES=$(curl -s -X POST $BASE_URL/members -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "{\"email\":\"$MEMBER_EMAIL\",\"phone\":\"$MEMBER_PHONE\",\"fullName\":\"$MEMBER_NAME (Rejoined)\",\"password\":\"$MEMBER_PASS\"}")
NEW_MEMBER_ID=$(node -e "try { const r=JSON.parse(process.argv[1]); console.log(r.data?.data?.id || r.data?.id || r.id || '') } catch(e) {}" "$REJOIN_RES")

if [ -z "$NEW_MEMBER_ID" ]; then
  echo "Failed to rejoin member."
  echo "Response: $REJOIN_RES"
else
  echo "Member rejoined successfully! New Member ID: $NEW_MEMBER_ID"
fi

echo -e "\n=== 7. Check Audit Logs (Last 3 events) ==="
AUDIT_RES=$(curl -s -X GET "$BASE_URL/audit-logs?limit=3" -H "Authorization: Bearer $TOKEN")
echo "$AUDIT_RES"
