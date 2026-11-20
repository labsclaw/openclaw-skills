# Análise: LCU e OpenGCUA — relação com o experimento browser-eval (2026-10-19)

Dois projetos novos no espaço computer-use, avaliados como candidados a integração/padrão da ultra-browser-v2.

---

## 1. LCU (amontlabs/lcu) — "Codex computer use, decoupled from the app"

**O que é:** expõe o runtime de computer-use original do Codex (app ChatGPT desktop) para **qualquer harness** — sem exigir autenticação Codex. O app continua sendo o fornecedor do runtime; o LCU faz setup + adapter.
- MIT, 1.178 ⭐, criado 2026-09-22, 35 releases
- Adapters: Pi, Codex CLI, Claude Code; **integração Hermes experimental**; Oh My Pi experimental
- Desktop apps (janelas, cliques, digitação, screenshots) + Chrome via extensão oficial (com aprovação por site)
- Modelo de permissões sério: aprovação por app (nativa, com painel de apps aprovados, Touch ID no macOS), alta-risco com warning, o app host nunca é auto-aprovado, `--approval auto` só para VMs/CI
- `lcu cross-turn` mantém computer-use entre turnos (Claude Code)
- Áudio do computador como opt-in com verificação própria

**Plataformas:** Linux (X11) e macOS Apple Silicon. **Windows 11 x64: "candidate, deferred"** — não suportado nesta entrega.

### Relevância para nós
- **Baixa no curto prazo:** nossa máquina é Windows 11 — a plataforma do LCU ainda está "candidate/deferred".
- **Alta no médio prazo:** a integração **Hermes é citada como experimental** — quando sair o suporte Windows, o LCU vira camada de desktop-use com modelo de aprovação por app muito superior ao nosso computer_use atual (aprovador nativo que o modelo não pode falsificar). Vale assistir releases.
- Padrão a copiar já: **aprovação por app com painel revogável** e **separação harness-permissão vs app-permissão** — nossa skill tem guardrails em texto, não enforcement.

## 2. OpenGCUA (Tongyi-MAI/OpenGCUA) — stack aberto p/ generalist computer-use agents

**O que é:** projeto aberto (Apache-2.0, Alibaba/Tongyi-MAI, out/2026, paper arXiv 2610.22200) do stack completo de GCUA — agentes que combinam **árvore de acessibilidade + APIs de app + shell + GUI** conforme a tarefa exige, escrevendo operações como **código**.
- Harness macOS real-device (menu-bar) + Cross-Device SDK (macOS/Android/browser/Linux, core Rust) + exemplo OSWorld + trajetórias de avaliação de 8 modelos frontier
- **Resultados OSWorld-v2 que validam nossas escolhas:**
  - +19,6 pontos de partial score na média dos 8 modelos (45,3→64,9) e **-53% steps por tarefa** vs GUI-only com batched actions
  - **"Modelos mais fracos ganham mais"**: GLM-5.3-Flash +35,2; DeepSeek-V4.1-Flash +29,8 — gap forte→fraco cai de 39,1 p/ 18,0. **É exatamente o nosso achado da Fase 3** (free models precisam da arquitetura certa, não de modelo maior): o mesmo harness que destrava os pequenos no OSWorld é o análogo do nosso "estado explícito + executor robusto + verifier".
  - Code execution soma +6,1 pontos e -14,8% steps mesmo com GUI+shell iguais (ablação de 3 modelos)
- **As 3 decisões transferidas ao modelo** (o coração do design): o que observar (screenshot só quando precisa), como agir (programa Python que combina a11y tree/API/shell/GUI com loops e checks), como organizar (todo + `<intent>` antes de cada programa)
- Trajetórias de GPT-6 Astra, Claude Opus 5, Gemini 3.8 Flash, GLM-5.3-Flash, Qwen3.8-Max/Flash, Kimi K3, DeepSeek-V4.1-Flash — **incluindo 3 dos free models que testamos**

