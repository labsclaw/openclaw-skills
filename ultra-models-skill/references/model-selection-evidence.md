# Evidence-based model selection

Read for operational rankings, recommendations, allocation or routing. Catalog auditing alone does not need a benchmark search. Research is read-only; it does not authorize inference spending, configuration changes or external publication.

## 1. Define the decision and candidate set

Identify the task, harness, tools, language, representative context size, latency needs, authorized budget and providers. Use the live inventory for eligibility and exact IDs. Compare the relevant existing models as well as newly discovered ones; do not take the sync script's new-only list as the full candidate pool. Include the user's named candidates without treating them as predetermined winners.

Separate model identity from route: model version, preview/reasoning mode, quantization and provider can affect comparability. Canonical names alone do not prove identical serving behavior. A listed model is not proof of working inference, tool compatibility, free account eligibility or remaining quota.

Use these three decision axes explicitly, with unknowns left unknown:

1. **Real-task quality:** successful tool selection and calls, compliance with instructions, Portuguese, correct deliverable and completed user intent. Record failures and rework; fluent prose alone is not success.
2. **Representative latency:** end-to-end completion time with realistic context, tool turns and output. Record context size, sample count and timeouts; report a median and range when repeated measurements exist. A greeting canary cannot rank agent responsiveness.
3. **Operational viability:** stability across observed calls, errors/retries, advertised versus verified free quota and reset limits, plus harness compatibility (message/tool schema, context support and normal entrypoint). Keep published limits, account headroom and measured reliability separate. Unknown quota is not unlimited quota; one success does not prove stability.

## 2. Research current evidence on the web

Use the available web search and fetch/browser tools; discover them through the runtime if needed. Do not assume one harness has another's tool names. Include the original exact model spelling in at least one query. Useful queries combine that spelling with `model card`, `benchmark tool calling`, `agent coding evaluation`, or the relevant task. Search the current provider docs separately for pricing, limits and context/tool support.

Prefer official model cards, technical reports and provider docs for identity and capabilities. For comparative performance, inspect an independent evaluation with a published method where available. Examples of places to investigate, not authorities by default: Artificial Analysis, LiveBench, SWE-bench, BFCL and language-specific evaluations. They measure different things; a chat preference leaderboard does not establish agent/tool reliability. Marketing, social posts and search snippets are leads, not sufficient evidence for a numerical ranking.

Open the underlying pages supporting material claims. Record source URL, title, retrieval date, publication/update date when present, exact evaluated variant, metric, benchmark/version, harness/settings and reported value. Mark missing details as unknown. A recent retrieval date does not make an old evaluation current. Vendor-reported results remain vendor claims, even on an official page.

Compare scores only when benchmark, version, metric, setup and variants are meaningfully comparable. Do not combine unrelated metrics into a synthetic Q score or infer quality from parameter count, family name or training familiarity. If sources conflict, expose the disagreement and methodological differences. If an exact new model has no credible evidence, mark it unranked/provisional, not inferior and not equal to its predecessor. Do not silently substitute a similarly named model.

## 3. Separate four evidence layers

| Layer | Supports | Does not establish |
| --- | --- | --- |
| Current provider catalog/docs | Exact IDs, advertised pricing and limits | Working inference, actual quota or agent quality |
| External evaluations | Performance under the cited setup | Same performance on our harness or provider |
| Local representative evaluation | Task success, tool use, instructions, Portuguese and context behavior | General superiority across all tasks |
| Local route measurements | Latency, failures and cost reported for that workload | Model quality or advertised daily quota |

When tests are authorized and needed to settle the choice, use the same task/context and comparable settings for each candidate. Record correctness/completion first, then elapsed time, failures/retries, provider/model, context size, tokens and reported cost. A small greeting or one successful call is only a canary, not an agent benchmark. Keep model and provider identical within each paired skill comparison; compare provider routes separately. Tokens on free routes are telemetry, not an invented admission ceiling. Do not silently switch to paid models or expand the test campaign beyond authorization.

## 4. Produce a usable recommendation

Report the evidence date and scope, then a compact candidate comparison: exact model/provider, task-relevant evidence with links, measured latency if any, free/limit status, missing evidence and provisional recommendation. Separate best-supported quality, fastest measured route and quota headroom; there need not be one global winner. Mark confidence from the evidence coverage without invented numeric precision.

If web access fails or evidence is insufficient, report the failed boundary and produce a provisional shortlist with the gaps. Do not fall back to a definitive ranking based on internal scores. Give the next bounded verification that could resolve the choice. Audit, research, recommendation, config mutation and proven normal use are separate completion states.

## Legacy script compatibility and replacement

The first consumer is the agent interpreting sync/map/report/routing output. `Get-ModelQualityScore`, TPS, tiers, capabilities, role-fit, health scores and static provider priority remain compatibility hints, not measured evidence. Script console warnings and additive `score_evidence` metadata expose that limitation without breaking existing fields. The `plan-routing.ps1` output is a draft, not an applied or benchmark-backed plan. Do not apply it solely because it printed a primary route.

For operational recommendations this procedure takes precedence over the legacy score ordering. Keep the old fields until their actual consumers have a separately authorized migration to sourced or measured evidence; a documentation edit does not establish adoption by another agent or harness.
