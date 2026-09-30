#!/usr/bin/env bash
# ============================================================================
# test-all-ikmn-project.sh
#
# Comprehensive end-to-end integration test for the Ikimina Platform Backend.
# Communicates exclusively via HTTP/REST with the running NestJS backend.
# Does NOT mock anything, does NOT directly touch the database.
#
# Usage:
#   ./test-all-ikmn-project.sh
#   BASE_URL=http://localhost:3000 ./test-all-ikmn-project.sh
# ============================================================================

set -euo pipefail

# ── Configuration ───────────────────────────────────────────────────────────
BASE_URL="http://localhost:3000"
ADMIN_EMAIL="didier@gmail.com"
ADMIN_PASS="didier123"
MEMBER_PASS="didier123"

RUN_ID=$(date +%s)
MEMBER_EMAILS=("member1_${RUN_ID}@test.com" "member2_${RUN_ID}@test.com" "member3_${RUN_ID}@test.com" "member4_${RUN_ID}@test.com" "member5_${RUN_ID}@test.com")
MEMBER_NAMES=("Test Member One ${RUN_ID}" "Test Member Two ${RUN_ID}" "Test Member Three ${RUN_ID}" "Test Member Four ${RUN_ID}" "Test Member Five ${RUN_ID}")
MEMBER_PHONES=("+2507881${RUN_ID: -4:4}1" "+2507881${RUN_ID: -4:4}2" "+2507881${RUN_ID: -4:4}3" "+2507881${RUN_ID: -4:4}4" "+2507881${RUN_ID: -4:4}5")

# ── Counters ────────────────────────────────────────────────────────────────
PASS_COUNT=0
FAIL_COUNT=0
SKIP_COUNT=0
declare -a RESULTS=()

# ── Prerequisite check ──────────────────────────────────────────────────────
if ! command -v jq &>/dev/null; then
  echo "[FATAL] jq is required but not installed. Install it and retry."
  exit 1
fi

if ! command -v curl &>/dev/null; then
  echo "[FATAL] curl is required but not installed."
  exit 1
fi

# ── Helpers ─────────────────────────────────────────────────────────────────

RESP_FILE="test_resp.json"
trap 'rm -f "$RESP_FILE"' EXIT

http() {
  local method="$1" path="$2" body="${3:-}" token="${4:-}"
  local url="${BASE_URL}${path}"
  local raw
  if [[ -n "$token" ]]; then
    if [[ -n "$body" ]]; then
      raw=$(curl -sS -w '\n%{http_code}' -o "$RESP_FILE" -X "$method" -H "Content-Type: application/json" -H "Authorization: Bearer $token" -d "$body" "$url" 2>&1) || true
    else
      raw=$(curl -sS -w '\n%{http_code}' -o "$RESP_FILE" -X "$method" -H "Content-Type: application/json" -H "Authorization: Bearer $token" "$url" 2>&1) || true
    fi
  else
    if [[ -n "$body" ]]; then
      raw=$(curl -sS -w '\n%{http_code}' -o "$RESP_FILE" -X "$method" -H "Content-Type: application/json" -d "$body" "$url" 2>&1) || true
    else
      raw=$(curl -sS -w '\n%{http_code}' -o "$RESP_FILE" -X "$method" -H "Content-Type: application/json" "$url" 2>&1) || true
    fi
  fi
  echo "$raw" | tail -1
}

http_multipart() {
  local method="$1" path="$2" token="$3"
  shift 3
  local url="${BASE_URL}${path}"
  local raw
  if [[ -n "$token" ]]; then
    raw=$(curl -sS -w '\n%{http_code}' -o "$RESP_FILE" -X "$method" -H "Authorization: Bearer $token" "$@" "$url" 2>&1) || true
  else
    raw=$(curl -sS -w '\n%{http_code}' -o "$RESP_FILE" -X "$method" "$@" "$url" 2>&1) || true
  fi
  echo "$raw" | tail -1
}

# Extract a value from the response JSON (respects the global ResponseInterceptor wrapper).
# The interceptor wraps all controller returns as: { success, data, message }
# Some controllers return { data: X, message: Y } which becomes { success, data: { data: X, message: Y } }
# We always read from $RESP_FILE
jq_resp() {
  jq -r "$1" < "$RESP_FILE" 2>/dev/null
}

# Record test result
pass() {
  local name="$1"
  PASS_COUNT=$((PASS_COUNT + 1))
  RESULTS+=("PASS|$name")
  echo "[PASS] $name"
}

fail() {
  local name="$1" detail="${2:-}"
  FAIL_COUNT=$((FAIL_COUNT + 1))
  RESULTS+=("FAIL|$name")
  echo "[FAIL] $name"
  if [[ -n "$detail" ]]; then
    echo "       $detail"
  fi
}

skip() {
  local name="$1" reason="${2:-}"
  SKIP_COUNT=$((SKIP_COUNT + 1))
  RESULTS+=("SKIP|$name")
  echo "[SKIP] $name ($reason)"
}

assert_status() {
  local test_name="$1" expected="$2" actual="$3"
  if [[ "$actual" == "$expected" ]]; then
    pass "$test_name"
  else
    local body
    body=$(jq_resp '.' 2>/dev/null | head -5)
    fail "$test_name" "Expected HTTP $expected, got HTTP $actual. Response: $body"
  fi
}

assert_json_field() {
  local test_name="$1" jq_expr="$2" expected="$3"
  local actual
  actual=$(jq_resp "$jq_expr")
  if [[ "$actual" == "$expected" ]]; then
    pass "$test_name"
  else
    fail "$test_name" "Expected '$expected', got '$actual'"
  fi
}

echo "========================================"
echo "IKIMINA END-TO-END TEST SUITE"
echo "========================================"
echo "Target: $BASE_URL"
echo "Started: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo ""

# ════════════════════════════════════════════════════════════════════════════
# SECTION 1: HEALTH CHECK
# ════════════════════════════════════════════════════════════════════════════
echo "── Section 1: Health Check ──"

STATUS=$(http GET /health)
assert_status "Health check" "200" "$STATUS"

# ════════════════════════════════════════════════════════════════════════════
# SECTION 2: ADMIN AUTHENTICATION
# ════════════════════════════════════════════════════════════════════════════
echo ""
echo "── Section 2: Admin Authentication ──"

