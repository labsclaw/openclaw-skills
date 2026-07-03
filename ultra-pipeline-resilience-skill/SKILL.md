# Pipeline Resilience Skill

**Versão:** 1.1 (Portável — sem dependências hardcoded)  
**Data:** 2026-07-02  
**Autores:** Robin (Bando) + dr. Roger + Claude Sonnet 5 + Gemini PRO

---

## Setup (Nova Instalação)

Antes de usar, criar a estrutura:

```bash
# Criar diretórios necessários
mkdir -p memory/pipelines
mkdir -p memory/rules

# Criar rule base (escopo mínimo para sub-agents)
cat > memory/rules/rules-default.md << 'EOF'
# Regras Padrão

## Código
- Seguir padrão dos módulos existentes
- Dataclasses para resultados
- Type hints em funções públicas
- Docstrings no formato Google

## Testes
- Todo módulo deve ter testes em tests/
- pytest como framework
- Mínimo: 10 testes por módulo
EOF
```

A skill funciona sem rules específicas — o `rules-default.md` é o mínimo necessário.

---

## Quando Usar

ATIVAR esta skill quando:
- Tarefa tem **> 2 passos**
- Estimativa **> 5 minutos**
- Envolve **sub-agents** ou **dependências externas**
- Palavras-chave: implementar, orquestrar, pipeline, módulos, arquitetura
- Comando manual: `/resilience` ou `@pipeline`

NÃO ativar para:
- Perguntas simples ("Como calculo X?")
- Tarefas de 1 step
- Consultas rápidas

---

## Regras Fundamentais

### 1. Goals
- **1 goal apenas por sessão** (limitação nativa do OpenClaw)
- Goal = guarda-chuva (objetivo geral)
- Progresso dos steps → state file, NÃO goal status
- Goal só aceita `complete` / `blocked`

### 2. State Files
- Localização: `memory/pipelines/<id>.json`
- Escrita: **sempre atômica** (.tmp → remove old → rename)
- Quem escreve: apenas o step executor
- Quem lê: cron monitor, heartbeat, sessão de retomada

