$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$envPath = Join-Path $root ".env"

if (Test-Path $envPath) {
  Get-Content $envPath | ForEach-Object {
    if ($_ -match "^\s*([^#][^=]+)=(.*)$") {
      [Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim(), "Process")
    }
  }
}

$url = $env:GHCO_BRIDGE_URL
if (!$url) {
  $url = "http://127.0.0.1:8788"
}

Invoke-RestMethod -Uri "$url/health" -Method Get | ConvertTo-Json -Depth 10

