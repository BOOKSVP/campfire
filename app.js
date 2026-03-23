// Campfire — Team Status
// Static frontend talking to Supabase REST API

const SUPABASE_URL = window.CAMPFIRE_CONFIG?.supabaseUrl || '';
const SUPABASE_KEY = window.CAMPFIRE_CONFIG?.supabaseKey || '';
const TEAM_ID = window.CAMPFIRE_CONFIG?.teamId || '';
const REFRESH_INTERVAL = 30000; // 30s
const REALTIME_URL = `${window.CAMPFIRE_CONFIG?.supabaseUrl}/realtime/v1`;

const headers = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

let currentUsers = [];

// ── Identity (localStorage) ──

function getIdentity() {
  return localStorage.getItem('campfire_user_id');
}

function setIdentity(userId) {
  localStorage.setItem('campfire_user_id', userId);
}

function hasIdentity() {
  return !!getIdentity();
}

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
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/status_updates?team_id=eq.${TEAM_ID}&order=created_at.desc&limit=100`,
    { headers }
  );
  const all = await res.json();
  const latest = {};
  for (const s of all) {
    if (!latest[s.team_user_id]) {
      latest[s.team_user_id] = s;
    }
  }
  return latest;
}

async function fetchUserHistory(teamUserId) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/status_updates?team_user_id=eq.${teamUserId}&order=created_at.desc&limit=30`,
    { headers }
  );
  return res.json();
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

// ── Settings ──

window.openSettings = function openSettings() {
  const grid = document.getElementById('team-grid');
  const updateBar = document.getElementById('update-bar');
  const footer = document.querySelector('footer');
  updateBar.classList.add('hidden');
  if (footer) footer.classList.add('hidden');

  const currentId = getIdentity();

  const optionsHtml = currentUsers.map(u => {
    const selected = currentId == u.id;
    const avatarInner = u.profile_pic_url
      ? `<img src="${u.profile_pic_url}" alt="${u.username}">`
      : getInitials(u.username);

    return `
      <div class="identity-option ${selected ? 'selected' : ''}" data-user-id="${u.id}">
        <div class="avatar">${avatarInner}</div>
        <span class="identity-name">${u.username}</span>
        ${selected ? '<span class="identity-check">✓</span>' : ''}
      </div>
    `;
  }).join('');

  const hint = currentId
    ? `You're posting as ${currentUsers.find(u => u.id == currentId)?.username || 'Unknown'}`
    : 'Select your name to post status updates';

  grid.innerHTML = `
    <div class="history-view">
      <div class="history-header">
        <button class="history-back" onclick="window.closeSettings()">← Back</button>
        <div class="history-title">Settings</div>
      </div>
      <div class="settings-body">
        <label class="settings-label">Who are you?</label>
        <div class="identity-options">${optionsHtml}</div>
        <p class="settings-hint">${hint}</p>
      </div>
    </div>
  `;

  // Click handlers
  grid.querySelectorAll('.identity-option').forEach(el => {
    el.addEventListener('click', () => {
      setIdentity(el.dataset.userId);
      updatePostButton();
      toast(`You're now ${currentUsers.find(u => u.id == el.dataset.userId)?.username} 🔥`);
      openSettings(); // Re-render to show checkmark
    });
  });
}

window.closeSettings = function closeSettings() {
  const footer = document.querySelector('footer');
  if (footer) footer.classList.remove('hidden');
  refresh();
}

function updatePostButton() {
  const toggleBtn = document.getElementById('toggle-update');
  if (hasIdentity()) {
    const user = currentUsers.find(u => u.id == getIdentity());
    toggleBtn.textContent = `Post as ${user?.username || '...'}`;
    toggleBtn.disabled = false;
  } else {
    toggleBtn.textContent = 'Set up your identity first';
    toggleBtn.disabled = true;
  }
}

// ── History Panel ──

