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
- `GET /api/audit/contacts?limit=500&includeGroups=false&includeNonPhoneIds=false&format=json`
- `POST /api/audit/google-contacts`
- `GET /api/chats?limit=50`
- `GET /api/chats/:jid/messages?limit=50`
- `GET /api/chats/:jid/messages/:messageId`
- `GET /api/messages/search?q=texto&limit=20`
- `GET /api/media?limit=50`
- `POST /api/messages/send`
- `POST /api/messages/format`
- `POST /api/messages/send-media`
- `POST /api/media/download`

## Tools MCP

- `communications_health`
- `list_chats`
- `audit_contacts`
- `Auditar`
- `search_messages`
- `get_chat_messages`
- `get_message`
- `list_media_messages`
- `send_whatsapp_message`
- `format_whatsapp_message`
- `send_whatsapp_formatted_message`
- `send_whatsapp_media`
- `send_whatsapp_formatted_media`
- `download_whatsapp_media`

## Auditoria de contatos

O endpoint `/api/audit/contacts` e a tool `audit_contacts` leem chats conhecidos localmente e produzem uma lista de catalogacao. Por padrao, entram apenas chats individuais com telefone real em `@s.whatsapp.net`; grupos, newsletters e IDs `@lid` ficam fora salvo quando solicitados.

Campos principais:

- `phone`
- `displayName`
- `chatKind`
- `savedStatus`: `likely_saved`, `likely_unsaved`, `unknown` ou `group`
- `suggestedContactName`

O nome sugerido segue o padrao `Nome 0786`, usando o nome humano disponivel no chat e os quatro ultimos digitos do telefone. Quando nao ha nome humano, a sugestao vira `Contato 0786`.

Limitacao: o WhatsApp Web nao garante leitura direta da agenda do celular; por isso o status e uma inferencia operacional.

`Auditar` gera `store/google-contacts-import.csv` com colunas compativeis com Google Contacts:

- `Name`
- `Given Name`
- `Notes`
- `Phone 1 - Type`
- `Phone 1 - Value`

Nomes conhecidos podem ser enviados em `nameOverrides` para trocar `Contato 0786` por `Leonardo 0786`.

## Midia

O bridge registra metadados de imagem, video, audio e documento quando recebe mensagens. O arquivo em si so e baixado quando uma ferramenta chama `download_whatsapp_media`, salvando o conteudo em `store/media/`.

Envio de midia aceita caminhos locais da maquina via `filePath` ou URL HTTPS publica via `mediaUrl`. Tipos suportados:

- `image`
- `video`
- `audio`
- `document`

Para audio com aparencia de mensagem de voz, use `asVoice=true`. Arquivos `.ogg`/Opus continuam sendo a opcao mais compativel.

## Formatacao de mensagens

O endpoint `/api/messages/format` e as tools `format_whatsapp_message`, `send_whatsapp_formatted_message` e `send_whatsapp_formatted_media` aplicam uma convencao unica:

- `title` vira `*titulo*`, exibido em negrito no WhatsApp
- `body` vira `_corpo_`, exibido em italico
- cada item em `quotes` vira uma linha `> informacao`, usada para precos e informacoes uteis
- `footer` e enviado sem formatacao extra

## ChatGPT Apps e MCP remoto

O servidor atual e local por `stdio`. Para ChatGPT acessar fora desta maquina, a arquitetura recomendada e adicionar uma camada HTTPS autenticada que fale MCP remoto ou Apps SDK e encaminhe chamadas para o bridge local por um tunel/controlador seguro.

Nao publicar `apps/bridge` diretamente na internet.
