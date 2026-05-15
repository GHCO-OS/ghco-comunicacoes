$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$pidFile = Join-Path $root "store\bridge.pid"

if (!(Test-Path $pidFile)) {
  Write-Host "Nenhum PID local encontrado."
  exit 0
}

$pidValue = Get-Content $pidFile -Raw
$process = Get-Process -Id ([int]$pidValue) -ErrorAction SilentlyContinue

if ($process) {
  Stop-Process -Id $process.Id -Force
  Write-Host "GHCO Comunicacoes bridge parado. PID: $($process.Id)"
} else {
  Write-Host "Processo nao encontrado. Limpando PID antigo."
}

Remove-Item $pidFile -Force

