# Aceitação: ultra-skill-distillation-skill

## Escopo e autorização

Pedido de 14/11/2026: empacotar o procedimento em skill e publicar no GitHub
LabsClaw. Correção do usuário incorporada: MiniMax/DeepSeek são exemplos de
avaliadores do resultado, não o mecanismo nem modelos obrigatórios.

Conteúdo e helper originais Apache-2.0. Não foram copiados prompts, fixtures ou
implementações de terceiros. O optimizer heurístico legado não é executado.
Publicação no repositório e instalação no runtime são estados separados;
este trabalho publica o pacote, sem instalar ou ativar novas regras no runtime.

## Requisito e evidência

| Requisito | Implementação | Evidência |
| --- | --- | --- |
| Preservar requisitos, exceções e decisões | Inventário antes de editar e matriz por ID | SKILL.md passos 1-3 e template |
| Executor separado do avaliador | Contrato de avaliação independente, modelos opcionais | Passo 5 e references/evaluation.md |
| Não confundir compressão com qualidade | Sem meta percentual; entrada e pacote medidos separadamente | Helper e teste de pacote crescente |
| Não promover score inventado | Helper declara semanticVerdict not-evaluated | Teste com candidata semanticamente incorreta |
| Manter baseline forte | Mesma tarefa/modelo/provedor/checks e casos negativos | Passo 4 e referências |
| Uso pela entrada normal | Consumidor separado, com contexto restrito | Prova de uso descrita abaixo |
| Publicação rastreável | Catálogo, fixtures e CI | Branch/PR e merge registrados no fechamento |

## Verificações locais

- `uvx --from skills-ref agentskills validate ultra-skill-distillation-skill`: válido.
- `node --test ultra-skill-distillation-skill/scripts/inspect.test.mjs`: 11/11 passados,
  zero falhas/skips na rodada local em Windows, Node 26.12.1.
- Helper não altera fonte/candidata, não chama modelos, rede ou código das skills.
- Revisão independente inicial encontrou dois P2: `file:`/unidade Windows
  tratados como URLs externas; parser de fences incapaz de aceitar fechamento
  maior que abertura. Ambos receberam correções e testes de regressão; nova
  verificação do revisor confirmou ambos encerrados, sem novo achado material.
  SHA-256 do helper reavaliado:
  `5f30357fac2590e34a31047a5f98d0b726d8b1cece1b4c2594f79d1b53e1e987`.
- Biblioteca: governança/catálogo, oito negativos do audit de roteamento e
  licenças passaram. O audit examina 78 manifests/72 nomes; 33 casos de gatilho
  do catálogo, sete deles novos. Aviso preexistente de tamanho em browser-v2.
- Validador oficial percorreu os 78 manifests: 73 válidos, incluindo a nova
  skill; cinco incompatibilidades preexistentes, todas sem diff contra a base:
  `ultra-browser-stealth-timing-skill` tem divergência pasta/name e quatro
  manifests (`ultra-gemini-image-skill`, `ultra-grok-image-skill`,
  `ultra-perplexity-pro-bridge-skill`, `ultra-x-stealth-skill`) usam a extensão
  OpenClaw `user-invocable`, não aceita pelo validador AgentSkills estrito.
  Isso não foi mascarado como 78/78 nem corrigido fora do escopo. O pacote novo
  passa tanto no validador oficial quanto no quick_validate da skill-creator.

## Prova de uso

Consumidor separado recebeu somente a entrada da skill e a tarefa de destilar
o exemplo de recibos, sem os scripts de teste ou histórico do implementador.
Primeira tentativa encontrou exemplo sem frontmatter e comando de validação não
explícito. Essa tentativa foi preservada. Correção posterior: frontmatter nos
dois exemplos e comando oficial com pré-requisitos explícitos no SKILL.md.
A segunda tentativa reproduziu falha real do validador porque a pasta se chamava
`candidata` e o frontmatter dizia `receipt-organizer`. Corrigida a entrada para
`original/<name>` e `candidata/<name>`, a terceira tentativa passou pelo caminho
documentado sem workaround. Tentativas anteriores não são sucesso retroativo.

Na tentativa final: helper positivo e negativo saíram 0, ambos com
`semanticVerdict: not-evaluated`; validador oficial passou offline. O consumidor
produziu planos sintéticos pareados para normal, ilegível+colisão e near-miss.
Omissão O2 (ilegível não move e vira pendência) foi rejeitada por leitura da fonte,
apesar de estruturalmente válida. O coordenador conferiu a candidata e essa
omissão separadamente. Nenhum recibo real foi movido, nem houve benchmark de
desempenho/custo; não reivindicamos revisão cega completa da candidata de recibos.

Hashes dos artefatos finais preservados na área local de teste:

- Fonte: `ba933f555a4a0d50c323874b286ce7215103ce056ac7cabefb9f8b70b925197a`.
- Candidata: `47536173d5ccf21481767e4a150e012176d8d853926076d03603045844f9e0b6`.
- Omissão: `fe6e3568e5e7f72b2cf17f40fa1da6fea029e56202d02b9304540451e75b6c00`.
- Relatório local do consumidor: `13244efd4db6aa5f9b802e682ed16ad5ed5ae1c272bcfb97117eff08106b86b7`.

Aceitação: pacote utilizável pela entrada corrigida no escopo sintético; revisão
de implementação encerrada sem achados materiais pendentes. Essas evidências
não certificam adoção em produção nem equivalência universal de qualquer futura
skill destilada.

## Limites

- Fixtures de roteamento cobrem três positivos e quatro near-misses desta skill;
  são testes estruturais, não acurácia medida de roteamento por modelo.
- O benchmark de roteamento via provedor não foi executado: `routingEval.status`
  permanece `not-run`. Uso e revisão nativa não são apresentados como esse eval.
- Não há claim de 50/50 testes históricos validarem este pacote novo, nem de
  percentual de economia de tokens/tempo. Não houve chamadas pagas dedicadas
  a MiniMax/DeepSeek, treinamento de pesos, migração de skills ou implantação.
- Linux será observado no CI do merge; macOS não foi exercitado nesta entrega.