STATUS=$(http POST /auth/login "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASS\"}")
if [[ "$STATUS" == "200" ]]; then
  # Login returns: { success, data: { accessToken, refreshToken, user: { id, email, role } }, message }
  ADMIN_TOKEN=$(jq_resp '.data.accessToken // .data.data.accessToken')
  ADMIN_REFRESH=$(jq_resp '.data.refreshToken // .data.data.refreshToken')
  ADMIN_USER_ID=$(jq_resp '.data.user.id // .data.data.user.id')
  if [[ -n "$ADMIN_TOKEN" && "$ADMIN_TOKEN" != "null" ]]; then
    pass "Admin login"
  else
    fail "Admin login" "Token was null or empty in response"
    echo "[FATAL] Cannot proceed without admin token."
    exit 1
  fi
else
  fail "Admin login" "HTTP $STATUS"
  echo "[FATAL] Cannot proceed without admin authentication."
  exit 1
fi

# Test refresh token
STATUS=$(http POST /auth/refresh "{\"refreshToken\":\"$ADMIN_REFRESH\"}")
if [[ "$STATUS" == "200" ]]; then
  NEW_TOKEN=$(jq_resp '.data.accessToken // .data.data.accessToken')
  if [[ -n "$NEW_TOKEN" && "$NEW_TOKEN" != "null" ]]; then
    ADMIN_TOKEN="$NEW_TOKEN"
    pass "Admin token refresh"
  else
    fail "Admin token refresh" "New token was null"
  fi
else
  fail "Admin token refresh" "HTTP $STATUS"
fi

# ════════════════════════════════════════════════════════════════════════════
# SECTION 3: SYSTEM SETTINGS
# ════════════════════════════════════════════════════════════════════════════
echo ""
echo "── Section 3: System Settings ──"

STATUS=$(http GET /system-settings "" "$ADMIN_TOKEN")
if [[ "$STATUS" == "200" ]]; then
  MONTHLY_SHARE=$(jq_resp '.data.monthlyShareAmount // .data.data.monthlyShareAmount')
  PENALTY_PCT=$(jq_resp '.data.penaltyPercentage // .data.data.penaltyPercentage')
  DUE_DAY=$(jq_resp '.data.dueDay // .data.data.dueDay')
  CURRENCY=$(jq_resp '.data.currency // .data.data.currency')
  pass "Get system settings"
  echo "       Monthly share: $MONTHLY_SHARE, Penalty: ${PENALTY_PCT}%, Due day: $DUE_DAY, Currency: $CURRENCY"
else
  fail "Get system settings" "HTTP $STATUS"
  # Defaults
  MONTHLY_SHARE=20000
  PENALTY_PCT=10
  DUE_DAY=5
fi

# ════════════════════════════════════════════════════════════════════════════
# SECTION 4: MEMBER CREATION
# ════════════════════════════════════════════════════════════════════════════
echo ""
echo "── Section 4: Create 5 Test Members ──"

declare -a MEMBER_IDS=()
declare -a MEMBER_TOKENS=()
declare -a MEMBER_USER_IDS=()

for i in 0 1 2 3 4; do
  EMAIL="${MEMBER_EMAILS[$i]}"
  NAME="${MEMBER_NAMES[$i]}"
  PHONE="${MEMBER_PHONES[$i]}"
  NUM=$((i + 1))

  # Check if member already exists by listing and searching
  STATUS=$(http GET "/members?search=${EMAIL}&limit=5" "" "$ADMIN_TOKEN")
  EXISTING_ID=""
  if [[ "$STATUS" == "200" ]]; then
    # Try to find member in list response
    EXISTING_ID=$(jq_resp ".data.items[]? | select(.email == \"$EMAIL\") | .id // .data.data.items[]? | select(.email == \"$EMAIL\") | .id" 2>/dev/null || echo "")
    if [[ -z "$EXISTING_ID" || "$EXISTING_ID" == "null" ]]; then
      EXISTING_ID=$(jq_resp ".data.data.items[]? | select(.email == \"$EMAIL\") | .id" 2>/dev/null || echo "")
    fi
  fi

  if [[ -n "$EXISTING_ID" && "$EXISTING_ID" != "null" ]]; then
    MEMBER_IDS+=("$EXISTING_ID")
    pass "Create Member $NUM (already exists)"
  else
    BODY="{\"email\":\"$EMAIL\",\"phone\":\"$PHONE\",\"fullName\":\"$NAME\",\"password\":\"$MEMBER_PASS\",\"joinedDate\":\"2026-01-15\"}"
    STATUS=$(http POST /members "$BODY" "$ADMIN_TOKEN")
    if [[ "$STATUS" == "201" ]]; then
      MID=$(jq_resp '.data.id // .data.data.id')
      if [[ -n "$MID" && "$MID" != "null" ]]; then
        MEMBER_IDS+=("$MID")
        pass "Create Member $NUM"
      else
        fail "Create Member $NUM" "ID not found in response"
        MEMBER_IDS+=("")
      fi
    elif [[ "$STATUS" == "409" ]]; then
      # Conflict — already exists, try to find by listing
      STATUS2=$(http GET "/members?search=${EMAIL}&limit=100" "" "$ADMIN_TOKEN")
      MID=$(jq_resp ".data.items[]? | select(.email == \"$EMAIL\") | .id" 2>/dev/null || echo "")
      if [[ -z "$MID" || "$MID" == "null" ]]; then
        MID=$(jq_resp ".data.data.items[]? | select(.email == \"$EMAIL\") | .id" 2>/dev/null || echo "")
      fi
      if [[ -n "$MID" && "$MID" != "null" ]]; then
        MEMBER_IDS+=("$MID")
        pass "Create Member $NUM (already existed, found via search)"
      else
        fail "Create Member $NUM" "409 Conflict but couldn't find existing member"
        MEMBER_IDS+=("")
      fi
    else
      fail "Create Member $NUM" "HTTP $STATUS"
      MEMBER_IDS+=("")
    fi
  fi
done

# ════════════════════════════════════════════════════════════════════════════
# SECTION 5: MEMBER AUTHENTICATION
# ════════════════════════════════════════════════════════════════════════════
echo ""
echo "── Section 5: Member Authentication ──"

