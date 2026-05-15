# Seguranca e privacidade

## Riscos

Um servidor MCP de WhatsApp pode expor mensagens privadas a agentes. O risco principal e combinacao de:

- acesso a dados privados
- conteudo nao confiavel nas mensagens
- capacidade de envio ou exfiltracao

## Controles iniciais

- Bridge local em `127.0.0.1`.
- Bearer token obrigatorio para endpoints `/api/*`.
- Banco, sessoes e midias fora do Git.
- Tools MCP separadas para leitura e envio.
- Envio exige parametros explicitos de destinatario e texto.
- Midias baixadas ficam em `store/media/`, fora do Git.
- O bridge local nao deve ser exposto diretamente na internet.

## Regras operacionais

- Use uma conta WhatsApp apropriada para operacao, nao uma conta pessoal sensivel.
- Revise mensagens antes de permitir resumos amplos.
- Evite conectar agentes sem politicas de permissao.
- Rotacione `GHCO_BRIDGE_TOKEN` se o ambiente for compartilhado.
- Antes de conectar ao ChatGPT por HTTPS, implemente autenticacao forte, allowlist de tools e logs de auditoria.
