# Cobertura, vigência e evidência por fato

## Procedimento

1. Consultar o SSC Router antes de afirmar ausência. Usar `query "termo" --dry-run --json` para inspeção sem incrementar acessos. Um resultado é candidato, não prova.
2. Resolver entidade canônica e aliases dentro do escopo autorizado. Se houver duas entidades possíveis, pedir esclarecimento. Decompor a pergunta em facetas obrigatórias, sem omitir restrições.
3. Reunir os fatos relevantes e suas relações, inclusive sucessores fora do top-K. Não restringir a verificação de conflitos ao primeiro resultado. O caller é responsável pela completude desse conjunto.
4. Validar trechos originais e vigência. Exigir fonte, quote literal, SHA-256 e data de verificação por fato. Um segmento pode misturar observações e inferências. Confiança de um segmento não certifica todas as suas frases.
5. Rodar o gate opcional abaixo. Só `sufficient` autoriza afirmar cobertura dos campos declarados; `partial`, `missing`, `conflict` e `invalid` exigem explicitar a lacuna, consultar fonte atual ou esclarecer ambiguidade.
6. Entregar conclusão com IDs, trechos, caminhos/linhas e hashes do recibo. Não salvar novas inferências como observações. `certified` exige atestação humana identificada, mas observações verificadas não precisam de aprovação humana genérica.

## Contrato do helper opcional

`scripts/ssc-evidence.cjs` não substitui nem modifica o router, não chama LLM, não escreve memória e não integra automaticamente o fluxo de produção.

```sh
node scripts/ssc-evidence.cjs request.json claims.json /absolute/workspace
```

Saída JSON. Exit 0: `sufficient`; exit 2: lacuna/conflito/input inválido; exit 1: erro de I/O/JSON/uso.

Request:
```json
{"entity":"projeto-a","facets":["responsavel"],"at":"2026-11-09T12:00:00Z","maxAgeDays":90}
```

Claims é um array completo dos fatos conhecidos nesse escopo:
```json
[{
  "id":"decisao-2","entity":"projeto-a","aliases":["apelido-a"],
  "facet":"responsavel","value":"Ana","status":"active","confidence":"observed",
  "verifiedAt":"2026-11-09T12:00:00Z","supersedes":[],
  "source":{"file":"memory/segments/projeto-a.md","quote":"Responsável: Ana","sha256":"SUBSTITUIR_PELO_SHA256_REAL_DO_ARQUIVO"}
}]
```

`status`: active, contested ou superseded. `confidence`: certified, observed ou inferred; ausência é não verificada. Certified também requer certifiedBy, certifiedAt e correctionCount inteiro zero. validUntil é opcional e exclusivo. O helper aceita supersedes direcionado, não exige duplicar a relação; mantém decisões antigas para histórico, nunca as ressuscita quando o sucessor expira. O índice legado da Robin tem contrato próprio e relações recíprocas: não confundir os dois esquemas.

Datas futuras, certificação corrigida, fontes alteradas, paths fora da raiz, ciclos, duplicatas e aliases ambíguos não podem produzir cobertura suficiente. Certificação não elimina expiração. A janela de 90 dias é apenas default configurável: fatos voláteis precisam de janela menor.

**Limites:** um quote existir e ter hash correto não prova que sustenta semanticamente o value. Essa conferência e a autenticidade da atestação continuam humanas/externas. Um conjunto incompleto de claims pode esconder conflitos; `sufficient` vale somente para o conjunto e as facetas declarados, nunca para toda a memória. O helper não interpreta perguntas em linguagem natural. Hashes fornecem identidade dos bytes, não autenticidade da fonte.

## Popularidade não é validade

HOT é prioridade de cache, não selo de verdade. accessCount acumulado não comprova três usos em sete dias. Quando essa janela importar, usar eventos timestampados deduplicados por taskId, sem confundir uma busca com uso em resposta. Correções invalidam a atestação anterior; nova verificação pode estabelecer uma nova versão, sem apagar o histórico de correções. O helper não promove segmentos.

## Teste comparativo

```sh
node tests/test-evidence.cjs /absolute/ssc-router.cjs /absolute/result.json
```

Executa testes negativos e nove casos sintéticos isolados. A baseline é o router real informado, sem modificações, usando o mesmo índice/corpus de cada caso, top-5 e dry-run. Registra ranking top-1/top-5, IDs das evidências, abstenção e latências de query/gate separadas do startup. Não apresenta ranking como resposta de LLM nem compara pontuações de tarefas distintas. Guarda hashes dos executáveis. É um piloto funcional, não medição de ganho em produção, custo LLM ou qualidade linguística; essas avaliações continuam pendentes.

## Adoção da contribuição da Robin

Manter a preservação dos metadados no rebuild, lint de relações e separação entre certified/observed/inferred. Acrescentar granularidade por fato, escopo de aliases, vigência independente da certificação, cobertura por faceta e recibos com fonte versionada. Não inferir erro apenas da ausência de palavras-chave em SKILL.md: conferir referências e código. Não escolher workspace por quantidade de segmentos: usar raiz/index explícito para não misturar agentes ou tenants.
