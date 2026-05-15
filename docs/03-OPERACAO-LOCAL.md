# Operacao local

## Instalar

```bash
npm install
npm run build
```

## Configurar

Copie `.env.example` para `.env` e defina `GHCO_BRIDGE_TOKEN`.

## Iniciar bridge

```bash
npm run dev:bridge
```

O QR Code aparece no terminal quando nao houver sessao ativa.

No Windows:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/start-local.ps1 -Visible
```

Depois do primeiro pareamento:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/start-local.ps1
```

Para parar:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/stop-local.ps1
```

## Testar saude

```bash
curl http://127.0.0.1:8788/health
```

## Iniciar MCP

```bash
npm run dev:mcp
```

Para uso real com cliente MCP, prefira `npm run build` e aponte o cliente para `apps/mcp-server/dist/index.js`.

Exemplo pronto:

- `docs/chatgpt-mcp-config.example.json`

## Envio de midia

O MCP aceita caminhos locais para `send_whatsapp_media`.

Campos principais:

- `recipient`
- `filePath`
- `mediaType`: `image`, `video`, `audio` ou `document`
- `caption`, opcional
- `asVoice`, opcional para audio

## Download de midia

1. Use `list_media_messages`.
2. Pegue `chatJid` e `id`.
3. Chame `download_whatsapp_media`.
4. O retorno inclui `localPath`.
