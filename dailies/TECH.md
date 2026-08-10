# Dailies — technical plan

*Companion to [PITCH.md](./PITCH.md). This is the CTO conversation: the API experiment and its results, the stack recommendation, the API contract, the Mac app architecture, and the roadmap.*

---

## 1. The experiment: fastest, most lightweight API

The brief was explicit: find the *fastest, most lightweight — even old-school — way* to stand up a real API with teams, OTP auth, entries, and statuses. So instead of writing a comparison doc, we built the leading candidate and measured it. It lives in [`api/server.mjs`](./api/server.mjs), and [`api/test.sh`](./api/test.sh) walks the entire user journey against it.

### Options considered

| Option | Verdict |
|---|---|
| **Keep Supabase, add Supabase Auth + RLS** | Tempting — it's the current stack, and email-OTP auth is built in. But real per-user RLS policies across 5 tables is *more* code than a small server, spread across SQL policies you can't step through, and every client re-implements query logic against PostgREST. The Raycast hardcoded-user-ID drift problem is a symptom of having no API layer that owns the domain. Good prototype floor; wrong product foundation. |
| **Rails / Django** | The old-school heavyweights. Fantastic at CRUD apps, but they bring a framework, an ORM, migrations tooling, and a deploy story that assumes a Real Server. For a 12-endpoint JSON API this is a cathedral for a bus stop. |
| **Go + SQLite** | Genuinely great: single static binary, tiny memory. Costs: CGo or a pure-Go SQLite driver dependency, and a language switch for a team whose existing code (web app, Raycast) is all JavaScript/TypeScript. Keep in the back pocket if we ever need the single-binary distribution. |
| **Bun + SQLite** | Fast and pleasant (`bun:sqlite` is excellent). But Bun is an extra runtime to install everywhere, and its edge on a network-bound API this small is unmeasurable. |
| **Node ≥22 + built-in `node:sqlite` + stdlib `http`** ✅ | **The winner, and it surprised us.** As of Node 22, SQLite ships *inside the runtime*. Which means: no npm install, no `node_modules`, no build step, no ORM, no framework. One `.mjs` file **is** the entire backend. It's the same "no build step, no framework" thesis the Campfire frontend already proved — applied to the server. |

### What the prototype implements

Everything v1 needs, nothing else:

