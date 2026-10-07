---
name: connect
description: Connect this Claude Code to Zoye with the token from Zoye (starts with zcc_). Use when the user runs /zoye:connect, pastes a zcc_ token, or asks to connect or check Zoye.
user-invocable: true
allowed-tools:
  - mcp__plugin_zoye_zoye__connect
---

# /zoye:connect

Arguments: $ARGUMENTS

- If the arguments contain a token starting with zcc_, call the zoye connect tool with it and tell the user the result in one line.
- With no token: tell the user to copy it from Zoye: Connectors > Claude > Manage Claude via Zoye > Your own Claude Code, then run /zoye:connect <token>.
- Never print the token back in full.
- After a successful connect, add one line: to let Claude here also work with their Zoye data (contacts, deals, tasks), run /mcp, choose zoye-data and approve on Zoye's screen.
- If the result ends with NOT_YET_ALLOWED: <rules>, ask the user once whether to allow those Zoye tools in their Claude Code settings, explaining that without them Claude Code asks before every answer it sends back to Zoye, and auto mode can block those answers. Only on a clear yes, add exactly those rule names to permissions.allow in ~/.claude/settings.json, keeping everything else in the file and the JSON valid. On a no, change nothing and mention that /permissions can add them later.
