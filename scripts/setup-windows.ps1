$ErrorActionPreference = "Stop"

$envExamplePath = Join-Path (Get-Location) ".env.example"
$envLocalPath = Join-Path (Get-Location) ".env.local"

if (-not (Test-Path -LiteralPath $envExamplePath)) {
  Write-Error "Missing .env.example in the current directory."
  exit 1
}

if (Test-Path -LiteralPath $envLocalPath) {
  Write-Host ".env.local already exists. Leaving it untouched."
} else {
  Copy-Item -LiteralPath $envExamplePath -Destination $envLocalPath
  Write-Host "Created .env.local from .env.example."
}

Write-Host "Next steps:"
Write-Host "1. Open .env.local and replace the Spotify placeholder values."
Write-Host "2. Run npm install."
Write-Host "3. Run npm run dev."