### 3. Sub-agents
- Leaf sub-agents NÃO recebem SOUL.md (bug #24852)
- Usar **attachAs** com rules escopadas para sub-agents
- Leaf sub-agents NÃO têm session tools (maxSpawnDepth=1)
- `sessions_yield` para aguardar completion (NUNCA poll loop)

### 4. Handoff
- Output comprimido: máx 500 tokens por step
- Nunca salvar output bruto — apenas resumo
- Handoff contém: resumo, arquivos, decisões, instruções next

### 5. Dimensionamento
- Tempo máximo por step = provider_timeout × 0.7
- Se step excede → decompor em sub-steps menores

### 6. Monitoramento
- Cron: 10 min interval
- Zumbi: running há > timeout × 1.5 → marcar failed
- Retry: máx 3 tentativas
- Após 3 falhas: alertar

---

## Fluxo Completo

### FASE 1: Detecção de Trigger

```
Usuário faz requisição
       │
       ▼
┌──────────────────────┐
│ Verificar trigger     │
│ • Heurística intenção │
│ • /resilience manual  │
└──────────┬───────────┘
           │
    ┌──────┴──────┐
    │ Trigger OK? │
    └──────┬──────┘
     SIM   │   NÃO
    ┌──────┴──────────┐
    │ pipeline_init   │ │ Resposta
    │ (criar state)   │ │ normal
    └─────────────────┘
```

**Heurística de intenção:**
- Verbos: implementar, orquestrar, pipeline, módulos, arquitura
- Múltiplos escopos: "A + B + C" (plural)
- Estimativa > 5 min

### FASE 2: Planejamento (Modelo Rápido)

A requisição vai pro **Planejador** (Tier 2/3) antes do executor.

**System Prompt do Planejador:**
```
Você é o Planejador Chefe de um sistema de agentes autônomos.
Sua única função é receber uma solicitação complexa e dividi-la em um plano sequencial (Pipeline).

REGRAS DE QUEBRA:
1. 'global_goal': Frase única descrevendo o produto final. SEM detalhes de implementação.
2. 'steps': Módulos atômicos. Se complexo, dividir em dois. Limite de tempo por step é estrito.
3. Status inicial de todos os steps: "pending".

SAÍDA: APENAS JSON válido seguindo o schema de pipeline. Sem markdown, sem explicações.
```

**Schema de saída do Planejador:**
```json
{
    "id": "pipeline-<unique-id>",
    "global_goal": "Descrição do produto final",
    "status": "running",
    "steps": [
        {"name": "Step 1", "status": "pending", "handoff": null},
        {"name": "Step 2", "status": "pending", "handoff": null}
    ]
}
```

### FASE 3: Inicialização (pipeline_init)

```python
def pipeline_init(user_request: str, steps: list) -> str:
    """Gera state file inicial atomicamente."""
    pipeline_id = generate_id(user_request)
    
    state = {
        "id": pipeline_id,
        "name": user_request[:100],
        "startedAt": now_iso(),
        "goalId": "<id-do-goal>",
        "status": "running",
        "steps": [
            {
                "name": step["name"],
                "status": "pending",
                "file": step.get("file"),
                "testFile": step.get("testFile"),
                "subAgent": None,
                "handoff": None,
                "retries": 0,
                "maxRetries": 3,
                "startedAt": None,
                "completedAt": None,
                "error": None
            }
            for step in steps
        ],
        "lastCheck": now_iso(),
        "alerts": 0
    }
    
    # Escrita atômica (Windows-safe)
    atomic_save(f"memory/pipelines/{pipeline_id}.json", state)
    
    return pipeline_id
```

### FASE 4: Execução por Step

```python
def execute_step(pipeline_id: str):
    """Executa o próximo step pending."""
    state = read(f"memory/pipelines/{pipeline_id}.json")
    
    # Encontrar próximo pending
    next_step = None
    for step in state["steps"]:
        if step["status"] == "pending":
            next_step = step
            break
    
    if not next_step:
        update_goal(status="complete")
        return
    
    # Marcar como running
    next_step["status"] = "running"
    next_step["startedAt"] = now_iso()
    atomic_save(f"memory/pipelines/{pipeline_id}.json", state)
    
    # Montar handoff do step anterior
    prev_handoff = get_previous_handoff(state, next_step["name"])
    
    # Montar task do sub-agent
    task = f"""
    TAREFA: Implementar {next_step['name']}
    
    {prev_handoff if prev_handoff else 'Primeiro step da pipeline.'}
    
    Quando terminar:
    1. Rodar testes relevantes
    2. Gerar handoff_payload com: resumo, arquivo, decisões, próximas instruções
    3. Atualizar memory/pipelines/{pipeline_id}.json marcando "{next_step['name']}" como "completed"
    """
    
    # Determinar rules para attachAs
    rules_file = select_rules(next_step.get("type", "default"))
    
    # Spawn sub-agent
    sessions_spawn(
        task=task,
        taskName=next_step["name"].replace(".py", "").replace(" ", "-").lower(),
        runtime="subagent",
        mode="run",
        attachments=[{"name": os.path.basename(rules_file), "content": read(rules_file)}]
    )
    
    # Aguardar completion (SEM poll loop)
    sessions_yield(message=f"Aguardando {next_step['name']}...")
```

### FASE 5: Pipeline Transition

```python
def pipeline_transition(pipeline_id: str, step_name: str, handoff_payload: dict):
    """Passagem de bastão após step completo."""
    state = read(f"memory/pipelines/{pipeline_id}.json")
    
    for step in state["steps"]:
        if step["name"] == step_name:
            step["status"] = "completed"
            step["handoff"] = handoff_payload
            step["completedAt"] = now_iso()
            break
    
    # Escrita atômica
    atomic_save(f"memory/pipelines/{pipeline_id}.json", state)
    
    # Verificar se há mais steps
    pending = [s for s in state["steps"] if s["status"] == "pending"]
    if pending:
        execute_step(pipeline_id)
    else:
        update_goal(status="complete")
        cleanup(pipeline_id)
```

### FASE 6: Monitoramento (Cron)

```python
def monitor_pipelines():
    """Detecta zumbis e retries."""
    for state_file in list_files("memory/pipelines/"):
        if not state_file.endswith(".json"):
            continue
        
        state = read(f"memory/pipelines/{state_file}")
        
        for step in state["steps"]:
            if step["status"] == "running":
                sub_agent = step.get("subAgent")
                if not sub_agent or not sub_agent.get("startedAt"):
                    continue
                
                elapsed = now() - parse(sub_agent["startedAt"])
                timeout = sub_agent.get("timeout", 300) * 1.5
                
                if elapsed > timeout:
                    step["status"] = "failed"
                    step["error"] = f"Timeout: {elapsed}s"
                    step["retries"] += 1
                    
                    if step["retries"] <= step.get("maxRetries", 3):
                        step["status"] = "pending"
                        step["subAgent"] = None
                        alert(f"Retry {step['name']} (tentativa {step['retries']})")
                    else:
                        alert(f"{step['name']} falhou após {step.get('maxRetries', 3)} tentativas")
                        state["status"] = "failed"
        
        atomic_save(f"memory/pipelines/{state_file}", state)
```

### FASE 7: Retomada (Hydration)

```python
def hydrate_pipeline(pipeline_id: str):
    """Retoma pipeline interrompida."""
    state = read(f"memory/pipelines/{pipeline_id}.json")
    
    # Identificar último completed + próximo pending
    last_completed = None
    next_pending = None
    
    for step in state["steps"]:
        if step["status"] == "completed":
            last_completed = step
        elif step["status"] == "pending" and next_pending is None:
            next_pending = step
    
    if not next_pending:
        return
    
    # Montar prompt de reanimação (~400-500 tokens)
    completed_text = ""
    if last_completed and last_completed.get("handoff"):
        completed_text = f"1. {last_completed['handoff']['summary']}"
    
    handoff_next = ""
    if last_completed and last_completed.get("handoff"):
        handoff_next = last_completed["handoff"].get("nextSteps", "")
    
    recovery_prompt = f"""
=== RETOMADA DE PIPELINE ===
Pipeline: {state['id']}
Global Goal: {state.get('name', 'Unknown')}

Passos concluídos:
{completed_text or 'Nenhum'}

Sua tarefa IMEDIATA: Executar Step - {next_pending['name']}

{handoff_next or 'Iniciar work do zero.'}

=== FIM RETOMADA ===
    """
    
    rules_file = select_rules(next_pending.get("type", "default"))
    
    sessions_spawn(
        task=recovery_prompt,
        taskName=next_pending["name"].replace(".py", "").replace(" ", "-").lower(),
        runtime="subagent",
        mode="run",
        attachments=[{"name": os.path.basename(rules_file), "content": read(rules_file)}]
    )
    
    sessions_yield(message=f"Retomando {next_pending['name']}...")
```

---

## Escrita Atômica (Windows-safe)

```python
def atomic_save(path: str, data: dict):
    """
    Escrita atômica: .tmp → remove old → rename.
    Funciona em Windows e Linux.
    """
    tmp = path + ".tmp"
    with open(tmp, "w") as f:
        json.dump(data, f, indent=2)
    if os.path.exists(path):
        os.remove(path)
    os.rename(tmp, path)
```

**Por que remove antes:** No Windows, `os.rename` falha se o destino já existe. `os.remove` + `os.rename` é a solução cross-platform.

---

## Seleção de Rules (attachAs)

A skill não depende de rules específicas. O mínimo é `rules-default.md`.

```python
def select_rules(step_type: str) -> str:
    """Seleciona rules escopadas para o step."""
    rules_map = {
        "quantitative": "memory/rules/rules-quantmind.md",
        "health": "memory/rules/rules-health-squad.md",
        "pipeline": "memory/rules/rules-pipeline.md",
        "default": "memory/rules/rules-default.md",
    }
    
    path = rules_map.get(step_type, rules_map["default"])
    
    if os.path.exists(path):
        return path
    
    return rules_map["default"]  # Fallback sempre existe
```

**Para nova instalação:** Criar apenas `memory/rules/rules-default.md`. A skill funciona sem rules específicas — o default cobre os casos gerais.

---

## Tiering de Modelos (Genérico)

A skill não depende de modelos específicos. Referência genérica:

| Função | Tier | Justificativa |
|--------|------|---------------|
| Planejador | Tier 2/3 (rápido, barato) | Só gera JSON, não precisa de raciocínio |
| Cron monitor | Tier 2/3 | Só lê JSON, detecta zumbis |
| Recovery prompt | Tier 2/3 | Concatenação simples |
| Execução do step | Tier 1 (forte) | Raciocínio complexo |

**No openclaw.json, mapear:**
- Tier 2/3 → modelo mais rápido/disponível
- Tier 1 → modelo com melhor raciocínio

---

## State File Schema

```json
{
    "id": "pipeline-<unique-id>",
    "name": "Descrição",
    "version": "1.0",
    "startedAt": "ISO-8601",
    "goalId": "<id>",
    "status": "running|completed|failed",
    "steps": [
        {
            "name": "step-name",
            "status": "pending|running|completed|failed",
            "type": "quantitative|health|pipeline|default",
            "file": "path/to/output.py",
            "testFile": "path/to/test.py",
            "subAgent": {
                "sessionKey": "<key>",
                "runId": "<id>",
                "startedAt": "ISO-8601",
                "timeout": 300
            },
            "handoff": {
                "summary": "max 200 tokens",
                "outputPath": "path/to/output",
                "nextSteps": "max 100 tokens",
                "context": "max 200 tokens",
                "tokenCount": 450
            },
            "retries": 0,
            "maxRetries": 3,
            "startedAt": "ISO-8601",
            "completedAt": "ISO-8601",
            "error": null
        }
    ],
    "lastCheck": "ISO-8601",
    "alerts": 0
}
```

---

## Handoff Payload Schema

```json
{
    "summary": "O que foi feito (1-2 frases)",
    "outputPath": "path/to/arquivo.py",
    "nextSteps": "O que o próximo deve fazer",
    "context": "Dados essenciais para continuidade",
    "tokenCount": 0
}
```

**Regra:** Se o próximo step não precisa do dado, NÃO salve no handoff.

---

## Recovery Boot Prompt

```
Você é um agente retomando pipeline interrompida.

Objetivo Global: {global_goal}

Passos concluídos:
{concat dos handoff_payloads dos completed}

Sua tarefa IMEDIATA: Executar Step - {step_name}

{handoff.nextSteps}

Inicie trabalho a partir das informações acima.
```

**Total:** ~400-500 tokens. Nunca histórico completo.

---

## Timeouts

| Contexto | Timeout | Retry | Ação |
|----------|---------|-------|------|
| Sub-agent (execução) | provider × 0.7 | 3x | Re-spawn |
| Cron monitor check | 10 min | 1x | Alertar |
| Sessão principal (yield) | provider × 1.5 | 0 | Cron detecta |

---

## Checklist de Validação

- [ ] `memory/pipelines/` existe
- [ ] `memory/rules/rules-default.md` existe
- [ ] Trigger detecta tarefa complexa
- [ ] Planejador gera JSON válido
- [ ] State file criado atomicamente
- [ ] Sub-agent recebe task + rules via attachAs
- [ ] sessions_yield aguarda completion
- [ ] Handoff payload < 500 tokens
- [ ] Cron detecta zumbis
- [ ] Retry funciona (max 3x)
- [ ] Retomada funciona
- [ ] Cleanup automático
- [ ] Funciona em Windows (atomic_save)
- [ ] Funciona em Linux (atomic_save)
