# Recuperação: observar antes de repetir

Status: proposta documental para revisão do Hermes antes do SKILL.md v2.3. Regras normativas abaixo são o alvo v2.6; a tabela inicial separa o que existe no commit auditado do que ainda precisa de implementação.

## 1. O que está disponível em ed963ec

Fontes: [recipe.py](../scripts/recipe.py), [agent_loop.py](../scripts/agent_loop.py), [battery_pilot.py](../scripts/battery_pilot.py) e os recibos fixados em [recipe-schema.md](recipe-schema.md).

| Capacidade | Estado no código auditado |
|---|---|
| Re-resolver alvo a cada execução | Implementado no executor compartilhado |
| Espera de acionabilidade | Implementada com busy-wait JS; bloqueia callbacks da página e não equivale a espera assíncrona robusta |
| Recuperação local | Repete a mesma operação após nova observação; não há mudança de plano |
| Fallback LLM+JEV dentro da recipe | Não implementado; argumento `fallback_jev` não é usado |
| Interromper quando navegação inicial falha | Não implementado nesse commit; retorno de `harness()` é descartado |
| Upload | Tratado pelo host, com log de texto; o fluxo atual avança sem gate estruturado sobre o efeito |
| Verify persisted | Implementado em `agent_loop.verify()`: reload e consulta textual posterior |
| Falha anterior impede sucesso final | Não garantido; verifier `PASS` pode substituir resultado de falha |
| Captura por passo em recipe.py | Ausente nessa revisão restaurada; não há `--capture-dir` |
| Gate automático do judge na bateria | Não implementado no exit final, embora os recibos auditados sejam 11/11 |

Não apresentar rc-check, pós-condições estruturadas, captura ou fallback adaptativo como funcionalidades já entregues. O relato de intenção e o conteúdo de um commit são evidências diferentes.

## 2. Evidência de falha e recuperação

Todos os números desta seção vêm de objetos Git, não de estimativa:

| Revisão / recibos | Resultado observado | Interpretação permitida |
|---|---|---|
| `51631c1`, `battery-p1/p2/p3` | 19 passos por piloto; 9/11; verifier `PASS` | Procedimento incompleto apesar do rótulo DONE |
| `ed963ec`, `battery-v251-20261029-162410-p1/p2/p3` | 1/11 por piloto; eventos vazios; nenhuma mutação ou submit | As novas fixtures não receberam workflow válido |
| `ed963ec`, `battery-p1/p2/p3` | 22 passos por piloto; 11/11; `pass_=true`; uma mutação e um submit em cada | Recipe corrigida repetiu o workflow completo na classe de fixture |

Recibos da regressão, preservados com nomes próprios:

- p1: [log](../evidence/ed963ec/results/v22-logs/battery-v251-20261029-162410-p1.json), [judge](../evidence/ed963ec/results/v22-logs/battery-v251-20261029-162410-p1-judge.json).
- p2: [log](../evidence/ed963ec/results/v22-logs/battery-v251-20261029-162410-p2.json), [judge](../evidence/ed963ec/results/v22-logs/battery-v251-20261029-162410-p2-judge.json).
- p3: [log](../evidence/ed963ec/results/v22-logs/battery-v251-20261029-162410-p3.json), [judge](../evidence/ed963ec/results/v22-logs/battery-v251-20261029-162410-p3-judge.json).

Os eventos vazios demonstram ausência de efeitos nessas fixtures. Sozinhos, não provam a exceção exata do harness. A regressão de geração de código foi diagnosticada pela inspeção dos snippets da reescrita: newlines literais escapados e URL sem aspas. O conserto adotado foi restaurar o executor funcional; não atribuir essa causa à recipe de 22 operações.

## 3. Fluxo operacional alvo

```text
observar estado atual
→ validar identidade e precondição
→ resolver alvo único e acionável
→ executar uma vez
→ aguardar pós-condição sem bloquear a página
→ registrar resultado e evidência
→ avançar, reparar localmente ou encerrar com falha explícita
```

Cada tentativa deve registrar operação, alvo semântico, estado anterior relevante, retorno da ferramenta, efeito observado e motivo da decisão seguinte. Ausência de erro de ferramenta não significa sucesso da aplicação.

## 4. Decisão por classe de falha

| Situação | Próxima ação autorizada | Condição para avançar |
|---|---|---|
| Elemento temporariamente ausente | Aguardar de forma não bloqueante e obter snapshot novo | Alvo único e acionável no contexto correto |
| Label ambíguo ou ID mudou | Resolver por escopo/papel/nome; se necessário pedir reparo LLM+JEV | Identidade inequívoca, sem fallback posicional cego |
| Par operação/alvo incompatível | Replanejar antes de executar | Operação compatível com tag e estado do alvo |
| Ferramenta retornou sucesso, efeito ainda não apareceu | Aguardar pós-condição | Efeito da aplicação confirmado |
| Efeito já ocorreu, mas recibo foi perdido | Reaproveitar estado observado, sem repetir escrita | Pós-condição específica já satisfeita |
| Validação negativa exigida pelo objetivo | Enviar entrada inválida e observar erro após submit | Erro esperado visível, permanecendo na etapa correta |
| Erro de validação inesperado | Corrigir apenas o campo relacionado; reobservar | Erro resolvido e transição confirmada |
| Upload retornou `pending` | Executar terminal no host e observar anexo | Confirmação do anexo na aplicação |
| Navegação ou identidade da sessão falhou | Interromper ações; restaurar navegação e conferir URL/runId antes de continuar | Página corresponde à tarefa e à fixture certas |
| Save com resultado incerto | Consultar resultado visível; não reenviar automaticamente | Registro salvo confirmado ou falha explicitamente diagnosticada |
| Falha de sintaxe/transporte do harness | Parar o fluxo e corrigir a geração/chamada | Checagem local do código e resposta válida antes de retomar |

