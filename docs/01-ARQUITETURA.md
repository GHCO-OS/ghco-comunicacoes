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
- `GET /api/chats/:jid/messages/:messageId`
- `GET /api/messages/search?q=texto&limit=20`
- `GET /api/media?limit=50`
- `POST /api/messages/send`
- `POST /api/messages/send-media`
- `POST /api/media/download`

## Tools MCP

- `communications_health`
- `list_chats`
- `search_messages`
- `get_chat_messages`
- `get_message`
- `list_media_messages`
- `send_whatsapp_message`
- `send_whatsapp_media`
- `download_whatsapp_media`

## Midia

O bridge registra metadados de imagem, video, audio e documento quando recebe mensagens. O arquivo em si so e baixado quando uma ferramenta chama `download_whatsapp_media`, salvando o conteudo em `store/media/`.

Envio de midia usa caminhos locais da maquina. Tipos suportados:

- `image`
- `video`
- `audio`
- `document`

Para audio com aparencia de mensagem de voz, use `asVoice=true`. Arquivos `.ogg`/Opus continuam sendo a opcao mais compativel.

## ChatGPT Apps e MCP remoto

O servidor atual e local por `stdio`. Para ChatGPT acessar fora desta maquina, a arquitetura recomendada e adicionar uma camada HTTPS autenticada que fale MCP remoto ou Apps SDK e encaminhe chamadas para o bridge local por um tunel/controlador seguro.

Nao publicar `apps/bridge` diretamente na internet.