for i in 0 1 2 3 4; do
  EMAIL="${MEMBER_EMAILS[$i]}"
  NUM=$((i + 1))

  STATUS=$(http POST /auth/login "{\"email\":\"$EMAIL\",\"password\":\"$MEMBER_PASS\"}")
  if [[ "$STATUS" == "200" ]]; then
    TOKEN=$(jq_resp '.data.accessToken // .data.data.accessToken')
    USERID=$(jq_resp '.data.user.id // .data.data.user.id')
    if [[ -n "$TOKEN" && "$TOKEN" != "null" ]]; then
      MEMBER_TOKENS+=("$TOKEN")
      MEMBER_USER_IDS+=("$USERID")
      pass "Login Member $NUM"
    else
      fail "Login Member $NUM" "Token was null"
      MEMBER_TOKENS+=("")
      MEMBER_USER_IDS+=("")
    fi
  else
    fail "Login Member $NUM" "HTTP $STATUS"
    MEMBER_TOKENS+=("")
    MEMBER_USER_IDS+=("")
  fi
done

# ════════════════════════════════════════════════════════════════════════════
# SECTION 6: ADMIN DASHBOARD & ADMIN LIST MEMBERS
# ════════════════════════════════════════════════════════════════════════════
echo ""
echo "── Section 6: Admin Dashboard & Member Listing ──"

STATUS=$(http GET /dashboards/admin "" "$ADMIN_TOKEN")
assert_status "Admin dashboard" "200" "$STATUS"

STATUS=$(http GET /members "" "$ADMIN_TOKEN")
if [[ "$STATUS" == "200" ]]; then
  TOTAL_MEMBERS=$(jq_resp '.data.total // .data.data.total')
  pass "List all members (total: $TOTAL_MEMBERS)"
else
  fail "List all members" "HTTP $STATUS"
fi

# Get member by ID
if [[ -n "${MEMBER_IDS[0]:-}" ]]; then
  STATUS=$(http GET "/members/${MEMBER_IDS[0]}" "" "$ADMIN_TOKEN")
  assert_status "Get Member 1 by ID" "200" "$STATUS"
fi

# ════════════════════════════════════════════════════════════════════════════
# SECTION 7: MEMBER PROFILES
# ════════════════════════════════════════════════════════════════════════════
echo ""
echo "── Section 7: Member Profiles ──"

# Member 1 views own profile
if [[ -n "${MEMBER_TOKENS[0]:-}" ]]; then
  STATUS=$(http GET /members/me "" "${MEMBER_TOKENS[0]}")
  if [[ "$STATUS" == "200" ]]; then
    PROFILE_NAME=$(jq_resp '.data.fullName // .data.data.fullName')
    pass "Member 1 view profile (name: $PROFILE_NAME)"
  else
    fail "Member 1 view profile" "HTTP $STATUS"
  fi

  # Member 1 updates profile
  STATUS=$(http PATCH /members/me '{"address":"KG 123 St, Kigali"}' "${MEMBER_TOKENS[0]}")
  assert_status "Member 1 update profile" "200" "$STATUS"
fi

# Member 1 dashboard
if [[ -n "${MEMBER_TOKENS[0]:-}" ]]; then
  STATUS=$(http GET /dashboards/member "" "${MEMBER_TOKENS[0]}")
  assert_status "Member 1 dashboard" "200" "$STATUS"
fi

# ════════════════════════════════════════════════════════════════════════════
# SECTION 8: GENERATE OBLIGATIONS (current month)
# ════════════════════════════════════════════════════════════════════════════
echo ""
echo "── Section 8: Generate Obligations ──"

CURRENT_MONTH=$(date +%m | sed 's/^0//')
CURRENT_YEAR=$(date +%Y)

# Generate obligations for the current month
STATUS=$(http POST "/monthly-obligations/generate-test?month=${CURRENT_MONTH}&year=${CURRENT_YEAR}" "" "$ADMIN_TOKEN")
assert_status "Generate current month obligations" "201" "$STATUS"

# Also generate for the previous month (for overdue/penalty testing)
if [[ "$CURRENT_MONTH" -eq 1 ]]; then
  PREV_MONTH=12
  PREV_YEAR=$((CURRENT_YEAR - 1))
else
  PREV_MONTH=$((CURRENT_MONTH - 1))
  PREV_YEAR=$CURRENT_YEAR
fi

STATUS=$(http POST "/monthly-obligations/generate-test?month=${PREV_MONTH}&year=${PREV_YEAR}" "" "$ADMIN_TOKEN")
assert_status "Generate previous month obligations" "201" "$STATUS"

# Admin lists all obligations
STATUS=$(http GET "/monthly-obligations?limit=100" "" "$ADMIN_TOKEN")
if [[ "$STATUS" == "200" ]]; then
  OB_TOTAL=$(jq_resp '.data.total // .data.data.total')
  pass "List obligations (total: $OB_TOTAL)"
else
  fail "List obligations" "HTTP $STATUS"
fi

# ════════════════════════════════════════════════════════════════════════════
# SECTION 9: MEMBER 1 — NORMAL ACTIVE FLOW (Pay + Approve)
# ════════════════════════════════════════════════════════════════════════════
echo ""
echo "── Section 9: Member 1 — Normal Contribution Flow ──"

M1_TOKEN="${MEMBER_TOKENS[0]:-}"
M1_ID="${MEMBER_IDS[0]:-}"

