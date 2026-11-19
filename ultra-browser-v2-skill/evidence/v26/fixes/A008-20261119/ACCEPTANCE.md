# Item6 A008, normalização de extração

Base4667a88. **Fulfilled nos formatos e consumidores exercitados**: loops reais
single/batch em Chromium local, decisões fixas em lugar de inferência, CLI de
extração e replay dos dois candidatos. Não é prova de modelo/provider/Hermes.

## Aceite por critério

| Critério | Código | Evidência |
|---|---|---|
| Single/batch geram ações equivalentes | scripts/recipe.py:43 delega a scripts/trace_recipe.py:26; mapeia cada row ao plano e omite suffix não executado; terminais exigem host completion | after-03.json 38/38, single_batch_equivalent, normal_extract_CLI_single/batch, normal_replay_single/batch; mesmas cinco ops type/select/click/wait/navigate e efeito público salvo name=A008,kind=B |
| Proveniência identifica fonte | trace_recipe.py:26 registra SHA/caminho/formato; operação referencia ação, campo exec bruto, encoding e ponteiro no documento decodificado | provenance_single/batch e provenance_pointers_resolve_single/batch; traces e candidatos próprios em after-03-inputs |
| Verificação separada do procedimento | trace_recipe.py:26 coloca asserts, directives observadas e verifier em verification; native_ops não contém verifier/assert/done; sem corte implícito no save | verification_separate_single/batch, expected_negative_preserved; recipe replay usa verifier público explícito, não executa o verifier copiado do trace |

Entrada, consumidores e compatibilidade foram mapeados antes em PLAN.md.
native_ops/intent/notes/source_trace permanecem compatíveis com run_recipe.
Sem fallback para extrator antigo que inferia sucesso/arquivo e cortava no save.
Legado sem confirmação de terminais fica excluído com motivo; candidato incompleto
exige revisão. Excluído não significa impossível ou falha de sistema legado.

Mudanças adicionais necessárias encontradas na prova:
- agent_loop.py:69 e :679: JSONDecoder lê objetos/listas aninhados, em vez da regex
  que perdia scope. Não muda provider nem decisão, só a interpretação da resposta.
- agent_loop.py registra host completion de wait/nav/upload em ambos os modos,
  sem mudar a operação executada. Transporte e inferência continuam separados.
- recipe.py:545: negativo explicitamente declarado pode avançar com recibo
  expected e blocked ou ausência exata esperada. Não aceita bloqueio comum.

## Tentativas e revisão

- after-01 **26/32**: parser single não leu scope aninhado e não executou click;
  identidade incidental em wait/nav provocou diferença. Defeitos reais, preservados.
- after-02 **33/34**: equivalência e replays principais passaram; replay negativo
  falhou porque disabled foi observado como ausência expected, sem blocked.
- after-03 **38/38**, hashes de fonte antes/depois idênticos. Inclui replay negativo,
  preservação tag/colon/scope/role, ausência esperada, ponteiros resolvidos e
  gates sintéticos de transport failure, plano não executado, terminais pendentes.
- Revisor nativo apontou quatro achados: negativo não reexecutável, pointer em exec
  string, tag ignorada, ausência esperada descartada. Todos corrigidos e revisados;
  parecer final sem bloqueador. Não contar conferência como nova bateria.
- a006-interrupted.json registra tentativa sem recibo conclusivo após interrupção.
  Partes produzidas preservadas. Nova tentativa usa a006-final.json e diretórios
  independentes. Não promover a tentativa interrompida a PASS.
- Regressões concluídas: a006-final.json **31/31**, a005-guards-final.json
  **51/51**, a002-final.json **20/20**, recipe-regression.json **31 testes, rc=0**.
  Recibos anteriores a005-guards/a002-regression também preservados, mas os finais
  são a referência após os últimos ajustes de produção.

## Limites

Extração é compilação de candidato, não certificação. Effect.verified=false do
trace permanece na proveniência; dispatch confirmado não vira efeito provado.
Verifier registrado é observação histórica, não autoridade para executar outro.
Postcondition local declarada continua no procedimento, verifier final separado.

Upload/reload na extração A008 têm prova sintética de recibos, não execução real
desses terminais pelo LLM. A prova real cobre type/select/click/wait/navigate,
cinco ops equivalentes com reuso local, e replay de negativo. Não executada bateria
histórica completa, inferência, judge privado ou transporte Hermes/runtime instalado.
Nenhum recibo anterior alterado; sem item7, push ou merge.
