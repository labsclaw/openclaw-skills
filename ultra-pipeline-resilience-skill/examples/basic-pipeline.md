# Example: Basic Pipeline Resilience Usage

## Scenario
A user asks the agent to run a 5-step data processing pipeline that takes ~15 minutes total.

## Agent Behavior

### Step 1: Detection
Agent detects multi-step, long-running task and activates pipeline-resilience:
```
This is a 5-step pipeline (~15 min estimated). Activating pipeline resilience protocol.
```

### Step 2: Initialize State File
Agent creates `memory/pipelines/<pipeline-id>.json`:
```json
{
  "pipeline_id": "data-processing-abc123",
  "status": "running",
  "current_step": 1,
  "total_steps": 5,
  "steps": [
    {"name": "fetch", "status": "done", "started_at": "...", "completed_at": "..."},
    {"name": "validate", "status": "running", "started_at": "..."},
    {"name": "transform", "status": "pending"},
    {"name": "load", "status": "pending"},
    {"name": "notify", "status": "pending"}
  ],
  "handoff": null,
  "retries": 0,
  "max_retries": 3
}
```

### Step 3: Execute with Handoff
After each step, write a compressed handoff:
```json
{
  "next_step": "transform",
  "context": "247 records fetched, 243 valid. 4 dropped (null IDs). Transform: apply map_to_schema().",
  "artifacts": ["output/validated_243.json"],
  "config": {"schema": "v2.1", "batch_size": 50}
}
```

### Step 4: Recovery (if crash)
If session crashes, new session reads state file and resumes:
```
Resuming pipeline data-processing-abc123.
Last completed: validate (243 records).
Next step: transform.
Applying context from handoff...
```

### Step 5: Completion
```json
{
  "status": "completed",
  "completed_at": "...",
  "result": "5/5 steps completed. 243 records processed."
}
```
