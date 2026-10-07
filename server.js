#!/usr/bin/env node
'use strict';
const readline = require('readline');
const fs = require('fs');
const path = require('path');
const os = require('os');
const childProcess = require('child_process');

const API = (process.env.ZOYE_API || '').replace(/\/+$/, '');
const STATE_DIR = process.env.ZOYE_STATE_DIR || path.join(process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude'), 'channels', 'zoye');
const ENV_FILE = path.join(STATE_DIR, '.env');
function fileToken() {
  try {
    const m = fs.readFileSync(ENV_FILE, 'utf8').match(/^ZOYE_TOKEN=(\S+)/m);
    return m ? m[1].trim() : '';
  } catch (e) { return ''; }
}
let TOKEN = (process.env.ZOYE_TOKEN || '').trim() || fileToken();
let started = false;
const VERSION = '1.11.0';
// Which Claude Code this is: the machine, the folder it was started in, and THIS
// running session (two terminals in the same folder are two sessions). Zoye lists
// each by its folder (or the name given with /zoye:name), so "ask the backend one"
// or "the pricing one" lands in exactly that session, and a session opened at a
// parent folder (one that sees every project inside it) can be left to decide.
const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const INSTANCE = os.hostname() + ':' + PROJECT_DIR + '#' + process.ppid;
let PROJECT = path.basename(PROJECT_DIR) || 'Claude Code';
// Does this Claude Code LISTEN to Zoye? Only one started with the Zoye channel
// (--channels / --dangerously-load-development-channels naming zoye) passes a
// request on to Claude. An editor chat (VS Code, Cursor) loads this plugin too,
// so it is reported, and Zoye never sends it work (2026-10-07: seven editor chats
// made a Mac read "Online" while nothing could answer). Read from the command line
// of the Claude Code that started this process (a few parents up, read only);
// unknown (no ps, Windows) is reported as nothing, and Zoye trusts it as before.
function channelOn() {
  try {
    let pid = process.ppid;
    for (let i = 0; i < 4 && pid > 1; i++) {
      const out = String(childProcess.execFileSync('ps', ['-o', 'ppid=,args=', '-p', String(pid)], { timeout: 2000, stdio: ['ignore', 'pipe', 'ignore'] })).trim();
      const m = /^(\d+)\s+([\s\S]*)$/.exec(out);
      if (!m) return undefined;
      const args = m[2];
      if (/\bclaude\b/.test(args)) return /--(?:dangerously-load-development-)?channels[\s=][^\n]*zoye/.test(args);
      pid = Number(m[1]);
    }
  } catch (e) { /* no ps: unknown */ }
  return undefined;
}
const LISTENING = channelOn();

let protocolVersion = '2025-06-18';
const MAX_FILE = 25 * 1024 * 1024;
const OWN_TOOL = /^mcp__plugin_zoye_zoye__(reply|progress|name)$/;

function log(msg) { try { process.stderr.write('[zoye-channel] ' + msg + '\n'); } catch (e) {} }
function send(obj) { process.stdout.write(JSON.stringify(obj) + '\n'); }
function notify(method, params) { send({ jsonrpc: '2.0', method: method, params: params }); }
function result(id, value) { send({ jsonrpc: '2.0', id: id, result: value }); }
function error(id, code, message) { send({ jsonrpc: '2.0', id: id, error: { code: code, message: message } }); }

async function api(method, p, body, timeoutMs) {
  const res = await fetch(API + '/api/claude-bridge/device/' + p, {
    method: method,
    headers: { 'Authorization': 'Bearer ' + TOKEN, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(timeoutMs || 30000),
  });
  const text = await res.text();
  let json = null; try { json = text ? JSON.parse(text) : null; } catch (e) {}
  if (!res.ok) throw new Error('Zoye answered ' + res.status + ': ' + (json && (json.message || json.error) || text).toString().slice(0, 200));
  return json;
}

const INSTRUCTIONS = [
  'Messages from Zoye arrive as <channel source="zoye" session_id="..." turn_id="..." title="...">. Each one is a request from the Zoye user (the person who owns this Claude Code), relayed by their Zoye assistant from in-app chat, WhatsApp or Slack.',
  'Do the work here, in this session, with your own tools, exactly as if they had typed it.',
  'The person is NOT at this computer: they are in the Zoye app, WhatsApp or Slack. Text you write in this terminal never reaches them. Your answer reaches them ONLY through the reply tool.',
  'So EVERY request gets exactly one reply call with the SAME session_id, even a one-line answer, a poem or "done". The text is read in a chat, often on a phone: lead with the answer and keep it short. Attach any file you made with files: ["/absolute/path"].',
  'For long work you may call progress with a few words ("Running the tests") so the user sees you are on it.',
  'If a message says STOP, stop the current task and reply with one line saying what was done so far.',
].join('\n');

const TOOLS = [
  {
    name: 'reply',
    description: 'Send your answer back to the Zoye user who asked (it reaches them on the channel they used). Pass the session_id from the <channel> tag.',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: { type: 'string', description: 'session_id from the <channel> tag of the request you are answering.' },
        text: { type: 'string', description: 'Your answer, written for a chat.' },
        files: { type: 'array', items: { type: 'string' }, description: 'Optional absolute paths of files to attach (max 10, 25 MB each).' },
        worked_in: { type: 'string', description: 'If you changed files in a git repository, its absolute folder path (the repo or worktree), so Zoye records which repository and branch the work is on.' },
      },
      required: ['session_id', 'text'],
    },
  },
  {
    name: 'connect',
    description: 'Save the Zoye token (starts with zcc_) the user copied from Zoye: Connectors > Claude > Manage Claude via Zoye > Your own Claude Code, and connect this Claude Code to Zoye. Only when the user gives you a token.',
    inputSchema: {
      type: 'object',
      properties: { token: { type: 'string', description: 'The zcc_ token.' } },
      required: ['token'],
    },
  },
  {
    name: 'name',
    description: 'Give THIS Claude Code session a short name the user will use in Zoye ("pricing", "website"). Only when the user asks to name it.',
    inputSchema: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] },
  },
  {
    name: 'progress',
    description: 'Optional: tell the Zoye user in a few words what you are doing on a long request.',
    inputSchema: {
      type: 'object',
      properties: { session_id: { type: 'string' }, label: { type: 'string' } },
      required: ['session_id', 'label'],
    },
  },
];

