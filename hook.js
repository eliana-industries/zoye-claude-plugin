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
    const file = path.join(dir, id + '.json');
    let prev = {};
    try { prev = JSON.parse(fs.readFileSync(file, 'utf8')) || {}; } catch (e) { prev = {}; } // silent-ok - no file yet on the first run of a session: the defaults below are used
    const asked = input.hook_event_name === 'UserPromptSubmit';
    const next = {
      socket: process.env.CLAUDE_CODE_MESSAGING_SOCKET || prev.socket || '',
      token: process.env.CLAUDE_CODE_MESSAGING_TOKEN || prev.token || '',
      // "at" is when the last ANSWER finished: a new request does not move it.
      at: asked ? Number(prev.at) || 0 : Date.now(),
      prompt: String(prev.prompt || ''),
      promptAt: Number(prev.promptAt) || 0,
    };
    if (asked) {
      let team = false;
      try { team = fs.readFileSync(path.join(state, 'team-sync'), 'utf8').trim() === '1'; } catch (e) { team = false; } // silent-ok - no marker means team sync is off: no request text is kept
      const p = String(input.prompt || '').replace(/\s+/g, ' ').trim();
      // A real request only: not a slash command, not "ok" or "continue".
      if (team && p.length >= 30 && p.charAt(0) !== '/') { next.prompt = p.slice(0, 200); next.promptAt = Date.now(); }
      if (!team) { next.prompt = ''; next.promptAt = 0; }
    }
    fs.writeFileSync(file, JSON.stringify(next), { mode: 0o600 });
    if (asked) return;
    // A week-old file belongs to a session long gone.
    const old = Date.now() - 7 * 24 * 3600 * 1000;
    for (const f of fs.readdirSync(dir)) {
      try { if (fs.statSync(path.join(dir, f)).mtimeMs < old) fs.unlinkSync(path.join(dir, f)); } catch (e) {}
    }
  } catch (e) { /* never fail the session */ }
});
