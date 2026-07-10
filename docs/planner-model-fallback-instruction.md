# ðŸ§  InstruÃ§Ã£o do MÃ³dulo Planner â€” Cadeia de Fallback de Modelos

**VersÃ£o:** 1.1 â€” 2026-07-10
**Autores:** Robin (orquestraÃ§Ã£o) + Luna (v1.0) + Dr. Roger (direÃ§Ã£o)
**Status:** Aguardando PR pro Justus

---

## 1. Arquitetura: Planner â†’ Orquestrador

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                        ORQUESTRADOR                              â”‚
â”‚         (Decisor final â€” conhece estado real do sistema)         â”‚
â”‚                                                                  â”‚
â”‚  Inputs:                                                         â”‚
â”‚  â”œâ”€â”€ SugestÃ£o do Planner (ordenaÃ§Ã£o recomendada)                 â”‚
â”‚  â”œâ”€â”€ SaÃºde dos providers (compare-config.ps1 ou health check)   â”‚
â”‚  â”œâ”€â”€ TPS real (quem estÃ¡ rÃ¡pido agora?)                         â”‚
â”‚  â”œâ”€â”€ Rate limits e filas                                         â”‚
â”‚  â”œâ”€â”€ Tamanho do contexto necessÃ¡rio                              â”‚
â”‚  â””â”€â”€ Modelos extras nÃ£o-listados (experimentais, locais)        â”‚
â”‚                                                                  â”‚
â”‚  Output: Modelo escolhido para a tarefa                          â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
          â–²
          â”‚ consulta
          â”‚
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                          PLANNER                                 â”‚
â”‚    (Analista de capabilities â€” pesquisa web sob demanda)         â”‚
â”‚    FunÃ§Ã£o: Sugerir ordenaÃ§Ã£o por potÃªncia + TPS                  â”‚
â”‚    NÃƒO toma decisÃ£o final â€” Ã© um facilitador                     â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
          â–²
          â”‚
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                    LISTA DE CANDIDATOS                           â”‚
â”‚    (Modelos disponÃ­veis nos providers configurados)              â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

**Regra Fundamental:** O Planner NÃƒO toma decisÃ£o final â€” ele Ã© um facilitador. Quem decide Ã© o Orquestrador, porque sÃ³ ele tem acesso ao estado real do sistema.

---

## 2. PapÃ©is e Responsabilidades

### 2.1 Planner â€” O que faz

- Recebe lista de candidatos + requisitos da tarefa
- Pesquisa web sob demanda pra cada candidato
- Classifica em tiers (S/A/B/C) por potÃªncia + TPS
- Retorna JSON ordenado com recomendaÃ§Ã£o
- **NÃƒO:** decide modelo final, acessa providers, testa latÃªncia

### 2.2 Orquestrador â€” O que faz

- Roda `compare-config.ps1` pra health check (modelos mortos â†’ exclui)
- Recebe sugestÃ£o do Planner
- Valida contra estado real: quem tÃ¡ online? quem tÃ¡ rÃ¡pido?
- Decide modelo final pra cada tarefa
- Pode spawnar Opus pra tarefas crÃ­ticas (critÃ©rio abaixo)
- **NÃƒO:** ignora sugestÃ£o do Planner sem motivo, usa modelo morto

---

## 3. Fluxo de Trabalho

### 3.1 Gatilho

- Nova tarefa com requisitos especÃ­ficos
- Cadeia de fallback precisa de reavaliaÃ§Ã£o
- Novo modelo candidato chega (provider adicionou modelo novo)
- VerificaÃ§Ã£o periÃ³dica (cron ou heartbeat)

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
| ðŸ”´ ObrigatÃ³rio | Tool calling | Suporta function calling? |
| ðŸ”´ ObrigatÃ³rio | Context window | Tamanho mÃ¡ximo do contexto |
| ðŸ”´ ObrigatÃ³rio | Coding score | Benchmarks: SWE-Bench, HumanEval, CodeContests |
| ðŸ”´ ObrigatÃ³rio | Reasoning score | Benchmarks: GPQA Diamond, MATH, HMMT |
| ðŸŸ¡ Importante | TPS estimado | Tokens por segundo (velocidade de resposta) |
| ðŸŸ¡ Importante | Suporte imagem | Multimodal: aceita imagem como input? |
| ðŸŸ¡ Importante | Agentic score | Benchmarks: AgentBench, GAIA, SWE-bench Verified |
| ðŸŸ¢ DesejÃ¡vel | Suporte vÃ­deo/Ã¡udio | Multimodal estendido |
| ðŸŸ¢ DesejÃ¡vel | Custo | Free, paid, freemium? |

