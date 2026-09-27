#!/bin/bash

# Configuration
API_URL="http://localhost:3000"
ADMIN_EMAIL="didier@gmail.com"
ADMIN_PASSWORD="didier123"

echo "Logging in as admin..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")

# Extract JWT token using grep/sed (assuming JSON format like {"accessToken":"..."})
TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"accessToken":"[^"]*' | sed 's/"accessToken":"//')

if [ -z "$TOKEN" ]; then
  echo "Login failed or no token received."
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "Login successful. Received token."

echo "-----------------------------------------------------"
echo "Fetching Contributions Report (CSV format)..."
curl -s -X GET "$API_URL/reports/contributions?format=csv" \
  -H "Authorization: Bearer $TOKEN"
echo ""

echo "-----------------------------------------------------"
echo "Fetching Defaulters Report (JSON format)..."
curl -s -X GET "$API_URL/reports/defaulters?format=json" \
  -H "Authorization: Bearer $TOKEN"
echo ""

echo "-----------------------------------------------------"
echo "Fetching Financial Summary (PDF format)..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$API_URL/reports/financial-summary?format=pdf" \
  -H "Authorization: Bearer $TOKEN")

if [ "$HTTP_STATUS" -eq 200 ] || [ "$HTTP_STATUS" -eq 201 ]; then
  echo "Financial Summary PDF download successful (HTTP $HTTP_STATUS)."
else
  echo "Financial Summary PDF download failed (HTTP $HTTP_STATUS)."
fi
echo "-----------------------------------------------------"
