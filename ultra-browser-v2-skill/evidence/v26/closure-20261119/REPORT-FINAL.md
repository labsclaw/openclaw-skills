# Fechamento da rodada v2.6,19/11/2026

## Resultado executivo

Sete itens tratados, **não sete fulfilled**: cinco fulfilled nos escopos
exercitados, um parcial(A001) e um não verificado(A025). Nenhum push ou merge.
Publicação reservada ao solicitante após revisão. Sem instalação/sincronização
de runtime, troca de provider ou inferência adicional.

Ledger incremental de48 asserts: **43 fulfilled,0 omitted,1 drifted,3 N.A.,
1 não verificado**. Drifted é A001 parcial, não cumprimento integral. Em uma
taxonomia com categoria própria:43 fulfilled,1 parcial,3 N.A.,1 não verificado.
Não somar parcial novamente. [Ledger48linhas](LEDGER.md), [JSON](ledger.json).

O baseline histórico tinha36 fulfilled,7 omitted,1 drifted,3 N.A.,1 não verificado.
Nesta rodada, sete asserts avançam a fulfilled, A001 muda omitted->drifted
parcial e A025 permanece não verificado. Os39 estados não afetados(36 fulfilled
e3 N.A.) são herdados da auditoria10/11, **não foram reexecutados/reatestados**.
Os nove asserts com delta correspondem aos sete itens de fila: item 4 agrega
A029/A030/A044. Aceites locais não se tornam garantia universal do Hermes.

Precisão de contagem: nove asserts receberam nova evidência; oito mudaram de
estado. A025 ganhou observação, mas continuou não verificado.

## 1. Veredito e evidência por item

| Item | Assert | Veredito | Evidência executada e limite |
|---|---|---|---|
| 1 | A002 | fulfilled no mecanismo compartilhado | baseline 5/20->after 20/20, callbacks/eventloop e deadline; caminho busywait antigo removido; recipe 31 rc=0. Transporte Hermes/runtime não verificados. [Aceite](../fixes/A002-20261119/REPORT.md) |
| 2 | A001 | parcial, contabilizado drifted |80/80, boundaries 10/10, template 6/6; escopo e ambiguidade exercitados; pós-condição só quando predicado explícito. Legado sem predicado não prova efeito. A005 preservou regressão79/80 e fixture isolado80/80, sem ocultar timer entre cenários. [Aceite](../fixes/A001-20261119/ACCEPTANCE.md) |
| 3 | A005 | fulfilled no adaptador públicoT1/consumidores exercitados |Chromium 43/43, guards 51/51, recipe 31 rc=0; campos/anexo/vínculo pós-reload completos e falha anterior preservada; judge separado. Sem bateria completa/Hermes. [Aceite](../fixes/A005-20261119/ACCEPTANCE.md) |
| 4 | A029/A030/A044 | fulfilled no runner Chromium local/entradas exercitadas |after-final 37/37, after-frozen 38/38 com fontes estáveis;1280x900 medido e perfil novo por runId; controles reuso/resize e worker real. after03=33/34 e after04=34/35 preservados. [Aceite](../fixes/A029-A030-A044-20261119/ACCEPTANCE.md) |
| 5 | A006 | fulfilled no runner local/recipe/worker |after01=26/26, after02=31/31, PNGs reais, 8 por entrada CLI/worker; hashes, colisão, falhas e manifesto. after-final3/4 de setup preservado. Frames não são vídeo. [Aceite](../fixes/A006-20261119/ACCEPTANCE.md) |
| 6 | A008 | fulfilled nos formatos/consumidores exercitados |after03=38/38, fontes estáveis, loops reais com decisões fixas, extraçãoCLI e replay equivalentes; fonte/hash/ponteiros e verifier separado. after01=26/32 e after02=33/34 preservados; upload/reload na extração são sintéticos. [Aceite](../fixes/A008-20261119/ACCEPTANCE.md) |
| 7 | A025 | não verificado, não achado |Observação CDP/contexto real na fixtureT1, controles 2/2;10 eventos/5 URLs locais, sem evento externo nesses sensores/janela. Workflow parou no passo 0; startup/DNS/background/host fora da cobertura. Não promove ausência parcial a cumprimento. [Registro](../fixes/A025-20261119/REPORT.md) |

