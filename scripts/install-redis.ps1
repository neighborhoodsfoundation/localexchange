# LocalEx Redis Installation Script for Windows
# Installs and configures Redis server for Phase 1.2

param(
    [Parameter(Mandatory=$false)]
    [string]$RedisVersion = "7.2.0",
    
    [Parameter(Mandatory=$false)]
    [string]$InstallPath = "C:\Program Files\Redis",
    
    [Parameter(Mandatory=$false)]
    [string]$Port = "6379",
    
    [Parameter(Mandatory=$false)]
    [switch]$StartService = $true
)

# Configuration
$Config = @{
    RedisVersion = $RedisVersion
    InstallPath = $InstallPath
    Port = $Port
    ServiceName = "Redis"
    ConfigFile = "$InstallPath\redis.conf"
    LogFile = "$InstallPath\redis.log"
    DataDir = "$InstallPath\data"
}

Write-Host "LocalEx Redis Installation Script" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "Redis Version: $($Config.RedisVersion)" -ForegroundColor Yellow
Write-Host "Install Path: $($Config.InstallPath)" -ForegroundColor Yellow
Write-Host "Port: $($Config.Port)" -ForegroundColor Yellow
Write-Host ""

# Check if running as administrator
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "❌ This script requires administrator privileges. Please run as administrator." -ForegroundColor Red
    exit 1
}

