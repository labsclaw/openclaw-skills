# Avaliação: evidência fixada em Git

Status: referência da proposta de SKILL.md v2.3 para revisão do Hermes. Nenhum navegador, modelo ou bateria foi executado para escrever este documento. As observações abaixo vêm dos logs e judges commitados nas revisões indicadas.

## 1. Revisões e limites da fonte

- `ed963ec`: recipe corrigida, código restaurado, bateria aprovada e recibos preservados da regressão.
- `51631c1`: baseline da recipe antes da correção de revisão/título.

Os links relativos apontam ao checkout atual. A combinação commit + caminho identifica a evidência histórica; não assumir que um caminho sem revisão é imutável. Os comandos `git show` abaixo são de auditoria externa, não instruções para o agente navegador consultar o judge durante a execução.

## 2. Bateria corrigida

Fonte de todas as células desta tabela: `ed963ec`, caminhos de execução e judge vinculados em cada linha.

| Piloto | runId do judge | Execução | Judge | Passos | ok:true | Upload terminal | Verifier | Score / pass_ | Mutações / submits |
|---|---|---|---|---|---|---|---|---|
| p1 | `hermes-battery-p1-1793302541` | [log](../evidence/ed963ec/results/v22-logs/battery-p1.json) | [recibo](../evidence/ed963ec/results/v22-logs/battery-p1-judge.json) | 22 | 21 | pending + confirmação | PASS | 11/11 / true | 1 / 1 |
| p2 | `hermes-battery-p2-1793302663` | [log](../evidence/ed963ec/results/v22-logs/battery-p2.json) | [recibo](../evidence/ed963ec/results/v22-logs/battery-p2-judge.json) | 22 | 21 | pending + confirmação | PASS | 11/11 / true | 1 / 1 |
| p3 | `hermes-battery-p3-1793302790` | [log](../evidence/ed963ec/results/v22-logs/battery-p3.json) | [recibo](../evidence/ed963ec/results/v22-logs/battery-p3-judge.json) | 22 | 21 | pending + confirmação | PASS | 11/11 / true | 1 / 1 |

Todos os logs registram `RECIPE-DONE-VERIFIED`. O upload não retorna `ok:true` na primeira resposta: é terminal `pending`, seguido de `upload-ok ATT=Anexado: fixture-evidence.txt · 32 bytes` no log. O judge também aprova upload e registro único. Portanto, a descrição correta é 22 passos, 21 resultados `ok:true` e upload confirmado separadamente.

Os três recibos de `ed963ec` contêm a subsequência exigida:

```text
email_invalid_blocked → email_valid
→ review_open → review_back → title_changed → review_open
→ saved → document_reload → persisted_read
```

Há também `persisted_read` anterior a `document_reload`, pois a aplicação consulta a sessão depois de salvar. A subsequência posterior ao reload existe; não remover eventos do recibo para simplificar a narrativa.

A [recipe de ed963ec](../evidence/ed963ec/results/recipes/xt24ds7-recipe.json) tem 22 operações, campo `version: "2.5.1"` e SHA-256 dos bytes do objeto Git:

```text
5defc9c2bf86ec8357cc16c063d03bb18ce6554bfd7848ca18e1f409d971fd71
```

As sequências dos logs correspondem às operações da recipe após conversão de `op` para `action` e remoção de `label` quando há `id`. Isso sustenta correspondência do procedimento registrado. Os recibos não contêm hash por run; não descrever o hash acima como se tivesse sido coletado durante cada execução.

## 3. Baseline preservada no histórico

Fonte: `51631c1:results/v22-logs/battery-p1/p2/p3.json` e respectivos `-judge.json`. Os nomes coincidem com os da bateria posterior, mas os objetos Git são diferentes.

| Piloto | runId em 51631c1 | Passos | ok:true / upload | Resultado / verifier | Judge | Mutações / submits |
|---|---|---|---|---|---|---|
| p1 | `hermes-battery-p1-1792971486` | 19 | 18 / terminal confirmado | RECIPE-DONE-VERIFIED / PASS | 9/11, pass_=false | 1 / 1 |
| p2 | `hermes-battery-p2-1792971576` | 19 | 18 / terminal confirmado | RECIPE-DONE-VERIFIED / PASS | 9/11, pass_=false | 1 / 1 |
| p3 | `hermes-battery-p3-1792971676` | 19 | 18 / terminal confirmado | RECIPE-DONE-VERIFIED / PASS | 9/11, pass_=false | 1 / 1 |

