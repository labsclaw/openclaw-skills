# Pipeline Resilience Skill

**Version:** 1.3 | **Date:** 2026-07-03
**Authors:** Robin (Bando) + dr. Roger + Claude Sonnet 5 + Gemini PRO + Justus

---

## When to Use

**ACTIVATE** when: >2 steps, >5min, sub-agents/external deps, or keywords (implementar/orquestrar/pipeline/modules/arquitetura). Manual: `/resilience` or `@pipeline`.

**Don't** for simple questions, 1-step tasks.

---

## Core Rules

1. **1 goal per session** (OpenClaw limit). Progress goes in state file, not goal status.
2. **Atomic state writes always**: `.tmp → remove old → rename`. Only step executor writes.
3. **Sub-agents** via `sessions_yield` — **never** poll loop. Leaf agents lack SOUL.md (maxSpawnDepth=1).
4. **Handoff ≤ 500 tokens**: summary, files, decisions, next instructions. No raw output.
5. **Step timeout** = provider_timeout × 0.7. Exceeded → decompose into sub-steps.
6. **Zombie detection**: running > timeout × 1.5 → retry (max 3x) or alert.

---

## Setup

```bash
mkdir -p memory/pipelines memory/rules
```

Minimal install: only `memory/rules/rules-default.md`. Works without specific rules.

```bash
cat > memory/rules/rules-default.md << 'EOF'
# Regras Padrão
## Código
- Seguir padrão dos módulos existentes; tipar dados públicos; funções com assinatura clara; comentários só quando lógica não é óbvia
## Testes
- Todo módulo deve ter testes no framework do projeto; cobrir caso feliz, edge cases, erros esperados
## Segurança
- Não exfiltrar dados privados; não commitar chaves/tokens; preferir trash/backup sobre delete permanente
EOF
```

---

## Atomic Write (Windows-safe)

```python
def atomic_save(path: str, data: dict):
    tmp = path + ".tmp"
    with open(tmp, "w") as f:
        json.dump(data, f, indent=2)
    if os.path.exists(path):
        os.remove(path)
    os.rename(tmp, path)
```

On Windows `os.rename` fails if destination exists. `os.remove` + `os.rename` is the cross-platform solution.

---

## Rules Selection (attachAs)

```python
def select_rules(step_type: str) -> str:
    rules_map = {
        "quantitative": "memory/rules/rules-quantmind.md",
        "health": "memory/rules/rules-health-squad.md",
        "pipeline": "memory/rules/rules-pipeline.md",
        "default": "memory/rules/rules-default.md",
    }
    path = rules_map.get(step_type, rules_map["default"])
    return path if os.path.exists(path) else rules_map["default"]
```

---

## Pipeline Init

```python
def pipeline_init(user_request: str, steps: list) -> str:
    pipeline_id = generate_id(user_request)
    state = {
        "id": pipeline_id,
        "name": user_request[:100],
        "startedAt": now_iso(),
        "goalId": "<goal-id>",
        "status": "running",
        "steps": [
            {"name": s["name"], "status": "pending", "file": s.get("file"),
             "testFile": s.get("testFile"), "subAgent": None, "handoff": None,
             "retries": 0, "maxRetries": 3, "startedAt": None,
             "completedAt": None, "error": None}
            for s in steps
        ],
        "lastCheck": now_iso(),
        "alerts": 0
    }
    atomic_save(f"memory/pipelines/{pipeline_id}.json", state)
    return pipeline_id
```

Planner must output valid JSON only, no markdown. Schema:
```json
{
    "id": "pipeline-<unique-id>",
    "global_goal": "Single sentence describing final product",
    "steps": [{"name": "Step 1", "status": "pending", "handoff": null}]
}
```

---

## Execute Step

```python
def execute_step(pipeline_id: str):
    state = read(f"memory/pipelines/{pipeline_id}.json")
    next_step = next((s for s in state["steps"] if s["status"] == "pending"), None)
    if not next_step:
        update_goal(status="complete"); return

    next_step.update(status="running", startedAt=now_iso())
    atomic_save(f"memory/pipelines/{pipeline_id}.json", state)

    prev_handoff = get_previous_handoff(state, next_step["name"])
    task = f"""TAREFA: Implementar {next_step['name']}
    {prev_handoff or 'Primeiro step da pipeline.'}
    Quando terminar: rodar testes, gerar handoff_payload, atualizar state file."""

    rules_file = select_rules(next_step.get("type", "default"))
    sessions_spawn(task=task, runtime="subagent", mode="run",
        attachments=[{"name": os.path.basename(rules_file), "content": read(rules_file)}])
    sessions_yield(message=f"Aguardando {next_step['name']}...")
```

---

## Pipeline Transition

```python
def pipeline_transition(pipeline_id: str, step_name: str, handoff_payload: dict):
    state = read(f"memory/pipelines/{pipeline_id}.json")
    for step in state["steps"]:
        if step["name"] == step_name:
            step.update(status="completed", handoff=handoff_payload, completedAt=now_iso())
            break
    atomic_save(f"memory/pipelines/{pipeline_id}.json", state)
    if [s for s in state["steps"] if s["status"] == "pending"]:
        execute_step(pipeline_id)
    else:
        update_goal(status="complete"); cleanup(pipeline_id)
```

