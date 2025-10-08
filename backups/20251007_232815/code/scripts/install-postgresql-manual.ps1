# LocalEx PostgreSQL Manual Installation Guide
# Provides instructions for manual PostgreSQL installation and setup

param(
    [string]$Password = "LocalEx123!",
    [string]$Port = "5432"
)

Write-Host "PostgreSQL Manual Installation Guide for LocalEx" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan

$Config = @{
    Password = $Password
    Port = $Port
    DatabaseName = "localex_db"
    DatabaseUser = "localex_user"
}

Write-Host "`nTarget Configuration:" -ForegroundColor Yellow
Write-Host "  Database Name: $($Config.DatabaseName)" -ForegroundColor White
Write-Host "  Database User: $($Config.DatabaseUser)" -ForegroundColor White
Write-Host "  Port: $($Config.Port)" -ForegroundColor White
Write-Host "  Password: $($Config.Password)" -ForegroundColor White

Write-Host "`n=== MANUAL INSTALLATION STEPS ===" -ForegroundColor Green

Write-Host "`n1. Download PostgreSQL 15:" -ForegroundColor Yellow
Write-Host "   Visit: https://www.postgresql.org/download/windows/" -ForegroundColor Cyan
Write-Host "   Click 'Download the installer'" -ForegroundColor Cyan
Write-Host "   Select PostgreSQL 15.x for Windows x86-64" -ForegroundColor Cyan

Write-Host "`n2. Install PostgreSQL with these settings:" -ForegroundColor Yellow
Write-Host "   - Installation Directory: C:\Program Files\PostgreSQL\15" -ForegroundColor White
Write-Host "   - Data Directory: C:\Program Files\PostgreSQL\15\data" -ForegroundColor White
Write-Host "   - Password: $($Config.Password)" -ForegroundColor White
Write-Host "   - Port: $($Config.Port)" -ForegroundColor White
Write-Host "   - Locale: Default locale" -ForegroundColor White
Write-Host "   - Advanced Options: Default" -ForegroundColor White

Write-Host "`n3. After installation, run this script to configure:" -ForegroundColor Yellow
Write-Host "   .\scripts\configure-postgresql.ps1" -ForegroundColor Cyan

Write-Host "`n=== OR USE CHOCOLATEY (Alternative) ===" -ForegroundColor Green

Write-Host "`nIf you have Chocolatey installed:" -ForegroundColor Yellow
Write-Host "   choco install postgresql --params '/Password:$($Config.Password)'" -ForegroundColor Cyan

Write-Host "`n=== OR USE WINGET (Alternative) ===" -ForegroundColor Green

Write-Host "`nIf you have winget installed:" -ForegroundColor Yellow
Write-Host "   winget install PostgreSQL.PostgreSQL" -ForegroundColor Cyan

Write-Host "`n=== OR USE DOCKER (Alternative) ===" -ForegroundColor Green

Write-Host "`nIf you have Docker installed:" -ForegroundColor Yellow
Write-Host "   docker run --name localex-postgres -e POSTGRES_PASSWORD=$($Config.Password) -e POSTGRES_DB=$($Config.DatabaseName) -p $($Config.Port):5432 -d postgres:15" -ForegroundColor Cyan

Write-Host "`nPress any key to continue after PostgreSQL is installed..." -ForegroundColor Yellow
Read-Host

Write-Host "`n=== CONFIGURING DATABASE ===" -ForegroundColor Green

try {
    # Test if PostgreSQL is installed
    $pgInstalled = Get-Command psql -ErrorAction SilentlyContinue
    if (!$pgInstalled) {
        Write-Host "PostgreSQL not found in PATH. Please ensure it's installed and added to PATH." -ForegroundColor Red
        exit 1
    }

    Write-Host "PostgreSQL found. Configuring database..." -ForegroundColor Green

    # Set environment variables
    $env:PGPASSWORD = $Config.Password

    # Create database
    Write-Host "Creating database..." -ForegroundColor Yellow
    $createDbSQL = "CREATE DATABASE $($Config.DatabaseName);"
    $createDbResult = & psql -U postgres -d postgres -c $createDbSQL 2>&1
    
    if ($LASTEXITCODE -eq 0 -or $createDbResult -like '*already exists*') {
        Write-Host "Database '$($Config.DatabaseName)' ready" -ForegroundColor Green
    } else {
        Write-Host "Database creation: $createDbResult" -ForegroundColor Yellow
    }
    
    # Create user
    Write-Host "Creating user..." -ForegroundColor Yellow
    $createUserSQL = "CREATE USER $($Config.DatabaseUser) WITH PASSWORD '$($Config.Password)';"
    $createUserResult = & psql -U postgres -d postgres -c $createUserSQL 2>&1
    
    if ($LASTEXITCODE -eq 0 -or $createUserResult -like '*already exists*') {
        Write-Host "User '$($Config.DatabaseUser)' ready" -ForegroundColor Green
    } else {
        Write-Host "User creation: $createUserResult" -ForegroundColor Yellow
    }
    
    # Grant privileges
    Write-Host "Granting privileges..." -ForegroundColor Yellow
    $grantSQL = "GRANT ALL PRIVILEGES ON DATABASE $($Config.DatabaseName) TO $($Config.DatabaseUser);"
    & psql -U postgres -d postgres -c $grantSQL | Out-Null
    Write-Host "Privileges granted" -ForegroundColor Green

    # Test connection
    Write-Host "Testing connection..." -ForegroundColor Yellow
    $testSQL = "SELECT version();"
    $testResult = & psql -U $Config.DatabaseUser -d $Config.DatabaseName -c $testSQL 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Connection test successful!" -ForegroundColor Green
        Write-Host "PostgreSQL Version: $($testResult[2])" -ForegroundColor Gray
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

    # Install npm dependencies
    Write-Host "Installing npm dependencies..." -ForegroundColor Yellow
    if (Test-Path "package.json") {
        npm install
        if ($LASTEXITCODE -eq 0) {
            Write-Host "npm dependencies installed" -ForegroundColor Green
        } else {
            Write-Host "npm install failed - run 'npm install' manually" -ForegroundColor Yellow
        }
    }

    Write-Host "`n=== SETUP COMPLETE! ===" -ForegroundColor Green
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Run migrations: npm run db:migrate" -ForegroundColor White
    Write-Host "2. Check status: npm run db:status" -ForegroundColor White
    Write-Host "3. Start development: npm run dev" -ForegroundColor White

} catch {
    Write-Host "Configuration failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
