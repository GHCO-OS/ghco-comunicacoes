# GHCO Comunicacoes

Servidor local de comunicacoes para WhatsApp com bridge Baileys, banco SQLite e servidor MCP.

O projeto nasce separado do ecossistema Cuiabar para servir como base reutilizavel de atendimento, auditoria e automacao conversacional.

## Inspiracao tecnica

Este repositorio se inspira no desenho do [`lharries/whatsapp-mcp`](https://github.com/lharries/whatsapp-mcp):

- uma ponte local autenticada no WhatsApp Web multi-device
- historico persistido em SQLite
- um servidor MCP expondo ferramentas para agentes
- envio de mensagens por endpoint local

A diferenca principal e que aqui o stack inicial e Node.js/TypeScript com Baileys, para reduzir atrito no Windows e manter alinhamento com bridges ja usadas em operacoes GHCO.

## Estrutura

```txt
apps/
  bridge/       Cliente WhatsApp local, REST API e SQLite
  mcp-server/   Servidor MCP stdio para agentes
docs/           Arquitetura, seguranca e operacao
scripts/        Utilitarios locais
```

## Requisitos

- Node.js 22+
- npm 10+
- WhatsApp em dispositivo com permissao para vincular aparelho

## Instalar

```bash
npm install
cp .env.example .env
npm run build
```

No Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

## Rodar o bridge

```bash
npm run dev:bridge
```

Na primeira execucao, leia o QR Code no terminal com o WhatsApp.

No Windows, para deixar o bridge rodando nesta maquina:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/start-local.ps1 -Visible
```

Use `-Visible` na primeira conexao para conseguir ler o QR Code. Depois que a sessao estiver pareada, o bridge pode rodar oculto:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/start-local.ps1
```

## Rodar o servidor MCP

```bash
npm run dev:mcp
```

Exemplo de configuracao MCP:

```json
{
  "mcpServers": {
    "ghco-comunicacoes": {
      "command": "node",
      "args": [
        "C:/Users/usuario/Documents/Codex/GHCO-Comunicacoes/apps/mcp-server/dist/index.js"
      ],
      "env": {
        "GHCO_BRIDGE_URL": "http://127.0.0.1:8788",
        "GHCO_BRIDGE_TOKEN": "troque-este-token"
      }
    }
  }
}
```

## Ferramentas MCP iniciais

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

## Formatacao WhatsApp

O formatador padrao gera texto compatvel com WhatsApp:

```txt
*Titulo em negrito*

_Corpo em italico_

> Preco ou informacao util em citacao
```

Use `format_whatsapp_message` para revisar o texto antes de enviar, `send_whatsapp_formatted_message` para enviar texto formatado e `send_whatsapp_formatted_media` para usar a mesma regra na legenda de fotos, videos e documentos.

## Envio de midia

`send_whatsapp_media` e `send_whatsapp_formatted_media` aceitam:

- `filePath`: arquivo local nesta maquina
- `mediaUrl`: URL HTTPS publica
- `mediaType`: `image`, `video`, `audio` ou `document`
- `asVoice`: `true` para audio com aparencia de mensagem de voz

## Auditoria de agenda

Use `audit_contacts` para catalogar chats individuais vistos pelo bridge. A ferramenta sugere nomes no padrao:

```txt
Nome 0786
```

Exemplo:

```txt
Leonardo 0786
```

Observacao: a classificacao `likely_saved`/`likely_unsaved` e inferida a partir dos metadados do WhatsApp Web e do historico local. Ela nao le diretamente a agenda do celular.

Use `Auditar` para gerar o CSV de importacao do Google Contacts:

```txt
store/google-contacts-import.csv
```

Exemplo de override:

```json
{
  "nameOverrides": [
    { "phone": "+19936180786", "name": "Leonardo" }
  ]
}
```

Resultado no CSV:

```txt
Leonardo 0786
```

## Estado

MVP tecnico com texto, texto formatado, envio de midia por arquivo local ou URL HTTPS, leitura local de conversas e auditoria de contatos. Ainda nao inclui multi-conta, interface web, allowlist granular nem endpoint HTTPS publico proprio para ChatGPT Apps.

## ChatGPT

O servidor MCP atual roda por `stdio`, ideal para clientes locais que aceitam MCP. Para conectar diretamente ao ChatGPT como app/conector, o proximo passo e publicar um MCP remoto HTTPS com autenticacao e politicas de permissao. Nao exponha o bridge Baileys local diretamente na internet.
