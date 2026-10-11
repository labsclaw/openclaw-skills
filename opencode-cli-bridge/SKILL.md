# opencode-cli-bridge

Delegar tarefas de engenharia para o OpenCode CLI usando oh-my-openagent (Sisyphus/Prometheus/Atlas) ao invés de chamada direta via API key (evita 403 FreeTierError).

## Objetivo
- Priorizar Sisyphus - ultraworker (orquestrador) quando OMO disponível
- Fallback para uild se OMO não resolvido
- Headless, sem abrir UI embarcada
- Suporta session resume via --session

## Uso
Parâmetros: prompt (obrigatório), cwd, agent, timeoutSec, model.

## Implementação
scripts/opencode-bridge.mjs chama opencode run --format json com env headless e parseia eventos JSONL.
