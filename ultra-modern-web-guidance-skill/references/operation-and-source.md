# Operação e origem

## Dependências e recuperação

- Verificar `node --version` e disponibilidade de npm. Node >=22 é requisito upstream.
- A ferramenta de shell do runtime deve permitir executar o comando; a skill não
  concede permissões, instala shell ou depende de um nome específico de ferramenta.
- Se uma execução exceder o timeout, inspecionar processo e saída antes de repetir.
  Erros de rede, permissões e pacote inexistente exigem diagnósticos diferentes.
- `npx --offline` só ajuda se pacote e dependências já estiverem em cache. Não é um
  modo que baixa guias ausentes sem rede. Não desativar TLS nem contornar controles.
- Alternativa sem CLI: abrir o repositório oficial ou documentação primária com a
  ferramenta web disponível e ler o guia específico. Não pressupor web_fetch instalado.
  No snapshot inspecionado, guias ficam em `skills/modern-web-guidance/guides/`.
  Usar a árvore ou busca do repositório para encontrar o arquivo; não adivinhar caminhos.
- `DISABLE_TELEMETRY=1` desativa a telemetria do CLI. O npm ainda acessa seu registry.
  Não mudar perfil global do shell nem configuração persistente para essa finalidade.

## Versões e atualização deliberada

CLI verificado: pacote npm `modern-web-guidance@1.0.0` em 2026-11-15.
O pin evita executar uma versão nova não revisada; não congela a web nem garante
que todo dado retornado seja recente. Guardar data da consulta e guias lidos.
O argumento de busca `--skill-version 2026_11_09-5bcc021b` identifica a revisão
da instrução upstream, não é um filtro de Baseline nem uma versão npm.

Ao atualizar este adaptador, verificar metadados npm, engine, comandos e contrato de
saída contra o upstream; repetir busca e recuperação reais e atualizar os exemplos
e a proveniência juntos. Não mudar para `@latest` silenciosamente durante uma tarefa.

## Fontes e licenças

- Distribuição: <https://github.com/GoogleChrome/modern-web-guidance>
- Revisão inspecionada: `4dd968349e54ca45a05dd5c818fb035c9054b022`.
- Instrução adaptada: <https://github.com/GoogleChrome/modern-web-guidance/blob/4dd968349e54ca45a05dd5c818fb035c9054b022/skills/modern-web-guidance/SKILL.md>.
- Desenvolvimento do upstream: <https://github.com/GoogleChrome/modern-web-guidance-src>.
- Documentação: <https://developer.chrome.com/docs/modern-web-guidance>.

Adaptação LabsClaw para OpenClaw: comandos multiplataforma, telemetria desativada,
CLI versionado, escopo de execução explícito, falha observável e relato proporcional.
Não reproduz a instalação de plugins nem a exigência upstream de aprovação antecipada
universal ou seção final com formato fixo. Mantém busca, leitura integral, aplicação,
compatibilidade, verificação e varredura restrita à modernização ampla.

A instrução upstream e seu software são Apache-2.0; cópia canônica em `../LICENSE`.
Os guias upstream são CC-BY-4.0 e podem conter atribuições adicionais de MDN e padrões.
Não são distribuídos neste pacote: são recuperados na execução. Preservar suas
atribuições caso um trabalho futuro copie ou redistribua guias. Não alegar endosso
da Google ou das equipes que mantêm o upstream.