try {
    # Step 1: Create installation directory
    Write-Host "Step 1: Creating installation directory..." -ForegroundColor Green
    if (-not (Test-Path $Config.InstallPath)) {
        New-Item -ItemType Directory -Path $Config.InstallPath -Force | Out-Null
        Write-Host "✅ Installation directory created: $($Config.InstallPath)" -ForegroundColor Green
    } else {
        Write-Host "✅ Installation directory already exists: $($Config.InstallPath)" -ForegroundColor Green
    }

    # Step 2: Download Redis for Windows
    Write-Host "`nStep 2: Downloading Redis for Windows..." -ForegroundColor Green
    
    # Try multiple download sources
    $DownloadUrls = @(
        "https://github.com/microsoftarchive/redis/releases/download/win-3.0.504/Redis-x64-3.0.504.msi",
        "https://github.com/tporadowski/redis/releases/download/v5.0.14.1/Redis-x64-5.0.14.1.zip",
        "https://github.com/ServiceStack/redis-windows/releases/download/redis-latest/redis-latest.zip"
    )
    
    $RedisExe = "$($Config.InstallPath)\redis-server.exe"
    $DownloadSuccess = $false
    
    foreach ($url in $DownloadUrls) {
        try {
            Write-Host "Trying download from: $url" -ForegroundColor Yellow
            
            if ($url.EndsWith(".msi")) {
                # MSI installer
                $MsiFile = "$($Config.InstallPath)\redis.msi"
                Invoke-WebRequest -Uri $url -OutFile $MsiFile -UseBasicParsing
                
                Write-Host "Installing Redis MSI..." -ForegroundColor Yellow
                Start-Process msiexec.exe -Wait -ArgumentList "/i $MsiFile /quiet /norestart"
                
                # Find installed Redis executable
                $PossiblePaths = @(
                    "C:\Program Files\Redis\redis-server.exe",
                    "C:\Program Files (x86)\Redis\redis-server.exe",
                    "C:\Redis\redis-server.exe"
                )
                
                foreach ($path in $PossiblePaths) {
                    if (Test-Path $path) {
                        Copy-Item $path $RedisExe -Force
                        Write-Host "✅ Redis installed from MSI" -ForegroundColor Green
                        $DownloadSuccess = $true
                        break
                    }
                }
                
                if (Test-Path $MsiFile) {
                    Remove-Item $MsiFile -Force
                }
                
            } else {
                # ZIP archive
                $ZipFile = "$($Config.InstallPath)\redis.zip"
                Invoke-WebRequest -Uri $url -OutFile $ZipFile -UseBasicParsing
                
                # Extract ZIP file
                Add-Type -AssemblyName System.IO.Compression.FileSystem
                [System.IO.Compression.ZipFile]::ExtractToDirectory($ZipFile, "$($Config.InstallPath)\temp")
                
                # Find Redis executable in extracted files
                $RedisFiles = Get-ChildItem -Path "$($Config.InstallPath)\temp" -Recurse -Name "redis-server.exe"
                if ($RedisFiles) {
                    $SourceFile = "$($Config.InstallPath)\temp\$($RedisFiles[0])"
                    Copy-Item $SourceFile $RedisExe -Force
                    Write-Host "✅ Redis extracted from ZIP" -ForegroundColor Green
                    $DownloadSuccess = $true
                }
                
                # Cleanup
                if (Test-Path "$($Config.InstallPath)\temp") {
                    Remove-Item "$($Config.InstallPath)\temp" -Recurse -Force
                }
                if (Test-Path $ZipFile) {
                    Remove-Item $ZipFile -Force
                }
            }
            
            if ($DownloadSuccess) {
                break
            }
            
        } catch {
            Write-Host "⚠️ Download failed from $url : $($_.Exception.Message)" -ForegroundColor Yellow
            continue
        }
    }
    
    if (-not $DownloadSuccess) {
        Write-Host "❌ Failed to download Redis from any source. Please install manually:" -ForegroundColor Red
        Write-Host "1. Download Redis for Windows from: https://github.com/microsoftarchive/redis/releases" -ForegroundColor Yellow
        Write-Host "2. Install and copy redis-server.exe to: $RedisExe" -ForegroundColor Yellow
        exit 1
    }

    # Step 3: Create Redis configuration file
    Write-Host "`nStep 3: Creating Redis configuration..." -ForegroundColor Green
    
    $RedisConfig = @"
# LocalEx Redis Configuration
# Generated on $(Get-Date)

# Network
bind 127.0.0.1
port $($Config.Port)
timeout 300
tcp-keepalive 60

# General
daemonize no
supervised no
pidfile $($Config.InstallPath)\redis.pid
loglevel notice
logfile "$($Config.LogFile)"

# Persistence
dir "$($Config.DataDir)"
save 900 1
save 300 10
save 60 10000

# Memory Management
maxmemory 2gb
maxmemory-policy allkeys-lru

# Security
requirepass LocalExRedis2024!

# Performance
tcp-backlog 511
databases 16
stop-writes-on-bgsave-error yes
rdbcompression yes
rdbchecksum yes

# Slow Log
slowlog-log-slower-than 10000
slowlog-max-len 128

# Client
maxclients 10000
"@

    # Create data directory
    if (-not (Test-Path $Config.DataDir)) {
        New-Item -ItemType Directory -Path $Config.DataDir -Force | Out-Null
    }

    # Write configuration file
    $RedisConfig | Out-File -FilePath $Config.ConfigFile -Encoding UTF8
    Write-Host "✅ Redis configuration created: $($Config.ConfigFile)" -ForegroundColor Green

    # Step 4: Test Redis installation
    Write-Host "`nStep 4: Testing Redis installation..." -ForegroundColor Green
    
    if (Test-Path $RedisExe) {
        Write-Host "✅ Redis executable found: $RedisExe" -ForegroundColor Green
        
        # Test Redis startup
        Write-Host "Testing Redis startup..." -ForegroundColor Yellow
        $Process = Start-Process -FilePath $RedisExe -ArgumentList "$($Config.ConfigFile)" -PassThru -WindowStyle Hidden
        Start-Sleep -Seconds 3
        
        if (-not $Process.HasExited) {
            Write-Host "✅ Redis started successfully" -ForegroundColor Green
            $Process.Kill()
            $Process.WaitForExit()
        } else {
            Write-Host "⚠️ Redis startup test failed" -ForegroundColor Yellow
        }
        
    } else {
        Write-Host "❌ Redis executable not found: $RedisExe" -ForegroundColor Red
        exit 1
    }

    # Step 5: Install Redis as Windows Service
    Write-Host "`nStep 5: Installing Redis as Windows Service..." -ForegroundColor Green
    
    try {
        # Create service using sc command
        $ServiceCommand = "sc create `"$($Config.ServiceName)`" binPath= `"$RedisExe $($Config.ConfigFile)`" start= auto DisplayName= `"LocalEx Redis Server`""
        Invoke-Expression $ServiceCommand
        
        Write-Host "✅ Redis service created: $($Config.ServiceName)" -ForegroundColor Green
        
        if ($StartService) {
            Write-Host "Starting Redis service..." -ForegroundColor Yellow
            Start-Service -Name $Config.ServiceName
            Start-Sleep -Seconds 2
            
            $ServiceStatus = Get-Service -Name $Config.ServiceName -ErrorAction SilentlyContinue
            if ($ServiceStatus -and $ServiceStatus.Status -eq "Running") {
                Write-Host "✅ Redis service started successfully" -ForegroundColor Green
            } else {
                Write-Host "⚠️ Redis service start failed" -ForegroundColor Yellow
            }
        }
        
    } catch {
        Write-Host "⚠️ Service installation failed: $($_.Exception.Message)" -ForegroundColor Yellow
        Write-Host "You can start Redis manually with: $RedisExe $($Config.ConfigFile)" -ForegroundColor Cyan
    }

    # Step 6: Test Redis connection
    Write-Host "`nStep 6: Testing Redis connection..." -ForegroundColor Green
    
    try {
        # Test with redis-cli if available
        $RedisCli = "$($Config.InstallPath)\redis-cli.exe"
        if (Test-Path $RedisCli) {
            Write-Host "Testing Redis connection with redis-cli..." -ForegroundColor Yellow
            
            # Start Redis temporarily for testing
            $TestProcess = Start-Process -FilePath $RedisExe -ArgumentList "$($Config.ConfigFile)" -PassThru -WindowStyle Hidden
            Start-Sleep -Seconds 2
            
            if (-not $TestProcess.HasExited) {
                # Test basic Redis commands
                $TestResult = & $RedisCli -a "LocalExRedis2024!" ping 2>$null
                if ($TestResult -eq "PONG") {
                    Write-Host "✅ Redis connection test successful" -ForegroundColor Green
                } else {
                    Write-Host "⚠️ Redis connection test failed" -ForegroundColor Yellow
                }
                
                $TestProcess.Kill()
                $TestProcess.WaitForExit()
            }
        } else {
            Write-Host "⚠️ redis-cli not found, skipping connection test" -ForegroundColor Yellow
        }
        
    } catch {
        Write-Host "⚠️ Connection test failed: $($_.Exception.Message)" -ForegroundColor Yellow
    }

    # Step 7: Create Redis management scripts
    Write-Host "`nStep 7: Creating Redis management scripts..." -ForegroundColor Green
    
    # Start Redis script
    $StartScript = @"
@echo off
echo Starting LocalEx Redis Server...
"$RedisExe" "$($Config.ConfigFile)"
"@
    $StartScript | Out-File -FilePath "$($Config.InstallPath)\start-redis.bat" -Encoding ASCII
    
    # Stop Redis script
    $StopScript = @"
@echo off
echo Stopping LocalEx Redis Server...
taskkill /f /im redis-server.exe
"@
    $StopScript | Out-File -FilePath "$($Config.InstallPath)\stop-redis.bat" -Encoding ASCII
    
    Write-Host "✅ Management scripts created" -ForegroundColor Green

    # Success Summary
    Write-Host "`n🎉 Redis Installation Completed Successfully!" -ForegroundColor Green
    Write-Host "=============================================" -ForegroundColor Green
    Write-Host "Redis Server: $RedisExe" -ForegroundColor Cyan
    Write-Host "Configuration: $($Config.ConfigFile)" -ForegroundColor Cyan
    Write-Host "Port: $($Config.Port)" -ForegroundColor Cyan
    Write-Host "Password: LocalExRedis2024!" -ForegroundColor Cyan
    Write-Host "Service Name: $($Config.ServiceName)" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor Yellow
    Write-Host "- Test Redis connection from Node.js application" -ForegroundColor White
    Write-Host "- Configure cache layer implementation" -ForegroundColor White
    Write-Host "- Set up monitoring and alerting" -ForegroundColor White
    Write-Host "- Implement queue system" -ForegroundColor White
    
} catch {
    Write-Host "`n❌ Redis Installation Failed!" -ForegroundColor Red
    Write-Host "=============================" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Location: $($_.InvocationInfo.ScriptLineNumber)" -ForegroundColor Red
    
    exit 1
}

Write-Host "`nRedis installation process completed at $(Get-Date)" -ForegroundColor Cyan
