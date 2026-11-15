---
name: ultra-modern-web-guidance-skill
description: "Consultar e aplicar guias atuais da plataforma web ao implementar ou corrigir HTML, CSS e JavaScript de navegador, inclusive em frameworks, ou ao modernizar padrões legados. Não usar para backend, infraestrutura, configuração de ferramentas, mudanças só de texto ou automação de navegador sem desenvolvimento web."
license: Apache-2.0
metadata:
  openclaw:
    requires:
      bins:
        - node
        - npm
---

# Modern Web Guidance para OpenClaw

Adaptador do [GoogleChrome/modern-web-guidance](https://github.com/GoogleChrome/modern-web-guidance).
Antes de criar soluções ad hoc ou acrescentar bibliotecas para uma capacidade web,
consultar os guias relevantes. A busca é por necessidade, não uma carga integral do catálogo.
Não instala plugins de outros agentes nem altera configuração do OpenClaw.

## 1. Delimitar e consultar

Identificar o comportamento solicitado, o framework e a política de navegadores do
projeto. A política explícita prevalece; sem ela, usar as recomendações de fallback
dos guias: Baseline Widely available como padrão, não apenas suporte no Chrome.

Usar a ferramenta de shell disponível. Requer Node.js >=22, npm e rede no primeiro
uso. Os comandos executam o CLI oficial via cache do npm, sem instalação global.
Desativar telemetria no ambiente do comando; não enviar código privado, nomes de
clientes ou segredos nas consultas. Não executar o instalador interativo upstream.

PowerShell/Windows:

```powershell
$env:DISABLE_TELEMETRY='1'
npx.cmd -y modern-web-guidance@1.0.0 search "confirmation modal dialog" --skill-version 2026_11_09-5bcc021b
```

POSIX:

```sh
DISABLE_TELEMETRY=1 npx -y modern-web-guidance@1.0.0 search "confirmation modal dialog" --skill-version 2026_11_09-5bcc021b
```

Aplicar a variável também nos comandos seguintes (em POSIX, repetir o prefixo).
Fazer consultas de 2 a 5 palavras, em inglês, para uma capacidade por vez.
Traduzir intenção em primitiva: confirmação antes de apagar vira `confirmation
modal dialog`. Excluir nomes de framework, arquivos, rotas e domínio de negócio.
Separar, por exemplo, tabela responsiva e modo escuro em buscas distintas.

Escolher resultados pela descrição, nunca inventar IDs. Se forem vazios ou fracos,
reformular uma vez com a primitiva concreta; depois usar `list` uma vez se necessário.
Com resultado relevante, ir direto a `retrieve`, sem listar o catálogo inteiro.
Se não houver cobertura, informar a lacuna e usar documentação primária pertinente.

## 2. Recuperar e ler

```powershell
npx.cmd -y modern-web-guidance@1.0.0 retrieve "dialog"
```

Em POSIX usar o mesmo comando com `npx` e prefixo de telemetria. Recuperar os IDs
obtidos na busca, inclusive guias de disciplina relevantes, como acessibilidade,
sem carregar assuntos que não alteram a solução. O CLI aceita IDs separados por vírgulas.
Se retornar caminho temporário em vez do guia, ler o arquivo completo com a ferramenta
de leitura disponível, em intervalos quando preciso; stdout truncado não é leitura.

## 3. Aplicar à tarefa e verificar

- Preferir recursos nativos quando atendem ao requisito. Não trocar a stack ou
  remover dependências existentes sem verificar seus demais usos e a compatibilidade.
- Conferir a seção de suporte e fallback da capacidade específica. Baseline é
  interoperação, não garantia para WebViews, tecnologias assistivas ou browsers antigos.
  Não tratar um teste CSS positivo como prova de semântica correta em todos os engines.
- Preservar comportamento essencial com feature detection e fallback leve ou
  degradação realmente aceitável. Carregar polyfills apenas quando necessários;
  respeitar projetos que os proíbem, propondo alternativa nativa ou redesign compatível.
- Adaptar exemplos vanilla ao ciclo de vida do framework: proteger DOM no SSR,
  usar refs e IDs únicos por instância, limpar listeners e evitar conflito com o DOM
  gerenciado pelo framework. Não ocultar erros de tipos de forma indiscriminada.
- Verificar no fluxo normal o comportamento alterado, teclado, foco, nome acessível,
  estados de abertura/fechamento e fallback quando aplicáveis. Para animações,
  considerar movimento reduzido; para desempenho, medir a alteração antes de alegar ganho.
  Declarar navegadores e caminhos não testados, sem transformar leitura de guia em teste.

Ao entregar, citar os IDs/URLs consultados, a decisão não óbvia e o fallback aplicado,
com uma citação curta da regra quando útil. Creditar apenas orientação realmente lida
e usada nesta execução; recuperar novamente o guia se a evidência se perdeu.

## Modernização ampla, somente quando solicitada

`legacy-scan` não é pré-requisito para implementar, corrigir ou auditar um componente.
Usá-lo apenas em pedido aberto de varredura/modernização do código legado:

```powershell
npx.cmd -y modern-web-guidance@1.0.0 legacy-scan "<diretorio-do-projeto>" --json
```

Validar achados no código e nas rubricas `keepWhen`/`dropWhen`; descartar código de
terceiros, fallbacks necessários e falsos positivos. A varredura cobre só o subconjunto
com regras determinísticas (cerca de 20% no upstream inspecionado), não uma auditoria
completa. Em pedido só de relatório, não editar. Quando autorizado a modernizar,
recuperar os guias dos achados confirmados, editar no escopo e repetir a varredura nos
arquivos alterados. Fallbacks preservados podem continuar aparecendo: não buscar zero
achados como meta nem mudar o scanner para fabricar aprovação.

## Falhas, atualização e proveniência

Ver [operação e origem](references/operation-and-source.md) se a execução falhar,
se for preciso atualizar a versão ou inspecionar a licença. Não criar nova tentativa
enquanto o processo anterior ainda executa. Sem rede e sem cache, usar apenas fontes
disponíveis e declarar a data/limitação, nunca afirmar consulta atualizada.