### 3.4 ClassificaÃ§Ã£o por Tiers

| Tier | DefiniÃ§Ã£o | CritÃ©rios | Exemplos |
|------|-----------|-----------|----------|
| **S** | Frontier | Reasoning >80% GPQA, Coding >60% SWE, Context â‰¥100k | DeepSeek V4 Pro, MiniMax M3, Claude Opus |
| **A** | Fortes | Reasoning 60-80%, Coding 40-60%, Context â‰¥50k | Big Pickle, MiMo v2.5, Nemotron-3 Ultra |
| **B** | Capazes | Reasoning 40-60%, Coding 20-40%, Context â‰¥30k | Nemotron-3 Nano, Hy3, GLM-5 |
| **C** | Leves/RÃ¡pidos | TPS alto, capabilities bÃ¡sicas, Context <30k | North Mini Code, Ling Flash |

**CritÃ©rios de tier (decisÃ£o):**
- **PotÃªncia primeiro:** Benchmarks de reasoning + coding determinam o tier
- **TPS como desempate:** Dentro do mesmo tier, mais rÃ¡pido primeiro
- **Tool calling:** Se a tarefa exige e o modelo nÃ£o suporta â†’ desce 1 tier

### 3.5 OrdenaÃ§Ã£o

```
PotÃªncia (S â†’ A â†’ B â†’ C) > TPS (mais rÃ¡pido primeiro) > Tool calling > Custo
```

### 3.6 SaÃ­da (JSON)

```json
{
  "plannerVersion": "1.1",
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
      "note": "Sombra agentica â€” melhor agentic score do mercado"
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
      "note": "Agente rÃ¡pido, free"
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
      "note": "Spawn explÃ­cito â€” tarefas que exigem reasoning profundo"
    }
  ],
  "analysis": {
    "totalCandidates": 20,
    "survivingProviders": 4,
    "resilience": "Sobrevive Ã  queda de 3 providers"
  }
}
```

---

## 4. RelaÃ§Ã£o com plan-routing.ps1

O script PowerShell atual (`plan-routing.ps1`) cobre a **parte de health check + cross-provider mapping**:

| Script | FunÃ§Ã£o | Quando roda |
|--------|--------|-------------|
| `compare-config.ps1` | DiagnÃ³stico: modelos mortos, novos, quebrados | Sempre antes de decidir |
| `plan-routing.ps1` | Cross-provider mapping + redundÃ¢ncia | DiagnÃ³stico periÃ³dico |
| **Esta instruÃ§Ã£o** | Capabilities + decisao do Orquestrador | Toda tarefa com requisitos especÃ­ficos |

**Fluxo integrado:**
1. `compare-config.ps1` â†’ limpa modelos mortos da candidatura
2. `plan-routing.ps1` â†’ mostra redundÃ¢ncia cross-provider (referÃªncia)
3. Planner (esta instruÃ§Ã£o) â†’ pesquisa capabilities dos sobreviventes
4. Orquestrador â†’ decide com estado real + sugestÃ£o do Planner

---

## 5. CritÃ©rios de DecisÃ£o do Orquestrador

### 5.1 Health Check (obrigatÃ³rio antes de decidir)

```
1. Rodar compare-config.ps1
2. Modelos mortos â†’ remover da candidatura
3. Providers com auth quebrada â†’ marcar como indisponÃ­vel
4. SÃ³ considerar modelos dos providers saudÃ¡veis
```

### 5.2 Spawn vs Fallback Chain

**Quando spawnar Opus (premiumOnDemand):**
- Tarefa exige reasoning profundo (estimativa >80% GPQA)
- Cota Antigravity disponÃ­vel
- Tarefa Ã© crÃ­tica/nÃ£o-tolerante a falha
- Exemplo: anÃ¡lise de contrato, debugging complexo, pesquisa acadÃªmica

