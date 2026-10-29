# Recipe: formato, proveniência e aceitação

Status: proposta documental para revisão do Hermes antes da integração ao SKILL.md v2.3. Não implementa um novo parser nem promove funcionalidades planejadas a disponíveis.

## 1. Base de evidência

Fontes fixadas no commit `ed963ec`, consultadas com `git show`, não apenas no worktree compartilhado:

- [Recipe corrigida](../evidence/ed963ec/results/recipes/xt24ds7-recipe.json).
- [Executor](../scripts/recipe.py) e [validator da bateria](../scripts/battery_pilot.py).
- [Trace original](../evidence/ed963ec/results/v22-logs/xt24ds7-jev-deepseek.json).
- Recibos da bateria abaixo. Os links relativos apontam ao checkout; a revisão indicada é necessária para recuperar a evidência imutável.

| Piloto | runId do judge em ed963ec | Log | Judge | Passos registrados | Resultado |
|---|---|---|---|---|---|
| p1 | `hermes-battery-p1-1793302541` | [execução](../evidence/ed963ec/results/v22-logs/battery-p1.json) | [recibo](../evidence/ed963ec/results/v22-logs/battery-p1-judge.json) | 22 | 11/11, `pass_=true` |
| p2 | `hermes-battery-p2-1793302663` | [execução](../evidence/ed963ec/results/v22-logs/battery-p2.json) | [recibo](../evidence/ed963ec/results/v22-logs/battery-p2-judge.json) | 22 | 11/11, `pass_=true` |
| p3 | `hermes-battery-p3-1793302790` | [execução](../evidence/ed963ec/results/v22-logs/battery-p3.json) | [recibo](../evidence/ed963ec/results/v22-logs/battery-p3-judge.json) | 22 | 11/11, `pass_=true` |

Cada log registra `RECIPE-DONE-VERIFIED`, verifier `PASS`, 21 resultados `ok:true` e uma operação de upload com resultado inicial `pending`. O upload é confirmado separadamente por `upload-ok ATT=Anexado: fixture-evidence.txt · 32 bytes` e pelo check independente `upload=true`. Não descrever isso como 22 resultados `ok:true`.

Cada judge registra `mutationCount=1`, `submitAttempts=1` e todos os checks verdadeiros, inclusive `single_record`, `fields`, `ordered_workflow` e `persisted_read`.

A recipe JSON commitada tem 22 operações, campo `version: "2.5.1"` e SHA-256 dos bytes do objeto Git:

```text
5defc9c2bf86ec8357cc16c063d03bb18ce6554bfd7848ca18e1f409d971fd71
```

Esse hash identifica o artefato commitado. Os logs não registram hash por execução; não tratá-lo como medição realizada em cada piloto. As sequências de operações dos pilotos podem ser comparadas com a recipe, sem substituir a futura telemetria de hash.

Recuperação reproduzível, a partir da raiz do repo:

```powershell
git show ed963ec:results/recipes/xt24ds7-recipe.json
git show ed963ec:results/v22-logs/battery-p1.json
git show ed963ec:results/v22-logs/battery-p1-judge.json
```

## 2. Formato efetivamente aceito

O executor atual lê `native_ops`; não valida formalmente uma versão de schema.

| Campo | Significado atual | Limite |
|---|---|---|
| `version` | Texto produzido pelo autor/extrator | Não seleciona comportamento do executor |
| `intent` | Descrição do objetivo | Não reparametriza os valores automaticamente |
| `source_trace` | Caminho do trace de origem | Não prova que todas as operações vieram dele |
| `native_ops` | Lista ordenada de operações | É o procedimento executado |
| `notes` | Notas de compilação ou correção | Não são instruções executáveis |

Cada operação da recipe usa `op`, `id`, `label` e `value`. `run_recipe()` converte `op` em `action` e, quando há `id`, remove `label` antes da chamada ao executor compartilhado. O alvo é resolvido novamente no DOM; a posição antiga não é uma identidade persistente.

Operações suportadas pelo fluxo atual:

| Operação | Efeito e fronteira de execução |
|---|---|
| `type` | Preencher e despachar eventos; confirmar o valor e efeito na aplicação |
| `select` | Resolver texto/value da opção; confirmar a seleção |
| `click` | Acionar o alvo; `ok:true` não prova resposta assíncrona concluída |
| `upload` | Retornar controle ao host para anexar; resultado `pending` não é conclusão |
| `navigate`, `reload` | Retornar controle ao host e obter novo estado depois da navegação |
| `wait` | Retornar controle ao host para espera; não é prova de progresso |

O executor também oferece asserts no template compartilhado. Não confundir disponibilidade no template com extração completa e validada desses asserts a partir de qualquer formato de trace.

## 3. Proveniência da correção