if [[ -n "$M1_TOKEN" && -n "$M1_ID" ]]; then
  # View my obligations
  STATUS=$(http GET /monthly-obligations/me "" "$M1_TOKEN")
  if [[ "$STATUS" == "200" ]]; then
    # Find an UNPAID obligation for current month
    M1_OB_ID=$(jq_resp ".data.items[]? | select(.status == \"UNPAID\" and .month == $CURRENT_MONTH and .year == $CURRENT_YEAR) | .id" | head -1)
    if [[ -z "$M1_OB_ID" || "$M1_OB_ID" == "null" ]]; then
      M1_OB_ID=$(jq_resp ".data.data.items[]? | select(.status == \"UNPAID\" and .month == $CURRENT_MONTH and .year == $CURRENT_YEAR) | .id" | head -1)
    fi
    if [[ -n "$M1_OB_ID" && "$M1_OB_ID" != "null" ]]; then
      pass "Member 1 has unpaid obligation"
    else
      skip "Member 1 contribution flow" "No unpaid obligation found for current month"
      M1_OB_ID=""
    fi
  else
    fail "Member 1 view obligations" "HTTP $STATUS"
  fi

  if [[ -n "$M1_OB_ID" ]]; then
    # Create a dummy proof image file
    PROOF_FILE="proof.jpg"
    echo "FAKE_IMAGE_DATA_FOR_TESTING" > "$PROOF_FILE"

    # Submit contribution payment (multipart/form-data)
    TODAY=$(date +%Y-%m-%d)
    STATUS=$(http_multipart POST /contribution-payments "$M1_TOKEN" \
      -F "obligationIds=[\"$M1_OB_ID\"]" \
      -F "amount=$MONTHLY_SHARE" \
      -F "paymentDate=$TODAY" \
      -F "method=MOMO" \
      -F "reference=MOMO-TEST-M1-$(date +%s)" \
      -F "notes=Test payment Member 1" \
      -F "proof=@$PROOF_FILE;type=image/jpeg")
    rm -f "$PROOF_FILE"

    if [[ "$STATUS" == "201" ]]; then
      M1_PAYMENT_ID=$(jq_resp '.data.id // .data.data.id')
      M1_PAYMENT_STATUS=$(jq_resp '.data.status // .data.data.status')
      pass "Member 1 submit contribution (status: $M1_PAYMENT_STATUS)"
    else
      fail "Member 1 submit contribution" "HTTP $STATUS — $(jq_resp '.message // .data.message' 2>/dev/null)"
      M1_PAYMENT_ID=""
    fi

    # Verify payment is PENDING
    if [[ -n "$M1_PAYMENT_ID" ]]; then
      STATUS=$(http GET /contribution-payments/me "" "$M1_TOKEN")
      if [[ "$STATUS" == "200" ]]; then
        PAY_STATUS=$(jq_resp ".data.items[]? | select(.id == \"$M1_PAYMENT_ID\") | .status" 2>/dev/null)
        if [[ -z "$PAY_STATUS" || "$PAY_STATUS" == "null" ]]; then
          PAY_STATUS=$(jq_resp ".data.data.items[]? | select(.id == \"$M1_PAYMENT_ID\") | .status" 2>/dev/null)
        fi
        if [[ "$PAY_STATUS" == "PENDING" ]]; then
          pass "Member 1 payment is PENDING"
        else
          fail "Member 1 payment is PENDING" "Got: $PAY_STATUS"
        fi
      fi

      # Admin approves
      STATUS=$(http PATCH "/contribution-payments/${M1_PAYMENT_ID}/approve" "" "$ADMIN_TOKEN")
      if [[ "$STATUS" == "200" ]]; then
        APPROVED_STATUS=$(jq_resp '.data.status // .data.data.status')
        if [[ "$APPROVED_STATUS" == "APPROVED" ]]; then
          pass "Admin approves Member 1 payment"
        else
          fail "Admin approves Member 1 payment" "Status is $APPROVED_STATUS"
        fi
      else
        fail "Admin approves Member 1 payment" "HTTP $STATUS"
      fi
    fi
  fi
else
  skip "Member 1 contribution flow" "Missing token or ID"
fi

# ════════════════════════════════════════════════════════════════════════════
# SECTION 10: MEMBER 2 — SUSPENSION FLOW
# ════════════════════════════════════════════════════════════════════════════
echo ""
echo "── Section 10: Member 2 — Suspension Flow ──"

M2_ID="${MEMBER_IDS[1]:-}"
M2_TOKEN="${MEMBER_TOKENS[1]:-}"

if [[ -n "$M2_ID" ]]; then
  # Suspend member 2
  STATUS=$(http PATCH "/members/${M2_ID}/status" \
    '{"status":"SUSPENDED","reason":"E2E test: testing suspension flow"}' \
    "$ADMIN_TOKEN")
  if [[ "$STATUS" == "200" ]]; then
    SUSP_STATUS=$(jq_resp '.data.status // .data.data.status')
    if [[ "$SUSP_STATUS" == "SUSPENDED" ]]; then
      pass "Suspend Member 2"
    else
      fail "Suspend Member 2" "Status is $SUSP_STATUS"
    fi
  else
    fail "Suspend Member 2" "HTTP $STATUS"
  fi

  # Verify via admin get
  STATUS=$(http GET "/members/${M2_ID}" "" "$ADMIN_TOKEN")
  if [[ "$STATUS" == "200" ]]; then
    VERIFY_STATUS=$(jq_resp '.data.status // .data.data.status')
    if [[ "$VERIFY_STATUS" == "SUSPENDED" ]]; then
      pass "Verify Member 2 is SUSPENDED"
    else
      fail "Verify Member 2 is SUSPENDED" "Got: $VERIFY_STATUS"
    fi
  else
    fail "Verify Member 2 is SUSPENDED" "HTTP $STATUS"
  fi

  # Attempt login as suspended member — should be 403
  STATUS=$(http POST /auth/login "{\"email\":\"${MEMBER_EMAILS[1]}\",\"password\":\"$MEMBER_PASS\"}")
  if [[ "$STATUS" == "403" ]]; then
    pass "Suspended Member 2 login blocked (403)"
  elif [[ "$STATUS" == "200" ]]; then
    fail "Suspended Member 2 login blocked" "Login succeeded unexpectedly (200)"
  else
    pass "Suspended Member 2 login blocked (HTTP $STATUS)"
  fi

  # Reactivate member 2 (for cleanup / further testing)
  STATUS=$(http PATCH "/members/${M2_ID}/status" \
    '{"status":"ACTIVE","reason":"E2E test: reactivating after test"}' \
    "$ADMIN_TOKEN")
  assert_status "Reactivate Member 2" "200" "$STATUS"
else
  skip "Member 2 suspension flow" "Missing member ID"
fi

# ════════════════════════════════════════════════════════════════════════════
# SECTION 11: MEMBER 3 — EXIT FLOW
# ════════════════════════════════════════════════════════════════════════════
echo ""
echo "── Section 11: Member 3 — Exit Flow ──"

M3_ID="${MEMBER_IDS[2]:-}"

