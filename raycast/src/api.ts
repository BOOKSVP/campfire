import { getPreferenceValues } from "@raycast/api";
import { TeamUser, StatusUpdate, UserWithStatus } from "./types";
import { isExpired } from "./utils";

interface Preferences {
  supabaseUrl: string;
  supabaseKey: string;
  yourName: string;
}

function getHeaders(): HeadersInit {
  const prefs = getPreferenceValues<Preferences>();
  return {
    apikey: prefs.supabaseKey,
    Authorization: `Bearer ${prefs.supabaseKey}`,
    "Content-Type": "application/json",
    Prefer: "return=minimal",
  };
}

function getBaseUrl(): string {
  const prefs = getPreferenceValues<Preferences>();
  return prefs.supabaseUrl;
}

export async function fetchTeamUsers(): Promise<TeamUser[]> {
  const url = `${getBaseUrl()}/rest/v1/team_users?team_id=eq.1&order=username.asc`;
  const res = await fetch(url, { headers: getHeaders() });
  if (!res.ok) throw new Error(`Failed to fetch users: ${res.statusText}`);
  return res.json();
}

export async function fetchLatestStatuses(): Promise<StatusUpdate[]> {
  const url = `${getBaseUrl()}/rest/v1/status_updates?team_id=eq.1&order=created_at.desc&limit=100`;
  const res = await fetch(url, { headers: getHeaders() });
  if (!res.ok) throw new Error(`Failed to fetch statuses: ${res.statusText}`);
  return res.json();
}

export async function fetchUserHistory(userId: number): Promise<StatusUpdate[]> {
  const url = `${getBaseUrl()}/rest/v1/status_updates?team_user_id=eq.${userId}&order=created_at.desc&limit=30`;
  const res = await fetch(url, { headers: getHeaders() });
  if (!res.ok) throw new Error(`Failed to fetch history: ${res.statusText}`);
  return res.json();
}

export async function postStatus(teamUserId: number, status: string, expiresAt: string | null): Promise<void> {
  const url = `${getBaseUrl()}/rest/v1/status_updates`;
  const body: Record<string, unknown> = {
    team_id: 1,
    team_user_id: teamUserId,
    status,
  };
  if (expiresAt) body.expires_at = expiresAt;

  const res = await fetch(url, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Failed to post status: ${res.statusText}`);
}

export async function fetchUsersWithStatuses(): Promise<UserWithStatus[]> {
  const [users, statuses] = await Promise.all([fetchTeamUsers(), fetchLatestStatuses()]);

  const latestByUser = new Map<number, StatusUpdate>();
  for (const s of statuses) {
    if (!latestByUser.has(s.team_user_id) && !isExpired(s.expires_at)) {
      latestByUser.set(s.team_user_id, s);
    }
  }

  return users.map((user) => ({
    user,
    latestStatus: latestByUser.get(user.id) ?? null,
  }));
}