As falhas não foram apagadas nem compensadas por médias. Recibos source-stable
distinguem revisão exercitada de checkpoints intermediários. O antigo manifesto
A001 com hash superado recebeu [recibo de correção](../corrections/A001-manifest-20261119/CORRECTION.json),
incluído no commit A005, sem reescrever o manifesto antigo. Usar SHA256SUMS-final
autoritativo no Git fb5e6cb, não comparar arquivo histórico ao HEAD atual.

## 2. Branches e commits para revisão antes de push

| Item | Branch local | Commit |
|---|---|---|
| 1 A002 | fix/browser-v26-a002-20261119 | d7c12039b5e2188719bc2ffcd99b1c30cc6793f4 |
| 2 A001 | fix/browser-v26-a001-20261119 | fb5e6cbe928ad481a6e56bee3ac9f100bf461b63 |
| 3 A005 | fix/browser-v26-a005-20261119 | a58c426f8d67d5bdeac317d5da475db91de2cc4a |
| 4 ambiente | fix/browser-v26-environment-20261119 | c7cc9bfc2c2492fec2719ecba5a2c23ce431ff89 |
| 5 A006 | fix/browser-v26-a006-20261119 | 4667a88eff38b6a66c3f3f5359b544bfe22cc802 |
| 6 A008 | fix/browser-v26-a008-20261119 | 4adcef6be8d1a6d22bdad556475b440a2aaf5c0f |
| 7 A025 | fix/browser-v26-a025-closure-20261119 | 48a15c1a29b2a29c69e33122aa3e1985f31778a0 |

Commits são cadeia linear sobre merge PR38 bdbf073. Branch final contém os sete
commits e recebe depois um commit separado deste fechamento; o hash do fechamento
vai no recibo de entrega, evitando hash circular no próprio relatório.
[MapaJSON](commits.json). Não houve publicação/CI remoto nesta rodada.

## 3. Integridade conferida

[manifest-audit.json](manifest-audit.json) confere os manifestos autoritativos
**na revisãoGit declarada**, não contra arquivos evoluídos do checkout:
A002 8/8;A001 35/35;A005 32/32;ambiente 23/23;A006 56/56;A008 64/64;A025 13/13.
Total**231/231 entradas**, não231 testes. Manifesto do fechamento é adicional.

O ledger  de 10/11, fila e todos os recibos existentes permaneceram imutáveis.
Novos documentos e registros têm caminhos próprios. Logs/inputs públicos não são
entrada de judge privado. A observaçãoA025 não modifica executores existentes.

## 4. Pendências reais e próximo passo

1. **A001 residual:** consumidores legados sem predicado não têm efeito esperado
   comprovável. Precisam contratos/migração deliberada ou gate explícito; não
   basta inferir efeito do label. Nome/role é subconjunto, sem cobertura universal
   de iframes ou shadow fechado. Não implementar migração silenciosa neste fechamento.
2. **A025:** workflow contratual completo com observação de destinos suficiente.
   A recipe pública congelada usa id=channel + label=current=Todos e falhou sob identidade
   cumulativa A001; não foi alterada para forçar sucesso. Janela CDP foi parcial,
   pktmon status não forneceu captura de kernel. Não se afirma violação ou vazamento.
3. **Integração/adopção:** transporte Hermes/runtime/browser-eval não sincronizados;
   nova bateria completa de3 runs e inferência não executadas. Persistem dependências
   de layout/refGit/preflight/recipe histórica descritas nos aceites. A suíte geral
   conhecida como not_green em A002 não foi maquiada como verde por testes focados.
4. **Publicação:** revisão do solicitante, depois push/merge pelo próprio solicitante.
   Nenhum bloqueio de autorização novo foi inventado; é a restrição explícita desta rodada.

Rodada de implementação/observação encerrada, mas não é fechamento integral de
todos os requisitos v2.6 nem certificação em produção. Não há outra implementação
autorizada a executar automaticamente depois desta entrega.
