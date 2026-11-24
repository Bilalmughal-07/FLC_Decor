$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$environmentPath = Join-Path $projectRoot ".env.local"
if (-not (Test-Path -LiteralPath $environmentPath)) {
  throw ".env.local is missing. Copy .env.example to .env.local and configure the isolated local PostgreSQL database first."
}

function Set-LocalEnvironmentValue {
  param([string]$Name, [string]$Value)
  $lines = [System.Collections.Generic.List[string]](Get-Content -LiteralPath $environmentPath)
  $matched = $false
  for ($index = 0; $index -lt $lines.Count; $index += 1) {
    if ($lines[$index] -match ("^" + [Regex]::Escape($Name) + "=")) {
      $lines[$index] = "$Name=$Value"
      $matched = $true
    }
  }
  if (-not $matched) { $lines.Add("$Name=$Value") }
  [System.IO.File]::WriteAllLines($environmentPath, $lines, (New-Object System.Text.UTF8Encoding($false)))
}

$existingKeyLine = Get-Content -LiteralPath $environmentPath | Where-Object { $_ -match '^AUTH_FIELD_ENCRYPTION_KEY=' } | Select-Object -First 1
$existingKey = if ($existingKeyLine) { $existingKeyLine.Substring("AUTH_FIELD_ENCRYPTION_KEY=".Length).Trim('"') } else { "" }
if ($existingKey -notmatch '^[0-9a-fA-F]{64}$') {
  $keyBytes = New-Object byte[] 32
  $generator = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  try { $generator.GetBytes($keyBytes) } finally { $generator.Dispose() }
  $existingKey = ([BitConverter]::ToString($keyBytes)).Replace('-', '').ToLowerInvariant()
  Set-LocalEnvironmentValue -Name "AUTH_FIELD_ENCRYPTION_KEY" -Value $existingKey
}
Set-LocalEnvironmentValue -Name "ADMIN_AUTH_RUNTIME" -Value "database"

$email = ""
while ($email -notmatch '^[^\s@]+@[^\s@]+\.[^\s@]+$') {
  $email = (Read-Host "Initial administrator email (for example, owner@example.com)").Trim()
  if ($email -notmatch '^[^\s@]+@[^\s@]+\.[^\s@]+$') {
    Write-Warning "Enter the administrator's real email address here. The confirmation phrase is requested separately."
  }
}
$confirmation = Read-Host "Type INITIAL_ADMIN_SETUP to confirm this is the first administrator"
if ($confirmation -cne "INITIAL_ADMIN_SETUP") { throw "Initial administrator confirmation was not accepted." }
$securePassword = Read-Host "Initial administrator password (16 to 256 characters)" -AsSecureString
while ($securePassword.Length -lt 16 -or $securePassword.Length -gt 256) {
  Write-Warning "The password must contain between 16 and 256 characters. Nothing was saved; try again."
  $securePassword = Read-Host "Initial administrator password (16 to 256 characters)" -AsSecureString
}
$passwordPointer = [IntPtr]::Zero

try {
  $passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
  $env:INITIAL_ADMIN_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
  $env:INITIAL_ADMIN_EMAIL = $email
  $env:ADMIN_AUTH_RUNTIME = "database"
  $env:AUTH_FIELD_ENCRYPTION_KEY = $existingKey
  $env:ADMIN_BOOTSTRAP_ENABLED = "true"
  $env:ADMIN_BOOTSTRAP_ENV = "local-development"
  $env:ADMIN_BOOTSTRAP_CONFIRM = "INITIAL_ADMIN_SETUP"
  Push-Location $projectRoot
  try {
    & npm.cmd run admin:bootstrap
    if ($LASTEXITCODE -ne 0) { throw "Initial administrator bootstrap failed." }
  } finally { Pop-Location }
} finally {
  if ($passwordPointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer) }
  Remove-Item Env:INITIAL_ADMIN_PASSWORD -ErrorAction SilentlyContinue
  Remove-Item Env:INITIAL_ADMIN_EMAIL -ErrorAction SilentlyContinue
  Remove-Item Env:ADMIN_BOOTSTRAP_ENABLED -ErrorAction SilentlyContinue
  Remove-Item Env:ADMIN_BOOTSTRAP_ENV -ErrorAction SilentlyContinue
  Remove-Item Env:ADMIN_BOOTSTRAP_CONFIRM -ErrorAction SilentlyContinue
}
