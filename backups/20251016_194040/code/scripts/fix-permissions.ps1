# Fix PostgreSQL permissions for LocalEx user
# Grants necessary permissions to create tables and schemas

$ErrorActionPreference = "Stop"

Write-Host "Fixing PostgreSQL Permissions" -ForegroundColor Cyan
Write-Host "=============================" -ForegroundColor Cyan

$Config = @{
    Password = "LocalEx123!"
    DatabaseName = "localex_db"
    DatabaseUser = "localex_user"
    InstallPath = "C:\Program Files\PostgreSQL\18"
}

$psqlPath = "$($Config.InstallPath)\bin\psql.exe"

try {
    # Set environment variables
    $env:PGPASSWORD = $Config.Password

    Write-Host "Granting permissions to user..." -ForegroundColor Yellow

    # Grant all privileges on database
    $grantDbSQL = "GRANT ALL PRIVILEGES ON DATABASE $($Config.DatabaseName) TO $($Config.DatabaseUser);"
    & "$psqlPath" -U postgres -d postgres -c $grantDbSQL
    Write-Host "Database privileges granted" -ForegroundColor Green

    # Grant schema privileges
    $grantSchemaSQL = "GRANT ALL ON SCHEMA public TO $($Config.DatabaseUser);"
    & "$psqlPath" -U postgres -d $Config.DatabaseName -c $grantSchemaSQL
    Write-Host "Schema privileges granted" -ForegroundColor Green

    # Grant usage and create privileges
    $grantUsageSQL = "GRANT USAGE, CREATE ON SCHEMA public TO $($Config.DatabaseUser);"
    & "$psqlPath" -U postgres -d $Config.DatabaseName -c $grantUsageSQL
    Write-Host "Usage and create privileges granted" -ForegroundColor Green

    # Grant default privileges for future tables
    $grantDefaultSQL = "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $($Config.DatabaseUser);"
    & "$psqlPath" -U postgres -d $Config.DatabaseName -c $grantDefaultSQL
    Write-Host "Default privileges granted" -ForegroundColor Green

    # Grant sequence privileges
    $grantSequenceSQL = "GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO $($Config.DatabaseUser);"
    & "$psqlPath" -U postgres -d $Config.DatabaseName -c $grantSequenceSQL
    Write-Host "Sequence privileges granted" -ForegroundColor Green

    # Make user owner of database
    $ownerSQL = "ALTER DATABASE $($Config.DatabaseName) OWNER TO $($Config.DatabaseUser);"
    & "$psqlPath" -U postgres -d postgres -c $ownerSQL
    Write-Host "Database ownership transferred" -ForegroundColor Green

    Write-Host "`nPermissions fixed successfully!" -ForegroundColor Green
    Write-Host "You can now run: npm run db:migrate" -ForegroundColor Yellow

} catch {
    Write-Host "Permission fix failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
