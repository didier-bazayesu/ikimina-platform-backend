#!/bin/bash
set -e

echo "Logging in as admin..."
ADMIN_TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"didier@gmail.com","password":"didier123"}' | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

echo "Admin Token: $ADMIN_TOKEN"

MEMBER_EMAIL="state.member.$(date +%s)@example.com"
MEMBER_PHONE="+25078$(date +%s%N | tail -c 7)"

echo "Creating a member..."
MEMBER_ID=$(curl -s -X POST http://localhost:3000/members \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$MEMBER_EMAIL\",\"phone\":\"$MEMBER_PHONE\",\"fullName\":\"Statement Member\",\"password\":\"Password123!\"}" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

echo "Member ID: $MEMBER_ID"

if [ -z "$MEMBER_ID" ]; then
  # Maybe member already exists, just login directly
  echo "Member creation might have failed (perhaps email exists), logging in..."
fi

echo "Logging in as member..."
MEMBER_TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$MEMBER_EMAIL\",\"password\":\"Password123!\"}" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ -z "$MEMBER_TOKEN" ]; then
    echo "Attempting to login as admin if member login fails..."
    MEMBER_TOKEN=$ADMIN_TOKEN
fi

echo "Member Token: $MEMBER_TOKEN"

echo "Fetching Statement (JSON)..."
curl -s -X GET "http://localhost:3000/statements/me?format=json" \
  -H "Authorization: Bearer $MEMBER_TOKEN"

echo -e "\n\nFetching Statement (PDF)..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X GET "http://localhost:3000/statements/me?format=pdf" \
  -H "Authorization: Bearer $MEMBER_TOKEN")

echo "PDF Statement HTTP Status: $HTTP_STATUS"

if [ "$HTTP_STATUS" -eq 200 ] || [ "$HTTP_STATUS" -eq 201 ]; then
    echo "Successfully generated PDF Statement"
else
    echo "Failed to generate PDF Statement"
fi