Tentativas limitadas e deadlines devem ser explícitos na execução e nos logs. A espera ocorre no host ou por mecanismo assíncrono suportado, não por busy-loop dentro da página.

## 5. Quando usar LLM+JEV

Usar operações nativas enquanto houver recipe compatível, alvo resolvível e pós-condições verificáveis. Chamar LLM+JEV quando uma mudança real de estado invalidar o trecho previsto, houver ambiguidade recuperável ou a próxima ação não estiver coberta pela recipe.

O reparo recebe:

- Objetivo local e limites do objetivo global.
- Snapshot atual com estado explícito e elementos do contexto ativo.
- Histórico de ações executadas, falhas e efeitos observados.
- Ponto de retomada e condição verificável para retornar à recipe.

Não alimentar o histórico com um valor apenas gerado como se tivesse sido digitado. Não reenviar a mesma ação sem incorporar seu resultado anterior.

O reparo é local: não chamar diretamente um loop que navega novamente para o início. Não alterar a recipe congelada durante a bateria; registrar ações de reparo separadamente e distinguir execução nativa de execução assistida. A evidência atual não mede uma taxa de sucesso desse fallback ainda não implementado.

Se uma nova recipe for aprendida, salvá-la como candidato com proveniência para validação posterior. Não promovê-la silenciosamente enquanto executa o piloto.

## 6. Terminais e efeitos que exigem cuidado

- Upload: resolver o input correto, executar a transferência e confirmar anexo. Disparar evento adicional somente quando necessário e no alvo selecionado; não despachar `change` em todos os inputs como política genérica.
- Navegação e reload: invalidam referências anteriores; conferir retorno, URL/identidade e obter snapshot novo antes de seguir.
- Wait: consumir o prazo declarado e reobservar; não contar espera como progresso.
- Save: não considerar clique como persistência. Confirmar o save, depois recarregar e verificar o resultado completo. Nunca usar outro save como prova de que o primeiro aconteceu.

No exemplo corrigido, a primeira revisão deve conter o título original; após voltar e editar, a segunda deve conter o revisado. Esperar pelo título revisado na primeira revisão impede o próprio workflow correto. Aguardar modal aberto por `dialog#modal[open]`, não apenas existência de texto num dialog fechado.

## 7. Resultado terminal e verificação

Regra alvo:

```text
sucesso do executor = todos os passos obrigatórios confirmados
                      E verificação independente pós-reload aprovada

aceitação da bateria = sucesso do executor em cada piloto
                       E judge externo 11/11 em cada piloto
```

Verificar campos finais, vínculo e evidência do anexo. Texto que contém um prefixo do título não comprova o registro completo. Preservar qualquer falha anterior; um verifier final permissivo não deve apagá-la.

O agente navegador não lê arquivos privados do judge, não importa seu módulo e não consulta ground truth para escolher ações. Somente o validator externo associa os recibos read-only ao run após a execução.

## 8. Preflight e evidência para a próxima implementação

Antes de usar navegador após mudança do gerador de código, validar em memória a sintaxe dos snippets Python gerados, incluindo navegação, upload e captura quando existir. Um parse do módulo principal não detecta erro dentro de strings executadas depois. Serializar argumentos e preservar newlines reais.

Para novas baterias, criar diretório por runId e registrar revisão do código, hash da recipe, parâmetros, falhas, reparos e resultado do judge. Não sobrescrever históricos. Se houver mudança de recipe ou executor, iniciar outra bateria identificada.

Quando captura voltar ao executor, registrar frames de terminais, falhas e estado pós-reload; erro de captura deve aparecer no recibo. Frames por passo não são gravação contínua. Não afirmar cobertura de vídeo ou duração com base nos logs atuais sem artefato próprio.

A assinatura do Hermes sobre a convergência técnica não equivale à aprovação desta redação ainda em revisão. Estes documentos não alteram o SKILL.md, não publicam a skill e não implementam as regras propostas.


## Distribuição no GitHub

Os identificadores `ed963ec` e `51631c1` pertencem ao histórico original `browser-eval`; os comandos `git show` acima se aplicam àquele repositório, não ao histórico desta biblioteca. Cópias byte a byte, baseline e hashes estão no [pacote de proveniência](../evidence/README.md). Os recibos são apenas para auditoria externa posterior, nunca entrada do agente navegador.