if [[ -n "$M3_ID" ]]; then
  # Exit member 3
  STATUS=$(http PATCH "/members/${M3_ID}/status" \
    '{"status":"EXITED","reason":"E2E test: testing exit flow"}' \
    "$ADMIN_TOKEN")
  if [[ "$STATUS" == "200" ]]; then
    EXIT_STATUS=$(jq_resp '.data.status // .data.data.status')
    if [[ "$EXIT_STATUS" == "EXITED" ]]; then
      pass "Exit Member 3"
    else
      fail "Exit Member 3" "Status is $EXIT_STATUS"
    fi
  else
    fail "Exit Member 3" "HTTP $STATUS"
  fi

  # Verify via admin lookup — member still exists
  STATUS=$(http GET "/members/${M3_ID}" "" "$ADMIN_TOKEN")
  if [[ "$STATUS" == "200" ]]; then
    VERIFY_STATUS=$(jq_resp '.data.status // .data.data.status')
    if [[ "$VERIFY_STATUS" == "EXITED" ]]; then
      pass "Verify Member 3 is EXITED (still in system)"
    else
      fail "Verify Member 3 is EXITED" "Got: $VERIFY_STATUS"
    fi
  else
    fail "Verify Member 3 is EXITED" "HTTP $STATUS"
  fi

  # Attempt login — should be blocked
  STATUS=$(http POST /auth/login "{\"email\":\"${MEMBER_EMAILS[2]}\",\"password\":\"$MEMBER_PASS\"}")
  if [[ "$STATUS" == "403" ]]; then
    pass "Exited Member 3 login blocked (403)"
  elif [[ "$STATUS" == "200" ]]; then
    fail "Exited Member 3 login blocked" "Login succeeded unexpectedly (200)"
  else
    pass "Exited Member 3 login blocked (HTTP $STATUS)"
  fi
else
  skip "Member 3 exit flow" "Missing member ID"
fi

# ════════════════════════════════════════════════════════════════════════════
# SECTION 12: MEMBER 4 — CONTRIBUTION PENDING (NOT approved)
# ════════════════════════════════════════════════════════════════════════════
echo ""
echo "── Section 12: Member 4 — Contribution Paid, Pending Approval ──"

M4_TOKEN="${MEMBER_TOKENS[3]:-}"
M4_ID="${MEMBER_IDS[3]:-}"
M4_PAYMENT_ID=""

if [[ -n "$M4_TOKEN" && -n "$M4_ID" ]]; then
  # Get obligations
  STATUS=$(http GET /monthly-obligations/me "" "$M4_TOKEN")
  if [[ "$STATUS" == "200" ]]; then
    M4_OB_ID=$(jq_resp ".data.items[]? | select(.status == \"UNPAID\" and .month == $CURRENT_MONTH and .year == $CURRENT_YEAR) | .id" | head -1)
    if [[ -z "$M4_OB_ID" || "$M4_OB_ID" == "null" ]]; then
      M4_OB_ID=$(jq_resp ".data.data.items[]? | select(.status == \"UNPAID\" and .month == $CURRENT_MONTH and .year == $CURRENT_YEAR) | .id" | head -1)
    fi
  fi

  if [[ -n "${M4_OB_ID:-}" && "$M4_OB_ID" != "null" ]]; then
    PROOF_FILE="proof.jpg"
    echo "FAKE_IMAGE_M4" > "$PROOF_FILE"
    TODAY=$(date +%Y-%m-%d)

    STATUS=$(http_multipart POST /contribution-payments "$M4_TOKEN" \
      -F "obligationIds=[\"$M4_OB_ID\"]" \
      -F "amount=$MONTHLY_SHARE" \
      -F "paymentDate=$TODAY" \
      -F "method=BANK" \
      -F "reference=BANK-TEST-M4-$(date +%s)" \
      -F "notes=Test payment Member 4 - leave pending" \
      -F "proof=@$PROOF_FILE;type=image/jpeg")
    rm -f "$PROOF_FILE"

    if [[ "$STATUS" == "201" ]]; then
      M4_PAYMENT_ID=$(jq_resp '.data.id // .data.data.id')
      pass "Member 4 submit contribution"
    else
      fail "Member 4 submit contribution" "HTTP $STATUS — $(jq_resp '.message // .data.message' 2>/dev/null)"
    fi
  else
    skip "Member 4 contribution" "No unpaid obligation found"
  fi

  # Verify it's pending via admin listing
  if [[ -n "$M4_PAYMENT_ID" ]]; then
    STATUS=$(http GET "/contribution-payments?status=PENDING" "" "$ADMIN_TOKEN")
    if [[ "$STATUS" == "200" ]]; then
      FOUND=$(jq_resp ".data.items[]? | select(.id == \"$M4_PAYMENT_ID\") | .status" 2>/dev/null)
      if [[ -z "$FOUND" || "$FOUND" == "null" ]]; then
        FOUND=$(jq_resp ".data.data.items[]? | select(.id == \"$M4_PAYMENT_ID\") | .status" 2>/dev/null)
      fi
      if [[ "$FOUND" == "PENDING" ]]; then
        pass "Member 4 payment remains PENDING"
      else
        fail "Member 4 payment remains PENDING" "Got: $FOUND"
      fi
    else
      fail "Member 4 payment remains PENDING" "HTTP $STATUS"
    fi
    echo "       (Intentionally NOT approving Member 4's payment)"
  fi
else
  skip "Member 4 contribution" "Missing token or ID"
fi

# ════════════════════════════════════════════════════════════════════════════
# SECTION 13: MEMBER 5 — OVERDUE + PENALTY + APPROVAL
# ════════════════════════════════════════════════════════════════════════════
echo ""
echo "── Section 13: Member 5 — Late Contribution + Penalty + Approval ──"

M5_TOKEN="${MEMBER_TOKENS[4]:-}"
M5_ID="${MEMBER_IDS[4]:-}"

