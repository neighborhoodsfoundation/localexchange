# LocalEx OpenSearch Installation Script
# Installs OpenSearch 2.11 for Windows development environment

param(
    [Parameter(Mandatory=$false)]
    [string]$InstallPath = "C:\OpenSearch",
    
    [Parameter(Mandatory=$false)]
    [string]$Version = "2.11.0",
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipDownload = $false,
    
    [Parameter(Mandatory=$false)]
    [switch]$ConfigureService = $false
)

# Configuration
$Config = @{
    OpenSearchVersion = $Version
    InstallPath = $InstallPath
    DataPath = Join-Path $InstallPath "data"
    LogsPath = Join-Path $InstallPath "logs"
    ConfigPath = Join-Path $InstallPath "config"
    BinPath = Join-Path $InstallPath "bin"
    JavaHome = $null
    HeapSize = "1g"
    Port = 9200
    ClusterName = "localex-search"
    NodeName = "localex-node-1"
}

Write-Host "LocalEx OpenSearch Installation" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "Version: $($Config.OpenSearchVersion)" -ForegroundColor DarkCyan
Write-Host "Install Path: $($Config.InstallPath)" -ForegroundColor DarkCyan
Write-Host ""

function Test-JavaInstallation {
    Write-Host "Checking Java installation..." -ForegroundColor Yellow
    try {
        $javaVersion = java -version 2>&1 | Select-String "version"
        if ($javaVersion) {
            Write-Host "✅ Java found: $javaVersion" -ForegroundColor Green
            return $true
        }
    } catch {
        Write-Host "❌ Java not found" -ForegroundColor Red
    }
    return $false
}

function Install-Java {
    Write-Host "Java is required for OpenSearch. Installing OpenJDK 17..." -ForegroundColor Yellow
    
    # Try Chocolatey first
    if (Get-Command choco -ErrorAction SilentlyContinue) {
        Write-Host "Installing OpenJDK 17 via Chocolatey..." -ForegroundColor Cyan
        choco install openjdk17 -y
        return $true
    }
    
    # Try Winget
    if (Get-Command winget -ErrorAction SilentlyContinue) {
        Write-Host "Installing OpenJDK 17 via Winget..." -ForegroundColor Cyan
        winget install Microsoft.OpenJDK.17
        return $true
    }
    
    # Manual download instructions
    Write-Host "❌ Package managers not found. Please install Java manually:" -ForegroundColor Red
    Write-Host "1. Download OpenJDK 17 from: https://adoptium.net/" -ForegroundColor Yellow
    Write-Host "2. Install and set JAVA_HOME environment variable" -ForegroundColor Yellow
    Write-Host "3. Add Java to PATH" -ForegroundColor Yellow
    Write-Host "4. Re-run this script" -ForegroundColor Yellow
    return $false
}

