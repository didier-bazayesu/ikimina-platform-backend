#!/bin/bash
set -e

API_URL="http://localhost:3000"
echo "Starting E2E Platform Flow Test..."

# 1. Login as admin
echo "Logging in as admin..."
LOGIN_RES=$(curl -s -X POST $API_URL/auth/login -H "Content-Type: application/json" -d '{"email":"didier@gmail.com","password":"didier123"}')
TOKEN=$(echo $LOGIN_RES | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
if [ -z "$TOKEN" ]; then
  echo "Login failed! Response: $LOGIN_RES"
  exit 1
fi
echo "Admin logged in successfully."

# 2. Create a new member
echo "Creating new member..."
NEW_MEMBER_EMAIL="member_$(date +%s)@example.com"
NEW_MEMBER_PHONE="+25078$(date +%s | tail -c 7)"
MEMBER_RES=$(curl -s -X POST $API_URL/members -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "{\"fullName\":\"Full Test Member\",\"email\":\"$NEW_MEMBER_EMAIL\",\"phone\":\"$NEW_MEMBER_PHONE\",\"password\":\"Password123!\",\"joinedDate\":\"2026-01-01\"}")
MEMBER_ID=$(echo $MEMBER_RES | grep -o '"id":"[^"]*' | head -n 1 | cut -d'"' -f4)
if [ -z "$MEMBER_ID" ]; then
  echo "Member creation failed! Response: $MEMBER_RES"
  exit 1
fi
echo "Member created with ID: $MEMBER_ID"

# 3. Generate test obligations for members
echo "Generating test monthly obligations..."
GEN_RES=$(curl -s -X POST $API_URL/monthly-obligations/generate-test -H "Authorization: Bearer $TOKEN")
echo "Obligations generated."

# 4. Login as member
echo "Logging in as new member..."
MEMBER_LOGIN_RES=$(curl -s -X POST $API_URL/auth/login -H "Content-Type: application/json" -d "{\"email\":\"$NEW_MEMBER_EMAIL\",\"password\":\"Password123!\"}")
MEMBER_TOKEN=$(echo $MEMBER_LOGIN_RES | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
if [ -z "$MEMBER_TOKEN" ]; then
  echo "Member login failed! Response: $MEMBER_LOGIN_RES"
  exit 1
fi

# 5. Fetch member's obligation ID
echo "Fetching obligation for member..."
OBLIGATION_RES=$(curl -s -X GET $API_URL/monthly-obligations/me -H "Authorization: Bearer $MEMBER_TOKEN")
OBLIGATION_ID=$(echo "$OBLIGATION_RES" | grep -o '"id":"[^"]*' | head -n 1 | cut -d'"' -f4)
if [ -z "$OBLIGATION_ID" ]; then
  echo "Warning: No obligation found, generating obligation..."
  GEN_RES=$(curl -s -X POST $API_URL/monthly-obligations/generate-test -H "Authorization: Bearer $TOKEN")
  OBLIGATION_RES=$(curl -s -X GET $API_URL/monthly-obligations/me -H "Authorization: Bearer $MEMBER_TOKEN")
  OBLIGATION_ID=$(echo "$OBLIGATION_RES" | grep -o '"id":"[^"]*' | head -n 1 | cut -d'"' -f4)
fi
echo "Obligation ID: $OBLIGATION_ID"

# 6. Upload proof of payment
echo "Uploading proof of payment..."
echo "dummy image content" > dummy_proof.jpg
PROOF_RES=$(curl -s -X POST $API_URL/uploads/proof -H "Authorization: Bearer $MEMBER_TOKEN" -F "file=@dummy_proof.jpg")
PROOF_URL=$(echo "$PROOF_RES" | grep -o '"url":"[^"]*' | cut -d'"' -f4)
rm -f dummy_proof.jpg
if [ -z "$PROOF_URL" ]; then
  echo "Upload failed! Response: $PROOF_RES"
  exit 1
fi
echo "Proof uploaded: $PROOF_URL"

# 7. Submit contribution payment using the returned proof URL
echo "Submitting contribution payment..."
CONTRIBUTION_RES=$(curl -s -X POST $API_URL/contribution-payments -H "Authorization: Bearer $MEMBER_TOKEN" -H "Content-Type: application/json" -d "{\"obligationIds\":[\"$OBLIGATION_ID\"],\"amount\":25000,\"paymentDate\":\"2026-09-20\",\"method\":\"MOMO\",\"reference\":\"REF-MOMO-123456\",\"proofUrl\":\"$PROOF_URL\"}")
CONTRIBUTION_ID=$(echo $CONTRIBUTION_RES | grep -o '"id":"[^"]*' | head -n 1 | cut -d'"' -f4)
if [ -z "$CONTRIBUTION_ID" ]; then
  echo "Contribution submission failed! Response: $CONTRIBUTION_RES"
  exit 1
fi
echo "Contribution submitted: $CONTRIBUTION_ID"

# 8. Approve contribution payment as admin
echo "Approving contribution payment..."
APPROVE_RES=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH $API_URL/contribution-payments/$CONTRIBUTION_ID/approve -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"status":"APPROVED"}')
if [ "$APPROVE_RES" != "200" ]; then
  echo "Approval failed with status $APPROVE_RES"
  exit 1
fi
echo "Contribution approved."

# 9. Fetch notifications for member
echo "Fetching notifications for member..."
NOTIFICATIONS_RES=$(curl -s -o /dev/null -w "%{http_code}" -X GET $API_URL/notifications/me -H "Authorization: Bearer $MEMBER_TOKEN")
if [ "$NOTIFICATIONS_RES" != "200" ]; then
  echo "Fetching notifications failed with status $NOTIFICATIONS_RES"
  exit 1
fi
echo "Notifications fetched successfully."

# 10. Fetch audit logs for admin
echo "Fetching audit logs..."
AUDIT_LOGS_RES=$(curl -s -o /dev/null -w "%{http_code}" -X GET $API_URL/audit-logs -H "Authorization: Bearer $TOKEN")
if [ "$AUDIT_LOGS_RES" != "200" ]; then
  echo "Fetching audit logs failed with status $AUDIT_LOGS_RES"
  exit 1
fi
echo "Audit logs fetched successfully."

# 11. Download PDF statement for member
echo "Downloading PDF statement..."
STATEMENT_RES=$(curl -s -o statement.pdf -w "%{http_code}" -X GET "$API_URL/statements/me?format=pdf" -H "Authorization: Bearer $MEMBER_TOKEN")
if [ "$STATEMENT_RES" != "200" ]; then
  echo "Downloading statement failed with status $STATEMENT_RES"
  rm -f statement.pdf
  exit 1
fi
echo "Statement downloaded successfully."
rm -f statement.pdf

echo "All E2E steps passed successfully!"
