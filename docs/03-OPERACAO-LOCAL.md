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

## Testar saude

```bash
curl http://127.0.0.1:8788/health
```

## Iniciar MCP

```bash
npm run dev:mcp
```

Para uso real com cliente MCP, prefira `npm run build` e aponte o cliente para `apps/mcp-server/dist/index.js`.

