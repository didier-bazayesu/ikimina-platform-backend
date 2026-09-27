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

echo -e "\n2. GET /transactions/balance"
curl -s -X GET "$API_URL/transactions/balance" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
echo -e "\n"

echo -e "\n3. GET /transactions (Admin gets all)"
curl -s -X GET "$API_URL/transactions" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
echo -e "\n"

echo -e "\n4. GET /transactions?type=WITHDRAWAL"
curl -s -X GET "$API_URL/transactions?type=WITHDRAWAL" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
echo -e "\n"

echo "Transaction flow test completed."