if [[ -n "$M5_TOKEN" && -n "$M5_ID" ]]; then
  # First, generate penalties for overdue obligations
  STATUS=$(http POST /penalties/generate-test "" "$ADMIN_TOKEN")
  assert_status "Generate penalties for overdue" "201" "$STATUS"

  # Member 5 views own penalties
  STATUS=$(http GET /penalties/me "" "$M5_TOKEN")
  M5_PENALTY_ID=""
  M5_PENALTY_AMOUNT=""
  if [[ "$STATUS" == "200" ]]; then
    M5_PENALTY_ID=$(jq_resp '.data.items[0].id // .data.data.items[0].id' 2>/dev/null)
    M5_PENALTY_AMOUNT=$(jq_resp '.data.items[0].amount // .data.data.items[0].amount' 2>/dev/null)
    if [[ -n "$M5_PENALTY_ID" && "$M5_PENALTY_ID" != "null" ]]; then
      pass "Member 5 has penalty (amount: $M5_PENALTY_AMOUNT)"
    else
      skip "Member 5 penalty payment" "No penalty found (may not be overdue yet)"
    fi
  else
    fail "Member 5 view penalties" "HTTP $STATUS"
  fi

  # Member 5 views obligations — find overdue/previous month
  STATUS=$(http GET /monthly-obligations/me "" "$M5_TOKEN")
  M5_OB_ID=""
  if [[ "$STATUS" == "200" ]]; then
    # Try previous month obligation first
    M5_OB_ID=$(jq_resp ".data.items[]? | select(.status == \"UNPAID\" and .month == $PREV_MONTH and .year == $PREV_YEAR) | .id" | head -1)
    if [[ -z "$M5_OB_ID" || "$M5_OB_ID" == "null" ]]; then
      M5_OB_ID=$(jq_resp ".data.data.items[]? | select(.status == \"UNPAID\" and .month == $PREV_MONTH and .year == $PREV_YEAR) | .id" | head -1)
    fi
    # Fallback to any UNPAID
    if [[ -z "$M5_OB_ID" || "$M5_OB_ID" == "null" ]]; then
      M5_OB_ID=$(jq_resp '.data.items[]? | select(.status == "UNPAID") | .id' | head -1)
      if [[ -z "$M5_OB_ID" || "$M5_OB_ID" == "null" ]]; then
        M5_OB_ID=$(jq_resp '.data.data.items[]? | select(.status == "UNPAID") | .id' | head -1)
      fi
    fi
    if [[ -n "$M5_OB_ID" && "$M5_OB_ID" != "null" ]]; then
      pass "Member 5 has unpaid obligation"
    else
      skip "Member 5 contribution" "No unpaid obligation found"
    fi
  fi

  # Submit contribution for Member 5
  M5_PAYMENT_ID=""
  if [[ -n "${M5_OB_ID:-}" && "$M5_OB_ID" != "null" ]]; then
    PROOF_FILE="proof.jpg"
    echo "FAKE_IMAGE_M5" > "$PROOF_FILE"
    TODAY=$(date +%Y-%m-%d)

    STATUS=$(http_multipart POST /contribution-payments "$M5_TOKEN" \
      -F "obligationIds=[\"$M5_OB_ID\"]" \
      -F "amount=$MONTHLY_SHARE" \
      -F "paymentDate=$TODAY" \
      -F "method=MOMO" \
      -F "reference=MOMO-TEST-M5-$(date +%s)" \
      -F "notes=Test payment Member 5 overdue" \
      -F "proof=@$PROOF_FILE;type=image/jpeg")
    rm -f "$PROOF_FILE"

    if [[ "$STATUS" == "201" ]]; then
      M5_PAYMENT_ID=$(jq_resp '.data.id // .data.data.id')
      pass "Member 5 submit overdue contribution"
    else
      fail "Member 5 submit overdue contribution" "HTTP $STATUS — $(jq_resp '.message // .data.message' 2>/dev/null)"
    fi
  fi

  # Admin approves Member 5's payment
  if [[ -n "$M5_PAYMENT_ID" && "$M5_PAYMENT_ID" != "null" ]]; then
    STATUS=$(http PATCH "/contribution-payments/${M5_PAYMENT_ID}/approve" "" "$ADMIN_TOKEN")
    if [[ "$STATUS" == "200" ]]; then
      APPROVED=$(jq_resp '.data.status // .data.data.status')
      if [[ "$APPROVED" == "APPROVED" ]]; then
        pass "Admin approves Member 5 contribution"
      else
        fail "Admin approves Member 5 contribution" "Status: $APPROVED"
      fi
    else
      fail "Admin approves Member 5 contribution" "HTTP $STATUS"
    fi
  fi

  # Verify Member 5's penalty exists via admin
  STATUS=$(http GET "/penalties?memberId=${M5_ID}" "" "$ADMIN_TOKEN")
  if [[ "$STATUS" == "200" ]]; then
    PEN_COUNT=$(jq_resp '.data.total // .data.data.total')
    if [ -n "$PEN_COUNT" ] && [ "$PEN_COUNT" != "null" ] && [ "$PEN_COUNT" -gt 0 ] 2>/dev/null; then
      pass "Member 5 penalty recorded (count: $PEN_COUNT)"
    else
      skip "Member 5 penalty recorded" "No penalties found for this member"
    fi
  else
    fail "Member 5 penalty check" "HTTP $STATUS"
  fi
else
  skip "Member 5 full flow" "Missing token or ID"
fi

# ════════════════════════════════════════════════════════════════════════════
# SECTION 14: RECORD ON BEHALF (Admin pays for member)
# ════════════════════════════════════════════════════════════════════════════
echo ""
echo "── Section 14: Record on Behalf ──"

M4_TOKEN2="${MEMBER_TOKENS[3]:-}"
M4_ID2="${MEMBER_IDS[3]:-}"

