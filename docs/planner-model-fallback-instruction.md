# 🛠 Instrução do Módulo Planner — Cadeia de Fallback de Modelos

**Versão:** 1.2 — 2026-07-10
**Autores:** Robin (orquestração) + Luna (v1.0) + Dr. Roger (direção) + Justus (refinamento v1.2)
**Status:** Aprovado para merge no Justus

---

## 1. Arquitetura: Planner → Orquestrador

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ORQUESTRADOR                                 │
│         (Decisor final — conhece estado real do sistema)            │
│                                                                     │
│  Inputs:                                                            │
│  ├─ Sugestão do Planner (ordenação recomendada)                    │
│  ├─ Saúde dos providers (compare-config.ps1 ou health check)       │
│  ├─ TPS real (quem está rápido agora?)                             │
│  ├─ Rate limits e filas                                            │
│  ├─ Tamanho do contexto necessário                                 │
│  └─ Modelos extras não-listados (experimentais, locais)            │
│                                                                     │
│  Output: Modelo escolhido para a tarefa                            │
└─────────────────────────────────────────────────────────────────────┘
          ▲
          │ consulta
          │
┌─────────────────────────────────────────────────────────────────────┐
│                          PLANNER                                    │
│    (Analista de capabilities — pesquisa web sob demanda)            │
│    Função: Sugerir ordenação por potência + TPS                     │
│    NÃO toma decisão final — é um facilitador                        │
└─────────────────────────────────────────────────────────────────────┘
          ▲
          │
