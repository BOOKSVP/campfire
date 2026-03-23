#!/usr/bin/env node
// Campfire Notifier — listens to Supabase Realtime, sends macOS notifications

import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// Load config
const configPath = join(process.env.HOME, '.campfire-raycast', 'raycast', 'config.json');
let config;

if (existsSync(configPath)) {
  config = JSON.parse(readFileSync(configPath, 'utf8'));
} else {
  config = {
    supabaseUrl: 'https://vpsktiisvhppctywdykg.supabase.co',
    supabaseKey: 'sb_publishable_uJZrqKjWwKx634O2Y5Zv-g_fn18vQBz',
    teamId: 1
  };
}

const supabase = createClient(config.supabaseUrl, config.supabaseKey);

// Cache user names
const users = {};

async function loadUsers() {
  const { data } = await supabase
    .from('team_users')
    .select('id, username')
    .eq('team_id', config.teamId);
  if (data) {
    for (const u of data) {
      users[u.id] = u.username;
    }
  }
  console.log(`[campfire] Loaded ${Object.keys(users).length} users`);
}

const ICON_PATH = join(process.env.HOME, '.campfire-raycast', 'notifier', 'icon.png');

function notify(title, message) {
  const escaped = message.replace(/"/g, '\\"').replace(/'/g, "'");
  const titleEscaped = title.replace(/"/g, '\\"');
  try {
    // Try terminal-notifier first (custom icon + sound)
    execSync(`terminal-notifier -title "${titleEscaped}" -message "${escaped}" -appIcon "${ICON_PATH}" -sound default -group campfire 2>/dev/null`);
  } catch {
    // Fallback to osascript
    try {
      execSync(`osascript -e 'display notification "${escaped}" with title "${titleEscaped}"'`);
    } catch {
      console.error('[campfire] Failed to send notification');
    }
  }
}

async function start() {
  await loadUsers();

  console.log('[campfire] Listening for status updates...');

  supabase
    .channel('status-updates')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'status_updates',
      filter: `team_id=eq.${config.teamId}`
    }, (payload) => {
      const { team_user_id, status } = payload.new;
      const name = users[team_user_id] || 'Someone';
      console.log(`[campfire] ${name}: ${status}`);
      notify('🔥 Campfire', `${name}: ${status}`);
    })
    .subscribe((status) => {
      console.log(`[campfire] Subscription: ${status}`);
    });
}

start().catch(console.error);
