# Experimento: Avaliação de Skills de Navegação + Modelos de Decisão → ultra-browser-v2

**Projeto:** browser-eval · **Período:** 16-17/10/2026 · **Repo:** `C:\Users\ClawLabs\browser-eval` (git local, 6 commits)
**Skill produzida:** `ultra-browser-v2` (também instalada em `C:\Users\ClawLabs\openclaw-skills\ultra-browser-v2\`)

---

## 1. Objetivo

Avaliar as capacidades de **navegação com browser visível e gravação de tela** do laboratório LabsClaw: testar todas as skills de navegação locais, avaliar as alternativas baseadas em JEV, medir modelos LLM free como motor de decisão, e sintetizar tudo numa **skill superior** (ultra-browser-v2) que funcione também com modelos baratos/gratuitos.

## 2. O que foi avaliado

### Skills locais LabsClaw (clonadas de github.com/labsclaw/openclaw-skills, em `~/.openclaw/skills/`)

| Skill | Abordagem | Cópias lidas em |
|---|---|---|
| ultra-browser-skill | ARIA grounding, loop 4 fases, fallback hierarchy | `skills/ultra-browser-skill/SKILL.md.orig` |
| ultra-chrome-assistente-skill | Extension MV3 + WebSocket :3032 | `skills/ultra-chrome-assistente-skill/SKILL.md.orig` |
| ultra-chrome-devtools-skill | Chrome DevTools MCP (perf/Lighthouse) | `skills/ultra-chrome-devtools-skill/SKILL.md.orig` |
| ultra-browser-stealth-timing-skill | Timing humano anti-detecção | `skills/ultra-browser-stealth-timing-skill/SKILL.md.orig` |
| ultra-chrome-stealth-navigator-skill | CDP attach no Chrome real do usuário | `skills/ultra-chrome-stealth-navigator-skill/SKILL.md.orig` |
| ultra-dom-engine-skill | agenticPurposeId (IDs estáveis por elemento) | `skills/ultra-dom-engine-skill/SKILL.md.orig` |
| playwright-expert | Baseline E2E determinístico | `skills/playwright-expert/SKILL.md.orig` |
| webapp-testing | Playwright p/ apps locais | `skills/webapp-testing/SKILL.md.orig` |

### Alternativas JEV (avaliadas como arquitetura; runtime ver Fase 0/6)

| Projeto | Padrões extraídos | Fonte |
|---|---|---|
| browser-use/jev-ultrafast | Action space indexado, 1 request/ciclo com heads especulativos, snapshot atômico, DONE exige verificação independente | https://github.com/browser-use/jev-ultrafast |
| wy-coliney/jev-browser-use | "Jev clica, Codex pensa e verifica", handoff barato/carom routing | https://github.com/wy-coliney/jev-browser-use |

## 3. Arquitetura do experimento

```
┌──────────────── Chrome REAL do usuário (CDP, perfil logado) ───────────────┐
│                                                                            │
│  browser-harness v0.1.13 (daemon)                                          │
│   ├─ helpers: goto_url, js(), fill_input, page_info                        │
│   └─ RECORDER (CDP screencast): frames JPEG + events.jsonl + video.html    │
│                                                                            │
│  LOOP DA SKILL (agent_loop.py):                                            │
│   snapshot.js → tabela indexada COM ESTADO EXPLÍCITO                       │
│      [1] input name · value="Roger Oliveira"                               │
│      [3] select plan · current=Selecione…                                  │
│      [4] checkbox terms · checked=false                                    │
│   → MOTOR DE DECISÃO (1 ação JSON por ciclo):                              │
│      Tier 1: JEV TypeSafe (Choice heads operation+target, ~0.4s)           │
│      Tier 2: free models via opencode CLI (mimo/deepseek/big-pickle)       │
│   → EXECUTOR (js) com guards + resolução option text→value                 │
│   → VERIFIER independente por código (done do modelo não encerra nada)    │
│   → loop guard (mesma ação x3 → abort + verifier)                         │
└────────────────────────────────────────────────────────────────────────────┘
```

## 4. A tarefa-padrão (T4 — complexa, idêntica em todos os cenários)

Formulário local `fixtures/html/t4-form.html` (servido em `http://127.0.0.1:8765`):
- 2 inputs (nome, email) + `<select>` de plano
- **checkbox de termos dentro de shadow DOM** (botão submit disabled até marcar)
- **iframe** com botão que revela código
- Goal: preencher tudo, marcar termos, submeter → sucesso = texto "OK: Roger Oliveira | roger@labsclaw.dev | plano=pro"

Bateria complementar (Fase 2): T1 busca Google, T2 Wikipedia multi-hop, T3 Google Flights, T5 anti-bot passivo, T6 dashboard de KPIs.

## 5. Fases executadas e resultados

### Fase 0 — Rig de gravação + probes (commits `4375afe`)
- Chrome remote debugging permitido pelo usuário (diálogo "Permitir"); daemon browser-harness vivo.
- Gravação E2E validada: frames + events.jsonl (URL/clique/latência por ação) + `video.html` replay.
- FFmpeg 9.0.1 (gdigrab desktop) testado como fallback.
- **Probes JEV free falharam** (kilocode 402 sem créditos; opencode-zen 403 free-tier-só-no-CLI; opencode CLI server-error). 6 free models via opencode CLI OK.
- Evidência: `results/phase0-results.md`, `recordings/phase0-rig-test/`

### Fase 1 — Inventário (commit `14dde03`)
- 8 skills lidas por completo; matriz de capacidades + gap analysis (7 gaps: gravação nativa, cabeças separadas, verifier independente, model routing, etc.).
- Evidência: `results/phase1-inventory.md`

### Fase 2 — Bateria T1-T6 com o harness-CDP direto (commit `14dde03`)
- **5/6 PASS** (T5 nulo: alvo Cloudflare fora do ar; 0 bloqueios de bot em 4 tentativas — Chrome real não foi detectado).
- T4 (form complexo) e T6 (KPIs 4/4) passaram via JS direto; T3 Flights: 12 voos visíveis.
- Evidência: `results/phase2-battery.md`, `recordings/harness-t1..t6*`

### Fase 3 — Matriz de free models como motor de decisão (commit `ea991e4`)
Loop agentic real (snapshot indexado → 1 ação JSON → exec), 3 modelos × 3 tarefas:
- **v1 (estado implícito): 0/3 na T4** — todos entraram em loop infinito redigitando (não distinguiam campo cheio de vazio). Achados: executor precisa resolver option TEXT→VALUE; free models bloqueiam por literalismo.
- **v3 (estado explícito): 3/3 DONE** — mimo (6 steps/178s), deepseek (5/120s), big-pickle (6/222s). T6: 3/3 em 1 step. Verifier independente PASS.
- Evidência: `results/phase3-free-models.md`, logs JSON em `fixtures/phase3-logs-v1-buggy-select.json`, `-v3-explicit-state.json` (v2 = fix parcial do select), gravações `recordings/f3-opencode_<modelo>-T*`

### Fase 4 — Síntese: skill ultra-browser-v2 (commit `0c14168`)
SKILL.md + scripts (snapshot.js, agent_loop.py, verifier) + referências com evidência por regra + schema de log. Cada regra da skill amarrada ao experimento que a justifica.

### Fase 5 — Validação end-to-end (commit `d1d9b34`)
- Run 1 (deepseek): completou o form mas não percebeu → **loop guard pegou; form estava OK** → melhoria: verifier-on-abort.
- Run 2: bug do verifier (JSON literal vs JS) → fix inline.
- Run 3 (mimo): **DONE-VERIFIED** com gravação.

### Fase 6 — JEV TypeSafe live (commit `37f4e21`; key fornecida via `.env` pelo usuário)
- Probe: `jev-1.13.0` respondeu em 0.51s; integração tier-1 (`ask_jev`: Choice heads operation+target especulativos em 1 request).
- **T4 DONE-VERIFIED**: 7 decisões, **0.43s/decisão média** (vs 25-55s free CLI = ~70x), custo **$0.000177/tarefa**, zero loops.
- OpenRouter não foi necessário (fallback da diretriz); não expõe JEV no catálogo local.

## 6. Resultado consolidado (T4 — mesma tarefa em todos os cenários)

| Cenário | Resultado | Decisões | Tokens (in/out) | Latência/decisão | Custo |
|---|---|---|---|---|---|
| Harness-CDP + JS direto (Fase 2) | ✅ PASS | — | 0 (sem LLM) | ~15s total | $0 |
| JEV TypeSafe (Fase 6) | ✅ DONE-VERIFIED | 7 | **4.220 / 606** (medido) | **0.43s** | $0.000177 (real) |
| opencode/mimo-v2.6-flash-free | ✅ DONE-VERIFIED | 6 | ~1.692 / ~132 (est.) | ~30s | $0 (free tier) |
| opencode/deepseek-v4.1-flash-free | ✅ DONE-VERIFIED | 5 | ~1.410 / ~110 (est.) | ~25s | $0 (free tier) |
| opencode/big-pickle | ✅ DONE-VERIFIED | 6 | ~1.692 / ~132 (est.) | ~37s | $0 (free tier) |

**Notas de tokens:**
- **JEV (medido na API):** a API TypeSafe devolve `usage.input_tokens/output_tokens` por request — 4.220 in / 606 out para 7 decisões (603 in + 87 out por decisão, em média).
- **Free models (estimativa):** opencode CLI não reporta usage; estimado pelo prompt reconstruído da T4: **~282 tokens input + ~22 output por decisão** (1.126 chars de prompt ÷ 4, resposta JSON típica de 88 chars). Validação cruzada: o prompt do JEV (mesma tabela + goal) consumiu 603 in contra nossos 282 estimados — a diferença é o overhead do formato typed-questions (critérios de options duplicados), coerente com o design.
- **Conversão para custo futura:** qualquer preço por token pode ser aplicado direto. Exemplo hipotético a $0.07/1M in + $0.28/1M out (faixa de flash models pagos): JEV = $0.000465/tarefa; free models = $0.00013-0.00016/tarefa — ou seja, **a tarefa custa fração de centavo em qualquer motor**; o diferencial do JEV é latência (70x), não custo.
- Tokens por decisão são a métrica comparável entre modelos futuros (ver schema `templates/task-log.json` → `metrics.tokens_est`).

**Model routing final da skill:** Tier 1 = JEV TypeSafe (default com key) → Tier 2 = free models opencode CLI → Tier 3 = LLM caro (não necessário em nenhum cenário).

## 7. Achados principais

1. **Estado explícito por elemento é o que viabiliza modelos pequenos** (`value=...`, `current=...`, `checked=...`) — de 0/3 para 3/3 free models.
2. **Executor deve resolver option text→value** — senão select nunca muda e o modelo entra em loop.
3. **Verificador independente por código é obrigatório** — dois casos reais: deepseek completou sem perceber (verifier-on-abort salvou); modelo diz "done" mas só o código confirma.
4. **JEV (typed questions) elimina as classes de erro dos LLMs**: não há JSON malformado, não há literalismo, e confidence é visível por decisão.
5. **Chrome real via CDP + gravação nativa** (browser-harness) é a base ideal: anti-bot de fábrica (0 bloqueios) + evidência automática.
6. **Um request por ciclo de decisão** (padrão jev-ultrafast) funciona tanto com JEV quanto com free models — a interface é a mesma, só o transporte muda.

### Fase 7 — v2.2 batch/code-action (commits de 2026-10-19)
- **Modo batch implementado** (padrão OpenGCUA adaptado): plano multi-ação + asserts em 1 request (JEV: N heads especulativos; free: array JSON), execução em lote com assert-stop, re-planejamento automático.
- **T4: 4/4 motores DONE-VERIFIED-BATCH em 1 ciclo** — JEV 0.51s (2.091/609 tok), minimax-m3.1-flash:free (kilocode) 4.3s (741 tok), glm-5.3 (NIM) 9.4s (640 tok), deepseek-v4.1-flash (NIM) 74.4s (685 tok). Requests do motor: 7→1; single-mode regression PASS (minimax 6 steps DONE-VERIFIED).
- **MiniMax M3.1 Flash free**: kilocode ✅ (4.3s, mais rápido free), openrouter ⚠️ sem key local, NIM ❌ não existe no catálogo.
- **opencode CLI: key expirada** (2026-10-19) — substituído como tier 2 por kilocode `:free` e NIM.
- Evidência: `results/phase7-v22-batch.md`, `results/v22-logs/`, MP4s `recordings/videos/v22-*.mp4` (4 motores, tela gravada via gdigrab — CDP screencast sem frames nos runs background; events.jsonl preservados em `recordings/ub22-*`).

## 8. Mapa de evidências

### 📹 Vídeos MP4 finais (identificados por motor)
`recordings/videos/`
- `jev-typesafe-t4-ub2-1792217777.mp4` — JEV TypeSafe, T4 DONE-VERIFIED (12.0s)
- `free-model-t4-ub2-1792216908.mp4` — free model run 1 (12.7s)
- `free-model-t4-ub2-1792217310.mp4` — free model run 2, verifier fix (11.8s)

### 🎞️ Gravações brutas (frames + events.jsonl + meta)
- `recordings/ub2-1792216908|310|7777/` — runs da skill v2 (com video.html, video.webm, recording-summary, renderer-review)
- `recordings/f3-opencode_<modelo>-T{1,4,6}/` — matriz Fase 3 (9 runs)
- `recordings/harness-t{1..6}*/` — bateria Fase 2
- `recordings/phase0-rig-test/` — validação do rig
- `recordings/session-20261017-*/` — auto-recordings do harness
- Fonte original das gravações: `~/.config/browser-harness/agent-workspace/recordings/`

### 📊 Logs e dados
- `fixtures/phase3-logs-v1-buggy-select.json` — falhas com estado implícito
- `fixtures/phase3-logs-v2-select-fix.json` — fix parcial do select
- `fixtures/phase3-logs-v3-explicit-state.json` — 3/3 DONE com estado explícito
- `fixtures/phase3_agent_loop.py` — harness da matriz free
- `fixtures/make_videos.py` — geração dos briefs + export MP4
- `fixtures/html/t4-form.html`, `iframe-inner.html`, `t6-dashboard.html` — fixtures da bateria

### 📄 Documentos de resultado por fase
- `plan/PLAN-browser-skills-v2.md` — plano original (5 fases)
- `results/phase0-results.md` — rig + probes
- `results/phase1-inventory.md` — inventário das skills + gap analysis
- `results/phase2-battery.md` — bateria T1-T6
- `results/phase3-free-models.md` — matriz free models (v1→v3)
- `results/phase6-jev-typesafe.md` — JEV live + comparativo

### 🧩 Skill produzida
- `ultra-browser-v2/SKILL.md` — roteiro completo (loop, stealth em camadas, recording-first, model routing)
- `ultra-browser-v2/scripts/` — snapshot.js, agent_loop.py (engines typesafe/opencode), verifier.js
- `ultra-browser-v2/references/eval-results.md` — regra → evidência
- `ultra-browser-v2/references/jev-patterns.md` — padrões JEV com fonte
- `ultra-browser-v2/templates/task-log.json` — schema de métricas
- Cópia instalada: `C:\Users\ClawLabs\openclaw-skills\ultra-browser-v2\` (commit `d489190` + update JEV)

## 9. Como reproduzir

```bash
# 1. Servir os fixtures
cd C:/Users/ClawLabs/browser-eval/fixtures/html && python -m http.server 8765 &

# 2. Rodar a skill na T4 com JEV (default se TYPESAFE_API_KEY no .env)
cd C:/Users/ClawLabs/browser-eval/ultra-browser-v2
python scripts/agent_loop.py \
  --url "http://127.0.0.1:8765/t4-form.html" \
  --goal "Fill the form: name=Roger Oliveira, email=roger@labsclaw.dev, plan=Pro. Then check the terms checkbox and click submit. Success text contains 'OK:'" \
  --engine typesafe --verify "text_contains:OK:" --record

# 3. Com free model (tier 2)
python scripts/agent_loop.py --url ... --goal ... --engine opencode \
  --model opencode/mimo-v2.6-flash-free --verify "text_contains:OK:" --record

# 4. Exportar vídeo de um recording
browser-harness video init <recording-dir>   # escrever edit-brief.json (ver fixtures/make_videos.py)
browser-harness video review <recording-dir>
browser-harness video export <recording-dir> --reviewed

# 5. Re-avaliar free models contra o mesmo gabarito
cd C:/Users/ClawLabs/browser-eval/fixtures && python phase3_agent_loop.py "opencode/<modelo>"
```

## 10. Histórico de commits

```
37f4e21 Fase 6: JEV TypeSafe live — DONE-VERIFIED na T4 a 0.43s/decisao
d1d9b34 Fase 5: validacao end-to-end da ultra-browser-v2 — DONE-VERIFIED na T4
0c14168 Fase 4: skill ultra-browser-v2 completa
ea991e4 Fase 3: matriz free models — v1 falha unanime, v3 estado explicito = 3/3 DONE
14dde03 Fase 1+2: inventario das 8 skills + bateria T1-T6 no harness-CDP (5/6 pass)
4375afe Fase 0: rig de gravacao validado + probes JEV/free models
```

**Limitações declaradas:** T5 (anti-bot) ficou nulo por alvo fora do ar (0 bloqueios observados nos alvos vivos); T2 multi-hop não entrou na matriz v3; latência free CLI (25-55s/decisão) domina o tempo total no tier 2 — mitigação futura: daemon opencode persistente.
