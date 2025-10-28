# LocalEx Comprehensive Backup & Restore System
# Version: 2.0
# Date: October 18, 2025
# Purpose: Complete backup and restore system for LocalEx platform

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("backup", "restore", "list", "verify", "cleanup")]
    [string]$Action = "backup",
    
    [Parameter(Mandatory=$false)]
    [string]$BackupId = "",
    
    [Parameter(Mandatory=$false)]
    [int]$RetentionDays = 30,
    
    [Parameter(Mandatory=$false)]
    [switch]$Force,
    
    [Parameter(Mandatory=$false)]
    [switch]$LogVerbose
)

# Configuration
$ScriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptPath
$BackupRoot = Join-Path $ProjectRoot "backups"
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupId = if ($BackupId) { $BackupId } else { $Timestamp }

# Create backup directory structure
$BackupPath = Join-Path $BackupRoot $BackupId
$CodePath = Join-Path $BackupPath "code"
$ConfigPath = Join-Path $BackupPath "config"
$DatabasePath = Join-Path $BackupPath "database"
$TestPath = Join-Path $BackupPath "tests"
$DocsPath = Join-Path $BackupPath "docs"

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $LogMessage = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] [$Level] $Message"
    Write-Host $LogMessage
    if ($LogVerbose) {
        Add-Content -Path (Join-Path $BackupPath "backup.log") -Value $LogMessage
    }
}

function Test-Prerequisites {
    Write-Log "Checking prerequisites..."
    
    # Check if 7-Zip is available for compression
    $7ZipPath = Get-Command "7z.exe" -ErrorAction SilentlyContinue
    if (-not $7ZipPath) {
        Write-Log "7-Zip not found. Please install 7-Zip for compression support." "WARN"
    }
    
    # Check available disk space
    $Drive = (Get-Item $ProjectRoot).PSDrive
    $FreeSpaceGB = [math]::Round($Drive.Free / 1GB, 2)
    if ($FreeSpaceGB -lt 5) {
        Write-Log "Warning: Less than 5GB free space available. Backup may fail." "WARN"
    }
    
    Write-Log "Prerequisites check completed. Free space: $FreeSpaceGB GB"
}

function New-Backup {
    Write-Log "Starting comprehensive backup: $BackupId"
    
    try {
        # Create backup directory structure
        New-Item -ItemType Directory -Path $BackupPath -Force | Out-Null
        New-Item -ItemType Directory -Path $CodePath -Force | Out-Null
        New-Item -ItemType Directory -Path $ConfigPath -Force | Out-Null
        New-Item -ItemType Directory -Path $DatabasePath -Force | Out-Null
        New-Item -ItemType Directory -Path $TestPath -Force | Out-Null
        New-Item -ItemType Directory -Path $DocsPath -Force | Out-Null
        
        # Backup source code
        Write-Log "Backing up source code..."
        $SourceItems = @(
            "src",
            "tests",
            "scripts",
            "package.json",
            "package-lock.json",
            "tsconfig.json",
            "jest.config.js",
            "env.example"
        )
        
        foreach ($Item in $SourceItems) {
            $SourcePath = Join-Path $ProjectRoot $Item
            $DestPath = Join-Path $CodePath $Item
            
            if (Test-Path $SourcePath) {
                Copy-Item -Path $SourcePath -Destination $DestPath -Recurse -Force
                Write-Log "Backed up: $Item"
            }
        }
        
        # Backup configuration files
        Write-Log "Backing up configuration files..."
        $ConfigItems = @(
            "docker-compose*.yml",
            "opensearch.yml",
            "redis.conf",
            ".env*"
        )
        
        foreach ($Pattern in $ConfigItems) {
            $ConfigFiles = Get-ChildItem -Path $ProjectRoot -Filter $Pattern -Force
            foreach ($File in $ConfigFiles) {
                Copy-Item -Path $File.FullName -Destination $ConfigPath -Force
                Write-Log "Backed up config: $($File.Name)"
            }
        }
        
        # Backup documentation
        Write-Log "Backing up documentation..."
        if (Test-Path (Join-Path $ProjectRoot "docs")) {
            Copy-Item -Path (Join-Path $ProjectRoot "docs") -Destination $DocsPath -Recurse -Force
            Write-Log "Backed up documentation"
        }
        
        # Backup database schema and data
        Write-Log "Backing up database information..."
        $DatabaseFiles = Get-ChildItem -Path $ProjectRoot -Filter "*.sql" -Recurse
        foreach ($File in $DatabaseFiles) {
            Copy-Item -Path $File.FullName -Destination $DatabasePath -Force
            Write-Log "Backed up database file: $($File.Name)"
        }
        
        # Create backup manifest
        $Manifest = @{
            BackupId = $BackupId
            Timestamp = $Timestamp
            Version = "2.0"
            ProjectRoot = $ProjectRoot
            BackupPath = $BackupPath
            Items = @{
                Code = $SourceItems
                Config = $ConfigItems
                Database = ($DatabaseFiles | ForEach-Object { $_.Name })
                Documentation = "docs"
            }
            Metadata = @{
                TotalFiles = (Get-ChildItem -Path $BackupPath -Recurse -File).Count
                TotalSize = [math]::Round(((Get-ChildItem -Path $BackupPath -Recurse -File | Measure-Object -Property Length -Sum).Sum / 1MB), 2)
                CreatedBy = $env:USERNAME
                CreatedOn = $env:COMPUTERNAME
            }
        }
        
        $ManifestPath = Join-Path $BackupPath "backup_manifest.json"
        $Manifest | ConvertTo-Json -Depth 10 | Out-File -FilePath $ManifestPath -Encoding UTF8
        
        Write-Log "Backup completed successfully!"
        Write-Log "Backup ID: $BackupId"
        Write-Log "Backup Path: $BackupPath"
        Write-Log "Total Files: $($Manifest.Metadata.TotalFiles)"
        Write-Log "Total Size: $($Manifest.Metadata.TotalSize) MB"
        
        # Compress backup if 7-Zip is available
        $7ZipPath = Get-Command "7z.exe" -ErrorAction SilentlyContinue
        if ($7ZipPath) {
            Write-Log "Compressing backup..."
            $ZipPath = "$BackupPath.zip"
            & 7z.exe a -tzip $ZipPath $BackupPath
            if ($LASTEXITCODE -eq 0) {
                Write-Log "Backup compressed: $ZipPath"
                # Remove uncompressed backup
                Remove-Item -Path $BackupPath -Recurse -Force
                Write-Log "Uncompressed backup removed"
            }
        }
        
    } catch {
        Write-Log "Backup failed: $($_.Exception.Message)" "ERROR"
        throw
    }
}

