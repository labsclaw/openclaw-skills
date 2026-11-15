# Aceitação: Modern Web Guidance para OpenClaw

## Fontes e limites

Pedido: criar uma skill OpenClaw baseada em GoogleChrome/modern-web-guidance.
Fonte fixada em `4dd968349e54ca45a05dd5c818fb035c9054b022`;
adaptador em `ultra-modern-web-guidance-skill/`. CLI npm `1.0.0`.
Runtime OpenClaw não alterado. Consulta inicial `skills info` confirmou ausência
da nova skill. Workshop unmanaged; publicação não certifica instalação.

## Requisito e evidência

| Obrigação | Implementação/evidência | Estado |
| --- | --- | --- |
| Skill portátil OpenClaw | SKILL.md, metadata.openclaw.requires.bins, comandos Windows/POSIX | Implementado; POSIX não executado localmente |
| Guias sob demanda | search, seleção por descrição e retrieve | Busca e recuperação executadas em Windows |
| Evitar contexto truncado | Ler arquivo temporário integralmente | retrieve dialog retornou arquivo de 220 linhas, lido integralmente |
| Compatibilidade e fallbacks | Política explícita prevalece; Baseline e fallback por recurso | Instruções presentes; sem teste de app/browser nesta entrega |
| Modernização sem expansão de escopo | legacy-scan apenas para pedido amplo, confirmar rubricas e preservar fallback | CLI executado em assets upstream: 0 achados, 35 regras/33 guias; não prova cobertura completa |
| Reutilização e licença | Apache canônica, proveniência e aviso de corpus CC-BY-4.0 não empacotado | Origem e limites declarados |
| Roteamento restrito | 3 positivos e 4 negativos no catálogo de fixtures | Fixtures sintéticas, não benchmark semântico |

## Prova de uso operacional

Ambiente: PowerShell, Node v26.12.1. `DISABLE_TELEMETRY=1` em cada processo.

1. Comando documentado `search "confirmation modal dialog"` retornou `dialog`,
   `declarative-dialog-popover-control`, `accessibility` e outros IDs reais.
2. `retrieve "dialog"` retornou caminho temporário, 12,1 KB/220 linhas.
   Leitura confirmou regras de showModal, foco, returnValue e fallback por browser.
   Não foi criada uma aplicação, nem alegada compatibilidade observada de navegador.
3. `search "responsive container layout"` retornou `responsive-design`,
   `css-layout`, `size-aware-styling` e outros IDs pertinentes.
4. `legacy-scan` reconheceu a pasta de assets upstream e emitiu JSON válido com
   cobertura limitada explícita. Zero achados nessa pasta não certifica um projeto.

Revisão manual pela entrada normal da candidata: confirmação modal segue busca e
retrieve, sem varredura; pedido de relatório amplo permite scan sem editar; ajuste
SQL, tsconfig isolado ou texto de título não ativa o procedimento. Esses percursos
são inspeção manual, não execução independente por outro modelo.

## Verificações de empacotamento

Validador oficial AgentSkills aceita frontmatter e nome. Foram ajustados durante a
criação o formato YAML de bins (lista em bloco, por compatibilidade do validador)
e um erro sintático no script temporário de geração de metadados, que não é distribuído.
Catálogo, inventário, licenças, testes de helpers e CI são gates separados.
Não há helper novo, corpus copiado ou instalação de plugin upstream.
Fixture negativa de licença executada: remover temporariamente a referência à
licença do adaptador em THIRD_PARTY_NOTICES produziu erro; após restaurar os bytes,
o gate voltou a passar. Testes do catálogo portátil: 2/2; fixtures de roteamento: 8/8.

Modelo de roteamento: não executado; status `not-run`, 0/0 no registry. Não houve
medição de ganho em qualidade, tokens ou velocidade. Sync: `repository-only`.
