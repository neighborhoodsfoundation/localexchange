# LocalEx PostgreSQL Installation Script
# Installs and configures PostgreSQL for LocalEx development

param(
    [string]$Version = "15",
    [string]$Password = "LocalEx123!",
    [string]$Port = "5432",
    [switch]$SkipInstall = $false
)

$ErrorActionPreference = "Stop"

Write-Host "🐘 LocalEx PostgreSQL Installation Script" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# Configuration
$Config = @{
    Version = $Version
    Password = $Password
    Port = $Port
    DatabaseName = "localex_db"
    DatabaseUser = "localex_user"
    InstallPath = "C:\Program Files\PostgreSQL\$Version"
    DataPath = "C:\Program Files\PostgreSQL\$Version\data"
}

Write-Host "`n📋 Installation Configuration:" -ForegroundColor Yellow
Write-Host "  PostgreSQL Version: $($Config.Version)" -ForegroundColor White
Write-Host "  Database Name: $($Config.DatabaseName)" -ForegroundColor White
Write-Host "  Database User: $($Config.DatabaseUser)" -ForegroundColor White
Write-Host "  Port: $($Config.Port)" -ForegroundColor White
Write-Host "  Install Path: $($Config.InstallPath)" -ForegroundColor White

try {
    # Check if PostgreSQL is already installed
    $pgInstalled = Get-Command psql -ErrorAction SilentlyContinue
    if ($pgInstalled -and !$SkipInstall) {
        Write-Host "`n⚠️ PostgreSQL appears to be already installed" -ForegroundColor Yellow
        $response = Read-Host "Do you want to continue with configuration? (y/N)"
        if ($response -ne 'y' -and $response -ne 'Y') {
            Write-Host "Installation cancelled" -ForegroundColor Red
            exit 0
        }
    }

    # Step 1: Download and Install PostgreSQL (if not skipping)
    if (!$SkipInstall) {
        Write-Host "`n📥 Step 1: Downloading PostgreSQL $($Config.Version)..." -ForegroundColor Yellow
        
        # Check if running as administrator
        $isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")
        if (!$isAdmin) {
            Write-Host "❌ This script must be run as Administrator to install PostgreSQL" -ForegroundColor Red
            Write-Host "Please right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
            exit 1
        }

        # Download PostgreSQL installer
        $downloadUrl = "https://get.enterprisedb.com/postgresql/postgresql-$($Config.Version)-1-windows-x64.exe"
        $installerPath = "$env:TEMP\postgresql-$($Config.Version)-installer.exe"
        
        Write-Host "Downloading from: $downloadUrl" -ForegroundColor Gray
        Invoke-WebRequest -Uri $downloadUrl -OutFile $installerPath -UseBasicParsing
        
        Write-Host "✅ Download completed" -ForegroundColor Green
        
        # Install PostgreSQL silently
        Write-Host "`n🔧 Installing PostgreSQL..." -ForegroundColor Yellow
        $installArgs = @(
            "--mode", "unattended",
            "--superpassword", $Config.Password,
            "--servicename", "postgresql",
            "--serviceaccount", "postgres",
            "--servicepassword", $Config.Password,
            "--serverport", $Config.Port,
            "--unattendedmodeui", "none",
            "--disable-components", "stackbuilder"
        )
        
        $process = Start-Process -FilePath $installerPath -ArgumentList $installArgs -Wait -PassThru
        
        if ($process.ExitCode -eq 0) {
            Write-Host "✅ PostgreSQL installed successfully" -ForegroundColor Green
        } else {
            Write-Host "❌ PostgreSQL installation failed with exit code: $($process.ExitCode)" -ForegroundColor Red
            exit 1
        }
        
        # Clean up installer
        Remove-Item $installerPath -Force
    }

    # Step 2: Add PostgreSQL to PATH
    Write-Host "`n🔧 Step 2: Configuring environment..." -ForegroundColor Yellow
    
    $pgPath = "$($Config.InstallPath)\bin"
    $currentPath = [Environment]::GetEnvironmentVariable("PATH", "Machine")
    
    if ($currentPath -notlike "*$pgPath*") {
        [Environment]::SetEnvironmentVariable("PATH", "$currentPath;$pgPath", "Machine")
        Write-Host "✅ Added PostgreSQL to system PATH" -ForegroundColor Green
    } else {
        Write-Host "✅ PostgreSQL already in PATH" -ForegroundColor Green
    }
    
    # Refresh PATH for current session
    $env:PATH = [Environment]::GetEnvironmentVariable("PATH", "Machine")

    # Step 3: Start PostgreSQL service
    Write-Host "`n🚀 Step 3: Starting PostgreSQL service..." -ForegroundColor Yellow
    
    try {
        Start-Service postgresql -ErrorAction Stop
        Write-Host "✅ PostgreSQL service started" -ForegroundColor Green
    } catch {
        Write-Host "⚠️ PostgreSQL service may already be running" -ForegroundColor Yellow
    }

    # Wait for service to be ready
    Write-Host "⏳ Waiting for PostgreSQL to be ready..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10

    # Step 4: Create database and user
    Write-Host "`n🗄️ Step 4: Creating database and user..." -ForegroundColor Yellow
    
    # Set environment variables for psql
    $env:PGPASSWORD = $Config.Password
    
    # Create database
    $createDbSQL = "CREATE DATABASE $($Config.DatabaseName);"
    $createDbResult = & psql -U postgres -d postgres -c $createDbSQL 2>&1
    
    if ($LASTEXITCODE -eq 0 -or $createDbResult -like '*already exists*') {
        Write-Host "Database '$($Config.DatabaseName)' ready" -ForegroundColor Green
    } else {
        Write-Host "Database creation: $createDbResult" -ForegroundColor Yellow
    }
    
    # Create user
    $createUserSQL = "CREATE USER $($Config.DatabaseUser) WITH PASSWORD '$($Config.Password)';"
    $createUserResult = & psql -U postgres -d postgres -c $createUserSQL 2>&1
    
    if ($LASTEXITCODE -eq 0 -or $createUserResult -like '*already exists*') {
        Write-Host "User '$($Config.DatabaseUser)' ready" -ForegroundColor Green
    } else {
        Write-Host "User creation: $createUserResult" -ForegroundColor Yellow
    }
    
    # Grant privileges
    $grantSQL = "GRANT ALL PRIVILEGES ON DATABASE $($Config.DatabaseName) TO $($Config.DatabaseUser);"
    & psql -U postgres -d postgres -c $grantSQL | Out-Null
    Write-Host "Privileges granted to user" -ForegroundColor Green

    # Step 5: Test connection
    Write-Host "`n🧪 Step 5: Testing database connection..." -ForegroundColor Yellow
    
    $testSQL = "SELECT version();"
    $testResult = & psql -U $Config.DatabaseUser -d $Config.DatabaseName -c $testSQL 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Database connection test successful" -ForegroundColor Green
        Write-Host "PostgreSQL Version: $($testResult[2])" -ForegroundColor Gray
    } else {
        Write-Host "Database connection test failed: $testResult" -ForegroundColor Red
        exit 1
    }

    # Step 6: Create environment file
    Write-Host "`n📝 Step 6: Creating environment configuration..." -ForegroundColor Yellow
    
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
        Write-Host "⚠️ .env file already exists - backing up to .env.backup" -ForegroundColor Yellow
        Copy-Item $envFile ".env.backup"
    }
    
    $envContent | Out-File -FilePath $envFile -Encoding UTF8
    Write-Host "✅ Environment configuration saved to $envFile" -ForegroundColor Green

    # Step 7: Install npm dependencies
    Write-Host "`n📦 Step 7: Installing npm dependencies..." -ForegroundColor Yellow
    
    if (Test-Path "package.json") {
        npm install
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ npm dependencies installed" -ForegroundColor Green
        } else {
            Write-Host "⚠️ npm install failed - you may need to run 'npm install' manually" -ForegroundColor Yellow
        }
    } else {
        Write-Host "⚠️ package.json not found - skipping npm install" -ForegroundColor Yellow
    }

    # Success message
    Write-Host "`n🎉 PostgreSQL Installation Complete!" -ForegroundColor Green
    Write-Host "=====================================" -ForegroundColor Green
    Write-Host "`n📋 Next Steps:" -ForegroundColor Yellow
    Write-Host "1. Run database migrations: npm run db:migrate" -ForegroundColor White
    Write-Host "2. Start the development server: npm run dev" -ForegroundColor White
    Write-Host "3. Check the documentation: docs/README.md" -ForegroundColor White
    
    Write-Host "`n🔗 Connection Details:" -ForegroundColor Yellow
    Write-Host "  Host: localhost" -ForegroundColor White
    Write-Host "  Port: $($Config.Port)" -ForegroundColor White
    Write-Host "  Database: $($Config.DatabaseName)" -ForegroundColor White
    Write-Host "  User: $($Config.DatabaseUser)" -ForegroundColor White
    Write-Host "  Password: $($Config.Password)" -ForegroundColor White
    
    Write-Host "`nUseful Commands:" -ForegroundColor Yellow
    Write-Host "  psql -U $($Config.DatabaseUser) -d $($Config.DatabaseName)" -ForegroundColor Gray
    Write-Host "  npm run db:migrate" -ForegroundColor Gray
    Write-Host "  npm run db:status" -ForegroundColor Gray

} catch {
    Write-Host "`n❌ Installation failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Please check the error above and try again" -ForegroundColor Yellow
    exit 1
}
