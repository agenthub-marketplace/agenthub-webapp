param(
  [int]$Port = 3101,
  [switch]$SkipDbSmoke
)

$ErrorActionPreference = "Stop"

if ($PSVersionTable.PSVersion.Major -lt 7) {
  throw "agenthub-local-e2e-smoke.ps1 requires PowerShell 7+. Run it with: pwsh -NoProfile -File scripts/agenthub-local-e2e-smoke.ps1"
}

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")

function Stop-AgentHubExistingDevServers {
  param([Parameter(Mandatory = $true)] [string]$ProjectRoot)

  $normalizedProjectRoot = $ProjectRoot.ToLowerInvariant()
  $processes = Get-CimInstance Win32_Process -Filter "name = 'node.exe'" |
    Where-Object {
      $_.CommandLine -and
      $_.CommandLine.ToLowerInvariant().Contains($normalizedProjectRoot) -and
      $_.CommandLine.ToLowerInvariant().Contains("next")
    }

  foreach ($process in $processes) {
    Stop-Process -Id $process.ProcessId -Force -ErrorAction SilentlyContinue
  }
}

Stop-AgentHubExistingDevServers -ProjectRoot $projectRoot.Path
$nodeBefore = @(Get-CimInstance Win32_Process -Filter "name = 'node.exe'" | ForEach-Object { $_.ProcessId })
$job = $null
$devServerProcessId = $null
$devServerOutputLog = $null
$devServerErrorLog = $null
$stripeWebhookSecret = "whsec_agenthub_local_smoke_secret"

function Get-SupabaseStatus {
  $raw = npx supabase status
  Assert-NativeCommandSucceeded "npx supabase status"
  return $raw | ConvertFrom-Json
}

function Assert-NativeCommandSucceeded {
  param([Parameter(Mandatory = $true)] [string]$CommandName)

  if ($LASTEXITCODE -ne 0) {
    throw "$CommandName failed with exit code $LASTEXITCODE"
  }
}

function Invoke-AgentHubSmokeSql {
  param([Parameter(Mandatory = $true)] [string]$Sql)

  $Sql | docker exec -i supabase_db_agenthub-webapp psql -U postgres -d postgres -v ON_ERROR_STOP=1
  Assert-NativeCommandSucceeded "docker psql"
}

function Clear-RevenueUiSmokeFixture {
  Invoke-AgentHubSmokeSql @'
delete from public.creator_revenue_ledger
where payment_id = '20000000-0000-4000-8000-000000000103';

delete from public.agent_runs
where rental_request_id in (
  select id
  from public.rental_requests
  where payment_id = '20000000-0000-4000-8000-000000000103'
);

delete from public.rental_requests
where payment_id = '20000000-0000-4000-8000-000000000103';

delete from public.payments
where id = '20000000-0000-4000-8000-000000000103';

update public.agents
set active_version_id = null
where id = '20000000-0000-4000-8000-000000000101';

delete from public.agent_versions
where id = '20000000-0000-4000-8000-000000000102';

delete from public.agents
where id = '20000000-0000-4000-8000-000000000101';
'@
}

