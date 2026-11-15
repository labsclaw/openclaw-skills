# Exemplo didático: condensar sem remover uma exceção

Este é um exemplo autoral sintético, não um resultado de modelo nem evidência de
adoção. Copiar a fonte abaixo para `original/receipt-organizer/SKILL.md`, criar
`candidata/receipt-organizer/SKILL.md` e usar o contrato/inspeção desta skill.
Passar essas duas pastas `receipt-organizer` ao helper; validar a segunda com
o comando oficial da entrada. O nome da pasta coincide com o frontmatter.
Manter a original intacta.

## Fonte

```text
---
name: receipt-organizer
description: "Organizar recibos locais pela data do conteúdo, preservando pendências e colisões. Não usar para resumir um recibo sem reorganizar arquivos."
license: Apache-2.0
---

Organize recibos locais por data informada no recibo.
Leia a data no próprio recibo, nunca use a data do arquivo como substituto.
Se a data estiver ilegível, liste a pendência e não mova esse recibo.
Antes de mover, registre origem e destino para permitir recuperação.
Não sobrescreva um recibo com mesmo nome: preserve ambos com identificador único.
Ao terminar, informe movidos, pendentes e conflitos.
Não precisamos narrar que o trabalho começou. A organização deve ser clara.
```

## Candidata plausível

```text
---
name: receipt-organizer
description: "Organizar recibos locais pela data do conteúdo, preservando pendências e colisões. Não usar para resumir um recibo sem reorganizar arquivos."
license: Apache-2.0
---

Organize recibos pela data legível no conteúdo, não pela data do arquivo.
Registre origem/destino antes da mudança; preserve colisões com identificador único.
Data ilegível: deixe o recibo no lugar e liste a pendência.
Informe contagens de movidos, pendentes e conflitos.
```

Mapear O1 data de conteúdo, O2 ilegível não move, O3 recuperação,
O4 colisões preservadas e O5 relatório. Remover apenas a narração editorial.
O teste usa pastas descartáveis, não recibos reais nem integrações externas.

## Caso negativo

Plantar em outra cópia: `Se faltar data, use a data do arquivo e mova o recibo.`
Ela parece concisa mas contradiz O1/O2. O avaliador deve apontar os trechos da
fonte e rejeitar essa candidata. O helper pode retornar sucesso estrutural para
essa cópia: esse resultado não autoriza aceitação semântica.

## Quando não usar

Um pedido como "resuma este recibo em duas frases" não pede destilação de skill.
Um pedido como "treine um modelo pequeno com as respostas do modelo grande"
trata de pesos/dados de treinamento, fora deste procedimento.