┌─────────────────────────────────────────────────────────────────────┐
│                    LISTA DE CANDIDATOS                              │
│    (Modelos disponíveis nos providers configurados)                 │
└─────────────────────────────────────────────────────────────────────┘
```

**Regra Fundamental:** O Planner **NÃO** toma decisão final — ele é um facilitador. Quem decide é o Orquestrador, porque só ele tem acesso ao estado real do sistema.

---

## 2. Papéis e Responsabilidades

### 2.1 Planner — O que faz

- Recebe lista de candidatos + requisitos da tarefa
- Pesquisa web sob demanda pra cada candidato
- Classifica em tiers (S/A/B/C) por potência + TPS
- Retorna JSON ordenado com recomendação
- **NÃO:** decide modelo final, acessa providers, testa latência

### 2.2 Orquestrador — O que faz

- Roda `compare-config.ps1` pra health check (modelos mortos → exclui)
- Recebe sugestão do Planner
- Valida contra estado real: quem tá online? quem tá rápido?
- Decide modelo final pra cada tarefa
- Pode spawnar Opus pra tarefas críticas (critério abaixo)
- **NÃO:** ignora sugestão do Planner sem motivo, usa modelo morto

---

## 3. Fluxo de Trabalho

### 3.1 Gatilho

- Nova tarefa com requisitos específicos
- Cadeia de fallback precisa de reavaliação
- Novo modelo candidato chega (provider adicionou modelo novo)
- Verificação periódica (cron ou heartbeat)

### 3.2 Entrada

```json
{
  "taskRequirements": {
    "toolCalling": true,
    "imageSupport": false,
    "contextWindow": "long (>100k tokens)",
    "speed": "medium",
    "reasoning": "high"
  },
  "candidates": [
    "nvidia/deepseek-ai/deepseek-v4-pro",
    "nvidia/minimaxai/minimax-m3",
    "opencode/big-pickle",
    "groq/meta-llama/mimo-v2.5-free",
    "nvidia/nvidia/nemotron-3-nano-omni-30b-a3b-reasoning"
  ]
}
```

### 3.3 Pesquisa Web (sob demanda)

**Query format:** `"{modelo} {provedor} capabilities tool calling image support context window benchmark 2026"`

**Atributos a extrair (prioridade):**

| Prioridade | Atributo | O que verificar |
|------------|----------|-----------------|
| 🔴 Obrigatório | Tool calling | Suporta function calling? |
| 🔴 Obrigatório | Context window | Tamanho máximo do contexto |
| 🔴 Obrigatório | Coding score | Benchmarks: SWE-Bench, HumanEval, CodeContests |
| 🔴 Obrigatório | Reasoning score | Benchmarks: GPQA Diamond, MATH, HMMT |
| 🟡 Importante | TPS estimado | Tokens por segundo (velocidade de resposta) |
| 🟡 Importante | Suporte imagem | Multimodal: aceita imagem como input? |
| 🟡 Importante | Agentic score | Benchmarks: AgentBench, GAIA, SWE-bench Verified |
| 🟢 Desejável | Suporte vídeo/áudio | Multimodal estendido |
| 🟢 Desejável | Custo | Free, paid, freemium? |

### 3.4 Classificação por Tiers

| Tier | Definição | Critérios | Exemplos |
|------|-----------|-----------|----------|
| **S** | Frontier | Reasoning >80% GPQA, Coding >60% SWE, Context ≥100k | DeepSeek V4 Pro, MiniMax M3, Claude Opus |
| **A** | Fortes | Reasoning 60-80%, Coding 40-60%, Context ≥50k | Big Pickle, MiMo v2.5, Nemotron-3 Ultra |
| **B** | Capazes | Reasoning 40-60%, Coding 20-40%, Context ≥30k | Nemotron-3 Nano, Hy3, GLM-5 |
| **C** | Leves/Rápidos | TPS alto, capabilities básicas, Context <30k | North Mini Code, Ling Flash |

**Critérios de tier (decisão):**
- **Potência primeiro:** Benchmarks de reasoning + coding determinam o tier
- **TPS como desempate:** Dentro do mesmo tier, mais rápido primeiro
- **Tool calling:** Se a tarefa exige e o modelo não suporta → desce 1 tier

### 3.5 Ordenação

```
Potência (S → A → B → C) > TPS (mais rápido primeiro) > Tool calling > Custo
```

### 3.6 Saída (JSON)

```json
{
  "plannerVersion": "1.2",
  "timestamp": "2026-07-10T04:28:00-03:00",
  "taskRequirements": {
    "toolCalling": true,
    "reasoning": "high"
  },
  "suggestedPrimary": "nvidia/deepseek-ai/deepseek-v4-pro",
  "suggestedFallbacks": [
    {
      "model": "nvidia/minimaxai/minimax-m3",
      "tier": "S",
      "note": "Sombra agentica — melhor agentic score do mercado"
    },
    {
      "model": "openrouter/nvidia/nemotron-3-ultra-550b-a55b:free",
      "tier": "S",
      "note": "Reasoning pesado, free, 3 providers"
    },
    {
      "model": "opencode/big-pickle",
      "tier": "A",
      "note": "Coding free, OpenCode quota generosa"
    },
    {
      "model": "groq/meta-llama/mimo-v2.5-free",
      "tier": "A",
      "note": "Agente rápido, free"
    },
    {
      "model": "nvidia/deepseek-ai/deepseek-v4-flash",
      "tier": "A",
      "note": "Flash = otimizado pra velocidade, 95 TPS"
    },
    {
      "model": "nvidia/nvidia/nemotron-3-nano-omni-30b-a3b-reasoning",
      "tier": "B",
      "note": "Fallback leve, reasoning"
    }
  ],
  "premiumOnDemand": [
    {
      "model": "antigravity-proxy/claude-opus-4-6-thinking",
      "note": "Spawn explícito — tarefas que exigem reasoning profundo"
    }
  ],
  "analysis": {
    "totalCandidates": 20,
    "survivingProviders": 4,
    "resilience": "Sobrevive à queda de 3 providers"
  }
}
```

---

## 4. Relação com `plan-routing.ps1` e Skills Existentes

O script PowerShell atual (`plan-routing.ps1`) cobre a **parte de health check + cross-provider mapping**:

| Script / Skill | Função | Quando roda |
|----------------|--------|-------------|
| `compare-config.ps1` | Diagnóstico: modelos mortos, novos, quebrados | Sempre antes de decidir |
| `plan-routing.ps1` | Cross-provider mapping + redundância | Diagnóstico periódico |
| `ultra-models-skill` | Lista modelos free/paid por provider + benchmarks | Consulta sob demanda |
| **Esta instrução** | Capabilities + decisão do Orquestrador | Toda tarefa com requisitos específicos |

**Fluxo integrado:**
1. `compare-config.ps1` → limpa modelos mortos da candidatura
2. `plan-routing.ps1` → mostra redundância cross-provider (referência)
3. `ultra-models-skill` (ou `list-free-models.ps1`) → lista candidatos vivos
4. **Planner (esta instrução)** → pesquisa capabilities dos sobreviventes
5. **Orquestrador** → decide com estado real + sugestão do Planner

---

## 5. Critérios de Decisão do Orquestrador

### 5.1 Health Check (obrigatório antes de decidir)

```
1. Rodar compare-config.ps1
2. Modelos mortos → remover da candidatura
3. Providers com auth quebrada → marcar como indisponível
4. Só considerar modelos dos providers saudáveis
```

### 5.2 Spawn vs Fallback Chain

**Quando spawnar Opus (premiumOnDemand):**
- Tarefa exige reasoning profundo (estimativa >80% GPQA)
- Cota Antigravity disponível
- Tarefa critica: revisão de contrato, debugging complexo, pesquisa pesada

**Quando usar fallback chain:**
- Tarefa rotineira (coding, automação, conteúdo, conteúdo)
- Velocidade importa mais que reasoning máximo
- Cota Antigravity limitada ou indisponível

### 5.3 Regra Simples: Se a tarefa é "decidir ou suficiente pro Justus" → fallback chain. Se "exige Opus" → spawn Opus.

---

## 6. Casos Especiais

### 6.1 Opus via Antigravity

- **Fora da fallback chain** → sob demanda recorrente
- **Spawn explícito** → Orquestrador decide quanto usar
- **Cota limitada** → usar com moderação, priorizar tarefas críticas
- **Agentes OPUs** → configurados com modelo de fallback avaçadas

### 6.2 Pesquisa Sem Cache Recente

- Sem cache → Planner faz `web_search` fresca
- Modelos mudam capabilities com updates → não confiar em dados velhos
- NPM: `npm view opencode-ai versions --json` pra versões do CLI

### 6.3 Falha na Pesquisa

- Capacidades não verificadas → tier B conservador
- Não confiar cegamente → tier cair
- Log: "capabilities não verificadas para {modelo}" no output do Planner

### 6.4 Provider Instável (padrão Antigravity)

- Se provider tem auth quebrada frequentemente → remover da candidatura
- Modelos desse provider ficam disponíveis via API direta (proxy)
- Reintroduzir quando auth estabilizar por >24h

---

## 7. Exemplo Prático

### Cenário: Tarefa de automação com tool calling

**Entrada:**
```json
{
  "taskRequirements": {
    "toolCalling": true,
    "contextWindow": "medium",
    "speed": "fast",
    "reasoning": "medium"
  }
}
```

**Fluxo:**
1. `compare-config.ps1` → OpenRouter com 401, Antigravity auth expirada
2. Providers saudáveis: OpenCode, KiloCode, NVIDIA
3. Planner pesquisa: DeepSeek V4 Pro (tool calling ✓, 1M ctx, 95% GPQA), MiniMax M3 (tool calling ✓, 1M ctx, 72% agentic), Big Pickle (tool calling ✓, coding free), MiMo v2.5 (tool calling ✓, 50 TPS)
4. Planner ordena: V4 Pro (S) > MiniMax M3 (S) > Big Pickle (A) > MiMo v2.5 (A)
5. Orquestrador valida: NVIDIA saudável, V4 Pro respondendo a 45 TPS → **escolhe V4 Pro**
6. Fallback ativo: MiniMax M3 (mesmo provider), Big Pickle (provider diferente)

### 7.2 Resultado

```json
{
  "chosen": "nvidia/deepseek-ai/deepseek-v4-pro",
  "reason": "Melhor scoring pra tarefa (tool calling + reasoning), provider saudável",
  "fallbackActive": ["nvidia/minimaxai/minimax-m3", "opencode/big-pickle"],
  "fallbackActivated": false
}
```

---

## 8. Checklist de Implementação

- [x] Criar skill `planner-model-fallback` que executa a pesquisa web e retorna JSON ordenado
- [ ] Integrar com `ultra-models-skill` pra lista de candidatos vivos
- [ ] Adicionar comando `planner-fallback` no CLI do Justus
- [ ] Documentar no repo do Justus
- [ ] Testar com cenários reais: coding, reasoning, automação, multimodal
- [ ] Definir thresholds de TPS por tier (ex: S ≥ 50 TPS, A ≥ 30 TPS, B ≥ 15 TPS)
- [ ] Adicionar cache de capabilities com TTL 24h (evitar web_search repetido)
- [ ] Criar métrica de "resilience score" por provider (uptime + diversidade de modelos)

---

## 9. Referências

- **Skill:** `skills/ultra-models-skill/scripts/list-free-models.ps1`
- **Script:** `compare-config.ps1`, `plan-routing.ps1`
- **Benchmarks:** SWE-Bench, GPQA Diamond, MATH, HMMT, AgentBench, GAIA
- **Discussão original:** Conversa Robin + Luna + Dr. Roger (09-10/07/2026)

---

## 10. Evolução Futura (v1.3+)

1. **Planner como skill autônomo** — spawn isolado, recebe requirements, retorna sugestão
2. **Cache persistente** — SQLite/JSON com TTL, invalidado por webhook de provider updates
3. **Auto-tuning de thresholds** — aprender TPS real por modelo ao longo do tempo
4. **Provider health dashboard** — página simples com status visual
5. **Integração com Paperclip** — fallback chain como pipeline taskflow