function Set-RevenueUiSmokeFixture {
  Clear-RevenueUiSmokeFixture

  Invoke-AgentHubSmokeSql @'
do $$
declare
  v_agent_id uuid := '20000000-0000-4000-8000-000000000101';
  v_agent_version_id uuid := '20000000-0000-4000-8000-000000000102';
  v_category_id uuid;
  v_creator_id uuid;
  v_payment_id uuid := '20000000-0000-4000-8000-000000000103';
  v_user_id uuid := '10000000-0000-4000-8000-000000000003';
  v_amount_cents integer := 1200;
begin
  select id
  into v_creator_id
  from public.creator_profiles
  where user_id = '10000000-0000-4000-8000-000000000001'
  limit 1;

  if v_creator_id is null then
    raise exception 'revenue-ui-smoke-missing-creator-profile';
  end if;

  select id
  into v_category_id
  from public.agent_categories
  order by created_at
  limit 1;

  if v_category_id is null then
    raise exception 'revenue-ui-smoke-missing-category';
  end if;

  insert into public.agents (
    id,
    creator_id,
    category_id,
    slug,
    name,
    summary,
    description,
    status,
    pricing_type,
    starting_price_cents,
    currency,
    risk_level,
    estimated_turnaround
  )
  values (
    v_agent_id,
    v_creator_id,
    v_category_id,
    'agenthub-revenue-ui-smoke-agent',
    'AgentHub Revenue UI Smoke Agent',
    'Temporary paid agent used by the local revenue UI smoke.',
    'Validates that creator revenue analytics render with paid access and ledger data.',
    'approved',
    'task',
    v_amount_cents,
    'eur',
    'low',
    'Instant'
  );

  insert into public.agent_versions (
    id,
    agent_id,
    version_number,
    capabilities,
    required_inputs,
    deliverables,
    limitations,
    data_handling_notes,
    changelog,
    workspace_mode,
    setup_requirements,
    output_promise,
    execution_mode,
    runtime_type,
    data_policy
  )
  values (
    v_agent_version_id,
    v_agent_id,
    1,
    array['Validate revenue analytics'],
    array['Sandbox purchase'],
    array['Revenue UI assertion'],
    array['Local smoke data only'],
    'No private user content is stored by this fixture.',
    'Initial revenue UI smoke version.',
    'guided',
    '{"type":"context","items":["Sandbox purchase"]}'::jsonb,
    '{"summary":"Creator revenue analytics render correctly.","examples":["GMV, ledger coverage, payout path."]}'::jsonb,
    'llm_prompt',
    'llm_prompt',
    '{"requires_files":false,"stores_user_data":false,"external_tools":[]}'::jsonb
  );

  update public.agents
  set active_version_id = v_agent_version_id
  where id = v_agent_id;

  insert into public.payments (
    id,
    user_id,
    agent_id,
    agent_version_id,
    amount_cents,
    currency,
    status,
    stripe_checkout_session_id
  )
  values (
    v_payment_id,
    v_user_id,
    v_agent_id,
    v_agent_version_id,
    v_amount_cents,
    'eur',
    'pending',
    'cs_test_agenthub_revenue_ui_smoke'
  );
end $$;
'@
}

function New-StripeSignatureHeader {
  param(
    [Parameter(Mandatory = $true)] [string]$Payload,
    [Parameter(Mandatory = $true)] [string]$Secret
  )

  $timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
  $signedPayload = "$timestamp.$Payload"
  $hmac = [System.Security.Cryptography.HMACSHA256]::new([System.Text.Encoding]::UTF8.GetBytes($Secret))
  try {
    $signature = [BitConverter]::ToString($hmac.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($signedPayload))).Replace("-", "").ToLowerInvariant()
  } finally {
    $hmac.Dispose()
  }

  return "t=$timestamp,v1=$signature"
}

