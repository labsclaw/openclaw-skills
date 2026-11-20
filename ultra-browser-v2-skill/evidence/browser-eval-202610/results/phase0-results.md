# Fase 0 — Resultados do Rig (2026-10-17)

## Gravação nativa (browser-harness v0.1.13)

| Item | Estado | Evidência |
|---|---|---|
| Chrome remote debugging | ✅ Permitido pelo usuário (diálogo "Permitir") | doctor: `chrome running` ok |
| Daemon harness | ✅ vivo | doctor: `daemon alive`, `active browser connections — 1` |
| Gravação E2E | ✅ | `recordings/phase0-rig-test/`: 4 frames JPEG + events.jsonl + meta.json |
| Replay interativo | ✅ | `video init` → `recording-summary.json` + `video.html` (cursor-led camera, seek exato, export webm) |
| Auto-recording | ✅ habilitado | `recordings enable` — toda ação do harness grava por padrão |
| FFmpeg gdigrab fallback | ✅ testado | 6.1s de desktop → MP4 (uso: gravação de tela full-desktop fora do CDP) |

### Fluxo de gravação validado
```python
start_recording(name="<skill>-t<n>", title="<tarefa>")
# ... navegação ...
stop_recording()  # → ~/.config/browser-harness/agent-workspace/recordings/<name>/
# arquivos: NNNN.jpg (frames), events.jsonl (ações + timestamps + URLs), meta.json
# pós: browser-harness video init <dir>  → recording-summary.json + video.html (replay)
#       browser-harness video export <dir> --reviewed → MP4
```

## Probes JEV (2026-10-17)

| Rota | Resultado | Detalhe |
|---|---|---|
| kilocode `typesafe/jev-router` | ❌ 402 Payment Required | balance: 0 — precisa créditos |
| opencode-zen `jev-1.13-free` (HTTP direto) | ❌ 403 FreeTierError | "free tier can only be used from within OpenCode" |
| opencode CLI `opencode/jev-1.13-free` | ❌ Unexpected server error (err_b10ddf86) | server-side |
| opencode CLI `opencode/step-5-preview-free` | ❌ Unexpected server error (err_f9108186) | server-side |
| opencode CLI `opencode/mimo-v2.6-flash-free` | ✅ OK | resposta "OK" |
| opencode CLI `opencode/big-pickle` | ✅ OK | resposta "OK" |
| opencode CLI `opencode/deepseek-v4.1-flash-free` | ✅ OK | resposta "OK" |
| opencode CLI `opencode/nemotron-3-ultra-free` | ✅ OK | resposta "OK" |
| opencode CLI `opencode/beam-free` | ✅ OK | resposta "OK" |
| opencode CLI `opencode/space-bunny-free` | ✅ OK | resposta "OK" |

## Conclusão da Fase 0

- **Rig de gravação: 100% operacional** (CDP screencast nativo + replay + export MP4; fallback ffmpeg gdigrab validado).
- **JEV como runtime: indisponível no free tier hoje.** Decisão: avaliar jev-ultrafast e jev-browser-use como **arquitetura de referência** (action-space indexado, cabeças separadas, handoff clica/pensa-verifica) e implementar as "heads" com os 6 modelos free funcionais via opencode CLI. TYPESAFE_API_KEY paga (opcional, ~$0.0042/100k input) fica como upgrade futuro — a arquitetura da skill nova deve ser provider-agnostic (TypeSafe se disponível, free models como fallback).
- **Modelos free validados p/ Fase 3:** mimo-v2.6-flash-free, big-pickle, deepseek-v4.1-flash-free, nemotron-3-ultra-free, beam-free, space-bunny-free.
