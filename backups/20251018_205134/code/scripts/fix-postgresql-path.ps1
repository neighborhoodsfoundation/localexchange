# Fix PostgreSQL PATH and Configure LocalEx Database
# Adds PostgreSQL to PATH and configures the database

param(
    [string]$Version = "18",
    [string]$Password = "LocalEx123!",
    [string]$Port = "5432"
)

$ErrorActionPreference = "Stop"

Write-Host "PostgreSQL PATH Fix and Configuration" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

$Config = @{
    Version = $Version
    Password = $Password
    Port = $Port
    DatabaseName = "localex_db"
    DatabaseUser = "localex_user"
    InstallPath = "C:\Program Files\PostgreSQL\$Version"
}

Write-Host "`nConfiguration:" -ForegroundColor Yellow
Write-Host "  PostgreSQL Version: $($Config.Version)" -ForegroundColor White
Write-Host "  Install Path: $($Config.InstallPath)" -ForegroundColor White
Write-Host "  Database Name: $($Config.DatabaseName)" -ForegroundColor White
Write-Host "  Database User: $($Config.DatabaseUser)" -ForegroundColor White

try {
    # Check if PostgreSQL is installed
    if (!(Test-Path $Config.InstallPath)) {
        Write-Host "PostgreSQL not found at $($Config.InstallPath)" -ForegroundColor Red
        exit 1
    }

    Write-Host "PostgreSQL found at $($Config.InstallPath)" -ForegroundColor Green

    # Add PostgreSQL to PATH for current session
    $pgBinPath = "$($Config.InstallPath)\bin"
    if ($env:PATH -notlike "*$pgBinPath*") {
        $env:PATH = "$env:PATH;$pgBinPath"
        Write-Host "Added PostgreSQL to PATH for current session" -ForegroundColor Green
    }

    # Test psql command
    $psqlPath = "$pgBinPath\psql.exe"
    if (Test-Path $psqlPath) {
        Write-Host "psql.exe found at $psqlPath" -ForegroundColor Green
    } else {
        Write-Host "psql.exe not found at $psqlPath" -ForegroundColor Red
        exit 1
    }

    # Set environment variables for psql
    $env:PGPASSWORD = $Config.Password

    # Test connection to postgres database
    Write-Host "`nTesting PostgreSQL connection..." -ForegroundColor Yellow
    $testResult = & "$psqlPath" -U postgres -d postgres -c "SELECT version();" 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "PostgreSQL connection successful!" -ForegroundColor Green
        Write-Host "Version: $($testResult[2])" -ForegroundColor Gray
    } else {
        Write-Host "PostgreSQL connection failed: $testResult" -ForegroundColor Red
        Write-Host "Please check if PostgreSQL service is running" -ForegroundColor Yellow
        exit 1
    }

    # Create database
    Write-Host "`nCreating database..." -ForegroundColor Yellow
    $createDbSQL = "CREATE DATABASE $($Config.DatabaseName);"
    $createDbResult = & "$psqlPath" -U postgres -d postgres -c $createDbSQL 2>&1
    
    if ($LASTEXITCODE -eq 0 -or $createDbResult -like '*already exists*') {
        Write-Host "Database '$($Config.DatabaseName)' ready" -ForegroundColor Green
    } else {
        Write-Host "Database creation result: $createDbResult" -ForegroundColor Yellow
    }
    
    # Create user
    Write-Host "Creating user..." -ForegroundColor Yellow
    $createUserSQL = "CREATE USER $($Config.DatabaseUser) WITH PASSWORD '$($Config.Password)';"
    $createUserResult = & "$psqlPath" -U postgres -d postgres -c $createUserSQL 2>&1
    
    if ($LASTEXITCODE -eq 0 -or $createUserResult -like '*already exists*') {
        Write-Host "User '$($Config.DatabaseUser)' ready" -ForegroundColor Green
    } else {
        Write-Host "User creation result: $createUserResult" -ForegroundColor Yellow
    }
    
    # Grant privileges
    Write-Host "Granting privileges..." -ForegroundColor Yellow
    $grantSQL = "GRANT ALL PRIVILEGES ON DATABASE $($Config.DatabaseName) TO $($Config.DatabaseUser);"
    & "$psqlPath" -U postgres -d postgres -c $grantSQL | Out-Null
    Write-Host "Privileges granted" -ForegroundColor Green

    # Test connection with new user
    Write-Host "Testing connection with new user..." -ForegroundColor Yellow
    $testUserSQL = "SELECT 'Connection successful' as status;"
    $testUserResult = & "$psqlPath" -U $Config.DatabaseUser -d $Config.DatabaseName -c $testUserSQL 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "User connection test successful!" -ForegroundColor Green
    } else {
        Write-Host "User connection test failed: $testUserResult" -ForegroundColor Red
        exit 1
    }

    # Create environment file
    Write-Host "`nCreating environment file..." -ForegroundColor Yellow
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
    Write-Host "`nInstalling npm dependencies..." -ForegroundColor Yellow
    if (Test-Path "package.json") {
        npm install
        if ($LASTEXITCODE -eq 0) {
            Write-Host "npm dependencies installed" -ForegroundColor Green
        } else {
            Write-Host "npm install failed - run 'npm install' manually" -ForegroundColor Yellow
        }
    } else {
        Write-Host "package.json not found - skipping npm install" -ForegroundColor Yellow
    }

    Write-Host "`n=== SETUP COMPLETE! ===" -ForegroundColor Green
    Write-Host "PostgreSQL is configured and ready" -ForegroundColor Green
    Write-Host "`nNext steps:" -ForegroundColor Yellow
    Write-Host "1. Run migrations: npm run db:migrate" -ForegroundColor White
    Write-Host "2. Check status: npm run db:status" -ForegroundColor White
    Write-Host "3. Start development: npm run dev" -ForegroundColor White
    
    Write-Host "`nConnection Details:" -ForegroundColor Yellow
    Write-Host "  Host: localhost" -ForegroundColor White
    Write-Host "  Port: $($Config.Port)" -ForegroundColor White
    Write-Host "  Database: $($Config.DatabaseName)" -ForegroundColor White
    Write-Host "  User: $($Config.DatabaseUser)" -ForegroundColor White
    Write-Host "  Password: $($Config.Password)" -ForegroundColor White
    
    Write-Host "`nNote: PostgreSQL is added to PATH for this session only." -ForegroundColor Yellow
    Write-Host "To make it permanent, add this to your system PATH:" -ForegroundColor Yellow
    Write-Host "  $pgBinPath" -ForegroundColor Gray

} catch {
    Write-Host "`nConfiguration failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
