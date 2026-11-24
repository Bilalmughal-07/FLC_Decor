param(
  [Parameter(Mandatory = $true)]
  [string]$OutputPath
)

$ErrorActionPreference = "Stop"
$connectionString = $env:DATABASE_URL
if ([string]::IsNullOrWhiteSpace($connectionString)) { throw "DATABASE_URL is required" }
$target = [Uri]$connectionString
if ($target.Host -notin @("127.0.0.1", "localhost")) { throw "Refusing non-local backup target from this development script" }
if ($target.AbsolutePath.Trim("/") -notin @("flcdecor_test", "flcdecor_restore")) { throw "Refusing database outside the disposable local test/restore allowlist" }

$destination = [IO.Path]::GetFullPath($OutputPath)
if (Test-Path -LiteralPath $destination) { throw "Refusing to overwrite an existing backup: $destination" }
$parent = Split-Path -Parent $destination
if ($parent) { New-Item -ItemType Directory -Force -Path $parent | Out-Null }

& pg_dump --format=custom --no-owner --file=$destination --dbname=$connectionString
if ($LASTEXITCODE -ne 0) { throw "pg_dump failed with exit code $LASTEXITCODE" }
Write-Output "Backup created at $destination; verify it with pg_restore --list before restore."
