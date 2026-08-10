#!/usr/bin/env node
// Dailies API — single-file, zero-dependency prototype.
//
//   node server.mjs
//
// That's the whole deployment story. Node >= 22 (built-in node:sqlite), one
// SQLite file next to the script, no npm install, no build step.
//
// Config via env:
//   PORT             default 3000
//   DAILIES_DB       default ./dailies.db
//   RESEND_API_KEY   if set, OTP codes are emailed via Resend;
//                    if unset (dev mode), the code is returned in the response.
//   MAIL_FROM        from-address for OTP emails (default onboarding@resend.dev)

import { createServer } from "node:http";
import { DatabaseSync } from "node:sqlite";
import { randomBytes, randomInt } from "node:crypto";

const PORT = process.env.PORT || 3000;
const DB_PATH = process.env.DAILIES_DB || new URL("./dailies.db", import.meta.url).pathname;
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const MAIL_FROM = process.env.MAIL_FROM || "Dailies <onboarding@resend.dev>";

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const STATUS_MAX_LEN = 280;
const ENTRY_MAX_LEN = 10_000;

// ── Database ────────────────────────────────────────────────────────────────

const db = new DatabaseSync(DB_PATH);
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    id         INTEGER PRIMARY KEY,
    email      TEXT NOT NULL UNIQUE COLLATE NOCASE,
    name       TEXT NOT NULL DEFAULT '',
    avatar_url TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );

  CREATE TABLE IF NOT EXISTS otp_codes (
    id         INTEGER PRIMARY KEY,
    email      TEXT NOT NULL COLLATE NOCASE,
    code       TEXT NOT NULL,
    attempts   INTEGER NOT NULL DEFAULT 0,
    expires_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS tokens (
    id         INTEGER PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token      TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );

  CREATE TABLE IF NOT EXISTS teams (
    id          INTEGER PRIMARY KEY,
    name        TEXT NOT NULL,
    invite_code TEXT NOT NULL UNIQUE,
    created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );

  CREATE TABLE IF NOT EXISTS memberships (
    id         INTEGER PRIMARY KEY,
    team_id    INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role       TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin','member')),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    UNIQUE (team_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS entries (
    id         INTEGER PRIMARY KEY,
    team_id    INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind       TEXT NOT NULL DEFAULT 'daily' CHECK (kind IN ('daily','status')),
    body       TEXT NOT NULL,
    expires_at TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );

  CREATE INDEX IF NOT EXISTS idx_entries_team_created ON entries(team_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_entries_user_created ON entries(user_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_memberships_user ON memberships(user_id);
`);

// ── Helpers ─────────────────────────────────────────────────────────────────

const q = {
  userByEmail: db.prepare("SELECT * FROM users WHERE email = ?"),
  userByToken: db.prepare(
    "SELECT u.* FROM users u JOIN tokens t ON t.user_id = u.id WHERE t.token = ?"
  ),
  membership: db.prepare("SELECT * FROM memberships WHERE team_id = ? AND user_id = ?"),
};

function json(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
  });
  res.end(payload);
}

function fail(res, status, message) {
  json(res, status, { error: message });
}

async function readBody(req) {
  let raw = "";
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 1_000_000) throw new Error("body too large");
  }
  return raw ? JSON.parse(raw) : {};
}

function publicUser(u) {
  return { id: u.id, email: u.email, name: u.name, avatar_url: u.avatar_url };
}

// Invite codes people can say out loud: "ember-code" style, e.g. "ember-x7k2q".
function newInviteCode() {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  let suffix = "";
  for (let i = 0; i < 5; i++) suffix += alphabet[randomInt(alphabet.length)];
  return `ember-${suffix}`;
}

function isExpired(iso) {
  return iso && new Date(iso).getTime() < Date.now();
}

async function sendOtpEmail(email, code) {
  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: MAIL_FROM,
      to: [email],
      subject: `${code} is your Dailies code`,
      text: `Your Dailies sign-in code is ${code}. It expires in 10 minutes.`,
    }),
  });
  if (!resp.ok) throw new Error(`mail send failed: ${resp.status}`);
}

// ── Route handlers ──────────────────────────────────────────────────────────

async function requestCode(req, res) {
  const { email, name } = await readBody(req);
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return fail(res, 422, "valid email required");
  }

  let user = q.userByEmail.get(email);
  if (!user) {
    db.prepare("INSERT INTO users (email, name) VALUES (?, ?)").run(email, name || email.split("@")[0]);
    user = q.userByEmail.get(email);
  }

  const code = String(randomInt(100000, 1000000));
  db.prepare("DELETE FROM otp_codes WHERE email = ?").run(email);
  db.prepare("INSERT INTO otp_codes (email, code, expires_at) VALUES (?, ?, ?)").run(
    email, code, Date.now() + OTP_TTL_MS
  );

  if (RESEND_API_KEY) {
    await sendOtpEmail(email, code);
    return json(res, 200, { ok: true, message: "code sent" });
  }
  // Dev mode: no mail provider configured, hand the code back directly.
  return json(res, 200, { ok: true, message: "dev mode: code returned inline", dev_code: code });
}

async function verifyCode(req, res) {
  const { email, code } = await readBody(req);
  const row = db.prepare("SELECT * FROM otp_codes WHERE email = ?").get(email || "");
  if (!row || row.expires_at < Date.now() || row.attempts >= OTP_MAX_ATTEMPTS) {
    return fail(res, 401, "code expired or not found — request a new one");
  }
  if (row.code !== String(code)) {
    db.prepare("UPDATE otp_codes SET attempts = attempts + 1 WHERE id = ?").run(row.id);
    return fail(res, 401, "incorrect code");
  }
  db.prepare("DELETE FROM otp_codes WHERE id = ?").run(row.id);

  const user = q.userByEmail.get(email);
  const token = randomBytes(32).toString("hex");
  db.prepare("INSERT INTO tokens (user_id, token) VALUES (?, ?)").run(user.id, token);
  return json(res, 200, { token, user: publicUser(user) });
}

function authenticate(req) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  return token ? q.userByToken.get(token) : null;
}

async function createTeam(req, res, user) {
  const { name } = await readBody(req);
  if (!name?.trim()) return fail(res, 422, "team name required");

  const invite = newInviteCode();
  const { lastInsertRowid: teamId } = db
    .prepare("INSERT INTO teams (name, invite_code) VALUES (?, ?)")
    .run(name.trim(), invite);
  db.prepare("INSERT INTO memberships (team_id, user_id, role) VALUES (?, ?, 'admin')").run(teamId, user.id);

  const team = db.prepare("SELECT * FROM teams WHERE id = ?").get(teamId);
  return json(res, 201, { team });
}

async function joinTeam(req, res, user) {
  const { invite_code } = await readBody(req);
  const team = db.prepare("SELECT * FROM teams WHERE invite_code = ?").get(invite_code || "");
  if (!team) return fail(res, 404, "invite code not recognized");

  db.prepare(
    "INSERT INTO memberships (team_id, user_id) VALUES (?, ?) ON CONFLICT (team_id, user_id) DO NOTHING"
  ).run(team.id, user.id);
  return json(res, 200, { team });
}

function listTeams(res, user) {
  const teams = db.prepare(`
    SELECT t.id, t.name, t.invite_code, m.role, t.created_at
    FROM teams t JOIN memberships m ON m.team_id = t.id
    WHERE m.user_id = ? ORDER BY t.created_at
  `).all(user.id);
  return json(res, 200, { teams });
}

// The Mac app's home screen in one call: every member, their live status,
// and today's daily entries.
function teamToday(res, teamId) {
  const members = db.prepare(`
    SELECT u.id, u.email, u.name, u.avatar_url, m.role
    FROM users u JOIN memberships m ON m.user_id = u.id
    WHERE m.team_id = ? ORDER BY u.name COLLATE NOCASE
  `).all(teamId);

  const latestStatus = db.prepare(`
    SELECT * FROM entries
    WHERE team_id = ? AND user_id = ? AND kind = 'status'
    ORDER BY created_at DESC LIMIT 1
  `);
  const todaysDailies = db.prepare(`
    SELECT * FROM entries
    WHERE team_id = ? AND user_id = ? AND kind = 'daily'
      AND date(created_at) = date('now')
    ORDER BY created_at
  `);

  const roster = members.map((m) => {
    const status = latestStatus.get(teamId, m.id);
    return {
      user: m,
      status: status && !isExpired(status.expires_at) ? status : null,
      today: todaysDailies.all(teamId, m.id),
    };
  });
  return json(res, 200, { members: roster });
}

async function createEntry(req, res, user, teamId) {
  const { body, kind = "daily", expires_in_minutes } = await readBody(req);
  const text = body?.trim();
  if (!text) return fail(res, 422, "entry body required");
  if (!["daily", "status"].includes(kind)) return fail(res, 422, "kind must be 'daily' or 'status'");
  const maxLen = kind === "status" ? STATUS_MAX_LEN : ENTRY_MAX_LEN;
  if (text.length > maxLen) return fail(res, 422, `${kind} entries max ${maxLen} characters`);

  const expiresAt = expires_in_minutes
    ? new Date(Date.now() + expires_in_minutes * 60_000).toISOString()
    : null;

  const { lastInsertRowid } = db
    .prepare("INSERT INTO entries (team_id, user_id, kind, body, expires_at) VALUES (?, ?, ?, ?, ?)")
    .run(teamId, user.id, kind, text, expiresAt);
  const entry = db.prepare("SELECT * FROM entries WHERE id = ?").get(lastInsertRowid);
  return json(res, 201, { entry });
}

function listEntries(res, teamId, params) {
  const conditions = ["team_id = ?"];
  const args = [teamId];
  if (params.get("user_id")) { conditions.push("user_id = ?"); args.push(Number(params.get("user_id"))); }
  if (params.get("kind"))    { conditions.push("kind = ?");    args.push(params.get("kind")); }
  if (params.get("since"))   { conditions.push("created_at >= ?"); args.push(params.get("since")); }
  const limit = Math.min(Number(params.get("limit")) || 100, 500);

  const entries = db.prepare(`
    SELECT e.*, u.name AS user_name FROM entries e JOIN users u ON u.id = e.user_id
    WHERE ${conditions.join(" AND ")} ORDER BY e.created_at DESC LIMIT ${limit}
  `).all(...args);
  return json(res, 200, { entries });
}

// One team-day on a page: everyone's dailies for a given date, grouped by person.
function digest(res, teamId, params) {
  const date = params.get("date") || new Date().toISOString().slice(0, 10);
  const rows = db.prepare(`
    SELECT e.*, u.name AS user_name FROM entries e JOIN users u ON u.id = e.user_id
    WHERE e.team_id = ? AND e.kind = 'daily' AND date(e.created_at) = ?
    ORDER BY u.name COLLATE NOCASE, e.created_at
  `).all(teamId, date);

  const byUser = {};
  for (const r of rows) (byUser[r.user_name] ??= []).push(r);
  return json(res, 200, { date, teams: byUser });
}

// ── Router ──────────────────────────────────────────────────────────────────

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname.replace(/\/+$/, "") || "/";
  const route = `${req.method} ${path}`;

  try {
    if (req.method === "OPTIONS") return json(res, 204, {});
    if (route === "GET /health") return json(res, 200, { ok: true });
    if (route === "POST /auth/request-code") return requestCode(req, res);
    if (route === "POST /auth/verify") return verifyCode(req, res);

    // Everything below requires a bearer token.
    const user = authenticate(req);
    if (!user) return fail(res, 401, "authentication required — POST /auth/request-code to begin");

    if (route === "GET /me") return json(res, 200, { user: publicUser(user) });
    if (route === "PATCH /me") {
      const { name, avatar_url } = await readBody(req);
      db.prepare("UPDATE users SET name = COALESCE(?, name), avatar_url = COALESCE(?, avatar_url) WHERE id = ?")
        .run(name ?? null, avatar_url ?? null, user.id);
      return json(res, 200, { user: publicUser(q.userByEmail.get(user.email)) });
    }
    if (route === "POST /teams") return createTeam(req, res, user);
    if (route === "POST /teams/join") return joinTeam(req, res, user);
    if (route === "GET /teams") return listTeams(res, user);

    // Team-scoped routes: /teams/:id/...
    const teamMatch = path.match(/^\/teams\/(\d+)\/(today|entries|digest)$/);
    if (teamMatch) {
      const teamId = Number(teamMatch[1]);
      if (!q.membership.get(teamId, user.id)) return fail(res, 403, "not a member of this team");

      const sub = teamMatch[2];
      if (req.method === "GET" && sub === "today") return teamToday(res, teamId);
      if (req.method === "GET" && sub === "entries") return listEntries(res, teamId, url.searchParams);
      if (req.method === "POST" && sub === "entries") return createEntry(req, res, user, teamId);
      if (req.method === "GET" && sub === "digest") return digest(res, teamId, url.searchParams);
    }

    return fail(res, 404, "no such route");
  } catch (err) {
    if (err instanceof SyntaxError) return fail(res, 400, "invalid JSON body");
    console.error(err);
    return fail(res, 500, "internal error");
  }
});

server.listen(PORT, () => {
  console.log(`🔥 Dailies API listening on http://localhost:${PORT} (db: ${DB_PATH})`);
});
