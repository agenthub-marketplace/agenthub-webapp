param(
  [string]$BaseUrl = "http://localhost:3000",
  [switch]$ExpectRevenueFixture,
  [switch]$SkipEnvCheck
)

$ErrorActionPreference = "Stop"

if ($PSVersionTable.PSVersion.Major -lt 7) {
  throw "agenthub-http-role-smoke.ps1 requires PowerShell 7+. Run it with: pwsh -NoProfile -File scripts/agenthub-http-role-smoke.ps1"
}

function Get-SupabaseLocalStatus {
  $raw = npx supabase status
  return $raw | ConvertFrom-Json
}

function New-AgentHubSessionCookie {
  param(
    [Parameter(Mandatory = $true)] [object]$SupabaseStatus,
    [Parameter(Mandatory = $true)] [string]$Email,
    [string]$Password = "password"
  )

  $body = @{
    email = $Email
    password = $Password
  } | ConvertTo-Json

  $response = Invoke-RestMethod `
    -Method Post `
    -Uri "$($SupabaseStatus.API_URL)/auth/v1/token?grant_type=password" `
    -Headers @{
      apikey = $SupabaseStatus.ANON_KEY
      "Content-Type" = "application/json"
    } `
    -Body $body

  $env:AGENTHUB_SMOKE_SUPABASE_URL = $SupabaseStatus.API_URL
  $env:AGENTHUB_SMOKE_SUPABASE_ANON_KEY = $SupabaseStatus.ANON_KEY
  $env:AGENTHUB_SMOKE_ACCESS_TOKEN = $response.access_token
  $env:AGENTHUB_SMOKE_REFRESH_TOKEN = $response.refresh_token

  $script = @'
const { createServerClient } = require("@supabase/ssr");

const cookies = [];
const client = createServerClient(
  process.env.AGENTHUB_SMOKE_SUPABASE_URL,
  process.env.AGENTHUB_SMOKE_SUPABASE_ANON_KEY,
  {
    cookies: {
      getAll() {
        return [];
      },
      setAll(items) {
        cookies.push(...items);
      },
    },
  },
);

client.auth
  .setSession({
    access_token: process.env.AGENTHUB_SMOKE_ACCESS_TOKEN,
    refresh_token: process.env.AGENTHUB_SMOKE_REFRESH_TOKEN,
  })
  .then(({ error }) => {
    if (error) {
      throw error;
    }

    process.stdout.write(cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; "));
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
'@

  return ($script | node -).Trim()
}

function Test-AgentHubPage {
  param(
    [Parameter(Mandatory = $true)] [string]$Name,
    [Parameter(Mandatory = $true)] [string]$Path,
    [string]$Cookie,
    [int[]]$ExpectedStatuses = @(200),
    [string[]]$Contains = @(),
    [string]$ExpectedLocation
  )

  try {
    $headers = @{}
    if ($Cookie) {
      $headers.Cookie = $Cookie
    }

    $response = Invoke-WebRequest `
      -UseBasicParsing `
      -MaximumRedirection 0 `
      -Uri "$BaseUrl$Path" `
      -Headers $headers `
      -TimeoutSec 20

    $statusCode = [int]$response.StatusCode
    $location = $response.Headers.Location
    $content = $response.Content
  } catch {
    $errorResponse = $_.Exception.Response
    if (-not $errorResponse) {
      throw
    }

    $statusCode = [int]$errorResponse.StatusCode
    $location = $errorResponse.Headers.Location
    $content = ""
  }

  if ($ExpectedStatuses -notcontains $statusCode) {
    throw "[$Name] expected status $($ExpectedStatuses -join '/') but got $statusCode"
  }

  if ($ExpectedLocation -and $location -ne $ExpectedLocation) {
    throw "[$Name] expected Location '$ExpectedLocation' but got '$location'"
  }

  foreach ($needle in $Contains) {
    if (-not $content.Contains($needle)) {
      throw "[$Name] expected content to contain '$needle'"
    }
  }

  [pscustomobject]@{
    name = $Name
    status = $statusCode
    location = $location
    ok = $true
  }
}

function Test-AgentHubCheckoutStatus {
  param(
    [Parameter(Mandatory = $true)] [string]$Cookie,
    [Parameter(Mandatory = $true)] [string]$SessionId
  )

  $response = Invoke-RestMethod `
    -Method Get `
    -Uri "$BaseUrl/api/checkout/status?session_id=$([uri]::EscapeDataString($SessionId))" `
    -Headers @{ Cookie = $Cookie } `
    -TimeoutSec 20

  if ($response.status -ne "paid") {
    throw "[checkout status] expected paid but got '$($response.status)'"
  }

  if (-not $response.rentalRequestId) {
    throw "[checkout status] expected a rentalRequestId after paid webhook fulfillment"
  }

  return [pscustomobject]@{
    name = "checkout paid status"
    status = 200
    location = ""
    ok = $true
    rentalRequestId = [string]$response.rentalRequestId
  }
}

$status = Get-SupabaseLocalStatus

if (-not $SkipEnvCheck -and (Test-Path ".env.local")) {
  $configuredSupabaseUrl = (Select-String -Path ".env.local" -Pattern "^NEXT_PUBLIC_SUPABASE_URL=" -ErrorAction SilentlyContinue).Line -replace "^NEXT_PUBLIC_SUPABASE_URL=", ""
  $configuredSupabaseUrl = $configuredSupabaseUrl.Trim().Trim('"').Trim("'")

  if ($configuredSupabaseUrl -and $configuredSupabaseUrl -ne $status.API_URL) {
    throw "This smoke uses local seed accounts, but .env.local points to a different Supabase URL. Start Next with NEXT_PUBLIC_SUPABASE_URL=$($status.API_URL) or rerun with -SkipEnvCheck only if the server process is already using local Supabase."
  }
}

$userCookie = New-AgentHubSessionCookie -SupabaseStatus $status -Email "user@example.com"
$creatorCookie = New-AgentHubSessionCookie -SupabaseStatus $status -Email "creator@example.com"
$adminCookie = New-AgentHubSessionCookie -SupabaseStatus $status -Email "admin@example.com"

$results = @()
$results += Test-AgentHubPage -Name "public marketplace" -Path "/agenthub/search" -Contains @("AgentHub")
$results += Test-AgentHubPage -Name "guest code redirect" -Path "/code" -ExpectedStatuses @(307) -ExpectedLocation "/auth/login?error=session-expired&next=%2Fcode"
$results += Test-AgentHubPage -Name "user dashboard" -Path "/agenthub/dashboard" -Cookie $userCookie -Contains @("AgentHub")
$results += Test-AgentHubPage -Name "user blocked from code" -Path "/code" -Cookie $userCookie -ExpectedStatuses @(307) -ExpectedLocation "/agenthub/dashboard?codeAccess=creator-required"
if ($ExpectRevenueFixture) {
  $checkoutStatus = Test-AgentHubCheckoutStatus -Cookie $userCookie -SessionId "cs_test_agenthub_revenue_ui_smoke"
  $results += $checkoutStatus
  $results += Test-AgentHubPage `
    -Name "paid workspace" `
    -Path "/agenthub/workspace/$($checkoutStatus.rentalRequestId)" `
    -Cookie $userCookie `
    -Contains @("AgentHub Revenue UI Smoke Agent", "Workspace guidé", "Historique")
}
$creatorDashboardContains = @("AgentHub Code")
if ($ExpectRevenueFixture) {
  $creatorDashboardContains += @("REVENUS BETA", "GMV sandbox", "Ledger cohérent", "Audit revenue cohérent")
}

$results += Test-AgentHubPage -Name "creator code dashboard" -Path "/code" -Cookie $creatorCookie -Contains $creatorDashboardContains
$results += Test-AgentHubPage -Name "creator new agent" -Path "/code/agents/new" -Cookie $creatorCookie -Contains @("Choisir le type", "Assistant IA guidé", "Preview")
$results += Test-AgentHubPage -Name "admin review" -Path "/code/admin/review" -Cookie $adminCookie -Contains @("Review", "Runtime", "Précheck")
$results += Test-AgentHubPage -Name "admin security" -Path "/code/admin/security" -Cookie $adminCookie -Contains @("Security", "review", "runtime")
$results += Test-AgentHubPage -Name "admin ops" -Path "/code/admin/ops" -Cookie $adminCookie -Contains @("Ops", "payments", "runs")

$results | Format-Table -AutoSize
Write-Host "agenthub-http-role-smoke-ok"