window.showHistory = async function showHistory(userId) {
  const user = currentUsers.find(u => u.id === userId);
  if (!user) return;

  const grid = document.getElementById('team-grid');
  const history = await fetchUserHistory(userId);

  const avatarInner = user.profile_pic_url
    ? `<img src="${user.profile_pic_url}" alt="${user.username}">`
    : getInitials(user.username);

  let historyHtml = '';
  if (!history.length) {
    historyHtml = '<div class="history-empty">No status history yet</div>';
  } else {
    const days = {};
    for (const s of history) {
      const dayKey = new Date(s.created_at).toDateString();
      if (!days[dayKey]) days[dayKey] = [];
      days[dayKey].push(s);
    }

    for (const [dayKey, entries] of Object.entries(days)) {
      const d = new Date(dayKey);
      const now = new Date();
      const isToday = d.toDateString() === now.toDateString();
      const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
      const isYesterday = d.toDateString() === yesterday.toDateString();
      const dayLabel = isToday ? 'Today' : isYesterday ? 'Yesterday'
        : d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

      historyHtml += `<div class="history-day-label">${dayLabel}</div>`;
      for (const s of entries) {
        const time = new Date(s.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const expired = isExpired(s.expires_at);
        const expiryTag = s.expires_at
          ? (expired ? ' <span class="history-expired">expired</span>' : ` <span class="history-expiry">til ${new Date(s.expires_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>`)
          : '';
        historyHtml += `
          <div class="history-entry ${expired ? 'dimmed' : ''}">
            <span class="history-time">${time}</span>
            <span class="history-status">${s.status}${expiryTag}</span>
          </div>
        `;
      }
    }
  }

  grid.innerHTML = `
    <div class="history-view">
      <div class="history-header">
        <button class="history-back" onclick="window.closeHistory()">← Back</button>
        <div class="history-avatar avatar">${avatarInner}</div>
        <div class="history-title">${user.username}</div>
      </div>
      <div class="history-list">${historyHtml}</div>
    </div>
  `;
  grid.dataset.historyMode = 'true';
}

window.closeHistory = function closeHistory() {
  const grid = document.getElementById('team-grid');
  delete grid.dataset.historyMode;
  refresh();
}

// ── Render ──

function renderTeam(users, statuses) {
  const grid = document.getElementById('team-grid');
  currentUsers = users;

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
      <div class="user-card" data-user-id="${u.id}" style="cursor:pointer">
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

  updatePostButton();
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

  // Click on user card → show history
  document.getElementById('team-grid').addEventListener('click', (e) => {
    const card = e.target.closest('.user-card');
    if (card && card.dataset.userId) {
      showHistory(parseInt(card.dataset.userId));
    }
  });

  // Toggle update bar
  const toggleBtn = document.getElementById('toggle-update');
  const updateBar = document.getElementById('update-bar');
  toggleBtn.addEventListener('click', () => {
    if (!hasIdentity()) {
      openSettings();
      return;
    }
    updateBar.classList.toggle('hidden');
    if (!updateBar.classList.contains('hidden')) {
      document.getElementById('status-input').focus();
    }
  });

  // Settings toggle
  document.getElementById('toggle-settings').addEventListener('click', () => {
    openSettings();
  });

  // Post status (as current identity only)
  const postBtn = document.getElementById('post-btn');
  const statusInput = document.getElementById('status-input');

  async function doPost() {
    if (!hasIdentity()) {
      toast('Set your identity in Settings first');
      return;
    }

    const userId = parseInt(getIdentity());
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

  // If no identity set, prompt on first visit
  if (!hasIdentity()) {
    setTimeout(() => openSettings(), 500);
  }

  // Request notification permission
  if ('Notification' in window && Notification.permission === 'default') {
    // Show a prompt after user has interacted
    document.addEventListener('click', function askNotif() {
      Notification.requestPermission();
      document.removeEventListener('click', askNotif);
    }, { once: true });
  }

  // Subscribe to Supabase Realtime for live updates + notifications
  setupRealtime();
}

function setupRealtime() {
  if (!SUPABASE_URL || !SUPABASE_KEY || !window.supabase) return;

  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  client
    .channel('campfire-statuses')
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'status_updates', filter: `team_id=eq.${TEAM_ID}` },
      (payload) => {
        const record = payload.new;
        const userId = record.team_user_id;
        const status = record.status;
        const user = currentUsers.find(u => u.id === userId);
        const name = user?.username || 'Someone';

        // Refresh the UI instantly
        refresh();

        // Send browser notification
        const myId = getIdentity();
        if ('Notification' in window && Notification.permission === 'granted') {
          if (String(userId) !== String(myId)) {
            new Notification(`🔥 ${name}`, {
              body: status,
              icon: user?.profile_pic_url || undefined,
              tag: `campfire-${userId}`
            });
          }
        }
      }
    )
    .subscribe((status) => {
      console.log('[campfire] Realtime:', status);
    });
}

document.addEventListener('DOMContentLoaded', init);