O trace original tem `result: null`, não contém clique em `back` nem edição de `title2`. A extração até o primeiro save produziu 19 operações. Logo, as 22 operações são uma recipe revisada a partir desse trace, não uma demonstração completa extraída sem intervenção.

Após a primeira revisão, a correção substitui o save original por:

```text
click #back
type #title2 = Plano WEB DEMO-024 revisado
click #review
click #save
```

São quatro operações no trecho substituto e acréscimo líquido de três. O save continua único. Os eventos de revisão e alteração de título foram observados pelo judge nos pilotos corrigidos.

Baseline histórico: em `51631c1`, os recibos de `battery-p1/p2/p3` registram 19 passos, verifier `PASS`, mas apenas 9/11 no judge. `fields` e `ordered_workflow` são falsos; `email_invalid_blocked` já está presente. Usar `git show 51631c1:results/v22-logs/battery-p1-judge.json` para recuperar essa versão, pois o mesmo caminho em `ed963ec` contém a bateria corrigida.

Uma nova extração não deve sobrescrever a recipe revisada. Produzir candidato separado, preservar o trace e declarar patches de autoria. Não inventar passos ausentes para fingir uma extração fiel.

## 4. Extensões propostas para v2.6, ainda não implementadas

O formato futuro deverá separar:

- `provenance`: revisão/hash do trace, referências aos passos observados e patches com autor e motivo.
- `inputs`: demanda, filtros, títulos, equipe, ambiente e arquivo, tipados e derivados da solicitação autorizada.
- `steps`: alvo semântico com escopo, operação, parâmetros, precondição, pós-condição e política de recuperação.
- `verification`: prova final após reload, separada do corte de navegação desnecessária após salvar.
- `validation`: referência aos recibos e estado `candidate` ou `validated`, atribuído pelo processo externo de validação, não pelo modelo.

Esses nomes descrevem o contrato proposto, não chaves já consumidas por `recipe.py`. Sua implementação exige revisão conjunta de parser, executor e validator.

O extrator deverá normalizar `steps/parsed` e `cycles/plan`, mapear somente ações efetivamente executadas e confirmar terminais por seus recibos. Uma validação negativa esperada deve ser preservada quando o erro da aplicação foi observado. Um upload pendente não deve ser promovido a sucesso sem confirmação.

O compilador genérico não deve embutir DEMO-024, título revisado nem a sequência interna do judge. Esses requisitos pertencem ao objetivo público e ao exemplo específico.

## 5. Gate de aceitação acordado

Reexecutar não é regravar. Executar a mesma recipe congelada em três fixtures novas é obrigatório; gerar outra demonstração ou editar o procedimento entre pilotos invalida a unidade daquela bateria.

Para uma nova promoção:

1. Fixar revisão do executor, hash da recipe e parâmetros antes de iniciar.
2. Criar runIds distintos; conferir readiness e identidade da página antes de agir.
3. Exigir todos os passos necessários confirmados, resultado `RECIPE-DONE-VERIFIED` e verifier pós-reload `PASS`.
4. Exigir judge 11/11 e `pass_=true` em cada piloto, sem média compensatória. Judge e executor são processos separados.
5. Exigir um registro, uma mutação, um submit, upload válido e workflow completo em cada recibo.
6. Preservar todos os resultados, inclusive falhas, com nomes por runId. Nunca sobrescrever recibos anteriores.
7. Registrar hashes por run, reparos, tempos, consumo e evidência de captura quando disponível; não preencher telemetria ausente com estimativas apresentadas como medição.

O commit `ed963ec` comprova os três resultados 11/11 acima. Não comprova que o validator já implementa todos esses gates: o código ainda decide seu exit por presença de `DONE` e usa verifier textual menos restritivo. Os recibos independentes sustentam a aprovação observada, não o exit code isolado.

## 6. Fronteira de generalização e acesso ao judge

A evidência cobre repetição da tarefa na mesma classe de fixture. Não comprova outra aplicação, mudança de IDs, labels ambíguos, paginação diferente, arquivo diferente, canvas ou iframes.

O executor observa somente interface e resultados normais da tarefa. É proibido ler ou importar estado privado, arquivos de runs ou implementação do judge para decidir ações. O validator externo pode consultar o judge após a execução e associar o recibo ao run correto. A documentação não concede esse acesso ao agente navegador.

Política operacional complementar: [recovery-policy.md](recovery-policy.md).


## Distribuição no GitHub

Os identificadores `ed963ec` e `51631c1` pertencem ao histórico original `browser-eval`; os comandos `git show` acima se aplicam àquele repositório, não ao histórico desta biblioteca. Cópias byte a byte, baseline e hashes estão no [pacote de proveniência](../evidence/README.md). Os recibos são apenas para auditoria externa posterior, nunca entrada do agente navegador.
