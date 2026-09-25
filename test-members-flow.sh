#!/usr/bin/env bash
# Ikimina -- Members flow test (IKM-2.2 to IKM-2.8)
# Usage: bash test-members-flow.sh
# Override: BASE_URL=http://localhost:4000 ADMIN_EMAIL=... bash test-members-flow.sh
# Requires: curl, bash. Server must be running.

set -uo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
ADMIN_EMAIL="${ADMIN_EMAIL:-didier@gmail.com}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-didier123}"
MEMBER_EMAIL="${MEMBER_EMAIL:-test.member.sprint2@example.com}"
MEMBER_PASSWORD="${MEMBER_PASSWORD:-TempPass123!}"

PASS_COUNT=0
FAIL_COUNT=0
STATUS=""
BODY=""

extract_field() {
  local body="$1" field="$2"
  echo "$body" | sed -nE "s/.*\"$field\"[[:space:]]*:[[:space:]]*\"([^\"]*)\".*/\1/p"
}

split_status() {
  STATUS=$(echo "$1" | tail -n1)
  BODY=$(echo "$1" | sed '$d')
}

assert_status() {
  local desc="$1" expected="$2"
  if [ "$STATUS" = "$expected" ]; then
    echo "  PASS [$desc] -- got $STATUS"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    echo "  FAIL [$desc] -- expected $expected, got $STATUS"
    echo "       body: $BODY"
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi
}

section() { echo ""; echo "== $1 =="; }

abort() {
  echo "  ABORT: $1"
  echo "  PASSED: $PASS_COUNT   FAILED: $FAIL_COUNT"
  exit 1
}

# ---- BOOTSTRAP: Admin login -------------------------------------------------

section "BOOTSTRAP -- Admin login"
resp=$(curl -sS -w '\n%{http_code}' -X POST "$BASE_URL/auth/login" \
  -H 'Content-Type: application/json' \
  -d "$(printf '{"email":"%s","password":"%s"}' "$ADMIN_EMAIL" "$ADMIN_PASSWORD")")
split_status "$resp"
assert_status "Admin login" 200
[ "$STATUS" != "200" ] && abort "Admin login failed. Is the server running?"
ADMIN_TOKEN=$(extract_field "$BODY" accessToken)

# ---- IKM-2.2: POST /members -------------------------------------------------

section "IKM-2.2 -- POST /members"

# No auth -> 401
resp=$(curl -sS -w '\n%{http_code}' -X POST "$BASE_URL/members" \
  -H 'Content-Type: application/json' \
  -d '{"email":"x@x.com","phone":"+250780000099","fullName":"X","password":"Pass1234!"}')
split_status "$resp"
assert_status "POST /members no auth -> 401" 401

# Happy path
resp=$(curl -sS -w '\n%{http_code}' -X POST "$BASE_URL/members" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d "$(printf '{"email":"%s","phone":"+250781111111","fullName":"Test Member A","password":"%s"}' "$MEMBER_EMAIL" "$MEMBER_PASSWORD")")
split_status "$resp"
assert_status "POST /members creates member (201)" 201
[ "$STATUS" != "201" ] && abort "Member creation failed -- cannot continue member tests."
MEMBER_A_ID=$(extract_field "$BODY" id)

# Duplicate email -> 409
resp=$(curl -sS -w '\n%{http_code}' -X POST "$BASE_URL/members" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d "$(printf '{"email":"%s","phone":"+250781111999","fullName":"Dup","password":"Pass1234!"}' "$MEMBER_EMAIL")")
split_status "$resp"
assert_status "POST /members duplicate email -> 409" 409

# Duplicate phone -> 409
resp=$(curl -sS -w '\n%{http_code}' -X POST "$BASE_URL/members" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"email":"unique9@x.com","phone":"+250781111111","fullName":"Dup2","password":"Pass1234!"}')
split_status "$resp"
assert_status "POST /members duplicate phone -> 409" 409

# Missing required field -> 400
resp=$(curl -sS -w '\n%{http_code}' -X POST "$BASE_URL/members" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"phone":"+250781111222","fullName":"No Email","password":"Pass1234!"}')
split_status "$resp"
assert_status "POST /members missing email -> 400" 400

# Response must not include password
if echo "$BODY" | grep -qi "password"; then
  echo "  FAIL [Response must not contain password field]"
  FAIL_COUNT=$((FAIL_COUNT + 1))
else
  echo "  PASS [Response does not contain password field]"
  PASS_COUNT=$((PASS_COUNT + 1))
fi

# ---- IKM-2.3: GET /members --------------------------------------------------

section "IKM-2.3 -- GET /members"

