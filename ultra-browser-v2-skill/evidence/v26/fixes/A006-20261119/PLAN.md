# A006, contrato pré-mudança

Base c7cc9bf. GOAL: captura real integrada à entrada normal recipe/bateria,
arquivos associados ao runId e falha de evidência explícita, sem PASS artificial.

ENTRADA: environment_runner -> recipe.main -> run_recipe; bateria -> worker ->
Environment.bind -> recipe.main. Ambos usam Environment.harness para operações
e AL.verify para pós-reload. Capturar depois de cada chamada inclui navegação,
snapshot, ação, upload, verifier e falhas; capturar encerramento antes de emitir
resultado da recipe. Frames de estados, não gravação contínua.

CONSUMIDORES: recipe log, environment.json, worker rc e gate da bateria.
Gravador screencast_rec.py é ferramenta separada, não usado como fallback nem
alterado. Chamadas diretas antigas não possuem backend de captura integrado;
registrar unavailable, sem certificar evidência visual. Transporte Hermes fora
do escopo aceito do item 4, sem alteração de instalação/provider.

UNKNOWNS: screenshot Playwright real, arquivos válidos não vazios e hash/size,
falha de captura/escrita, ausência/adulteração de arquivos, erro anterior;
verificar em Chromium com entrada CLI e worker reais e injeções negativas.

SUCCESS: testes executados com fontes congeladas antes/depois; PNGs reais e
manifesto create-only; recipe nunca DONE-VERIFIED com captura requerida falha;
bateria não aceita recibo visual sem conferir arquivos; regressões proporcionais.

STEPS: integrar sessão visual ao transporte e recipe; gate independente de
evidência na bateria; exercitar positivos/negativos, revisar, congelar recibos.

FALLBACK: falha visual bloqueia aceite no runner novo, não tenta gravador externo
nem ignora erro. Legado fica explicitamente não verificado. Rollback c7cc9bf,
sem remover recibos. OUT OF SCOPE: itens6/7, vídeo, judge privado, providers.
