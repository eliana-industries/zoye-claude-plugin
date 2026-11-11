#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');

let raw = '';
process.stdin.on('data', function (d) { raw += d; });
process.stdin.on('end', function () {
  try {
    const input = JSON.parse(raw || '{}');
    const id = String(input.session_id || '').replace(/[^A-Za-z0-9-]/g, '');
    if (!id) return;
    const state = process.env.ZOYE_STATE_DIR || path.join(process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude'), 'channels', 'zoye');
    const dir = path.join(state, 'sessions');
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    fs.writeFileSync(path.join(dir, id + '.json'), JSON.stringify({
      socket: process.env.CLAUDE_CODE_MESSAGING_SOCKET || '',
      token: process.env.CLAUDE_CODE_MESSAGING_TOKEN || '',
      at: Date.now(),
    }), { mode: 0o600 });
    // A week-old file belongs to a session long gone.
    const old = Date.now() - 7 * 24 * 3600 * 1000;
    for (const f of fs.readdirSync(dir)) {
      try { if (fs.statSync(path.join(dir, f)).mtimeMs < old) fs.unlinkSync(path.join(dir, f)); } catch (e) {}
    }
  } catch (e) { /* never fail the session */ }
});