function Restore-Backup {
    param([string]$BackupId)
    
    Write-Log "Starting restore from backup: $BackupId"
    
    try {
        $BackupPath = Join-Path $BackupRoot $BackupId
        $ZipPath = "$BackupPath.zip"
        
        # Check if backup exists
        if (-not (Test-Path $BackupPath) -and -not (Test-Path $ZipPath)) {
            throw "Backup not found: $BackupId"
        }
        
        # Extract if compressed
        if (Test-Path $ZipPath) {
            Write-Log "Extracting compressed backup..."
            $7ZipPath = Get-Command "7z.exe" -ErrorAction SilentlyContinue
            if ($7ZipPath) {
                & 7z.exe x $ZipPath -o$BackupRoot
                if ($LASTEXITCODE -ne 0) {
                    throw "Failed to extract backup"
                }
            } else {
                throw "7-Zip not available for extraction"
            }
        }
        
        # Read manifest
        $ManifestPath = Join-Path $BackupPath "backup_manifest.json"
        if (-not (Test-Path $ManifestPath)) {
            throw "Backup manifest not found"
        }
        
        $Manifest = Get-Content -Path $ManifestPath | ConvertFrom-Json
        Write-Log "Restoring backup from: $($Manifest.Timestamp)"
        
        if (-not $Force) {
            $Confirm = Read-Host "This will overwrite current files. Continue? (y/N)"
            if ($Confirm -ne "y" -and $Confirm -ne "Y") {
                Write-Log "Restore cancelled by user"
                return
            }
        }
        
        # Restore files
        Write-Log "Restoring source code..."
        $CodePath = Join-Path $BackupPath "code"
        if (Test-Path $CodePath) {
            Get-ChildItem -Path $CodePath | ForEach-Object {
                $DestPath = Join-Path $ProjectRoot $_.Name
                Copy-Item -Path $_.FullName -Destination $DestPath -Recurse -Force
                Write-Log "Restored: $($_.Name)"
            }
        }
        
        Write-Log "Restoring configuration files..."
        $ConfigPath = Join-Path $BackupPath "config"
        if (Test-Path $ConfigPath) {
            Get-ChildItem -Path $ConfigPath | ForEach-Object {
                $DestPath = Join-Path $ProjectRoot $_.Name
                Copy-Item -Path $_.FullName -Destination $DestPath -Force
                Write-Log "Restored config: $($_.Name)"
            }
        }
        
        Write-Log "Restoring documentation..."
        $DocsPath = Join-Path $BackupPath "docs"
        if (Test-Path $DocsPath) {
            $DestPath = Join-Path $ProjectRoot "docs"
            Copy-Item -Path $DocsPath -Destination $DestPath -Recurse -Force
            Write-Log "Restored documentation"
        }
        
        Write-Log "Restore completed successfully!"
        
    } catch {
        Write-Log "Restore failed: $($_.Exception.Message)" "ERROR"
        throw
    }
}

