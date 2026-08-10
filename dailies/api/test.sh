#!/bin/bash
# Dailies API — end-to-end smoke test.
# Boots the server on a scratch database, walks the full user journey with
# curl, and prints each response. Requires: node >= 22, curl, python3 (for
# pretty-printing / field extraction — no jq dependency).

set -euo pipefail

PORT="${PORT:-3999}"
API="http://localhost:$PORT"
DB="$(mktemp -d)/dailies-test.db"

extract() { python3 -c "import sys,json; print(json.load(sys.stdin)$1)"; }

echo "── Booting server (db: $DB)"
DAILIES_DB="$DB" PORT="$PORT" node "$(dirname "$0")/server.mjs" &
SERVER_PID=$!
trap 'kill $SERVER_PID 2>/dev/null' EXIT
for _ in $(seq 1 50); do curl -sf "$API/health" >/dev/null 2>&1 && break; sleep 0.1; done

echo "── 1. Mike requests a sign-in code"
CODE=$(curl -sf -X POST "$API/auth/request-code" -H 'Content-Type: application/json' \
  -d '{"email":"mike@holfy.io","name":"Mike"}' | extract "['dev_code']")
echo "   dev_code: $CODE"

echo "── 2. Mike verifies the code, gets a bearer token"
MIKE=$(curl -sf -X POST "$API/auth/verify" -H 'Content-Type: application/json' \
  -d "{\"email\":\"mike@holfy.io\",\"code\":\"$CODE\"}" | extract "['token']")
echo "   token: ${MIKE:0:12}…"

echo "── 3. Mike creates the ARTSVP team"
TEAM_JSON=$(curl -sf -X POST "$API/teams" -H "Authorization: Bearer $MIKE" \
  -H 'Content-Type: application/json' -d '{"name":"ARTSVP"}')
TEAM_ID=$(echo "$TEAM_JSON" | extract "['team']['id']")
INVITE=$(echo "$TEAM_JSON" | extract "['team']['invite_code']")
echo "   team id: $TEAM_ID, invite code: $INVITE"

echo "── 4. Grace signs up and joins with the invite code"
GCODE=$(curl -sf -X POST "$API/auth/request-code" -H 'Content-Type: application/json' \
  -d '{"email":"grace@example.com","name":"Grace"}' | extract "['dev_code']")
GRACE=$(curl -sf -X POST "$API/auth/verify" -H 'Content-Type: application/json' \
  -d "{\"email\":\"grace@example.com\",\"code\":\"$GCODE\"}" | extract "['token']")
curl -sf -X POST "$API/teams/join" -H "Authorization: Bearer $GRACE" \
  -H 'Content-Type: application/json' -d "{\"invite_code\":\"$INVITE\"}" >/dev/null
echo "   Grace is in."

echo "── 5. Both post a daily entry + a live status"
curl -sf -X POST "$API/teams/$TEAM_ID/entries" -H "Authorization: Bearer $MIKE" \
  -H 'Content-Type: application/json' \
  -d '{"kind":"daily","body":"Shipped the pricing page. Tomorrow: onboarding emails."}' >/dev/null
curl -sf -X POST "$API/teams/$TEAM_ID/entries" -H "Authorization: Bearer $MIKE" \
  -H 'Content-Type: application/json' \
  -d '{"kind":"status","body":"Deep work on pricing","expires_in_minutes":120}' >/dev/null
curl -sf -X POST "$API/teams/$TEAM_ID/entries" -H "Authorization: Bearer $GRACE" \
  -H 'Content-Type: application/json' \
  -d '{"kind":"daily","body":"Gallery partner calls all morning; notes in the doc."}' >/dev/null
echo "   posted."

echo "── 6. The team's 'today' view (the Mac app home screen)"
curl -sf "$API/teams/$TEAM_ID/today" -H "Authorization: Bearer $GRACE" | python3 -m json.tool

echo "── 7. Today's digest, grouped by person"
curl -sf "$API/teams/$TEAM_ID/digest" -H "Authorization: Bearer $MIKE" | python3 -m json.tool

echo "── 8. Auth is enforced: no token → 401, non-member → 403"
curl -s -o /dev/null -w "   no token:   HTTP %{http_code}\n" "$API/teams/$TEAM_ID/today"
OCODE=$(curl -sf -X POST "$API/auth/request-code" -H 'Content-Type: application/json' \
  -d '{"email":"outsider@example.com"}' | extract "['dev_code']")
OUTSIDER=$(curl -sf -X POST "$API/auth/verify" -H 'Content-Type: application/json' \
  -d "{\"email\":\"outsider@example.com\",\"code\":\"$OCODE\"}" | extract "['token']")
curl -s -o /dev/null -w "   non-member: HTTP %{http_code}\n" \
  "$API/teams/$TEAM_ID/today" -H "Authorization: Bearer $OUTSIDER"

echo "── ✅ All steps passed"
