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

## Team sync (optional)

Off unless you turn it on. Add the line `ZOYE_TEAM=1` to `~/.claude/channels/zoye/.env` (or set the `ZOYE_TEAM=1` environment variable) and restart Claude Code. Then the Claude Codes of everyone in your Zoye organization who also turned it on can see each other and talk directly, so nobody has to copy messages between them:

- `status`: Claude tells teammates in one line what it is working on.
- `team`: lists teammates' open Claude Codes with their repo, branch, last commit, current status and changed files, and flags any file you have both changed.
- `send`: puts a message, and any files Claude attaches (up to 10, each up to 25 MB, 50 MB in all), straight into a teammate's open Claude Code, and their answer comes back the same way. The teammate is also told in Zoye (the bell, plus WhatsApp, Slack or email by their own notification settings), so a share is never missed. If their Claude Code is not open, the message and files go to them in Zoye instead. Shared files are kept privately in your Zoye organization; the receiving Claude gets text files in full and a download link that works for 24 hours, and saves a file only where its user wants it (this plugin itself writes no files).

A message from a teammate is shown to Claude as a colleague's message, not as yours, and your own Claude Code permissions still apply to anything it does.

## What it sends, receives and stores

- It talks only to Zoye's API at https://api.zoye.io, over HTTPS: the channel with your token, and the zoye-data connector with the sign-in you approve. No other destination.
- It sends: the answers and short progress notes Claude writes back to you; files Claude chooses to attach to an answer (up to 10, each up to 25 MB, 50 MB in all); the repository name and branch of the folder Claude worked in, read with git without changing anything, so Zoye can tell you where the work is; the permission questions Claude Code would ask you (tool name, description and a short preview of the input), so you can answer them from Zoye; this machine's host name, the project folder name and path, and the Claude Code process id, so Zoye can tell your open sessions apart; and whether this Claude Code was started with the Zoye channel (read from the command line of the Claude Code process, without changing anything), so Zoye sends work only to a session that can receive it. With team sync on, also: the status line Claude sets, and the repository, branch, last commit and changed file names of the folder it works in (read with git), shown only to teammates in your Zoye organization who turned team sync on; and the messages and files Claude sends them.
- It receives: the requests you send from Zoye, your answers to those permission questions, and with team sync on, your teammates' messages and the files they share (their text, and a 24 hour download link).
- It stores your token in `~/.claude/channels/zoye/.env`, readable only by you. A `ZOYE_TOKEN` environment variable, when set, is used instead.
- It reads `~/.claude/settings.json` only to check whether Zoye's own reply, progress and name tools are allowed. It never changes your settings. If they are not allowed, `/zoye:connect` asks whether you want them added, so answers are not blocked in auto mode, and adds them only if you say yes.

To disconnect, choose Disconnect in Zoye or delete the token file.

## Support

hello@zoye.io · Privacy policy: https://www.zoye.io/privacy
