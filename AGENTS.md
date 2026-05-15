# Guia operacional

## Objetivo

Manter o GHCO Comunicacoes como projeto independente do ecossistema Cuiabar, com codigo, historico e documentacao proprios.

## Antes de alterar

Leia:

1. `README.md`
2. `docs/01-ARQUITETURA.md`
3. `docs/02-SEGURANCA-E-PRIVACIDADE.md`
4. `docs/03-OPERACAO-LOCAL.md`
5. `docs/04-ROADMAP.md`

## Regras

- Nao copiar segredos para o repositorio.
- Nao versionar `store/`, sessoes Baileys, bancos SQLite ou midias baixadas.
- Edite fonte TypeScript em `apps/*/src`.
- Atualize `docs/` quando mudar arquitetura, ferramentas MCP, endpoints ou operacao.
- Este projeto nao deve depender de arquivos do `GHCO-OS`.