---

## Zombie Monitor (Cron)

```python
def monitor_pipelines():
    for f in list_files("memory/pipelines/"):
        state = read(f"memory/pipelines/{f}")
        for step in state["steps"]:
            if step["status"] != "running": continue
            sa = step.get("subAgent")
            if not sa or not sa.get("startedAt"): continue
            elapsed = now() - parse(sa["startedAt"])
            if elapsed > sa.get("timeout", 300) * 1.5:
                step["retries"] += 1
                if step["retries"] <= step.get("maxRetries", 3):
                    step.update(status="pending", subAgent=None)
                    alert(f"Retry {step['name']} (#{step['retries']})")
                else:
                    alert(f"{step['name']} failed after {step.get('maxRetries', 3)} retries")
                    state["status"] = failed
        atomic_save(f"memory/pipelines/{f}", state)
```

---

## Recovery (Hydration)

```python
def hydrate_pipeline(pipeline_id: str):
    state = read(f"memory/pipelines/{pipeline_id}.json")
    last_done = next((s for s in state["steps"] if s["status"] == "completed"), None)
    next_todo = next((s for s in state["steps"] if s["status"] == "pending"), None)
    if not next_todo: return

    h = last_done["handoff"] if last_done and last_done.get("handoff") else {}
    recovery_prompt = f"""
=== RETOMADA DE PIPELINE ===
Pipeline: {state['id']}  |  Goal: {state.get('name', 'Unknown')}
Concluídos: {h.get('summary', 'Nenhum')}
Tarefa IMEDIATA: Step - {next_todo['name']}
{h.get('nextSteps', 'Iniciar work do zero.')}
=== FIM RETOMADA ==="""

    rules_file = select_rules(next_todo.get("type", "default"))
    sessions_spawn(task=recovery_prompt, runtime="subagent", mode="run",
        attachments=[{"name": os.path.basename(rules_file), "content": read(rules_file)}])
    sessions_yield(message=f"Retomando {next_todo['name']}...")
```

---

## Timeouts

| Context | Timeout | Retry | Action |
|---------|---------|-------|--------|
| Sub-agent execution | provider × 0.7 | 3x | Re-spawn |
| Cron monitor | 10 min | 1x | Alert |
| Main session yield | provider × 1.5 | 0 | Cron detects |

## Handoff Payload

```json
{
    "summary": "max 200 tokens",
    "outputPath": "path/to/output",
    "nextSteps": "max 100 tokens",
    "context": "max 200 tokens",
    "tokenCount": 450
}
```
Rule: if next step doesn't need the data, don't include it.

## State File Schema

```json
{
    "id": "pipeline-<id>",
    "name": "Description",
    "startedAt": "ISO-8601",
    "goalId": "<id>",
    "status": "running|completed|failed",
    "steps": [{
        "name": "step-name",
        "status": "pending|running|completed|failed",
        "type": "quantitative|health|pipeline|default",
        "file": "path/to/output.py",
        "testFile": "path/to/test.py",
        "subAgent": {"sessionKey": "<key>", "runId": "<id>", "startedAt": "ISO-8601", "timeout": 300},
        "handoff": {"summary": "max 200 tokens", "outputPath": "path", "nextSteps": "max 100 tokens", "context": "max 200 tokens", "tokenCount": 450},
        "retries": 0,
        "maxRetries": 3
    }],
    "lastCheck": "ISO-8601",
    "alerts": 0
}
```

## Model Tiering

| Role | Tier | Why |
|------|------|-----|
| Planner | 2/3 | JSON output only |
| Cron monitor | 2/3 | Reads JSON, detects zombies |
| Recovery prompt | 2/3 | Simple concatenation |
| Step execution | 1 | Complex reasoning |

## Anti-Patterns

- **Poll loops** → use `sessions_yield` or cron detection
- **Raw output in handoff** → summarize to ≤ 500 tokens
- **Multiple goals per session** → 1 goal only; state file tracks progress
- **Skipping atomic writes** → always `.tmp → remove → rename`
- **Retrying without caps** → max 3 retries, then fail permanently
- **Skipping zombie detection** → cron monitor catches stuck steps automatically

## Verification Checklist

- [ ] `memory/pipelines/` and `memory/rules/rules-default.md` exist
- [ ] Planner produces valid JSON matching schema
- [ ] State file created atomically
- [ ] Sub-agent receives task + rules via attachAs
- [ ] `sessions_yield` used (no poll loops)
- [ ] Handoff payload ≤ 500 tokens
- [ ] Cron detects zombies (> 1.5× timeout)
- [ ] Retry works (max 3x) then fails permanently
- [ ] Hydration works on interrupted pipelines
- [ ] atomic_save works on Windows and Linux
- [ ] Cleanup runs after pipeline completes
