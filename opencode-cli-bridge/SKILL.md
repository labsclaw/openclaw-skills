---
name: opencode-cli-bridge
description: "Delegate engineering work to the OpenCode CLI instead of calling a Zen model API key directly. Use when a task needs heavy multi-file work, an OpenCode agent such as the Sisyphus ultraworker, session resume, or when a direct model call fails with a 403 FreeTierError."
license: Apache-2.0
metadata:
  {
    "openclaw":
      {
        "emoji": "🌉",
      },
  }
---

# OpenCode CLI Bridge

Run engineering tasks through an installed `opencode` CLI process instead of calling a
model endpoint with a bearer key. The CLI carries its own authentication, so this route
works where a direct API call returns a free-tier rejection.

## When to use

- The task spans several files, needs an agent loop, or benefits from tool use.
- You want the OpenCode agent roster, not a single model.
- A direct model call fails with `403 FreeTierError` ("free tier can only be used from
  within OpenCode").
- You need to resume a previous OpenCode session instead of restarting context.

## When to skip

- Single-question answers with no artifact.
- Work that only reads local files and reports text.

## Contract

The bridge spawns one headless CLI process, streams JSONL events to stdout, and exits
when the agent finishes or the timeout fires. It never opens the embedded web UI.

```text
node scripts/opencode-bridge.mjs --prompt "<task>" [--cwd <dir>] [--agent <name>]
                                 [--model <id>] [--session <id>] [--timeoutSec <n>]
```

Output events, one JSON object per line:

```text
{"type":"text","text":"<chunk>","sessionId":"ses_..."}
{"type":"usage","tokens":{...},"cost":<number>}
{"type":"stderr","chunk":"<raw stderr>"}
{"type":"error","error":"<message>"}
{"type":"done","exitCode":0,"agentUsed":"Sisyphus - ultraworker","hasReasoning":true,"textLen":412}
```

## Rules

1. Resolve the executable first. Prefer the real `opencode.exe` inside the npm global
   install; a bare `opencode` from PATH is a `.cmd` shim on Windows and fails to spawn
   without a shell.
2. Ask for the orchestrator. When `--agent` is omitted, probe `opencode agent list` and
   prefer the Sisyphus ultraworker. Fall back to `build` when no orchestrator exists.
3. Force headless mode with an explicit environment block. Disable the embedded web UI,
   sharing, and auto-update so the process never blocks on a browser or a prompt.
4. Set a home directory. On Windows, inherit `HOME` from `USERPROFILE` when unset, or the
   CLI cannot find its credential store.
5. Feed the prompt on stdin when it is not passed as an argument. Keep stdin open only
   while the child runs, otherwise the process never sees EOF and hangs.
6. Always bound the run. Kill the whole process tree on timeout, not just the parent.
7. Preserve the session id returned in `text` events so the next call can pass
   `--session <id>` and continue with existing context.
8. Report `exitCode` and `agentUsed` from the `done` event. A zero exit code with an
   empty text payload means the agent produced nothing, which is a failed run.

## Failure handling

- Non-zero exit with no `text` event: read the `stderr` chunks, they carry the real cause.
- `ENOENT` on spawn: the executable resolution failed, rerun with an absolute path.
- Empty `done` payload with exit code 0: the prompt likely never reached stdin.