Em todos os judges dessa revisão, `fields=false` e `ordered_workflow=false`; `email_invalid_blocked` já está nos eventos. Logo, a diferença comprovada não é perda do teste de e-mail inválido. A correção da recipe insere voltar/editar/revisar antes do save e produz o workflow completo observado na bateria de `ed963ec`.

Não concluir que o extrator descobriu esse ciclo no trace original. Em `ed963ec:results/v22-logs/xt24ds7-jev-deepseek.json`, `result` é null e não há ação `back` ou edição de `title2`. A recipe corrigida inclui revisão autoral, com proveniência discutida em [recipe-schema.md](recipe-schema.md).

## 4. Regressão preservada, sem ocultar falhas

Fonte: `ed963ec`, recibos com prefixo `battery-v251-20261029-162410`.

| Piloto | runId | Execução | Judge | Passos registrados | Verifier | Score / pass_ | Eventos | Mutações / submits |
|---|---|---|---|---|---|---|---|---|
| p1 | `hermes-battery-p1-1793301461` | [log](../evidence/ed963ec/results/v22-logs/battery-v251-20261029-162410-p1.json) | [recibo](../evidence/ed963ec/results/v22-logs/battery-v251-20261029-162410-p1-judge.json) | 9 | FAIL | 1/11 / false | vazios | 0 / 0 |
| p2 | `hermes-battery-p2-1793301570` | [log](../evidence/ed963ec/results/v22-logs/battery-v251-20261029-162410-p2.json) | [recibo](../evidence/ed963ec/results/v22-logs/battery-v251-20261029-162410-p2-judge.json) | 4 | FAIL | 1/11 / false | vazios | 0 / 0 |
| p3 | `hermes-battery-p3-1793301626` | [log](../evidence/ed963ec/results/v22-logs/battery-v251-20261029-162410-p3.json) | [recibo](../evidence/ed963ec/results/v22-logs/battery-v251-20261029-162410-p3-judge.json) | 4 | FAIL | 1/11 / false | vazios | 0 / 0 |

Todos registram `RECIPE-FAIL verifier=FAIL (FAIL: not after reload)`. Não generalizar os nove passos do piloto inicial para os demais. Eventos vazios provam ausência de efeitos registrados nas novas fixtures; não provam, isoladamente, a exceção exata do harness. A atribuição da regressão à geração de snippets depende da inspeção do código que a introduziu, não do score sozinho.

## 5. O que esta evidência permite afirmar

- `ed963ec` contém três aprovações independentes da recipe corrigida na mesma classe de fixture, cada uma com judge 11/11 e verifier PASS.
- O rótulo de sucesso do executor não basta: a baseline `51631c1` também registrava DONE-VERIFIED/PASS, mas seus judges eram 9/11.
- A correção das operações e o executor restaurado produziram os resultados acima. Isso não demonstra que todos os endurecimentos acordados já foram implementados.
- Na revisão de código `ed963ec`, fallback LLM+JEV integrado à recipe, rc-check inicial, pós-condições estruturadas, captura por passo e gate automático 11/11 ainda não existem como prometidos pelo alvo v2.6. A tabela normativa está em [recovery-policy.md](recovery-policy.md).

## 6. O que não foi medido aqui

Os recibos usados nesta referência não sustentam conclusões sobre outra aplicação, variação estrutural da página, eliminação estatística de variância, taxa de reparo LLM+JEV, velocidade relativa, custo por run, redução de tokens ou qualidade de vídeo.

Não transportar para o SKILL.md os números de preço, latência, gravação ou stealth de narrativas antigas sem localizar o respectivo artefato commitado e delimitar sua condição experimental. A revisão documental atual não audita essas alegações antigas nem instala novos provedores.

## 7. Recuperação dos objetos para revisão externa

Executar somente como auditoria read-only do repositório:

```powershell
git show ed963ec:results/v22-logs/battery-p1.json
git show ed963ec:results/v22-logs/battery-p1-judge.json
git show 51631c1:results/v22-logs/battery-p1.json
git show 51631c1:results/v22-logs/battery-p1-judge.json
git show ed963ec:results/v22-logs/battery-v251-20261029-162410-p2.json
git show ed963ec:results/recipes/xt24ds7-recipe.json
```

Trocar o nome do piloto na consulta permite recuperar os outros recibos da mesma revisão. O executor de navegação não recebe essa consulta como ferramenta de decisão.


## Distribuição no GitHub

Os identificadores `ed963ec` e `51631c1` pertencem ao histórico original `browser-eval`; os comandos `git show` acima se aplicam àquele repositório, não ao histórico desta biblioteca. Cópias byte a byte, baseline e hashes estão no [pacote de proveniência](../evidence/README.md). Os recibos são apenas para auditoria externa posterior, nunca entrada do agente navegador.