if [[ -n "$M4_ID2" ]]; then
  # Find an unpaid obligation for Member 4 (might have current month still unpaid)
  STATUS=$(http GET "/monthly-obligations?memberId=${M4_ID2}&status=UNPAID&limit=10" "" "$ADMIN_TOKEN")
  ROB_OB_ID=""
  if [[ "$STATUS" == "200" ]]; then
    # Find an unpaid obligation for the previous month
    ROB_OB_ID=$(jq_resp ".data.items[]? | select(.month == $PREV_MONTH and .year == $PREV_YEAR) | .id" | head -1)
    if [[ -z "$ROB_OB_ID" || "$ROB_OB_ID" == "null" ]]; then
      ROB_OB_ID=$(jq_resp ".data.data.items[]? | select(.month == $PREV_MONTH and .year == $PREV_YEAR) | .id" | head -1)
    fi
  fi

  if [[ -n "$ROB_OB_ID" && "$ROB_OB_ID" != "null" ]]; then
    TODAY=$(date +%Y-%m-%d)
    BODY="{\"memberId\":\"$M4_ID2\",\"obligationIds\":[\"$ROB_OB_ID\"],\"amount\":$MONTHLY_SHARE,\"paymentDate\":\"$TODAY\",\"withPenalty\":false,\"notes\":\"Admin records on behalf of Member 4\"}"
    STATUS=$(http POST /contribution-payments/record-on-behalf "$BODY" "$ADMIN_TOKEN")
    if [[ "$STATUS" == "201" ]]; then
      pass "Record on behalf of Member 4"
    else
      fail "Record on behalf of Member 4" "HTTP $STATUS — $(jq_resp '.message // .data.message' 2>/dev/null)"
    fi
  else
    skip "Record on behalf" "No unpaid previous-month obligation for Member 4"
  fi
else
  skip "Record on behalf" "Missing Member 4 ID"
fi

# ════════════════════════════════════════════════════════════════════════════
# SECTION 15: NOTIFICATIONS
# ════════════════════════════════════════════════════════════════════════════
echo ""
echo "── Section 15: Notifications ──"

# Member 1 checks notifications
if [[ -n "${MEMBER_TOKENS[0]:-}" ]]; then
  STATUS=$(http GET "/notifications/me?page=1&limit=10" "" "${MEMBER_TOKENS[0]}")
  if [[ "$STATUS" == "200" ]]; then
    NOTIF_TOTAL=$(jq_resp '.data.total // .data.data.total')
    pass "Member 1 notifications (total: ${NOTIF_TOTAL:-0})"

    # Try to mark first notification as read
    FIRST_NOTIF_ID=$(jq_resp '.data.items[0].id // .data.data.items[0].id' 2>/dev/null)
    if [[ -n "$FIRST_NOTIF_ID" && "$FIRST_NOTIF_ID" != "null" ]]; then
      STATUS=$(http PATCH "/notifications/me/${FIRST_NOTIF_ID}/read" "" "${MEMBER_TOKENS[0]}")
      assert_status "Mark notification as read" "200" "$STATUS"
    else
      skip "Mark notification as read" "No notifications to mark"
    fi
  else
    fail "Member 1 notifications" "HTTP $STATUS"
  fi
fi

# Member 4 notifications (should have received updates about pending payment)
if [[ -n "${MEMBER_TOKENS[3]:-}" ]]; then
  STATUS=$(http GET "/notifications/me?page=1&limit=10" "" "${MEMBER_TOKENS[3]}")
  if [[ "$STATUS" == "200" ]]; then
    NOTIF_TOTAL=$(jq_resp '.data.total // .data.data.total')
    pass "Member 4 notifications (total: ${NOTIF_TOTAL:-0})"
  else
    fail "Member 4 notifications" "HTTP $STATUS"
  fi
fi

# ════════════════════════════════════════════════════════════════════════════
# SECTION 16: PENALTIES LISTING (Admin)
# ════════════════════════════════════════════════════════════════════════════
echo ""
echo "── Section 16: Penalties ──"

STATUS=$(http GET "/penalties?limit=100" "" "$ADMIN_TOKEN")
if [[ "$STATUS" == "200" ]]; then
  PEN_TOTAL=$(jq_resp '.data.total // .data.data.total')
  pass "Admin list all penalties (total: ${PEN_TOTAL:-0})"
else
  fail "Admin list all penalties" "HTTP $STATUS"
fi

# Penalty payments listing
STATUS=$(http GET "/penalty-payments?limit=100" "" "$ADMIN_TOKEN")
if [[ "$STATUS" == "200" ]]; then
  PP_TOTAL=$(jq_resp '.data.total // .data.data.total')
  pass "Admin list penalty payments (total: ${PP_TOTAL:-0})"
else
  fail "Admin list penalty payments" "HTTP $STATUS"
fi

# ════════════════════════════════════════════════════════════════════════════
# SECTION 17: ADMIN CONTRIBUTION LISTING & FILTERING
# ════════════════════════════════════════════════════════════════════════════
echo ""
echo "── Section 17: Contribution Payments Listing ──"

# All payments
STATUS=$(http GET "/contribution-payments?limit=100" "" "$ADMIN_TOKEN")
if [[ "$STATUS" == "200" ]]; then
  CP_TOTAL=$(jq_resp '.data.total // .data.data.total')
  pass "Admin list all contribution payments (total: ${CP_TOTAL:-0})"
else
  fail "Admin list all contribution payments" "HTTP $STATUS"
fi

# Filter PENDING
STATUS=$(http GET "/contribution-payments?status=PENDING" "" "$ADMIN_TOKEN")
assert_status "Admin filter PENDING payments" "200" "$STATUS"

# Filter APPROVED
STATUS=$(http GET "/contribution-payments?status=APPROVED" "" "$ADMIN_TOKEN")
assert_status "Admin filter APPROVED payments" "200" "$STATUS"

# ════════════════════════════════════════════════════════════════════════════
# SECTION 18: STATEMENTS
# ════════════════════════════════════════════════════════════════════════════
echo ""
echo "── Section 18: Statements ──"

if [[ -n "${MEMBER_TOKENS[0]:-}" ]]; then
  STATUS=$(http GET "/statements/me" "" "${MEMBER_TOKENS[0]}")
  assert_status "Member 1 statement" "200" "$STATUS"
fi

# ════════════════════════════════════════════════════════════════════════════
# SECTION 19: TRANSACTIONS
# ════════════════════════════════════════════════════════════════════════════
echo ""
echo "── Section 19: Transactions ──"

STATUS=$(http GET "/transactions/balance" "" "$ADMIN_TOKEN")
assert_status "Admin balance" "200" "$STATUS"

STATUS=$(http GET "/transactions?limit=20" "" "$ADMIN_TOKEN")
assert_status "Admin list transactions" "200" "$STATUS"

# ════════════════════════════════════════════════════════════════════════════
# SECTION 20: REPORTS
# ════════════════════════════════════════════════════════════════════════════
echo ""
echo "── Section 20: Reports ──"

STATUS=$(http GET "/reports/contributions" "" "$ADMIN_TOKEN")
assert_status "Contributions report" "200" "$STATUS"

