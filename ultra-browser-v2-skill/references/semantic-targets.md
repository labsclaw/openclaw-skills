# A001: identidade e efeito no executor nativo

Entrada: `recipe.py run`, `agent_loop.execute` (single) e `agent_loop.execute_batch`. Recipe usa `op`; single/batch usam `action`. Os demais campos são iguais.

```json
{
  "op": "click",
  "scope": {"role": "region", "name": "Destino"},
  "role": "button",
  "name": "Salvar",
  "postcondition": {
    "target": {"id": "status", "scope": {"id": "right"}},
    "property": "text",
    "equals": "Salvo",
    "timeout_ms": 1500
  }
}
```

## Identidade

`scope` é um objeto não vazio de campos cumulativos `id`, `role`, `name`, `tag`. O escopo deve identificar exatamente um container no DOM atual. Alvo usa os mesmos campos, com `label` como alias de `name`. Se ambos existirem, ambos devem casar. IDs são exatos; nomes/roles/tags são normalizados em caixa e espaços. Todos os campos fornecidos restringem a busca, inclusive label junto de id. Não há busca parcial, primeiro match, fallback fora do escopo ou seleção por índice após conflito semântico. Alvo oculto também conta para ambiguidade, não desaparece convenientemente da identidade.

Nome: precedência aria-labelledby, aria-label, label associado e, por fim, texto/placeholder. Roles implícitos suportados: button, link, textbox, checkbox, radio e combobox. Isso não é implementação integral do algoritmo de accessible name/role W3C. Iframes e shadow roots fechados não são cobertos. Shadow roots abertos são percorridos; escopo considera ancestralidade composta.

Compatibilidade: id único ou label exato/único continuam aceitos sem scope. `bid`/`element` são suportados somente sem identidade semântica; não são identidades estáveis e não resolvem ambiguidade. Recipes dependentes de correspondência parcial ou de label contraditório falham fechado e precisam revisão. Não editar receitas/recibos históricos para passar.

## Pós-condição

`postcondition.target` usa o mesmo contrato de identidade, inclusive escopo. Propriedades aceitas: `text`, `value`, `checked`, `visible`, `exists`. `equals` é comparação estrita; `timeout_ms` é inteiro de 0 a 3000, padrão 3000.

O executor lê a propriedade antes da ação e novamente após despacho, cedendo o event loop e re-resolvendo o alvo até o deadline. Só verifica quando o valor esperado está observado e difere do baseline. Estado antigo não comprova efeito novo. Predicado inválido/ambíguo falha antes de agir; divergência, timeout ou ambiguidade posterior interrompem batch e recipe, sem replay automático ou verificador final que apague a falha. Upload/navigate/reload continuam terminais do host; não usar postcondition JS nesses terminais.

O recibo por ação inclui `effect.verified`, baseline e observação final. Sem postcondition, mantém-se o protocolo legado: `ok` é apenas despacho e `effect.verified=false`. Isso não fecha a obrigação de efeito para receitas/consumidores legados; eles precisam de predicado explícito ou verificação observada no host. Não promover esse despacho a aceite funcional. Não há pós-condição universal dedutível de um clique arbitrário.

## Verificação

`python -B scripts/test_semantic_target.py --receipt <novo-arquivo.json>` requer Playwright com Chromium. Executa os adapters reais, trocando apenas o transporte por `page.evaluate`; no run_recipe, navegação é stub para manter a fixture isolada em about:blank. Não prova transporte Hermes, instalação ou generalização para outras aplicações.
