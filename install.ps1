$ErrorActionPreference = "Stop"

$RootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $RootDir

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw "Node.js is required. Install Node 20.19+ first."
}

if (-not (Get-Command corepack -ErrorAction SilentlyContinue)) {
  throw "corepack is required. Install a Node.js build that includes corepack."
}

$nodeVersion = (node -p "process.versions.node")
$parts = $nodeVersion.Split(".")
$major = [int]$parts[0]
$minor = [int]$parts[1]
if ($major -lt 20 -or ($major -eq 20 -and $minor -lt 19)) {
  throw "Node.js 20.19+ is required. Current version: $nodeVersion"
}

corepack enable

if (-not (Test-Path "server\.env")) {
  Copy-Item "server\.env.example" "server\.env"
  Write-Host "Created server\.env"
}

if (-not (Test-Path "client\.env")) {
  Copy-Item "client\.env.example" "client\.env"
  Write-Host "Created client\.env"
}

if (Test-Path "server\.env") {
  $serverEnv = Get-Content "server\.env" -Raw
  if ($serverEnv -match "RAG_ENABLED=true") {
    $serverEnv = $serverEnv -replace "RAG_ENABLED=true", "RAG_ENABLED=false"
    Set-Content "server\.env" $serverEnv -NoNewline
    Write-Host "Set RAG_ENABLED=false for easier first run."
  }
}

pnpm install
pnpm build

Write-Host ""
Write-Host "Install complete."
Write-Host ""
Write-Host "Local development:"
Write-Host "  .\start.bat"
Write-Host ""
Write-Host "Docker / VPS:"
Write-Host "  docker compose up -d --build"
Write-Host ""
Write-Host "Then open:"
Write-Host "  Frontend: http://127.0.0.1:5173"
Write-Host "  Backend:  http://127.0.0.1:3000"
Write-Host ""
Write-Host "Remember to add your model API key in the web settings page before real writing."
