[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$repositoryRoot = Split-Path -Parent $PSScriptRoot
$temporaryDatabase = 'flcdecor_migration_test'
$expectedHost = '127.0.0.1'
$expectedPort = 55432
$expectedAdminDatabase = 'postgres'

function Resolve-PostgresTool {
    param([Parameter(Mandatory = $true)][string]$Name)

    $command = Get-Command $Name -ErrorAction SilentlyContinue
    if ($null -ne $command) {
        return $command.Source
    }

    $candidates = Get-ChildItem 'C:\Program Files\PostgreSQL' -Directory -ErrorAction SilentlyContinue |
        Sort-Object { [version]$_.Name } -Descending |
        ForEach-Object { Join-Path $_.FullName "bin\$Name.exe" } |
        Where-Object { Test-Path -LiteralPath $_ }

    if ($null -eq $candidates -or $candidates.Count -eq 0) {
        throw "PostgreSQL tool '$Name' was not found."
    }

    return $candidates[0]
}

function Invoke-Checked {
    param(
        [Parameter(Mandatory = $true)][string]$Executable,
        [Parameter(Mandatory = $true)][string[]]$Arguments,
        [Parameter(Mandatory = $true)][string]$Description
    )

    & $Executable @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "$Description failed with exit code $LASTEXITCODE."
    }
}

function Invoke-PsqlFile {
    param(
        [Parameter(Mandatory = $true)][string]$Psql,
        [Parameter(Mandatory = $true)][string]$DatabaseUrl,
        [Parameter(Mandatory = $true)][string]$FilePath,
        [Parameter(Mandatory = $true)][string]$Description
    )

    Invoke-Checked -Executable $Psql -Description $Description -Arguments @(
        '--no-psqlrc',
        '--set', 'ON_ERROR_STOP=1',
        '--dbname', $DatabaseUrl,
        '--file', $FilePath
    )
}

$adminUrl = $env:LOCAL_POSTGRES_ADMIN_URL
if ([string]::IsNullOrWhiteSpace($adminUrl)) {
    throw 'Set LOCAL_POSTGRES_ADMIN_URL to the isolated local PostgreSQL admin database.'
}

try {
    $adminUri = [System.Uri]$adminUrl
} catch {
    throw 'LOCAL_POSTGRES_ADMIN_URL is not a valid PostgreSQL URL.'
}

$adminDatabase = $adminUri.AbsolutePath.Trim('/')
if ($adminUri.Scheme -notin @('postgres', 'postgresql') -or
    $adminUri.Host -ne $expectedHost -or
    $adminUri.Port -ne $expectedPort -or
    $adminDatabase -ne $expectedAdminDatabase) {
    throw "Refusing to run: LOCAL_POSTGRES_ADMIN_URL must target postgresql://...@$expectedHost`:$expectedPort/$expectedAdminDatabase."
}

if ($temporaryDatabase -eq $adminDatabase) {
    throw 'The temporary migration database must differ from the admin database.'
}

$userInfo = $adminUri.UserInfo.Split(':', 2)
$adminUser = [System.Uri]::UnescapeDataString($userInfo[0])
if ([string]::IsNullOrWhiteSpace($adminUser)) {
    throw 'LOCAL_POSTGRES_ADMIN_URL must include a PostgreSQL user.'
}

$databasePassword = if ($userInfo.Count -eq 2) {
    [System.Uri]::UnescapeDataString($userInfo[1])
} else {
    $null
}

$targetBuilder = [System.UriBuilder]$adminUri
$targetBuilder.Path = "/$temporaryDatabase"
$targetBuilder.Query = ''
$targetPsqlUrl = $targetBuilder.Uri.AbsoluteUri
$targetBuilder.Query = 'schema=public'
$targetDatabaseUrl = $targetBuilder.Uri.AbsoluteUri

$psql = Resolve-PostgresTool -Name 'psql'
$createdb = Resolve-PostgresTool -Name 'createdb'
$dropdb = Resolve-PostgresTool -Name 'dropdb'
$npx = (Get-Command 'npx.cmd' -ErrorAction Stop).Source

$previousPassword = $env:PGPASSWORD
$previousDirectUrl = $env:DIRECT_DATABASE_URL
$previousRuntimeUrl = $env:DATABASE_URL
$previousPoolMax = $env:DATABASE_POOL_MAX
$succeeded = $false

