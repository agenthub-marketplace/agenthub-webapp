param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$TaskArgs
)

$ErrorActionPreference = "Stop"

$rootDir = Resolve-Path (Join-Path $PSScriptRoot "..")
$scriptPath = Join-Path $rootDir "scripts/codex-agent-loop.sh"

$candidateBash = @(
  "$env:ProgramFiles\Git\bin\bash.exe",
  "$env:ProgramFiles\Git\usr\bin\bash.exe",
  "$env:LOCALAPPDATA\Programs\Git\bin\bash.exe"
) | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1

if (-not $candidateBash) {
  Write-Error "Git Bash was not found. Install Git for Windows or run scripts/codex-agent-loop.sh from a POSIX shell."
}

& $candidateBash $scriptPath @TaskArgs
exit $LASTEXITCODE