function Download-OpenSearch {
    if ($SkipDownload) {
        Write-Host "⏭️ Skipping download (using existing files)" -ForegroundColor Yellow
        return $true
    }
    
    Write-Host "Downloading OpenSearch $($Config.OpenSearchVersion)..." -ForegroundColor Yellow
    
    $downloadUrl = "https://artifacts.opensearch.org/releases/bundle/opensearch/$($Config.OpenSearchVersion)/opensearch-$($Config.OpenSearchVersion)-windows-x64.zip"
    $zipFile = "opensearch-$($Config.OpenSearchVersion).zip"
    
    try {
        Write-Host "Downloading from: $downloadUrl" -ForegroundColor DarkCyan
        Invoke-WebRequest -Uri $downloadUrl -OutFile $zipFile -UseBasicParsing
        Write-Host "✅ Download completed: $zipFile" -ForegroundColor Green
        return $zipFile
    } catch {
        Write-Host "❌ Download failed: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

function Install-OpenSearch {
    param([string]$ZipFile)
    
    Write-Host "Installing OpenSearch..." -ForegroundColor Yellow
    
    # Create installation directory
    if (Test-Path $Config.InstallPath) {
        Write-Host "⚠️ Installation directory exists: $($Config.InstallPath)" -ForegroundColor Yellow
        $response = Read-Host "Remove existing installation? (y/N)"
        if ($response -eq 'y' -or $response -eq 'Y') {
            Remove-Item -Path $Config.InstallPath -Recurse -Force
        } else {
            Write-Host "❌ Installation cancelled" -ForegroundColor Red
            return $false
        }
    }
    
    # Extract OpenSearch
    Write-Host "Extracting OpenSearch..." -ForegroundColor Cyan
    try {
        Expand-Archive -Path $ZipFile -DestinationPath $Config.InstallPath -Force
        Write-Host "✅ Extraction completed" -ForegroundColor Green
        
        # Move contents from subdirectory to root
        $extractedDir = Get-ChildItem -Path $Config.InstallPath -Directory | Where-Object { $_.Name -like "opensearch-*" } | Select-Object -First 1
        if ($extractedDir) {
            Write-Host "Moving contents from $($extractedDir.Name) to root..." -ForegroundColor Cyan
            Get-ChildItem -Path $extractedDir.FullName | Move-Item -Destination $Config.InstallPath -Force
            Remove-Item -Path $extractedDir.FullName -Force
        }
        
        return $true
    } catch {
        Write-Host "❌ Extraction failed: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

function Configure-OpenSearch {
    Write-Host "Configuring OpenSearch..." -ForegroundColor Yellow
    
    $configFile = Join-Path $Config.ConfigPath "opensearch.yml"
    
    # Backup original config
    if (Test-Path $configFile) {
        Copy-Item $configFile "$configFile.backup" -Force
    }
    
    # Create custom configuration
    $opensearchConfig = @"
# LocalEx OpenSearch Configuration

# Cluster configuration
cluster.name: $($Config.ClusterName)
node.name: $($Config.NodeName)
node.roles: [master, data, ingest]

# Network configuration
network.host: 0.0.0.0
http.port: $($Config.Port)
transport.port: 9300

# Paths
path.data: $($Config.DataPath)
path.logs: $($Config.LogsPath)

# Discovery (single node for development)
discovery.type: single-node

# Security (disabled for development)
plugins.security.disabled: true

# Performance settings
indices.memory.index_buffer_size: 20%
indices.queries.cache.size: 10%
indices.fielddata.cache.size: 20%

# Logging
logger.level: INFO
logger.org.opensearch.discovery: DEBUG
"@
    
    try {
        Set-Content -Path $configFile -Value $opensearchConfig -Encoding UTF8
        Write-Host "✅ Configuration updated: $configFile" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "❌ Configuration failed: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

function Configure-JVM {
    Write-Host "Configuring JVM settings..." -ForegroundColor Yellow
    
    $jvmOptionsFile = Join-Path $Config.ConfigPath "jvm.options"
    
    # Backup original JVM options
    if (Test-Path $jvmOptionsFile) {
        Copy-Item $jvmOptionsFile "$jvmOptionsFile.backup" -Force
    }
    
    # Create JVM configuration
    $jvmConfig = @"
# LocalEx JVM Configuration

# Heap size
-Xms$($Config.HeapSize)
-Xmx$($Config.HeapSize)

# Garbage collection
-XX:+UseG1GC
-XX:G1HeapRegionSize=16m
-XX:+UseG1GC
-XX:+UnlockExperimentalVMOptions
-XX:+UseCGroupMemoryLimitForHeap
-XX:MaxRAMFraction=2

# Performance
-XX:+UseStringDeduplication
-XX:+OptimizeStringConcat

# Logging
-Dlog4j2.disable.jmx=true
"@
    
    try {
        Set-Content -Path $jvmOptionsFile -Value $jvmConfig -Encoding UTF8
        Write-Host "✅ JVM configuration updated: $jvmOptionsFile" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "❌ JVM configuration failed: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

function Create-Directories {
    Write-Host "Creating required directories..." -ForegroundColor Yellow
    
    $directories = @($Config.DataPath, $Config.LogsPath, $Config.ConfigPath)
    
    foreach ($dir in $directories) {
        if (!(Test-Path $dir)) {
            try {
                New-Item -ItemType Directory -Path $dir -Force | Out-Null
                Write-Host "✅ Created directory: $dir" -ForegroundColor Green
            } catch {
                Write-Host "❌ Failed to create directory $dir : $($_.Exception.Message)" -ForegroundColor Red
                return $false
            }
        }
    }
    
    return $true
}

function Install-Service {
    if (!$ConfigureService) {
        Write-Host "⏭️ Skipping Windows service installation" -ForegroundColor Yellow
        return $true
    }
    
    Write-Host "Installing OpenSearch as Windows service..." -ForegroundColor Yellow
    
    $serviceScript = Join-Path $Config.BinPath "opensearch-service.bat"
    
    if (Test-Path $serviceScript) {
        try {
            & $serviceScript install
            Write-Host "✅ OpenSearch service installed" -ForegroundColor Green
            
            & $serviceScript start
            Write-Host "✅ OpenSearch service started" -ForegroundColor Green
            
            return $true
        } catch {
            Write-Host "❌ Service installation failed: $($_.Exception.Message)" -ForegroundColor Red
            return $false
        }
    } else {
        Write-Host "❌ Service script not found: $serviceScript" -ForegroundColor Red
        return $false
    }
}

function Test-Installation {
    Write-Host "Testing OpenSearch installation..." -ForegroundColor Yellow
    
    # Wait for OpenSearch to start
    Write-Host "Waiting for OpenSearch to start..." -ForegroundColor Cyan
    Start-Sleep -Seconds 10
    
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:$($Config.Port)" -Method Get -TimeoutSec 30
        Write-Host "✅ OpenSearch is running!" -ForegroundColor Green
        Write-Host "Version: $($response.version.number)" -ForegroundColor Cyan
        Write-Host "Cluster: $($response.cluster_name)" -ForegroundColor Cyan
        Write-Host "URL: http://localhost:$($Config.Port)" -ForegroundColor Cyan
        return $true
    } catch {
        Write-Host "❌ OpenSearch test failed: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "Check logs at: $($Config.LogsPath)" -ForegroundColor Yellow
        return $false
    }
}

# Main installation process
try {
    Write-Host "Starting OpenSearch installation..." -ForegroundColor Green
    
    # Check Java
    if (!(Test-JavaInstallation)) {
        if (!(Install-Java)) {
            exit 1
        }
        # Refresh environment variables
        $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH", "User")
    }
    
    # Download OpenSearch
    $zipFile = Download-OpenSearch
    if (!$zipFile) {
        exit 1
    }
    
    # Install OpenSearch
    if (!(Install-OpenSearch -ZipFile $zipFile)) {
        exit 1
    }
    
    # Create directories
    if (!(Create-Directories)) {
        exit 1
    }
    
    # Configure OpenSearch
    if (!(Configure-OpenSearch)) {
        exit 1
    }
    
    # Configure JVM
    if (!(Configure-JVM)) {
        exit 1
    }
    
    # Install service (optional)
    if ($ConfigureService) {
        Install-Service
    }
    
    # Test installation
    if (!(Test-Installation)) {
        Write-Host "⚠️ Installation completed but OpenSearch is not responding" -ForegroundColor Yellow
        Write-Host "Try starting manually: $($Config.BinPath)\opensearch.bat" -ForegroundColor Cyan
    }
    
    Write-Host ""
    Write-Host "🎉 OpenSearch installation completed!" -ForegroundColor Green
    Write-Host "=====================================" -ForegroundColor Green
    Write-Host "Installation Path: $($Config.InstallPath)" -ForegroundColor Blue
    Write-Host "Configuration: $($Config.ConfigPath)\opensearch.yml" -ForegroundColor Blue
    Write-Host "Logs: $($Config.LogsPath)" -ForegroundColor Blue
    Write-Host "URL: http://localhost:$($Config.Port)" -ForegroundColor Blue
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor DarkCyan
    Write-Host "1. Start OpenSearch: $($Config.BinPath)\opensearch.bat" -ForegroundColor DarkCyan
    Write-Host "2. Verify installation: http://localhost:$($Config.Port)" -ForegroundColor DarkCyan
    Write-Host "3. Run LocalEx search tests: npm run search:test" -ForegroundColor DarkCyan
    
} catch {
    Write-Host "❌ Installation failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} finally {
    # Cleanup
    if (Test-Path $zipFile) {
        Remove-Item $zipFile -Force
        Write-Host "🧹 Cleaned up download file: $zipFile" -ForegroundColor DarkYellow
    }
}
