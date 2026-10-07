# Zoye for Claude Code

Zoye is the AI business assistant small teams run from the Zoye app, WhatsApp and Slack. This plugin lets Zoye hand work to the Claude Code you already have open. You ask Zoye something like "ask Claude to fix the failing test in the backend", Zoye sends it to this session, Claude does the work here as usual, and the answer comes back to the chat you asked from.

## What you need

- A Zoye account on a plan that includes Claude (Scale).
- Claude Code signed in with a claude.ai account. Channels are a Claude Code research preview and run in the terminal (including the VS Code, Cursor and Windsurf terminals).
- Node.js 18 or newer: the plugin runs `node server.js`, and nothing is downloaded at install or start.

## Set it up

1. In Zoye, open Connectors > Claude > Manage Claude via Zoye > Your own Claude Code, and copy your token (it starts with zcc_).
2. Start Claude Code with the Zoye channel on. Zoye shows the exact command. Until Anthropic adds Zoye to the channel allowlist, it is:

    claude --dangerously-load-development-channels plugin:zoye@zoye

3. Run `/zoye:connect zcc_...` once. Zoye shows this Claude Code as Online while it runs, and Offline once you close it.
4. Optional: `/zoye:name pricing` names this session, so you can tell Zoye "send this to the pricing session".

## Your Zoye data in Claude Code

The plugin also adds Zoye's own connector (`zoye-data`, https://api.zoye.io/mcp), the same one claude.ai uses, so Claude here can look up and update your contacts, deals, tasks, meetings and reports. It stays off until you sign in: run `/mcp`, choose zoye-data, and approve on Zoye's own consent screen, where you pick which workspaces it may reach. It acts with your own permissions, and anything that deletes, sends or spends asks you first. If you already added the Zoye connector on claude.ai, you can skip this.

## What it sends, receives and stores

- It talks only to Zoye's API at https://api.zoye.io, over HTTPS: the channel with your token, and the zoye-data connector with the sign-in you approve. No other destination.
- It sends: the answers and short progress notes Claude writes back to you; files Claude chooses to attach to an answer (up to 10, each up to 25 MB); the repository name and branch of the folder Claude worked in, read with git without changing anything, so Zoye can tell you where the work is; the permission questions Claude Code would ask you (tool name, description and a short preview of the input), so you can answer them from Zoye; this machine's host name, the project folder name and path, and the Claude Code process id, so Zoye can tell your open sessions apart; and whether this Claude Code was started with the Zoye channel (read from the command line of the Claude Code process, without changing anything), so Zoye sends work only to a session that can receive it.
- It receives: the requests you send from Zoye, and your answers to those permission questions.
- It stores your token in `~/.claude/channels/zoye/.env`, readable only by you. A `ZOYE_TOKEN` environment variable, when set, is used instead.
- It reads `~/.claude/settings.json` only to check whether Zoye's own reply, progress and name tools are allowed. It never changes your settings. If they are not allowed, `/zoye:connect` asks whether you want them added, so answers are not blocked in auto mode, and adds them only if you say yes.

To disconnect, choose Disconnect in Zoye or delete the token file.

## Support

hello@zoye.io · Privacy policy: https://www.zoye.io/privacy