- **Email OTP auth** — request a 6-digit code, verify it, get a bearer token. With `RESEND_API_KEY` set, codes go out via Resend (one HTTPS call, no SMTP); without it, dev mode returns the code inline so local development needs zero setup. Codes expire in 10 minutes, burn after use, and lock after 5 wrong attempts.
- **Teams** — create one (you become admin), get a speakable invite code (`ember-x7k2q`), join by code, list your teams. Membership checks on every team route.
- **Entries** — one table, two kinds. `kind: "status"` (≤280 chars, optional expiry — Campfire's model, kept intact) and `kind: "daily"` (long-form, accumulates). One concept in the schema, two behaviors in the product.
- **The reads the apps actually need** — `GET /teams/:id/today` (full roster + live statuses + today's dailies: the Mac app home screen in a single call), filterable `GET /teams/:id/entries` (per-person history, feeds), and `GET /teams/:id/digest?date=` (a day's dailies grouped by person: the morning reel).

### Measured results (this container, no tuning)

| Metric | Result |
|---|---|
| Backend size | **372 lines**, one file |
| Dependencies | **0** (`package.json` does not exist) |
| Cold start → first request served | **~100 ms** |
| Memory (RSS, serving) | **~67 MB** |
| Request latency (sequential, local) | **~0.6 ms avg** |
| Full user journey (signup → team → invite → post → digest → authz checks) | **passes**, see `test.sh` |

For a 5–50 person team posting a handful of entries a day, this server is *five orders of magnitude* over-provisioned. That's the point: the constraint on this product is capture UX, not throughput, so spend zero innovation tokens on the backend.

### SQLite vs Postgres, said plainly

Use **SQLite now**. One team's yearly data is a few thousand rows; SQLite in WAL mode handles thousands of writes/sec; backup is `cp` (or Litestream replicating to S3 for grown-up durability at ~$1/month). Use **Postgres when** there's a reason: multi-node deployment, >100s of concurrent-write teams, or an ops team that wants managed backups. The migration is unexciting — the schema is six vanilla tables and the SQL is deliberately dialect-boring. Decide with data, not in advance.

### Deployment

`fly launch` / Railway / a $4 VPS — anything that runs `node server.mjs` and persists one file. No Docker required (though the Dockerfile is three lines if a platform wants one: `FROM node:22-slim`, `COPY server.mjs .`, `CMD ["node","server.mjs"]`). TLS from the platform. Litestream sidecar for backup. Total infra bill: single-digit dollars.

---

## 2. API contract (v1)

Base: `https://api.dailies.app` (working title). JSON everywhere. Auth: `Authorization: Bearer <token>`.

```
POST  /auth/request-code   {email, name?}                    → {ok}            (dev: +dev_code)
POST  /auth/verify         {email, code}                     → {token, user}
GET   /me                                                    → {user}
PATCH /me                  {name?, avatar_url?}              → {user}

POST  /teams               {name}                            → {team}          (creator = admin)
POST  /teams/join          {invite_code}                     → {team}
GET   /teams                                                 → {teams: [{…, role}]}

GET   /teams/:id/today                                       → {members: [{user, status, today[]}]}
POST  /teams/:id/entries   {body, kind, expires_in_minutes?} → {entry}
GET   /teams/:id/entries   ?user_id&kind&since&limit         → {entries}
GET   /teams/:id/digest    ?date=YYYY-MM-DD                  → {date, byUser}
```

Deliberate v1 omissions (add when a client needs them, not before): entry editing/deletion (append-only, like Campfire — post again to supersede), avatar upload (URL field for now), token revocation UI, admin member-removal, pagination cursors (limit/since covers v1 volumes), and any realtime push — clients poll `/today` every 30s exactly as Campfire does today, which is proven sufficient at this scale. Realtime is a Phase-3 nicety (SSE endpoint, ~30 lines), not a v1 requirement.

Also not in the prototype but required before public exposure: rate limiting on the two `/auth/*` endpoints (a 20-line in-memory token bucket — they're the only unauthenticated writes) and request logging.

---

## 3. The Mac app

**Stack: native SwiftUI menu-bar app.** No Electron — a menu-bar app that idles at 300MB betrays the entire thesis. SwiftUI + `MenuBarExtra` gives us the roster popover, the global-hotkey capture panel, notifications, and launch-at-login in a few hundred lines of Swift, idling at ~30MB. The API client is `URLSession` + `Codable` against the contract above — the `/today` endpoint was shaped so the home screen is one request, decoded into one struct.

### Anatomy

1. **Menu bar item** — the 🔥. Subtle badge when there are unread dailies since your last glance.
2. **Roster popover** (click the flame) — the Campfire board, native: avatar, name, live status with time-ago, today's daily beneath. Click a person → their history grouped by day. Poll `/today` every 30s while open; refresh on wake-from-sleep.
3. **Capture panel** (global hotkey, default ⌘⇧D — configurable) — a floating `NSPanel` like Spotlight: text field, a status/daily segmented toggle, expiry presets on status mode (30m / 1h / 2h / 4h / end of day — Campfire's exact set, they were right). Enter posts, Escape dismisses, panel appears over any app, including full-screen ones.
4. **Onboarding window** (first run only) — email → code → create-or-join team. Three screens, no account settings, done.
5. **Reminder engine** — a local `UNUserNotificationCenter` notification at the user's chosen hour if today's daily is unwritten (the app knows from `/today`). Local-first reminders mean v1 ships **zero** push-notification infrastructure: no APNs certificates, no device-token tables, no server scheduler. Server-side push (for "Grace posted" notifications when the app is closed) is Phase 3, and the entries table already contains everything it needs.
6. **Offline capture** — if a post fails, queue it locally and retry; capture must never lose words. (The one place the client is allowed to be clever.)

**Distribution:** direct download (Developer ID signed + notarized) with Sparkle for auto-updates — the Raycast/Linear route. Mac App Store later if ever; it adds review latency for zero distribution value in this category.

**Team fit note:** the existing code is TypeScript/JS, so Swift is the one new skill this plan asks for. It's confined to one small, well-bounded app — and the interim hedge already exists: the current Raycast extension re-pointed at this API (delete its hardcoded user table, use real auth) delivers the ⌘\ habit on day one while the SwiftUI app is built.

### Other capture surfaces (same API, in cost order)

| Surface | Cost | Notes |
|---|---|---|
| Raycast extension | Days — it exists; swap `api.ts` to the new endpoints | Bridge until the native app ships; power-user favorite after |
| CLI (`dailies post "…"`) | A day; ships as one script | Terminal dwellers; also the scripting/integration story |
| Slack digest webhook | A day, server-side | The reel posted to #team each morning; marketing inside customers' Slack |
| Email-reply capture | Days (Resend inbound webhook) | Reply to the digest with your daily; catches the least tool-inclined teammate |
| iOS app | Weeks | 90% capture panel + reel; only after the Mac habit is proven |

---

## 4. Roadmap

**Phase 1 — Foundation (weeks 1–2).** Harden the prototype (rate limiting, logging, Resend wired, Litestream) and deploy. Re-point the Raycast extension at it. ARTSVP migrates off the anon-key Supabase board; seed script carries history over. *Exit: the team lives on real auth without noticing the switch.*

**Phase 2 — The Mac app (weeks 3–6).** SwiftUI app: onboarding, roster, capture panel, local reminders, offline queue. Signed, notarized, Sparkle. *Exit: everyone at ARTSVP posts a daily via the hotkey most days — the streak data will say so.*

**Phase 3 — The reel & the loop (weeks 7–9).** Morning digest (in-app + email), Slack webhook, streaks, blocker flags, SSE realtime, server push for closed-app notifications. *Exit: dailies are read, not just written — digest opens say so.*

**Phase 4 — Second team & polish (weeks 10–12).** Invite a friendly outside team. Web read-only digest links. CLI. Weekly LLM summaries — the feature that turns a habit log into a leadership tool, and the natural top of the paid tier. *Exit: a team you don't have dinner with uses it unprompted for two consecutive weeks.*

The guiding rule throughout, inherited from the repo we're standing on: **every layer stays small enough to read in one sitting.** Campfire's whole stack was ~500 lines and five people loved it. Dailies v1 is one 400-line server and one small native app. If any component can't be read over coffee, it's too big for what this product is.
