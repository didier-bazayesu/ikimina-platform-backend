#!/bin/bash

BASE_URL="http://localhost:3000"

echo "=== Testing Dashboards Flow ==="

# 1. Admin login
echo -e "\nLogging in as Admin..."
ADMIN_LOGIN_RES=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"didier@gmail.com","password":"didier123"}')
ADMIN_TOKEN=$(echo $ADMIN_LOGIN_RES | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

echo "Admin Token: $ADMIN_TOKEN"

# 2. Fetch Admin Dashboard
echo -e "\nFetching Admin Dashboard..."
curl -s -X GET "$BASE_URL/dashboards/admin" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
echo -e "\n"

# 3. Member login
echo -e "\nLogging in as Member..."
MEMBER_EMAIL="dash.member.$(date +%s)@example.com"
MEMBER_PHONE="+25078$(date +%s%N | tail -c 7)"
MEMBER_PASSWORD="Password123!"

curl -sS -X POST "$BASE_URL/members" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$MEMBER_EMAIL\",\"phone\":\"+250788$(date +%s | tail -c 6)\",\"fullName\":\"Dashboard Test Member\",\"password\":\"$MEMBER_PASSWORD\"}" > /dev/null

MEMBER_LOGIN_RES=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$MEMBER_EMAIL\",\"password\":\"$MEMBER_PASSWORD\"}")
MEMBER_TOKEN=$(echo $MEMBER_LOGIN_RES | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

echo "Member Token: $MEMBER_TOKEN"

# 4. Fetch Member Dashboard
echo -e "\nFetching Member Dashboard..."
curl -s -X GET "$BASE_URL/dashboards/member" \
  -H "Authorization: Bearer $MEMBER_TOKEN"
echo -e "\n"

echo "Done!"
