# Arquitetura

## Componentes

```txt
WhatsApp
  -> apps/bridge
       - autentica via Baileys
       - persiste chats e mensagens em SQLite
       - expoe API REST local autenticada por Bearer token
  -> apps/mcp-server
       - roda via stdio
       - chama a API local do bridge
       - expoe tools MCP para agentes
```

## Decisoes iniciais

- Node.js/TypeScript em vez de Go/Python para reduzir dependencias locais no Windows.
- Bridge e MCP separados para permitir trocar o transporte no futuro.
- SQLite local como armazenamento padrao.
- REST local autenticado para evitar acesso direto do MCP ao arquivo de banco.
- Sem acoplamento ao CRM, Worker, Cloudflare ou repositorios Cuiabar.

## Endpoints do bridge

- `GET /health`
- `GET /api/chats?limit=50`
- `GET /api/chats/:jid/messages?limit=50`
- `GET /api/messages/search?q=texto&limit=20`
- `POST /api/messages/send`

## Tools MCP

- `communications_health`
- `list_chats`
- `search_messages`
- `get_chat_messages`
- `send_whatsapp_message`

