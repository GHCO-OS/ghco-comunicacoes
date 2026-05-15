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
- `search_messages`
- `get_chat_messages`
- `send_whatsapp_message`

## Estado

MVP tecnico. Ainda nao inclui anexos, audio, multi-conta, interface web nem deploy remoto.

