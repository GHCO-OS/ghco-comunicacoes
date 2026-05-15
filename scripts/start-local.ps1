param(
  [switch]$Visible
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$node = (Get-Command node -ErrorAction Stop).Source
$logDir = Join-Path $root "store\logs"
$pidFile = Join-Path $root "store\bridge.pid"
$outLog = Join-Path $logDir "bridge.out.log"
$errLog = Join-Path $logDir "bridge.err.log"

New-Item -ItemType Directory -Force -Path $logDir | Out-Null

if (Test-Path $pidFile) {
  $existingPid = Get-Content $pidFile -Raw
  if ($existingPid -and (Get-Process -Id ([int]$existingPid) -ErrorAction SilentlyContinue)) {
    Write-Host "GHCO Comunicacoes bridge ja esta rodando. PID: $existingPid"
    exit 0
  }
}

Push-Location $root
try {
  if (!(Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "Arquivo .env criado a partir de .env.example. Ajuste GHCO_BRIDGE_TOKEN antes de expor o servico."
  }

  npm run build

  if ($Visible) {
    $process = Start-Process powershell -PassThru -ArgumentList "-NoExit", "-Command", "cd '$root'; npm run start:bridge"
  } else {
    $process = Start-Process $node -PassThru -WindowStyle Hidden -ArgumentList "apps/bridge/dist/index.js" -RedirectStandardOutput $outLog -RedirectStandardError $errLog
  }

  Set-Content -Path $pidFile -Value $process.Id
  Write-Host "GHCO Comunicacoes bridge iniciado. PID: $($process.Id)"
  Write-Host "Health: http://127.0.0.1:8788/health"
} finally {
  Pop-Location
}

