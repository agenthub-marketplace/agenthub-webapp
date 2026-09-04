param(
  [string]$DatabaseUrl = $env:SUPABASE_DB_URL,
  [string]$SqlFile = "scripts/agenthub-advanced-prod-readiness.sql"
)

$ErrorActionPreference = "Stop"

if (-not $DatabaseUrl) {
  Write-Error "Missing database URL. Pass -DatabaseUrl or set SUPABASE_DB_URL for the target Supabase Postgres database."
}

if (-not (Test-Path -LiteralPath $SqlFile)) {
  Write-Error "SQL file not found: $SqlFile"
}

$psql = Get-Command psql -ErrorAction SilentlyContinue

if ($psql) {
  Get-Content -LiteralPath $SqlFile | & $psql.Source $DatabaseUrl -v ON_ERROR_STOP=1
  exit $LASTEXITCODE
}

$docker = Get-Command docker -ErrorAction SilentlyContinue

if ($docker) {
  Get-Content -LiteralPath $SqlFile | docker run --rm -i postgres:17-alpine psql $DatabaseUrl -v ON_ERROR_STOP=1
  exit $LASTEXITCODE
}

Write-Error "Neither psql nor docker is available. Run the SQL manually in the Supabase SQL editor."