function Invoke-RevenueWebhookSmoke {
  param(
    [Parameter(Mandatory = $true)] [string]$BaseUrl,
    [Parameter(Mandatory = $true)] [string]$WebhookSecret
  )

  $payload = @{
    id = "evt_agenthub_revenue_ui_smoke"
    type = "checkout.session.completed"
    data = @{
      object = @{
        id = "cs_test_agenthub_revenue_ui_smoke"
        amount_total = 1200
        currency = "eur"
        payment_intent = "pi_agenthub_revenue_ui_smoke"
        payment_status = "paid"
      }
    }
  } | ConvertTo-Json -Depth 10 -Compress
  $signature = New-StripeSignatureHeader -Payload $payload -Secret $WebhookSecret

  $response = Invoke-RestMethod `
    -Method Post `
    -Uri "$BaseUrl/api/stripe/webhook" `
    -Headers @{
      "stripe-signature" = $signature
      "Content-Type" = "application/json"
    } `
    -Body $payload `
    -TimeoutSec 20

  if ($response.received -ne $true) {
    throw "Stripe webhook smoke did not return received=true"
  }

  Invoke-AgentHubSmokeSql @'
do $$
declare
  v_payment_id uuid := '20000000-0000-4000-8000-000000000103';
  v_access_id uuid;
  v_earned_cents integer;
  v_event_count integer;
  v_run_id uuid := '20000000-0000-4000-8000-000000000105';
begin
  select rental_request_id
  into v_access_id
  from public.payments
  where id = v_payment_id
    and status = 'paid'
    and stripe_payment_intent_id = 'pi_agenthub_revenue_ui_smoke';

  if v_access_id is null then
    raise exception 'revenue-webhook-smoke-payment-not-fulfilled';
  end if;

  if not exists (
    select 1
    from public.rental_requests
    where id = v_access_id
      and payment_id = v_payment_id
      and status = 'active'
  ) then
    raise exception 'revenue-webhook-smoke-access-not-active';
  end if;

  select count(*)
  into v_event_count
  from public.creator_revenue_ledger
  where payment_id = v_payment_id
    and event_type in ('payment_paid', 'access_created');

  if v_event_count <> 2 then
    raise exception 'revenue-webhook-smoke-ledger-events-missing';
  end if;

  select coalesce(sum(creator_gross_cents), 0)
  into v_earned_cents
  from public.creator_revenue_ledger
  where payment_id = v_payment_id
    and event_type = 'access_created'
    and status = 'earned';

  if v_earned_cents <> 1200 then
    raise exception 'revenue-webhook-smoke-earned-amount-mismatch';
  end if;

  insert into public.agent_runs (
    id,
    rental_request_id,
    agent_id,
    agent_version_id,
    user_id,
    action_key,
    action_label,
    input_text,
    prompt_snapshot,
    output_text,
    status,
    provider,
    model,
    input_chars,
    output_chars,
    completed_at
  )
  select
    v_run_id,
    rr.id,
    rr.agent_id,
    rr.agent_version_id,
    rr.user_id,
    'paid-smoke',
    'Paid smoke run',
    'Paid smoke input',
    '{"source":"agenthub-paid-webhook-smoke"}'::jsonb,
    'Paid smoke output',
    'succeeded',
    'openai',
    'smoke-model',
    16,
    17,
    now()
  from public.rental_requests rr
  where rr.id = v_access_id
  on conflict (id) do nothing;

  if not public.can_user_review_rental_request(v_access_id, '20000000-0000-4000-8000-000000000101', '10000000-0000-4000-8000-000000000003') then
    raise exception 'revenue-webhook-smoke-review-not-eligible-after-run';
  end if;
end $$;
'@
}

function Get-AgentHubSmokeServerOutput {
  param(
    [string]$OutputPath,
    [string]$ErrorPath
  )

  $parts = @()

  if ($OutputPath -and (Test-Path $OutputPath)) {
    $parts += "stdout:"
    $parts += Get-Content -Path $OutputPath -Raw
  }

  if ($ErrorPath -and (Test-Path $ErrorPath)) {
    $parts += "stderr:"
    $parts += Get-Content -Path $ErrorPath -Raw
  }

  return ($parts -join [Environment]::NewLine).Trim()
}

function Wait-ForAgentHub {
  param(
    [int]$Port,
    [int]$ProcessId,
    [string]$OutputPath,
    [string]$ErrorPath
  )

  for ($i = 0; $i -lt 45; $i++) {
    Start-Sleep -Seconds 1

    try {
      $statusCode = (Invoke-WebRequest -UseBasicParsing "http://localhost:$Port/agenthub/search" -TimeoutSec 2).StatusCode
      if ($statusCode -eq 200) {
        return
      }
    } catch {
      # Keep waiting until the dev server is ready.
    }

    $process = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
    if (-not $process) {
      $serverOutput = Get-AgentHubSmokeServerOutput -OutputPath $OutputPath -ErrorPath $ErrorPath
      throw "Next dev server process exited before AgentHub became ready. Output:`n$serverOutput"
    }
  }

  $serverOutput = Get-AgentHubSmokeServerOutput -OutputPath $OutputPath -ErrorPath $ErrorPath
  throw "Next dev server did not become ready on port $Port. Output:`n$serverOutput"
}

