#!/bin/bash

API_URL="http://localhost:3000"

echo "1. BOOTSTRAP (Admin login)"
ADMIN_LOGIN_RES=$(curl -s -X POST "$API_URL/auth/login" -H "Content-Type: application/json" -d '{"email":"didier@gmail.com","password":"didier123"}')
ADMIN_TOKEN=$(echo $ADMIN_LOGIN_RES | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ -z "$ADMIN_TOKEN" ]; then
  echo "Admin login failed!"
  echo "$ADMIN_LOGIN_RES"
  exit 1
fi

echo "Admin Token: $ADMIN_TOKEN"

echo "2. POST /withdrawals"
curl -s -X POST "$API_URL/withdrawals" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 15000,
    "withdrawalDate": "2026-09-10",
    "beneficiary": "Test Member",
    "category": "PAYOUT",
    "description": "Test payout withdrawal"
  }'
echo -e "\n"

echo "3. GET /withdrawals"
curl -s -X GET "$API_URL/withdrawals" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
echo -e "\n"

echo "Withdrawal flow test completed."
