# LocalEx Backup System
# Comprehensive backup solution for development and production environments

param(
    [string]$BackupType = "full",  # full, incremental, database-only, files-only
    [string]$Environment = "development",
    [switch]$Compress = $true,
    [switch]$UploadToCloud = $false
)

$ErrorActionPreference = "Stop"

# Configuration
$Config = @{
    ProjectRoot = Split-Path -Parent $PSScriptRoot
    BackupRoot = Join-Path $Config.ProjectRoot "backups"
    Timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
    RetentionDays = 30
    CloudBucket = "localex-backups"
}

# Create backup directory structure
$BackupPath = Join-Path $Config.BackupRoot "$Environment`_$($Config.Timestamp)"
New-Item -ItemType Directory -Path $BackupPath -Force | Out-Null

Write-Host "🔄 Starting LocalEx backup: $BackupType for $Environment" -ForegroundColor Cyan

try {
    # 1. Database Backup (if PostgreSQL is running)
    if ($BackupType -eq "full" -or $BackupType -eq "database-only") {
        Write-Host "📊 Backing up database..." -ForegroundColor Yellow
        $DbBackupPath = Join-Path $BackupPath "database"
        New-Item -ItemType Directory -Path $DbBackupPath -Force | Out-Null
        
        # PostgreSQL backup
        $DbBackupFile = Join-Path $DbBackupPath "localex_db_$($Config.Timestamp).sql"
        pg_dump -h localhost -U localex_user -d localex_db --no-password > $DbBackupFile 2>$null
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Database backup completed: $DbBackupFile" -ForegroundColor Green
        } else {
            Write-Host "⚠️ Database backup skipped (PostgreSQL not available)" -ForegroundColor Yellow
        }
    }

    # 2. Application Files Backup
    if ($BackupType -eq "full" -or $BackupType -eq "files-only") {
        Write-Host "📁 Backing up application files..." -ForegroundColor Yellow
        $FilesBackupPath = Join-Path $BackupPath "application"
        New-Item -ItemType Directory -Path $FilesBackupPath -Force | Out-Null
        
        # Copy source code (excluding node_modules, dist, etc.)
        $SourcePath = Join-Path $Config.ProjectRoot "src"
        $DestPath = Join-Path $FilesBackupPath "src"
        Copy-Item -Path $SourcePath -Destination $DestPath -Recurse -Force
        
        # Copy configuration files
        $ConfigFiles = @(".env", ".dockerignore", "package.json", "tsconfig.json")
        foreach ($file in $ConfigFiles) {
            $sourceFile = Join-Path $Config.ProjectRoot $file
            if (Test-Path $sourceFile) {
                Copy-Item -Path $sourceFile -Destination $FilesBackupPath
            }
        }
        
        Write-Host "✅ Application files backup completed" -ForegroundColor Green
    }

    # 3. Documentation Backup
    Write-Host "📚 Backing up documentation..." -ForegroundColor Yellow
    $DocsBackupPath = Join-Path $BackupPath "documentation"
    New-Item -ItemType Directory -Path $DocsBackupPath -Force | Out-Null
    
    Copy-Item -Path (Join-Path $Config.ProjectRoot "docs") -Destination $DocsBackupPath -Recurse -Force
    Copy-Item -Path (Join-Path $Config.ProjectRoot "*.md") -Destination $DocsBackupPath -Force
    
    Write-Host "✅ Documentation backup completed" -ForegroundColor Green

    # 4. Git Repository Backup
    Write-Host "🔧 Backing up Git repository..." -ForegroundColor Yellow
    $GitBackupPath = Join-Path $BackupPath "git"
    New-Item -ItemType Directory -Path $GitBackupPath -Force | Out-Null
    
    Set-Location $Config.ProjectRoot
    git bundle create (Join-Path $GitBackupPath "localex_$($Config.Timestamp).bundle") --all
    
    Write-Host "✅ Git repository backup completed" -ForegroundColor Green

    # 5. Compress backup (if requested)
    if ($Compress) {
        Write-Host "🗜️ Compressing backup..." -ForegroundColor Yellow
        $CompressedFile = "$BackupPath.zip"
        Compress-Archive -Path $BackupPath -DestinationPath $CompressedFile -Force
        
        # Remove uncompressed directory
        Remove-Item -Path $BackupPath -Recurse -Force
        
        Write-Host "✅ Backup compressed: $CompressedFile" -ForegroundColor Green
        $BackupPath = $CompressedFile
    }

    # 6. Upload to cloud (if requested)
    if ($UploadToCloud -and $Compress) {
        Write-Host "☁️ Uploading to cloud storage..." -ForegroundColor Yellow
        # AWS S3 upload (requires AWS CLI configured)
        aws s3 cp $BackupPath "s3://$($Config.CloudBucket)/$Environment/" 2>$null
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Backup uploaded to cloud" -ForegroundColor Green
        } else {
            Write-Host "⚠️ Cloud upload failed (AWS CLI not configured)" -ForegroundColor Yellow
        }
    }

    # 7. Cleanup old backups
    Write-Host "🧹 Cleaning up old backups..." -ForegroundColor Yellow
    $OldBackups = Get-ChildItem -Path $Config.BackupRoot -Filter "*$Environment*" | 
                  Where-Object { $_.CreationTime -lt (Get-Date).AddDays(-$Config.RetentionDays) }
    
    foreach ($backup in $OldBackups) {
        Remove-Item -Path $backup.FullName -Recurse -Force
        Write-Host "🗑️ Removed old backup: $($backup.Name)" -ForegroundColor Gray
    }

    Write-Host "`n🎉 Backup completed successfully!" -ForegroundColor Green
    Write-Host "📍 Location: $BackupPath" -ForegroundColor Blue
    Write-Host "📊 Size: $([math]::Round((Get-Item $BackupPath).Length / 1MB, 2)) MB" -ForegroundColor Blue

} catch {
    Write-Host "❌ Backup failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