function Get-BackupList {
    Write-Log "Listing available backups..."
    
    $Backups = Get-ChildItem -Path $BackupRoot -Directory | Sort-Object Name -Descending
    $ZipBackups = Get-ChildItem -Path $BackupRoot -Filter "*.zip" | Sort-Object Name -Descending
    
    Write-Host "`nAvailable Backups:"
    Write-Host "================="
    
    foreach ($Backup in $Backups) {
        $ManifestPath = Join-Path $Backup.FullName "backup_manifest.json"
        if (Test-Path $ManifestPath) {
            $Manifest = Get-Content -Path $ManifestPath | ConvertFrom-Json
            Write-Host "ID: $($Backup.Name)"
            Write-Host "  Date: $($Manifest.Timestamp)"
            Write-Host "  Size: $($Manifest.Metadata.TotalSize) MB"
            Write-Host "  Files: $($Manifest.Metadata.TotalFiles)"
            Write-Host ""
        }
    }
    
    foreach ($ZipBackup in $ZipBackups) {
        $Size = [math]::Round($ZipBackup.Length / 1MB, 2)
        Write-Host "ID: $($ZipBackup.BaseName) (Compressed)"
        Write-Host "  Date: $($ZipBackup.CreationTime)"
        Write-Host "  Size: $Size MB"
        Write-Host ""
    }
}

function Test-BackupIntegrity {
    param([string]$BackupId)
    
    Write-Log "Verifying backup integrity: $BackupId"
    
    try {
        $BackupPath = Join-Path $BackupRoot $BackupId
        $ZipPath = "$BackupPath.zip"
        
        if (-not (Test-Path $BackupPath) -and -not (Test-Path $ZipPath)) {
            throw "Backup not found: $BackupId"
        }
        
        # Check manifest
        $ManifestPath = if (Test-Path $ZipPath) { 
            # For compressed backups, we'd need to extract and check
            Write-Log "Cannot verify compressed backup without extraction" "WARN"
            return
        } else { 
            Join-Path $BackupPath "backup_manifest.json" 
        }
        
        if (-not (Test-Path $ManifestPath)) {
            throw "Backup manifest not found"
        }
        
        $Manifest = Get-Content -Path $ManifestPath | ConvertFrom-Json
        
        # Verify file counts and structure
        $ActualFiles = (Get-ChildItem -Path $BackupPath -Recurse -File).Count
        $ExpectedFiles = $Manifest.Metadata.TotalFiles
        
        if ($ActualFiles -eq $ExpectedFiles) {
            Write-Log "✅ Backup integrity verified successfully!"
            Write-Log "Expected files: $ExpectedFiles, Actual files: $ActualFiles"
        } else {
            Write-Log "⚠️ Backup integrity warning: File count mismatch" "WARN"
            Write-Log "Expected files: $ExpectedFiles, Actual files: $ActualFiles"
        }
        
    } catch {
        Write-Log "Backup verification failed: $($_.Exception.Message)" "ERROR"
        throw
    }
}

function Remove-OldBackups {
    param([int]$RetentionDays)
    
    Write-Log "Cleaning up backups older than $RetentionDays days..."
    
    $CutoffDate = (Get-Date).AddDays(-$RetentionDays)
    $RemovedCount = 0
    
    # Remove old directories
    $OldBackups = Get-ChildItem -Path $BackupRoot -Directory | Where-Object { $_.CreationTime -lt $CutoffDate }
    foreach ($Backup in $OldBackups) {
        Remove-Item -Path $Backup.FullName -Recurse -Force
        Write-Log "Removed old backup: $($Backup.Name)"
        $RemovedCount++
    }
    
    # Remove old zip files
    $OldZipBackups = Get-ChildItem -Path $BackupRoot -Filter "*.zip" | Where-Object { $_.CreationTime -lt $CutoffDate }
    foreach ($ZipBackup in $OldZipBackups) {
        Remove-Item -Path $ZipBackup.FullName -Force
        Write-Log "Removed old compressed backup: $($ZipBackup.Name)"
        $RemovedCount++
    }
    
    Write-Log "Cleanup completed. Removed $RemovedCount old backups."
}

# Main execution
try {
    Test-Prerequisites
    
    switch ($Action) {
        "backup" {
            New-Backup
        }
        "restore" {
            if (-not $BackupId) {
                Write-Log "Backup ID is required for restore operation" "ERROR"
                exit 1
            }
            Restore-Backup -BackupId $BackupId
        }
        "list" {
            Get-BackupList
        }
        "verify" {
            if (-not $BackupId) {
                Write-Log "Backup ID is required for verification" "ERROR"
                exit 1
            }
            Test-BackupIntegrity -BackupId $BackupId
        }
        "cleanup" {
            Remove-OldBackups -RetentionDays $RetentionDays
        }
    }
    
    Write-Log "Operation completed successfully!"
    
} catch {
    Write-Log "Operation failed: $($_.Exception.Message)" "ERROR"
    exit 1
}
