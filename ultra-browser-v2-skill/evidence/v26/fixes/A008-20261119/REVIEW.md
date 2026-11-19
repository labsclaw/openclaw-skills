# Revisão independente nativa A008

Read-only, revisor a008_review, base4667a88 e diff. Inicialmente não aprovou:
P1 replay negativo incompatível; P2 pointer inválido dentro exec string, tag
descartada e ausência expected não preservada. Repros curtas, sem suíte longa.

Após correções, parecer final sem achados bloqueantes. Conferiu after-03 38/38,
sources_unchanged e hashes dos quatro scripts iguais ao estado revisado, e
descoberta documental pela SKILL. Não reexecutou a suíte nem acessou judge/provider.

Limites explícitos: upload/reload sintéticos; produção/Hermes não certificados;
parecer não certifica a regressão A006 interrompida. A nova regressão independente
deve ser examinada pelo seu próprio recibo a006-final.json.