// Which repository and branch the work is on, read with git (nothing is changed).
// Zoye keeps it with the session, so "which branch did my Claude Code use?" has an
// answer, and with GitHub connected it finds the pull request for that branch.
function gitWhere(dir) {
  const git = function (a) {
    try { return String(childProcess.execFileSync('git', ['-C', dir].concat(a), { timeout: 3000, stdio: ['ignore', 'pipe', 'ignore'] })).trim(); } catch (e) { return ''; }
  };
  const branch = git(['symbolic-ref', '--short', '-q', 'HEAD']);
  const remote = git(['remote', 'get-url', 'origin']);
  const m = remote.match(/[:/]([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?\/?$/);
  return {
    repo: m ? m[1] + '/' + m[2] : undefined,
    branch: branch && branch !== 'HEAD' ? branch.slice(0, 200) : undefined,
  };
}

async function callTool(name, args) {
  if (name === 'reply') {
    const files = [];
    for (const f of (args.files || []).slice(0, 10)) {
      try {
        const p = path.resolve(String(f));
        const st = fs.statSync(p);
        if (!st.isFile() || st.size > MAX_FILE) { log('skipped file ' + p); continue; }
        files.push({ name: path.basename(p), base64: fs.readFileSync(p).toString('base64') });
      } catch (e) { log('could not read ' + f + ': ' + e.message); }
    }
    const where = gitWhere(args.worked_in ? String(args.worked_in) : PROJECT_DIR);
    await api('POST', 'reply', { session_id: Number(args.session_id), text: String(args.text || ''), files: files, repo: where.repo, branch: where.branch });
    return 'Sent to the Zoye user.' + (files.length ? ' Attached ' + files.length + ' file(s).' : '');
  }
  if (name === 'connect') {
    const t = String(args.token || '').trim();
    if (!/^zcc_[A-Za-z0-9_-]{16,}$/.test(t)) throw new Error('That is not a Zoye token. Copy it from Zoye: Connectors > Claude > Manage Claude via Zoye > Your own Claude Code (it starts with zcc_).');
    const prev = TOKEN;
    TOKEN = t;
    try { await api('POST', 'hello', { client_info: clientInfo() }); } catch (e) { TOKEN = prev; throw e; }
    fs.mkdirSync(STATE_DIR, { recursive: true, mode: 0o700 });
    fs.writeFileSync(ENV_FILE, 'ZOYE_TOKEN=' + t + '\n', { mode: 0o600 });
    const missing = missingOwnToolRules();
    start();
    return 'Connected. Zoye now shows this Claude Code as Online. The token is saved in ' + ENV_FILE + ', so next time just start Claude Code with the channel on.'
      + (missing.length ? ' NOT_YET_ALLOWED: ' + missing.join(', ') : '');
  }
  if (name === 'name') {
    const n = String(args.name || '').replace(/\s+/g, ' ').trim().slice(0, 60);
    if (!n) throw new Error('Give the session a name, for example: /zoye:name pricing');
    PROJECT = n;
    return 'Done. In Zoye this session is now called "' + n + '" (for as long as it runs).';
  }
  if (name === 'progress') {
    await api('POST', 'progress', { session_id: Number(args.session_id), label: String(args.label || '') });
    return 'ok';
  }
  throw new Error('Unknown tool ' + name);
}

// ── requests from Zoye: long-poll with acknowledgement ───────────────────────
// Plain request/response gets through every proxy (an event stream was buffered
// whole by a tunnel in testing). Zoye offers a prompt on every poll until its
// turn id is acked here, so nothing is lost in transit; SEEN drops repeats.
let polling = false;
const SEEN = new Set();
async function pollLoop() {
  if (polling) return; polling = true;
  let ack = [];
  let backoff = 1000;
  let said = false;
  for (;;) {
    try {
      const r = await api('POST', 'poll', { ack: ack, instance: INSTANCE, project: PROJECT, dir: PROJECT_DIR, listening: LISTENING }, 60000);
      ack = [];
      backoff = 1000;
      if (!said) { log('connected to Zoye'); said = true; }
      for (const ev of (r && r.events) || []) {
        if (ev && ev.turn_id) {
          ack.push(ev.turn_id);
          if (SEEN.has(ev.turn_id)) continue;
          SEEN.add(ev.turn_id);
        }
        handleEvent(ev);
      }
    } catch (e) {
      if (/answered 40[13]/.test(e.message)) { log('Zoye refused this token. Create a new one in Zoye: Connectors > Claude > Manage Claude via Zoye > Your own Claude Code, then run /zoye:connect <token>.'); polling = false; return; }
      log('poll: ' + e.message);
      await new Promise(function (r) { setTimeout(r, backoff); });
      backoff = Math.min(backoff * 2, 30000);
    }
  }
}

function handleEvent(ev) {
  if (!ev || !ev.type) return;
  if (ev.type === 'message') {
    notify('notifications/claude/channel', {
      // The reminder rides on every message: a short answer was once written to
      // the terminal only, where nobody saw it (2026-10-03).
      content: String(ev.text || '') + '\n\n(Answer with the zoye reply tool, session_id ' + String(ev.session_id) + '. The person cannot see this terminal.)',
      meta: { session_id: String(ev.session_id), turn_id: String(ev.turn_id || ''), title: String(ev.title || '').slice(0, 120) },
    });
  } else if (ev.type === 'permission_verdict') {
    notify('notifications/claude/channel/permission', { request_id: String(ev.request_id), behavior: ev.behavior === 'allow' ? 'allow' : 'deny' });
  }
}

// Auto mode can block the reply that carries the user's own answer back to them
// (2026-10-03). The plugin never edits Claude Code's settings itself: it only
// READS them to see whether Zoye's three own tools are already allowed, and if
// not, the connect skill asks the user and adds them on a yes (directory policy:
// no undisclosed permission changes).
const OWN_TOOL_RULES = ['mcp__plugin_zoye_zoye__reply', 'mcp__plugin_zoye_zoye__progress', 'mcp__plugin_zoye_zoye__name'];
function missingOwnToolRules() {
  try {
    const file = path.join(process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude'), 'settings.json');
    const raw = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
    const allow = ((raw.trim() ? JSON.parse(raw) : {}).permissions || {}).allow || [];
    return OWN_TOOL_RULES.filter(function (r) { return allow.indexOf(r) < 0; });
  } catch (e) { return OWN_TOOL_RULES.slice(); }
}

function clientInfo() { return os.hostname().slice(0, 60) + ' / zoye-channel ' + VERSION; }
async function heartbeat() {
  try { await api('POST', 'hello', { client_info: clientInfo() }); } catch (e) { log('heartbeat: ' + e.message); }
}
function start() {
  started = true;
  heartbeat(); // records which machine this is; every poll keeps it Online
  pollLoop();
}

// ── JSON-RPC over stdio ─────────────────────────────────────────────────────
const rl = readline.createInterface({ input: process.stdin });
rl.on('line', async function (line) {
  let msg; try { msg = JSON.parse(line); } catch (e) { return; }
  const id = msg.id;
  try {
    if (msg.method === 'initialize') {
      if (msg.params && msg.params.protocolVersion) protocolVersion = msg.params.protocolVersion;
      result(id, {
        protocolVersion: protocolVersion,
        capabilities: { tools: {}, experimental: { 'claude/channel': {}, 'claude/channel/permission': {} } },
        serverInfo: { name: 'zoye', version: VERSION },
        instructions: INSTRUCTIONS,
      });
      return;
    }
    if (msg.method === 'notifications/initialized') {
      if (!API) { log('Missing Zoye address. Reinstall the plugin.'); return; }
      if (TOKEN) { start(); return; }
      log('Not connected yet. Copy your token from Zoye: Connectors > Claude > Manage Claude via Zoye > Your own Claude Code, then run /zoye:connect <token>.');
      const wait = setInterval(function () {
        if (started) { clearInterval(wait); return; }
        const t = fileToken();
        if (t) { TOKEN = t; clearInterval(wait); start(); }
      }, 3000);
      return;
    }
    if (msg.method === 'notifications/claude/channel/permission_request') {
      const p = msg.params || {};
      // Answering the Zoye user through this channel IS the channel; asking that
      // user to approve the answer itself would only park it (seen live in manual
      // mode, 2026-10-03). Everything else is relayed for a real decision.
      if (OWN_TOOL.test(String(p.tool_name || ''))) {
        notify('notifications/claude/channel/permission', { request_id: String(p.request_id), behavior: 'allow' });
        return;
      }
      api('POST', 'permission', { request_id: p.request_id, tool_name: p.tool_name, description: p.description, input_preview: p.input_preview }).catch(function (e) { log('permission relay: ' + e.message); });
      return;
    }
    if (msg.method === 'ping') { result(id, {}); return; }
    if (msg.method === 'tools/list') { result(id, { tools: TOOLS }); return; }
    if (msg.method === 'tools/call') {
      const p = msg.params || {};
      try {
        const text = await callTool(p.name, p.arguments || {});
        result(id, { content: [{ type: 'text', text: text }] });
      } catch (e) {
        result(id, { content: [{ type: 'text', text: 'Failed: ' + e.message }], isError: true });
      }
      return;
    }
    if (id !== undefined && id !== null) error(id, -32601, 'Method not found: ' + msg.method);
  } catch (e) {
    if (id !== undefined && id !== null) error(id, -32603, e.message);
  }
});
// Claude Code closed: tell Zoye this session is gone (best effort, at most 2 s),
// so nothing is sent to it in the seconds before it would time out.
let leaving = false;
function goodbye() {
  if (leaving) return; leaving = true;
  if (!TOKEN || !API) process.exit(0);
  api('POST', 'bye', { instance: INSTANCE }, 2000).catch(function () {}).then(function () { process.exit(0); });
}
rl.on('close', goodbye);
process.on('SIGTERM', goodbye);
process.on('SIGINT', goodbye);
process.on('SIGHUP', goodbye);