try {
  $status = Get-SupabaseStatus

  if (-not $SkipDbSmoke) {
    Get-Content (Join-Path $projectRoot "scripts/agenthub-e2e-invariants-smoke.sql") |
      docker exec -i supabase_db_agenthub-webapp psql -U postgres -d postgres -v ON_ERROR_STOP=1
    Assert-NativeCommandSucceeded "agenthub DB invariants smoke"
  }

  Set-RevenueUiSmokeFixture

  $job = Start-Job -ScriptBlock {
    param($ProjectRoot, $Port, $ApiUrl, $AnonKey, $ServiceRoleKey, $StripeWebhookSecret)

    $env:NEXT_PUBLIC_SUPABASE_URL = $ApiUrl
    $env:NEXT_PUBLIC_SUPABASE_ANON_KEY = $AnonKey
    $env:SUPABASE_SERVICE_ROLE_KEY = $ServiceRoleKey
    $env:NEXT_PUBLIC_APP_URL = "http://localhost:$Port"
    $env:STRIPE_WEBHOOK_SECRET = $StripeWebhookSecret
    $env:ACCESS_MODE = "free_beta"
    $env:PAYMENTS_PROVIDER = "none"
    $env:ENABLE_FREE_BETA_ACCESS = "true"
    $env:LLM_RUNS_ENABLED = "false"
    $env:DOCUMENT_RUNS_ENABLED = "false"
    $env:WORKFLOW_RUNS_ENABLED = "false"
    $env:CREATOR_ENDPOINT_RUNS_ENABLED = "false"

    Set-Location $ProjectRoot
    $nextBin = Join-Path $ProjectRoot "node_modules\next\dist\bin\next"
    $outputLog = Join-Path ([System.IO.Path]::GetTempPath()) "agenthub-next-$Port-$PID.out.log"
    $errorLog = Join-Path ([System.IO.Path]::GetTempPath()) "agenthub-next-$Port-$PID.err.log"
    $process = Start-Process -FilePath "node" -ArgumentList @($nextBin, "dev", "-p", [string]$Port) -WorkingDirectory $ProjectRoot -WindowStyle Hidden -RedirectStandardOutput $outputLog -RedirectStandardError $errorLog -PassThru

    [pscustomobject]@{
      ErrorLog = $errorLog
      OutputLog = $outputLog
      ProcessId = $process.Id
    }
  } -ArgumentList $projectRoot.Path, $Port, $status.API_URL, $status.ANON_KEY, $status.SERVICE_ROLE_KEY, $stripeWebhookSecret

  $serverInfo = Receive-Job -Job $job -Wait
  $devServerProcessId = [int]$serverInfo.ProcessId
  $devServerOutputLog = [string]$serverInfo.OutputLog
  $devServerErrorLog = [string]$serverInfo.ErrorLog

  Wait-ForAgentHub -Port $Port -ProcessId $devServerProcessId -OutputPath $devServerOutputLog -ErrorPath $devServerErrorLog
  Invoke-RevenueWebhookSmoke -BaseUrl "http://localhost:$Port" -WebhookSecret $stripeWebhookSecret

  pwsh -NoProfile -File (Join-Path $projectRoot "scripts/agenthub-http-role-smoke.ps1") `
    -BaseUrl "http://localhost:$Port" `
    -ExpectRevenueFixture `
    -SkipEnvCheck
  Assert-NativeCommandSucceeded "agenthub HTTP role smoke"

  Write-Host "agenthub-local-e2e-smoke-ok"
} finally {
  if ($devServerProcessId) {
    Stop-Process -Id $devServerProcessId -Force -ErrorAction SilentlyContinue
  }

  if ($job) {
    Stop-Job $job -ErrorAction SilentlyContinue
    Remove-Job $job -Force -ErrorAction SilentlyContinue
  }

  $nodeAfter = @(Get-CimInstance Win32_Process -Filter "name = 'node.exe'")
  foreach ($process in $nodeAfter) {
    if (
      $nodeBefore -notcontains $process.ProcessId -and
      $process.CommandLine -and
      $process.CommandLine.Contains("agenthub-webapp")
    ) {
      Stop-Process -Id $process.ProcessId -Force -ErrorAction SilentlyContinue
    }
  }

  Clear-RevenueUiSmokeFixture
}
