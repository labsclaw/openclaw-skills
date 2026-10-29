# Verificação e evidência

Status: referência documental da proposta de SKILL.md v2.3, para revisão do Hermes. Fonte de comportamento: código de `ed963ec`. Não altera executores nem concede acesso do navegador ao judge privado.

## 1. Separar três decisões

| Decisão | Quem observa | Evidência suficiente para aquela decisão |
|---|---|---|
| A ferramenta executou? | Executor e host | Retorno estruturado, erro de processo e resultado do terminal |
| A aplicação atingiu o objetivo? | Agente navegador pelo canal normal da tarefa | Estado resultante observado e confirmação após reload quando há persistência |
| O benchmark foi aceito? | Validator externo, depois da execução | Recibo independente do judge associado ao run correto e gate completo |

Nenhuma decisão substitui as demais. Clique com `ok:true` não prova conclusão do save; presença de texto não prova o registro completo; rótulo DONE não substitui um judge independente.

O executor não lê os arquivos de runs, não importa o módulo do judge e não usa ground truth privado para escolher ações ou verificar seu próprio desempenho. Links de recibos nesta documentação são evidência histórica para revisão externa, não autorização para consultá-los durante navegação.

## 2. Verifiers efetivamente disponíveis

Fonte: `ed963ec:ultra-browser-v2/scripts/agent_loop.py`, função `verify()`.

| Spec aceita pelo loop | Comportamento no commit | Limitação |
|---|---|---|
| `text_contains:...` | Procura texto no body | Não garante campo/registro específico |
| `url_contains:...` | Procura trecho na URL | Não comprova resultado da aplicação |
| `title_contains:...` | Procura trecho no título da página | Não é o título de um registro de negócio |
| `field_value:selector\|expected` | Confere igualdade ou presença de trecho no valor/texto | Pode aceitar valor maior que o esperado |
| `persisted:...` | Solicita reload e procura texto no body depois da espera | Não confere automaticamente todos os campos, vínculo ou conteúdo do anexo; não impõe gate robusto sobre retorno do reload |

O arquivo [verifier.js](../scripts/verifier.js) é um helper separado com specs simples. Não contém `persisted`, não é um `verifier.py` e não é importado automaticamente pelo `verify()` inline do loop. Para usá-lo isoladamente seria necessário substituir seu `VERIFY_SPEC` no chamador.

O retorno de `verify()` é inferido pela presença de PASS no stdout/erro do harness. Não documentar isso como protocolo estruturado com validação estrita de processo.

O [battery_pilot.py](../scripts/battery_pilot.py) do commit usa `persisted:Plano WEB DEMO-024`, sem exigir o sufixo revisado. A avaliação externa é que confirma `fields=true` nos pilotos corrigidos. A checagem textual isolada já passava na baseline incompleta.

## 3. Pós-condições desejadas, ainda não automatizadas

As regras desta seção são política de execução/revisão para a implementação futura, não APIs disponíveis no executor auditado.

- Após input/select: observar o valor final relevante e seu efeito na aplicação.
- Após validação negativa: observar erro esperado depois do submit, permanecendo na etapa correta; não confundir erro de transporte com erro de negócio exigido.
- Após upload: observar anexo recebido; não avançar apenas com `pending` ou retorno do helper.
- Após revisão: confirmar modal aberto e conteúdo correspondente à fase atual. Na tarefa de exemplo, revisão inicial usa o título original e revisão posterior usa o revisado.
- Após save: observar registro salvo, sem reenviar para obter confirmação.
- Após reload: comparar campos finais, vínculo e evidência do anexo pelo canal normal da tarefa.

Um snapshot antigo, texto num dialog fechado ou timer transcorrido não provam essas pós-condições. O mecanismo de espera não bloqueante por condição ainda é alvo v2.6.

## 4. Gate externo acordado

Para cada piloto da bateria da tarefa avaliada, a revisão externa exige:

```text
passos obrigatórios confirmados
E resultado RECIPE-DONE-VERIFIED
E verifier PASS depois do reload
E judge pass_=true e todos os checks aprovados
E identidade do run coerente entre execução e recibo
```

O acordo exige três fixtures novas sem editar ou regravar a recipe entre pilotos e judge 11/11 em cada uma. É um critério de aceite definido pela revisão, não uma taxa estatística inferida. A observação que o atende está em `ed963ec:results/v22-logs/battery-p1/p2/p3.json` e respectivos `-judge.json`: três aprovações com 11/11, uma mutação e um submit em cada run. Caminhos e runIds completos em [evaluation-results.md](evaluation-results.md).

