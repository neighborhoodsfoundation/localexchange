# LocalEx PostgreSQL Configuration Script
# Configures database and user after PostgreSQL installation

param(
    [string]$Password = "LocalEx123!",
    [string]$Port = "5432"
)

$ErrorActionPreference = "Stop"

Write-Host "PostgreSQL Configuration for LocalEx" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan

$Config = @{
    Password = $Password
    Port = $Port
    DatabaseName = "localex_db"
    DatabaseUser = "localex_user"
}

Write-Host "`nConfiguration:" -ForegroundColor Yellow
Write-Host "  Database Name: $($Config.DatabaseName)" -ForegroundColor White
Write-Host "  Database User: $($Config.DatabaseUser)" -ForegroundColor White
Write-Host "  Port: $($Config.Port)" -ForegroundColor White

try {
    # Test if PostgreSQL is available
    $pgInstalled = Get-Command psql -ErrorAction SilentlyContinue
    if (!$pgInstalled) {
        Write-Host "PostgreSQL not found in PATH. Please ensure it's installed and added to PATH." -ForegroundColor Red
        Write-Host "Try running: .\scripts\install-postgresql-manual.ps1" -ForegroundColor Yellow
        exit 1
    }

    Write-Host "PostgreSQL found. Configuring..." -ForegroundColor Green

    # Set environment variables
    $env:PGPASSWORD = $Config.Password

    # Create database
    Write-Host "Creating database..." -ForegroundColor Yellow
    $createDbSQL = "CREATE DATABASE $($Config.DatabaseName);"
    $createDbResult = & psql -U postgres -d postgres -c $createDbSQL 2>&1
    
    if ($LASTEXITCODE -eq 0 -or $createDbResult -like '*already exists*') {
        Write-Host "Database ready" -ForegroundColor Green
    } else {
        Write-Host "Database creation result: $createDbResult" -ForegroundColor Yellow
    }
    
    # Create user
    Write-Host "Creating user..." -ForegroundColor Yellow
    $createUserSQL = "CREATE USER $($Config.DatabaseUser) WITH PASSWORD '$($Config.Password)';"
    $createUserResult = & psql -U postgres -d postgres -c $createUserSQL 2>&1
    
    if ($LASTEXITCODE -eq 0 -or $createUserResult -like '*already exists*') {
        Write-Host "User ready" -ForegroundColor Green
    } else {
        Write-Host "User creation result: $createUserResult" -ForegroundColor Yellow
    }
    
    # Grant privileges
    Write-Host "Granting privileges..." -ForegroundColor Yellow
    $grantSQL = "GRANT ALL PRIVILEGES ON DATABASE $($Config.DatabaseName) TO $($Config.DatabaseUser);"
    & psql -U postgres -d postgres -c $grantSQL | Out-Null
    Write-Host "Privileges granted" -ForegroundColor Green

    # Test connection
    Write-Host "Testing connection..." -ForegroundColor Yellow
    $testSQL = "SELECT 'Connection successful' as status;"
    $testResult = & psql -U $Config.DatabaseUser -d $Config.DatabaseName -c $testSQL 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Connection test successful!" -ForegroundColor Green
    } else {
        Write-Host "Connection test failed: $testResult" -ForegroundColor Red
        exit 1
    }

    # Create environment file
    Write-Host "Creating environment file..." -ForegroundColor Yellow
    $envContent = @"
# LocalEx Database Configuration
DB_HOST=localhost
DB_PORT=$($Config.Port)
DB_NAME=$($Config.DatabaseName)
DB_USER=$($Config.DatabaseUser)
DB_PASSWORD=$($Config.Password)
DB_SSL=false
DB_POOL_MIN=2
DB_POOL_MAX=20
"@
    
    $envFile = ".env"
    if (Test-Path $envFile) {
        Write-Host ".env file already exists - backing up to .env.backup" -ForegroundColor Yellow
        Copy-Item $envFile ".env.backup"
    }
    
    $envContent | Out-File -FilePath $envFile -Encoding UTF8
    Write-Host "Environment configuration saved to $envFile" -ForegroundColor Green

    Write-Host "`nConfiguration complete!" -ForegroundColor Green
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Install dependencies: npm install" -ForegroundColor White
    Write-Host "2. Run migrations: npm run db:migrate" -ForegroundColor White
    Write-Host "3. Check status: npm run db:status" -ForegroundColor White

} catch {
    Write-Host "Configuration failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
