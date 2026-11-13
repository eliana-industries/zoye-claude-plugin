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
4. Optional: `/zoye:name pricing` names this session, so you can tell Zoye "send this to the pricing session". New sessions started in the same folder get the name too.

## Your Zoye data in Claude Code

The plugin also adds Zoye's own connector (`zoye-data`, https://api.zoye.io/mcp), the same one claude.ai uses, so Claude here can look up and update your contacts, deals, tasks, meetings and reports. It stays off until you sign in: run `/mcp`, choose zoye-data, and approve on Zoye's own consent screen, where you pick which workspaces it may reach. It acts with your own permissions, and anything that deletes, sends or spends asks you first. If you already added the Zoye connector on claude.ai, you can skip this.

## Team sync (optional)

Off unless you turn it on, each person for themselves: in Zoye, open Connectors > Claude > Manage Claude via Zoye > Your own Claude Code and switch Team sync on (or ask your Zoye assistant to turn it on). Your open Claude Code picks it up within a minute, with no restart. Then the Claude Codes of everyone in your Zoye organization who also turned it on can see each other and talk directly, so nobody has to copy messages between them:

- `status`: Claude tells teammates in one line what it is working on. If a teammate said something similar in the last 24 hours (the same line in other words, the same branch, or a file you both changed), Claude tells you before going on, and that teammate gets one message in their Claude Code and a notice in Zoye, so two people do not build the same thing.
- No tool call needed (1.18): the same check runs automatically on what you ask Claude. The plugin sends the first 200 characters of each real request (not slash commands or very short replies) to Zoye in the background, with no waiting. If it reads like something a teammate asked or said in the last 24 hours, your Claude gets one note naming them and that teammate gets one message and a notice in Zoye. Nothing happens when there is no match. Between the same two people this runs at most once every 30 minutes.
- `team`: lists teammates' open Claude Codes with their repo, branch, last commit, current status and changed files, and flags any file you have both changed.
- `send`: puts a message, and any files Claude attaches (up to 10, each up to 25 MB, 50 MB in all), straight into a teammate's open Claude Code, and their answer comes back the same way. The teammate is also told in Zoye (the bell, plus email or Slack by their own notification settings; WhatsApp only when their Claude Code is not open, and only inside their free 24-hour WhatsApp window), so a share is never missed. If their Claude Code is not open, the message and files go to them in Zoye instead. Shared files are kept privately in your Zoye organization; the receiving Claude gets text files in full and a download link that works for 24 hours, and saves a file only where its user wants it (this plugin never writes a shared file to disk).

Every Claude Code session receives teammates' messages, the VS Code panel included, with no launch flag: when a session was not started with the Zoye channel, the message goes into that session's own inbox for messages from other sessions (Claude Code's cross-session messaging). Sent to a person by name, a message goes to their session named `team` when one is open, so it never lands inside a task; otherwise to the session they used most recently, whose context is still warm, so it costs the fewest tokens. To get one, open Claude Code in a folder of its own, run `/zoye:name team` there and keep that session for team traffic. A few messages per 10 minutes between two people reach Claude; more are refused, so two Claudes can never keep each other busy.

Day to day, Claude handles the handoffs: at the start of a session it checks who is online and tells you about any overlap, and it messages a teammate only when the work needs it (an overlap or a change to something they are working on, a question only they can answer, work they are waiting for, or a task you hand them, sent with everything they need to start). It never sends chat or thanks, and never waits for an answer: it goes on with what does not depend on it.

A message from a teammate is shown to Claude as a colleague's message, not as yours, and your own Claude Code permissions still apply to anything it does.

## What it sends, receives and stores

- It talks only to Zoye's API at https://api.zoye.io, over HTTPS: the channel with your token, and the zoye-data connector with the sign-in you approve. No other destination.
- It sends: the answers and short progress notes Claude writes back to you; files Claude chooses to attach to an answer (up to 10, each up to 25 MB, 50 MB in all); the repository name and branch of the folder Claude worked in, read with git without changing anything, so Zoye can tell you where the work is; the permission questions Claude Code would ask you (tool name, description and a short preview of the input), so you can answer them from Zoye; this machine's host name, the project folder name and path, and the Claude Code process id, so Zoye can tell your open sessions apart; and whether this Claude Code was started with the Zoye channel (read from the command line of the Claude Code process, without changing anything), so Zoye sends work only to a session that can receive it. Whether the line `ZOYE_TEAM=1` is set (how team sync was turned on before version 1.14), so Zoye can keep that choice once. With team sync on, also: the status line Claude sets, and the repository, branch, last commit and changed file names of the folder it works in (read with git), shown only to teammates in your Zoye organization who turned team sync on; and the messages and files Claude sends them. Also with team sync on: the first 200 characters of each real request you type, kept by Zoye for 24 hours to compare with teammates' work, and shown to a teammate only inside a similar-work notice. With team sync off, no request text is kept or sent.
- It receives: the requests you send from Zoye, your answers to those permission questions, and with team sync on, your teammates' messages and the files they share (their text, and a 24 hour download link).
- It stores your token in `~/.claude/channels/zoye/.env`, readable only by you. A `ZOYE_TOKEN` environment variable, when set, is used instead.
- Names you give with `/zoye:name` are kept per folder in `~/.claude/channels/zoye/names.json`, readable only by you, and never sent anywhere but as the session name Zoye shows.
- Its hook (it runs when a Claude Code session starts, when you send a request and after each answer) saves, for that session, the address and token of the session's own inbox and the time of its last answer, in `~/.claude/channels/zoye/sessions/`, readable only by you, and deletes files older than a week. With team sync on it also keeps there the first 200 characters of your latest request, and the plugin keeps a one-character file `~/.claude/channels/zoye/team-sync` that says whether team sync is on. It reads Claude Code's own list of running sessions (`~/.claude/sessions/`) to find the session it runs in. The inbox token never leaves your computer; Zoye only learns whether the session can take messages and when it last answered. With team sync on, the plugin posts a teammate's message into that inbox.
- It reads `~/.claude/settings.json` only to check whether Zoye's own reply, progress and name tools are allowed, and whether Claude Code updates this plugin automatically (it also reads `~/.claude/plugins/known_marketplaces.json` for that). It never changes your settings. If the tools are not allowed, `/zoye:connect` asks whether you want them added, so answers are not blocked in auto mode, and adds them only if you say yes.
- Updates: Claude Code updates plugins from Zoye's marketplace automatically only when you turn that on. `/zoye:connect` asks once whether you want it, and on a yes sets `autoUpdate` for the zoye marketplace in `~/.claude/settings.json`. Otherwise, when a newer version is out, Claude tells you once per session and gives the two commands to update.

To disconnect, choose Disconnect in Zoye or delete the token file.

## Support

hello@zoye.io · Privacy policy: https://www.zoye.io/privacy
