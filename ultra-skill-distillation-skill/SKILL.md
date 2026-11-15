---
name: ultra-skill-distillation-skill
description: "Destilar ou reestruturar skills extensas em procedimentos reutilizáveis, preservando obrigações e avaliando a candidata contra a versão original. Não usar para resumir texto comum, treinar pesos de modelos, otimizar apenas descrições ou julgar uma entrega sem alterar uma skill."
license: Apache-2.0
---

# Destilação de skills com avaliação independente

Destilar o procedimento, não suas garantias. O executor produz a candidata;
avaliadores examinam o resultado. MiniMax e DeepSeek foram avaliadores no
histórico deste ambiente, não são o algoritmo nem dependências obrigatórias.

## Procedimento

1. **Fixar o contrato e a origem.** Identificar a skill, versão/hash, consumidor,
   entrada normal e melhoria desejada. Congelar uma cópia da original, incluindo
   recursos, fora da candidata. Ler as decisões vigentes: uma versão menor não
   pode revogar exceções autorizadas. Concluir com baseline íntegra, limites de
   escrita e critério de sucesso em `assets/assessment-template.md`.
2. **Inventariar obrigações antes de editar.** Percorrer a fonte inteira e
   registrar IDs para gatilhos, entradas, saídas, pré-condições, ordem relevante,
   permissões, exceções, falhas, recuperação, exemplos indispensáveis e interfaces
   de helpers. Distinguir procedimento, exemplo e dado histórico; preservar
   licenças e atribuições. Concluir quando cada obrigação tiver fonte e uma
   verificação observável, sem inventar requisito a partir de preferência.
3. **Projetar e escrever a candidata.** Reimplementar a estrutura com uma função
   clara por skill. Manter o caminho comum e a ordem necessária em `SKILL.md`;
   detalhes condicionais em `references/`, saídas em `assets/` e automação estável
   em `scripts/`. Ligar cada recurso ao ponto de uso e resolver os links a partir
   do documento que os cita. Cortar redundância e narração, não condições de uso.
   Sem meta percentual de redução. Concluir com uma candidata separada e a
   matriz obrigação → localização → evidência completa.
4. **Verificar estrutura e comportamento.** Rodar o helper abaixo, o validador
   AgentSkills disponível e os testes relevantes preservados da original.
   Testar gatilhos positivos, near-misses e ao menos uma falha crítica plantada
   em cópia descartável. Executar a mesma tarefa e o mesmo modelo/provedor com
   original e candidata, mantendo ferramentas, entradas, budget e checks iguais
   dentro do par; não enfraquecer baseline. Se comparar variantes com JEV,
   explicitar JEV como variável, não atribuir seu efeito só à skill. Concluir
   com resultados por caso, inclusive regressões, nulos e não verificados.
5. **Avaliar independentemente e reconciliar.** Usar
   [references/evaluation.md](references/evaluation.md) e entregar a cada avaliador
   a mesma fonte, contrato, candidata identificada por hash e evidências.
   Separar executor, avaliador e responsável pela aceitação; em tarefa pequena,
   uma revisão com contexto restrito pode bastar. Dois modelos são opcionais,
   não votação de aprovação. Verificar achados na fonte atual antes de corrigir;
   após uma mudança, reavaliar os trechos afetados e seus hashes. Concluir com
   achados resolvidos e um veredicto justificado por evidência.
6. **Testar uso sem contexto privilegiado.** Um consumidor com contexto restrito
   recebe só a candidata e seus recursos, pré-requisitos declarados e uma tarefa
   representativa. Deve descobrir a entrada, acionar recursos e observar o
   resultado sem dicas do implementador. Registrar a primeira tentativa sem
   alterá-la para fabricar sucesso. Corrigir depois e repetir o teste afetado.
   Concluir quando a entrada normal funcionar, ou declarar o bloqueio preciso.
7. **Aceitar, aplicar e publicar dentro da autorização.** Aceitar apenas quando
   todas as obrigações do escopo estiverem atendidas ou substituídas por decisão
   explícita, sem regressão crítica e com prova de uso. Um caso não verificável
   gera aceitação parcial, não sucesso integral. Guardar rollback; nunca
   substituir a fonte antes do gate. Publicação, merge, instalação e ativação
   são transições separadas: executar somente as autorizadas e verificar cada
   resultado. Concluir com localização/versão, testes passados/falhos/não
   executados, limitações e próximo estágio, sem narrar todo o método.

## Helper de inspeção, sem escrita

Pré-requisito: Node.js 22 ou superior. Resolver os caminhos abaixo a partir
da pasta desta skill, não do diretório corrente da tarefa:

```text
node scripts/inspect.mjs <pasta-original> <pasta-candidata>
node --test scripts/inspect.test.mjs
```

Validação oficial, quando `uvx` já estiver disponível:

```text
uvx --from skills-ref agentskills validate <pasta-candidata>
```

O último componente dessa pasta deve coincidir com o campo `name`. Separar as
cópias como `original/<name>/SKILL.md` e `candidata/<name>/SKILL.md`, passando as
duas pastas `<name>` ao helper. O inspetor não substitui esse contrato do validador.

Não instalar dependências novas implicitamente. Se esse validador não estiver
disponível, usar o validador equivalente já declarado pelo projeto ou registrar
a etapa como não verificada, sem substituir validação por inspeção do helper.

Ambas as pastas precisam de `SKILL.md`. O helper retorna JSON com hashes de
bytes, inventário, tamanho do arquivo de entrada e tamanho do pacote inteiro,
arquivos adicionados/removidos e links locais quebrados. Rejeita links simbólicos,
pastas coincidentes/sobrepostas e pacotes acima dos limites documentados em
[references/evaluation.md](references/evaluation.md). Não chama modelos, não
executa código das skills e não decide equivalência semântica. Saída 0 significa
**inspeção estrutural concluída**, nunca "skill aprovada".

## Recursos e limites

- [assets/assessment-template.md](assets/assessment-template.md): contrato,
  rastreabilidade, comparação, achados e aceitação; copiar para a área da tarefa.
- [references/evaluation.md](references/evaluation.md): contrato do avaliador,
  falhas plantadas, critérios de decisão e limites do helper.
- [references/example.md](references/example.md): exemplo independente pequeno
  com caso aprovado e omissão crítica rejeitada, sem benchmark inventado.
- [references/provenance.md](references/provenance.md): origem e distinção dos
  mecanismos históricos. Não executar o optimizer legado como substituto.

Tokens, bytes e linhas são telemetria, não prova de qualidade. Mover texto para
referências pode reduzir a entrada sem reduzir o pacote. Em modelos gratuitos,
não usar tokens como teto de admissão. Registrar tempo, consumo por chamada/papel
e custo pago estimado somente com tarifas identificadas; nunca migrar para um
modelo pago silenciosamente. Não copiar credenciais para prompts ou relatórios.
Não impor gates históricos de autorização sobre as regras vigentes do usuário.