### Relevância para nós
- **Direto:** o **Cross-Device SDK é a evolução natural do nosso snapshot indexado** — mesma filosofia (a11y tree como observação primária, screenshot opcional), mas multi-dispositivo e com bindings Python sobre core Rust. Adapta ao nosso `snapshot.js` quando precisarmos de Android/iOS/multi-device.
- **Padrão a adotar na v2.1 — "code execution" como modo de ação:** em vez de 1 ação JSON por ciclo (nossa T4 levou 5-7 decisões), permitir que o motor de decisão **emita um mini-programa** (`type(...); click(...); assert(text_contains(...))`) com loops/checks — o resultado do OSWorld (-53% steps) e o exemplo do CRM (29 edições verificadas por API em 1 passo, com assert de estado) mostram ganho de robustez E custo. Combinável com JEV: decisões repetitivas continuam no Choice; blocos complexos viram código executado em batch.
- **"Harness-to-model decision transfer"** — as escolhas que hoje fixamos na skill (quando re-observar, o que rastrear) podem migrar pro prompt/heads, alinhado ao nosso `--engine` routing.
- **Limitações:** macOS-first (Windows não coberto ainda), harness real-device preliminar, 33 ⭐ (recém-nascido) — mas times da Alibaba com paper + trajetórias públicas.

## Comparativo com a nossa ultra-browser-v2

| Dimensão | ultra-browser-v2 | LCU | OpenGCUA |
|---|---|---|---|
| Escopo | Browser (Chrome real via CDP) | Desktop completo (runtime Codex) | Desktop + browser + devices (geraliista) |
| Observação | Snapshot a11y indexado + pageText | AX/SOM do runtime Codex | a11y tree primária, screenshot sob demanda |
| Ação | 1 JSON por ciclo (JEV/free) | Cliques/typing do runtime | **Programa Python** (loops/asserts/batch) |
| Verificação | Verifier por código inline | Runtime Codex | asserts no código + todo com status claimed_verified |
| Gravação | CDP screencast nativo + MP4 | — (runtime Codex) | Trajetórias (release) |
| Windows | ✅ (toda a bateria foi aqui) | ❌ candidate/deferred | ❌ macOS-first |
| Modelo de decisão | JEV Choice heads / free models | Runtime Codex (GPT) | Qualquer LLM (openai/anthropic protocol) |
| Anti-bot | Chrome real + stealth timing | Extensão oficial | n/a (app nativo) |

## Conclusões e ações

1. **Nossos achados independem e convergem** — o experimento validou por conta própria (free models + arquitetura correta) o que o OSWorld-v2 do OpenGCUA mostra em escala: **o harness importa mais que o modelo**; modelos fracos + design certo ≈ modelos fortes + design ruim.
2. **Adotar na v2.1 (baixo risco, alto valor):** modo **batch/code-action** no agent_loop — o motor pode devolver uma LISTA de ações ou um mini-programa com asserts em vez de 1 JSON/ciclo; JEV continua para o routing fino. Metas: -50% decisões por tarefa (alinhado ao -53% do OSWorld), reuso do nosso executor com resolução text→value.
3. **Assistir LCU** — quando o suporte Windows sair de "candidate", avaliar como substituto do computer_use cua-driver com o modelo de aprovação por app (e o adapter Hermes experimental já citado).
4. **Estudar as trajetórias do OpenGCUA** dos 3 free models que compartilhamos (GLM-5.3-Flash, DeepSeek-V4.1-Flash, Kimi) para extrair padrões de prompt/forma de ação que funcionaram no OSWorld.
5. **Cross-Device SDK** fica na radar como camada de observação multi-device futura (nada a fazer agora — nosso escopo é browser+desktop Windows).

Links: https://github.com/amontlabs/lcu · https://github.com/Tongyi-MAI/OpenGCUA · paper arXiv 2610.22200 · trajetórias em tongyi-mai.github.io/OpenGCUA/trajectories.html