resp=$(curl -sS -w '\n%{http_code}' "$BASE_URL/members" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
split_status "$resp"
assert_status "GET /members returns 200" 200

resp=$(curl -sS -w '\n%{http_code}' "$BASE_URL/members?status=ACTIVE" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
split_status "$resp"
assert_status "GET /members?status=ACTIVE returns 200" 200

resp=$(curl -sS -w '\n%{http_code}' "$BASE_URL/members?limit=200" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
split_status "$resp"
assert_status "GET /members?limit=200 -> 400 (exceeds max)" 400

resp=$(curl -sS -w '\n%{http_code}' "$BASE_URL/members?status=INVALID" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
split_status "$resp"
assert_status "GET /members?status=INVALID -> 400" 400

# ---- IKM-2.4: GET /members/:id ----------------------------------------------

section "IKM-2.4 -- GET /members/:id"

resp=$(curl -sS -w '\n%{http_code}' "$BASE_URL/members/$MEMBER_A_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
split_status "$resp"
assert_status "GET /members/:id found (200)" 200

resp=$(curl -sS -w '\n%{http_code}' "$BASE_URL/members/00000000-0000-0000-0000-000000000000" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
split_status "$resp"
assert_status "GET /members/:id not found (404)" 404

# ---- IKM-2.5: PATCH /members/:id -------------------------------------------

section "IKM-2.5 -- PATCH /members/:id"

resp=$(curl -sS -w '\n%{http_code}' -X PATCH "$BASE_URL/members/$MEMBER_A_ID" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"fullName":"Test Member A Updated"}')
split_status "$resp"
assert_status "PATCH /members/:id update fullName (200)" 200

resp=$(curl -sS -w '\n%{http_code}' -X PATCH "$BASE_URL/members/$MEMBER_A_ID" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{}')
split_status "$resp"
assert_status "PATCH /members/:id empty body -> 400" 400

# ---- IKM-2.6: PATCH /members/:id/status -------------------------------------

section "IKM-2.6 -- PATCH /members/:id/status"

# Suspend
resp=$(curl -sS -w '\n%{http_code}' -X PATCH "$BASE_URL/members/$MEMBER_A_ID/status" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"status":"SUSPENDED","reason":"Test suspension"}')
split_status "$resp"
assert_status "PATCH /members/:id/status suspend (200)" 200

# Confirm suspended member cannot login
resp=$(curl -sS -w '\n%{http_code}' -X POST "$BASE_URL/auth/login" \
  -H 'Content-Type: application/json' \
  -d "$(printf '{"email":"%s","password":"%s"}' "$MEMBER_EMAIL" "$MEMBER_PASSWORD")")
split_status "$resp"
assert_status "Suspended member login blocked (403)" 403

# Missing reason -> 400
resp=$(curl -sS -w '\n%{http_code}' -X PATCH "$BASE_URL/members/$MEMBER_A_ID/status" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"status":"EXITED"}')
split_status "$resp"
assert_status "PATCH /members/:id/status missing reason -> 400" 400

# Reactivate (no reason required)
resp=$(curl -sS -w '\n%{http_code}' -X PATCH "$BASE_URL/members/$MEMBER_A_ID/status" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"status":"ACTIVE"}')
split_status "$resp"
assert_status "PATCH /members/:id/status reactivate (200)" 200

# ---- IKM-2.7 + 2.8: /members/me --------------------------------------------

section "IKM-2.7 + 2.8 -- GET|PATCH /members/me"

# Member login
resp=$(curl -sS -w '\n%{http_code}' -X POST "$BASE_URL/auth/login" \
  -H 'Content-Type: application/json' \
  -d "$(printf '{"email":"%s","password":"%s"}' "$MEMBER_EMAIL" "$MEMBER_PASSWORD")")
split_status "$resp"
assert_status "Member login for /me tests (200)" 200
MEMBER_TOKEN=$(extract_field "$BODY" accessToken)

# GET /members/me
resp=$(curl -sS -w '\n%{http_code}' "$BASE_URL/members/me" \
  -H "Authorization: Bearer $MEMBER_TOKEN")
split_status "$resp"
assert_status "GET /members/me returns own profile (200)" 200

# Admin cannot use GET /members/me (wrong role)
resp=$(curl -sS -w '\n%{http_code}' "$BASE_URL/members/me" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
split_status "$resp"
assert_status "GET /members/me with ADMIN token -> 403" 403

# PATCH /members/me
resp=$(curl -sS -w '\n%{http_code}' -X PATCH "$BASE_URL/members/me" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $MEMBER_TOKEN" \
  -d '{"fullName":"Test Member A Self-Updated"}')
split_status "$resp"
assert_status "PATCH /members/me updates own profile (200)" 200

# Empty body -> 400
resp=$(curl -sS -w '\n%{http_code}' -X PATCH "$BASE_URL/members/me" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $MEMBER_TOKEN" \
  -d '{}')
split_status "$resp"
assert_status "PATCH /members/me empty body -> 400" 400

# ---- CLEANUP ---------------------------------------------------------------

section "CLEANUP"
curl -sS -X PATCH "$BASE_URL/members/$MEMBER_A_ID/status" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"status":"EXITED","reason":"Test cleanup"}' > /dev/null
echo "  INFO: Member A exited. To re-run, delete the test user row from DB first."

echo ""
echo "=================================================="
echo "  PASSED: $PASS_COUNT   FAILED: $FAIL_COUNT"
echo "=================================================="
[ "$FAIL_COUNT" -gt 0 ] && exit 1
exit 0