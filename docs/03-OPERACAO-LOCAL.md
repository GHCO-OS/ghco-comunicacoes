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

## Auditoria de contatos

Via MCP:

```txt
audit_contacts
Auditar
```

Via API local:

```powershell
$token = (Get-Content .env | Where-Object { $_ -match '^GHCO_BRIDGE_TOKEN=' }) -replace '^GHCO_BRIDGE_TOKEN=',''
Invoke-RestMethod "http://127.0.0.1:8788/api/audit/contacts?limit=500" -Headers @{Authorization="Bearer $token"}
```

CSV:

```powershell
Invoke-WebRequest "http://127.0.0.1:8788/api/audit/contacts?limit=500&format=csv" -Headers @{Authorization="Bearer $token"} -OutFile store/contact-audit.csv
```

CSV para Google Contacts:

```powershell
$body = @{
  limit = 500
  includeSaved = $false
  nameOverrides = @(
    @{ phone = "+19936180786"; name = "Leonardo" }
  )
} | ConvertTo-Json -Depth 5

Invoke-RestMethod "http://127.0.0.1:8788/api/audit/google-contacts" -Method Post -Headers @{Authorization="Bearer $token"} -ContentType "application/json" -Body $body
```

O arquivo final fica em:

```txt
store/google-contacts-import.csv
```