**Quando usar fallback chain:**
- Tarefa Ã© rotineira (coding, automaÃ§Ã£o, conteÃºdo)
- Velocidade importa mais que profundidade
- Cota Antigravity esgotada ou provider instÃ¡vel

**Regra simples:** Se a tarefa Ã© "difÃ­cil o suficiente pra justificar Opus" E Opus tÃ¡ disponÃ­vel â†’ spawn. SenÃ£o â†’ fallback chain.

### 5.3 SeleÃ§Ã£o dentro do tier

Dentro do mesmo tier, o Orquestrador considera:
1. **TPS atual** (nÃ£o estimado) â€” quem tÃ¡ respondendo rÃ¡pido agora?
2. **Contexto necessÃ¡rio** â€” tarefa longa? Priorizar 1M context
3. **Tool calling** â€” tarefa precisa? Modelo suporta?
4. **Custo** â€” free primeiro, paid sÃ³ se justificar

---

## 6. Casos Especiais

### 6.1 Opus via Antigravity

- **Fora da fallback chain** â€” Ã© recurso sob demanda
- **Spawn explÃ­cito** â€” Orquestrador decide quando usar
- **Cota limitada** â€” usar com moderaÃ§Ã£o, priorizar tarefas crÃ­ticas
- **Agentes OPE** â€” configurado como modelo de tarefas avanÃ§adas

### 6.2 Pesquisa Sempre Recente

- Sem cache estÃ¡tico de capabilities
- Cada rodada de planejamento = web_search fresca
- Modelos mudam capabilities com updates â€” nÃ£o confiar em dados velhos

### 6.3 Falha na Pesquisa

- Capacidades desconhecidas â†’ tier B conservador
- Nunca colocar como primary sem dados confirmados
- Log: "capabilities nÃ£o verificadas para {modelo}" no output do Planner

### 6.4 Provider InstÃ¡vel (Antigravity pattern)

- Se provider tem auth quebrada cronicamente â†’ remover da cadeia
- Modelos desse provider ficam disponÃ­veis via API direta (proxy)
- SÃ³ reintroduzir quando auth estiver estÃ¡vel por >24h

---

## 7. Exemplo PrÃ¡tico

### CenÃ¡rio: Tarefa de automaÃ§Ã£o com tool calling

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
1. `compare-config.ps1` â†’ OpenRouter com 401, Antigravity auth expirado
2. Providers saudÃ¡veis: OpenCode, KiloCode, NVIDIA
3. Planner pesquisa: DeepSeek V4 Pro (tool calling âœ…, 1M context, 95% GPQA)
4. Planner pesquisa: MiniMax M3 (tool calling âœ…, 1M context, 72.3 agentic)
5. Planner pesquisa: Big Pickle (tool calling âœ…, context ?, 50 TPS)
6. SugestÃ£o: DeepSeek V4 Pro â†’ MiniMax M3 â†’ Big Pickle
7. Orquestrador valida: NVIDIA tÃ¡ saudÃ¡vel, DeepSeek tÃ¡ rÃ¡pido â†’ **escolhe DeepSeek V4 Pro**

**SaÃ­da:**
```json
{
  "chosen": "nvidia/deepseek-ai/deepseek-v4-pro",
  "reason": "Melhor scoring pra tarefa (tool calling + reasoning), provider saudÃ¡vel",
  "fallbackActivated": false
}
```

---

## 8. Checklist de ImplementaÃ§Ã£o

- [ ] Criar mÃ³dulo Planner que faz web_search sob demanda
- [ ] Integrar com `compare-config.ps1` pra health check
- [ ] Definir thresholds de tier com benchmarks reais
- [ ] Implementar lÃ³gica de spawn vs fallback no Orquestrador
- [ ] Testar com cenÃ¡rio real (tarefa de coding + tarefa de reasoning)
- [ ] Documentar no repo do Justus

---

## 9. ReferÃªncias

- **Skill:** `skills/ultra-models-skill/SKILL.md`
- **Scripts:** `compare-config.ps1`, `plan-routing.ps1`
- **Benchmarks:** SWE-Bench, GPQA Diamond, HMMT, AgentBench
- **DiscussÃ£o original:** Conversa Robin + Luna + Dr. Roger (09-10/07/2026)