Não executar o script histórico da bateria inalterado para aplicar esse acordo: ele ainda sobrescreve nomes `battery-p{n}` e decide exit pela presença de DONE, sem condicionar esse exit ao judge. Preservar saídas únicas e conferir o recibo é responsabilidade do procedimento externo até o código ser endurecido.

Um verifier final PASS não pode apagar falha anterior na política de aceite. O executor atual permite essa substituição, portanto precisa de auditoria dos passos e do recibo; não basta confiar no seu campo `result`.

## 5. Envelope recomendado de recibo

Estes campos são requisitos documentais para o processo externo/futura implementação. Não são todos emitidos pelos scripts atuais.

| Grupo | Campos a registrar |
|---|---|
| Identidade | runId, objetivo, origem da página, recipe e parâmetros |
| Proveniência | commit do código, hash dos bytes da recipe e referência do trace/patches |
| Execução | modo, passos, alvo resolvido, retorno da ferramenta e efeito observado |
| Recuperação | tentativas, erros, decisão tomada, ponto de retomada e uso de LLM+JEV quando realmente ocorreu |
| Terminais | operação pendente, resultado do host e confirmação na aplicação |
| Verificação | spec, reload observado, resultado e limitações da prova |
| Aceite externo | runId do judge, checks, pass_, contadores e referência do recibo |
| Telemetria | tempos, consumo por chamada/papel e custo somente quando medidos com fonte identificada |
| Evidência visual | caminhos, timestamps e erros de captura, se houver captura real |

Se um campo não foi registrado, declarar desconhecido. Hash calculado sobre a recipe commitada não é telemetria por execução. A ausência de chamadas de modelo no caminho nativo não autoriza inventar contagem medida de tokens ou custo por run.

Não registrar credenciais, tokens de sessão ou conteúdo sensível desnecessário. Cada artefato novo deve ter destino único ligado ao runId. Recibo antigo nunca é sobrescrito; mudança de recipe ou executor inicia outra bateria identificada.

## 6. Captura: recurso disponível versus evidência entregue

Fonte de capacidade: `ed963ec:ultra-browser-v2/scripts/agent_loop.py` aceita `--record` e chama o gravador do harness. Isso não prova que todos os runs foram gravados com sucesso ou que algum vídeo cobre o workflow completo.

O `recipe.py` restaurado em `ed963ec` não aceita `--capture-dir`. A bateria auditada não registra uma captura por passo como parte de seu gate. Não copiar instruções de captura de outra revisão e apresentá-las como disponíveis nesse executor.

Existe [screencast_rec.py](../scripts/screencast_rec.py), um exemplo separado de polling e render. Sua existência não comprova FPS, duração, tamanho, cobertura ou ausência de disputa de IPC em qualquer piloto. Não iniciá-lo automaticamente como se estivesse integrado à recipe.

Quando houver artefato próprio, declarar qual método foi usado: frames por passo, polling ou gravação do harness. Diferenciar vídeo de estados e gravação contínua. Erros e lacunas de captura fazem parte do recibo e não podem ser silenciados no relatório final.

## 7. Checagem proporcional antes de entregar

- Conferir cada alegação quantitativa contra o objeto Git e caminho citados, não apenas a mensagem de commit ou narrativa antiga.
- Validar links e identidade dos recibos; os mesmos nomes de arquivo têm conteúdos diferentes entre revisões.
- Se houver mudança no gerador de snippets, conferir sintaxe do código gerado, não somente parse do módulo que contém as strings.
- Não reexecutar navegador ou bateria para validar uma edição exclusivamente documental; usar os recibos commitados e declarar que não houve nova execução.
- Só considerar esta redação aprovada após revisão explícita do Hermes; assinatura de convergência técnica anterior não publica a skill.

Políticas relacionadas: [recipe-schema.md](recipe-schema.md), [recovery-policy.md](recovery-policy.md) e [evaluation-results.md](evaluation-results.md).


## Distribuição no GitHub

Os identificadores `ed963ec` e `51631c1` pertencem ao histórico original `browser-eval`; os comandos `git show` acima se aplicam àquele repositório, não ao histórico desta biblioteca. Cópias byte a byte, baseline e hashes estão no [pacote de proveniência](../evidence/README.md). Os recibos são apenas para auditoria externa posterior, nunca entrada do agente navegador.
