---
name: name
description: Name this Claude Code session for Zoye ("pricing", "website"), so the user can send work to it by that name from Zoye. Use when the user runs /zoye:name.
user-invocable: true
allowed-tools:
  - mcp__plugin_zoye_zoye__name
---

# /zoye:name

Arguments: $ARGUMENTS

Call the zoye name tool with the arguments as the name, then tell the user in one line what Zoye now calls this session.