try {
    $env:PGPASSWORD = $databasePassword

    # The target name is a fixed constant and the server coordinates are
    # validated above before either destructive command is allowed to run.
    Invoke-Checked -Executable $dropdb -Description 'Dropping stale local migration test database' -Arguments @(
        '--host', $expectedHost,
        '--port', "$expectedPort",
        '--username', $adminUser,
        '--if-exists',
        '--force',
        $temporaryDatabase
    )
    Invoke-Checked -Executable $createdb -Description 'Creating local migration test database' -Arguments @(
        '--host', $expectedHost,
        '--port', "$expectedPort",
        '--username', $adminUser,
        $temporaryDatabase
    )

    Invoke-PsqlFile -Psql $psql -DatabaseUrl $adminUrl `
        -FilePath (Join-Path $repositoryRoot 'scripts\supabase-local-api-role-fixtures.sql') `
        -Description 'Preparing local-only Supabase API role fixtures'

    Invoke-PsqlFile -Psql $psql -DatabaseUrl $targetPsqlUrl `
        -FilePath (Join-Path $repositoryRoot 'scripts\supabase-pre-migration-security.sql') `
        -Description 'Applying the pre-migration exposure guard'

    Invoke-PsqlFile -Psql $psql -DatabaseUrl $targetPsqlUrl `
        -FilePath (Join-Path $repositoryRoot 'scripts\verify-supabase-pre-migration-security-local.sql') `
        -Description 'Verifying the pre-migration exposure guard'

    $env:DIRECT_DATABASE_URL = $targetDatabaseUrl
    $env:DATABASE_URL = $targetDatabaseUrl
    $env:DATABASE_POOL_MAX = '1'

    Push-Location $repositoryRoot
    try {
        Invoke-Checked -Executable $npx -Description 'Fresh Prisma migration deployment' -Arguments @(
            'prisma', 'migrate', 'deploy'
        )

        Invoke-PsqlFile -Psql $psql -DatabaseUrl $targetPsqlUrl `
            -FilePath (Join-Path $repositoryRoot 'scripts\verify-supabase-security-local.sql') `
            -Description 'Verifying server-only public schema security'

        foreach ($apiRole in @('anon', 'authenticated', 'service_role')) {
            $deniedSql = 'SET ROLE {0}; SELECT * FROM public._prisma_migrations LIMIT 1;' -f $apiRole
            $ErrorActionPreference = 'Continue'
            try {
                $deniedOutput = & $psql --no-psqlrc --set ON_ERROR_STOP=1 --dbname $targetPsqlUrl --command $deniedSql 2>&1
                $deniedExitCode = $LASTEXITCODE
            } finally {
                $ErrorActionPreference = 'Stop'
            }
            if ($deniedExitCode -eq 0) {
                throw "API role '$apiRole' unexpectedly read public._prisma_migrations."
            }
            if (($deniedOutput -join "`n") -notmatch 'permission denied') {
                throw "API role '$apiRole' failed for an unexpected reason."
            }
        }

        Invoke-Checked -Executable $npx -Description 'Prisma migration/schema drift check' -Arguments @(
            'prisma', 'migrate', 'diff',
            '--from-config-datasource',
            '--to-schema', 'prisma/schema.prisma',
            '--exit-code'
        )
    } finally {
        Pop-Location
    }

    $succeeded = $true
    Write-Host 'Fresh migration, zero-drift, RLS, privilege, and server-role checks passed.'
} finally {
    $env:PGPASSWORD = $previousPassword
    $env:DIRECT_DATABASE_URL = $previousDirectUrl
    $env:DATABASE_URL = $previousRuntimeUrl
    $env:DATABASE_POOL_MAX = $previousPoolMax

    if ($succeeded) {
        Invoke-Checked -Executable $dropdb -Description 'Removing verified local migration test database' -Arguments @(
            '--host', $expectedHost,
            '--port', "$expectedPort",
            '--username', $adminUser,
            '--if-exists',
            '--force',
            $temporaryDatabase
        )
    } else {
        Write-Warning "Verification failed; retained local database '$temporaryDatabase' for diagnosis."
    }
}
