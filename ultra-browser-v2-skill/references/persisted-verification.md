# A005: verificação completa pós-reload

Leia ao verificar persistência com recipe, single ou batch. Adaptador público T1, não verifier universal para qualquer layout.

## Entrada normal e contrato

`agent_loop.verify()` e `recipe.py run --verify` aceitam `persisted_json:<JSON>` ou `persisted_json:@<arquivo UTF-8>`. Retorno string PASS/FAIL preservado; logs incluem detalhes estruturados. `persisted:<titulo>` agora falha fechado, com instrução de migração, sem fallback por substring.

Exemplo de contrato, substituindo URL/runId/valores pelos inputs autorizados da tarefa:

```json
{
  "version": 1,
  "url": "http://127.0.0.1:8791/xt-web-form-01",
  "fields": {
    "id": "PLAN-001", "runId": "seu-run-id",
    "title": "Plano WEB DEMO-024 revisado", "email": "qa@example.test",
    "type": "Integração", "priority": "Alta", "responsible": "Equipe Alfa",
    "requiresEnvironment": "true", "environment": "Homologação sintética"
  },
  "binding": {"demand": "DEMO-024"},
  "attachment": {
    "filename": "fixture-evidence.txt", "bytes": 32,
    "sha256": "22591ebec4f89fd83947ba44fa6e64d6a1e358ed2935a7493ed5b21cb81a3ed1",
    "href": "/api/attachment", "download": "fixture-evidence.txt"
  },
  "timeout_ms": 5000
}
```

```powershell
python scripts/recipe.py run recipe.json --url http://127.0.0.1:8791/xt-web-form-01 --verify "persisted_json:@C:/caminho/contrato.json"
```

Campos escalares são strings exatamente como exibidas na UI; booleano é `"true"`/`"false"`. Todos os nove campos são obrigatórios. Environment pode ser string vazia quando não exigido; não omitir. Vínculo é demand exata. Anexo exige nome, tamanho inteiro, SHA-256 hexadecimal, href same-origin absoluto e atributo download. Contrato incompleto, chave duplicada ou tipo inválido falham.

## Observação e prova

O adaptador observa somente `#saved > dl` e `#saved > a`, elementos públicos produzidos por fixture/app.js. Exige estrutura DT/DD completa, campos exatos, sem extra/ausente/duplicado e exatamente um registro/link. Confirma nova navegação de tipo reload, timeOrigin diferente, documento pronto, remoção do marcador do documento antigo e URL exata. Só então compara o registro e baixa o anexo pelo link público, same-origin, sem seguir redirecionamentos. Tamanho e SHA-256 dos bytes baixados precisam coincidir com a expectativa, além dos metadados exibidos.

O timeout limita espera de prontidão/download; retorno de transporte não zero, payload ausente/múltiplo/malformado, mudança de URL e leitura falha não podem virar PASS. Sem sucesso por palavra PASS em stdout/stderr. Outro layout exige adaptador/contrato explícito, não heurística global.

Falha inesperada anterior em recipe/single/batch é fatal e não pode ser apagada por verifier posterior. Erro de host (navegação/upload), `_rc`, exceção e FAIL de verificação são preservados. Negativa explicitamente esperada permanece distinta. Isso muda o legado que tentava recuperar qualquer erro e posteriormente declarar sucesso; não repetir escrita para obter confirmação.

## Bateria e proveniência das expectativas

`battery_pilot.verifier_spec(run_id,url)` fornece o contrato por run, passado ao worker; preflight percorre e compila os snippets reais do novo protocolo. Seu PASS sintético não é aceite funcional. O módulo novo participa do fingerprint de fontes.

Valores vêm da recipe pública `evidence/v26/results/recipes/xt24ds7-recipe.json`, do arquivo público fixture-evidence.txt e do contrato de UI da fixture. Opções sem acento na recipe são resolvidas pelo executor para o value real com acento da UI. O controle `battery_contract_matches_public_inputs` registra essa correspondência e o hash do arquivo. Nunca extrair expectativa do judge ou de arquivos privados de runs.

Judge continua processo separado e o gate continua exigindo identidade, pass_ e onze checks. Verifier PASS não substitui judge. O patch não corrige caminhos/dependências históricas da bateria nem recipes incompatíveis com a identidade cumulativa A001; falhar não autoriza enfraquecer esses gates.

## Evidência e limites

[Aceite executado](../evidence/v26/fixes/A005-20261119/ACCEPTANCE.md). Testes usam Chromium/HTTP local e os callers reais, com transporte substituído por Playwright. Reload é navegação real no teste, mas o transporte browser-harness Hermes não foi executado. Não é certificação de bateria LLM, de runtime instalado ou de outros layouts.