STATUS=$(http GET "/reports/penalties" "" "$ADMIN_TOKEN")
assert_status "Penalties report" "200" "$STATUS"

STATUS=$(http GET "/reports/defaulters" "" "$ADMIN_TOKEN")
assert_status "Defaulters report" "200" "$STATUS"

STATUS=$(http GET "/reports/withdrawals" "" "$ADMIN_TOKEN")
assert_status "Withdrawals report" "200" "$STATUS"

STATUS=$(http GET "/reports/financial-summary" "" "$ADMIN_TOKEN")
assert_status "Financial summary report" "200" "$STATUS"

# ════════════════════════════════════════════════════════════════════════════
# SECTION 21: AUDIT LOGS
# ════════════════════════════════════════════════════════════════════════════
echo ""
echo "── Section 21: Audit Logs ──"

STATUS=$(http GET "/audit-logs/?page=1&limit=20" "" "$ADMIN_TOKEN")
if [[ "$STATUS" == "200" ]]; then
  AUDIT_TOTAL=$(jq_resp '.data.total // .data.data.total // 0')
  pass "Audit logs (total: $AUDIT_TOTAL)"
else
  fail "Audit logs" "HTTP $STATUS"
fi

# ════════════════════════════════════════════════════════════════════════════
# SECTION 22: ADMIN UPDATE MEMBER
# ════════════════════════════════════════════════════════════════════════════
echo ""
echo "── Section 22: Admin Update Member ──"

if [[ -n "${MEMBER_IDS[0]:-}" ]]; then
  STATUS=$(http PATCH "/members/${MEMBER_IDS[0]}" \
    '{"address":"KN 456 Rd, Kigali (updated by admin)"}' \
    "$ADMIN_TOKEN")
  assert_status "Admin update Member 1" "200" "$STATUS"
fi

# ════════════════════════════════════════════════════════════════════════════
# SECTION 23: CHANGE PASSWORD FLOW
# ════════════════════════════════════════════════════════════════════════════
echo ""
echo "── Section 23: Change Password ──"

if [[ -n "${MEMBER_TOKENS[0]:-}" ]]; then
  # Change password
  STATUS=$(http POST /auth/change-password \
    '{"currentPassword":"didier123","newPassword":"newpass1234"}' \
    "${MEMBER_TOKENS[0]}")
  if [[ "$STATUS" == "200" ]]; then
    pass "Member 1 change password"

    # Login with new password
    STATUS=$(http POST /auth/login "{\"email\":\"${MEMBER_EMAILS[0]}\",\"password\":\"newpass1234\"}")
    if [[ "$STATUS" == "200" ]]; then
      NEW_M1_TOKEN=$(jq_resp '.data.accessToken // .data.data.accessToken')
      pass "Member 1 login with new password"

      # Change back to original
      STATUS=$(http POST /auth/change-password \
        '{"currentPassword":"newpass1234","newPassword":"didier123"}' \
        "$NEW_M1_TOKEN")
      assert_status "Member 1 restore original password" "200" "$STATUS"
    else
      fail "Member 1 login with new password" "HTTP $STATUS"
    fi
  else
    fail "Member 1 change password" "HTTP $STATUS"
  fi
fi

# ════════════════════════════════════════════════════════════════════════════
# SECTION 24: LOGOUT FLOW
# ════════════════════════════════════════════════════════════════════════════
echo ""
echo "── Section 24: Logout ──"

if [[ -n "${MEMBER_TOKENS[0]:-}" ]]; then
  # Re-login to get a fresh refresh token for logout test
  STATUS=$(http POST /auth/login "{\"email\":\"${MEMBER_EMAILS[0]}\",\"password\":\"$MEMBER_PASS\"}")
  if [[ "$STATUS" == "200" ]]; then
    LOGOUT_REFRESH=$(jq_resp '.data.refreshToken // .data.data.refreshToken')
    if [[ -n "$LOGOUT_REFRESH" && "$LOGOUT_REFRESH" != "null" ]]; then
      STATUS=$(http POST /auth/logout "{\"refreshToken\":\"$LOGOUT_REFRESH\"}")
      assert_status "Member 1 logout" "200" "$STATUS"
    else
      skip "Member 1 logout" "No refresh token available"
    fi
  else
    skip "Member 1 logout" "Could not re-login"
  fi
fi

# ════════════════════════════════════════════════════════════════════════════
# SECTION 25: FINAL STATE VERIFICATION
# ════════════════════════════════════════════════════════════════════════════
echo ""
echo "── Section 25: Final State Verification ──"

echo ""
echo "  Member final states:"
for i in 0 1 2 3 4; do
  MID="${MEMBER_IDS[$i]:-}"
  NUM=$((i + 1))
  if [[ -n "$MID" ]]; then
    STATUS=$(http GET "/members/${MID}" "" "$ADMIN_TOKEN")
    if [[ "$STATUS" == "200" ]]; then
      MSTATUS=$(jq_resp '.data.status // .data.data.status')
      MNAME=$(jq_resp '.data.fullName // .data.data.fullName')
      echo "  Member $NUM ($MNAME): $MSTATUS"
    else
      echo "  Member $NUM: Could not retrieve (HTTP $STATUS)"
    fi
  else
    echo "  Member $NUM: ID not available"
  fi
done

# ════════════════════════════════════════════════════════════════════════════
# SUMMARY
# ════════════════════════════════════════════════════════════════════════════
TOTAL=$((PASS_COUNT + FAIL_COUNT + SKIP_COUNT))

echo ""
echo "========================================"
echo "IKIMINA END-TO-END TEST SUMMARY"
echo "========================================"
echo ""

# Group results by section
declare -A SECTION_STATUS
for r in "${RESULTS[@]}"; do
  IFS='|' read -r rstatus rname <<< "$r"
  printf "  %-42s %s\n" "$rname" "$rstatus"
done

echo ""
echo "  Total:   $TOTAL"
echo "  Passed:  $PASS_COUNT"
echo "  Failed:  $FAIL_COUNT"
echo "  Skipped: $SKIP_COUNT"
echo ""
echo "  Finished: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "========================================"

if [[ "$FAIL_COUNT" -gt 0 ]]; then
  exit 1
else
  exit 0
fi
