param(
  [Parameter(Mandatory = $true)]
  [string]$BackupPath
)

$ErrorActionPreference = "Stop"
if ($env:ALLOW_DISPOSABLE_RESTORE -ne "true") { throw "Set ALLOW_DISPOSABLE_RESTORE=true only for an explicitly disposable restore database" }
$connectionString = $env:DATABASE_URL
if ([string]::IsNullOrWhiteSpace($connectionString)) { throw "DATABASE_URL is required" }
$target = [Uri]$connectionString
if ($target.Host -notin @("127.0.0.1", "localhost") -or $target.AbsolutePath.Trim("/") -notin @("flcdecor_restore", "flcdecor_test_restore")) { throw "Refusing restore outside the disposable local restore allowlist" }
$source = [IO.Path]::GetFullPath($BackupPath)
if (-not (Test-Path -LiteralPath $source -PathType Leaf)) { throw "Backup file was not found: $source" }

& pg_restore --clean --if-exists --no-owner --dbname=$connectionString $source
if ($LASTEXITCODE -ne 0) { throw "pg_restore failed with exit code $LASTEXITCODE" }
Write-Output "Disposable restore completed. Run migrations and invariant checks before using the database."
