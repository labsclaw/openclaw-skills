# Avaliação do resultado, não do narrador

## Papéis e contrato

O executor destila. O avaliador lê o resultado, fonte e evidências; não reescreve
a candidata durante a avaliação. MiniMax e DeepSeek são exemplos de avaliadores
históricos, não uma dupla obrigatória nem autorização para chamadas pagas.
Usar um ou dois avaliadores conforme risco e benefício. Quando houver dois,
entregar o mesmo pacote sem revelar o parecer anterior. Não exigir outro agente
para mudanças pequenas; contexto restrito e comandos reproduzíveis podem bastar.

Pedido ao avaliador:

> Compare a fonte congelada e a candidata pelos IDs do contrato. Confirme cada
> suposta perda na fonte original e nas decisões posteriores. Procure gatilhos
> ambíguos, exceções perdidas, permissões ampliadas, ordens quebradas, falhas sem
> recuperação, dependências ocultas e evidência inventada. Confira links e rode
> checks autorizados. Não altere os artefatos. Entregue somente achados materiais
> com fonte/trecho, reprodução, impacto, correção mínima e incerteza; conclua
> aceito, parcial ou rejeitado. Se não puder verificar algo, identifique a lacuna.

Repetir avaliação relevante após mudança na candidata; o parecer vinculado ao
hash antigo não valida o novo. Claims de testes passam somente com recibos reais.
Nunca reduzir o rigor dos testes para favorecer uma candidata menor.

## Casos mínimos proporcionais

- Positivo: tarefa típica encontra o procedimento e produz a saída prometida.
- Near-miss: tarefa com palavras semelhantes não aciona o fluxo indevido.
- Permissão/exceção: preservar uma condição específica da fonte ou decisão vigente.
- Falha crítica plantada em cópia: remover deliberadamente uma obrigação do
  exemplo e comprovar que a revisão a rejeita. Não confundir esse teste sintético
  com performance em produção.
- Uso: executar pela entrada normal sem histórico do implementador.

Comparar pares com tarefa, modelo, provedor, ferramentas e checks equivalentes;
se uma variável mudar, separar as conclusões. Uma fonte original incompleta não
autoriza inventar a intenção. Melhorar o comportamento por decisão explícita é
uma alteração de escopo identificada, não "compressão sem perda".

Não há meta obrigatória de linhas, tokens ou dois pareceres favoráveis. A matriz
de obrigações, os casos observados e as limitações sustentam a aceitação.

## Semântica do helper

`inspect.mjs` lê diretórios e emite JSON em stdout. O chamador pode guardar a
saída fora da skill. Não modifica a original/candidata nem chama APIs ou shells.
SHA-256 é dos bytes brutos; CRLF/LF diferentes produzem hashes diferentes e não
demonstram mudança semântica. O digest de pacote inclui caminhos relativos e
hashes em ordem determinística. Congelar baseline/candidata antes da revisão e
rodar novamente se houver mudanças concorrentes; não é snapshot transacional.

Limites: até 500 arquivos regulares e 5 MiB por arquivo por pacote. Diretórios
`.git` e `node_modules` são ignorados como metadados/dependências não distribuídas;
um link simbólico nunca é seguido, mesmo com esses nomes. Se o pacote real exige
esses recursos ou excede os limites, registrar a inspeção como incompleta e usar
um inventário autorizado adequado, sem afirmar que foram examinados.

Links Markdown locais simples `[texto](caminho)` ou imagens são verificados em
todos os `.md`. Espaços devem usar `<caminho com espaços>`. Fragmentos não são
checados; autolinks, HTML, links de referência, construções Markdown complexas
e dependências mencionadas só em prosa exigem revisão manual. Links absolutos,
escapando do pacote, ou ausentes são erros. URLs externas não são acessadas e
não atestam disponibilidade. Código em fences é exemplo, não link executável.
O helper não estima tokens nem mede ganho semântico ou tempo de execução.

Saída 1: inspeção falhou (argumentos, IO, limite ou links locais).
Saída 0: inventário estrutural concluído, com `semanticVerdict: "not-evaluated"`.
