#!/bin/bash

BASE_URL="http://localhost:3000"

echo "=== 1. Login as Member ==="
MEMBER_TOKEN=$(curl -s -X POST $BASE_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"member@gmail.com","password":"didier123"}' | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin').toString()); console.log(d.data?.accessToken || '');")

echo "Member Token: $MEMBER_TOKEN"

echo "=== 2. Login as Admin ==="
ADMIN_TOKEN=$(curl -s -X POST $BASE_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"didier@gmail.com","password":"didier123"}' | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin').toString()); console.log(d.data?.accessToken || '');")

echo "Admin Token: $ADMIN_TOKEN"

echo "=== 3. Get first Pending Payment ==="
PAYMENT_ID=$(curl -s -X GET "$BASE_URL/contribution-payments?status=PENDING" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin').toString()); const items = d.data?.items || d.data?.data?.items || d.items; if(items && items.length > 0) { console.log(items[0].id) } else { console.log('') }")

echo "Payment ID: $PAYMENT_ID"

if [ -z "$PAYMENT_ID" ]; then
  echo "No pending payment found to flag. Please submit a payment first."
  exit 1
fi

echo "=== 4. Flag the Payment ==="
curl -s -X PATCH "$BASE_URL/contribution-payments/$PAYMENT_ID/flag" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason":"Proof is blurry", "message":"Please upload a clearer screenshot"}' | node -e "console.log(JSON.stringify(JSON.parse(require('fs').readFileSync('/dev/stdin').toString()), null, 2))"

echo "=== 5. Check Member Notifications ==="
curl -s -X GET "$BASE_URL/notifications?limit=5" \
  -H "Authorization: Bearer $MEMBER_TOKEN" | node -e "console.log(JSON.stringify(JSON.parse(require('fs').readFileSync('/dev/stdin').toString()), null, 2))"
