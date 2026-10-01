# Publicar funções de assinatura de contratos

## Escopo
- Confirmar que os três secrets informados estão cadastrados, sem acessar seus valores.
- Adicionar somente a rejeição HTTP 409 para aceite revogado em `contract-signing-session`.
- Manter `verify_jwt=false` nas duas funções.
- Publicar exclusivamente `contract-signing-session` e `contract-acceptance`; o utilitário `_shared/contracts.ts` será incluído como dependência compartilhada.
- Validar os endpoints sem expor tokens, assinaturas, dados sensíveis ou secrets.

## Fora do escopo
- Frontend, publicação do site, migrations e alterações no banco.
