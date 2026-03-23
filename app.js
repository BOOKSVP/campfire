// Campfire — Team Status
// Static frontend talking to Supabase REST API

const SUPABASE_URL = window.CAMPFIRE_CONFIG?.supabaseUrl || '';
const SUPABASE_KEY = window.CAMPFIRE_CONFIG?.supabaseKey || '';
const TEAM_ID = window.CAMPFIRE_CONFIG?.teamId || '';
const REFRESH_INTERVAL = 30000; // 30s

const headers = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

// ── Helpers ──

function timeAgo(date) {
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function getInitials(name) {
  return name.split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function isExpired(expiresAt) {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

function toast(msg) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2500);
}

// ── API ──

async function fetchUsers() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/team_users?team_id=eq.${TEAM_ID}&order=username.asc`,
    { headers }
  );
  return res.json();
}

async function fetchLatestStatuses() {
  // Get the most recent status for each user via a view or by fetching all recent
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/status_updates?team_id=eq.${TEAM_ID}&order=created_at.desc&limit=100`,
    { headers }
  );
  const all = await res.json();

  // Group by user, take latest
  const latest = {};
  for (const s of all) {
    if (!latest[s.team_user_id]) {
      latest[s.team_user_id] = s;
    }
  }
  return latest;
}

async function postStatus(teamUserId, status, expiresMinutes) {
  const body = {
    team_id: parseInt(TEAM_ID),
    team_user_id: teamUserId,
    status: status
  };
  if (expiresMinutes) {
    const exp = new Date(Date.now() + expiresMinutes * 60000);
    body.expires_at = exp.toISOString();
  }
  const res = await fetch(`${SUPABASE_URL}/rest/v1/status_updates`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });
  return res.ok;
}

// ── Render ──

function renderTeam(users, statuses) {
  const grid = document.getElementById('team-grid');
  const select = document.getElementById('user-select');

  if (!users.length) {
    grid.innerHTML = '<div class="loading">No team members yet</div>';
    return;
  }

  grid.innerHTML = users.map(u => {
    const s = statuses[u.id];
    const hasStatus = s && s.status && !isExpired(s.expires_at);
    const statusText = hasStatus ? s.status : 'No status';
    const dotClass = hasStatus ? 'online' : 'offline';
    const meta = hasStatus ? timeAgo(new Date(s.created_at)) : '';
    const expiryNote = (hasStatus && s.expires_at) ?
      ` · expires ${new Date(s.expires_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}` : '';

    const avatarInner = u.profile_pic_url
      ? `<img src="${u.profile_pic_url}" alt="${u.username}">`
      : getInitials(u.username);

    return `
      <div class="user-card">
        <div class="avatar">${avatarInner}</div>
        <div class="user-info">
          <div class="user-name">${u.username}</div>
          <div class="user-status ${hasStatus ? 'active' : ''}">${statusText}</div>
        </div>
        <div class="status-meta">
          <span class="status-dot ${dotClass}"></span>
          ${meta}${expiryNote}
        </div>
      </div>
    `;
  }).join('');

  // Populate user dropdown
  select.innerHTML = users.map(u =>
    `<option value="${u.id}">${u.username}</option>`
  ).join('');
}

// ── Init ──

async function refresh() {
  try {
    const [users, statuses] = await Promise.all([
      fetchUsers(),
      fetchLatestStatuses()
    ]);
    renderTeam(users, statuses);
    document.getElementById('last-refresh').textContent =
      `Updated ${new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}`;
  } catch (e) {
    console.error('Refresh failed:', e);
  }
}

function init() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    document.getElementById('team-grid').innerHTML =
      '<div class="loading">Configure Supabase in config.js to get started</div>';
    return;
  }

  refresh();
  setInterval(refresh, REFRESH_INTERVAL);

  // Toggle update bar
  const toggleBtn = document.getElementById('toggle-update');
  const updateBar = document.getElementById('update-bar');
  toggleBtn.addEventListener('click', () => {
    updateBar.classList.toggle('hidden');
    if (!updateBar.classList.contains('hidden')) {
      document.getElementById('status-input').focus();
    }
  });

  // Post status
  const postBtn = document.getElementById('post-btn');
  const statusInput = document.getElementById('status-input');

  async function doPost() {
    const userId = parseInt(document.getElementById('user-select').value);
    const status = statusInput.value.trim();
    const expires = document.getElementById('expires-select').value;

    if (!status) return;

    postBtn.disabled = true;
    const ok = await postStatus(userId, status, expires ? parseInt(expires) : null);
    postBtn.disabled = false;

    if (ok) {
      statusInput.value = '';
      updateBar.classList.add('hidden');
      toast('Status updated 🔥');
      refresh();
    } else {
      toast('Failed to post — check console');
    }
  }

  postBtn.addEventListener('click', doPost);
  statusInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doPost();
  });
}

document.addEventListener('DOMContentLoaded', init);
